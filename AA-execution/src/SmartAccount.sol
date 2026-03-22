//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

import {
    PackedUserOperation
} from "lib/account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {
    SIG_VALIDATION_FAILED,
    SIG_VALIDATION_SUCCESS
} from "lib/account-abstraction/contracts/core/Helpers.sol";

/**@dev ERC-4337 smart wallet with session key support. Validates UserOperations and executes calls. Session keys let the agent settle autonomously without the user signing every time.
I intend it to have a sessionkey which check if its validTIme for to execute the functipn rather than just executing on whim */
interface IEntryPoint {
    function getNonce(
        address sender,
        uint192 key
    ) external view returns (uint256);
}

contract SmartAccount {
    error PayPreFundFailed();
    error OnlyEntryPointAllowed();
    error OnlyOwnerCanRevoke();

    event SessionKeyGranted(
        address indexed key,
        uint48 indexed validUntil,
        uint256 indexed maxSpentPerTx
    );
    event Executed(address indexed target, uint indexed value);

    struct SessionKey {
        address key; //address of agent
        uint48 validUntil; //in blocktime; after this timeit expires
        uint256 maxSpentPerTx; // max ETH value per single inner call
        address allowedTarget; // only this contract can be called
        bytes4 allowedSel; // only this function selector
        bool active;
    }

    address private immutable owner;
    IEntryPoint private immutable iEntryPoint;

    mapping(address key => SessionKey) public sessionKeys;

    constructor(IEntryPoint _iEntryPoint, address _owner) {
        iEntryPoint = _iEntryPoint;
        owner = _owner;
    }

    modifier onlyEntryPoint() {
        require(msg.sender == address(iEntryPoint), OnlyEntryPointAllowed());
        _;
    }

    modifier onlyEntryPointOrOwner() {
        require(
            msg.sender == address(iEntryPoint) || msg.sender == owner,
            OnlyEntryPointAllowed()
        );
        _;
    }

    function grantSessionKey(
        address key,
        uint48 validUntil,
        uint256 maxSpentPerTx,
        address allowedTarget
    ) public {
        require(msg.sender == owner, "only owner");
        require(key != address(0), "zero key");
        require(validUntil > block.timestamp, "already expired");

        sessionKeys[key] = SessionKey({
            key: key,
            validUntil: validUntil,
            maxSpentPerTx: maxSpentPerTx,
            allowedTarget: allowedTarget,
            allowedSel: bytes4(keccak256("settleWithProof((address,address,uint256)[],bytes)")),
            active: true
        });
        emit SessionKeyGranted(key, validUntil, maxSpentPerTx);
    }

    function revokeSessionKey(address key) external {
        if (msg.sender != owner) {
            revert OnlyOwnerCanRevoke();
        }
        sessionKeys[key].active = false;
    }

    function validateUserOp(
        PackedUserOperation calldata userOps,
        bytes32 userOpHash,
        uint missingAccountFunds
    ) external onlyEntryPoint returns (uint validationData) {
        validationData = _validateSignature(userOps, userOpHash);
        _payPrefund(missingAccountFunds);
    }

    function _validateSignature(
        PackedUserOperation calldata userOps,
        bytes32 userOpHash
    ) internal returns (uint) {
        bytes32 hashUtils = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address signer = ECDSA.recover(hashUtils, userOps.signature);

        if (signer == owner) {
            return SIG_VALIDATION_SUCCESS;
        }
        SessionKey memory sk = sessionKeys[signer];

        if (!sk.active) return SIG_VALIDATION_FAILED;
        if (block.timestamp > sk.validUntil) return SIG_VALIDATION_FAILED;
        if (!_checkSessionConstraints(userOps.callData, sk))
            return SIG_VALIDATION_FAILED;

        return SIG_VALIDATION_SUCCESS;
    }

    function _checkSessionConstraints(
        bytes calldata callData,
        SessionKey memory sk
    ) internal pure returns (bool) {
        if (callData.length < 4) return false;

        bytes4 outerSel = bytes4(callData[:4]);

        // allow both execute and executeBatch
        bool isExecute      = outerSel == SmartAccount.execute.selector;
        bool isExecuteBatch = outerSel == SmartAccount.executeBatch.selector;

        if (!isExecute && !isExecuteBatch) return false;

        if (isExecute) {
            // decode execute(address target, uint256 value, bytes data)
            (address target, uint256 value, bytes memory data)
                = abi.decode(callData[4:], (address, uint256, bytes));

            if (target != sk.allowedTarget)  return false;
            if (value  >  sk.maxSpentPerTx)  return false;
            if (data.length < 4)             return false;
            if (bytes4(data) != sk.allowedSel) return false;
        }

        if (isExecuteBatch) {
            (
                address[] memory targets,
                uint256[] memory values,
                bytes[]   memory datas
            ) = abi.decode(callData[4:], (address[], uint256[], bytes[]));

            if (targets.length == 0) return false;

            for (uint256 i; i < targets.length; ++i) {
                if (targets[i] != sk.allowedTarget)      return false;
                if (values[i]  >  sk.maxSpentPerTx)      return false;
                if (datas[i].length < 4)                 return false;
                if (bytes4(datas[i]) != sk.allowedSel)   return false;
            }
        }

        return true;
    }

    function _payPrefund(uint missingAccountFunds) internal {
        if (missingAccountFunds != 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds,
                gas: type(uint256).max
            }("");
            if (!success) {
                revert PayPreFundFailed();
            }
        }
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyEntryPointOrOwner {
        (bool ok, bytes memory result) = target.call{value: value}(data);
        if (!ok) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit Executed(target, value);
    }

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external payable onlyEntryPointOrOwner {
        require(
            targets.length == values.length && values.length == datas.length,
            "length mismatch"
        );
        require(targets.length > 0, "empty batch");

        for (uint256 i; i < targets.length; ++i) {
            (bool ok, bytes memory result) = targets[i].call{value: values[i]}(
                datas[i]
            );
            if (!ok) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
            emit Executed(targets[i], values[i]);
        }
    }
    receive() external payable {}
}
