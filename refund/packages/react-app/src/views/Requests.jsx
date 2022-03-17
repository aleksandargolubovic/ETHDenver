import { Alert, Input, Button, List, Image, Divider, Card } from "antd";
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
  const APPROVED = "Approved";
  const DENIED = "Denied";
  const PROCESSING = "Processing";
  const [buttonPopup, setButtonPopup] = useState(false);
  const [requests, setRequests] = useState([]);
  const [approveButtonLoading, setApproveButtonLoading] = useState(false);
  const [denyButtonLoading, setDenyButtonLoading] = useState(false);

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
          text: 'Equipment',
          value: 'Equipment',
        },
        {
          text: 'Home Office',
          value: 'Home Office',
        },
        {
          text: 'Meals and Entertainment',
          value: 'Meals and Entertainment',
        },
        {
          text: 'Office Supplies',
          value: 'Office Supplies',
        },
        {
          text: 'Other',
          value: 'Other',
        },
        {
          text: 'Travel',
          value: 'Travel',
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
          text: PROCESSING,
          value: PROCESSING,
        },
        {
          text: APPROVED,
          value: APPROVED,
        },
        {
          text: DENIED,
          value: DENIED,
        },
      ],
      onFilter: (value, record) => record.status.indexOf(value) === 0,
      ellipsis: true,
    },
  ];

  function onRequestsChange(reqList) {
    const newRequests = [];

    reqList.forEach(req => {
      newRequests.push(
        {
          creator_addr:
            <Address address={req.reimbursementAddress} fontSize={16} />,
          amount: <Balance balance={req.amount} provider={localProvider} price={price} size={16} />,
          status: req.processed ? (req.approved ? APPROVED : DENIED) : PROCESSING,
          comment: req.description,
          key: req.id,
          url: req.url,
          date: (new Date(req.date.toNumber())).toLocaleDateString("en-US"),
          category: req.category,
          receipt:
            <Image width={25} height={25} src={req.url} />,
        }
      )
    });
    setRequests(newRequests);
  }

  const getReqs = async (retry = false) => {
    if (refundInstance) {
      const ret = isApprover ?
        await refundInstance.getRequests() :
        await refundInstance.connect(signer).getMembersRequests();
      console.log(ret);
      onRequestsChange(ret);

      if (retry && (ret.length === requests.length || requests.length === 0)) {
        console.log("Retry again");
        setTimeout(() => {
          getReqs(true);
        }, 50);
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
        console.log("New REQ subscribed")
        return () => {
          refundInstance.off(EVENT_NAME, addNewEvent);
          console.log("New REQ subscribed off")
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
                    <Col span={6} offset={isApprover && record.status === PROCESSING ? 0 : 3} style={{ textAlign: "center" }}>
                      <Card title="Receipt" bordered={false} size="small">
                        <Image
                          width={50}
                          height={50}
                          src={record.url}
                        />
                      </Card>
                    </Col>
                    <Col span={12} style={{ textAlign: "center" }}>
                      <Card title="Description" bordered={false} size="small">
                        <div style={{ textAlign: "left", border: "0.5px solid #666666", borderRadius: 6, padding: 16, margin: "auto" }}>{record.comment}</div>
                      </Card>
                    </Col>
                    {isApprover && record.status === PROCESSING &&
                      <Col span={6} style={{ textAlign: "center" }}>
                        <Card title="Process Request" bordered={false} size="small" style={{ alignItems: "center", height:"100%" }}> 
                          <div style={{ alignItems: "center" }}>
                            <Button
                              loading={approveButtonLoading}
                              onClick={async () => {
                                try {
                                  setApproveButtonLoading(true);
                                  let ret = await refundInstance.connect(signer)
                                    .processRequest(record.key, true);
                                  console.log(ret);
                                  record.status = APPROVED;
                                } catch (error) {
                                  console.log(error);
                                }
                                setApproveButtonLoading(false);
                              }}
                            >Approve</Button>
                            &nbsp; &nbsp;
                            <Button
                              loading={denyButtonLoading}
                              onClick={async () => {
                                setDenyButtonLoading(true);
                                try {
                                  let ret = await refundInstance.connect(signer)
                                    .processRequest(record.key, false);
                                  console.log(ret);
                                  record.status = DENIED;
                                } catch (error) {
                                  console.log(error);
                                }
                                setDenyButtonLoading(false);
                              }}
                            >Deny</Button>
                          </div>
                        </Card>
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
