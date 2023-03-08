import { CollectionName, CollectionSymbol, DefaultExpiredSigTime, EIP712DomainName, TemplateUri } from '../consts';

const { ethers, upgrades } = require('hardhat');

async function main() {
  const Marketplace = await ethers.getContractFactory('Marketplace');
  const marketContract = await upgrades.deployProxy(Marketplace, [EIP712DomainName, DefaultExpiredSigTime]);
  await marketContract.deployed();
  // await marketContract.initialize(EIP712DomainName, DefaultExpiredSigTime);

  const OpenStore = await ethers.getContractFactory('OpenStore');
  const openStoreContract = await upgrades.deployProxy(OpenStore, [CollectionName, CollectionSymbol, TemplateUri, marketContract.address]);
  await openStoreContract.deployed();
  // await openStoreContract.initialize(CollectionName, CollectionSymbol, TemplateUri, marketContract.address);
}

main();
