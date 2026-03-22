import {
  getGroupSettlementContext,
  computeGreedySettlementPreview,
} from "../services/groupSettlementService.js";
import { runZkVm } from "../services/zkvmService.js";
import {
  validateSettlementOutput,
  settlementsAreEqual,
} from "../services/settlementValidationService.js";
import {
  isValidObjectId,
  sendSuccess,
  sendError,
} from "../utils/responseHelpers.js";

export const settleGroup = async (req, res) => {
  try {
    const { groupId } = req.body ?? {};

    if (typeof groupId !== "string" || !groupId.trim()) {
      return sendError(res, "groupId is required");
    }

    if (!isValidObjectId(groupId)) {
      return sendError(res, "Invalid groupId");
    }

    const context = await getGroupSettlementContext(groupId.trim());

    const zkInput = {
      participants: context.participants.map((p) => ({
        wallet_address: p.walletAddress,
        balance: p.balance,
      })),
    };

    const expectedSettlements = computeGreedySettlementPreview(
      context.participants
    );

    const zkResult = await runZkVm(zkInput);

    const normalizedSettlements = validateSettlementOutput(
      context.participants,
      zkResult.settlements
    );

    if (!settlementsAreEqual(expectedSettlements, normalizedSettlements)) {
      return sendError(
        res,
        "zkVM settlement output does not match the expected deterministic settlement plan",
        422
      );
    }

    return sendSuccess(res, {
      group: context.group,
      balances: context.participants,
      settlements: normalizedSettlements,
      proof: zkResult.proof,
      publicInputs: zkResult.publicInputs || null,
      metrics: {
        expenseCount: context.expenseCount,
        settlementCount: normalizedSettlements.length,
        totalBalance: context.participants.reduce((sum, b) => sum + b.balance, 0),
      },
      status: "ready-for-aa",
    });
  } catch (err) {
    const status = err?.statusCode || 400;
    return sendError(res, err.message, status);
  }
};