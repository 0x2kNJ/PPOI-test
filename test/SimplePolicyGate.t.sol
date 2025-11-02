// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SimplePolicyGate } from "../contracts/SimplePolicyGate.sol";

contract SimplePolicyGateTest {
    SimplePolicyGate gate;

    function setUp() public {
        gate = new SimplePolicyGate();
        // Set policy for this test contract as the user (non-custodial: msg.sender = address(this))
        gate.setPolicy(100, 250, true); // maxTx=100, daily=250
    }

    function test_CheckOKUnderLimits() public view {
        (bool ok, ) = gate.check(address(this), 50);
        require(ok, "should be ok");
    }

    function test_CheckFailsOverMaxTx() public view {
        (bool ok, string memory reason) = gate.check(address(this), 150);
        require(!ok, "expected failure");
        require(keccak256(bytes(reason)) == keccak256("MAX_TX_EXCEEDED"), "expected MAX_TX_EXCEEDED");
    }

    function test_ConsumeTracksDailySpent() public {
        gate.consume(address(this), 100);
        gate.consume(address(this), 100);
        (bool ok, ) = gate.check(address(this), 60); // 200 spent, +60 > 250
        require(!ok, "should exceed daily limit");
    }
}


