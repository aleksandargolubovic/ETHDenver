import { Alert, Input, Button, List, Image, Divider } from "antd";
import { useEventListener } from "eth-hooks/events/useEventListener";
import { Address, UploadPhoto } from "../components";
import { Row, Col, Table, Tag, Space } from 'antd';
import { AlignCenterOutlined, PlusSquareOutlined, PlusCircleFilled } from "@ant-design/icons";
import { Popup } from "../components"
import { NewRefundRequest } from "./index.js"
import { useState } from 'react'
import { useEffect } from "react";
import { Redirect } from "react-router-dom";


/**
  ~ What it does? ~

  Displays a lists of events

  ~ How can I use? ~

  <Events
    contracts={readContracts}
    contractName="YourContract"
    eventName="SetPurpose"
    localProvider={localProvider}
    mainnetProvider={mainnetProvider}
    startBlock={1}
  />
**/




export default function Requests({
  address,
  signer,
  refundInstance,
  isApprover,
}) {
  // 📟 Listen for broadcast events
  //const events = useEventListener(contracts, contractName, eventName, localProvider, startBlock);

  const [buttonPopup, setButtonPopup] = useState(false);
  const [requests, setRequests] = useState([]);

  const columns = [
    {
      title: 'Creator address',
      dataIndex: 'creator_addr',
      key: 'creator_addr',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  function onRequestsChange(reqList) {
    const newRequests = [];
    reqList.forEach(req => newRequests.push(
      {
        creator_addr:
          <Address address={req.reimbursementAddress} fontSize={16} />,
        value: req.amount,
        status: req.processed ? (req.approved ? "Approved" : "Denied") : "In process",
        description: req.description,
        key: req.id,
        url: req.url
      }
    ));
    setRequests(newRequests);
  }

  useEffect(() => {
    async function getReqs() {
      if (refundInstance) {
        const ret = isApprover ? 
          await refundInstance.connect(signer).getMembersRequests() :
          await refundInstance.getRequests();

        console.log(ret);
        onRequestsChange(ret);
      }
    }
    getReqs();
  }, [refundInstance]);

  /*const requests = [
    {
      creator_addr:
        <Address address='0x823dCC4546070A46D66Af5e02747e74C69f3d509' fontSize={16} />,
      value: '$24.00',
      status: 'In progress',
      description: "Jedan dva tri",
      key: 1
    },
    {
      creator_addr:
        <Address address='0x80ddCC6446070A46D66Af5e02747e71569f3d509' fontSize={16} />,
      value: '$35.00',
      status: 'Approved',
      description: "nikola",
      key: 2
    },
  ];*/

  /*<List
          bordered
          dataSource={requests}
          grid={{ gutter: 16, column: 4 }}
          renderItem={item => {
            return (
              <List.Item key={item.creator_addr + "_" + item.value + "_" + item.status}>
                <Address address={item.creator_addr} fontSize={16} />
                {item.value}
                {item.status}
              </List.Item>
            );
          }}
        /> 
        
        
        <Alert style={{ margin: '16px 0' }} message={record.description} />
        <Input readonly placeholder={record.description}></Input>
        */



  function previewContent() {
    if (buttonPopup) return (
      <NewRefundRequest
        address={address}
        refundInstance={refundInstance}
        signer={signer}
        trigger={setButtonPopup}
      />
    )
    else {
      return (
        <div>
          {!signer && <Redirect to="/"/>}
          <Table
            columns={columns}
            dataSource={requests}
            expandable={{
              expandedRowRender: record => (
                <div style={{ margin: 0 }}>
                  <Row gutter={[8, 8]}>
                    <Col span={10} style={{ textAlign: "center" }}>
                      Receipt<br />
                      <Image
                        width={120}
                        src={record.url}
                      />
                    </Col>
                    <Col span={14} style={{ textAlign: "center" }}>
                      <Row style={{ height: "50%" }}>
                        <Col span={24} style={{ textAlign: "center" }}>
                          Additional comment
                          <div style={{ textAlign: "left", border: "0.5px solid #666666", borderRadius: 6, padding: 16, margin: "auto" }}>{record.description}</div>
                        </Col>
                      </Row>
                      {isApprover && <Row style={{ height: "50%", display: "flex" }}>
                        <Col span={16} offset={8} style={{ textAlign: "center", alignSelf: "flex-end" }}>
                          {record.status === "In process" && (
                          <>
                          <Button
                            onClick={async () => {
                              try {
                                let ret = await refundInstance.connect(signer)
                                  .processRequest(record.key, true);
                                console.log(ret);
                              } catch (error) {
                                console.log(error);
                              }
                            }}
                          >Approve</Button>
                          &nbsp; &nbsp;
                          <Button
                            onClick={async () => {
                              try {
                                let ret = await refundInstance.connect(signer)
                                  .processRequest(record.key, false);
                                console.log(ret);
                              } catch (error) {
                                console.log(error);
                              }
                            }}
                          >Deny</Button>
                          </>)}

                        </Col>
                      </Row>}
                    </Col>
                  </Row>
                </div>
              ),
            }}
          />
          <Button
            onClick={async () => {
              console.log("***********Refresh*************");
              let done = isApprover ? 
                await refundInstance.connect(signer).getMembersRequests() :
                await refundInstance.getRequests();

              console.log(done);
              onRequestsChange(done);
              console.log("***********Refresh*************");
            }}
          >Refresh</Button>
        </div>
      )
    }
  }

  return (
    <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
      <h2>
        Requests &nbsp;
        <Button
          icon='+'
          onClick={() => setButtonPopup(!buttonPopup)}
        />
      </h2>
      {previewContent()}
    </div>
  );
}
