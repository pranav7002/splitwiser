import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";
import {
  getGroupSettlementContext,
} from "../services/groupSettlementService.js";
import {
  isValidObjectId,
  normalizeId,
  uniqueStrings,
  sendSuccess,
  sendError,
} from "../utils/responseHelpers.js";

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds, createdBy } = req.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      return sendError(res, "Invalid group name");
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return sendError(res, "memberIds must be a non-empty array");
    }

    if (typeof createdBy !== "string" || !createdBy.trim()) {
      return sendError(res, "createdBy is required");
    }

    const normalizedCreator = normalizeId(createdBy);
    let normalizedMembers = uniqueStrings(memberIds);

    if (!normalizedMembers.includes(normalizedCreator)) {
      normalizedMembers = [...normalizedMembers, normalizedCreator];
    }

    for (const id of normalizedMembers) {
      if (!isValidObjectId(id)) {
        return sendError(res, `Invalid userId: ${id}`);
      }
    }

    const existingUsers = await User.find(
      { _id: { $in: normalizedMembers } },
      { _id: 1 }
    ).lean();

    const foundIds = new Set(existingUsers.map((u) => String(u._id)));
    const missingIds = normalizedMembers.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return sendError(res, `Some users do not exist: ${missingIds.join(", ")}`);
    }

    const group = await Group.create({
      name: name.trim(),
      members: normalizedMembers,
      createdBy: normalizedCreator,
    });

    return sendSuccess(res, group, 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, "Invalid group id");
    }

    const group = await Group.findById(normalizeId(id))
      .select("_id name members createdBy createdAt updatedAt")
      .lean();

    if (!group) {
      return sendError(res, "Group not found", 404);
    }

    const memberIds = (group.members || []).map(String);

    const users = memberIds.length
      ? await User.find(
        { _id: { $in: memberIds } },
        { _id: 1, name: 1, email: 1, walletAddress: 1, createdAt: 1 }
      ).lean()
      : [];

    const userMap = new Map(users.map((user) => [String(user._id), user]));

    const expenses = await Expense.find({ group: group._id })
      .select("_id paidBy amount splits description createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + (expense.amount || 0),
      0
    );

    const createdByUser = group.createdBy
      ? userMap.get(String(group.createdBy)) || null
      : null;

    return sendSuccess(res, {
      group: {
        groupId: String(group._id),
        name: group.name,
        createdBy: group.createdBy ? String(group.createdBy) : null,
        createdByUser: createdByUser
          ? {
            userId: String(createdByUser._id),
            name: createdByUser.name || "",
            email: createdByUser.email || "",
            walletAddress: createdByUser.walletAddress || "",
          }
          : null,
        memberCount: memberIds.length,
        expenseCount: totalExpenses,
        totalAmount,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
      members: memberIds.map((memberId) => {
        const user = userMap.get(memberId);
        return {
          userId: memberId,
          name: user?.name || "",
          email: user?.email || "",
          walletAddress: user?.walletAddress || "",
          joined: Boolean(user),
        };
      }),
      expenses: expenses.map((expense) => ({
        expenseId: String(expense._id),
        paidBy: String(expense.paidBy),
        amount: expense.amount,
        description: expense.description || "",
        splits: Array.isArray(expense.splits)
          ? expense.splits.map((split) => ({
            user: String(split.user),
            amount: split.amount,
          }))
          : [],
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      })),
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const listGroups = async (req, res) => {
  try {
    const groups = await Group.find({})
      .select("_id name members createdBy createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const allMemberIds = [
      ...new Set(groups.flatMap((group) => (group.members || []).map(String))),
    ];

    const users = allMemberIds.length
      ? await User.find(
        { _id: { $in: allMemberIds } },
        { _id: 1, name: 1, email: 1, walletAddress: 1 }
      ).lean()
      : [];

    const userMap = new Map(users.map((user) => [String(user._id), user]));

    const groupIds = groups.map((group) => group._id);

    const expenseAgg = groupIds.length
      ? await Expense.aggregate([
        { $match: { group: { $in: groupIds } } },
        {
          $group: {
            _id: "$group",
            expenseCount: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ])
      : [];

    const expenseMap = new Map(
      expenseAgg.map((row) => [
        String(row._id),
        {
          expenseCount: row.expenseCount || 0,
          totalAmount: row.totalAmount || 0,
        },
      ])
    );

    const data = groups.map((group) => {
      const stats = expenseMap.get(String(group._id)) || {
        expenseCount: 0,
        totalAmount: 0,
      };

      return {
        groupId: String(group._id),
        name: group.name,
        createdBy: group.createdBy ? String(group.createdBy) : null,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        memberCount: Array.isArray(group.members) ? group.members.length : 0,
        expenseCount: stats.expenseCount,
        totalAmount: stats.totalAmount,
        members: (group.members || []).map((memberId) => {
          const user = userMap.get(String(memberId));
          return {
            userId: String(memberId),
            name: user?.name || "",
            email: user?.email || "",
            walletAddress: user?.walletAddress || "",
          };
        }),
      };
    });

    return sendSuccess(res, { groups: data });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!isValidObjectId(groupId)) {
      return sendError(res, "Invalid groupId");
    }

    const context = await getGroupSettlementContext(groupId);

    const totalBalance = context.participants.reduce(
      (sum, item) => sum + BigInt(item.balance),
      0n
    );

    const totalPositive = context.participants
      .filter((b) => BigInt(b.balance) > 0n)
      .reduce((sum, b) => sum + BigInt(b.balance), 0n);

    const totalNegative = context.participants
      .filter((b) => BigInt(b.balance) < 0n)
      .reduce((sum, b) => sum + BigInt(b.balance) * -1n, 0n);

    return sendSuccess(res, {
      group: context.group,
      balances: context.participants,
      totals: {
        totalBalance: String(totalBalance),
        totalPositive: String(totalPositive),
        totalNegative: String(totalNegative),
      },
      expenseCount: context.expenseCount,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return sendError(res, err.message, status);
  }
};