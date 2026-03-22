// agent/executeSettlement.js
// ─────────────────────────────────────────────────────────────
// Takes { settlements, proof } from friend's backend
// and executes settleWithProof on-chain via ERC-4337 UserOperation
// Each debtor's SmartAccount submits its own UserOperation
// ─────────────────────────────────────────────────────────────

import "dotenv/config";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  createSmartAccountClient,
  ENTRYPOINT_ADDRESS_V06,
} from "permissionless";
import { signerToSimpleSmartAccount } from "permissionless/accounts";
import {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient,
} from "permissionless/clients/pimlico";

// ── ABI — locked interface with friend ───────────────────────
const SPLITWISE_ABI = [
  {
    name: "settleWithProof",
    type: "function",
    inputs: [
      {
        name: "settlements",
        type: "tuple[]",
        components: [
          { name: "from",   type: "address" },
          { name: "to",     type: "address" },
          { name: "amount", type: "uint256" },
        ],
      },
      { name: "proof", type: "bytes" },
    ],
  },
];

// ── EOA → SmartAccount mapping ────────────────────────────────
// agent uses this to know which SmartAccount to submit UserOp from
// "from" in settlements = SmartAccount address
const SMART_ACCOUNT_MAP = {
  [process.env.ALICE_ADDRESS?.toLowerCase()]: process.env.ALICE_ACCOUNT,
  [process.env.BOB_ADDRESS?.toLowerCase()]:   process.env.BOB_ACCOUNT,
  [process.env.CAROL_ADDRESS?.toLowerCase()]: process.env.CAROL_ACCOUNT,
};

// ── Pimlico setup ─────────────────────────────────────────────
const PIMLICO_URL =process.env.BUNDLER_URL;
const publicClient = createPublicClient({
  chain:     sepolia,
  transport: http(process.env.SEPOLIA_RPC),
});

const bundlerClient = createPimlicoBundlerClient({
  transport:  http(process.env.BUNDLER_URL),
  entryPoint: ENTRYPOINT_ADDRESS_V06,
});

const paymasterClient = createPimlicoPaymasterClient({
  transport:  http(process.env.BUNDLER_URL),
  entryPoint: ENTRYPOINT_ADDRESS_V06,
});

// ── smart account client ──────────────────────────────────────
async function getSmartAccountClient() {
  // agent signs with AGENT_PRIVATE_KEY — this is the session key
  const signer = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);

  const smartAccount = await signerToSimpleSmartAccount(publicClient, {
    signer,
    // SimpleAccountFactory v0.6 — deployed on all EVM chains
    factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
    entryPoint:     ENTRYPOINT_ADDRESS_V06,
  });

  console.log("Smart account address:", smartAccount.address);

  return createSmartAccountClient({
    account:          smartAccount,
    entryPoint:       ENTRYPOINT_ADDRESS_V06,
    chain:            sepolia,
    bundlerTransport: http(process.env.BUNDLER_URL),
    middleware: {
      // Pimlico sponsors gas — users pay zero
      sponsorUserOperation: paymasterClient.sponsorUserOperation,
    },
  });
}

// ── main: execute settlements ─────────────────────────────────
// Called by server.js when friend's backend hits /execute-settlement
export async function executeSettlement(settlements, proof) {
  // group settlements by debtor (from address)
  // each debtor gets their own UserOperation
  const grouped = {};
  for (const s of settlements) {
    const key = s.from.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  const results = [];
  const client  = await getSmartAccountClient();

  for (const [debtorAddr, debtorSettlements] of Object.entries(grouped)) {
    // look up SmartAccount for this debtor
    const smartAccountAddr = SMART_ACCOUNT_MAP[debtorAddr];
    if (!smartAccountAddr) {
      console.log(`  No SmartAccount for ${debtorAddr} — skipping`);
      continue;
    }

    // total ETH this debtor sends in this batch
    const totalValue = debtorSettlements.reduce(
      (sum, s) => sum + BigInt(s.amount),
      0n
    );

    // encode settleWithProof(settlements, proof)
    const calldata = encodeFunctionData({
      abi:          SPLITWISE_ABI,
      functionName: "settleWithProof",
      args: [
        debtorSettlements.map((s) => ({
          from:   s.from,
          to:     s.to,
          amount: BigInt(s.amount),
        })),
        proof,
      ],
    });

    console.log(`Submitting UserOp for ${debtorAddr}...`);
    console.log(`  Settlements: ${debtorSettlements.length}`);
    console.log(`  Total ETH:   ${totalValue} wei`);

    // send as UserOperation — NOT a normal transaction
    // Pimlico paymaster covers gas
    const userOpHash = await client.sendUserOperation({
      calls: [{
        to:    process.env.GROUP_ADDRESS,
        data:  calldata,
        value: totalValue,  // ETH from SmartAccount → SplitWise → creditor
      }],
    });

    console.log(`  UserOp hash: ${userOpHash}`);

    // wait for confirmation on-chain
    const receipt = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    const txHash = receipt.receipt.transactionHash;
    console.log(`  Confirmed!  Tx: ${txHash}`);

    results.push({
      debtor:     debtorAddr,
      userOpHash,
      txHash,
    });
  }

  return results;
}
