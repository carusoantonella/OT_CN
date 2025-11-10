/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import TimelineItem from "examples/Timeline/TimelineItem";

function OrdersOverview() {
  return (
    <Card sx={{ height: "100%" }}>
      <MDBox pt={3} px={3}>
        <MDTypography variant="h6" fontWeight="medium">
          Analysis Timeline for Material UI XD Version App
        </MDTypography>
        <MDBox mt={0} mb={2}>
          <MDTypography variant="button" color="text" fontWeight="regular">
            <MDTypography display="inline" variant="body2" verticalAlign="middle">
              <Icon sx={{ color: ({ palette: { info } }) => info.main }}>timeline</Icon>
            </MDTypography>
            &nbsp;
            <MDTypography variant="button" color="text" fontWeight="medium">
              Latest events
            </MDTypography>
          </MDTypography>
        </MDBox>
      </MDBox>
      <MDBox p={2}>
        <TimelineItem
          color="success"
          icon="publish"
          title="Material UI XD Version App Published"
          dateTime="24 JUN 10:15 AM"
        />
        <TimelineItem
          color="error"
          icon="security"
          title="CVE-2023-20365 added to Project Material UI XD Version App"
          dateTime="23 JUN 4:45 PM"
        />
        <TimelineItem
          color="success"
          icon="check_circle"
          title="Mitigation completed for threat T-1003"
          dateTime="22 JUN 2:30 PM"
        />
        <TimelineItem
          color="warning"
          icon="analytics"
          title="Updated CVE for Material UI XD Version App"
          dateTime="21 JUN 6:00 AM"
        />
        <TimelineItem
          color="primary"
          icon="insights"
          title="Report generated for Material UI XD Version App"
          dateTime="20 JUN 8:45 AM"
          lastItem
        />
      </MDBox>
    </Card>
  );
}

export default OrdersOverview;
