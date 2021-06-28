/* Artifacts */
const LockletToken = artifacts.require('LockletToken');
const LockletPrivateSale = artifacts.require('LockletPrivateSale');

/* Constants */
const constants = require('../constants');

module.exports = async function (deployer, network) {
  let tokenInstance = await LockletToken.at(constants.LKT_TOKEN[network]);
  let lktPerEth = 0;
  let maxEthPerAddr = 0;

  switch (network) {
    case 'development':
      tokenInstance = await LockletToken.deployed();
      lktPerEth = web3.utils.toWei('1000', 'ether');
      maxEthPerAddr = web3.utils.toWei('1', 'ether');
      break;
    case 'ropsten':
    case 'bsc_testnet':
      lktPerEth = web3.utils.toWei('243900', 'ether');
      maxEthPerAddr = web3.utils.toWei('20', 'ether');
      break;

    case 'eth_mainnet':
    case 'bsc_mainnet':
      lktPerEth = web3.utils.toWei('243900', 'ether');
      maxEthPerAddr = web3.utils.toWei('5', 'ether');
      break;
  }

  await deployer.deploy(LockletPrivateSale, tokenInstance.address, lktPerEth, maxEthPerAddr);
};
