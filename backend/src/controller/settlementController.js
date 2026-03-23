import {
  getGroupSettlementContext,
} from "../services/groupSettlementService.js";
import { runZkVm } from "../services/zkvmService.js";
import {
  isValidObjectId,
  sendSuccess,
  sendError,
} from "../utils/responseHelpers.js";
import Job from "../models/Job.model.js";
import Group from "../models/Group.model.js";
import Expense from "../models/Expense.model.js";
import crypto from "crypto";

const processSettlementBackground = async (jobId, groupId) => {
  let executionResult;
  try {
    await Job.findByIdAndUpdate(jobId, { status: "processing" });

    const context = await getGroupSettlementContext(groupId.trim());

    if (context.balances.every((b) => BigInt(b) === 0n)) {
      throw new Error("All participant balances are zero; nothing to settle.");
    }

    const zkInput = {
      participants: context.participants.map((p) => ({
        wallet_address: p.walletAddress,
        balance: Number(p.balance),
      })),
    };

    console.log("[Settlement] Calling zkVM prover with input:", JSON.stringify(zkInput));
    const zkResult = await runZkVm(zkInput);
    console.log("[Settlement] zkVM returned settlements:", zkResult.settlements?.length);

    const normalizedSettlements = zkResult.settlements;

    // Map EOA to SmartAccount addresses
    const aaSettlements = normalizedSettlements.map((s) => {
      const fromUser = context.participants.find(
        (p) => String(p.walletAddress).toLowerCase() === String(s.from).toLowerCase()
      );
      const toUser = context.participants.find(
        (p) => String(p.walletAddress).toLowerCase() === String(s.to).toLowerCase()
      );

      if (!fromUser?.smartAccountAddress || !toUser?.smartAccountAddress) {
        console.error("[Settlement] Missing smart account:", {
          from: s.from,
          fromUser: fromUser ? { wallet: fromUser.walletAddress, sa: fromUser.smartAccountAddress } : "NOT FOUND",
          to: s.to,
          toUser: toUser ? { wallet: toUser.walletAddress, sa: toUser.smartAccountAddress } : "NOT FOUND",
        });
        throw new Error("Missing Smart Account mapping for participant(s)");
      }

      return {
        from: fromUser.smartAccountAddress,
        to: toUser.smartAccountAddress,
        amount: String(s.amount),
      };
    });

    const groupDoc = await Group.findById(groupId.trim()).populate("createdBy", "walletAddress").lean();
    if (!groupDoc) throw new Error("Group not found");

    console.log("[Settlement] Group found:", groupDoc.name, "onChainAddress:", groupDoc.onChainAddress);

    const executionUrl = process.env.EXECUTION_SERVICE_URL;

    if (executionUrl) {
      // Create a compact 32-byte proof commitment for on-chain use.
      const proofCommitment = "0x" + crypto
        .createHash("sha256")
        .update(zkResult.proof || "no-proof")
        .digest("hex");

      const payload = {
        settlements: aaSettlements,
        proof: proofCommitment,
        groupName: groupDoc.name,
        creatorAddress: groupDoc.createdBy?.walletAddress,
        targetContract: groupDoc.onChainAddress,
      };

      console.log("[Settlement] Sending to AA Agent...");

      const response = await fetch(executionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log("[Settlement] AA Agent response:", text.slice(0, 500));

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("Execution service returned non-JSON: " + text.slice(0, 500));
      }

      if (!data.success) {
        throw new Error("Execution service failed: " + JSON.stringify(data).slice(0, 500));
      }

      executionResult = data.results;
      console.log("[Settlement] AA execution succeeded:", JSON.stringify(executionResult));
    }

    // Persist 'Settled' state back into MongoDB so we don't double-process
    await Expense.updateMany(
      { group: groupId.trim(), isSettled: false },
      { $set: { isSettled: true } }
    );

    await Job.findByIdAndUpdate(jobId, {
      $set: {
        status: "success",
        settlements: normalizedSettlements,
        aaResult: executionResult || { status: "ready-for-aa" },
        proofDetails: {
          proof: zkResult.proof,
          imageId: zkResult.imageId,
        },
      }
    });

    console.log("[Settlement] Job completed successfully:", jobId);
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

    return sendSuccess(res, {
      message: "Settlement job created and processing in background.",
      jobId: job._id,
    }, 202);
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