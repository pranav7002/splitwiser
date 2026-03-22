import User from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/responseHelpers.js";

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const createUser = async (req, res) => {
  try {
    const { name, email, walletAddress, smartAccountAddress } = req.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      return sendError(res, "name is required");
    }

    if (typeof email !== "string" || !email.trim()) {
      return sendError(res, "email is required");
    }

    if (typeof walletAddress !== "string" || !ETH_ADDRESS_REGEX.test(walletAddress.trim())) {
      return sendError(res, "walletAddress must be a valid Ethereum address (0x + 40 hex chars)");
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      walletAddress: walletAddress.trim().toLowerCase(),
    };

    if (smartAccountAddress) {
      if (!ETH_ADDRESS_REGEX.test(smartAccountAddress.trim())) {
        return sendError(res, "smartAccountAddress must be a valid Ethereum address");
      }
      payload.smartAccountAddress = smartAccountAddress.trim().toLowerCase();
    }

    const user = await User.create(payload);

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

export const updateSmartAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { smartAccountAddress } = req.body ?? {};

    if (!smartAccountAddress || !ETH_ADDRESS_REGEX.test(smartAccountAddress.trim())) {
      return sendError(res, "Valid smartAccountAddress (0x + 40 hex chars) is required");
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { smartAccountAddress: smartAccountAddress.trim().toLowerCase() },
      { new: true }
    );

    if (!updatedUser) {
      return sendError(res, "User not found", 404);
    }

    return sendSuccess(res, updatedUser);
  } catch (err) {
    if (err?.code === 11000) {
      return sendError(res, `This smartAccountAddress is already linked to another user`, 409);
    }
    return sendError(res, err.message, 500);
  }
};
