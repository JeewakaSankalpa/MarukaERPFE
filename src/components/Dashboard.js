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
} from "react-icons/fa";
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

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [hoveredMenu, setHoveredMenu] = useState(null);

  const [activeSection, setActiveSection] = useState(null);
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

  const menuItems = [
    {
      title: "User Management",
      icon: <FaUser className="menu-icon" />,
      subItems: [
        { name: "Create User", path: "/user/create", icon: <FaUserPlus /> },
        { name: "Search User", path: "/user/search", icon: <FaSearch /> },
      ],
    },
    {
      title: "Customer Management",
      icon: <FaPhone className="menu-icon" />,
      subItems: [
        {
          name: "Create Customer",
          path: "/customer/create",
          icon: <FaUserPlus />,
        },
        {
          name: "Search Customer",
          path: "/customer/search",
          icon: <FaPhone />,
        },
      ],
    },
    {
      title: "Supplier Management",
      icon: <FaTruck className="menu-icon" />,
      subItems: [
        {
          name: "Create Supplier",
          path: "/supplier/create",
          icon: <FaTruck />,
        },
        {
          name: "Search Supplier",
          path: "/supplier/search",
          icon: <FaSearch />,
        },
        // { name: "Returns", path: "/supplier/return", icon: <FaBox /> },
        {
          name: "Create Supplier Invoice",
          path: "/supplier/invoice",
          icon: <FaFileInvoiceDollar />,
        },
        {
          name: "Search Supplier Invoices",
          path: "/supplier/invoices",
          icon: <FaClipboardList />,
        },
      ],
    },
    {
      title: "Inventory Management",
      icon: <FaBox className="menu-icon" />,
      subItems: [
        { name: "Add Inventory", path: "/inventory/add", icon: <FaBox /> },
        {
          name: "Transfer to Store",
          path: "/inventory/transfer",
          icon: <FaClipboardList />,
        },
        {
          name: "Return to Inventory",
          path: "/inventory/return",
          icon: <FaBox />,
        },
        {
          name: "Accept GRN",
          path: "/inventory/acceptgrn",
          icon: <FaClipboardList />,
        },
        {
          name: "Manual Stock",
          path: "/inventory/manual",
          icon: <FaClipboardList />,
        },
        {
          name: "View Stock",
          path: "/inventory/view",
          icon: <FaClipboardList />,
        },
      ],
    },
    {
      title: "Product Management",
      icon: <FaBox className="menu-icon" />,
      subItems: [
        { name: "Create Product", path: "/product/create", icon: <FaBox /> },
        { name: "Search Product", path: "/product/search", icon: <FaSearch /> },
        {
          name: "Create Generic Name",
          path: "/generic-name/create",
          icon: <FaBox />,
        },
        {
          name: "Search Generic Name",
          path: "/generic-name/search",
          icon: <FaSearch />,
        },
      ],
    },
    {
      title: "Store Management",
      icon: <FaStore className="menu-icon" />,
      subItems: [
        { name: "Create Store", path: "/store/create", icon: <FaStore /> },
        { name: "Search Store", path: "/store/search", icon: <FaSearch /> },
      ],
    },
    {
      title: "Invoice Management",
      icon: <FaFileInvoiceDollar className="menu-icon" />,
      subItems: [
        {
          name: "Issue Invoice",
          path: "/invoice/create",
          icon: <FaFileInvoiceDollar />,
        },
        {
          name: "View Invoices",
          path: "/invoice/list",
          icon: <FaClipboardList />,
        },
      ],
    },
    {
      title: "Reports",
      icon: <FaClipboardList className="menu-icon" />,
      subItems: [
        {
          name: "Sales Reports",
          path: "/sales-report",
          icon: <FaClipboardList />,
        },
        {
          name: "Product Sales Report",
          path: "/product-sales-report",
          icon: <FaClipboardList />,
        },
        {
          name: "Sales Charts",
          path: "/sales-charts",
          icon: <FaClipboardList />,
        },
        { name: "Accept Return", path: "/cashier/return", icon: <FaBox /> },
      ],
    },
    {
      title: "Manufacturer Management",
      icon: <FaStore className="menu-icon" />,
      subItems: [
        {
          name: "Create Manufacturer",
          path: "/manufacturer/create",
          icon: <FaStore />,
        },
        {
          name: "Search Manufacturer",
          path: "/manufacturer/search",
          icon: <FaSearch />,
        },
      ],
    },
  ];

  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);

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
            {menuItems.map((item, index) => (
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
                  {item.subItems.map((subItem, subIndex) => (
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
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <PayablesWidget />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <MyTasksWidget />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <EmployeeHRWidget />
                </div>
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
