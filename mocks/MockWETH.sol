// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

// Mock WETH contract.
// Must implement the EIP-2612 interface to support gasless approvals.
contract MockWETH is ERC20, ERC20Permit {
    constructor() ERC20("MockWETH", "WETH") ERC20Permit("MockWETH") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 value) external {
        _burn(msg.sender, value);
        (bool success, ) = msg.sender.call{ value: value }("");
        require(success, "WETH: ETH transfer failed");
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
