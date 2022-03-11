import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header() {
  return (
    <a href="https://github.com/aleksandargolubovic/ETHDenver" target="_blank" rel="noopener noreferrer">
      <PageHeader
        title="🧾 Refund"
        subTitle="to easily track and reimburse all expenses in your DAO"
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}
