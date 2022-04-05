import { Input, Divider, Spin, Statistic, notification } from "antd";
import {
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  Label,
  FormGroup,
  Row, Col,
  Table,

  UncontrolledTooltip,
} from "reactstrap";

import classNames from "classnames";
// react plugin used to create charts
import { Line, Bar } from "react-chartjs-2";

import {
  chartExample1,
  chartExample2,
  chartExample3,
  chartExample4,
} from "../variables/charts.js";


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


  const [bigChartData, setbigChartData] = React.useState("data1");
  const setBgChartData = (name) => {
    setbigChartData(name);
  };

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

  let refundInfo
  if (refundAddress && (isMember || isApprover)) {
    refundInfo = (
      <div>
        <Row>
          <Col xs="12" lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Organization Name</h5>

              </CardHeader>
              <CardBody>
                <CardTitle tag="h2">{refundName}</CardTitle>
              </CardBody>
            </Card>
          </Col>
          <Col xs="12" lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Organization Contract Address</h5>

              </CardHeader>
              <CardBody>
                <CardTitle tag="h2"><Address value={refundAddress} ensProvider={mainnetProvider} blockExplorer={blockExplorer} /></CardTitle>
              </CardBody>
            </Card>
          </Col>
          <Col xs="12" lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Balance</h5>

              </CardHeader>
              <CardBody>
                <CardTitle tag="h2"><Balance value={refundBalance} price={price} /></CardTitle>
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Total Requests</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-bell-55 text-info" />{numOfRequests.toString()}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line
                    data={chartExample2.data}
                    options={chartExample2.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Total Money Refunded</h5>
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
                <h5 className="card-category">Requests Status</h5>
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
          </Col>
        </Row>
        <Row>
          <Col lg="8">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Send funds to this organization</h5>
              </CardHeader>
              <CardBody>
                <div>
                  <div style={{ padding: 4 }}>
                    <EtherInput
                      style={{ width: "70%" }}
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
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    )
  } else {
    refundInfo = "";
  }

  return (
    <div className="content">
      {wait ? <Spin /> : (<>
        {!signer && <Redirect to="/" />}
        <div>
          {refundInfo}
        </div>
        <Divider />
      </>)}
    </div>
  );
}
