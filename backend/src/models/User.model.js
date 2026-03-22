import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
    },
    smartAccountAddress: {
      type: String,
      unique: true,
      sparse: true, // sparse allows nulls but enforces uniqueness where it exists
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);