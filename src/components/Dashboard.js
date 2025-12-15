import React, { useEffect, useState } from "react";
import "./Styles/DashboardStyle.css";
// import "../styles/DashboardStyle.css";
import {
  FaBox,
  FaClipboardList,
  FaClock,
  FaCogs,
  FaFileInvoiceDollar,
  FaPhone,
  FaSearch,
  FaSignOutAlt,
  FaStore,
  FaTruck,
  FaUser,
  FaUserPlus,
  FaProjectDiagram,
  FaBoxes, // Corrected from FaBox? Check imports
  FaChartLine,
  FaBriefcase,
  FaSuitcase,
  FaHome
} from "react-icons/fa";
import { MenuConfig } from "../resources/MenuConfig";
import { ModuleConstants } from "../resources/ModuleConstants";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Container } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
// import api from "../services/api";
import Images from "../resources/Images";
import Sidebar from "./ReusableComponents/SideBar";
import ProjectCard from "./ReusableComponents/ProjectCard";
import MenuCard from "./ReusableComponents/MenuCard";
import SideBarForDashboard from "./ReusableComponents/SideBarForDashboard";
import Header from "./ReusableComponents/Header";
import NewSideBar from "./ReusableComponents/NewSideBar";
import Colors from "../resources/Colors";
import PayablesWidget from "./Dashboard/PayablesWidget";
import MyTasksWidget from "./Projects/Tasks/MyTasksWidget";
import EmployeeHRWidget from "./Dashboard/EmployeeHRWidget";
import PendingApprovalsWidget from "./Dashboard/PendingApprovalsWidget";
import MyAttendanceWidget from "./Dashboard/MyAttendanceWidget";

function Dashboard({ onLogout }) {
  // ... imports ...

  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [hoveredMenu, setHoveredMenu] = useState(null);

  const [activeSection, setActiveSection] = useState(null);
  const { logout } = useAuth();

  // Role Access
  const userRole = localStorage.getItem("role") || "EMPLOYEE";
  const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");

  // hasAccess moved to menu definition area to capture scope? No, it uses userModules which is here. 
  // I will just remove this old one, and rely on the one I added below.
  // Wait, if I remove it, will the code below use it before declaration? 
  // Function declarations are hoisted, but const arrow functions are NOT.
  // The 'menuItems' definition uses 'MenuConfig.filter' but doesn't call hasAccess immediately?
  // Actually, 'menuItems' definition in my previous block didn't use hasAccess?
  // Let's check the code I wrote.
  // "const menuItems = MenuConfig...map..."
  // It does NOT use hasAccess.
  // BUT the render loop DOES use hasAccess: "menuItems.filter(item => hasAccess(item))".
  // So hasAccess must be defined before render.
  // The second hasAccess is defined at line ~180.
  // Render is at line ~441.
  // So it is fine to keep the second one and delete the first one.

  const [user, setUser] = useState({
    firstName: localStorage.getItem("firstName") || "Guest",
    lastName: localStorage.getItem("lastName") || "",
    store: localStorage.getItem("store") || "",
  });

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // const handleLogout = async () => {
  //     try {
  //         await api.post("/user/logout", {
  //             username: localStorage.getItem("username"),
  //         });
  //         logout();
  //         navigate("/");
  //     } catch (error) {
  //         console.error("Logout failed:", error);
  //     }
  // };

  const projects = [
    {
      title: "Admin",
      team: "Marketing Team",
      timeLeft: "1 Week",
      progress: 34,
      icon: <FaUserPlus />,
    },
    {
      title: "Inventory",
      team: "Core UI Team",
      timeLeft: "3 Weeks",
      progress: 76,
      icon: <FaUserPlus />,
    },
    {
      title: "Customer",
      team: "Marketing Team",
      timeLeft: "2 Days",
      progress: 4,
      icon: <FaUserPlus />,
    },
    {
      title: "Project",
      team: "Marketing Team",
      timeLeft: "1 Month",
      progress: 90,
      icon: <FaUserPlus />,
    },
    {
      title: "Reports",
      team: "Order Process Team",
      timeLeft: "3 Weeks",
      progress: 65,
      icon: <FaUserPlus />,
    },
    {
      title: "Suppliers",
      team: "Core Data Team",
      timeLeft: "2 Months",
      progress: 96,
      icon: <FaUserPlus />,
    },
  ];

  const MenuList = [
    {
      title: "Admin",
      team: "Marketing Team",
      timeLeft: "1 Week",
      progress: 34,
      icon: <FaUserPlus />,
    },
    {
      title: "Inventory",
      team: "Core UI Team",
      timeLeft: "3 Weeks",
      progress: 76,
      icon: <FaUserPlus />,
    },
    {
      title: "Customer",
      team: "Marketing Team",
      timeLeft: "2 Days",
      progress: 4,
      icon: <FaUserPlus />,
    },
    {
      title: "Project",
      team: "Marketing Team",
      timeLeft: "1 Month",
      progress: 90,
      icon: <FaUserPlus />,
    },
    {
      title: "Reports",
      team: "Order Process Team",
      timeLeft: "3 Weeks",
      progress: 65,
      icon: <FaUserPlus />,
    },
    {
      title: "Suppliers",
      team: "Core Data Team",
      timeLeft: "2 Months",
      progress: 96,
      icon: <FaUserPlus />,
    },
  ];

  //   const projects = [
  //     { title: "App Development", team: "Marketing Team", timeLeft: "1 Week", progress: 34, icon: <Laptop /> },
  //     { title: "Web Design", team: "Core UI Team", timeLeft: "3 Weeks", progress: 76, icon: <Globe /> },
  //     { title: "Landing Page", team: "Marketing Team", timeLeft: "2 Days", progress: 4, icon: <PieChart /> },
  //     { title: "Business Compare", team: "Marketing Team", timeLeft: "1 Month", progress: 90, icon: <BarChart /> },
  //     { title: "Comerce Checkout", team: "Order Process Team", timeLeft: "3 Weeks", progress: 65, icon: <ShoppingCart /> },
  //     { title: "Data Staging", team: "Core Data Team", timeLeft: "2 Months", progress: 96, icon: <BarChart /> },
  //     { title: "Campaign Store", team: "Internal Communication", timeLeft: "11 Days", progress: 24, icon: <PlayCircle /> },
  //     { title: "Acquisition Mitra", team: "Merchant Team", timeLeft: "1 Week", progress: 70, icon: <Users /> },
  //   ];

  const hasAccess = (item) => {
    if (!item.roles) return true;

    // 1. Role Check
    const roleMatch = item.roles.includes(userRole);
    if (!roleMatch)    // ADMIN Access Note: User requested strict module checks for Admin too.
      // if (userRole === "ADMIN") return true;
      if (!item.id) return true;
    return userModules.includes(item.id);
  };

  const iconMap = {
    "FaHome": <FaHome className="menu-icon" />,
    "FaProjectDiagram": <FaProjectDiagram className="menu-icon" />,
    "FaBoxes": <FaBox className="menu-icon" />,
    "FaChartLine": <FaClipboardList className="menu-icon" />, // ChartLine not imported? Using ClipboardList fallback or import
    "FaUsers": <FaUserPlus className="menu-icon" />,
    "FaBriefcase": <FaSuitcase className="menu-icon" />, // Need generic
    "FaCogs": <FaCogs className="menu-icon" />,
  };

  // Helper to get sub-icon (Dashboard has rich sub-icons)
  // For now generic fallback
  const getSubIcon = (subId) => {
    if (subId.includes("search")) return <FaSearch />;
    if (subId.includes("create") || subId.includes("add")) return <FaUserPlus />; // Generic Plus
    return <FaClipboardList />;
  };

  const menuItems = MenuConfig
    .filter(m => m.id !== 'home') // Don't show Home tile on Dashboard
    .map(menu => ({
      ...menu,
      icon: iconMap[menu.icon] || <FaBox className="menu-icon" />,
      subItems: menu.subItems.map(sub => ({
        ...sub,
        name: sub.title, // Standardize name/title
        icon: getSubIcon(sub.id)
      }))
    }));

  // Cleanup old lists
  const lowStockProducts = []; // Placeholder if logic moved
  const expiringSoon = [];

  // useEffect(() => {
  //     fetchLowStockProducts(user.store);
  //     fetchExpiringSoon(user.store);
  // }, [user.store]);

  // const fetchLowStockProducts = async (locationId) => {
  //     try {
  //         const response = await api.get('/inventory/low-stock', {
  //             params: { locationId }
  //         });
  //         setLowStockProducts(response.data);
  //     } catch (error) {
  //         console.error('Failed to fetch low stock products:', error);
  //     }
  // };

  // const fetchExpiringSoon = async (locationId) => {
  //     try {
  //         const response = await api.get('/inventory/expiring-soon', {
  //             params: { locationId }
  //         });
  //         setExpiringSoon(response.data);
  //     } catch (error) {
  //         console.error('Failed to fetch expiring soon products:', error);
  //     }
  // };

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Add resize event listener
    window.addEventListener("resize", handleResize);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);



  return (
    <div
      // className="fullDashboard"
      style={styles.main}
    >
      <div style={{ height: "10vh", width: "100vw" }}>
        <Header />
      </div>

      <div style={{ display: "flex" }}>
        {/* <SideBarForDashboard /> */}

        <NewSideBar />

        <Container fluid className="dashboard-container">
          <Container className="fullMenuDesign">
            {menuItems.filter(item => hasAccess(item)).map((item, index) => (
              <div
                key={index}
                className="menu-item"
                onMouseEnter={() => setActiveSection(index)}
                onMouseLeave={() => setActiveSection(null)}
              >
                <div className="menu-title">
                  {item.title}
                  <div className="menu-icon-container">{item.icon}</div>
                </div>
                <div
                  className={`submenu ${activeSection === index ? "submenu-active" : ""
                    }`}
                >
                  {item.subItems.filter(sub => hasAccess(sub) && !sub.hidden).map((subItem, subIndex) => (
                    <div
                      key={subIndex}
                      className="submenu-item"
                      onClick={() => navigate(subItem.path)}
                    >
                      {subItem.icon} {subItem.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Container>
        </Container>

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
                Reporting
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                {projects.map((project, index) => (
                  <ProjectCard key={index} {...project} />
                ))}
              </div>

              <div className="mt-4 d-flex gap-4 flex-wrap">
                {/* Pending Approvals: Granular Check */}
                {hasAccess({ id: 'dashboard.pending_approvals', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] }) && (
                  <div style={{ flex: 1, minWidth: '400px' }}>
                    <PendingApprovalsWidget />
                  </div>
                )}
              </div>

              <div className="mt-4 d-flex gap-4 flex-wrap">
                {/* Payables: visible to Finance OR Admin? Let's use 'finance' module ID */}
                {hasAccess({ id: 'finance' }) && (
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <PayablesWidget />
                  </div>
                )}

                {/* Tasks: Visible to everyone with Projects access? or just generic? */}
                {hasAccess({ id: 'projects' }) && (
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <MyTasksWidget />
                  </div>
                )}

                {/* HR Widget: Restricted to HR module */}
                {hasAccess({ id: 'hr' }) && (
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <EmployeeHRWidget />
                  </div>
                )}

                {/* My Attendance: Granular Check */}
                {hasAccess({ id: 'dashboard.my_attendance', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] }) && (
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <MyAttendanceWidget />
                  </div>
                )}
              </div>

            </div>
          </Container>
        </Container>
      </div>
    </div>
  );
}

const styles = {
  // main: {
  //   display: "flex",
  //   height: "100vh",
  //   // gridtTemplateColumns: "1fr 3fr 1fr",
  //   // flexDirection: "column",
  // },
  mainView: {
    // display: "flex",
    width: "100vw",
  },
  afterHeader: {
    display: "flex",
    height: "100vh",
  },
  sidebar: {
    backgroundColor: `${Colors.error}`,
  },
};
export default Dashboard;
