// src/components/Sidebar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaUserPlus,
    FaSearch,
    FaBox,
    FaTruck,
    FaMoneyBillWave,
    FaClipboardList,
    FaUser,
    FaClock,
    FaCogs,
    FaFileInvoiceDollar,
    FaPhone,
    FaStore,
    FaSignOutAlt,
} from "react-icons/fa";
import "../styles/Sidebar.css";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Button } from "react-bootstrap";
import Images from "../resources/Images";

function Header() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    // const [activeSection, setActiveSection] = useState(null);
    const { logout } = useAuth();
    const [user, setUser] = useState({
        firstName: localStorage.getItem("firstName") || "Guest",
        lastName: localStorage.getItem("lastName") || "",
        store: localStorage.getItem("store") || "",
    });
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        console.error("Logout failed:");
        try {
            // await api.post("/user/logout", {
            //   username: localStorage.getItem("username"),
            // });
            logout();
            navigate("/");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <div className="header-container">
            <header className="dashboard-header">
                <div
                    // style={{display: "flex", flexDirection: "column"}}
                >
                    {/*<div><h1>Osumedura</h1></div>*/}
                    <div onClick={() => navigate("/Dashboard")}>
                        <img
                            // src={Images.LogoWithBackground}
                            src={Images.LogoWithoutackground}
                            alt="Clickable button"
                            // onClick={handleClick}
                            style={{cursor: "pointer", width: "135px", height: "60px", marginLeft: "30px", marginRight: "30px"}}
                            // style={{cursor: "pointer", width: "90px", height: "60px", marginLeft: "30px", marginRight: "30px"}}
                        />
                    </div>

                    {/*<div onClick={() => navigate("/Dashboard")}>*/}
                    {/*  <img*/}
                    {/*      src={Images.Home}*/}
                    {/*      alt="Clickable button"*/}
                    {/*      // onClick={handleClick}*/}
                    {/*      style={{cursor: "pointer", width: "30px", height: "30px", marginLeft: "30px", marginRight: "30px"}}*/}
                    {/*  />*/}
                    {/*</div>*/}
                </div>

                <div className="user-info">
                    <FaUser/>{" "}
                    <span>
            {user.firstName} {user.lastName}
          </span>
                    <FaStore/> <span>{user.store}</span>
                    <FaClock/>{" "}
                    <span>
            {currentTime.toLocaleTimeString()}&nbsp;&nbsp;&nbsp;
                        {new Date().toLocaleDateString()}
          </span>
                </div>

                <div style={{display: "flex"}}>
                    <div className="logout-section">
                        <Button variant="danger" onClick={handleLogout}>
                            <FaSignOutAlt/> Logout
                        </Button>
                    </div>

                    {/* <div className="submenu-item" onClick={() => navigate("/settings")}>
            <p>Settings</p>
          </div> */}

                    <div onClick={() => navigate("/settings")}>
                        <img
                            src={Images.Settings}
                            alt="Clickable button"
                            // onClick={handleClick}
                            style={{cursor: "pointer", width: "30px", height: "30px", marginLeft: "30px", marginRight: "30px"}}
                        />
                    </div>
                </div>
            </header>
        </div>
    );
}

export default Header;
