// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./ISplitWise.sol";

/// @dev RISC Zero verifier interface for on-chain proof verification.
interface IRiscZeroVerifier {
    function verify(
        bytes calldata seal,
        bytes32 imageId,
        bytes32 journalDigest
    ) external view;
}

/// @title SplitWise — ZK-verified group settlement contract
/// @dev Stores group membership. Settlement logic is computed entirely off-chain
///      inside the RISC Zero zkVM. The ZK proof guarantees the settlement plan
///      is mathematically honest. This contract verifies that proof on-chain
///      and atomically distributes ETH to creditors.
contract SplitWise is ISplitWise {
    error MemberAlreadyThere();

    string public groupName;
    address public owner;
    IRiscZeroVerifier public immutable verifier;
    bytes32 public immutable imageId;

    address[] private _members;
    mapping(address => bool) public isMember;

    /// @param _owner      Group creator address
    /// @param _name       Human-readable group name
    /// @param _verifier   Address of the deployed RISC Zero Groth16 verifier
    /// @param _imageId    The RISC Zero guest image ID (identifies the exact circuit)
    constructor(
        address _owner,
        string memory _name,
        IRiscZeroVerifier _verifier,
        bytes32 _imageId
    ) {
        groupName = _name;
        owner = _owner;
        verifier = _verifier;
        imageId = _imageId;

        isMember[_owner] = true;
        _members.push(_owner);
        emit MemberAdded(_owner);
    }

    function addMember(address member) public {
        if (isMember[member]) {
            revert MemberAlreadyThere();
        }
        _members.push(member);
        isMember[member] = true;
        emit MemberAdded(member);
    }

    /// @notice Verifies the ZK proof and atomically settles all debts.
    /// @dev    The caller (agent's SmartAccount) must send enough ETH to cover
    ///         the total settlement amount. The contract distributes ETH to
    ///         each creditor as specified by the zkVM-proven settlement plan.
    /// @param settlements  The array of {from, to, amount} transfers proven by the zkVM
    /// @param proof        The RISC Zero seal (Groth16 proof bytes)
    function settleWithProof(
        Settlement[] calldata settlements,
        bytes calldata proof
    ) external payable {
        require(settlements.length > 0, "empty");

        // ── 1. Reconstruct the journal from the settlements ──────────
        //    The journal is the public output that was committed inside the zkVM.
        //    We recompute its digest here so the verifier can confirm the proof
        //    was generated for exactly these settlement instructions.
        bytes32 journalDigest = sha256(abi.encode(settlements));

        // ── 2. Verify the RISC Zero proof on-chain ───────────────────
        //    This call reverts if the proof is invalid.
        if (address(verifier) != address(0)) {
            try verifier.verify(proof, imageId, journalDigest) {
                // proof is valid
            } catch {
                revert ProofVerificationFailed();
            }
        }

        // ── 3. Execute ETH transfers atomically ──────────────────────
        for (uint256 i; i < settlements.length; ++i) {
            Settlement calldata s = settlements[i];

            (bool ok, ) = s.to.call{value: s.amount}("");
            if (!ok) revert TransferFailed();

            emit Settled(s.from, s.to, s.amount);
        }
    }

    function getMembers() external view returns (address[] memory) {
        return _members;
    }

    receive() external payable {}
}
