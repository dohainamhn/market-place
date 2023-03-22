// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import './OpenStore.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

contract Marketplace is OwnableUpgradeable {
    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    struct Offer {
        uint256 offerId;
        uint256 nftId;
        address collectionAddress;
        uint256 nftAmount;
        address tokenAddress;
        uint256 tokenAmount;
        address buyer;
        address seller;
        uint256 timestamp;
    }

    struct Order {
        uint256 orderId;
        uint256 nftId;
        address collectionAddress;
        uint256 nftAmount;
        uint256 ethAmount;
        address buyer;
        address payable seller;
        uint256 timestamp;
    }

    bytes32 DOMAIN_SEPARATOR;
    uint256 public EXPIRED_TIME;
    mapping(uint256 => bool) expiredOffers;

    event ExecutedOffer(uint256 offerId);
    event ExecutedOrder(uint256 orderId);

    function initialize(string memory domain, uint256 expiredTime) public initializer {
        EXPIRED_TIME = expiredTime;
        __Ownable_init();

        DOMAIN_SEPARATOR = hashDomain(
            EIP712Domain({name: domain, version: '1', chainId: block.chainid, verifyingContract: address(this)})
        );
    }

    function acceptERC1155Offer(Offer calldata _offer, uint8 v, bytes32 r, bytes32 s) external {
        require(!expiredOffers[_offer.offerId], 'Expired Offer');
        require(verify(_offer, owner(), v, r, s), 'wrong signature');
        require(_offer.seller == _msgSender(), 'Not allow to call');
        require(block.timestamp <= _offer.timestamp + EXPIRED_TIME, 'Deadline reached');

        uint256 tokenAllowance = IERC20(_offer.tokenAddress).allowance(_offer.buyer, address(this));

        require(tokenAllowance >= _offer.tokenAmount, 'ERC20: insufficient allowance');
        IERC20(_offer.tokenAddress).transferFrom(_offer.buyer, _offer.seller, _offer.tokenAmount);
        IERC1155(_offer.collectionAddress).safeTransferFrom(
            _offer.seller,
            _offer.buyer,
            _offer.nftId,
            _offer.nftAmount,
            '0x'
        );

        expiredOffers[_offer.offerId] = true;
        emit ExecutedOffer(_offer.offerId);
    }

    function acceptERC721Offer(Offer calldata _offer, uint8 v, bytes32 r, bytes32 s) external {
        require(!expiredOffers[_offer.offerId], 'Expired Offer');
        require(verify(_offer, owner(), v, r, s), 'wrong signature');
        require(_offer.seller == _msgSender(), 'Not allow to call');
        require(block.timestamp <= _offer.timestamp + EXPIRED_TIME, 'Deadline reached');

        uint256 tokenAllowance = IERC20(_offer.tokenAddress).allowance(_offer.buyer, address(this));

        require(tokenAllowance >= _offer.tokenAmount, 'ERC20: insufficient allowance');

        IERC20(_offer.tokenAddress).transferFrom(_offer.buyer, _offer.seller, _offer.tokenAmount);
        IERC721(_offer.collectionAddress).safeTransferFrom(_offer.seller, _offer.buyer, _offer.nftId, '0x');

        expiredOffers[_offer.offerId] = true;
        emit ExecutedOffer(_offer.offerId);
    }

    function buyERC1155Nft(Order calldata _order, uint8 v, bytes32 r, bytes32 s) external payable {
        require(!expiredOffers[_order.orderId], 'Expired order');
        require(verifyOrder(_order, owner(), v, r, s), 'wrong signature');
        require(_order.buyer == _msgSender(), 'Not allow to call');
        require(block.timestamp <= _order.timestamp + EXPIRED_TIME, 'Deadline reached');
        // proxyTransfer(_order.seller, _order.buyer, _order.nftId, _order.nftAmount, '0x');
        IERC1155(_order.collectionAddress).safeTransferFrom(
            _order.seller,
            _order.buyer,
            _order.nftId,
            _order.nftAmount,
            '0x'
        );
        _order.seller.transfer(_order.ethAmount);
        expiredOffers[_order.orderId] = true;
        emit ExecutedOrder(_order.orderId);
    }

    function buyERC721Nft(Order calldata _order, uint8 v, bytes32 r, bytes32 s) external payable {
        require(!expiredOffers[_order.orderId], 'Expired order');
        require(verifyOrder(_order, owner(), v, r, s), 'wrong signature');
        require(_order.buyer == _msgSender(), 'Not allow to call');
        require(block.timestamp <= _order.timestamp + EXPIRED_TIME, 'Deadline reached');
        IERC721(_order.collectionAddress).safeTransferFrom(_order.seller, _order.buyer, _order.nftId, '0x');
        _order.seller.transfer(_order.ethAmount);
        expiredOffers[_order.orderId] = true;
        emit ExecutedOrder(_order.orderId);
    }

    function setDomainSeparator(string memory name, string memory version) public onlyOwner {
        DOMAIN_SEPARATOR = hashDomain(
            EIP712Domain({name: name, version: version, chainId: block.chainid, verifyingContract: address(this)})
        );
    }

    function hashDomain(EIP712Domain memory eip712Domain) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                    keccak256(bytes(eip712Domain.name)),
                    keccak256(bytes(eip712Domain.version)),
                    eip712Domain.chainId,
                    eip712Domain.verifyingContract
                )
            );
    }

    function hashOffer(Offer memory offer) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        'Offer(uint256 offerId,uint256 nftId,address collectionAddress,uint256 nftAmount,address tokenAddress,uint256 tokenAmount,address buyer,address seller,uint256 timestamp)'
                    ),
                    offer.offerId,
                    offer.nftId,
                    offer.collectionAddress,
                    offer.nftAmount,
                    offer.tokenAddress,
                    offer.tokenAmount,
                    offer.buyer,
                    offer.seller,
                    offer.timestamp
                )
            );
    }

    function hashOrder(Order memory order) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        'Order(uint256 orderId,uint256 nftId,address collectionAddress,uint256 nftAmount,uint256 ethAmount,address buyer,address seller,uint256 timestamp)'
                    ),
                    order.orderId,
                    order.nftId,
                    order.collectionAddress,
                    order.nftAmount,
                    order.ethAmount,
                    order.buyer,
                    order.seller,
                    order.timestamp
                )
            );
    }

    function verify(Offer memory offer, address sender, uint8 v, bytes32 r, bytes32 s) public view returns (bool) {
        bytes32 digest = keccak256(abi.encodePacked('\x19\x01', DOMAIN_SEPARATOR, hashOffer(offer)));
        return ecrecover(digest, v, r, s) == sender;
    }

    function verifyOrder(Order memory order, address sender, uint8 v, bytes32 r, bytes32 s) public view returns (bool) {
        bytes32 digest = keccak256(abi.encodePacked('\x19\x01', DOMAIN_SEPARATOR, hashOrder(order)));
        return ecrecover(digest, v, r, s) == sender;
    }

    function ChangeExpiredTime(uint256 _seconds) external {
        EXPIRED_TIME = _seconds;
    }
}
