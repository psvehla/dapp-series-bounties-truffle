const Bounties = artifacts.require("./Bounties.sol");
const getCurrentTime = require('./utils/time').getCurrentTime;
const assertRevert = require('./utils/assertRevert').assertRevert;
const increaseTimeInSeconds = require('./utils/time').increaseTimeInSeconds;
const dayInSeconds = 86400;

contract('Bounties', function(accounts) {

  let bountiesInstance;

  beforeEach(async () => {
    bountiesInstance = await Bounties.new()
  });

  it("Should allow a user to issue a new bounty.", async () => {
    let time = await getCurrentTime();
    let tx = await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});

    assert.strictEqual(tx.receipt.logs.length, 1, "issueBounty() call did not log 1 event");
    assert.strictEqual(tx.logs.length, 1, "issueBounty() call did not log 1 event");

    const logBountyIssued = tx.logs[0];

    assert.strictEqual(logBountyIssued.event, "BountyIssued", "issueBounty() call did not log event BountyIssued.");
    assert.strictEqual(logBountyIssued.args.bountyId.toNumber(), 0, "BountyIssued event logged did not have expected bountyId.");
    assert.strictEqual(logBountyIssued.args.issuer, accounts[0], "BountyIssued event logged did not have expected issuer.");
    assert.strictEqual(logBountyIssued.args.amount.toNumber(), 500000000000, "BountyIssued event logged did not have expected amount.");
  });

  it("Should return an integer when calling issueBounty().", async () => {
    let time = await getCurrentTime();
    let result = await bountiesInstance.issueBounty.call("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    assert.strictEqual(result.toNumber(), 0, "issueBounty() call did not return correct id.")
  });

  it("Should not allow the user to issue a bounty without sending ETH.", async () => {
    let time = await getCurrentTime();
    assertRevert(bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0]}), "Bounty issued without sending ETH.");
  });

  it("Should not allow the user to issue a bounty when sending a value of 0.", async () => {
    let time = await getCurrentTime();
    assertRevert(bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 0}), "Bounty issued sending a value of 0.");
  });

  it("Should not allow the user to issue a bounty with a deadline in the past.", async () => {
    let time = await getCurrentTime();
    assertRevert(bountiesInstance.issueBounty("data", time - 1, {from: accounts[0], value: 500000000000}), "Bounty issued with a deadline in the past.");
  });

  it("Should not allow the user to issue a bounty with a deadline of now.", async () => {
    let time = await getCurrentTime();
    assertRevert(bountiesInstance.issueBounty("data", time, {from: accounts[0], value: 500000000000}), "Bounty issued with a deadline of now.");
  });

  it("Should allow a user to fulfil a bounty.", async () => {
    let time = await getCurrentTime();

    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    let tx = await bountiesInstance.fulfilBounty(0, "data", {from: accounts[1]});

    assert.strictEqual(tx.receipt.logs.length, 1, "fulfilBounty() call did not log 1 event");
    assert.strictEqual(tx.logs.length, 1, "fulfilBounty() call did not log 1 event");

    const logBountyIssued = tx.logs[0];

    assert.strictEqual(logBountyIssued.event, "BountyFulfiled", "fulfilBounty() call did not log event BountyFulfiled.");
    assert.strictEqual(logBountyIssued.args.bountyId.toNumber(), 0, "BountyFulfiled event logged did not have expected bountyId.");
    assert.strictEqual(logBountyIssued.args.fulfiler, accounts[1], "BountyFulfiled event logged did not have expected fulfiler.");
    assert.strictEqual(logBountyIssued.args.fulfilmentId.toNumber(), 0, "BountyFulfiled event logged did not have expected fulfilmentId.");
  });

  it("Should not allow a user to fulfil a non existent bounty.", async () => {
    let time = await getCurrentTime();
    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    assertRevert(bountiesInstance.fulfilBounty(1, "data", {from: accounts[1]}), "Fulfilment accepted for non existent bounty.");
  });

  it("Should not allow a user to fulfil their own bounty.", async () => {
    let time = await getCurrentTime();
    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    assertRevert(bountiesInstance.fulfilBounty(0, "data", {from: accounts[0]}), "Fulfilment accepted for own bounty.");
  });

  it("Should not allow a user to fulfil a bounty whose deadline has passed.", async () => {
    let time = await getCurrentTime();
    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    await increaseTimeInSeconds((dayInSeconds * 2) + 1);
    assertRevert(bountiesInstance.fulfilBounty(0, "data", {from: accounts[1]}), "Fulfilment accepted after deadline.");
  });

  it("Should allow an issuer to accept the fulfilment of a bounty.", async () => {
    let time = await getCurrentTime();

    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    await bountiesInstance.fulfilBounty(0, "data", {from: accounts[1]});
    let tx = await bountiesInstance.acceptFulfilment(0, 0, {from: accounts[0]});

    assert.strictEqual(tx.receipt.logs.length, 1, "acceptFulfilment() call did not log 1 event");
    assert.strictEqual(tx.logs.length, 1, "acceptFulfilment() call did not log 1 event");

    const logBountyIssued = tx.logs[0];

    assert.strictEqual(logBountyIssued.event, "FulfilmentAccepted", "acceptFulfilment() call did not log event FulfilmentAccepted.");
    assert.strictEqual(logBountyIssued.args.bountyId.toNumber(), 0, "FulfilmentAccepted event logged did not have expected bountyId.");
    assert.strictEqual(logBountyIssued.args.issuer, accounts[0], "FulfilmentAccepted event logged did not have expected issuer.");
    assert.strictEqual(logBountyIssued.args.fulfiler, accounts[1], "FulfilmentAccepted event logged did not have expected fulfiler.");
    assert.strictEqual(logBountyIssued.args.fulfilmentId.toNumber(), 0, "FulfilmentAccepted event logged did not have expected fulfilmentId.");
    assert.strictEqual(logBountyIssued.args.amount.toNumber(), 500000000000, "BountyIssued event logged did not have expected amount.");
  });

  it("Should not let an issuer accept a non existent fulfilment.", async () => {
    let time = await getCurrentTime();
    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    await bountiesInstance.fulfilBounty(0, "data", {from: accounts[1]});
    assertRevert(bountiesInstance.acceptFulfilment(0, 1, {from: accounts[0]}), "Allowed the acceptance of a non existent fulfilment.");
  });

  it("Should only let an issuer accept a fulfilment.", async () => {
    let time = await getCurrentTime();
    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    await bountiesInstance.fulfilBounty(0, "data", {from: accounts[1]});
    assertRevert(bountiesInstance.acceptFulfilment(0, 0, {from: accounts[1]}), "Someone other than the issuer was allowed to accept the fulfilment.");
  });

  it("Should not allow the acceptance of an accepted fulfilment.", async () => {
    let time = await getCurrentTime();
    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    await bountiesInstance.fulfilBounty(0, "data", {from: accounts[1]});
    await bountiesInstance.acceptFulfilment(0, 0, {from: accounts[0]});
    assertRevert(bountiesInstance.acceptFulfilment(0, 0, {from: accounts[0]}), "Allowed a double fulfilment.");
  });

  it("Should not allow the acceptance of a cancelled fulfilment.", async () => {
    let time = await getCurrentTime();
    await bountiesInstance.issueBounty("data", time + (dayInSeconds * 2), {from: accounts[0], value: 500000000000});
    await bountiesInstance.fulfilBounty(0, "data", {from: accounts[1]});
    await bountiesInstance.cancelBounty(0, {from: accounts[0]});
    assertRevert(bountiesInstance.acceptFulfilment(0, 0, {from: accounts[0]}), "Allowed acceptance of a cancelled fulfilment.");
  });
});
