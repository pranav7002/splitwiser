import mongoose from "mongoose";
import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";

const normalizeId = (value) => String(value).trim();

const buildInitialBalanceMap = (memberIds) => {
  const map = new Map();
  for (const id of memberIds) {
    map.set(id, 0);
  }
  return map;
};

const applyExpensesToBalances = (balanceMap, expenses) => {
  for (const expense of expenses) {
    const paidBy = String(expense.paidBy);
    const amount = Number(expense.amount);

    if (!balanceMap.has(paidBy)) {
      balanceMap.set(paidBy, 0);
    }

    balanceMap.set(paidBy, balanceMap.get(paidBy) + amount);

    for (const split of expense.splits || []) {
      const userId = String(split.user);
      const splitAmount = Number(split.amount);

      if (!balanceMap.has(userId)) {
        balanceMap.set(userId, 0);
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
    { _id: 1, name: 1, walletAddress: 1 }
  ).lean();

  const userMap = new Map(
    users.map((u) => [
      String(u._id),
      {
        userId: String(u._id),
        name: u.name,
        walletAddress: u.walletAddress,
      },
    ])
  );

  const expenses = await Expense.find({ group: normalizedGroupId })
    .select("paidBy amount splits")
    .lean();

  const balanceMap = buildInitialBalanceMap(memberIds);
  applyExpensesToBalances(balanceMap, expenses);

  const participants = memberIds.map((id) => ({
    ...userMap.get(id),
    userId: id,
    balance: balanceMap.get(id) || 0,
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
    if (entry.balance > 0) creditors.push({ ...entry });
    if (entry.balance < 0) debtors.push({ ...entry });
  }

  creditors.sort((a, b) => {
    if (b.balance !== a.balance) return b.balance - a.balance;
    return String(a.walletAddress).localeCompare(String(b.walletAddress));
  });

  debtors.sort((a, b) => {
    if (a.balance !== b.balance) return a.balance - b.balance;
    return String(a.walletAddress).localeCompare(String(b.walletAddress));
  });

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const debtAmount = Math.abs(debtor.balance);
    const creditAmount = creditor.balance;
    const transferAmount = Math.min(debtAmount, creditAmount);

    if (transferAmount > 0) {
      transfers.push({
        from: debtor.walletAddress,
        to: creditor.walletAddress,
        amount: transferAmount,
      });
    }

    debtor.balance += transferAmount;
    creditor.balance -= transferAmount;

    if (debtor.balance === 0) i += 1;
    if (creditor.balance === 0) j += 1;
  }

  return transfers;
};
