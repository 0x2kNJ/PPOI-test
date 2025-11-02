// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { FoxConnectUS } from "../vendor/FoxConnectUS.sol";

// Nothing mocked here :D - just voids a couple unused ctor args that are 
// unnecessary for the withdraw function flow in order to simplify deployment.
contract MockFoxConnectUS is FoxConnectUS {
    constructor(address _operator, address _beneficiary, uint24 _transferFromGasLimit)
      FoxConnectUS(_dyn_arr(address(1)), address(1), _dyn_arr(_operator), _dyn_arr(_operator), _beneficiary, _transferFromGasLimit)
        {}

    function _dyn_arr(address _x) internal pure returns (address[] memory _out) {
        _out = new address[](1);
        _out[0] = _x;
    }
}