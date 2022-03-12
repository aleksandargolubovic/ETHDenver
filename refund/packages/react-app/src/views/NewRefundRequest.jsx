import { Row, Col, Button, Card, DatePicker, Divider, Input, Progress, Slider, Spin, Switch } from "antd";
import React, { useState, useEffect } from "react";
import { utils } from "ethers";
import { SyncOutlined } from "@ant-design/icons";

import { Address, Balance, Events, UploadPhoto } from "../components";
import { addToIPFS, getFromIPFS, urlFromCID } from "../helpers/ipfs";

const { TextArea } = Input;

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
  const [receiptImages, setReceiptImages] = useState([]);
  const [recImageURLs, setRecImageURLs] = useState([]);
  const [refundAmount, setRefundAmount] = useState("0");
  const [recognitionState, setRecognitionState] = useState("idle");


  function onImageChange(e) {
    setReceiptImages([...e.target.files]);
  }

  function previewRefundAmount() {
    console.log(recognitionState);
    if (recognitionState.match("inProgress")) return (
      <div style={{ marginTop: 32 }}>
        <Spin />
      </div>)
    else {
      return (
        <div>
          <Input
            value={refundAmount}
            onChange={e => {
              setRefundAmount(e.target.value);
            }}
          />
        </div>)
    }
  }


  /*
   <Input
              type="file" accept="image/*"
              addonAfter={
                <div>
                  Scan
                </div>
              }
              onChange={onImageChange}
            />
            {recImageURLs.map(imageSrc => <img src={imageSrc} style={{ marginTop: 8, width: 350 }} />)}




            <Row>
            <Col span={12} style={{ textAlign: "center" }}>
              <h4>Upload receipt</h4><br />
              <UploadPhoto />
            </Col>
            <Col span={12} style={{ textAlign: "center" }}>
              <h4>refund amount</h4><br />
              {previewRefundAmount()}
            </Col>            
          </Row>
            
  */


  useEffect(async () => {
    console.log("***************receiptImages************************");
    console.log(receiptImages);
    if (receiptImages.length < 1) return;
    const newImageUrls = [];
    //newImageUrls.push(receiptImages.at(0).url)
    //receiptImages.forEach(image => newImageUrls.push(image.url));
    //setRecImageURLs(newImageUrls);

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
      setRefundAmount(amount);
      setRecognitionState("idle");
    })

  }, [receiptImages]);

  return (
    <div>
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto" }}>
        <h2>Add new refund request</h2>
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
          <h4>Additional comment</h4>
          <TextArea
            autoSize={{ minRows: 2, maxRows: 3 }}
            onChange={e => {
              setDescription(e.target.value);
            }}
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
                console.log(refundAmount);

                try{
                let done = await refundInstance.connect(signer).createRequest(
                  description,
                  url,
                  address,
                  refundAmount
                );}
                catch(error){
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
