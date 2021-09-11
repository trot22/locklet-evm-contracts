/* Imports */
const truffleAssert = require('truffle-assertions');
const { SECONDS_IN_DAY } = require('../constants');
const { evmTime } = require('./utils');
const { toWei, toBN } = web3.utils;

/* Artifacts */
const LockletToken = artifacts.require('LockletToken');
const LockletTokenVault = artifacts.require('LockletTokenVault');

contract('LockletTokenVault', async (accounts) => {
  let tokenInstance;
  let tokenVaultInstance;

  let owner;
  let initiator;
  let recipient;
  let usurper;

  let staking;

  before(async () => {
    // instances
    tokenInstance = await LockletToken.deployed();
    tokenVaultInstance = await LockletTokenVault.deployed();

    // accounts
    owner = accounts[0];
    initiator = accounts[1];
    recipient = accounts[2];
    usurper = accounts[3];

    // staking
    staking = accounts[9];
    await truffleAssert.passes(tokenVaultInstance.setStakersRedisAddress(staking, { from: owner }));

    // fees
  });

  it('10-day vesting with a 2-day cliff for a total amount of 1 million LKT to 1 recipient', async () => {
    // initial LKT transfert
    const initialTransferAmount = toWei('2000000', 'ether');
    await truffleAssert.passes(tokenInstance.transfer(initiator, initialTransferAmount, { from: owner }), 'initial transfer failed');

    // store initiator initial LKT balance
    const initiatorInitialBalance = await tokenInstance.balanceOf(initiator);

    // approve LKT
    const approveAmount = toWei('1500000', 'ether');
    await tokenInstance.approve(tokenVaultInstance.address, approveAmount, {
      from: initiator,
    });

    // create lock
    const totalAmount = toWei('1000000', 'ether');
    const durationInDays = 10;
    const cliffInDays = 2;
    const recipients = [{ recipientAddress: recipient, amount: totalAmount }];
    const isRevocable = false;
    const payFeesWithLkt = true;

    await tokenVaultInstance.addLock(tokenInstance.address, totalAmount, cliffInDays, durationInDays, recipients, isRevocable, payFeesWithLkt, {
      from: initiator,
    });

    // compare initiator current LKT balance with initial balance
    const initiatorCurrentBalance = await tokenInstance.balanceOf(initiator);
    assert.equal(
      initiatorCurrentBalance.toString(),
      initiatorInitialBalance.sub(toBN(recipients[0].amount)).toString(),
      'should have LKT removed from balance'
    );

    // retrieve initiator locks
    const initiatorLocks = await tokenVaultInstance.getLocksByInitiator(initiator);
    assert(initiatorLocks.length == 1, 'should have 1 lock');

    const initiatorFirstLock = initiatorLocks[0];
    assert.equal(initiatorFirstLock.lock.tokenAddress, tokenInstance.address);
    assert.equal(initiatorFirstLock.lock.durationInDays, durationInDays);
    assert.equal(initiatorFirstLock.lock.initiatorAddress, initiator);
    assert.equal(initiatorFirstLock.lock.isRevocable, isRevocable);
    assert.equal(initiatorFirstLock.lock.isActive, true);

    assert(initiatorFirstLock.recipients.length == 1, 'lock should have 1 recipient');
    assert.equal(initiatorFirstLock.recipients[0].recipientAddress, recipient);
    assert.equal(initiatorFirstLock.recipients[0].amount, recipients[0].amount);
    assert.equal(initiatorFirstLock.recipients[0].daysClaimed, 0);
    assert.equal(initiatorFirstLock.recipients[0].amountClaimed, 0);
    assert.equal(initiatorFirstLock.recipients[0].isActive, true);

    // retrieve recipient locks
    const recipientLocks = await tokenVaultInstance.getLocksByRecipient(recipient);
    assert(recipientLocks.length == 1, 'should have 1 lock');

    const recipientFirstLock = recipientLocks[0];
    assert.equal(recipientFirstLock.lock.tokenAddress, tokenInstance.address);
    assert.equal(recipientFirstLock.lock.durationInDays, durationInDays);
    assert.equal(recipientFirstLock.lock.initiatorAddress, initiator);
    assert.equal(recipientFirstLock.lock.isRevocable, isRevocable);
    assert.equal(recipientFirstLock.lock.isActive, true);

    assert(recipientFirstLock.recipients.length == 1, 'lock should have 1 recipient');
    assert.equal(recipientFirstLock.recipients[0].recipientAddress, recipient);
    assert.equal(recipientFirstLock.recipients[0].amount, recipients[0].amount);
    assert.equal(recipientFirstLock.recipients[0].daysClaimed, 0);
    assert.equal(recipientFirstLock.recipients[0].amountClaimed, 0);
    assert.equal(recipientFirstLock.recipients[0].isActive, true);

    const firstLockIndex = 0;

    // claim locked tokens from unauthorized account
    await truffleAssert.reverts(
      tokenVaultInstance.claimLockedTokens(firstLockIndex, {
        from: usurper,
      }),
      'LockletTokenVault: Forbidden'
    );

    // claim locked tokens from recipient's account, should fail because of the 2-day cliff
    await truffleAssert.reverts(
      tokenVaultInstance.claimLockedTokens(firstLockIndex, {
        from: recipient,
      }),
      'LockletTokenVault: The amount of unlocked tokens is equal to zero'
    );
    
    // advance evm time by 1 day
    await evmTime.advanceTimeAndBlock(SECONDS_IN_DAY * 1);

    // claim locked tokens from recipient's account, should fail because of the 2-day cliff
    await truffleAssert.reverts(
      tokenVaultInstance.claimLockedTokens(firstLockIndex, {
        from: recipient,
      }),
      'LockletTokenVault: The amount of unlocked tokens is equal to zero'
    );

    // advance evm time by 1 day, cliff is now reached, we are now at the vesting start date
    await evmTime.advanceTimeAndBlock(SECONDS_IN_DAY * 1);

    // store recipient initial LKT balance
    const recipientInitialBalance = await tokenInstance.balanceOf(recipient);

    // claim locked tokens from recipient's account
    const firstClaimRes = await tokenVaultInstance.claimLockedTokens(firstLockIndex, { from: recipient });

    const firstExpectedClaimedAmount = toBN(toWei('100000', 'ether'));
    truffleAssert.eventEmitted(firstClaimRes, 'LockedTokensClaimed', {
      recipientAddress: recipient,
      claimedAmount: firstExpectedClaimedAmount,
    });

    // compare recipient LKT balance after first claim with initial balance
    const afterFirstClaimBalance = await tokenInstance.balanceOf(recipient);
    assert.equal(
      afterFirstClaimBalance.toString(),
      recipientInitialBalance.add(firstExpectedClaimedAmount).toString(),
      'should have correct LKT balance after first claim'
    );

    // advance evm time by 3 days, we are now 3 days after the vesting start date (sd+3)
    await evmTime.advanceTimeAndBlock(SECONDS_IN_DAY * 3);

    // claim locked tokens from recipient's account
    const secondClaimRes = await tokenVaultInstance.claimLockedTokens(firstLockIndex, { from: recipient });

    const secondExpectedClaimedAmount = toBN(toWei('300000', 'ether'));
    truffleAssert.eventEmitted(secondClaimRes, 'LockedTokensClaimed', {
      recipientAddress: recipient,
      claimedAmount: secondExpectedClaimedAmount,
    });

    // trying to revoke lock from unauthorized account
    await truffleAssert.reverts(tokenVaultInstance.revokeLock(firstLockIndex, { from: usurper }), 'LockletTokenVault: Forbidden');

    // trying to revoke lock from initiator's account
    await truffleAssert.reverts(tokenVaultInstance.revokeLock(firstLockIndex, { from: initiator }), 'LockletTokenVault: Lock not revocable');

    // advance evm time by 9 days, we are now 12 days after the lock date (sd+12)
    await evmTime.advanceTimeAndBlock(SECONDS_IN_DAY * 9);

    // claim locked tokens from recipient's account
    const thirdClaimRes = await tokenVaultInstance.claimLockedTokens(firstLockIndex, { from: recipient });

    const thirdExpectedClaimedAmount = toBN(toWei('600000', 'ether'));
    truffleAssert.eventEmitted(thirdClaimRes, 'LockedTokensClaimed', {
      recipientAddress: recipient,
      claimedAmount: thirdExpectedClaimedAmount,
    });
  });
});
