import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed"],
      default: "pending",
    },
    settlements: {
      type: mongoose.Schema.Types.Mixed,
    },
    aaResult: {
      type: mongoose.Schema.Types.Mixed,
    },
    proofDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
