import { Alert, Input, Button, List, Image, Divider, Card } from "antd";
import { Address, Balance } from "../components";
import { Row, Col, Table, Tag, Space } from 'antd';
import { CheckCircleOutlined, SyncOutlined, CloseCircleOutlined } from "@ant-design/icons";
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
      title: <div style={{ paddingLeft: 5 }}>Category</div>,
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
      title: <div style={{ paddingLeft: 22 }}>Status</div>,
      dataIndex: 'display_status',
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

  function onRequestsChange(reqList) {
    const newRequests = [];

    reqList.forEach(req => {
      newRequests.push(
        {
          creator_addr:
            <Address address={req.reimbursementAddress} fontSize={16} />,
          amount: <Balance balance={req.amount} provider={localProvider} price={price} size={16} />,
          status: req.processed ? (req.approved ? "Approved" : "Denied") : "Processing",
          display_status: req.processed ?
            (req.approved ?
              <Tag icon={<CheckCircleOutlined />} color="success">Approved</Tag> :
              <Tag icon={<CloseCircleOutlined />} color="error">Denied</Tag>) :
            <Tag icon={<SyncOutlined spin />} color="processing">Processing</Tag>,
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
                    <Col span={5} offset={isApprover && record.status === "Processing" ? 0 : 4} style={{ textAlign: "center" }}>
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
                    {isApprover && record.status === "Processing" &&
                      <Col span={7} style={{ textAlign: "center" }}>
                        <Card title="Process Request" bordered={false} size="small" style={{ alignItems: "center", height: "100%" }}>
                          <div style={{ alignItems: "center", paddingTop: 14 }}>
                            <Button
                              style={{ width: "45%" }}
                              onClick={async () => {
                                try {
                                  let ret = await refundInstance.connect(signer)
                                    .processRequest(record.key, true);
                                  console.log(ret);
                                } catch (error) {
                                  console.log(error);
                                }
                              }}
                            >
                              Approve
                            </Button>
                            &nbsp; &nbsp;
                            <Button
                              style={{ width: "45%" }}
                              onClick={async () => {
                                try {
                                  let ret = await refundInstance.connect(signer)
                                    .processRequest(record.key, false);
                                  console.log(ret);
                                } catch (error) {
                                  console.log(error);
                                }
                              }}
                            >
                              Deny
                            </Button>
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
