// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

// Mock USDC contract that allows anyone to mint for free.
// Must implement the EIP-2612 interface to support gasless approvals.
contract MockUSDC is ERC20, ERC20Permit {
    constructor() ERC20("MockUSDC", "USDC") ERC20Permit("MockUSDC") {}

    function mint(address _account, uint256 _amount) external {
        _mint(_account, _amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}