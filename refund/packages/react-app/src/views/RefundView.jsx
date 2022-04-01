import { Divider, Spin, Statistic, notification } from "antd";
import { 
  Button,
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  CardFooter,
  CardText,
  Input } from "reactstrap";
import { SendOutlined } from "@ant-design/icons";
import { useContractExistsAtAddress, useContractLoader } from "eth-hooks";
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Address, Balance, EtherInput } from "../components";
import { useLocalStorage } from "../hooks";
import { useBalance } from "eth-hooks";
import { EditableTagGroup } from "../components/EditableTagGroup";
import refundAbi from "../contracts/refund.json";
import { Redirect } from "react-router-dom";
import { CloseOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Line, Bar } from "react-chartjs-2";

import {
  chartExample1,
  chartExample2,
  chartExample3,
  chartExample4,
} from "../variables/charts.js";


export default function RefundView({
  address,
  mainnetProvider,
  localProvider,
  price,
  blockExplorer,
  provider,
  chainId,
  contractConfig,
  gasPrice,
  signer,
  setRefundInstance,
  refundInstance,
  isApprover,
  setIsApprover,
  isMember,
  setIsMember
}) {
  const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
  const REGISTRY = "Registry";
  const REFUND_FACTORY = "RefundFactory";
  const [approvers, setApprovers] = useState([]);
  const [members, setMembers] = useState([]);
  const [refundName, setRefundName] = useLocalStorage("refundName");
  const [name, setName] = useState('');
  const [value, setValue] = useState();
  //const [transactions, setTransactions] = useState([]);
  const [nameAlreadyExists, setNameAlreadyExists] = useState(false);
  const [showError, setShowError] = useState('');
  const [wait, setWait] = useState(false);

  const contracts = useContractLoader(provider, contractConfig, chainId);
  const registryContract = contracts[REGISTRY];
  const refundFactoryContract = contracts[REFUND_FACTORY];
  const registryContractIsDeployed =
    useContractExistsAtAddress(provider, registryContract ? registryContract.address : "");
  // const RefundFaactoryContractIsDeployed =
  //   useContractExistsAtAddress(provider, refundFactoryContract.address);

  const [refundAddress, setRefundAddress] = useLocalStorage("deployedRefund");
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [deploying, setDeploying] = useState();
  const [sendingFunds, setSendingFunds] = useState();
  const [showRefundInfo, setShowRefundInfo] = useState();
  const [numOfRequests, setNumOfRequests] = useState(0);
  const [updateNumReqs, setUpdateNumReqs] = useState(false);
  
  const refundBalance = useBalance(localProvider, refundAddress);

  const addNewEvent = useCallback((...listenerArgs) => {
    if (listenerArgs != null && listenerArgs.length > 0) {
      const newEvent = listenerArgs[listenerArgs.length - 1];
      if (newEvent.event != null && newEvent.logIndex != null && newEvent.transactionHash != null) {
        console.log("NEW EVENT: ", newEvent);
        let fullDescription = '';
        const descAmount = ethers.utils.formatEther(newEvent.args.amount);
        if (newEvent.event == "NewRequestCreated") {
          setUpdateNumReqs(!updateNumReqs);
          fullDescription = "Amount: " + descAmount + "\n Created by: " + newEvent.args.member;
        } else {
          fullDescription = "Amount: " + descAmount + "\n Approved by: " + newEvent.args.approver;
        }
        notification.info({
          message: newEvent.event,
          description: fullDescription,
          placement: "bottomRight",
        });
      }
    }
  }, []);

  useEffect(() => {
    const getReqNumber = async () => {
      if (refundInstance) {
        const numOfRequests = await refundInstance.numOfRequests();
        setNumOfRequests(numOfRequests);
      }
    }
    getReqNumber();
  }, [updateNumReqs])

  useEffect(() => {
    if (refundInstance) {
      let filter;
      console.log("Refund Instance still alive: ", refundInstance);
      const init = async () => {
        try {
          const retIsApprover = await refundInstance.connect(signer).isApprover();
          const retIsMember = await refundInstance.connect(signer).isMember();
          const numOfRequests = await refundInstance.numOfRequests();
          console.log("isAdmin:", retIsApprover, "isMember:", retIsMember)
          setWait(false);
          setIsApprover(retIsApprover);
          setIsMember(retIsMember);
          setNumOfRequests(numOfRequests);
          if (!retIsApprover && !retIsMember) {
            setShowError("You are not part of this organization!");
            return;
          }
          if (retIsMember) {
            filter = refundInstance.filters.PaymentTransfered(null, address);
          } else if (retIsApprover) {
            filter = refundInstance.filters.NewRequestCreated();
          }

          refundInstance.on(filter, addNewEvent);
          console.log("SUBSCRIBED");
            
        } catch (error) {
          console.log(error);
          setTimeout(() => {
            init();  
          }, 100);
          
        }
      }
      init();

      return () => {
        console.log("removed subscribed")
        refundInstance.removeAllListeners();
      };
    }
  }, [refundInstance]);

  const createNewRefund = useCallback((showDeployForm) => {
    setShowDeployForm(showDeployForm);
  }, []);

  useEffect(() => {
    if (refundName && registryContract) {
      initializeRefundContract();
    }
  }, [refundName]);

  const initializeRefundContract = async () => {
    const addr = await registryContract.refundOrgs(refundName);
    if (addr === NULL_ADDRESS) {
      setShowError("Organization doesn't exist");
      console.error("Refund contract doesn't exist: ", refundName);
      return;
    }
    try {
      setWait(true);
      const refundInstance = new ethers.Contract(addr, refundAbi, localProvider);
      console.log(refundInstance);
      setRefundInstance(refundInstance);
      setRefundAddress(addr);
    } catch (error) {
      console.log(error);
    }
  };

  const deployRefund = useCallback(async (name, approvers, members) => {
    if (!refundFactoryContract) return;
    setDeploying(true);
    let refund;
    try {
      refund = await refundFactoryContract.connect(signer)
        .newRefundOrg(name, approvers, members);
    } catch (error) {
      console.error(error)
      setDeploying(false)
      return
    }
    console.log("New refund created: ", refund);
    setDeploying(false);
    setRefundName(name);
    setShowDeployForm(false);
  }, [refundFactoryContract])

  const checkNameAvailability = async (newName) => {
    if (registryContract) {
      let nameOk;
      try {
        nameOk = await registryContract.refundOrgs(newName);
        if (nameOk === NULL_ADDRESS) {
          setNameAlreadyExists(false);
          return true;
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log("Registry contract is not initialized yet");
    }
    setNameAlreadyExists(true);
    return false;
  };

  let refundInfo
  if (refundAddress && (isMember || isApprover)) {
    refundInfo = (
      
      <div>
        <h2>{refundName}</h2>
        <Row>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Total Shipments</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-bell-55 text-info" /> 763,215
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  aaa
                  {/* <Line
                    data={chartExample2.data}
                    options={chartExample2.options}
                  /> */}
                </div>
              </CardBody>
            </Card>
          </Col>
          {/* <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Daily Sales</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-delivery-fast text-primary" />{" "}
                  3,500€
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Bar
                    data={chartExample3.data}
                    options={chartExample3.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Completed Tasks</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-send text-success" /> 12,100K
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line
                    data={chartExample4.data}
                    options={chartExample4.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col> */}
        </Row>
        <Row>
          <Col lg="4">
            <Card>
              <CardHeader>
                <h5 className="title">Address</h5>
              </CardHeader>
              <CardBody>
                <Address value={refundAddress} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card>
              <CardHeader>
                <h5 className="title">Balance</h5>
              </CardHeader>
              <CardBody>
                <Balance value={refundBalance} price={price} />
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col lg="4">
            <Card>
              <CardHeader>
                <h5 className="title">User Role</h5>
              </CardHeader>
              <CardBody>
                <h4>{isApprover ? "Approver" : isMember ? "Member" : ""}</h4>
              </CardBody>
            </Card>
            {/* <Statistic title="User Role" value={isApprover ? "Approver" : isMember ? "Member" : ""} /> */}
          </Col>
          <Col lg="4">
            <Card>
              <CardHeader>
                <h5 className="title">Total Requests</h5>
              </CardHeader>
              <CardBody>
                <h4>{numOfRequests.toString()}</h4>
              </CardBody>
            </Card>
            {/* <Statistic title="Total Requests" value={numOfRequests} /> */}
          </Col>
        </Row>
        <Divider />
        <Row>
          <Col lg="4">
            <Card>
              <CardHeader>
                <h3 className="title">Send funds to this organization:</h3>
              </CardHeader>
              <CardBody>
              <div style={{ padding: 4 }}>
                <EtherInput
                  autofocus
                  price={price}
                  placeholder="Enter Tx Value"
                  value={value}
                  onChange={v => { setValue(v); }}
                />
              </div>
              <Button
                style={{ marginTop: 8 }}
                loading={sendingFunds}
                type={"primary"}
                onClick={async () => {
                  let amount;
                  try {
                    amount = ethers.utils.parseEther("" + value);
                  } catch (e) {
                    // failed to parseEther, try something else
                    amount = ethers.utils.parseEther("" + parseFloat(value).toFixed(8));
                  }
                  const tx = signer.sendTransaction({
                    to: refundAddress,
                    value: amount
                  });
                }}
              >
                <SendOutlined /> Send funds
              </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>

      </div>
    )
  } else if (!showDeployForm) {
    refundInfo = (
      <div style={{ padding: 32 }}>
        <Button onClick={() => createNewRefund(true)} type={"primary"} >
          CREATE A NEW REFUND ORG
        </Button>
        <Divider />
        <div> or enter existing organization name: </div>
        {/* <Input.Group compact> */}
          <Input placeholder="Organization name"
            style={{ width: 'calc(100% - 100px)' }}
            onChange={async (e) => {
              setShowError('');
              checkNameAvailability(e.target.value)
              setName(e.target.value)
            }}
          />
          <Button type="primary" onClick={() => {
            setRefundName('');
            setRefundName(name);
          }}
          >Enter
          </Button>
        {/* </Input.Group> */}
        <div>
          {showError !== '' && <label style={{ color: 'crimson' }}>{showError}</label>}
        </div>
      </div>
    )
  } else {
    refundInfo = "";
  }

  let deployForm
  if (!showDeployForm) {
    deployForm = ""
  } else {
    deployForm = (
      <>
      <div className="content">
      <Row>
        <Col md="8">
          <Card className="card-user">
            <CardHeader>
              <div className="author">
                <h3 className="title">Create a new Refund Organization</h3>
              </div>
            </CardHeader>
            <CardBody>
              {/* <div style={{ margin: 8 }}>
                <div style={{ padding: 4 }}> */}
                <Row>
                  <Col className="ml-auto mr-auto text-center" lg="8">
                    <label>Organization name</label>
                    <Input placeholder="Organization name"
                      onChange={async (e) => {
                        checkNameAvailability(e.target.value)
                        setName(e.target.value)
                      }}
                    />
                    {nameAlreadyExists && <label>Name already in use</label>}
                  </Col>
                </Row>
                  
                {/* </div> */}
                <Divider />
                <div style={{ padding: 4 }}>
                  Approvers
                  <EditableTagGroup key="approvers" setAddresses={setApprovers} />
                </div>
                <Divider />
                <div style={{ padding: 4 }}>
                  Members
                  <EditableTagGroup key="members" setAddresses={setMembers} />
                </div>
                <Divider />
                <Button
                  style={{ marginTop: 8 }}
                  loading={deploying}
                  type={"primary"}
                  onClick={async () => {
                    console.log("approvers", approvers);
                    console.log("members", members);
                    deployRefund(name, approvers, members);
                  }}
                >
                  Create
                </Button>

              {/* </div> */}
            </CardBody>
          </Card>
        </Col>
        <Col md="4">
            <Card className="card-user">
              <CardBody>
                <CardText />
                <div className="author">
                  <div className="block block-one" />
                  <div className="block block-two" />
                  <div className="block block-three" />
                  <div className="block block-four" />
                  <a href="#pablo" onClick={(e) => e.preventDefault()}>

                    <h5 className="title">Mike Andrew</h5>
                  </a>
                  <p className="description">Ceo/Co-Founder</p>
                </div>
                <div className="card-description">
                  Do not be scared of the truth because we need to restart the
                  human foundation in truth And I love you like Kanye loves
                  Kanye I love Rick Owens’ bed design but the back is...
                </div>
              </CardBody>
              <CardFooter>
                <div className="button-container">
                  <Button className="btn-icon btn-round" color="facebook">
                    <i className="fab fa-facebook" />
                  </Button>
                  <Button className="btn-icon btn-round" color="twitter">
                    <i className="fab fa-twitter" />
                  </Button>
                  <Button className="btn-icon btn-round" color="google">
                    <i className="fab fa-google-plus" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </Col>
      </Row>
      </div>
      </>
    )
  }
  
  return (
    <div className="content">
      {wait ? <Spin /> : (<>
        {!signer && <Redirect to="/" />}
        {/* <div style={{ padding: 16, paddingTop: 2, border: "1px solid #cccccc", width: 400, margin: "auto", marginTop: 32, marginBottom: 32 }}> */}
        <div className="content">
          {refundAddress || showDeployForm ? <Row style={{ paddingTop: 0, width: 372, margin: "auto" }}>
            <Col span={1} offset={23}>
              <Button
                icon={<CloseOutlined />}
                size="small"
                type="text"
                onClick={() => {
                  setRefundAddress("")
                  setRefundInstance()
                  setNameAlreadyExists(false)
                  setShowDeployForm(false)
                  setRefundName("")
                }}
              />
            </Col>
          </Row> : ""}
          <div style={{ padding: 4 }}>
            {refundInfo}
          </div>

          {deployForm}

        </div>
        <Divider />
      </>)}
    </div>
  );
}
