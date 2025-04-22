import React from "react";
import SideBarForDashboard from "../ReusableComponents/SideBarForDashboard";
import Header from "../ReusableComponents/Header";
import "../Styles/DashboardStyle.css";

const CustomerDashboard = () => {
  return (
    <div className="fullDashboard">
      <Header />
      <div style={{display: "flex"}}>
        <SideBarForDashboard />
        <div className="card-grid">
          <div className="card" style={{ backgroundColor: "#ffd166" }}>
            <h2>Total Orders</h2>
            <p>124</p>
          </div>
          <div className="card" style={{ backgroundColor: "#06d6a0" }}>
            <h2>Pending</h2>
            <p>20</p>
          </div>
          <div className="card" style={{ backgroundColor: "#118ab2" }}>
            <h2>Delivered</h2>
            <p>100</p>
          </div>
          <div className="card" style={{ backgroundColor: "#ef476f" }}>
            <h2>Cancelled</h2>
            <p>4</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
