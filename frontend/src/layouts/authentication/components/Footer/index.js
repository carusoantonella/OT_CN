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
import Container from "@mui/material/Container";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function Footer() {
  return (
    <MDBox position="absolute" width="100%" bottom={0} py={4} textAlign="center">
      <Container>
        <MDTypography variant="body2" color="black"></MDTypography>
      </Container>
    </MDBox>
  );
}

export default Footer;
