const { toWei } = web3.utils

exports.SECONDS_IN_DAY = 86400
exports.VESTING_CREATION_FEE_AMOUNT = toWei("2", "ether")
exports.VESTING_REVOCATION_FEE_AMOUNT = toWei("1", "ether")