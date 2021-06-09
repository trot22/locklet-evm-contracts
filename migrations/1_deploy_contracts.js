/* Artifacts */
const LockletToken = artifacts.require("LockletToken")

module.exports = async function (deployer, network) {
  switch (network) {
    case "development":
      await deployDev(deployer)
      break
    case "ropsten":
    case "bsc_testnet":
      await deployStage(deployer)
      break

    case "eth_mainnet":
    case "bsc_mainnet":
      await deployProd(deployer)
      break
  }
}

async function deployDev(deployer) {
  const tokenInstance = await deployer.deploy(LockletToken)
}

async function deployStage(deployer) {
  const tokenInstance = await deployer.deploy(LockletToken)
}

async function deployProd(deployer) {
  const tokenInstance = await deployer.deploy(LockletToken)
}
