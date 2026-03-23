import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

const SIMPLE_ACCOUNT_FACTORY = "0x9406Cc6185a346906296840746125a0E44976454";
const FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "salt", "type": "uint256" }
    ],
    "name": "getAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const normalizeId = (value) => String(value).trim();

const buildInitialBalanceMap = (memberIds) => {
  const map = new Map();
  for (const id of memberIds) {
    map.set(id, 0n);
  }
  return map;
};

const applyExpensesToBalances = (balanceMap, expenses) => {
  for (const expense of expenses) {
    const paidBy = String(expense.paidBy);
    const amount = BigInt(expense.amount);

    if (!balanceMap.has(paidBy)) {
      balanceMap.set(paidBy, 0n);
    }

    balanceMap.set(paidBy, balanceMap.get(paidBy) + amount);

    for (const split of expense.splits || []) {
      const userId = String(split.user);
      const splitAmount = BigInt(split.amount);

      if (!balanceMap.has(userId)) {
        balanceMap.set(userId, 0n);
      }

      balanceMap.set(userId, balanceMap.get(userId) - splitAmount);
    }
  }
};

export const getGroupSettlementContext = async (groupId) => {
  const normalizedGroupId = normalizeId(groupId);
  const group = await Group.findById(normalizedGroupId)
    .select("_id name members createdBy")
    .lean();

  if (!group) {
    const error = new Error("Group not found");
    error.statusCode = 404;
    throw error;
  }

  const memberIds = group.members.map(String);
  const users = await User.find(
    { _id: { $in: memberIds } },
    { _id: 1, name: 1, walletAddress: 1, smartAccountAddress: 1 }
  ).lean();

  const resolvedUsers = await Promise.all(
    users.map(async (u) => {
      if (u.smartAccountAddress) return u;

      try {
        console.log(`Resolving missing Smart Account for ${u.walletAddress}...`);
        const predicted = await publicClient.readContract({
          address: SIMPLE_ACCOUNT_FACTORY,
          abi: FACTORY_ABI,
          functionName: "getAddress",
          args: [u.walletAddress, 0n],
        });

        // Update DB in background
        await User.findByIdAndUpdate(u._id, { smartAccountAddress: predicted.toLowerCase() });
        return { ...u, smartAccountAddress: predicted.toLowerCase() };
      } catch (err) {
        console.error(`Failed to resolve Smart Account for ${u.walletAddress}:`, err.message);
        return u;
      }
    })
  );

  const userMap = new Map(
    resolvedUsers.map((u) => [
      String(u._id),
      {
        userId: String(u._id),
        name: u.name,
        walletAddress: u.walletAddress,
        smartAccountAddress: u.smartAccountAddress,
      },
    ])
  );

  const expenses = await Expense.find({ group: normalizedGroupId, isSettled: false })
    .select("paidBy amount splits")
    .lean();

  const balanceMap = buildInitialBalanceMap(memberIds);
  applyExpensesToBalances(balanceMap, expenses);

  const participants = memberIds.map((id) => ({
    ...userMap.get(id),
    userId: id,
    balance: String(balanceMap.get(id) || 0n), // Convert to string for output
  }));

  const balances = participants.map((p) => p.balance);

  return {
    group: {
      groupId: String(group._id),
      name: group.name,
    },
    participants,
    balances,
    expenseCount: expenses.length,
  };
};
