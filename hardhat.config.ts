import { HardhatUserConfig } from 'hardhat/config';
import * as dotenv from 'dotenv';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-deploy';
dotenv.config();
const { API_URL, PRIVATE_KEY } = process.env;

interface HardhatUserConfigWithEtherscan extends HardhatUserConfig {
  etherscan: {
    apiKey: string;
  };
}

const config: HardhatUserConfigWithEtherscan = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        runs: 200,
        enabled: true,
      },
    },
  },
  defaultNetwork: 'goerli',
  networks: {
    goerli: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    hardhat: {
      chainId: 15,
      accounts: [
        {
          balance: '10000000000000000000000000',
          privateKey: 'afa1bf7c4d84b19ea8fa4fb07c86d6a6b90a4c158e0aaab381db0cb2236febbe',
        },
        {
          balance: '10000000000000000000000000',
          privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        },
        {
          balance: '10000000000000000000000000',
          privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        },
      ],
    },
  },
  etherscan: {
    apiKey: String(process.env.ETHER_SCAN_API_KEY),
  },
  paths: {
    deploy: './deployments/migrations',
    deployments: './deployments/artifacts',
  },
};

export default config;
