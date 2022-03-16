import { Select, Row, Col, Button, Card, DatePicker, Divider, Input, Progress, Slider, Spin, Switch } from "antd";
import React, { useState, useEffect } from "react";
import { utils } from "ethers";
import { SyncOutlined, CloseSquareOutlined, CloseOutlined } from "@ant-design/icons";

import { Address, Balance, Events, UploadPhoto, EtherInput } from "../components";
import { addToIPFS, getFromIPFS, urlFromCID } from "../helpers/ipfs";

const { TextArea } = Input;
const { Option } = Select;

const Tesseract = require('tesseract.js');

export default function NewRefundRequest({
  purpose,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
  trigger,
  signer,
  refundInstance,
}) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [receiptImages, setReceiptImages] = useState([]);
  const [refundAmount, setRefundAmount] = useState("0");
  const [recognitionState, setRecognitionState] = useState("idle");

  function previewRefundAmount() {
    console.log(recognitionState);
    if (recognitionState.match("inProgress")) return (
      <div style={{ marginTop: 32 }}>
        <Spin />
      </div>)
    else {
      return (
        <div>
          <EtherInput
            autofocus
            price={price}
            placeholder="Refund amount"
            value={refundAmount}
            onChange={v => {console.log("value**************************"); console.log(refundAmount*10e18);console.log(refundAmount);setRefundAmount(v);}}
          />
        </div>)
    }
  }

  useEffect(async () => {
    console.log("***************receiptImages************************");
    console.log(receiptImages);
    if (receiptImages.length < 1) return;
    const newImageUrls = [];
    console.log(receiptImages.at(0).url);
    let src = receiptImages.at(0).url;
    if (!src) {
      src = await new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(receiptImages.at(0).originFileObj);
        reader.onload = () => resolve(reader.result);
      });
    }


    setRecognitionState("inProgress");

    Tesseract.recognize(
      src,
      'eng',
      { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
      console.log(text);
      let totalPosition = text.indexOf("Total") + 6;
      let amount = text.substring(totalPosition, text.indexOf("\n", totalPosition));
      console.log(amount);
      const ethValue = amount / price;
      setRefundAmount(ethValue);
      setRecognitionState("idle");
    })

  }, [receiptImages]);

  return (
    <div>
      <div style={{ padding: 16, paddingTop: 2, border: "1px solid #cccccc", width: 400, margin: "auto" }}>

        <Row style={{ paddingTop: 0, width: 372, margin: "auto" }}>
          <Col span={23}>
          </Col>
          <Col span={1}>
            <Button
              icon={<CloseOutlined />}
              size="small"
              type="text"
              onClick={async () => { trigger(false) }}
            />
          </Col>
        </Row>
        <h2>Add new reimbursement request</h2>
        <Divider />
        <div style={{ margin: 8 }}>
          <h4>Upload receipt</h4>
          <UploadPhoto
            fileList={receiptImages}
            setFileList={setReceiptImages}
          />
          <Divider />
          <h4>Refund amount</h4>
          {previewRefundAmount()}
          <Divider />
          <h4>Category</h4>
          <Select
            placeholder={"Category"}
            style={{ width: 348, textAlign:"left"}}
            onChange={e => {
              setCategory(e);
            }}>
            <Option value="Equipment">Equipment</Option>
            <Option value="Home Office">Home Office</Option>
            <Option value="Meals and Entertainment">Meals and Entertainment</Option>
            <Option value="Office Supplies">Office Supplies</Option>
            <Option value="Other">Other</Option>
            <Option value="Travel">Travel</Option>
          </Select>

          <Divider />
          <h4>Description</h4>
          <TextArea
            autoSize={{ minRows: 2, maxRows: 3 }}
            onChange={e => {
              setDescription(e.target.value);
            }}
            placeholder={"Description"}
          />
          <Divider />
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              addToIPFS(receiptImages.at(0).originFileObj).then(async (result) => {
                console.log(result.path);
                let url = urlFromCID(result.cid);
                console.log(url);
                console.log("*********************isapprover******************");
                const isApprover = await refundInstance.connect(signer).isApprover();
                console.log(isApprover);
                console.log("*********************description******************");
                console.log(description);
                console.log("*********************url******************");
                console.log(url);
                console.log("*********************address******************");
                console.log(address);
                console.log("*********************signer******************");
                console.log(signer);
                console.log("*********************refundAmount******************");
                console.log(refundAmount*10e18);
                let date = (new Date()).getTime();
                console.log("*********************date******************");
                console.log(date);
                console.log("*********************category******************");
                console.log(category);
                try {
                  let done = await refundInstance.connect(signer).createRequest(
                    description,
                    url,
                    address,
                    refundAmount*10e18,
                    date,
                    category
                  );
                }
                catch (error) {
                  console.error(error);
                }
                trigger(false);

              }, function (err) {
                console.log(err);
              });
            }}
          >
            Send Request!
          </Button>
        </div>
      </div>
    </div>
  );
}
