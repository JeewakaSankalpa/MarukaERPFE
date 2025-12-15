import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Colors from "../../resources/Colors";
import { Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBoxes,
  FaBriefcase,
  FaHome,
  FaProjectDiagram,
  FaUsers,
  FaCogs,
} from "react-icons/fa";
import NotificationBell from "./NotificationBell";

function NewSideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Determine Role & Modules
  const userRole = localStorage.getItem("role") || "EMPLOYEE";
  const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");

  const hasAccess = (item) => {
    const roleMatch = item.roles && item.roles.includes(userRole);
    const moduleMatch = item.modules && item.modules.some(m => userModules.includes(m));
    return roleMatch || moduleMatch;
  };

  const allMenus = [
    {
      title: "Home",
      icon: <FaHome />,
      roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE", "CUSTOMER"],
      submenus: [{ name: "Home", path: "/admin" }],
    },
    {
      title: "Project",
      icon: <FaProjectDiagram />,
      roles: ["ADMIN", "MANAGER"],
      modules: ["PROJECTS"],
      submenus: [
        { name: "New Project", path: "/projects/create" },
        { name: "Workflow Management", path: "/projects/workflow" },
        { name: "Manage Projects", path: "/projects/search" },
        { name: "Return Goods", path: "/projects/edit/:id" },
        { name: "Project Estimation", path: "/projects/estimation" },
      ],
    },
    {
      title: "Inventory",
      icon: <FaBoxes />,
      roles: ["ADMIN", "MANAGER", "STORE_KEEPER"],
      modules: ["INVENTORY"],
      submenus: [
        { name: "Manage Products", path: "/product/create" },
        { name: "Purchase Requests", path: "/inventory/pr" },
        { name: "Search Inventory", path: "/inventory/search" },
        { name: "Return Inventory", path: "/inventory/return" },
        { name: "Reports", path: "/reports" },
      ],
    },
    {
      title: "Stores",
      icon: <FaBoxes />,
      roles: ["ADMIN", "STORE_KEEPER"],
      modules: ["INVENTORY"], // Stores often part of Inventory module
      submenus: [
        { name: "Stores Planning", path: "/stores/planning" },
        { name: "Pending POs", path: "/stores/pending-to-po" },
        { name: "Transfers", path: "/transfers/inbox" },
        { name: "PO", path: "/pos" },
        { name: "Receive (GRN)", path: "/grn" },
        { name: "View GRNs", path: "/grns" },
        { name: "Create ItemRequests", path: "/item/requests" },
        { name: "View Item Requests", path: "/stores/fulfil-requests" },
      ],
    },
    {
      title: "HR & Payroll",
      icon: <FaUsers />,
      roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
      modules: ["HR", "PAYROLL", "ATTENDANCE", "LEAVE_MANAGEMENT", "EMPLOYEES"],
      submenus: [
        { name: "Attendance", path: "/attendance", modules: ["ATTENDANCE", "HR"] },
        { name: "Leave Requests", path: "/leave", modules: ["LEAVE_MANAGEMENT", "HR"] },
        { name: "Employee Directory", path: "/employee/list", roles: ["ADMIN", "HR", "MANAGER"], modules: ["EMPLOYEES", "HR"] },
        { name: "Add Employee", path: "/employee/create", roles: ["ADMIN", "HR"], modules: ["HR"] },
        { name: "Salary Management", path: "/salary", roles: ["ADMIN", "HR"], modules: ["PAYROLL", "HR"] },
        { name: "Global HR Configs", path: "/hr/config", roles: ["ADMIN", "HR"], modules: ["HR"] },
      ].filter(sub => hasAccess(sub)),
    },
    {
      title: "Users",
      icon: <FaUsers />,
      roles: ["ADMIN"],
      submenus: [
        { name: "Create Users", path: "/user/create" },
        { name: "Search Users", path: "/user/search" },
      ],
    },
    {
      title: "Department",
      icon: <FaUsers />,
      roles: ["ADMIN", "HR"],
      modules: ["HR"],
      submenus: [
        { name: "Department Management", path: "/departments" },
        { name: "Create new Department", path: "/departments/new" },
      ],
    },
    {
      title: "Supplier",
      icon: <FaUsers />,
      roles: ["ADMIN", "MANAGER"],
      modules: ["INVENTORY"], // Suppliers often linked to Inventory/PO
      submenus: [
        { name: "Create Supplier", path: "/supplier/create" },
        { name: "Search Supplier", path: "/supplier/search" },
      ],
    },
    {
      title: "Customer",
      icon: <FaBriefcase />,
      roles: ["ADMIN", "SALES", "MANAGER"],
      modules: ["CUSTOMERS", "SALES"],
      submenus: [
        { name: "Add Customers", path: "/customer/create" },
        { name: "Search Customers", path: "/customer/view" },
      ],
    },
    {
      title: "Finance & Assets",
      icon: <FaBriefcase />,
      roles: ["ADMIN", "MANAGER"],
      modules: ["INVENTORY", "PROJECTS"],
      submenus: [
        { name: "Asset Register", path: "/assets" },
      ],
    },
    {
      title: "Settings",
      icon: <FaCogs />,
      roles: ["ADMIN"],
      submenus: [
        { name: "System Configuration", path: "/admin/config" },
      ],
    },
  ];

  const menus = allMenus.filter(m => hasAccess(m));

  const sideBarStyle = {
    transition: "width 0.3s ease",
    backgroundColor: `${Colors.sideBar}`,
    color: "white",
    height: "calc(100vh - 4rem)",
    width: collapsed ? "50px" : "200px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  };

  const buttonStyle = {
    display: "block",
    width: "100%",
    textAlign: "left",
    marginTop: "2px",
    marginBottom: "1px",
    backgroundColor: `${Colors.mainBlue}`,
    border: "none",
    color: "white",
    cursor: "pointer",
  };

  const subMenuStyle = {
    paddingLeft: "20px",
    fontSize: "14px",
    marginBottom: "5px",
    color: `${Colors.black}`,
  };

  const hoveredSubmenuStyle = {
    position: "absolute",
    left: "60px",
    backgroundColor: `${Colors.white}`,
    borderRadius: "4px",
    padding: "4px 0",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 10,
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Sidebar */}
      <div style={sideBarStyle}>
        {/* Collapse/Expand Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "5px",
            cursor: "pointer",
            flexShrink: 0,
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </div>

        {/* Notification Bell (Visible when expanded or handled via overlay) */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <div className="d-flex align-items-center text-white">
              <NotificationBell />
              <span className="ms-2 small">Notifications</span>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "6px" }}>
          {menus.map((menu, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredMenu(menu.title)}
              onMouseLeave={() => setHoveredMenu(null)}
              style={{ position: "relative" }}
            >
              <Button
                style={buttonStyle}
                onClick={() => !collapsed && navigate(menu.submenus[0].path)}
              >
                {menu.icon}
                {!collapsed && (
                  <span style={{ marginLeft: "10px" }}>{menu.title}</span>
                )}
              </Button>

              {/* Submenus (collapsed & hovered) */}
              {hoveredMenu === menu.title && collapsed && (
                <div style={hoveredSubmenuStyle}>
                  {menu.submenus.map((sub, subIdx) => (
                    <div
                      key={subIdx}
                      style={{
                        padding: "6px 12px",
                        marginBottom: "4px",
                        cursor: "pointer",
                        color: "black",
                      }}
                      onClick={() => navigate(sub.path)}
                    >
                      {sub.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Submenus (expanded) */}
              {!collapsed && (
                <div>
                  {menu.submenus.map((sub, subIdx) => {
                    const isActive = location.pathname === sub.path;

                    return (
                      <Button
                        key={subIdx}
                        style={{
                          ...subMenuStyle,
                          backgroundColor: isActive
                            ? Colors.white
                            : "transparent",
                          color: isActive ? Colors.mainBlue : Colors.white,
                          fontWeight: isActive ? "bold" : "normal",
                        }}
                        onClick={() => navigate(sub.path)}
                      >
                        {sub.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NewSideBar;
