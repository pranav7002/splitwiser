// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISplitWise {
    // ── structs ───────────────────────────────────────────────────
    struct Settlement {
        address from;    // debtor
        address to;      // creditor
        uint256 amount;  // exact amount owed in wei
    }

    // ── events ────────────────────────────────────────────────────
    event MemberAdded(address indexed member);
    event Settled(address indexed debtor, address indexed creditor, uint256 amount);

    // ── errors ────────────────────────────────────────────────────
    error NotMember();
    error AlreadyMember();
    error TransferFailed();
    error ProofVerificationFailed();

    // ── core functions ────────────────────────────────────────────
    function addMember(address member) external;

    /// @notice AA + zkVM settlement flow.
    ///         Called by smart account via UserOperation.
    ///         Verifies ZK proof then executes all settlements atomically.
    function settleWithProof(
        Settlement[] calldata settlements,
        bytes calldata proof
    ) external payable;

    // ── views ─────────────────────────────────────────────────────
    function getMembers() external view returns (address[] memory);
}