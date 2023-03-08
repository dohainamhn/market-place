import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { CollectionName, CollectionSymbol, TemplateUri } from '../consts';
import { convertTextToHex } from '../helpers/convertTextToHex';
import { createTokenId } from '../helpers/createTokenId';

describe('OpenStore contract', function () {
  let mycontract: Contract;
  let signers: SignerWithAddress[];

  this.beforeEach(async () => {
    signers = await ethers.getSigners();
    // deploy Main Collection
    const OpenStore = await ethers.getContractFactory('OpenStore');
    mycontract = await OpenStore.deploy();
    await mycontract.deployed();

    await mycontract.initialize(
      CollectionName,
      CollectionSymbol,
      TemplateUri,
      '0xD4Dd83B6011D6A59CBF52EE087BC2B75c46cB566',
    );
  });

  it('Check Owner', async function () {
    const ownerContract = await mycontract.owner();
    expect(signers[0].address).to.equal(ownerContract);
  });
 
  describe('Test mint func', () => {
    it('Test mint func successfully', async function () {
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });
      const maxSupply = await mycontract.maxSupply(tokenId);
      expect(maxSupply.toString()).eq('5');

      const totalSupply = await mycontract.totalSupply(tokenId);
      expect(totalSupply.toString()).eq('0');

      await mycontract
        .connect(signers[1])
        .mint(signers[1].address, tokenId, 5, convertTextToHex('https://testnet.api'));

      const uri = await mycontract.uri(tokenId);
      expect(uri).eq('https://testnet.api');

      const balance = await mycontract.balanceOf(signers[1].address, tokenId);
      expect(balance.toString()).eq('5');

      const totalSupplyAfterMint = await mycontract.totalSupply(tokenId);
      expect(totalSupplyAfterMint.toString()).eq('5');
    });

    it('Test mint Func fail by over max supply', async function () {
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });
      const maxSupply = await mycontract.maxSupply(tokenId);
      expect(maxSupply.toString()).eq('5');

      const totalSupply = await mycontract.totalSupply(tokenId);
      expect(totalSupply.toString()).eq('0');

      let errorMessage = '';
      try {
        await mycontract
          .connect(signers[1])
          .mint(signers[1].address, tokenId, 6, convertTextToHex('https://testnet.api'));
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage).eq(
        "VM Exception while processing transaction: reverted with reason string 'Cannot mint over maximum supply'",
      );
    });
  });

  describe('Test Transfer Single func', () => {
    it('Test transfer successfully', async () => {
      const seller = signers[1];
      const buyer = signers[0];
      const transferTokenAmount = '2';
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: seller.address,
      });
      // transfer
      await mycontract
        .connect(seller)
        .safeTransferFrom(seller.address, buyer.address, tokenId, transferTokenAmount, '0x');
      // check balances
      const receiverBalance = await mycontract.balanceOf(buyer.address, tokenId);
      expect(receiverBalance.toString()).eq(transferTokenAmount);

      const senderBalance = await mycontract.balanceOf(seller.address, tokenId);
      expect(senderBalance.toString()).eq('3');

      const totalSupply = await mycontract.totalSupply(tokenId);
      expect(totalSupply.toString()).eq(transferTokenAmount);
      // continue transfer
      await mycontract
        .connect(buyer)
        .safeTransferFrom(buyer.address, seller.address, tokenId, transferTokenAmount, '0x');

      const senderBalance2 = await mycontract.balanceOf(buyer.address, tokenId);
      expect(senderBalance2.toString()).eq('0');

      const receiverBalance2 = await mycontract.balanceOf(seller.address, tokenId);
      expect(receiverBalance2.toString()).eq('5');
    });
    it('Test transfer failed (not creator)', async () => {
      const transferTokenAmount = '2';
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });
      let errorMessage = '';
      try {
        // transfer
        await mycontract
          .connect(signers[0])
          .safeTransferFrom(signers[0].address, signers[1].address, tokenId, transferTokenAmount, '0x');
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage).eq(
        "VM Exception while processing transaction: reverted with reason string 'AssetContractShared#creatorOnly: ONLY_CREATOR_ALLOWED'",
      );
    });
    it('Test transfer failed (not owner)', async () => {
      const transferTokenAmount = '2';
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });

      await mycontract
        .connect(signers[1])
        .safeTransferFrom(signers[1].address, signers[0].address, tokenId, transferTokenAmount, '0x');
      let errorMessage = '';
      try {
        // transfer
        await mycontract
          .connect(signers[2])
          .safeTransferFrom(signers[2].address, signers[0].address, tokenId, transferTokenAmount, '0x');
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage).eq(
        "VM Exception while processing transaction: reverted with reason string 'AssetContractShared#creatorOnly: ONLY_CREATOR_ALLOWED'",
      );
    });
  });

  describe('Test transfer batch nft', () => {
    it('Test transfer batch successfully', async () => {
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });
      const tokenId2 = createTokenId({
        tokenSupply: 2,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });

      await mycontract
        .connect(signers[1])
        .safeBatchTransferFrom(signers[1].address, signers[0].address, [tokenId, tokenId2], [2, 1], '0x');

      const senderBalances = await mycontract.balanceOfBatch(
        [signers[1].address, signers[1].address],
        [tokenId, tokenId2],
      );
      expect(senderBalances[0].toString()).eq('3');
      expect(senderBalances[1].toString()).eq('1');

      const receiverBalances = await mycontract.balanceOfBatch(
        [signers[0].address, signers[0].address],
        [tokenId, tokenId2],
      );
      expect(receiverBalances[0].toString()).eq('2');
      expect(receiverBalances[1].toString()).eq('1');
    });
    it('Test transfer batch unsuccessfully', async () => {
      const tokenId = createTokenId({
        tokenSupply: 5,
        tokenIndex: 1,
        creatorAddress: signers[1].address,
      });
      const tokenId2 = createTokenId({
        tokenSupply: 2,
        tokenIndex: 1,
        creatorAddress: signers[2].address,
      });
      let errorMessage = '';
      try {
        await mycontract
          .connect(signers[1])
          .safeBatchTransferFrom(signers[1].address, signers[0].address, [tokenId, tokenId2], [2, 1], '0x');
      } catch (error: any) {
        errorMessage = error.message;
      }
      expect(errorMessage).eq(
        "VM Exception while processing transaction: reverted with reason string 'AssetContractShared#creatorOnly: ONLY_CREATOR_ALLOWED'",
      );
    });
  });
});
