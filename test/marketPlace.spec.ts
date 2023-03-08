import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import BigNumber from 'bignumber.js';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { config, ethers } from 'hardhat';
import { HardhatNetworkAccountConfig } from 'hardhat/types';
import moment from 'moment';
import {
  CollectionName,
  CollectionSymbol,
  DefaultExpiredSigTime,
  EIP712DomainName,
  EIP712OfferTypes,
  EIP712OrderTypes,
  PrimaryOfferTypeEnum,
  PrimaryOrderTypeEnum,
  TemplateUri,
} from '../consts';
import { createOfferSignature } from '../helpers/createOfferSignature';
import { createOrderSignature } from '../helpers/createOrderSignature';
import { createTokenId } from '../helpers/createTokenId';

describe('MarketPlace contract', function () {
  let myContract: Contract;
  let tokenContract: Contract;
  let signers: SignerWithAddress[];
  let collectionContract: Contract;
  let erc721CollectionContract: Contract;
  let openStoreContract: Contract;
  let accounts = config.networks.hardhat.accounts as HardhatNetworkAccountConfig[];
  this.beforeEach(async () => {
    signers = await ethers.getSigners();
    const token = await ethers.getContractFactory('WETH');
    tokenContract = await token.deploy();
    await tokenContract.deployed();

    const collection = await ethers.getContractFactory('NFT');
    collectionContract = await collection.deploy();
    await collectionContract.deployed();

    const erc721Collection = await ethers.getContractFactory('ERC721NFT');
    erc721CollectionContract = await erc721Collection.deploy();
    await erc721CollectionContract.deployed();

    const MarketPlace = await ethers.getContractFactory('Marketplace');
    myContract = await MarketPlace.deploy();
    await myContract.deployed();
    await myContract.initialize(EIP712DomainName, DefaultExpiredSigTime);

    const OpenStore = await ethers.getContractFactory('OpenStore');
    openStoreContract = await OpenStore.deploy();
    await openStoreContract.deployed();

    await openStoreContract.initialize(CollectionName, CollectionSymbol, TemplateUri, myContract.address);
  });

  describe('Test Openstore Accept ERC1155 Offer func', () => {
    it('Test Openstore offer successfully', async () => {
      const buyer = signers[0];
      const seller = signers[1];

      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: seller.address,
      });
      const maxSupply = await openStoreContract.maxSupply(tokenId);
      expect(maxSupply.toString()).eq('5');

      const totalSupply = await openStoreContract.totalSupply(tokenId);
      expect(totalSupply.toString()).eq('0');

      await openStoreContract.connect(seller).setApprovalForAll(myContract.address, true);
      await tokenContract.connect(buyer).approve(myContract.address, ethers.utils.parseEther('10'));

      await tokenContract.connect(buyer).mint(ethers.utils.parseEther('100'));
      const buyerBalance0 = await tokenContract.balanceOf(buyer.address);
      expect(BigNumber(buyerBalance0).div(1e18).toString(), '100');

      const offer = {
        offerId: '123',
        nftId: tokenId,
        collectionAddress: openStoreContract.address,
        nftAmount: '1',
        tokenAddress: tokenContract.address,
        tokenAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };
      const sigParams = {
        types: EIP712OfferTypes,
        primaryType: PrimaryOfferTypeEnum.Offer,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: offer,
      };
      const { r, v, s } = createOfferSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));

      await myContract.connect(seller).acceptERC1155Offer(offer, v, r, s);
      const buyerBalance = await tokenContract.balanceOf(buyer.address);
      const sellerBalance = await tokenContract.balanceOf(seller.address);

      expect(BigNumber(buyerBalance).div(1e18).toString(), '90');
      expect(BigNumber(sellerBalance).div(1e18).toString(), '10');

      const buyerNft = await openStoreContract.balanceOf(buyer.address, tokenId);
      const sellerNft = await openStoreContract.balanceOf(seller.address, tokenId);
      expect(BigNumber(buyerNft).div(1e18).toString(), '1');
      expect(BigNumber(sellerNft).div(1e18).toString(), '3');
    });
    it('Test accept offer failed (insufficient allowance)', async () => {
      const buyer = signers[0];
      const seller = signers[1];
      let errorMessage = '';
      await tokenContract.connect(buyer).mint(ethers.utils.parseEther('100'));
      const buyerBalance0 = await tokenContract.balanceOf(buyer.address);
      expect(BigNumber(buyerBalance0).div(1e18).toString(), '100');

      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: seller.address,
      });
      await openStoreContract.connect(seller).setApprovalForAll(myContract.address, true);

      const offer = {
        offerId: '123',
        nftId: tokenId,
        collectionAddress: openStoreContract.address,
        nftAmount: '1',
        tokenAddress: tokenContract.address,
        tokenAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };
      const sigParams = {
        types: EIP712OfferTypes,
        primaryType: PrimaryOfferTypeEnum.Offer,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: offer,
      };
      const { r, v, s } = createOfferSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));
      try {
        await myContract.connect(signers[1]).acceptERC1155Offer(offer, v, r, s);
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage).eq(
        "VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'",
      );
    });
    it('Test accept offer failed (Wrong signature)', async () => {
      const buyer = signers[0];
      const seller = signers[1];
      let errorMessage = '';
      await tokenContract.connect(buyer).mint(ethers.utils.parseEther('100'));
      const buyerBalance0 = await tokenContract.balanceOf(buyer.address);
      expect(BigNumber(buyerBalance0).div(1e18).toString(), '100');
      await openStoreContract.connect(seller).setApprovalForAll(myContract.address, true);

      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: seller.address,
      });

      const offer = {
        offerId: '123',
        nftId: tokenId,
        collectionAddress: openStoreContract.address,
        nftAmount: '1',
        tokenAddress: tokenContract.address,
        tokenAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };

      const fakedOffer = {
        offerId: '123',
        nftId: tokenId,
        collectionAddress: openStoreContract.address,
        nftAmount: '2',
        tokenAddress: tokenContract.address,
        tokenAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };

      const sigParams = {
        types: EIP712OfferTypes,
        primaryType: PrimaryOfferTypeEnum.Offer,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: offer,
      };

      const { r, v, s } = createOfferSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));
      try {
        await myContract.connect(signers[1]).acceptERC1155Offer(fakedOffer, v, r, s);
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage.toString()).eq(
        "VM Exception while processing transaction: reverted with reason string 'wrong signature'",
      );
    });

    it('Test accept offer failed (Deadline reach)', async () => {
      const buyer = signers[0];
      const seller = signers[1];
      let errorMessage = '';
      await tokenContract.connect(buyer).mint(ethers.utils.parseEther('100'));
      const buyerBalance0 = await tokenContract.balanceOf(buyer.address);
      expect(BigNumber(buyerBalance0).div(1e18).toString(), '100');
      await openStoreContract.connect(seller).setApprovalForAll(myContract.address, true);

      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: seller.address,
      });

      const offer = {
        offerId: '123',
        nftId: tokenId,
        collectionAddress: openStoreContract.address,
        nftAmount: '1',
        tokenAddress: tokenContract.address,
        tokenAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().subtract(3, 'm').unix().valueOf().toString(),
      };

      const sigParams = {
        types: EIP712OfferTypes,
        primaryType: PrimaryOfferTypeEnum.Offer,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: offer,
      };

      const { r, v, s } = createOfferSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));
      try {
        await myContract.connect(signers[1]).acceptERC1155Offer(offer, v, r, s);
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage).eq(
        "VM Exception while processing transaction: reverted with reason string 'Deadline reached'",
      );
    });
    it('Test accept offer failed (Expired Offer)', async () => {
      const buyer = signers[0];
      const seller = signers[1];
      let errorMessage = '';
      await tokenContract.connect(buyer).mint(ethers.utils.parseEther('100'));
      await tokenContract.connect(buyer).approve(myContract.address, ethers.utils.parseEther('10'));

      const buyerBalance0 = await tokenContract.balanceOf(buyer.address);
      expect(BigNumber(buyerBalance0).div(1e18).toString(), '100');
      await openStoreContract.connect(seller).setApprovalForAll(myContract.address, true);

      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: seller.address,
      });

      const offer = {
        offerId: '123',
        nftId: tokenId,
        collectionAddress: openStoreContract.address,
        nftAmount: '1',
        tokenAddress: tokenContract.address,
        tokenAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };

      const sigParams = {
        types: EIP712OfferTypes,
        primaryType: PrimaryOfferTypeEnum.Offer,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: offer,
      };

      const { r, v, s } = createOfferSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));
      try {
        await myContract.connect(signers[1]).acceptERC1155Offer(offer, v, r, s);
        await myContract.connect(signers[1]).acceptERC1155Offer(offer, v, r, s);
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage).eq("VM Exception while processing transaction: reverted with reason string 'Expired Offer'");
    });
  });

  describe('Test accept acceptERC721Offer', () => {
    it('Test accept offer successfully', async () => {
      const seller = signers[0];
      const buyer = signers[1];
      const nftId = '1';
      const sellerNftBalance = await erc721CollectionContract.balanceOf(seller.address);
      expect(sellerNftBalance.toString()).eq('0');

      await erc721CollectionContract.connect(seller).mint(nftId, seller.address);
      const sellerNftBalance1 = await erc721CollectionContract.balanceOf(seller.address);
      expect(sellerNftBalance1.toString(), '1');
      await erc721CollectionContract.connect(seller).setApprovalForAll(myContract.address, true);

      await tokenContract.connect(buyer).approve(myContract.address, ethers.utils.parseEther('100'));
      await tokenContract.connect(buyer).mint(ethers.utils.parseEther('100'));

      const buyerWETHBalance = await collectionContract.balanceOf(seller.address, nftId);
      expect(buyerWETHBalance.toString(), '100');

      const offer = {
        offerId: '123',
        nftId,
        collectionAddress: erc721CollectionContract.address,
        nftAmount: '1',
        tokenAddress: tokenContract.address,
        tokenAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };
      const sigParams = {
        types: EIP712OfferTypes,
        primaryType: PrimaryOfferTypeEnum.Offer,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: offer,
      };
      const { r, v, s } = createOfferSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));
      await myContract.connect(seller).acceptERC721Offer(offer, v, r, s);

      const buyerBalance = await tokenContract.balanceOf(buyer.address);
      const sellerBalance = await tokenContract.balanceOf(seller.address);

      expect(BigNumber(buyerBalance).div(1e18).toString(), '999');
      expect(BigNumber(sellerBalance).div(1e18).toString(), '10');

      const buyerNft = await erc721CollectionContract.balanceOf(buyer.address);
      const sellerNft = await erc721CollectionContract.balanceOf(seller.address);

      expect(buyerNft.toString(), '1');
      expect(sellerNft.toString(), '0');
    });
  });

  describe('Test buyERC1155Nft Func', () => {
    it('test buyERC1155Nft successfully', async () => {
      const seller = signers[0];
      const buyer = signers[1];
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });
      await openStoreContract.connect(seller).setApprovalForAll(myContract.address, true);

      const order = {
        orderId: '123',
        nftId: tokenId,
        collectionAddress: openStoreContract.address,
        nftAmount: '1',
        ethAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };

      const sigParams = {
        types: EIP712OrderTypes,
        primaryType: PrimaryOrderTypeEnum.Order,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: order,
      };
      const { r, v, s } = createOrderSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));
      await myContract.connect(buyer).buyERC1155Nft(order, v, r, s, {
        value: ethers.utils.parseEther('10').toString(),
      });

      const buyerBalance = (await buyer.getBalance()).toString();
      const sellerBalance = (await seller.getBalance()).toString();

      expect(BigNumber(buyerBalance).div(1e18).toString(), '9999990');
      expect(BigNumber(sellerBalance).div(1e18).toString(), '10000010');

      const buyerNft = await openStoreContract.balanceOf(buyer.address, tokenId);
      const sellerNft = await openStoreContract.balanceOf(seller.address, tokenId);

      expect(buyerNft.toString(), '1');
      expect(sellerNft.toString(), '4');
    });
    it('test buyERC721Nft successfully', async () => {
      const seller = signers[0];
      const buyer = signers[1];
      const nftId = '1';
      const sellerNftBalance = await erc721CollectionContract.balanceOf(seller.address);
      expect(sellerNftBalance.toString()).eq('0');

      await erc721CollectionContract.connect(seller).mint(nftId, seller.address);
      const sellerNftBalance1 = await erc721CollectionContract.balanceOf(seller.address);
      expect(sellerNftBalance1.toString(), '1');
      await erc721CollectionContract.connect(seller).setApprovalForAll(myContract.address, true);

      const order = {
        orderId: '123',
        nftId: nftId,
        collectionAddress: erc721CollectionContract.address,
        nftAmount: '1',
        ethAmount: ethers.utils.parseEther('10').toString(),
        buyer: buyer.address,
        seller: seller.address,
        timestamp: moment().unix().valueOf().toString(),
      };

      const sigParams = {
        types: EIP712OrderTypes,
        primaryType: PrimaryOrderTypeEnum.Order,
        domain: {
          name: EIP712DomainName,
          version: '1',
          chainId: await signers[0].getChainId(),
          verifyingContract: myContract.address,
        },
        message: order,
      };
      const { r, v, s } = createOrderSignature(sigParams, accounts[0].privateKey.replace(/^0x/, ''));
      await myContract.connect(buyer).buyERC721Nft(order, v, r, s, {
        value: ethers.utils.parseEther('10').toString(),
      });

      const buyerBalance = (await buyer.getBalance()).toString();
      const sellerBalance = (await seller.getBalance()).toString();

      expect(BigNumber(buyerBalance).div(1e18).toString(), '9999990');
      expect(BigNumber(sellerBalance).div(1e18).toString(), '10000010');

      const buyerNft = await erc721CollectionContract.balanceOf(buyer.address);
      const sellerNft = await erc721CollectionContract.balanceOf(seller.address);

      expect(buyerNft.toString(), '1');
      expect(sellerNft.toString(), '0');
    });
  });
});
