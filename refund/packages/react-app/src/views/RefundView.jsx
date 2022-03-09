import { Button, Card, DatePicker, Divider, Input, List, Progress, Slider, Spin, Switch, notification } from "antd";
import { useContractExistsAtAddress, useContractLoader } from "eth-hooks";
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Address, Balance, EtherInput, AddressInput } from "../components";
import { usePoller, useLocalStorage, useSafeSdk } from "../hooks";
import { useBalance } from "eth-hooks";
import { EditableTagGroup } from "../components/EditableTagGroup";
import refundAbi from "../contracts/refund.json";

//import { EthSignSignature } from './EthSignSignature'

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
  refundInstance
}) {
  const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
  const REGISTRY = "Registry";
  const REFUND_FACTORY = "RefundFactory";
  const [to, setTo] = useState('')
  const [threshold, setThreshold] = useState(0)
  const [owners, setOwners] = useState([])
  const [admins, setAdmins] = useState([])
  const [members, setMembers] = useState([])
  const [name, setName] = useState('')
  const [transactions, setTransactions] = useState([])
  const [value, setValue] = useState(0)
  const [selector, setSelector] = useState('')
  const [params, setParams] = useState([])
  const [data, setData] = useState('0x00')
  const [nameAlreadyExists, setNameAlreadyExists] = useState(false);
  const [organizationFound, setOrganizationFound] = useState(true);

  const contracts = useContractLoader(provider, contractConfig, chainId);
  //console.log("RefundViewContracts", contracts);
  const registryContract = contracts[REGISTRY];
  //console.log("RefundViewRegistry", registryContract);
  const refundFactoryContract = contracts[REFUND_FACTORY];
  const registryContractIsDeployed =
    useContractExistsAtAddress(provider, registryContract ? registryContract.address : "");
  // const RefundFaactoryContractIsDeployed =
  //   useContractExistsAtAddress(provider, refundFactoryContract.address);



  const [refundAddress, setRefundAddress] = useLocalStorage("deployedRefund")
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [deploying, setDeploying] = useState()
  const [showRefundInfo, setShowRefundInfo] = useState();

  const refundBalance = useBalance(localProvider, refundAddress);
  //const { safeSdk, safeFactory } = useSafeSdk(userSigner, refundAddress)

  const isSafeOwnerConnected = owners.includes(address)

  const createNewRefund = useCallback((showDeployForm) => {
    setShowDeployForm(showDeployForm);
  }, []);

  // useEffect(()=>{
  //   const ret = useContractExistsAtAddress(
  //     provider, refundInstance ? refundInstance.address : "");
  //   setShowRefundInfo(ret);
  // }, [refundInstance]);

  const initializeRefundContract = async () => {
    const addr = await registryContract.refundOrgs(name);
    if (addr === NULL_ADDRESS) {
      setOrganizationFound(false);
      console.error("Refund contract doesn't exist: ", name);
      return;
    }
    const refundInstance = new ethers.Contract(addr, refundAbi, localProvider);
    const isApprover = await refundInstance.connect(signer).isApprover();
    const isMember = await refundInstance.connect(signer).isMember();
    console.log("You are admin: ", isApprover);
    console.log("You are member: ", isMember);
    setRefundInstance(refundInstance);
    setOrganizationFound(true);
    setRefundAddress(addr);
  };

  const deployRefund = useCallback(async (name, admins, members) => {
    if (!refundFactoryContract) return
    setDeploying(true)
    let refund
    try {
      refund = await refundFactoryContract.connect(signer)
        .newRefundOrg(name, admins, members);
    } catch (error) {
      console.error(error)
      setDeploying(false)
      return
    }
    console.log("New refund created: ", refund);
    setDeploying(false)
    //const newRefundAddress = ethers.utils.getAddress(refund)
    
    //setRefundAddress(newRefundAddress)
  }, [refundFactoryContract])

  const checkNameAvailability = async (newName) => {
    if (registryContract) {
      let nameOk;
      try {
        nameOk = await registryContract.refundOrgs(newName);
        console.log("nameOK", nameOk);
        if (nameOk === NULL_ADDRESS) {
          setNameAlreadyExists(false);
          //console.log("name ok");
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
  // const proposeSafeTransaction = useCallback(async (transaction) => {
  //   if (!safeSdk || !serviceClient) return
  //   let safeTransaction
  //   try {
  //     safeTransaction = await safeSdk.createTransaction(transaction)
  //   } catch (error) {
  //     console.error(error)
  //     return
  //   }
  //   console.log('SAFE TX', safeTransaction)
  //   const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
  //   console.log('HASH', safeTxHash)
  //   const safeSignature = await safeSdk.signTransactionHash(safeTxHash)
  //   await serviceClient.deployForm(
  //     refundAddress,
  //     safeTransaction.data,
  //     safeTxHash,
  //     safeSignature
  //   )
  // }, [safeSdk, serviceClient, refundAddress])

  // const confirmTransaction = useCallback(async (transaction) => {
  //   if (!safeSdk || !serviceClient) return
  //   const hash = transaction.safeTxHash
  //   let signature
  //   try {
  //     signature = await safeSdk.signTransactionHash(hash)
  //   } catch (error) {
  //     console.error(error)
  //     return
  //   }
  //   await serviceClient.confirmTransaction(hash, signature.data)
  // }, [safeSdk, serviceClient])

  // const executeSafeTransaction = useCallback(async (transaction) => {
  //   if (!safeSdk) return
  //   console.log(transaction)
  //   const safeTransactionData = {
  //     to: transaction.to,
  //     value: transaction.value,
  //     data: transaction.data || '0x',
  //     operation: transaction.operation,
  //     safeTxGas: transaction.safeTxGas,
  //     baseGas: transaction.baseGas,
  //     gasPrice: Number(transaction.gasPrice),
  //     gasToken: transaction.gasToken,
  //     refundReceiver: transaction.refundReceiver,
  //     nonce: transaction.nonce
  //   }
  //   const safeTransaction = await safeSdk.createTransaction(safeTransactionData)
  //   transaction.confirmations.forEach(confirmation => {
  //     const signature = new EthSignSignature(confirmation.owner, confirmation.signature)
  //     safeTransaction.addSignature(signature)
  //   })
  //   let executeTxResponse
  //   try {
  //     executeTxResponse = await safeSdk.executeTransaction(safeTransaction)
  //   } catch(error) {
  //     console.error(error)
  //     return
  //   }
  //   const receipt = executeTxResponse.transactionResponse && (await executeTxResponse.transactionResponse.wait())
  //   console.log(receipt)
  // }, [safeSdk])

  // const isTransactionExecutable = (transaction) => transaction.confirmations.length >= threshold

  // const isTransactionSignedByAddress = (transaction) => {
  //   const confirmation = transaction.confirmations.find(confirmation => confirmation.owner === address)
  //   return !!confirmation
  // }



  // usePoller(async () => {
  //   if(refundAddress){
  //     setRefundAddress(ethers.utils.getAddress(refundAddress))
  //     try{
  //       if(safeSdk){
  //         const owners = await safeSdk.getOwners()
  //         const threshold = await safeSdk.getThreshold()
  //         setOwners(owners)
  //         setThreshold(threshold)
  //         console.log("owners",owners,"threshold",threshold)
  //       }
  //       console.log("CHECKING TRANSACTIONS....",refundAddress)
  //       const transactions = await serviceClient.getPendingTransactions(refundAddress)
  //       console.log("Pending transactions:", transactions)
  //       setTransactions(transactions.results)
  //     }catch(e){
  //       console.log("ERROR POLLING FROM SAFE:",e)
  //     }
  //   }
  // },3333);

  const [ walletConnectUrl, setWalletConnectUrl ] = useState()
  const [ connected, setConnected ] = useState()

  // useEffect(()=>{
  //   //walletConnectUrl
  // //   if(walletConnectUrl){
  //     const connector = new WalletConnect(
  //       {
  //         // Required
  //         uri: walletConnectUrl,
  //         // Required
  //         clientMeta: {
  //           description: "Gnosis Safe Starter Kit",
  //           url: "https://github.com/austintgriffith/scaffold-eth/tree/gnosis-starter-kit",
  //           icons: ["http://s3.amazonaws.com/pix.iemoji.com/images/emoji/apple/ios-12/256/owl.png"],
  //           name: "Gnosis Safe Starter Kit",
  //         },
  //       }/*,
  //       {
  //         // Optional
  //         url: "<YOUR_PUSH_SERVER_URL>",
  //         type: "fcm",
  //         token: token,
  //         peerMeta: true,
  //         language: language,
  //       }*/
  //     );

  //     // Subscribe to session requests
  //     connector.on("session_request", (error, payload) => {
  //       if (error) {
  //         throw error;
  //       }

  //       console.log("SESSION REQUEST")
  //       // Handle Session Request

  //       connector.approveSession({
  //         accounts: [                 // required
  //           refundAddress
  //         ],
  //         chainId: targetNetwork.chainId               // required
  //       })

  //       setConnected(true)


  //       /* payload:
  //       {
  //         id: 1,
  //         jsonrpc: '2.0'.
  //         method: 'session_request',
  //         params: [{
  //           peerId: '15d8b6a3-15bd-493e-9358-111e3a4e6ee4',
  //           peerMeta: {
  //             name: "WalletConnect Example",
  //             description: "Try out WalletConnect v1.0",
  //             icons: ["https://example.walletconnect.org/favicon.ico"],
  //             url: "https://example.walletconnect.org"
  //           }
  //         }]
  //       }
  //       */
  //     });

  //     // Subscribe to call requests
  //     connector.on("call_request", (error, payload) => {
  //       if (error) {
  //         throw error;
  //       }

  //       console.log("REQUEST PERMISSION TO:",payload,payload.params[0])
  //       // Handle Call Request
  //       console.log("SETTING TO",payload.params[0].to)
  //       setTo(payload.params[0].to)
  //       setData(payload.params[0].data?payload.params[0].data:"0x0000")
  //       setValue(payload.params[0].value)
  //       /* payload:
  //       {
  //         id: 1,
  //         jsonrpc: '2.0'.
  //         method: 'eth_sign',
  //         params: [
  //           "0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3",
  //           "My email is john@doe.com - 1537836206101"
  //         ]
  //       }
  //       */
  //       /*connector.approveRequest({
  //         id: payload.id,
  //         result: "0x41791102999c339c844880b23950704cc43aa840f3739e365323cda4dfa89e7a"
  //       });*/

  //     });

  //     connector.on("disconnect", (error, payload) => {
  //       if (error) {
  //         throw error;
  //       }
  //       console.log("disconnect")

  //       // Delete connector
  //     });
  //   }
  // },[ walletConnectUrl ])


  let refundInfo
  if (refundAddress) {
    refundInfo = (
      <div>
        <Address value={refundAddress} ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
        <Balance value={refundBalance} price={price} />

        <div style={{padding:8}}>
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
                checkNameAvailability(e.target.value)
                setName(e.target.value)
              }}
            />
          <Button type="primary" onClick={initializeRefundContract}>Enter</Button>
        </Input.Group>
        <div>
          {!organizationFound && <label>Organization doesn't exist</label>}
        </div>
        {/* <AddressInput ensProvider={mainnetProvider} onChange={(addr)=>{
          if(ethers.utils.isAddress(addr)){
            console.log("addr!",addr)
            setRefundAddress(ethers.utils.getAddress(addr))
          }
        }}/> */}
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
            Administrators
            <EditableTagGroup key="admins" setAddresses={setAdmins}/>
          </div>
          <Divider />
          <div style={{ padding: 4 }}>
            Members
            <EditableTagGroup key="members" setAddresses={setMembers}/>
            {/* <AddressInput placeholder="Enter To Address"
              onChange={setTo}
              ensProvider={mainnetProvider}
              value={to}
              onChange={setTo}
            /> */}
          </div>
          <Divider />
          {/* <div style={{ padding: 4 }}>
            <EtherInput
              autofocus
              price={price}
              placeholder="Enter Tx Value"
              value={value}
              
              onChange={v => {
                v = v && v.toString && v.toString()
                if(v){
                  const valueResult = ethers.utils.parseEther(""+v.replace(/\D/g, ""))
                  setValue(valueResult);
                }

              }}
              onChange={setValue}
            />
          </div> */}
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
            //onClick={() => createNewRefund(true)}
            type={"primary"}
            onClick={async () => {
              console.log("admins", admins);
              console.log("members", members);
              deployRefund(name, admins, members);
              // if (selector !== '' && params.length > 0) {
              //   const abi = [
              //     "function " + selector
              //   ];
              //   const index = selector.indexOf('(');
              //   const fragment = selector.substring(0, index)

              //   const iface = new ethers.utils.Interface(abi);
              //   for (let i = 0; i < params.length; i++) {
              //     if (iface.fragments[0].inputs[i].baseType.includes('uint') || iface.fragments[0].inputs[i].baseType.includes('int')) {
              //       params[i] = parseInt(params[i])
              //     }
              //   }
              //   const data = iface.encodeFunctionData(fragment, params);
              //   setData(data)
              // }

              // const checksumForm = ethers.utils.getAddress(to)
              // const partialTx = {
              //   to: checksumForm,
              //   data,
              //   value: ethers.utils.parseEther(value?value.toString():"0").toString()
              // }
              // // try{
              // //   await proposeSafeTransaction(partialTx)
              // // }catch(e){
              // //   console.log("🛑 Error Proposing Transaction",e)
              // //   notification.open({
              // //     message: "🛑 Error Proposing Transaction",
              // //     description: (
              // //       <>
              // //         {e.toString()} (check console)
              // //       </>
              // //     ),
              // //   });
              // //}

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
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        {refundAddress || showDeployForm?<div style={{float:"right", padding:4, cursor:"pointer", fontSize:28}} onClick={()=>{
          setRefundAddress("")
          setTransactions([])
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
      {/* <div style={{ margin: 8 }}>
        {
          transactions.length > 0 && transactions.map((transaction) => {

            let buttonDisplay = ""

            if(!owners || owners.length<=0){
              buttonDisplay = (
                <Spin/>
              )
            }else if(!isTransactionExecutable(transaction)){
              if(isSafeOwnerConnected && !isTransactionSignedByAddress(transaction)){
                buttonDisplay = (
                  <Button
                    style={{ marginTop: 8 }}
                    onClick={() => confirmTransaction(transaction)}
                  >
                  Sign TX</Button>
                )
              }else{
                buttonDisplay = "Waiting for more signatures..."
              }
            }else{
              if(isSafeOwnerConnected && isTransactionExecutable(transaction)){
                buttonDisplay = (
                  <Button
                    style={{ marginTop: 8 }}
                    onClick={() => executeSafeTransaction(transaction)}
                  >Execute TX</Button>
                )
              } else {
                buttonDisplay = "Waiting to execute..."
              }
            }


            return (
              <div style={{borderBottom:"1px solid #ddd"}}>
                {console.log("transaction",transaction)}
                <h1>#{transaction.nonce}</h1>
                <Address value={transaction.to} ensProvider={mainnetProvider} />
                <p>Data: {transaction.data}</p>
                <p>Value: {ethers.utils.formatEther(transaction.value)} ETH</p>
                <div style={{padding:32}}>
                  {buttonDisplay}
                </div>
              </div>
            )
          })
        }
      </div> */}
      <div style={{padding:64,margin:64}}><a href="https://github.com/austintgriffith/scaffold-eth/tree/gnosis-starter-kit" target="_blank">🏗</a></div>
    </div>
  );
}
