// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/HandlerFactory.sol";
import "../src/SplitWise.sol";
import "../src/ISplitWise.sol";

contract SplitWiseTest is Test {
    HandlerFactory groupFactory;
    SplitWise      group;

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    function setUp() public {
        // Deploy with address(0) verifier to skip proof checks in tests
        groupFactory = new HandlerFactory(
            IRiscZeroVerifier(address(0)),
            bytes32(0)
        );

        vm.prank(alice);
        (address groupAddr, ) = groupFactory.createGroup("Goa Trip");
        group = SplitWise(payable(groupAddr));

        vm.prank(alice);
        group.addMember(bob);
        vm.prank(alice);
        group.addMember(carol);

        vm.deal(alice, 10 ether);
        vm.deal(bob,   10 ether);
        vm.deal(carol, 10 ether);
        vm.deal(address(group), 1 ether);
    }

    function test_alice_is_member() public view {
        assertTrue(group.isMember(alice));
    }

    function test_bob_is_member() public view {
        assertEq(group.getMembers()[1], bob);
    }

    function test_duplicate_member_reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        group.addMember(bob);
    }

    function test_settleWithProof() public {
        ISplitWise.Settlement[] memory settlements = new ISplitWise.Settlement[](2);
        settlements[0] = ISplitWise.Settlement({ from: bob,   to: alice, amount: 0.01 ether  });
        settlements[1] = ISplitWise.Settlement({ from: carol, to: alice, amount: 0.005 ether });

        uint256 aliceBefore = alice.balance;

        // With verifier = address(0), proof is not checked
        group.settleWithProof{value: 0.015 ether}(settlements, "0xdeadbeef");

        assertEq(alice.balance, aliceBefore + 0.015 ether);
    }

    function test_settleWithProof_empty_reverts() public {
        ISplitWise.Settlement[] memory settlements = new ISplitWise.Settlement[](0);

        vm.expectRevert("empty");
        group.settleWithProof{value: 0}(settlements, "0x");
    }

    function test_predict_address() public {
        address predicted = groupFactory.predictAddress(alice, "My Trip");
        vm.prank(alice);
        (address actual, ) = groupFactory.createGroup("My Trip");
        assertEq(predicted, actual);
    }
}
