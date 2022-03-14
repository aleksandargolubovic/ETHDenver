import { Button, Card, DatePicker, Divider, Input, List, Progress, Slider, Spin, Switch, notification } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { useContractExistsAtAddress, useContractLoader } from "eth-hooks";
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Address, Balance, EtherInput, AddressInput } from "../components";
import { usePoller, useLocalStorage, useSafeSdk } from "../hooks";
import { useBalance } from "eth-hooks";
import { EditableTagGroup } from "../components/EditableTagGroup";
import refundAbi from "../contracts/refund.json";
import { Transactor } from "../helpers";
import { Redirect } from "react-router-dom";


export default function RefundView({
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
  const [transactions, setTransactions] = useState([]);
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
  const [numOfRequests, setNumOfRequests] = useState('');
  
  const refundBalance = useBalance(localProvider, refundAddress);

  const addNewEvent = useCallback((...listenerArgs) => {
    if (listenerArgs != null && listenerArgs.length > 0) {
      const newEvent = listenerArgs[listenerArgs.length - 1];
      if (newEvent.event != null && newEvent.logIndex != null && newEvent.transactionHash != null) {
        console.log("NEW EVENT: ", newEvent);
        notification.info({
          message: newEvent.event,
          description: "amount: " + newEvent.args.amount + ", sender: " + newEvent.args.fromAddress,
          placement: "bottomRight",
        });
      }
    }
  }, []);

  useEffect(() => {
    if (refundInstance) {
      //setWait(true);
      const init = async () => {
        try {
          const isApprover = await refundInstance.connect(signer).isApprover();
          const isMember = await refundInstance.connect(signer).isMember();
          const numOfRequests = await refundInstance.numOfRequests();
          if (!isApprover && !isMember) {
            setShowError("You are not part of this organization!");
          } else {
            setIsApprover(isApprover);
            setIsMember(isMember);
            setNumOfRequests(numOfRequests.toString());
          }
        } catch (error) {
          console.log(error);
        }
      }
      init();
      setWait(false);
      try {
        refundInstance.on("BalanceIncreased", addNewEvent);
        console.log("SUBSCRIBED");
          return () => {
            refundInstance.off("BalanceIncreased", addNewEvent);
          };
      }
      catch (e) {
        console.log(e);
      }
    }
  },[refundInstance]);

  const createNewRefund = useCallback((showDeployForm) => {
    setShowDeployForm(showDeployForm);
  }, []);

  useEffect(() => {
    console.log("1:RefundName ", refundName);
    if (refundName && registryContract) {
      initializeRefundContract();
    }
    
  }, [refundName]);

  const initializeRefundContract = async (retry = false) => {
    //console.log("NAME: ", name);
    console.log("2:RefundName ", refundName);
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
    console.log("0:RefundName ", refundName);
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
  if (refundAddress) {
    refundInfo = (
      <div>
        <h2>{refundName}</h2>
        <Address value={refundAddress} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
        <Balance value={refundBalance} price={price} />
        <Divider/>
        <div style={{padding:8}}>
          <b>You are {isApprover ? "Approver" : isMember ? "Member" : ""}</b>
          <br />
          <b>Number of requests: {numOfRequests}</b>
        </div>
        <Divider/>
        <h3>Send funds to this organization:</h3>
        <div style={{ padding: 4 }}>
          <EtherInput
            autofocus
            price={price}
            placeholder="Enter Tx Value"
            value={value}
            onChange={v => {setValue(v);}}
          />
        </div>
        <Button
            style={{ marginTop: 8 }}
            loading={sendingFunds}
            type={"primary"}
            onClick={async () => {
              const tx = Transactor(signer);
              let amount;
              try {
                amount = ethers.utils.parseEther("" + value);
              } catch (e) {
                // failed to parseEther, try something else
                amount = ethers.utils.parseEther("" + parseFloat(value).toFixed(8));
              }
              tx({to: refundAddress, value: amount });
            }}
          >
          <SendOutlined /> Send funds
        </Button>
      </div>
    )
  } else if (!showDeployForm) {
    refundInfo = (
      <div style={{padding:32}}>
        <Button onClick={() => createNewRefund(true)} type={"primary"} >
          CREATE A NEW REFUND ORG
        </Button>
        <Divider/>
        <div> or enter existing organization name: </div>
        <Input.Group compact>
          <Input placeholder="Organization name" 
            style={{ width: 'calc(100% - 100px)' }}
            onChange={async (e) => {
              setShowError('');
              checkNameAvailability(e.target.value)
              setName(e.target.value)
            }}
          />
          <Button type="primary" onClick={() => {
            setRefundName();
            setRefundName(name);
          }}
          >Enter
          </Button>
        </Input.Group>
        <div>
          {showError !== '' && <label style={{color: 'crimson'}}>{showError}</label>}
        </div>
      </div>
    )
  } else {
    refundInfo = "";
  }

  let deployForm
  if(!showDeployForm){
    deployForm = ""
  } else {
    deployForm = (
      <>
        <h3>Create a new Refund Organization</h3>

        <div style={{ margin: 8}}>
          <div style={{ padding: 4 }}>
            <Input placeholder="Organization name"
              onChange={async (e) => {
                checkNameAvailability(e.target.value)
                setName(e.target.value)
              }}
            />
            {nameAlreadyExists && <label>Name already in use</label>}
          </div>
          <Divider />
          <div style={{ padding: 4 }}>
            Approvers
            <EditableTagGroup key="approvers" setAddresses={setApprovers}/>
          </div>
          <Divider />
          <div style={{ padding: 4 }}>
            Members
            <EditableTagGroup key="members" setAddresses={setMembers}/>
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

        </div>
      </>
    )
  }

  return (
    <div>
      {wait ? <Spin/> : (<>
      {!signer && <Redirect to="/"/>}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        {refundAddress || showDeployForm?<div style={{float:"right", padding:4, cursor:"pointer", fontSize:28}} onClick={()=>{
          setRefundAddress("")
          setTransactions([])
          setRefundInstance()
          setNameAlreadyExists(false)
          setShowDeployForm(false)
          setRefundName("")
        }}>
          x
        </div>:""}
        <div style={{padding:4}}>
          {refundInfo}
        </div>

        {deployForm}

      </div>
      <Divider />
      </>)}
    </div>
  );
}
