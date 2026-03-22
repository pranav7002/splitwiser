// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import "../src/HandlerFactory.sol";
import "../src/SmartAccountFactory.sol";
import "../src/SmartAccount.sol";
import "../src/SplitWise.sol";

contract SetupDemo is Script {
    address aliceAccount;
    address bobAccount;
    address carolAccount;
    address groupAddr;

    function run() external {
        _deployAccounts();
        _setupGroup();
        _fundAccounts();

        console.log("\n=== COPY THESE INTO YOUR .env ===");
        console.log("ALICE_ACCOUNT=", aliceAccount);
        console.log("BOB_ACCOUNT=  ", bobAccount);
        console.log("CAROL_ACCOUNT=", carolAccount);
        console.log("GROUP_ADDRESS=", groupAddr);
        console.log("=================================");
    }

    function _deployAccounts() internal {
        SmartAccountFactory accountFactory = SmartAccountFactory(
            vm.envAddress("ACCOUNT_FACTORY")
        );

        vm.broadcast(vm.envUint("ALICE_KEY"));
        aliceAccount = accountFactory.createSmartAccount();
        console.log("Alice SmartAccount:", aliceAccount);

        vm.broadcast(vm.envUint("BOB_KEY"));
        bobAccount = accountFactory.createSmartAccount();
        console.log("Bob SmartAccount:  ", bobAccount);

        vm.broadcast(vm.envUint("CAROL_KEY"));
        carolAccount = accountFactory.createSmartAccount();
        console.log("Carol SmartAccount:", carolAccount);
    }

    function _setupGroup() internal {
        HandlerFactory groupFactory = HandlerFactory(
            vm.envAddress("FACTORY_ADDRESS")
        );

        vm.broadcast(vm.envUint("ALICE_KEY"));
        (groupAddr,) = groupFactory.createGroup("Goa Trip");
        console.log("Group contract:    ", groupAddr);

        SplitWise group = SplitWise(payable(groupAddr));

        vm.broadcast(vm.envUint("ALICE_KEY"));
        group.addMember(bobAccount);
        console.log("Bob added as member");

        vm.broadcast(vm.envUint("ALICE_KEY"));
        group.addMember(carolAccount);
        console.log("Carol added as member");
    }

   function _fundAccounts() internal {
    vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
    
    (bool okAlice,) = payable(aliceAccount).call{value: 0.05 ether}("");
    require(okAlice, "alice transfer failed");
    
    (bool okBob,) = payable(bobAccount).call{value: 0.05 ether}("");
    require(okBob, "bob transfer failed");
    
    (bool okCarol,) = payable(carolAccount).call{value: 0.05 ether}("");
    require(okCarol, "carol transfer failed");
    
    vm.stopBroadcast();

    console.log("Funded each SmartAccount with 0.05 ETH");
}
}