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
    event ExpenseAdded(address indexed paidBy, uint256 amount, string description, uint256 expenseId);
    event Settled(address indexed debtor, address indexed creditor, uint256 amount);

    // ── errors ────────────────────────────────────────────────────
    error NotMember();
    error AlreadyMember();
    error InvalidSplit();
    error ZeroAmount();
    error NothingToSettle();
    error TransferFailed();
    error ArraysLengthNotMatch();

    // ── core functions ────────────────────────────────────────────
    function addMember(address member) external;

    function addExpense(
        string calldata description,
        address[] calldata debtors,
        uint256[] calldata shares
    ) external;

    function settle(address creditor) external payable;

    /// @notice AA + zkVM settlement flow.
    ///         Called by smart account via UserOperation.
    ///         Verifies ZK proof then executes all settlements atomically.
    function settleWithProof(
        Settlement[] calldata settlements,
        bytes calldata proof
    ) external payable;

    // ── views ─────────────────────────────────────────────────────
    function getBalance(address debtor, address creditor) external view returns (uint256);
    function getNetBalance(address user) external view returns (int256);
    function getMembers() external view returns (address[] memory);
    
}