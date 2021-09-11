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
  const creationFlatFeeLktAmount = toBN(toWei('150', 'ether'));
  await tokenVaultInstance.setCreationFlatFeeLktAmount(creationFlatFeeLktAmount);

  const revocationFlatFeeLktAmount = toBN(toWei('150', 'ether'));
  await tokenVaultInstance.setRevocationFlatFeeLktAmount(revocationFlatFeeLktAmount);

  await tokenVaultInstance.setStakersRedisAddress('0x25Bd291bE258E90e7A0648aC5c690555aA9e8930');
  */
};
