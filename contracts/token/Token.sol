// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor() ERC20("Base 10", "B10") {
        _mint(msg.sender, 10000000000000000);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}