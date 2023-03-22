// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import './libs/TokenIdentifiers.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts/utils/Address.sol';

contract OpenStore is ERC1155Upgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable {
    using TokenIdentifiers for uint256;
    using Address for address;

    // Contract name
    string public name;
    // Contract symbol
    string public symbol;
    string public templateURI;
    address private proxy;
    mapping(uint256 => uint256) private tokenSupply;
    mapping(uint256 => address) internal _creatorOverride;
    mapping(uint256 => string) private _tokenURI;
    mapping(uint256 => mapping(address => uint256)) private balances;

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _templateURI,
        address _proxy
    ) public initializer {
        name = _name;
        symbol = _symbol;
        templateURI = _templateURI;
        proxy = _proxy;
        __Ownable_init();
        __ERC1155_init('');
    }

    // ========================= Modifier =================================

    /**
     * @dev Require msg.sender to be the creator of the token id
     */
    modifier creatorOnly(uint256 _id) {
        require(_isCreator(_id, _msgSender()), 'AssetContractShared#creatorOnly: ONLY_CREATOR_ALLOWED');
        _;
    }

    modifier onlyApproved(address _from) {
        require(
            _from == _msgSender() || isApprovedForAll(_from, _msgSender()),
            'ERC1155Tradable#onlyApproved: CALLER_NOT_ALLOWED'
        );
        _;
    }

    // =============================== read functions ===========================

    /**
     * @dev Get the creator for a token
     * @param _id   The token id to look up
     */
    function creator(uint256 _id) public view returns (address) {
        if (_creatorOverride[_id] != address(0)) {
            return _creatorOverride[_id];
        } else {
            return _id.tokenCreator();
        }
    }

    /**
     * @dev Get the maximum supply for a token
     * @param _id   The token id to look up
     */
    function maxSupply(uint256 _id) public pure returns (uint256) {
        return _id.tokenMaxSupply();
    }

    function totalSupply(uint256 _id) public view returns (uint256) {
        return tokenSupply[_id];
    }

    function setURI(uint256 _id, string memory _uri) public virtual creatorOnly(_id) {
        _tokenURI[_id] = _uri;
    }

    function setTemPlateUri(string memory _uri) external onlyOwner {
        templateURI = _uri;
    }

    function uri(uint256 _id) public view override returns (string memory) {
        string memory tokenUri = _tokenURI[_id];
        if (bytes(tokenUri).length != 0) {
            return tokenUri;
        }
        return templateURI;
    }

    function balanceOf(address account, uint256 id) public view virtual override returns (uint256) {
        require(account != address(0), 'ERC1155: balance query for the zero address');
        uint256 balance = balances[id][account];

        return _isCreator(id, account) ? balance + _remainingSupply(id) : balance;
    }

    function mint(address _to, uint256 _id, uint256 _quantity, bytes memory data) public nonReentrant creatorOnly(_id) {
        require(_quantity <= _remainingSupply(_id), 'Cannot mint over maximum supply');
        require(_to != address(0), 'ERC1155: mint to the zero address');

        _beforeMint(_to, _id, _quantity);
        _mint(_to, _id, _quantity, '');

        if (data.length > 0) {
            setURI(_id, string(data));
        }
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override onlyApproved(from) {
        require(to != address(0), 'ERC1155: transfer to the zero address');
        uint256 mintedBalance = balances[id][from];

        if (mintedBalance < amount) {
            // Only mint what _from doesn't already have
            mint(to, id, amount - mintedBalance, '');
            if (mintedBalance > 0) {
                _transfer(from, to, id, mintedBalance, data);
            }
        } else {
            _transfer(from, to, id, amount, data);
        }
    }

    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) public override {
        require(_ids.length == _amounts.length, 'AssetContract#safeBatchTransferFrom: INVALID_ARRAYS_LENGTH');
        for (uint256 i = 0; i < _ids.length; i++) {
            safeTransferFrom(_from, _to, _ids[i], _amounts[i], _data);
        }
    }

    // ============================== Internal functions ==================

    function _beforeMint(address to, uint256 _id, uint256 amount) internal {
        balances[_id][to] += amount;
        tokenSupply[_id] += amount;
    }

    function _transfer(address from, address to, uint256 id, uint256 amount, bytes memory data) internal {
        require(balances[id][from] >= amount, 'ERC1155: insufficient balance for transfer');
        balances[id][from] -= amount;
        balances[id][to] += amount;

        emit TransferSingle(_msgSender(), from, to, id, amount);

        doSafeTransferAcceptanceCheck(_msgSender(), from, to, id, amount, data);
    }

    // Override ERC1155 for birth events
    function _origin(uint256 _id) internal pure returns (address) {
        return _id.tokenCreator();
    }

    function _isCreator(uint256 _id, address _address) internal view returns (bool) {
        address creator_ = creator(_id);
        return creator_ == _address || msg.sender == proxy;
    }

    function _remainingSupply(uint256 _id) internal view returns (uint256) {
        return maxSupply(_id) - totalSupply(_id);
    }

    function doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) private {
        if (to.isContract()) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                if (response != IERC1155Receiver(to).onERC1155Received.selector) {
                    revert('ERC1155: ERC1155Receiver rejected tokens');
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert('ERC1155: transfer to non ERC1155Receiver implementer');
            }
        }
    }
}
