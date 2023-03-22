const { ethers } = require('hardhat');

async function main() {
  const WETH = await ethers.getContractFactory('WETH');
  const weth = await WETH.deploy();
  await weth.deployed();
  console.log(`deployed at address: ${weth.address}`);
}

main();
