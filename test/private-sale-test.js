/* Artifacts */
const LockletToken = artifacts.require('LockletToken');
const LockletPrivateSale = artifacts.require('LockletPrivateSale');

const truffleAssert = require('truffle-assertions');

contract('LockletPrivateSale', async (accounts) => {
  let tokenInstance;
  let privateSaleInstance;

  let owner;
  let investor;
  let usurper;

  before(async () => {
    // instances
    tokenInstance = await LockletToken.deployed();
    privateSaleInstance = await LockletPrivateSale.deployed();

    // accounts
    owner = accounts[0];
    investor = accounts[1];
    usurper = accounts[2];

    // funding
    const contractFundingAmount = web3.utils.toWei('100000', 'ether');
    await truffleAssert.passes(tokenInstance.transfer(privateSaleInstance.address, contractFundingAmount, { from: owner }), 'contract funding failed');
  });

  it('should unpause the private sale if owner', async () => {
    await truffleAssert.reverts(privateSaleInstance.unpause({ from: usurper }), 'Ownable: caller is not the owner.');
    await truffleAssert.passes(privateSaleInstance.unpause({ from: owner }), 'unpause failed');
  });

  it('should allocate LKT to investors', async () => {
    const investAmount = web3.utils.toWei('1', 'ether');
    await truffleAssert.passes(privateSaleInstance.sendTransaction({ from: investor, value: investAmount }), 'value transfer failed');
  });

  it('should deny an additional allocation to the investor', async () => {
    const investAmount = web3.utils.toWei('0.01', 'ether');
    await truffleAssert.reverts(
      privateSaleInstance.sendTransaction({ from: investor, value: investAmount }),
      'LockletPrivateSale: You exceed the Ether limit per wallet'
    );
  });

  it('should deny the investor to claim his tokens', async () => {
    await truffleAssert.reverts(privateSaleInstance.claim({ from: investor }), 'LockletPrivateSale: Claim is not activated');
  });

  it('should return the correct allowance amount for the investor', async () => {
    const investorAllowance = await privateSaleInstance.getAllowanceByAddr(investor);

    const expectedAllowance = web3.utils.toWei('1000', 'ether');
    assert.equal(investorAllowance, expectedAllowance, 'The investor should have 1000 LKT allocated');
  });

  it('should return the correct raised ETH amount', async () => {
    const raisedEthAmount = await privateSaleInstance.getRaisedEth();

    const expectedRaisedEthAmount = web3.utils.toWei('1', 'ether');
    assert.equal(raisedEthAmount, expectedRaisedEthAmount, 'The contract must have raised 1 ETH');
  });

  it('should return the correct solded LKT amount', async () => {
    const soldedLktAmount = await privateSaleInstance.getSoldedLkt();

    const expectedSoldedLktAmount = web3.utils.toWei('1000', 'ether');
    assert.equal(soldedLktAmount, expectedSoldedLktAmount, 'The contract is expected to have sold 1000 LKT');
  });

  it('should send the ethers to the contract owner', async () => {
    await truffleAssert.reverts(privateSaleInstance.withdrawEth({ from: usurper }), 'Ownable: caller is not the owner.');

    const currentOwnerEthBalance = await web3.eth.getBalance(owner);
    await truffleAssert.passes(privateSaleInstance.withdrawEth({ from: owner }), 'withdraw ETH failed');
    const afterWithdrawEthBalance = await web3.eth.getBalance(owner);

    const currentOwnerEthBalanceBN = web3.utils.toBN(currentOwnerEthBalance);
    const afterWithdrawEthBalanceBN = web3.utils.toBN(afterWithdrawEthBalance)

    assert.isOk(afterWithdrawEthBalanceBN.gt(currentOwnerEthBalanceBN), 'The contract owner should have received 1 ETH');
  });

  it('should set the LKT claimable if owner', async () => {
    await truffleAssert.reverts(privateSaleInstance.setClaimable(true, { from: usurper }), 'Ownable: caller is not the owner.');
    await truffleAssert.passes(privateSaleInstance.setClaimable(true, { from: owner }), 'setClaimable failed');
  });

  it('should deny the usurper to claim his tokens', async () => {
    await truffleAssert.reverts(privateSaleInstance.claim({ from: usurper }), 'LockletPrivateSale: Nothing to claim');
  });

  it('should allow the investor to claim his allocated LKT', async () => {
    await truffleAssert.passes(privateSaleInstance.claim({ from: investor }), 'claim failed');

    const investorLktBalance = await tokenInstance.balanceOf(investor);

    const expectedInvestorLktBalance = web3.utils.toWei('1000', 'ether');
    assert.equal(investorLktBalance.toString(), expectedInvestorLktBalance, 'The investor should have received 1000 LKT');
  });

  it('should send the remaining LKT to the contract owner', async () => {
    await truffleAssert.reverts(privateSaleInstance.withdrawLkt({ from: usurper }), 'Ownable: caller is not the owner.');

    await truffleAssert.passes(privateSaleInstance.withdrawLkt({ from: owner }), 'withdraw LKT failed');
    const afterWithdrawLktBalance = await tokenInstance.balanceOf(owner);

    const expectedOwnerLktBalance = web3.utils.toWei('149999000', 'ether');
    assert.equal(afterWithdrawLktBalance.toString(), expectedOwnerLktBalance, 'The contract owner should have received 99000 LKT');
  });
});
