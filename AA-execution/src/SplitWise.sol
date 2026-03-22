//SPDX-License-Identifier:MIT
pragma solidity ^0.8.23;

import "./ISplitWise.sol";

/** @dev Core group contract. Stores who owes whom in a debt graph (_balances[debtor][creditor]). Has addExpense to record debts and settleWithProof to execute the zkVM's settlement plan atomically on-chain. */
contract SplitWise is ISplitWise {
    error AlreadyMember();
    error ArraysLengthNotMatch();
    error NotMember();
    

    string public groupName;
    address public owner;

    address[] private _members;
    /// @dev balances[debtor][creditor] = how much debtor owes creditor (in wei)
    mapping(address => mapping(address => uint256)) private balance;
    mapping(address => bool) public _isMember;

    constructor(address _owner, string memory _name) {
        groupName = _name;
        owner = _owner;
        _isMember[_owner] = true;
       _members.push(_owner);
       emit MemberAdded(_owner);
    }

    function addMember(address member) public {

         require(msg.sender == owner, "not owner");
        if (_isMember[member]) {
           revert AlreadyMember();
        }
        _members.push(member);
        _isMember[member] = true;
        emit MemberAdded(member); 
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
          emit ExpenseAdded(msg.sender, total, description, 0);
    }
    function settle(address creditor) external payable {
        uint256 owed = balance[msg.sender][creditor];
        if (owed == 0) revert NothingToSettle();
        if (msg.value != owed) revert("wrong amount");
        balance[msg.sender][creditor] = 0;
        (bool ok, ) = creditor.call{value: msg.value}("");
        if (!ok) revert TransferFailed();
        emit Settled(msg.sender, creditor, msg.value);
    }

    //Note  >= allows partial settlements. Subtracts only what's being paid instead of zeroing entire balance. More flexible and matches how zkVM outputs work.
    function settleWithProof(
        Settlement[] calldata settlements,
        bytes calldata proof
    ) external payable {
        require(settlements.length > 0, "empty");
        (proof);

        uint256 totalRequired;
         for (uint256 i; i < settlements.length; ++i) {
        totalRequired += settlements[i].amount;
        }

          require(msg.value >= totalRequired, "insufficient ETH");

        for (uint256 i; i < settlements.length; ++i) {
            Settlement calldata s = settlements[i];

            uint256 owed = balance[s.from][s.to];
           require(owed >= s.amount, "invalid amount");
            balance[s.from][s.to] -= s.amount;

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

    function getNetBalance(address user) external view returns (int256 net) {
        for (uint i = 0; i < _members.length; i++) {
            address member = _members[i];

            if (member == user) continue;
            net += int256(balance[member][user]); //add net balance when member owe user
            net -= int256(balance[user][member]); //sub net balance when user owe member
        }
    }

    receive() external payable {}
}
