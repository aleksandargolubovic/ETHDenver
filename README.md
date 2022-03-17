# ETHDenver

## Project Overview
A project developed for ETH Denver Virtual Hackathon. It gives an opportunity to easily track and reimburse all expenses in your DAO.

## Technologies
* React
* Node.js
* Solidity

## Project developed with
* [Metis](https://docs.metis.io/)
* [Hardhat](https://hardhat.org/)
* [IPFS](https://ipfs.io/)
* [Web3.Storage](https://web3.storage/)

## Quick start

### Prerequisites
* [Node 12+](https://nodejs.org/en/download/)
* [Yarn](https://classic.yarnpkg.com/en/docs/install/)
* [Metamask wallet](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn) - wallet should have [Metis Stardust Testnet](https://docs.metis.io/building-on-metis/connection-details) network configured

### How to run

- Go to /refund/packages/hardhat/ and rename .env.example to .env and provide your wallet PRIVATE_KEY
- Compile and deploy contracts using Hardhat by running the following commands:
```
    yarn install
    yarn deploy --network metis
```
- Start frontend
```
    yarn install
    yarn start
```
- Open http://localhost:3000 to see the app

## Demo

## Team Members
- github@aleksandargolubovic, software developer
- github@dzoni-hash, software developer

## Future work/TODO
