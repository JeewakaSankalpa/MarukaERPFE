import React, { useEffect, useState } from "react";
// import "../styles/Dashboard.css";
import "../styleSheets/AdminDashboard.css";
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

function AdminDashboard({ onLogout }) {
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
                // {
                //   name: "Sales Returns",
                //   path: "/invoice/return",
                //   icon: <FaClipboardList />,
                // },
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
        <div className="fullDashboard">
            {/* <Container
                className="expiring-lowStock-container"
                style={{marginTop: "20px", height: `${0.8*windowSize.height}px`, dispay: "flex", flexDirection: "column", overflowY: "scroll"}}
            >
                <div>
                    {expiringSoon.length > 0 && (
                        <div className="warning-mark">⚠</div>
                    )}
                    <h2 className="warning-text">Upcoming expirations</h2>
                    <table style={{fontSize: '0.7rem', borderCollapse: "collapse"}}>
                        <thead className="table-primary">
                        <tr style={{ borderBottom: "2px solid #3f8efc" }}>
                            <th className="table-lines">Product</th>
                            <th className="table-lines">Batch Number</th>
                            <th className="table-lines">Quantity</th>
                            <th className="table-lines">Expiry Date</th>
                        </tr>
                        </thead>
                        <tbody >
                        {expiringSoon.map((expiry) => (
                            <tr className="table-lines">
                                <td className="table-lines">{expiry.productName}</td>
                                <td className="table-lines">{expiry.batchNumber}</td>
                                <td className="table-lines">{expiry.quantity}</td>
                                <td className="table-lines">{new Date(expiry.expiryDate).toISOString().split("T")[0]}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Container> */}
            
            {/* <Container fluid className="dashboard-container">
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
                                className={`submenu ${
                                    activeSection === index ? "submenu-active" : ""
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
            </Container> */}

            <Container
                className="expiring-lowStock-container"
                style={{marginTop: "20px", marginLeft: "20px", height: `${0.8*windowSize.height}px`, dispay: "flex", flexDirection: "column", overflowY: "scroll"}}
            >
                <div>
                    {lowStockProducts.length > 0 && (
                        <div className="warning-mark">⚠</div>
                    )}
                    <h2 className="warning-text">Low Stock</h2>
                    <table style={{fontSize: '0.7rem', borderCollapse: "collapse"}}>
                        <thead className="table-primary">
                        <tr style={{ borderBottom: "2px solid #3f8efc" }}>
                            <th className="table-lines">Product</th>
                            <th className="table-lines">Quantity</th>
                            <th className="table-lines">Re-order Level</th>
                        </tr>
                        </thead>
                        <tbody>
                        {lowStockProducts.map((lowStock) => (
                            <tr className="table-lines">
                                <td className="table-lines">{lowStock.productName}</td>
                                <td className="table-lines">{lowStock.totalQuantity}</td>
                                <td className="table-lines">{lowStock.reorderLevel}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Container>

            {/* <Container
                className="expiring-lowStock-container"
                style={{marginTop: "20px", marginLeft: "20px", height: `${0.8*windowSize.height}px`, dispay: "flex", flexDirection: "column", overflowY: "scroll"}}
            >
                <div>
                    {lowStockProducts.length > 0 && (
                        <div className="warning-mark">⚠</div>
                    )}
                    <h2 className="warning-text">Low Stock</h2>
                    <table style={{fontSize: '0.7rem', borderCollapse: "collapse"}}>
                        <thead className="table-primary">
                        <tr style={{ borderBottom: "2px solid #3f8efc" }}>
                            <th className="table-lines">Product</th>
                            <th className="table-lines">Quantity</th>
                            <th className="table-lines">Re-order Level</th>
                        </tr>
                        </thead>
                        <tbody>
                        {lowStockProducts.map((lowStock) => (
                            <tr className="table-lines">
                                <td className="table-lines">{lowStock.productName}</td>
                                <td className="table-lines">{lowStock.totalQuantity}</td>
                                <td className="table-lines">{lowStock.reorderLevel}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Container> */}
        </div>
    );

    
}

export default AdminDashboard;