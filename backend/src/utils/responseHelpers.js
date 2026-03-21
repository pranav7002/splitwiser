import mongoose from "mongoose";

export const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value.trim());

export const normalizeId = (value) => String(value).trim();

export const uniqueStrings = (values) => [...new Set(values.map(normalizeId))];

export const isPositiveInteger = (value) =>
  Number.isInteger(value) && value > 0;

export const isNonNegativeInteger = (value) =>
  Number.isInteger(value) && value >= 0;

export const sendSuccess = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

export const sendError = (res, message, status = 400) =>
  res.status(status).json({
    success: false,
    error: message,
  });
