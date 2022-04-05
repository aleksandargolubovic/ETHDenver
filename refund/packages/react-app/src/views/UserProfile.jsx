import { Address, Balance } from "../components";
import { useState } from 'react'
import { useEffect } from "react";
import { Redirect } from "react-router-dom";
import { useCallback } from "react";

import { Input, Divider, Spin, Statistic, notification } from "antd";
import {
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  Label,
  FormGroup,
  Row, Col,
  Table,

  UncontrolledTooltip,
} from "reactstrap";


export default function UserProfile({
  localProvider,
  price,
  address,
  signer,
  refundInstance,
  isApprover,
  isMember
}) {

  const [numOfRequests, setNumOfRequests] = useState(0);
  useEffect(() => {
    const getReqNumber = async () => {
      if (refundInstance) {
        const numOfRequests = await refundInstance.numOfRequests();
        setNumOfRequests(numOfRequests);
      }
    }
    getReqNumber();
  }, [refundInstance])


  return (
    <div className="content">
      <Row>
        <Col lg="4">
          <Card className="card-chart">
            <CardHeader>
              <h5 className="card-category">User Role</h5>
            </CardHeader>
            <CardBody>
              <CardTitle tag="h2">{isApprover ? "Approver" : isMember ? "Member" : ""}</CardTitle>
            </CardBody>
          </Card>
        </Col>
        <Col lg="4">
          <Card className="card-chart">
            <CardHeader>
              <h5 className="card-category">Total Requests</h5>
            </CardHeader>
            <CardBody>
              <CardTitle tag="h3">
                <i className="tim-icons icon-bell-55 text-info" />{numOfRequests.toString()}
              </CardTitle>
            </CardBody>
          </Card>
        </Col>
        <Col lg="4">
          <Card className="card-chart">
            <CardHeader>
              <h5 className="card-category">Total Money Refunded</h5>

            </CardHeader>
            <CardBody>
              <CardTitle tag="h3">
                <i className="tim-icons icon-delivery-fast text-primary" />{" "}
                3,500€
              </CardTitle>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col lg="4">
          <Card className="card-chart">
            <CardHeader>
              <h5 className="card-category">Requests Status</h5>
              <CardTitle tag="h3">
                <i className="tim-icons icon-send text-success" /> 12,100K
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="chart-area">

              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
