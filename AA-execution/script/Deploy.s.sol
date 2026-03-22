// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import "../src/HandlerFactory.sol";
import "../src/SmartAccountFactory.sol";
import "../src/SmartAccount.sol";

/// @notice Deploys all contracts to Sepolia.
contract Deploy is Script {
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        HandlerFactory groupFactory = new HandlerFactory();
        console.log("HandlerFactory:      ", address(groupFactory));

        SmartAccountFactory accountFactory = new SmartAccountFactory(
            IEntryPoint(ENTRY_POINT)
        );
        console.log("SmartAccountFactory: ", address(accountFactory));

        vm.stopBroadcast();

        console.log("\n=== COPY THESE INTO YOUR .env ===");
        console.log("FACTORY_ADDRESS=    ", address(groupFactory));
        console.log("ACCOUNT_FACTORY=    ", address(accountFactory));
        console.log("ENTRY_POINT=        ", ENTRY_POINT);
        console.log("=================================");
    }
}