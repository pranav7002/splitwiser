// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/HandlerFactory.sol";
import "../src/SplitWise.sol";

/// @notice Creates a demo group and adds members.
///         SmartAccounts are Pimlico SimpleAccounts created off-chain.
contract SetupDemo is Script {
    address groupAddr;

    function run() external {
        _setupGroup();
        _fundGroup();

        console.log("\n=== COPY THESE INTO YOUR .env ===");
        console.log("GROUP_ADDRESS=", groupAddr);
        console.log("=================================");
    }

    function _setupGroup() internal {
        HandlerFactory groupFactory = HandlerFactory(
            vm.envAddress("FACTORY_ADDRESS")
        );

        // Alice creates the group
        vm.broadcast(vm.envUint("ALICE_KEY"));
        (groupAddr,) = groupFactory.createGroup("Goa Trip");
        console.log("Group contract:", groupAddr);

        SplitWise group = SplitWise(payable(groupAddr));

        // Add Bob and Carol's Pimlico SimpleAccount addresses as members
        address bobAccount = vm.envAddress("BOB_ADDRESS");
        address carolAccount = vm.envAddress("CAROL_ADDRESS");

        vm.broadcast(vm.envUint("ALICE_KEY"));
        group.addMember(bobAccount);
        console.log("Bob added as member:", bobAccount);

        vm.broadcast(vm.envUint("ALICE_KEY"));
        group.addMember(carolAccount);
        console.log("Carol added as member:", carolAccount);
    }

    function _fundGroup() internal {
        // Fund the group contract so it can distribute ETH during settlement
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        payable(groupAddr).transfer(0.1 ether);
        vm.stopBroadcast();
        console.log("Funded group contract with 0.1 ETH");
    }
}