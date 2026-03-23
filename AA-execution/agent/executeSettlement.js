// agent/executeSettlement.js
// ─────────────────────────────────────────────────────────────
// Takes { settlements, proof } from the backend and executes
// settleWithProof on-chain via ERC-4337 UserOperations.
// Uses Pimlico SimpleAccount + Paymaster as the signer wallet.
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

// ── ABI — matches the on-chain SplitWise.settleWithProof ────
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

const FACTORY_ABI = [{
  "inputs": [
    { "internalType": "address", "name": "creator", "type": "address" },
    { "internalType": "string", "name": "name", "type": "string" }
  ],
  "name": "createGroup",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}];

const HANDLER_FACTORY = "0x2212e8eb5f6825e227fabe361623f0cb507119ec";

// ── Pimlico + Viem setup ─────────────────────────────────────
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

// ── Pimlico SimpleAccount client ─────────────────────────────
async function getSmartAccountClient() {
  const signer = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);

  const smartAccount = await signerToSimpleSmartAccount(publicClient, {
    signer,
    factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
    entryPoint:     ENTRYPOINT_ADDRESS_V06,
  });

  console.log("Agent SimpleAccount address:", smartAccount.address);

  return createSmartAccountClient({
    account:          smartAccount,
    entryPoint:       ENTRYPOINT_ADDRESS_V06,
    chain:            sepolia,
    bundlerTransport: http(process.env.BUNDLER_URL),
    middleware: {
      sponsorUserOperation: paymasterClient.sponsorUserOperation,
    },
  });
}

// ── Helper: send a single UserOp and wait for confirmation ───
async function sendAndWait(client, callData, label) {
  const gasPrices = await bundlerClient.getUserOperationGasPrice();

  console.log(`  [${label}] Submitting UserOperation...`);
  const userOpHash = await client.sendUserOperation({
    userOperation: {
      callData,
      maxFeePerGas:         (gasPrices.fast.maxFeePerGas * 150n) / 100n,
      maxPriorityFeePerGas: (gasPrices.fast.maxPriorityFeePerGas * 150n) / 100n,
    },
  });
  console.log(`  [${label}] UserOp hash: ${userOpHash}`);

  console.log(`  [${label}] Waiting for on-chain confirmation (up to 2 min)...`);
  let receipt;
  try {
    receipt = await bundlerClient.waitForUserOperationReceipt({
      hash:    userOpHash,
      timeout: 120_000,
    });
    console.log(`  [${label}] CONFIRMED! TX: ${receipt.receipt.transactionHash} | Block: ${receipt.receipt.blockNumber} | ${receipt.success ? "SUCCESS" : "REVERTED"}`);
  } catch (waitError) {
    console.log(`  [${label}] Polling timed out — UserOp is pending in mempool.`);
    receipt = null;
  }

  return { userOpHash, receipt };
}

// ── Main execution logic ─────────────────────────────────────
export async function executeSettlement(settlements, proof, targetContract, creatorAddress, groupName) {
  const client = await getSmartAccountClient();

  // For the demo, we multiply the INR amount by 10^14 so the ETH transfers are visible
  // on block explorers. (e.g., 40 INR -> 0.004 ETH instead of 40 wei)
  // The Smart Account currently has ~0.005 Sepolia ETH, so this fits perfectly.
  const DEMO_MULTIPLIER = 100000000000000n; // 10^14

  const totalValue = settlements.reduce(
    (sum, s) => sum + (BigInt(s.amount) * DEMO_MULTIPLIER), 0n
  );
  console.log(`Total settlement value: ${totalValue} wei`);

  // Ensure proof is valid hex bytes
  const proofBytes = proof.startsWith("0x") ? proof : `0x${proof}`;

  const settleCalldata = encodeFunctionData({
    abi:          SPLITWISE_ABI,
    functionName: "settleWithProof",
    args: [
      settlements.map(s => ({
        from:   s.from,
        to:     s.to,
        amount: BigInt(s.amount) * DEMO_MULTIPLIER,
      })),
      proofBytes,
    ],
  });

  // ── Check if contract needs deployment ─────────────────────
  const code = await publicClient.getBytecode({ address: targetContract });
  let deployResult = null;

  if (!code || code === "0x") {
    // ── Step 1: Deploy the SplitWise contract via HandlerFactory ──
    // The v0.6 SimpleAccount's executeBatch does NOT support per-call values.
    // So we deploy first, then settle in a second UserOp.
    console.log(`Contract not deployed at ${targetContract}.`);
    console.log(`Step 1/2: Deploying SplitWise contract via HandlerFactory...`);

    const factoryCalldata = encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: "createGroup",
      args: [creatorAddress, groupName]
    });

    const deployCallData = await client.account.encodeCallData({
      to:    HANDLER_FACTORY,
      data:  factoryCalldata,
      value: 0n,
    });

    deployResult = await sendAndWait(client, deployCallData, "Deploy");
    
    // Small delay to let the chain state propagate
    console.log(`  Waiting 3s for chain state to propagate...`);
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── Step 2: Execute settleWithProof (single call with value) ──
  console.log(`${deployResult ? "Step 2/2" : "Step 1/1"}: Executing settleWithProof on ${targetContract}...`);

  const settleCallData = await client.account.encodeCallData({
    to:    targetContract,
    data:  settleCalldata,
    value: totalValue,
  });

  const settleResult = await sendAndWait(client, settleCallData, "Settle");

  return {
    deployTxHash: deployResult?.receipt?.receipt?.transactionHash || null,
    userOpHash: settleResult.userOpHash,
    txHash: settleResult.receipt?.receipt?.transactionHash || "pending_in_mempool",
  };
}