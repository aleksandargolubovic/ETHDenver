import { Alert, Input, Button, List, Image, Divider } from "antd";
import { Address, UploadPhoto } from "../components";
import { Row, Col, Table, Tag, Space } from 'antd';
import { AlignCenterOutlined, PlusSquareOutlined, PlusCircleFilled } from "@ant-design/icons";
import { Popup } from "../components"
import { NewRefundRequest } from "./index.js"
import { useState } from 'react'
import { useEffect } from "react";
import { Redirect } from "react-router-dom";
import { useCallback } from "react";


export default function Requests({
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
      width: '10%',
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
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: {
        compare: (a, b) => a.amount - b.amount
      },
      width: '15%',
      align: 'center',
    },
    {
      title: 'Receipt',
      dataIndex: 'receipt',
      key: 'receipt',
      width: '10%',
      align: 'center',
    },
    {
      title: <div>Category</div>,
      dataIndex: 'category',
      key: 'category',
      width: '15%',
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
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      width: '15%',
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
      width: '15%',
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
    reqList.forEach(req => newRequests.push(
      {
        creator_addr:
          <Address address={req.reimbursementAddress} fontSize={16} />,
        amount: req.amount.toNumber(),
        status: req.processed ? (req.approved ? "Approved" : "Denied") : "Processing",
        comment: req.description,
        key: req.id,
        url: req.url,
        date: (new Date(req.date.toNumber())).toLocaleDateString("en-US"),
        category: req.category,
        receipt:
          <Image width={25} height={25} src={req.url} />
      }
    ));
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
            size="large"
            columns={columns}
            dataSource={requests}

          />
          <Button
            onClick={async () => {
              console.log("***********Refresh*************");
              let done = isApprover ?
                await refundInstance.getRequests() :
                await refundInstance.connect(signer).getMembersRequests();
                

              console.log(done);
              if (done.length > 0) {
                console.log(done[0].amount);
                console.log("***********amount*************");
                console.log(done[0].amount.toNumber());
                console.log("***********date*************");
                console.log(done[0].date.toNumber());
                console.log("***********date1*************");
                let date1 = new Date(done[0].date.toNumber())
                console.log(date1.toLocaleDateString("en-US"));
              }
              onRequestsChange(done);
              console.log("***********Refresh*************");
            }}
          >Refresh</Button>
        </div>
      )
    }
  }

  return (
    <div style={{ width: 1000, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
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
