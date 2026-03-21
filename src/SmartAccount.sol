//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

import {PackedUserOperation} from "lib/account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SIG_VALIDATION_FAILED,SIG_VALIDATION_SUCCESS} from "lib/account-abstraction/contracts/core/Helpers.sol";

interface IEntryPoint{
    function getNonce(address sender, uint192 key) external view returns (uint256);
}

contract SmartAccount{
    error PayPreFundFailed();


    address public owner;
    constructor(IEntryPoint _entryPoint,address _owner){
      owner=_owner;
    }

    function validateUserOp(PackedUserOperation calldata userOps, bytes32 userOpHash, uint missingAccountFunds) external returns(uint validationData){
      return _validateSignature(userOps,userOpHash);
    }

    function _validateSignature(PackedUserOperation calldata userOps, bytes32 userOpHash) internal returns(uint){
        bytes32 hashUtils= MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address signature=ECDSA.recover(userOpHash,userOps.signature);

        if(signature!=owner){
            return SIG_VALIDATION_FAILED;
        }else{
            return SIG_VALIDATION_SUCCESS;
        }
    }

    function _payPrefund(uint missingAccountFunds) internal {
        if(missingAccountFunds!=0){
            (bool success,)=payable(msg.sender).call{value:missingAccountFunds,gas: type(uint256).max}("");
            if(!success){
                revert PayPreFundFailed();
            }
        }
    }

    function execute(address dest, uint value,bytes calldata functionData) external{}
}