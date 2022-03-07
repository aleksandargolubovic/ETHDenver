// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Refund.sol";
import "./Registry.sol";

contract RefundFactory {
  Registry public registry;

  constructor(Registry reg) {
    registry = reg;
  }

  function newRefundOrg(
    string calldata name,
    address[] calldata approvers,
    address[] calldata members)
    external returns (Refund r) {

    r = new Refund(approvers, members);
    registry.register(name, r, msg.sender);
  }
}