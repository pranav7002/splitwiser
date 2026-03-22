// agent/server.js
// ─────────────────────────────────────────────────────────────
// HTTP server that receives { settlements, proof } from
// friend's backend and executes settleWithProof on-chain
// ─────────────────────────────────────────────────────────────

import "dotenv/config";
import express from "express";
import { executeSettlement } from "./executeSettlement.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

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

   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new Error("settlement timeout after 60s")), 60000)
  );

const results = await Promise.race([
  executeSettlement(settlements, proof),
  timeoutPromise
]);

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
    const bobAddress = process.env.BOB_ADDRESS;
const aliceAddress = process.env.ALICE_ADDRESS;

if (!bobAddress || !aliceAddress) {
  return res.status(500).json({ 
    error: "BOB_ADDRESS or ALICE_ADDRESS not set in .env" 
  });
}

const settlements = [
  {
    from:   bobAddress,
    to:     aliceAddress,
    amount: "10000000000000000",
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
const PORT = parseInt(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`AA execution service running on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/execute-settlement`);
  console.log(`GET  http://localhost:${PORT}/test`);
  console.log(`GET  http://localhost:${PORT}/health`);
});
