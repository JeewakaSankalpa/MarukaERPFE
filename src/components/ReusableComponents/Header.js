// // src/components/Sidebar.js
// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//     FaUserPlus,
//     FaSearch,
//     FaBox,
//     FaTruck,
//     FaMoneyBillWave,
//     FaClipboardList,
//     FaUser,
//     FaClock,
//     FaCogs,
//     FaFileInvoiceDollar,
//     FaPhone,
//     FaStore,
//     FaSignOutAlt,
// } from "react-icons/fa";
// import "../styles/Sidebar.css";
// import axios from "axios";
// import { useAuth } from "../context/AuthContext";
// import api from "../services/api";
// import { Button } from "react-bootstrap";
// import Images from "../resources/Images";

// function Header() {
//     const navigate = useNavigate();
//     const [currentTime, setCurrentTime] = useState(new Date());

//     // const [activeSection, setActiveSection] = useState(null);
//     const { logout } = useAuth();
//     const [user, setUser] = useState({
//         firstName: localStorage.getItem("firstName") || "Guest",
//         lastName: localStorage.getItem("lastName") || "",
//         store: localStorage.getItem("store") || "",
//     });
//     useEffect(() => {
//         const interval = setInterval(() => setCurrentTime(new Date()), 1000);
//         return () => clearInterval(interval);
//     }, []);

//     const handleLogout = async () => {
//         console.error("Logout failed:");
//         try {
//             // await api.post("/user/logout", {
//             //   username: localStorage.getItem("username"),
//             // });
//             logout();
//             navigate("/");
//         } catch (error) {
//             console.error("Logout failed:", error);
//         }
//     };

//     return (
//         <div className="header-container">
//             <header className="dashboard-header">
//                 <div
//                     // style={{display: "flex", flexDirection: "column"}}
//                 >
//                     {/*<div><h1>Osumedura</h1></div>*/}
//                     <div onClick={() => navigate("/Dashboard")}>
//                         <img
//                             // src={Images.LogoWithBackground}
//                             src={Images.LogoWithoutackground}
//                             alt="Clickable button"
//                             // onClick={handleClick}
//                             style={{cursor: "pointer", width: "135px", height: "60px", marginLeft: "30px", marginRight: "30px"}}
//                             // style={{cursor: "pointer", width: "90px", height: "60px", marginLeft: "30px", marginRight: "30px"}}
//                         />
//                     </div>

//                     {/*<div onClick={() => navigate("/Dashboard")}>*/}
//                     {/*  <img*/}
//                     {/*      src={Images.Home}*/}
//                     {/*      alt="Clickable button"*/}
//                     {/*      // onClick={handleClick}*/}
//                     {/*      style={{cursor: "pointer", width: "30px", height: "30px", marginLeft: "30px", marginRight: "30px"}}*/}
//                     {/*  />*/}
//                     {/*</div>*/}
//                 </div>

//                 <div className="user-info">
//                     <FaUser/>{" "}
//                     <span>
//             {user.firstName} {user.lastName}
//           </span>
//                     <FaStore/> <span>{user.store}</span>
//                     <FaClock/>{" "}
//                     <span>
//             {currentTime.toLocaleTimeString()}&nbsp;&nbsp;&nbsp;
//                         {new Date().toLocaleDateString()}
//           </span>
//                 </div>

//                 <div style={{display: "flex"}}>
//                     <div className="logout-section">
//                         <Button variant="danger" onClick={handleLogout}>
//                             <FaSignOutAlt/> Logout
//                         </Button>
//                     </div>

//                     {/* <div className="submenu-item" onClick={() => navigate("/settings")}>
//             <p>Settings</p>
//           </div> */}

//                     <div onClick={() => navigate("/settings")}>
//                         <img
//                             src={Images.Settings}
//                             alt="Clickable button"
//                             // onClick={handleClick}
//                             style={{cursor: "pointer", width: "30px", height: "30px", marginLeft: "30px", marginRight: "30px"}}
//                         />
//                     </div>
//                 </div>
//             </header>
//         </div>
//     );
// }

// export default Header;



// ======================================


import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { FaClock, FaUser } from "react-icons/fa";
import { FaStore } from "react-icons/fa6";

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [user, setUser] = useState({
    firstName: localStorage.getItem("firstName") || "Guest",
    lastName: localStorage.getItem("lastName") || "",
    store: localStorage.getItem("store") || "",
  });
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.5rem",
        // borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        height: "2rem",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left Section - Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            borderRadius: "9999px",
            width: "2rem",
            height: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
          }}
        >
          M
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>
          Maruka
        </h2>
      </div>

      {/* Center Section - Search */}
      {/* <div style={{ flex: 1, maxWidth: "400px", marginLeft: "2rem", marginRight: "2rem" }}>
        <input
          type="text"
          placeholder="Search ..."
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            fontSize: "0.875rem",
          }}
        />
      </div> */}
      <div style={{ flex: 1, maxWidth: "400px", marginLeft: "2rem", marginRight: "2rem" }}>
      <div className="user-info">
          {/* <FaUser/>{" "}
          <span>
            {user.firstName} {user.lastName}
          </span>
          <FaStore/> <span>{user.store}</span> */}
          <FaClock/>{" "}
          <span>
            {currentTime.toLocaleTimeString()}&nbsp;&nbsp;&nbsp;
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Right Section - Notifications & Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ position: "relative", cursor: "pointer" }}>
          <Bell size={20} />
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              backgroundColor: "#ef4444",
              color: "white",
              fontSize: "0.625rem",
              borderRadius: "9999px",
              padding: "2px 5px",
              fontWeight: "bold",
            }}
          >
            1
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img
            src="https://i.pravatar.cc/40"
            alt="User"
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "9999px",
              objectFit: "cover",
            }}
          />
          <div>
            <h3
              style={{
                fontWeight: "600",
                fontSize: "0.875rem",
                margin: "0 0 2px 0",
                color: "#1f2937",
              }}
            >
              {user.firstName} {user.lastName}
            </h3>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                margin: 0,
              }}
            >
              {user.firstName}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

