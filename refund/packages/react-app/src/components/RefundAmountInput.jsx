import { Input } from "antd";
import React, { useEffect, useState } from "react";

export default function RefundAmountInput(props) {
  const [mode, setMode] = useState(props.price ? "USD" : "ETH");
  const [value, setValue] = useState();

  const currentValue = typeof props.value !== "undefined" ? props.value : value;

  useEffect(() => {
    if (!currentValue) {
        props.setDisplay("");
    }
  }, [currentValue]);

  return (
    <Input
      style={props.style}
      placeholder={props.placeholder ? props.placeholder : "amount in " + mode}
      autoFocus={props.autoFocus}
      prefix={mode === "USD" ? "$" : "Ξ"}
      value={props.display}
      addonAfter={
        !props.price ? (
          ""
        ) : (
          <div
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (mode === "USD") {
                setMode("ETH");
                props.setDisplay(currentValue);
              } else {
                setMode("USD");
                if (currentValue) {
                  const usdValue = "" + (parseFloat(currentValue) * props.price).toFixed(2);
                  props.setDisplay(usdValue);
                } else {
                  props.setDisplay(currentValue);
                }
              }
            }}
          >
            {mode === "USD" ? "USD 🔀" : "ETH 🔀"}
          </div>
        )
      }
      onChange={async e => {
        const newValue = e.target.value;
        if (mode === "USD") {
          const possibleNewValue = parseFloat(newValue);
          if (possibleNewValue) {
            const ethValue = possibleNewValue / props.price;
            setValue(ethValue);
            if (typeof props.onChange === "function") {
              props.onChange(ethValue);
            }
            props.setDisplay(newValue);
          } else {
            props.setDisplay(newValue);
          }
        } else {
          setValue(newValue);
          if (typeof props.onChange === "function") {
            props.onChange(newValue);
          }
          props.setDisplay(newValue);
        }
      }}
    />
  );
}
