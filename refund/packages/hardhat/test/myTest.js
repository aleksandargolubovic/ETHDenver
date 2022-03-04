const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("Refund", function () {
  let myContract;
  let accounts;
  let requestsCreated = 0;
  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  describe("YourContract", function () {

    it("Should deploy YourContract", async function () {
      accounts = await ethers.getSigners();
      const RefundContract = await ethers.getContractFactory("Refund");

      //console.log(accounts[0].address, accounts[1].address, accounts[2].address);
      myContract = await RefundContract.deploy(
        [accounts[0].address],
        [accounts[1].address, accounts[2].address]
      );
 
      const tx = await accounts[0].sendTransaction({
        to: myContract.address,
        value: ethers.utils.parseEther("1.0")
      });
    });

    describe("createRequest()", function () {
      it("Should be able to create a new request", async function () {
        const description = "ipfs url";
        const address = accounts[1].address;
        const amountWei = ethers.utils.parseEther("1");

        await myContract.connect(accounts[1])
          .createRequest(description, address, amountWei);
        expect(await myContract.numOfRequests()).to.equal(++requestsCreated);
      });

      it("Should be able to create a new request", async function () {
        const description = "ipfs url2";
        const address = accounts[1].address;
        const amountWei = ethers.utils.parseEther("2");

        await myContract.connect(accounts[1])
          .createRequest(description, address, amountWei);

        expect(await myContract.numOfRequests()).to.equal(++requestsCreated);
      });

      it("Should emit a NewRequestCreated event", async function () {
        const description = "ipfs url2";
        const address = accounts[1].address;
        const amountWei = ethers.utils.parseEther("2");
        requestsCreated++;
        expect(await myContract.connect(accounts[1])
          .createRequest(description, address, amountWei))
          .to
          .emit(myContract, "NewRequestCreated")
          .withArgs(accounts[1].address, amountWei);
      });
    });

    describe("processRequest()", function () {
      it("Should be able to approve request", async function () {
        //let provider = ethers.provider;
        // Look up the balance
        // for (let i = 0; i < 2; i++) {
        //   let balance = await provider.getBalance(accounts[i].address);
        //   console.log(accounts[i].address + ':' + ethers.utils.formatEther(balance));
        // }
        const requestId = 0;
        expect(await myContract.connect(accounts[0]).processRequest(requestId, true))
          .to
          .emit(myContract, "PaymentTransfered")
          .withArgs(accounts[0].address, accounts[1].address,
                    ethers.utils.parseEther("1"));

        expect((await myContract.getRequest(requestId)).approved).to.equal(true);
        expect((await myContract.getRequest(requestId)).paid).to.equal(true);
        expect((await myContract.getRequest(requestId)).processed).to.equal(true);
        // for (let i = 0; i < 2; i++) {
        //   let balance = await provider.getBalance(accounts[i].address);
        //   console.log(accounts[i].address + ':' + ethers.utils.formatEther(balance));
        // }
      });
    });

    describe("processRequest() 2", function () {
      it("Should be able to deny request", async function () {
        const requestId = 1;
        await myContract.connect(accounts[0]).processRequest(requestId, false);
        expect((await myContract.getRequest(requestId)).approved).to.equal(false);
        expect((await myContract.getRequest(requestId)).paid).to.equal(false);
        expect((await myContract.getRequest(requestId)).processed).to.equal(true);
      });
    });

    describe("getRequests()", function () {
      it("Should return all the requests", async function () {
        const requests = await myContract.getRequests();
        console.log(requests);
        expect((requests.length)).to.equal(requestsCreated);
      });
    });
  });
});
