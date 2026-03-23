# SplitWiser

SplitWiser is a verifiable, trust-minimized expense settlement protocol that combines deterministic debt simplification, Zero-Knowledge Proofs (RISC Zero), and Account Abstraction (ERC-4337) to ensure that settlements are computed correctly, cryptographically proven, and executed in a single transaction.

## Local Setup Guide

This project consists of four primary services that must be running concurrently. Follow these steps to set up the environment on a local machine.

### Prerequisites

*   Node.js (v18 or higher) and npm
*   Rust toolchain (latest stable)
*   RISC Zero toolchain (`cargo risczero install`)
*   MongoDB (local instance or MongoDB Atlas cluster)
*   Ethereum Sepolia RPC provider (e.g., Alchemy or Infura)
*   Pimlico API Key (for Bundler and Paymaster services)

### 1. Project Configuration

Clone the repository and install the root dependencies to enable concurrent service management.

```bash
git clone <repository-url>
cd splitwiser
npm install
```

### 2. Service-Specific Environment Setup

Create `.env` files in each of the following directories based on the provided `.env.example` templates.

#### Backend (`backend/.env`)
*   `MONGO_URI`: Your MongoDB connection string.
*   `ZKVM_SERVICE_URL`: `http://localhost:3002`
*   `EXECUTION_SERVICE_URL`: `http://localhost:3001/execute-settlement`

#### AA-Execution Agent (`AA-execution/agent/.env`)
*   `SEPOLIA_RPC`: Your Sepolia RPC URL.
*   `AGENT_PRIVATE_KEY`: Private key for the account that will sign UserOperations.
*   `BUNDLER_URL`: Your Pimlico Bundler URL.
*   `FACTORY_ADDRESS`: `0x2212e8eb5f6825e227fabe361623f0cb507119ec` (SplitWise HandlerFactory).

#### Frontend (`frontend/.env`)
*   `VITE_API_URL`: `http://localhost:8000/api`

### 3. Running the Application

You can start all services simultaneously from the root directory using the following command:

```bash
npm run dev
```

Alternatively, you may start each service manually in separate terminal windows:

*   **Backend**: `cd backend && npm run dev`
*   **AA-Agent**: `cd AA-execution/agent && npm run start`
*   **ZKVM Prover**: `cd risc0-settlement && cargo run`
*   **Frontend**: `cd frontend && npm run dev`

---

## Core Idea

Traditional expense-sharing applications require users to trust a centralized backend for mathematical accuracy and data integrity. SplitWiser removes this trust assumption by:

1.  **Verifiable Computation**: Executing the debt-simplification algorithm inside a ZK-Virtual Machine (zkVM).
2.  **Cryptographic Proofs**: Generating a RISC Zero receipt that mathematically guarantees the settlement plan is the only valid output for the given inputs.
3.  **On-Chain Enforcement**: Executing the verified result atomically via Smart Accounts, ensuring funds are distributed as proven.

## Project Architecture

SplitWiser is built using a modular architecture that separates computation, verification, and execution.

### 1. Backend (Node.js/Express)
The backend manages group and expense data, calculates the current state of balances, and orchestrates the settlement pipeline. It is responsible for providing inputs to the zkVM and passing the resulting proof to the execution agent.

### 2. ZKVM Prover (RISC Zero)
The Prover executes the core debt-simplification logic in a sandboxed environment. It produces a cryptographic seal (proof) and a journal (public output) that confirms the settlement plan accurately clears all debts based on the participants' canonical balances.

### 3. Account Abstraction Layer (ERC-4337)
This layer utilizes Smart Accounts to abstract away gas management and transaction complexity. By using a Paymaster, the protocol enables gasless settlements for participants.

### 4. AA Execution Agent
The Agent receives the settlement instructions and the ZK proof. It constructs a UserOperation, signs it, and submits it to a Bundler (Pimlico). The final transaction calls the `settleWithProof` function on the group's smart contract.

### 5. Frontend (React)
A real-time dashboard that allows users to manage expenses and monitor the settlement pipeline. It provides visual feedback for the ZK proving process and the status of on-chain execution.

## Key Features

### Verifiable Settlements
Every settlement is computed deterministically and proven within the zkVM. This guarantees that the output is mathematically correct and has not been tampered with by the backend or any intermediary.

### Single-Transaction Settlement
Instead of multiple manual payments and coordination, SplitWiser compresses all transfers into a single transaction that executes on-chain. This minimizes fragmentation and ensures atomic clearing of all debts.

### The Vault (Escrow Model)
The protocol supports an escrow structure where funds can be pre-locked in the group's smart contract address. This "Vault" ensures solvency and provides a trustless environment where debts are cleared from a collective pool of capital.

### Gasless UX
By integrating Account Abstraction and Paymasters, users do not need to manage gas or hold native ETH to settle their debts. The execution agent handles the submission, and the protocol can sponsor transaction fees.

## Technical Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS.
*   **Backend**: Node.js, Express, MongoDB, Mongoose.
*   **Blockchain**: Solidity, Viem, Ethers.js, ERC-4337 (AA).
*   **Cryptography**: RISC Zero zkVM (Rust).
