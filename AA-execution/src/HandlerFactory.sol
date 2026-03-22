//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

import "./SplitWise.sol";

/**
 @title HandlerFactory
 @author Mihir
  This Contract allows to generate small group contract and keep tract of their address by predicting it using CREATE2 code
  */
contract HandlerFactory {
    
    mapping(bytes32 groupId=> address groupAddr) private groups;

    event GroupCreated(bytes32 indexed groupId, address indexed groupAddr, address indexed creator);

    function createGroup(
        string calldata name
    ) public returns (address groupAddr, bytes32 groupId) {
        groupId = _salt(msg.sender, name);
        groupAddr = address(new SplitWise{salt: groupId}(msg.sender, name));
        groups[groupId]=groupAddr;
        emit GroupCreated(groupId, groupAddr,msg.sender);
    }

    function predictAddress(
        address creator,
        string calldata name
    ) public view returns (address) {
        bytes32 salt = _salt(creator, name);
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(SplitWise).creationCode,
                abi.encode(creator, name)
            )
        );
        return
            address(
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

    function _salt(
        address creator,
        string calldata name
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(creator, name));
    }

    //////////////getters//////////////
    function getGroups(bytes32 groupId) external view returns(address){
        return groups[groupId];
    }
}
