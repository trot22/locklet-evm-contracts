/* Artifacts */
const LockletToken = artifacts.require('LockletToken');

module.exports = async function (deployer) {
  await deployer.deploy(LockletToken);
};
