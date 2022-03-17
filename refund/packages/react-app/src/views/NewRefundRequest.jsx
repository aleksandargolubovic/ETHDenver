import { Select, Row, Col, Button, Divider, Input, Spin } from "antd";
import React, { useCallback, useState, useEffect } from "react";
import { ethers, utils } from "ethers";
import { CloseOutlined } from "@ant-design/icons";

import { UploadPhoto, RefundAmountInput } from "../components";
import { addToIPFS, retrieveFile } from "../helpers/web3Storage";
//import { addToIPFS, getFromIPFS, urlFromCID } from "../helpers/ipfs";

const { TextArea } = Input;
const { Option } = Select;

const Tesseract = require('tesseract.js');

export default function NewRefundRequest({
  address,
  price,
  trigger,
  signer,
  refundInstance,
}) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [receiptImages, setReceiptImages] = useState([]);
  const [refundAmount, setRefundAmount] = useState("0");
  const [recognitionState, setRecognitionState] = useState("idle");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [display, setDisplay] = useState();

  function previewRefundAmount() {
    console.log(recognitionState);
    if (recognitionState.match("inProgress")) return (
      <div style={{ marginTop: 32 }}>
        <Spin />
      </div>)
    else {
      return (
        <div>
          <RefundAmountInput
            autofocus
            price={price}
            placeholder="Refund amount"
            value={refundAmount}
            onChange={v => {
              setErrorMessage('');
              setRefundAmount(v);
            }}
            display={display}
            setDisplay={setDisplay}
          />
        </div>)
    }
  }

  useEffect(async () => {
    setErrorMessage('');
    console.log(receiptImages);
    if (receiptImages.length < 1) {
      return;
    }
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
      setDisplay(amount);
      setRecognitionState("idle");
    })

  }, [receiptImages]);

  const createNewRequest = useCallback(async () => {
    if (receiptImages.length < 1) {
      setErrorMessage("Receipt image is missing");
      console.log("Image missing");
      return;
    }

    setButtonLoading(true);
    const files = [
      receiptImages.at(0).originFileObj
    ]
    addToIPFS(files).then(async (result) => {
      console.log(result);
      let url = retrieveFile(result);
      console.log(url);
      let date = (new Date()).getTime();
      let amount;

      try {
        amount = ethers.utils.parseEther("" + refundAmount);
      } catch (e) {
        // failed to parseEther, try something else
        amount = ethers.utils.parseEther("" + parseFloat(refundAmount).toFixed(8));
      }
      try {
        let done = await refundInstance.connect(signer).createRequest(
          description,
          url,
          address,
          amount,
          date,
          category
        );
        setButtonLoading(false);
        trigger(false);
      }
      catch (error) {
        console.error(error);
        setButtonLoading(false);
        setErrorMessage("Transaction failed");
      }
      
    }, function (err) {
      console.log(err);
      setButtonLoading(false);
    });
  });

  return (
    <div>
      <div style={{ padding: 16, paddingTop: 2, border: "1px solid #cccccc", width: 400, margin: "auto" }}>

        <Row style={{ paddingTop: 0, width: 372, margin: "auto" }}>
          <Col span={1} offset={23}>
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
            style={{ width: 348, textAlign: "left" }}
            onChange={e => {
              setErrorMessage('');
              setCategory(e);
            }}>
            <Option value="Equipment">Equipment</Option>
            <Option value="Home Office">Home Office</Option>
            <Option value="Meals and Entertainment">Meals and Entertainment</Option>
            <Option value="Office Supplies">Office Supplies</Option>
            <Option value="Travel">Travel</Option>
            <Option value="Other">Other</Option>
          </Select>

          <Divider />
          <h4>Description</h4>
          <TextArea
            autoSize={{ minRows: 2, maxRows: 3 }}
            onChange={e => {
              setErrorMessage('');
              setDescription(e.target.value);
            }}
            placeholder={"Description"}
          />
          <Divider />
          <Button
            type={"primary"}
            loading={buttonLoading}
            style={{ marginTop: 8 }}
            onClick={async () => {
              setErrorMessage('');
              createNewRequest();
            }}
          >
            Send Request!
          </Button>
          <div>
          {errorMessage !== '' && <label style={{color: 'crimson'}}>{errorMessage}</label>}
          </div>
        </div>
      </div>
    </div>
  );
}
