import User from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/responseHelpers.js";

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const createUser = async (req, res) => {
  try {
    const { name, email, walletAddress } = req.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      return sendError(res, "name is required");
    }

    if (typeof email !== "string" || !email.trim()) {
      return sendError(res, "email is required");
    }

    if (typeof walletAddress !== "string" || !ETH_ADDRESS_REGEX.test(walletAddress.trim())) {
      return sendError(res, "walletAddress must be a valid Ethereum address (0x + 40 hex chars)");
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      walletAddress: walletAddress.trim().toLowerCase(),
    });

    return sendSuccess(res, user, 201);
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return sendError(res, `A user with this ${field} already exists`, 409);
    }
    return sendError(res, err.message, 400);
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("_id name email walletAddress createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, users);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};
