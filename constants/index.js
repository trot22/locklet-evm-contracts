const LKT_TOKEN = {
  ['development']: '0x370bf023934c54F5A12c9d807037652Ea789454F', // Development
  ['ropsten']: '0xde8fa069707b6322ad45d001425b617f4f1930bd', // Ropsten
  ['eth_mainnet']: '0xd9b89eee86b15634c70cab51baf85615a4ab91a1', // Ethereum Mainnet
  ['bsc_testnet']: '0xde8fa069707b6322ad45d001425b617f4f1930bd', // Binance Smart Chain Testnet
  ['bsc_mainnet']: '0xde8fa069707b6322ad45d001425b617f4f1930bd', // Binance Smart Chain Mainnet
};

const SECONDS_IN_DAY = 86400;
const VESTING_CREATION_FEE_AMOUNT = '2000000000000000000';
const VESTING_REVOCATION_FEE_AMOUNT = '1000000000000000000';

module.exports = {
  LKT_TOKEN,
  SECONDS_IN_DAY,
  VESTING_CREATION_FEE_AMOUNT,
  VESTING_REVOCATION_FEE_AMOUNT,
};
