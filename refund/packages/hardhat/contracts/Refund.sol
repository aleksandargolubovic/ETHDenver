// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
//import "@openzeppelin/contracts/access/Ownable.sol";


contract Refund is AccessControl {
  bytes32 public constant MEMBER_ROLE = keccak256("MEMBER");
  bytes32 public constant APPROVER_ROLE = keccak256("APPROVER");
  

  
  uint256 private value;

  event ValueChanged(uint256 new_value);

  function store(uint256 new_value) public onlyOwner {
    value = new_value;
    emit ValueChanged(new_value);
  }

  function retrieve() public view returns (uint256) {
    return value;
  }
}
