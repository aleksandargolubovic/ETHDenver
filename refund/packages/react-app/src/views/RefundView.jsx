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
  //userSigner,
  address,
  mainnetProvider,
  localProvider,
  price,
  blockExplorer,
  //targetNetwork,
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
  const [owners, setOwners] = useState([])
  const [approvers, setApprovers] = useState([])
  const [members, setMembers] = useState([])
  const [name, setName] = useState('')
  const [value, setValue] = useState();
  const [transactions, setTransactions] = useState([])
  const [nameAlreadyExists, setNameAlreadyExists] = useState(false);
  const [showError, setShowError] = useState('');

  const contracts = useContractLoader(provider, contractConfig, chainId);
  const registryContract = contracts[REGISTRY];
  const refundFactoryContract = contracts[REFUND_FACTORY];
  const registryContractIsDeployed =
    useContractExistsAtAddress(provider, registryContract ? registryContract.address : "");
  // const RefundFaactoryContractIsDeployed =
  //   useContractExistsAtAddress(provider, refundFactoryContract.address);

  const [refundAddress, setRefundAddress] = useLocalStorage("deployedRefund")
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [deploying, setDeploying] = useState()
  const [sendingFunds, setSendingFunds] = useState()
  const [showRefundInfo, setShowRefundInfo] = useState();
  //const [isApprover, setIsApprover] = useLocalStorage(false);
  //const [isMember, setIsMember] = useState(false);
  const [numOfRequests, setNumOfRequests] = useState('');
  
  const refundBalance = useBalance(localProvider, refundAddress);

  const createNewRefund = useCallback((showDeployForm) => {
    setShowDeployForm(showDeployForm);
  }, []);

  // useEffect(()=>{
  //   const ret = useContractExistsAtAddress(
  //     provider, refundInstance ? refundInstance.address : "");
  //   setShowRefundInfo(ret);
  // }, [refundInstance]);

  console.log("SIGNERRRRRR: ", signer);

  const initializeRefundContract = async () => {
    const addr = await registryContract.refundOrgs(name);
    if (addr === NULL_ADDRESS) {
      setShowError("Organization doesn't exist");
      console.error("Refund contract doesn't exist: ", name);
      return;
    }
    const refundInstance = new ethers.Contract(addr, refundAbi, localProvider);
    const isApprover = await refundInstance.connect(signer).isApprover();
    const isMember = await refundInstance.connect(signer).isMember();
    const numOfRequests = await refundInstance.numOfRequests();
    //console.log(numOfRequests.toString());
    console.log("You are admin: ", isApprover);
    console.log("You are member: ", isMember);
    if (!isApprover && !isMember) {
      setShowError("You are not part of this organization!");
    } else {
      setIsApprover(isApprover);
      setIsMember(isMember);
      setRefundInstance(refundInstance);
      setRefundAddress(addr);
      setNumOfRequests(numOfRequests.toString());
    }
  };

  const deployRefund = useCallback(async (name, approvers, members) => {
    if (!refundFactoryContract) return
    setDeploying(true)
    let refund
    try {
      console.log("SIgner: ", signer);

      refund = await refundFactoryContract.connect(signer)
        .newRefundOrg(name, approvers, members);
    } catch (error) {
      console.error(error)
      setDeploying(false)
      return
    }
    console.log("New refund created: ", refund);
    setDeploying(false);
  }, [refundFactoryContract])

  const checkNameAvailability = async (newName) => {
    if (registryContract) {
      let nameOk;
      try {
        nameOk = await registryContract.refundOrgs(newName);
        console.log("nameOK", nameOk);
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
        <h2>{name}</h2>
        <Address value={refundAddress} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
        <Balance value={refundBalance} price={price} />
        <Divider/>
        <div style={{padding:8}}>
          <b>You are {isApprover ? "Approver" : isMember ? "Member" : ""}</b>
          <br />
          <b>Number of requests: {numOfRequests}</b>

        {owners&&owners.length>0?(
          <>
            <b>Signers:</b>
            <List
              bordered
              dataSource={owners}
              renderItem={item => {
                return (
                  <List.Item key={item + "_ownerEntry"}>
                    <Address address={item} ensProvider={mainnetProvider} fontSize={12} />
                  </List.Item>
                );
              }}
            />
          </>
        ):<Spin/>}

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
              console.log("Amount:", value);
              let amount;
              try {
                amount = ethers.utils.parseEther("" + value);
              } catch (e) {
                // failed to parseEther, try something else
                amount = ethers.utils.parseEther("" + parseFloat(value).toFixed(8));
              }
              console.log("Amount2:", amount);
              tx({
                to: refundAddress,
                value: amount,
              });
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
          CREATE NEW REFUND ORG
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
          <Button type="primary" onClick={initializeRefundContract}>Enter</Button>
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
        <h3>Create new Refund Org</h3>

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
         
          {/* <div style={{ padding: 4 }}>
            <Input placeholder="Enter Selector i.e add(uint, uint)"
              onChange={async (e) => {
                setSelector(e.target.value)
              }}
            />
          </div> */}
          {/* <div style={{ padding: 4 }}>
            <Input placeholder="Enter arguments separated by ,"
              onChange={async (e) => {
                setParams(e.target.value.split(','))
              }}
            />
          </div> */}
          {/* {data?data:""} */}
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
      {!signer && <Redirect to="/"/>}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        {refundAddress || showDeployForm?<div style={{float:"right", padding:4, cursor:"pointer", fontSize:28}} onClick={()=>{
          setRefundAddress("")
          setTransactions([])
          setRefundInstance()
          setNameAlreadyExists(false)
          setShowDeployForm(false)
        }}>
          x
        </div>:""}

        

        <div style={{padding:4}}>
          {refundInfo}
        </div>

        {deployForm}

      </div>
      <Divider />
    </div>
  );
}
