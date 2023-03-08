// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract WETH is ERC20 {
    constructor() ERC20('WETH', 'WETH') {}

    function mint(uint256 amount) public {
        _mint(_msgSender(), amount);
    }
}
