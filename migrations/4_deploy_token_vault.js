/* Imports */
const { toWei, toBN } = web3.utils;

/* Artifacts */
const LockletToken = artifacts.require('LockletToken');
const LockletTokenVault = artifacts.require('LockletTokenVault');

/* Constants */
const constants = require('../constants');

module.exports = async function (deployer, network) {
  const tokenInstance = await LockletToken.at(constants.LKT_TOKEN[network]);
  const tokenVaultInstance = await deployer.deploy(LockletTokenVault, tokenInstance.address);

  /*
  const creationFlatFeeLktAmount = toBN(toWei('1100', 'ether')); // 1100000000000000000000
  await tokenVaultInstance.setCreationFlatFeeLktAmount(creationFlatFeeLktAmount);

  const revocationFlatFeeLktAmount = toBN(toWei('5200', 'ether')); // 5200000000000000000000
  await tokenVaultInstance.setRevocationFlatFeeLktAmount(revocationFlatFeeLktAmount);
  */
 
  await tokenVaultInstance.setStakersRedisAddress('0x4A3A9f48dCbd4620E0c5E2241CA7cf8Ec1172704');
};
