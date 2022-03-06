import { Button, Card, DatePicker, Divider, Input, Progress, Slider, Spin, Switch } from "antd";
import React, { useState, useEffect } from "react";
import { utils } from "ethers";
import { SyncOutlined } from "@ant-design/icons";

import { Address, Balance, Events } from "../components";
import { addToIPFS, getFromIPFS, urlFromCID } from "../helpers/ipfs";


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
}) {
  const [newPurpose, setNewPurpose] = useState("loading...");
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
            value={'$' + refundAmount}
            onChange={e => {
              setRefundAmount(e.target.value);
            }}
          />
        </div>)
    }
  }

  useEffect(() => {
    if (receiptImages.length < 1) return;
    const newImageUrls = [];
    receiptImages.forEach(image => newImageUrls.push(URL.createObjectURL(image)));
    setRecImageURLs(newImageUrls);
    setRecognitionState("inProgress");

    Tesseract.recognize(
      newImageUrls[0],
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
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        <h2>Add new refund request</h2>
        <Divider />
        <h4>upload receipt</h4>
        <div style={{ margin: 8 }}>
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
          <Divider />
          <h4>refund amount</h4>
          {previewRefundAmount()
          }
          <Divider />
          <h4>additional comment</h4>
          <Input
            onChange={e => {
              setNewPurpose(e.target.value);
            }}
          />
          <Divider />
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              addToIPFS(receiptImages[0]).then(function (result) {
                console.log(result.path);
                let url = urlFromCID(result.cid);
                console.log(url);
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
