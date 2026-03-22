// agent/server.js
// ─────────────────────────────────────────────────────────────
// HTTP server that receives { settlements, proof } from
// friend's backend and executes settleWithProof on-chain
// ─────────────────────────────────────────────────────────────

import "dotenv/config";
import express from "express";
import { executeSettlement } from "./executeSettlement.js";

const app = express();
app.use(express.json({ limit: "50mb" }));

// ── POST /execute-settlement ──────────────────────────────────
// Friend's backend calls this after zkVM generates proof
// Body: { settlements: [...], proof: "0x..." }
app.post("/execute-settlement", async (req, res) => {
  try {
    const { settlements, proof } = req.body;

    if (!settlements || !proof) {
      return res.status(400).json({
        error: "missing settlements or proof",
      });
    }

    if (!Array.isArray(settlements) || settlements.length === 0) {
      return res.status(400).json({
        error: "settlements must be non-empty array",
      });
    }

    console.log(`\nReceived settlement request`);
    console.log(`  Settlements: ${settlements.length}`);
    console.log(`  Proof:       ${proof.slice(0, 20)}...`);

    const results = await executeSettlement(settlements, proof);

    res.json({
      success: true,
      results,
    });

  } catch (err) {
    console.error("Settlement failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /test ─────────────────────────────────────────────────
// Test with dummy data — verifies full flow works
app.get("/test", async (req, res) => {
  try {
    console.log("\nRunning test with dummy data...");

    // dummy data exactly as friend described
    const settlements = [
      {
        from:   process.env.BOB_ADDRESS,
        to:     process.env.ALICE_ADDRESS,
        amount: "10000000000000000",   // 0.01 ETH in wei
      },
    ];
    const proof = "0xdeadbeef";

    const results = await executeSettlement(settlements, proof);

    res.json({ success: true, results });

  } catch (err) {
    console.error("Test failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /health ───────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AA execution service running on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/execute-settlement`);
  console.log(`GET  http://localhost:${PORT}/test`);
  console.log(`GET  http://localhost:${PORT}/health`);
});
