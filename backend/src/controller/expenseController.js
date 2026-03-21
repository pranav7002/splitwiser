import Expense from "../models/Expense.model.js";
import Group from "../models/Group.model.js";
import {
  isValidObjectId,
  normalizeId,
  isPositiveInteger,
  isNonNegativeInteger,
  sendSuccess,
  sendError,
} from "../utils/responseHelpers.js";

export const addExpense = async (req, res) => {
  try {
    const { groupId, paidBy, amount, splits, description } = req.body ?? {};

    if (typeof groupId !== "string" || !isValidObjectId(groupId)) {
      return sendError(res, "Invalid groupId");
    }

    if (typeof paidBy !== "string" || !isValidObjectId(paidBy)) {
      return sendError(res, "Invalid paidBy");
    }

    if (!isPositiveInteger(amount)) {
      return sendError(
        res,
        "Amount must be a positive integer in smallest currency units"
      );
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return sendError(res, "Splits must be a non-empty array");
    }

    const normalizedGroupId = normalizeId(groupId);
    const normalizedPaidBy = normalizeId(paidBy);

    const normalizedSplits = [];
    let totalSplit = 0;

    for (const split of splits) {
      if (!split || typeof split !== "object") {
        return sendError(res, "Each split must be an object");
      }

      const { user, amount: splitAmount } = split;

      if (typeof user !== "string" || !isValidObjectId(user)) {
        return sendError(res, "Invalid split user");
      }

      if (!isNonNegativeInteger(splitAmount)) {
        return sendError(
          res,
          "Each split amount must be a non-negative integer"
        );
      }

      normalizedSplits.push({
        user: normalizeId(user),
        amount: splitAmount,
      });

      totalSplit += splitAmount;
    }

    if (totalSplit !== amount) {
      return sendError(res, "Split amounts must exactly equal total amount");
    }

    const group = await Group.findById(normalizedGroupId);

    if (!group) {
      return sendError(res, "Group not found", 404);
    }

    const groupMemberSet = new Set(group.members.map((m) => String(m)));

    if (!groupMemberSet.has(normalizedPaidBy)) {
      return sendError(res, "Payer is not part of group");
    }

    for (const split of normalizedSplits) {
      if (!groupMemberSet.has(split.user)) {
        return sendError(res, `User ${split.user} is not part of group`);
      }
    }

    const expense = await Expense.create({
      group: normalizedGroupId,
      paidBy: normalizedPaidBy,
      amount,
      splits: normalizedSplits,
      description: typeof description === "string" ? description.trim() : "",
    });

    return sendSuccess(res, expense, 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};