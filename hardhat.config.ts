/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import { HardhatUserConfig } from "hardhat/types";
import '@openzeppelin/hardhat-upgrades';

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-typechain";
import fs from "fs";
import path from "path";
const USER_HOME = process.env.HOME || process.env.USERPROFILE
let data = {
  "PrivateKey": "",
  "InfuraApiKey": "",
  "EtherscanApiKey": "",
};

let filePath = path.join(USER_HOME+'/.hardhat.data.json');
if (fs.existsSync(filePath)) {
  let rawdata = fs.readFileSync(filePath);
  data = JSON.parse(rawdata.toString());
}
filePath = path.join(__dirname, `.hardhat.data.json`);
if (fs.existsSync(filePath)) {
  let rawdata = fs.readFileSync(filePath);
  data = JSON.parse(rawdata.toString());
}

const DEFAULT_COMPILER_SETTINGS = {
  version: "0.6.12",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    }
  },
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [DEFAULT_COMPILER_SETTINGS]
  },
  networks: {
    hardhat: {},
    mainnet: {
      url: `https://mainnet.infura.io/v3/${data.InfuraApiKey}`,
      accounts: [data.PrivateKey]
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${data.InfuraApiKey}`,
      accounts: [data.PrivateKey]
    },
    bsctestnet: {
      url: `https://data-seed-prebsc-1-s3.binance.org:8545/`,
      accounts: [data.PrivateKey]
    },
    bscmainnet: {
      url: `https://bsc-dataseed.binance.org/`,
      accounts: [data.PrivateKey]
    },
    hecotestnet: {
      url: `https://http-testnet.hecochain.com`,
      accounts: [data.PrivateKey]
    },
    hecomainnet: {
      url: `https://http-mainnet.hecochain.com`,
      accounts: [data.PrivateKey]
    },
    matictestnet: {
      url: `https://matic-mumbai.chainstacklabs.com`,
      accounts: [data.PrivateKey],
      gas: "auto",
      gasPrice: 1000000000
    },
    maticmainnet: {
      url: `https://rpc-mainnet.matic.network`,
      accounts: [data.PrivateKey]
    }
  },
  etherscan: {
    apiKey: data.EtherscanApiKey,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 80000
  }
};

export default config;