/* Imports */
const truffleAssert = require('truffle-assertions');
const { SECONDS_IN_DAY } = require('../constants');
const { evmTime } = require('./utils');
const { toWei, toBN } = web3.utils;

/* Artifacts */
const LockletToken = artifacts.require('LockletToken');
const LockletTokenVault = artifacts.require('LockletTokenVault');

/// ---
/// Scenario:
/// 10-days vesting with a 2-days cliff
/// for a total amount of 1 million LKT
/// to 1 recipient
/// with percent fee
/// ---
contract('LockletTokenVault', async (accounts) => {
  const creationFlatFeeLktAmount = toBN(toWei('300', 'ether'));
  const revocationFlatFeeLktAmount = toBN(toWei('150', 'ether'));

  let tokenInstance;
  let tokenVaultInstance;

  let owner;
  let initiator;
  let recipient;
  let usurper;

  let staking;

  // test vars
  let initiatorInitialBalance;

  let totalAmount;
  let recipients;
  let durationInDays;
  let isRevocable;

  let lockIndex;

  before(async () => {
    // instances
    tokenInstance = await LockletToken.deployed();
    tokenVaultInstance = await LockletTokenVault.deployed();

    // accounts
    owner = accounts[0];
    initiator = accounts[1];
    recipient = accounts[2];
    usurper = accounts[8];

    // staking
    staking = accounts[9];
    await truffleAssert.passes(tokenVaultInstance.setStakersRedisAddress(staking, { from: owner }));

    // fees
    await tokenVaultInstance.setCreationFlatFeeLktAmount(creationFlatFeeLktAmount, { from: owner });
    await tokenVaultInstance.setRevocationFlatFeeLktAmount(revocationFlatFeeLktAmount, { from: owner });
  });

  it('should transfer the initial amount of LKT to the initiator', async () => {
    // initial LKT transfert
    const initialTransferAmount = toWei('1003500', 'ether');
    await truffleAssert.passes(tokenInstance.transfer(initiator, initialTransferAmount, { from: owner }), 'initial transfer failed');

    // store initiator initial LKT balance
    initiatorInitialBalance = await tokenInstance.balanceOf(initiator);
  });

  it('should approve the amount of LKT to spend', async () => {
    // approve LKT
    const approveAmount = toWei('1003500', 'ether');
    await tokenInstance.approve(tokenVaultInstance.address, approveAmount, {
      from: initiator,
    });
  });

  it('should create the lock', async () => {
    // create lock
    totalAmount = toWei('1000000', 'ether');
    recipients = [{ recipientAddress: recipient, amount: totalAmount }];

    durationInDays = 10;
    isRevocable = false;

    const cliffInDays = 2;
    const payFeesWithLkt = false;

    const addLockTx = await tokenVaultInstance.addLock(tokenInstance.address, totalAmount, cliffInDays, durationInDays, recipients, isRevocable, payFeesWithLkt, {
      from: initiator,
    });

    lockIndex = addLockTx.receipt.logs[0].args.lockIndex;
  });

  it('should have removed LKT from initiator balance', async () => {
    // compare initiator current LKT balance with initial balance
    const initiatorCurrentBalance = await tokenInstance.balanceOf(initiator);

    assert.equal(
      initiatorCurrentBalance.toString(),
      initiatorInitialBalance.sub(toBN(totalAmount)).toString()
    );
  });

  it('should have 1 lock for the initiator', async () => {
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
  });

  it('should have 1 lock for the recipient', async () => {
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
  });

  it('should revert if claimed from an unauthorized account', async () => {
    // claim locked tokens from unauthorized account
    await truffleAssert.reverts(
      tokenVaultInstance.claimLockedTokens(lockIndex, {
        from: usurper,
      }),
      'LockletTokenVault: Forbidden'
    );
  });

  it('should revert if claimed before the end of the cliff', async () => {
    // claim locked tokens from recipient's account, should fail because of the 2-day cliff
    await truffleAssert.reverts(
      tokenVaultInstance.claimLockedTokens(lockIndex, {
        from: recipient,
      }),
      'LockletTokenVault: The amount of unlocked tokens is equal to zero'
    );

    // advance evm time by 1 day
    await evmTime.advanceTimeAndBlock(SECONDS_IN_DAY * 1);

    // claim locked tokens from recipient's account, should fail because of the 2-day cliff
    await truffleAssert.reverts(
      tokenVaultInstance.claimLockedTokens(lockIndex, {
        from: recipient,
      }),
      'LockletTokenVault: The amount of unlocked tokens is equal to zero'
    );
  });

  it('should allow to claim the locked tokens', async () => {
    // advance evm time by 2 day, cliff is now reached
    // We are now at the vesting start date + 1, we should therefore be able to claim the first day unlocked tokens
    await evmTime.advanceTimeAndBlock(SECONDS_IN_DAY * 2);

    // store recipient initial LKT balance
    const recipientInitialBalance = await tokenInstance.balanceOf(recipient);

    // claim locked tokens from recipient's account
    const firstClaimRes = await tokenVaultInstance.claimLockedTokens(lockIndex, { from: recipient });

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
    const secondClaimRes = await tokenVaultInstance.claimLockedTokens(lockIndex, { from: recipient });

    const secondExpectedClaimedAmount = toBN(toWei('300000', 'ether'));
    truffleAssert.eventEmitted(secondClaimRes, 'LockedTokensClaimed', {
      recipientAddress: recipient,
      claimedAmount: secondExpectedClaimedAmount,
    });
  });

  it('should revert if trying to revoke from an unauthorized account', async () => {
    // trying to revoke lock from unauthorized account
    await truffleAssert.reverts(tokenVaultInstance.revokeLock(lockIndex, { from: usurper }), 'LockletTokenVault: Forbidden');
  });

  it('should revert if trying to revoke a non-revocable lock', async () => {
    // trying to revoke lock from initiator's account
    await truffleAssert.reverts(tokenVaultInstance.revokeLock(lockIndex, { from: initiator }), 'LockletTokenVault: Lock not revocable');
  });

  it('should to claim the rest of the locked tokens', async () => {
    // advance evm time by 9 days, we are now 12 days after the lock date (sd+12)
    await evmTime.advanceTimeAndBlock(SECONDS_IN_DAY * 9);

    // claim locked tokens from recipient's account
    const thirdClaimRes = await tokenVaultInstance.claimLockedTokens(lockIndex, { from: recipient });

    const thirdExpectedClaimedAmount = toBN(toWei('600000', 'ether'));
    truffleAssert.eventEmitted(thirdClaimRes, 'LockedTokensClaimed', {
      recipientAddress: recipient,
      claimedAmount: thirdExpectedClaimedAmount,
    });
  });
});
