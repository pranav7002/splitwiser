import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";

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

  const userMap = new Map(
    users.map((u) => [
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

export const computeGreedySettlementPreview = (balancesOrParticipants) => {
  const creditors = [];
  const debtors = [];

  for (const entry of balancesOrParticipants) {
    const bal = BigInt(entry.balance);
    if (bal > 0n) creditors.push({ ...entry, balance: bal });
    if (bal < 0n) debtors.push({ ...entry, balance: bal });
  }

  creditors.sort((a, b) => {
    if (b.balance !== a.balance) return b.balance > a.balance ? 1 : -1;
    return String(a.walletAddress).localeCompare(String(b.walletAddress));
  });

  debtors.sort((a, b) => {
    if (a.balance !== b.balance) return a.balance > b.balance ? 1 : -1;
    return String(a.walletAddress).localeCompare(String(b.walletAddress));
  });

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const debtAmount = debtor.balance < 0n ? -debtor.balance : debtor.balance;
    const creditAmount = creditor.balance;
    const transferAmount = debtAmount < creditAmount ? debtAmount : creditAmount;

    if (transferAmount > 0n) {
      transfers.push({
        from: debtor.walletAddress,
        to: creditor.walletAddress,
        amount: String(transferAmount),
      });
    }

    debtor.balance += transferAmount;
    creditor.balance -= transferAmount;

    if (debtor.balance === 0n) i += 1;
    if (creditor.balance === 0n) j += 1;
  }

  return transfers;
};
