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
  FaUsers,
  FaHome
} from "react-icons/fa";
import { MenuConfig } from "../resources/MenuConfig";
import { ModuleConstants } from "../resources/ModuleConstants";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Container, Row, Col, Card, Spinner, Table, Badge } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
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

const money = (n) => Number(n || 0).toLocaleString();

function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`flip-wrapper ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(f => !f)} style={{ cursor: "pointer" }}>
      <div className="flip-inner">
        <div className="flip-face flip-front">{front}</div>
        <div className="flip-face flip-back">{back}</div>
      </div>
      <style>{`
        .flip-wrapper { perspective: 1000px; }
        .flip-inner { position: relative; width: 100%; height: 100%; transition: transform .6s; transform-style: preserve-3d; }
        .flip-wrapper.flipped .flip-inner { transform: rotateY(180deg); }
        .flip-face { position: absolute; inset: 0; backface-visibility: hidden; }
        .flip-back { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}

function Dashboard({ onLogout }) {
  // ... imports ...

  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [hoveredMenu, setHoveredMenu] = useState(null);

  const [activeSection, setActiveSection] = useState(null);
  const { logout } = useAuth();

  // Stats Logic
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get("/dashboard/summary");
      setStatsData(res.data);
    } catch (e) {
      setStatsData(null);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const proj = statsData?.project;
  const due = statsData?.due;
  const acc = statsData?.accounts;

  const DueList = ({ list }) => (
    <Table size="sm" bordered responsive className="mb-0">
      <thead>
        <tr><th style={{ width: 140 }}>ID</th><th>Name</th><th style={{ width: 180 }}>Due</th></tr>
      </thead>
      <tbody>
        {(!list || list.length === 0) ? (
          <tr><td colSpan={3} className="text-muted text-center">None</td></tr>
        ) : list.map(x => (
          <tr key={x.id}>
            <td><Badge bg="secondary">{x.id}</Badge></td>
            <td className="text-truncate">{x.name || "-"}</td>
            <td>{x.dueAt ? new Date(x.dueAt).toLocaleString() : "-"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

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
      title: "New Project",
      team: "Create a new project",
      timeLeft: "-",
      progress: 0,
      icon: <FaProjectDiagram />,
      path: "/projects/create"
    },
    {
      title: "Stock Search",
      team: "Check inventory levels",
      timeLeft: "-",
      progress: 0,
      icon: <FaSearch />,
      path: "/inventory/search"
    },
    {
      title: "My Projects",
      team: "View your active projects",
      timeLeft: "-",
      progress: 0,
      icon: <FaBriefcase />,
      path: "/projects/search"
    },
    {
      title: "Leaves",
      team: "Apply or view leaves",
      timeLeft: "-",
      progress: 0,
      icon: <FaUser />,
      path: "/leave"
    },
    {
      title: "Purchase Req",
      team: "Raise a new request",
      timeLeft: "-",
      progress: 0,
      icon: <FaClipboardList />,
      path: "/inventory/pr"
    },
    {
      title: "Directory",
      team: "Employee contacts",
      timeLeft: "-",
      progress: 0,
      icon: <FaUsers />,
      path: "/employee/list"
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
    <Container fluid className="dashboard-container p-0">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "24px",
        }}
      >
        {/* WIDGETS SECTION (Moved to Top) */}
        <div className="d-flex gap-4 flex-wrap mb-4">
          {/* My Attendance */}
          {hasAccess({ id: 'dashboard.my_attendance', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] }) && (
            <div style={{ flex: 1, minWidth: '300px' }}>
              <MyAttendanceWidget />
            </div>
          )}

          {/* Tasks */}
          {hasAccess({ id: 'projects' }) && (
            <div style={{ flex: 1, minWidth: '300px' }}>
              <MyTasksWidget />
            </div>
          )}

          {/* Pending Approvals */}
          {hasAccess({ id: 'dashboard.pending_approvals', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] }) && (
            <div style={{ flex: 1, minWidth: '300px' }}>
              <PendingApprovalsWidget />
            </div>
          )}

          {/* Payables (Finance) */}
          {hasAccess({ id: 'finance' }) && (
            <div style={{ flex: 1, minWidth: '300px' }}>
              <PayablesWidget />
            </div>
          )}

          {/* HR Widget */}
          {hasAccess({ id: 'hr' }) && (
            <div style={{ flex: 1, minWidth: '300px' }}>
              <EmployeeHRWidget />
            </div>
          )}
        </div>

        {/* STATS ROW */}
        <Row className="g-3 mb-4">
          {/* Project Stats - Detailed List */}
          <Col lg={6} md={12}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Header className="d-flex justify-content-between align-items-center bg-white">
                <div className="d-flex align-items-center gap-3">
                  <span className="fw-bold">Ongoing Projects</span>
                  <span role="button" className="text-muted small" onClick={loadStats}>{loadingStats ? "…" : "↻"}</span>
                </div>
              </Card.Header>
              <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {!proj?.ongoingList || proj.ongoingList.length === 0 ? (
                  <div className="text-muted small">No ongoing projects</div>
                ) : (
                  <Table size="sm" hover responsive className="mb-0 small">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Stage</th>
                        <th>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proj.ongoingList.map((p) => (
                        <tr key={p.id}>
                          <td className="fw-semibold">{p.name}</td>
                          <td><Badge bg="info" className="text-dark">{p.status?.replace(/_/g, " ")}</Badge></td>
                          <td>{p.dueAt ? new Date(p.dueAt).toLocaleDateString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Accounts - Project Payables */}
          <Col lg={6} md={12}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Header className="bg-white fw-bold">Project Payables (Outstanding)</Card.Header>
              <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {!acc?.projectPayables || acc.projectPayables.length === 0 ? (
                  <div className="text-muted small">No outstanding payables</div>
                ) : (
                  <Table size="sm" hover responsive className="mb-0 small">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th className="text-end">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acc.projectPayables.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.projectName}</td>
                          <td className="text-end fw-bold text-danger">₹ {money(item.amount)}</td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="table-light fw-bold">
                        <td>Total Outstanding</td>
                        <td className="text-end">₹ {money(acc.outstanding)}</td>
                      </tr>
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>


        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            marginBottom: "16px",
          }}
        >
          Quick Access
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          {projects.map((project, index) => (
            <ProjectCard key={index} {...project} />
          ))}
        </div>

      </div>
    </Container>
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
