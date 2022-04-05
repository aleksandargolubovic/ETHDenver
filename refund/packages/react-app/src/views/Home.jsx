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


export default function Home({
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
  const [nameAlreadyExists, setNameAlreadyExists] = useState(false);
  const [showError, setShowError] = useState('');
  const [wait, setWait] = useState(false);

  const contracts = useContractLoader(provider, contractConfig, chainId);
  const registryContract = contracts[REGISTRY];
  const refundFactoryContract = contracts[REFUND_FACTORY];
  const registryContractIsDeployed =
    useContractExistsAtAddress(provider, registryContract ? registryContract.address : "");

  const [refundAddress, setRefundAddress] = useLocalStorage("deployedRefund");
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [deploying, setDeploying] = useState();

  const addNewEvent = useCallback((...listenerArgs) => {
    if (listenerArgs != null && listenerArgs.length > 0) {
      const newEvent = listenerArgs[listenerArgs.length - 1];
      if (newEvent.event != null && newEvent.logIndex != null && newEvent.transactionHash != null) {
        console.log("NEW EVENT: ", newEvent);
        let fullDescription = '';
        const descAmount = ethers.utils.formatEther(newEvent.args.amount);
        if (newEvent.event == "NewRequestCreated") {
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
    if (refundInstance) {
      let filter;
      console.log("Refund Instance still alive: ", refundInstance);
      const init = async () => {
        try {
          const retIsApprover = await refundInstance.connect(signer).isApprover();
          const retIsMember = await refundInstance.connect(signer).isMember();
          console.log("isAdmin:", retIsApprover, "isMember:", retIsMember)
          setWait(false);
          setIsApprover(retIsApprover);
          setIsMember(retIsMember);
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
      <Row>
        <Card className="card-chart">
          <CardHeader>
            <CardTitle tag="h4">Current Organization</CardTitle>
          </CardHeader>
          <CardBody>
            <CardTitle tag="h2">{refundName}</CardTitle>
          </CardBody>
        </Card>
      </Row>
    )
  } else if (!showDeployForm) {
    refundInfo = (
      <div style={{ padding: 32 }}>

        <Button onClick={() => createNewRefund(true)} type={"primary"} >
          CREATE A NEW REFUND ORG
        </Button>
        <br /> <br />
        <Card className="card-chart">
          <CardHeader>
            <CardTitle tag="h4">
              Or Enter Existing Organization Name
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Input placeholder="Organization name"
              style={{ width: "50%", textAlign: "center" }}
              onChange={async (e) => {
                setShowError('');
                checkNameAvailability(e.target.value)
                setName(e.target.value)
              }}
            />
            <br />
            <Button type="primary" onClick={() => {
              setRefundName('');
              setRefundName(name);
            }}
            >Enter
            </Button>
          </CardBody>
        </Card>

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
        <Card className="card-chart">
          <CardHeader>
            <CardTitle tag="h3">
              Create a new Refund Organization
            </CardTitle>
          </CardHeader>
        </Card>
        <Row>
          <Card className="card-chart">
            <CardHeader>
              <CardTitle tag="h4">
                Organization name
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Input placeholder="Organization name"
                style={{ width: "50%", textAlign: "center" }}
                onChange={async (e) => {
                  checkNameAvailability(e.target.value)
                  setName(e.target.value)
                }}
              />
              {nameAlreadyExists && <label>Name already in use</label>}
            </CardBody>
            <br />
          </Card>
        </Row>
        <Row>
          <Col lg="6">
            <Card className="card-chart">
              <CardHeader>
                <CardTitle tag="h4">
                  Approvers
                </CardTitle>
              </CardHeader>
              <CardBody>
                <EditableTagGroup key="approvers" setAddresses={setApprovers} />
              </CardBody>
              <br />
            </Card>
          </Col>
          <Col lg="6">
            <Card className="card-chart">
              <CardHeader>
                <CardTitle tag="h4">
                  Members
                </CardTitle>
              </CardHeader>
              <CardBody>
                <EditableTagGroup key="members" setAddresses={setMembers} />
              </CardBody>
              <br />
            </Card>
          </Col>
        </Row>

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
      </>
    )
  }

  return (
    <div className="content">
      {wait ? <Spin /> : (<>
        {!signer && <Redirect to="/" />}
        <div >

          <div style={{ padding: 4 }}>
            {refundInfo}
          </div>
          {deployForm}
          {refundAddress || showDeployForm ?
            <div>
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
              >
                {showDeployForm ? "Back" : "Change Organization"}
              </Button>
            </div>
            : ""}
        </div>
      </>)}
    </div>
  );
}
