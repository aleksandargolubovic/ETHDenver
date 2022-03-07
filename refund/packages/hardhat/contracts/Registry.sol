// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Refund.sol";

contract Registry {
  event NewRefundRegistered(Refund indexed refund, address indexed createdBy, string name);
  mapping(string => address) public refundOrgs;

  function register(string calldata name, Refund refund, address createdBy) external {
    require(refundOrgs[name] == address(0), "Name already in use");
    refundOrgs[name] = address(refund);
    emit NewRefundRegistered(refund, createdBy, name);
  }

}