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
import Job from "../models/Job.model.js";
import Expense from "../models/Expense.model.js";

const processSettlementBackground = async (jobId, groupId) => {
  try {
    await Job.findByIdAndUpdate(jobId, { status: "processing" });

    const context = await getGroupSettlementContext(groupId.trim());

    if (context.balances.every((b) => BigInt(b) === 0n)) {
      throw new Error("All participant balances are zero; nothing to settle.");
    }

    const zkInput = {
      participants: context.participants.map((p) => ({
        wallet_address: p.walletAddress,
        balance: String(p.balance),
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
      throw new Error(
        "zkVM settlement output does not match the expected deterministic settlement plan"
      );
    }

    // Map EOA to SmartAccount addresses
    const aaSettlements = normalizedSettlements.map((s) => {
      const fromUser = context.participants.find(
        (p) => String(p.walletAddress).toLowerCase() === String(s.from).toLowerCase()
      );
      const toUser = context.participants.find(
        (p) => String(p.walletAddress).toLowerCase() === String(s.to).toLowerCase()
      );

      if (!fromUser?.smartAccountAddress || !toUser?.smartAccountAddress) {
        throw new Error("Missing Smart Account mapping for participant(s)");
      }

      return {
        from: fromUser.smartAccountAddress,
        to: toUser.smartAccountAddress,
        amount: String(s.amount), // String value of BigInt amount
      };
    });

    let executionResult = null;
    const executionUrl = process.env.EXECUTION_SERVICE_URL;

    if (executionUrl) {
      const response = await fetch(executionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settlements: aaSettlements,
          proof: zkResult.proof || "0xdeadbeef", // mock for now if not present
        }),
      });

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (!data.success) {
          throw new Error(JSON.stringify(data));
        }
        executionResult = data.results;
      } catch (err) {
        throw new Error("Execution service failed: " + text);
      }
    }

    // Persist 'Settled' state back into MongoDB so we don't double-process 
    await Expense.updateMany(
      { group: groupId.trim(), isSettled: false },
      { $set: { isSettled: true } }
    );

    await Job.findByIdAndUpdate(jobId, {
      status: "success",
      settlements: normalizedSettlements,
      aaResult: executionResult || { status: "ready-for-aa" },
    });
  } catch (err) {
    console.error("Background Settlement Error:", err);
    await Job.findByIdAndUpdate(jobId, {
      status: "failed",
      error: err.message,
    });
  }
};

export const settleGroupAsync = async (req, res) => {
  try {
    const { groupId } = req.body ?? {};

    if (typeof groupId !== "string" || !groupId.trim()) {
      return sendError(res, "groupId is required");
    }

    if (!isValidObjectId(groupId)) {
      return sendError(res, "Invalid groupId");
    }

    const job = await Job.create({ group: groupId.trim(), status: "pending" });

    // Kick off background processing asynchronously
    processSettlementBackground(job._id, groupId.trim());

    return res.status(202).json({
      success: true,
      message: "Settlement job created and processing in background.",
      jobId: job._id,
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const getSettlementJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!isValidObjectId(jobId)) {
      return sendError(res, "Invalid jobId");
    }

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return sendError(res, "Job not found", 404);
    }

    return sendSuccess(res, job);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};