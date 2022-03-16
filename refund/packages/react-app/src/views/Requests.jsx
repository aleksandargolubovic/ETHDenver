import { Alert, Input, Button, List, Image, Divider } from "antd";
import { Address, UploadPhoto, Balance } from "../components";
import { Row, Col, Table, Tag, Space } from 'antd';
import { AlignCenterOutlined, PlusSquareOutlined, PlusCircleFilled } from "@ant-design/icons";
import { Popup } from "../components"
import { NewRefundRequest } from "./index.js"
import { useState } from 'react'
import { useEffect } from "react";
import { Redirect } from "react-router-dom";
import { useCallback } from "react";
import { utils, BigNumber } from "ethers";


export default function Requests({
  localProvider,
  price,
  address,
  signer,
  refundInstance,
  isApprover,
}) {

  const EVENT_NAME = "NewRequestCreated";
  const [buttonPopup, setButtonPopup] = useState(false);
  const [requests, setRequests] = useState([]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: {
        compare: (a, b) => a.date - b.date
      },
      width: '15%',
      align: 'center',
    },
    {
      title: 'Creator address',
      dataIndex: 'creator_addr',
      key: 'creator_addr',
      sorter: {
        compare: (a, b) => a.creator_addr - b.creator_addr
      },
      ellipsis: true,
      align: 'center',
      width: '25%',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: {
        compare: (a, b) => a.amount - b.amount
      },
      width: '20%',
      align: 'center',
    },
    {
      title: <div>Category</div>,
      dataIndex: 'category',
      key: 'category',
      filters: [
        {
          text: 'Processing',
          value: 'Processing',
        },
        {
          text: 'Approved',
          value: 'Approved',
        },
        {
          text: 'Denied',
          value: 'Denied',
        },
      ],
      onFilter: (value, record) => record.status.indexOf(value) === 0,
      sorter: {
        compare: (a, b) => a.category - b.category
      },
      align: 'center',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: {
        compare: (a, b) => a.status - b.status
      },
      align: 'center',
      filters: [
        {
          text: 'Processing',
          value: 'Processing',
        },
        {
          text: 'Approved',
          value: 'Approved',
        },
        {
          text: 'Denied',
          value: 'Denied',
        },
      ],
      onFilter: (value, record) => record.status.indexOf(value) === 0,
      ellipsis: true,
    },
  ];


  const inner_columns = [
    {
      title: 'Receipt',
      dataIndex: 'receipt',
      key: 'receipt',
      align: 'center',
      width: '33%'
    },
    {
      title: 'Description',
      dataIndex: 'comment',
      key: 'comment',
      align: 'center',
      width: '33%'
    },
    {
      title: 'Status change',
      dataIndex: 'status_change',
      key: 'status_change',
      align: 'center',
      width: '33%',
      hidden: true
    },

  ].filter(item => !item.hidden);

  function onRequestsChange(reqList) {
    const newRequests = [];
    
    reqList.forEach(req => {
      newRequests.push(
      {
        creator_addr:
          <Address address={req.reimbursementAddress} fontSize={16} />,
        amount: <Balance balance={utils.parseEther(req.amount.toString())} provider={localProvider} price={price} size={16}/>,
        status: req.processed ? (req.approved ? "Approved" : "Denied") : "Processing",
        comment: req.description,
        key: req.id,
        url: req.url,
        date: (new Date(req.date.toNumber())).toLocaleDateString("en-US"),
        category: req.category,
        receipt:
          <Image width={25} height={25} src={req.url} />,
        status_change:
          <>
            <Button
              onClick={async () => {
                try {
                  let ret = await refundInstance.connect(signer)
                    .processRequest(req.id, true);
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
                    .processRequest(req.id, false);
                  console.log(ret);
                } catch (error) {
                  console.log(error);
                }
              }}
            >Deny</Button>
          </>
      }
    )
    });
    setRequests(newRequests);
    inner_columns.filter(item => !item.hidden);
  }

  const getReqs = async (retry = false) => {
    if (refundInstance) {
      const ret = isApprover ?
        await refundInstance.getRequests() :
        await refundInstance.connect(signer).getMembersRequests();

      console.log(ret);
      onRequestsChange(ret);

      if (retry && ret.length === requests.length) {
        setTimeout(() => {
          getReqs();
        }, 10);
      }
    }
  }

  const addNewEvent = useCallback((...listenerArgs) => {
    if (listenerArgs != null && listenerArgs.length > 0) {
      const newEvent = listenerArgs[listenerArgs.length - 1];
      if (newEvent.event != null && newEvent.logIndex != null && newEvent.transactionHash != null) {
        getReqs(true);
      }
    }
  }, []);

  useEffect(() => {
    getReqs();

    if (refundInstance) {
      try {
        refundInstance.on(EVENT_NAME, addNewEvent);
        return () => {
          refundInstance.off(EVENT_NAME, addNewEvent);
        };
      }
      catch (e) {
        console.log(e);
      }
    }
  }, [refundInstance]);

  function previewContent() {
    if (buttonPopup) return (
      <NewRefundRequest
        price={price}
        address={address}
        refundInstance={refundInstance}
        signer={signer}
        trigger={setButtonPopup}
      />
    )
    else {
      return (
        <div>
          {!signer && <Redirect to="/" />}
          <Table
            size="midle"
            columns={columns}
            dataSource={requests}
            expandable={{
              expandedRowRender: record => (
                <div style={{ margin: 0 }}>
                  <Row gutter={[8, 8]}>
                    <Col span={8} offset={isApprover && record.status === "Processing" ? 0 : 3} style={{ textAlign: "center" }}>
                      <b>Receipt</b> <br/>
                      <Image
                        width={50}
                        height={50}
                        src={record.url}
                      />
                    </Col>
                    <Col span={8} style={{ textAlign: "center" }}>
                      <b>Description</b>
                      <br/>
                      <div style={{ textAlign: "left", border: "0.5px solid #666666", borderRadius: 6, padding: 16, margin: "auto" }}>{record.comment}</div>
                    </Col>
                    {isApprover && record.status === "Processing" &&
                      <Col span={8} style={{ textAlign: "center" }}>
                        <b>Process Request</b><br/>
                        <div style={{ alignSelf: "center" }}>
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
                        </div>
                      </Col>
                    }
                  </Row>
                </div>
              ),
            }}

          />
          <Button
            onClick={async () => {
              console.log("***********Refresh*************");
              let done = isApprover ?
                await refundInstance.getRequests() :
                await refundInstance.connect(signer).getMembersRequests();
              console.log(done);
              if (done.length > 0) {
                let date1 = new Date(done[0].date.toNumber())
                console.log(date1.toLocaleDateString("en-US"));
              }
              onRequestsChange(done);
            }}
          >Refresh</Button>
        </div>
      )
    }
  }

  return (
    <div style={{ width: 800, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
      <h2>
        {isApprover ? "" : "My"} Requests &nbsp;
        {!buttonPopup && <Button
          icon='+'
          onClick={() => setButtonPopup(!buttonPopup)}
        />}
      </h2>
      {previewContent()}
    </div>
  );
}
