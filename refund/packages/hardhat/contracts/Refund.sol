// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
//import "@openzeppelin/contracts/access/Ownable.sol";


contract Refund is ReentrancyGuard, AccessControl {
  // User roles.
  bytes32 public constant MEMBER_ROLE = keccak256("MEMBER");
  bytes32 public constant APPROVER_ROLE = keccak256("APPROVER");

  uint256 public numOfRequests;

  struct ReimbursementRequest {
    uint256 id;
    uint256 amount;
    uint256 date;
    string category;
    string description;
    string url;
    bool processed;
    bool approved;
    bool paid;
    address payable reimbursementAddress;
    address member;
    address paidBy;
  }

  mapping(uint256 => ReimbursementRequest) private reimbursementRequests;
  mapping(address => uint256[]) private memberRequests;

  // Events.
  event NewRequestCreated(address indexed member, uint256 amount);
  event PaymentTransfered(
    address indexed approver,
    address indexed reimbursementAddress,
    uint256 amount);
  
  event BalanceIncreased(address indexed fromAddress, uint256 amount);

  // Modifiers.
  modifier onlyApprover(string memory message) {
    require(hasRole(APPROVER_ROLE, msg.sender), message);
    _;
  }

  modifier onlyMember(string memory message) {
    require(hasRole(MEMBER_ROLE, msg.sender), message);
    _;
  }

  // Constructor.
  constructor(
    address[] memory approvers,
    address[] memory members) {
    
    for (uint256 i = 0; i < approvers.length; i++) {
      _setupRole(APPROVER_ROLE, approvers[i]);
    }

    for (uint256 i = 0; i < members.length; i++) {
      _setupRole(MEMBER_ROLE, members[i]);
    }
  }

  // Creates a new reimbursement request. Only members are allowed to call this
  // function.
  function createRequest(
    string calldata description,
    string calldata url,
    address reimbursementAddress,
    uint256 amount,
    uint256 date,
    string calldata category)
    external
    onlyMember("Only members are allowed to create requests") {

    uint256 requestId = numOfRequests++;
    ReimbursementRequest storage request = reimbursementRequests[requestId];
    request.id = requestId;
    request.amount = amount;
    request.category = category;
    request.date = date;
    request.description = description;
    request.url = url;
    request.reimbursementAddress = payable(reimbursementAddress);
    request.member = msg.sender;

    memberRequests[request.member].push(requestId);

    emit NewRequestCreated(msg.sender, amount);
  }

  // Used to approve or deny a request. Can be called by approvers only.
  function processRequest(uint256 requestId, bool approved)
    external
    onlyApprover("Only approvers are allowed to process requests") {

    ReimbursementRequest storage request = reimbursementRequests[requestId];

    preProcess(request);
    request.approved = approved;
    if (request.approved) {
      payRequest(request);
    }
  }

  // Checks preconditions.
  function preProcess(ReimbursementRequest storage request) private {
    if (request.processed || request.paid) {
      revert("Reimbursement request has been processed already");
    }
    request.processed = true;
  }

  // Transfers requested amount to reimbursement address.
  function payRequest(ReimbursementRequest storage request) private {
    if (request.paid) {
      revert("Reimbursement request has been paid already");
    }
    if (!request.approved) {
      revert("Reimbursement request has been denied already");
    }
    request.paid = true;
    request.paidBy = msg.sender;

    emit PaymentTransfered(
      msg.sender,
      request.reimbursementAddress,
      request.amount);

    return request.reimbursementAddress.transfer(request.amount);
  }

  // Used to increase balance of the contract.
  receive() external payable {
    emit BalanceIncreased(msg.sender, msg.value);
  }

  // Returns whether the sender has a member role.
  function isMember() public view returns (bool) {
    return hasRole(MEMBER_ROLE, msg.sender);
  }

  // Returns whether the sender has an approver role.
  function isApprover() public view returns (bool) {
    return hasRole(APPROVER_ROLE, msg.sender);
  }

  // Returns all the reimbursement requests for the caller.
  function getMembersRequests()
    public
    view
    returns (ReimbursementRequest[] memory requests) {

    uint256 size = memberRequests[msg.sender].length;
    requests = new ReimbursementRequest[](size);
    for (uint256 index = 0; index < size; index++) {
      requests[index] =
        reimbursementRequests[memberRequests[msg.sender][index]];
    }
  }

  // Returns all the reimbursement requests.
  function getRequests()
    public
    view
    returns (ReimbursementRequest[] memory requests) {
    
    requests = new ReimbursementRequest[](numOfRequests);
    for (uint256 index = 0; index < numOfRequests; index++) {
        requests[index] = reimbursementRequests[index];
    }
  }

  // Returns a particular reimbursement request for provided id.
  function getRequest(uint256 requestId)
    public
    view
    returns (ReimbursementRequest memory) {

    return reimbursementRequests[requestId];
  }
}
