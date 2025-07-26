import React from "react";
import SideBarForDashboard from "../ReusableComponents/SideBarForDashboard";
import Header from "../ReusableComponents/Header";
import "../Styles/DashboardStyle.css";
import { useNavigate } from "react-router-dom"; // ✅ Import
import { FaUserPlus } from "react-icons/fa";
import MenuCard from "../ReusableComponents/MenuCard";
import { Container } from "react-bootstrap";
import { Calendar } from "lucide-react";

const EmployerDashboard = () => {
  const navigate = useNavigate(); // ✅ Hook

  const handleCreateEmployer = () => {
    navigate("/employee/create"); // ✅ Adjust the route if needed
  };

  const handleViewmployer = () => {
    navigate("/employee/view");
  };

  const MenuList = [
    {
      title: "+ Create Employee",
      path: "/employee/create",
      icon: <FaUserPlus />,
    },
    {
      title: "View Employee",
      path: "/employee/view",
      // icon: <Calender />,
      icon: <Calendar size={20} />,
    },
  ];

  return (
    <div className="fullDashboard">
      <Header />
      <div style={{ display: "flex" }}>
        <SideBarForDashboard />
        <div className="dashboard-content">
          {/* ✅ Add Button */}

          {/* <div className="top-bar" style={{ marginBottom: "20px" }}>
            <button
              onClick={handleCreateEmployer}
              style={{
                backgroundColor: "#118ab2",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              + Create Employer
            </button>
          </div> */}

          {/* <div className="top-bar" style={{ marginBottom: "20px" }}>
            <button
              onClick={handleViewmployer}
              style={{
                backgroundColor: "#118ab2",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              View Employer
            </button>
          </div> */}

          <Container>
            <Container>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                }}
              >
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    marginBottom: "16px",
                  }}
                >
                  Employee Dashboard
                </h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                  {MenuList.map((project, index) => (
                    <MenuCard key={index} {...project} />
                  ))}
                </div>
              </div>
            </Container>
          </Container>

          {/* Dashboard Cards */}
          {/* <div className="card-grid">
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
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;
