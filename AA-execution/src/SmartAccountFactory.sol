//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

import "./SmartAccount.sol";

/**
 @title HandlerFactory
 @author Mihir
  This Contract allows to generate minimal SmartAccount and keep tract of their address by predicting it using CREATE2 code
  */
contract SmartAccountFactory {
    IEntryPoint immutable ientryPoint;

    event SmartAccountCreated(
        address indexed owner,
        address indexed accountAddr
    );

    constructor(IEntryPoint _entryPoint) {
        ientryPoint = _entryPoint;
    }

    //Allows creating a smartAccount for a contract, here i have taken msg.sender for salt
    function createSmartAccount() public returns (address accountAddr) {
        bytes32 salt = keccak256(abi.encodePacked(msg.sender));
        accountAddr = address(
            new SmartAccount{salt: salt}(ientryPoint, msg.sender)
        );

        emit SmartAccountCreated(msg.sender, accountAddr);
    }

    //Allows predicting address of smartAccount beforeHand
    function predictAddr(
        address owner
    ) external view returns (address accountAddr) {
        bytes32 salt = keccak256(abi.encodePacked(msg.sender));
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(SmartAccount).creationCode,
                abi.encode(ientryPoint, owner)
            )
        );
        accountAddr = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(this),
                            salt,
                            initCodeHash
                        )
                    )
                )
            )
        );
    }
}
