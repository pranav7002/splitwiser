//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

import "./ISplitWise.sol";


/** @dev Core group contract. Stores who owes whom in a debt graph (_balances[debtor][creditor]). Has addExpense to record debts and settleWithProof to execute the zkVM's settlement plan atomically on-chain. */
contract SplitWise is ISplitWise {
    error MemberAlreadyThere();
    error ArraysLengthNotMatch();
    error NotMeber();
    error SettleFailed();

    string public groupName;
    address public owner;

    address[] private _members;
    /// @dev balances[debtor][creditor] = how much debtor owes creditor (in wei)
    mapping(address => mapping(address => uint256)) private balance;
    mapping(address => bool) private _isMember;

    constructor(address _owner, string memory _name) {
        groupName = _name;
        owner = _owner;
    }

    function addMember(address member) external {
        if (_isMember[member]) {
            revert MemberAlreadyThere();
        }
        _members.push(member);
    }

    function addExpense(
        string calldata description,
        address[] calldata debtors,
        uint256[] calldata shares
    ) external {
        if (debtors.length != shares.length) {
            revert ArraysLengthNotMatch();
        }
        uint total;
        for (uint i = 0; i < debtors.length; i++) {
            if (!_isMember[debtors[i]]) {
                revert NotMember();
            }
            total += shares[i];
        }
        for (uint256 i; i < debtors.length; ++i) {
            balance[debtors[i]][msg.sender] += shares[i];
        }
    }
    function settle(address creditor) external payable {
        uint owe = balance[msg.sender][creditor];
        (bool success, ) = creditor.call{value: msg.value}("");
        if (!success) {
            revert SettleFailed();
        }
    }
    function settleWithProof(
        Settlement[] calldata settlements,
        bytes calldata proof
    ) external {
        require(settlements.length > 0, "empty");
        (proof); 

        for (uint256 i; i < settlements.length; ++i) {
            Settlement calldata s = settlements[i];

            uint256 owed = balance[s.from][s.to];
            require(owed > 0, "nothing owed");
            require(s.amount == owed, "wrong amount");

            balance[s.from][s.to] = 0;

            (bool ok, ) = s.to.call{value: s.amount}("");
            if (!ok) revert TransferFailed();

            emit Settled(s.from, s.to, s.amount);
        }
    }
    function getBalance(
        address debtor,
        address creditor
    ) external view override returns (uint256) {
        return balance[debtor][creditor];
    }

    function getMembers() external view returns (address[] memory) {
        return _members;
    }

    function getNetBalance(address user) external view returns (int256) {}
}
