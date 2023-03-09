# OpenStore and MarketPlace Smart Contract

## Project Guides

### Deployments (typescript)
- `scripts/proxy.deploy.ts`

### Unit test
- `test/collection.spec.ts`
- `test/marketPlace.spec.ts`

### Pre-reqs

- Yarn >= v1.22.15
- Node.js >= v12.22.6

### Installation

```shell
cp .env.example .env
```

Then, proceed with installing dependencies:

```shell
yarn install
```
### Testing

Run tests:

```shell
$ npx hardhat test
```
### Gas Report

See the gas usage per unit test and average gas per method call:

```shell
$ REPORT_GAS=true npx hardhat test
```
### Deployment
At the moment, testnet deployment is available on Ethereum Goerli Testnet:

```shell
$ npx hardhat run --network goerli scripts/proxy.deploy.ts
```

Verify code and display functions on testnet UI:
```shell
$ npx hardhat verify --network goerli (contractAddress)
```