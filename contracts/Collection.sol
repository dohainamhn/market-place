// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract NFT is ERC1155 {
    constructor() ERC1155('https://clonex-assets.rtfkt.com/') {}

    function mint(
        uint256 id,
        address account,
        uint256 amount
    ) external {
        _mint(account, id, amount, '');
    }
}

contract ERC721NFT is ERC721 {
    constructor() ERC721('MoonNFT', 'MN') {}

    function mint(
        uint256 id,
        address account
    ) external {
        _safeMint(account, id);
    }
}
