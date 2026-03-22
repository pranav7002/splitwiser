// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./SplitWise.sol";

/// @title HandlerFactory — Deterministic group contract deployer
/// @dev Uses CREATE2 to deploy SplitWise group contracts with predictable addresses.
contract HandlerFactory {
    IRiscZeroVerifier public immutable verifier;
    bytes32 public immutable imageId;

    mapping(bytes32 groupId => address groupAddr) private groups;

    event GroupCreated(bytes32 indexed groupId, address indexed groupAddr, address indexed creator);

    /// @param _verifier  The RISC Zero verifier contract address (shared by all groups)
    /// @param _imageId   The RISC Zero guest image ID (shared by all groups)
    constructor(IRiscZeroVerifier _verifier, bytes32 _imageId) {
        verifier = _verifier;
        imageId = _imageId;
    }

    function createGroup(
        address creator,
        string calldata name
    ) public returns (address groupAddr, bytes32 groupId) {
        groupId = _salt(creator, name);
        groupAddr = address(
            new SplitWise{salt: groupId}(creator, name, verifier, imageId)
        );
        groups[groupId] = groupAddr;
        emit GroupCreated(groupId, groupAddr, creator);
    }

    function predictAddress(
        address creator,
        string calldata name
    ) public view returns (address) {
        bytes32 salt = _salt(creator, name);
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(SplitWise).creationCode,
                abi.encode(creator, name, verifier, imageId)
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

    function getGroups(bytes32 groupId) external view returns (address) {
        return groups[groupId];
    }
}
