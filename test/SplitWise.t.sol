// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/HandlerFactory.sol";
import "../src/SmartAccountFactory.sol";
import "../src/SplitWise.sol";
import "../src/ISplitWise.sol";

contract SplitWiseTest is Test {
    HandlerFactory      groupFactory;
    SmartAccountFactory accountFactory;
    SplitWise           group;

    address entryPoint = makeAddr("entrypoint");

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    function setUp() public {
        groupFactory   = new HandlerFactory();
        accountFactory = new SmartAccountFactory(IEntryPoint(entryPoint));

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

    function test_alice_is_member() public {
        assertTrue(group._isMember(alice) == false); 
    }

    function test_bob_is_member() public view {
        assertEq(group.getMembers()[1], bob);
    }

    function test_duplicate_member_reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        group.addMember(bob);
    }

    function test_add_expense() public {
        address[] memory debtors = new address[](2);
        uint256[] memory shares  = new uint256[](2);
        debtors[0] = bob;   shares[0] = 0.01 ether;
        debtors[1] = carol; shares[1] = 0.01 ether;

        vm.prank(alice);
        group.addExpense("Dinner", debtors, shares);

        assertEq(group.getBalance(bob,   alice), 0.01 ether);
        assertEq(group.getBalance(carol, alice), 0.01 ether);
    }

    function test_expense_arrays_mismatch_reverts() public {
        address[] memory debtors = new address[](1);
        uint256[] memory shares  = new uint256[](2);
        debtors[0] = bob;
        shares[0]  = 0.01 ether;
        shares[1]  = 0.01 ether;

        vm.prank(alice);
        vm.expectRevert();
        group.addExpense("Bad", debtors, shares);
    }

    function test_settle() public {
        address[] memory debtors = new address[](1);
        uint256[] memory shares  = new uint256[](1);
        debtors[0] = bob; shares[0] = 0.01 ether;

        vm.prank(alice);
        group.addExpense("Coffee", debtors, shares);

        uint256 aliceBefore = alice.balance;

        vm.prank(bob);
        group.settle{value: 0.01 ether}(alice);

        assertEq(group.getBalance(bob, alice), 0);
        assertEq(alice.balance, aliceBefore + 0.01 ether);
    }

    function test_settleWithProof() public {
        address[] memory debtors = new address[](2);
        uint256[] memory shares  = new uint256[](2);
        debtors[0] = bob;   shares[0] = 0.01 ether;
        debtors[1] = carol; shares[1] = 0.005 ether;

        vm.prank(alice);
        group.addExpense("Trip", debtors, shares);

        ISplitWise.Settlement[] memory settlements = new ISplitWise.Settlement[](2);
        settlements[0] = ISplitWise.Settlement({ from: bob,   to: alice, amount: 0.01 ether  });
        settlements[1] = ISplitWise.Settlement({ from: carol, to: alice, amount: 0.005 ether });

        uint256 aliceBefore = alice.balance;

        group.settleWithProof{value: 0.015 ether}(settlements, "0xdeadbeef");

        assertEq(group.getBalance(bob,   alice), 0);
        assertEq(group.getBalance(carol, alice), 0);
        assertEq(alice.balance, aliceBefore + 0.015 ether);
    }

    function test_settleWithProof_wrong_amount_reverts() public {
        address[] memory debtors = new address[](1);
        uint256[] memory shares  = new uint256[](1);
        debtors[0] = bob; shares[0] = 0.01 ether;

        vm.prank(alice);
        group.addExpense("Coffee", debtors, shares);

        ISplitWise.Settlement[] memory settlements = new ISplitWise.Settlement[](1);
        settlements[0] = ISplitWise.Settlement({ from: bob, to: alice, amount: 0.005 ether }); 

        vm.expectRevert("wrong amount");
        group.settleWithProof{value: 0.005 ether}(settlements, "0x");
    }

    function test_settleWithProof_nothing_owed_reverts() public {
        ISplitWise.Settlement[] memory settlements = new ISplitWise.Settlement[](1);
        settlements[0] = ISplitWise.Settlement({ from: bob, to: alice, amount: 0.01 ether });

        vm.expectRevert("nothing owed");
        group.settleWithProof{value: 0.01 ether}(settlements, "0x");
    }

    function test_getNetBalance() public {
        address[] memory debtors = new address[](2);
        uint256[] memory shares  = new uint256[](2);
        debtors[0] = bob;   shares[0] = 0.01 ether;
        debtors[1] = carol; shares[1] = 0.01 ether;

        vm.prank(alice);
        group.addExpense("Dinner", debtors, shares);

        assertEq(group.getNetBalance(alice),  int256(0.02 ether));
        assertEq(group.getNetBalance(bob),   -int256(0.01 ether));
        assertEq(group.getNetBalance(carol), -int256(0.01 ether));
    }

    function test_predict_address() public {
        address predicted = groupFactory.predictAddress(alice, "My Trip");
        vm.prank(alice);
        (address actual, ) = groupFactory.createGroup("My Trip");
        assertEq(predicted, actual);
    }

    function test_smart_account_factory() public {
        vm.prank(alice);
        address account = accountFactory.createSmartAccount();
        assertTrue(account != address(0));
    }
}
