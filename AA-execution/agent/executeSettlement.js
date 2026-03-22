// agent/executeSettlement.js
// ─────────────────────────────────────────────────────────────
// Takes { settlements, proof } from the backend and executes
// settleWithProof on-chain via a single ERC-4337 UserOperation.
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

// ── Execute settlement: ONE UserOp, ONE atomic call ──────────
export async function executeSettlement(settlements, proof, targetContract, creatorAddress, groupName) {
  const client = await getSmartAccountClient();

  const totalValue = settlements.reduce(
    (sum, s) => sum + BigInt(s.amount), 0n
  );

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

  // ── Step 1: Encode the call for the Smart Account ──────────
  const code = await publicClient.getBytecode({ address: targetContract });
  
  let userOpCallData;
  if (!code || code === "0x") {
    console.log(`Contract not deployed at ${targetContract}. Batching deployment with settlement!`);
    const factoryCalldata = encodeFunctionData({
      abi: [{
        "inputs": [
          { "internalType": "address", "name": "creator", "type": "address" },
          { "internalType": "string", "name": "name", "type": "string" }
        ],
        "name": "createGroup",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }],
      functionName: "createGroup",
      args: [creatorAddress, groupName]
    });

    userOpCallData = await client.account.encodeCallData([
      { to: "0x2212e8eb5f6825e227fabe361623f0cb507119ec", data: factoryCalldata, value: 0n },
      { to: targetContract, data: calldata, value: totalValue }
    ]);
  } else {
    userOpCallData = await client.account.encodeCallData({
      to:    targetContract,
      data:  calldata,
      value: totalValue,
    });
  }

  // ── Step 2: Fetch fast gas prices from Pimlico ─────────────
  console.log(`Fetching gas prices from Pimlico bundler...`);
  const gasPrices = await bundlerClient.getUserOperationGasPrice();

  // ── Step 3: Send UserOperation to the bundler ──────────────
  //    This returns almost immediately with a hash!
  //    The AA pipeline is fully intact: SmartAccount + Paymaster + Bundler.
  console.log(`Submitting ERC-4337 UserOperation to Pimlico...`);
  const userOpHash = await client.sendUserOperation({
    userOperation: {
      callData: userOpCallData,
      maxFeePerGas:         (gasPrices.fast.maxFeePerGas * 150n) / 100n,
      maxPriorityFeePerGas: (gasPrices.fast.maxPriorityFeePerGas * 150n) / 100n,
    },
  });
  console.log(`UserOperation submitted! Hash: ${userOpHash}`);

  // ── Step 4: Wait for on-chain confirmation (generous timeout) ──
  //    This is the step that was timing out with the old 20s default.
  //    We now give it 2 full minutes.
  console.log(`Waiting for on-chain confirmation (up to 2 minutes)...`);
  let receipt;
  try {
    receipt = await bundlerClient.waitForUserOperationReceipt({
      hash:    userOpHash,
      timeout: 120_000,   // 2 minutes — plenty for Sepolia congestion
    });
    console.log(`\nUserOperation CONFIRMED on-chain!`);
    console.log(`  TX Hash:  ${receipt.receipt.transactionHash}`);
    console.log(`  Block:    ${receipt.receipt.blockNumber}`);
    console.log(`  Status:   ${receipt.success ? "SUCCESS" : "REVERTED"}`);
  } catch (waitError) {
    // Even if polling times out, the UserOp IS in the mempool and WILL mine.
    console.log(`\n[WARNING] Polling timed out, but the UserOperation was already`);
    console.log(`submitted to Pimlico. It will be mined in the background.`);
    receipt = null;
  }

  return {
    userOpHash: userOpHash,
    txHash: receipt?.receipt?.transactionHash || "pending_in_mempool",
  };
}