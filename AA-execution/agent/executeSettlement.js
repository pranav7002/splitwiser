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
    stateMutability: "payable",
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
    outputs: [],
  },
];



// ── Pimlico setup ─────────────────────────────────────────────

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


/*Self Note -
Sends multiple UserOperations — one per debtor
Each UserOp comes from the SAME SimpleAccount (agent's wallet)
Agent pays ETH for everyone — wrong, agent should not be paying Bob's debt
Multiple UserOps can have race conditions on same contract state
SMART_ACCOUNT_MAP is irrelevant because all UserOps come from one account anyway
Completely contradicts how settleWithProof is designed — it takes ALL settlements at once

CORRECTION:settleWithProof is designed to handle ALL settlements atomically in one call. One UserOp, one call, everything settles or nothing does. Matches your friend's spec exactly.
*/


export async function executeSettlement(settlements, proof) {
  const client = await getSmartAccountClient();

  // total ETH needed for all settlements combined
  const totalValue = settlements.reduce(
    (sum, s) => sum + BigInt(s.amount), 0n
  );

  // encode ONE call with ALL settlements
  const calldata = encodeFunctionData({
    abi:          SPLITWISE_ABI,
    functionName: "settleWithProof",
    args: [
      settlements.map(s => ({
        from:   s.from,
        to:     s.to,
        amount: BigInt(s.amount),
      })),
      proof,
    ],
  });

  // ONE UserOperation — no loop
  const userOpHash = await client.sendUserOperation({
    calls: [{
      to:    process.env.GROUP_ADDRESS,
      data:  calldata,
      value: totalValue,
    }],
  });

 const receipt = await bundlerClient.waitForUserOperationReceipt({
  hash: userOpHash,
});

const txHash = receipt?.receipt?.transactionHash;
if (!txHash) throw new Error("no txHash in receipt");

return {
  userOpHash,
  txHash,
};
}