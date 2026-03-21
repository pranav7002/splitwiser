//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

import {PackedUserOperation} from "lib/account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SIG_VALIDATION_FAILED,SIG_VALIDATION_SUCCESS} from "lib/account-abstraction/contracts/core/Helpers.sol";


/**@dev ERC-4337 smart wallet with session key support. Validates UserOperations and executes calls. Session keys let the agent settle autonomously without the user signing every time. */
interface IEntryPoint{
    function getNonce(address sender, uint192 key) external view returns (uint256);
}

contract SmartAccount{
    error PayPreFundFailed();
    error OnlyEntryPointAllowed();
    error OnlyOwnerCanRevoke();

    event SessionKeyGranted(address indexed key, uint48 indexed validUntil,uint256 indexed maxSpentPerTx);

    struct SessionKey{
        address key;  //address of agent
        uint48 validUntil; //in blocktime; after this timeit expires
        uint256 maxSpentPerTx;// max ETH value per single inner call
        address allowedTarget;   // only this contract can be called
        bytes4  allowedSel;      // only this function selector
        bool    active;
    }

    address private immutable owner;
    IEntryPoint private immutable iEntryPoint;

    mapping(address key=> SessionKey) public sessionKeys;

    constructor(IEntryPoint _iEntryPoint,address _owner){
     iEntryPoint=_iEntryPoint;
     owner=_owner;
    }
    
    modifier onlyEntryPoint() {
        require(msg.sender == address(iEntryPoint), OnlyEntryPointAllowed());
        _;
    }

    function grantSessionKey(address key, uint48 validUntil,uint256 maxSpentPerTx,address allowedTarget) public {
        require(msg.sender == owner, "only owner");
        require(key != address(0),   "zero key");
        require(validUntil > block.timestamp, "already expired");

        sessionKeys[key]= SessionKey({
                         key:key,
                         validUntil:validUntil,
                         maxSpentPerTx:maxSpentPerTx,
                         allowedTarget:allowedTarget,
                         allowedSel:bytes4(keccak256("settle(address)")),
                         active: true
        });
        emit SessionKeyGranted(key, validUntil, maxSpentPerTx);
    }

    function revokeSessionKey(address key) external {
        if(msg.sender!=owner){
            revert OnlyOwnerCanRevoke();
        }
        sessionKeys[key].active=false;
    }

    function validateUserOp(PackedUserOperation calldata userOps, bytes32 userOpHash, uint missingAccountFunds) external returns(uint validationData){
      return _validateSignature(userOps,userOpHash);
    }

    function _validateSignature(PackedUserOperation calldata userOps, bytes32 userOpHash) internal returns(uint){
        bytes32 hashUtils= MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address signer=ECDSA.recover(hashUtils,userOps.signature);

        if(signer!=owner){
            return SIG_VALIDATION_FAILED;
        }else{
            return SIG_VALIDATION_SUCCESS;
        }

        SessionKey memory sk= sessionKeys[signer];

        if(sk.active=false) {return SIG_VALIDATION_FAILED;}
        if(block.timestamp<sk.validUntil) {return SIG_VALIDATION_FAILED;}
        return SIG_VALIDATION_SUCCESS;

    }
    
      function _checkSessionConstraints(
        bytes calldata callData,
        SessionKey memory sk
    ) internal pure returns (bool) {
        if (callData.length < 4) return false;

        bytes4 outerSel = bytes4(callData[:4]);
        if (outerSel != SmartAccount.executeBatch.selector) return false;

        (
            address[] memory targets,
            uint256[] memory values,
            bytes[]   memory datas
        ) = abi.decode(callData[4:], (address[], uint256[], bytes[]));

        if (targets.length == 0) return false;

        for (uint256 i; i < targets.length; ++i) {
            if (targets[i] != sk.allowedTarget)    return false;
            if (values[i]  >  sk.maxSpentPerTx)    return false;
            if (datas[i].length < 4)               return false;
            if (bytes4(datas[i]) != sk.allowedSel) return false;
        }
        return true;
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

    function executeBatch() external{

    }
}