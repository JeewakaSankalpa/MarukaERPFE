import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Colors from "../../resources/Colors";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBoxes,
  FaBriefcase,
  FaHome,
  FaProjectDiagram,
  FaUsers,
  FaCogs,
  FaChartLine,
} from "react-icons/fa";
import NotificationBell from "./NotificationBell";

function NewSideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Role Access
  const userRole = localStorage.getItem("role") || "EMPLOYEE";
  const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");

  const hasAccess = (item) => {
    if (!item.roles && !item.modules) return true;
    const roleMatch = item.roles && item.roles.includes(userRole);
    const moduleMatch = item.modules && item.modules.some(m => userModules.includes(m));
    return roleMatch || moduleMatch;
  };

  const allMenus = [
    {
      title: "Home",
      icon: <FaHome size={18} />,
      roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE", "CUSTOMER"],
      submenus: [{ name: "Dashboard", path: "/admin" }],
    },
    {
      title: "Projects",
      icon: <FaProjectDiagram size={18} />,
      roles: ["ADMIN", "MANAGER"],
      modules: ["PROJECTS"],
      submenus: [
        { name: "My Projects", path: "/projects/search" },
        { name: "New Project", path: "/projects/create" },
        { name: "Estimation", path: "/projects/estimation" },
        { name: "Workflow", path: "/projects/workflow" },
      ],
    },
    {
      title: "Inventory",
      icon: <FaBoxes size={18} />,
      roles: ["ADMIN", "MANAGER", "STORE_KEEPER"],
      modules: ["INVENTORY"],
      submenus: [
        { name: "Stock Search", path: "/inventory/search" },
        { name: "Products", path: "/product/create" },
        { name: "Purchase Requests", path: "/inventory/pr" },
        { name: "Internal Requests", path: "/item/requests" },
        { name: "Fulfil Requests", path: "/stores/fulfil-requests" },
        { name: "Returns", path: "/inventory/return" },
        { name: "Reports", path: "/reports" },
      ],
    },
    {
      title: "Procurement",
      icon: <FaChartLine size={18} />,
      roles: ["ADMIN", "STORE_KEEPER"],
      modules: ["INVENTORY"],
      submenus: [
        { name: "Stores Planning", path: "/stores/planning" },
        { name: "Purchase Orders", path: "/pos" },
        { name: "Pending Items", path: "/stores/pending-to-po" },
        { name: "Receive (GRN)", path: "/grn" },
        { name: "GRN History", path: "/grns" },
        { name: "Transfers", path: "/transfers/inbox" },
      ],
    },
    {
      title: "HR & Team",
      icon: <FaUsers size={18} />,
      roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
      modules: ["HR", "PAYROLL"],
      submenus: [
        { name: "Directory", path: "/employee/list", roles: ["ADMIN", "HR"] },
        { name: "Attendance", path: "/attendance" },
        { name: "Leave", path: "/leave" },
        { name: "Payroll", path: "/salary", roles: ["ADMIN", "HR"] },
        { name: "Configuration", path: "/hr/config", roles: ["ADMIN", "HR"] },
      ].filter(sub => hasAccess(sub)),
    },
    {
      title: "Partners",
      icon: <FaBriefcase size={18} />,
      roles: ["ADMIN", "SALES", "MANAGER"],
      submenus: [
        { name: "Customers", path: "/customer/view" },
        { name: "Suppliers", path: "/supplier/search" },
      ],
    },
    {
      title: "Finance",
      icon: <FaBriefcase size={18} />,
      roles: ["ADMIN", "MANAGER"],
      submenus: [
        { name: "Asset Register", path: "/assets" },
      ],
    },
    {
      title: "Settings",
      icon: <FaCogs size={18} />,
      roles: ["ADMIN"],
      submenus: [
        { name: "System Config", path: "/admin/config" },
        { name: "Departments", path: "/departments" },
        { name: "New Department", path: "/departments/new" },
      ],
    },
  ];

  const menus = allMenus.filter(m => hasAccess(m));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: `linear-gradient(180deg, ${Colors.sideBar} 0%, #0f172a 100%)`,
        width: collapsed ? "64px" : "240px",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        color: "#fff",
        boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
        position: 'sticky',
        top: 0
      }}
    >
      {/* Header / Brand */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary bg-opacity-10 bg-black">
        {!collapsed && (
          <h5 className="mb-0 fw-bold text-truncate" style={{ letterSpacing: '0.5px' }}>
            MARUKA <span className="text-info">ERP</span>
          </h5>
        )}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: "pointer", opacity: 0.8 }}
          className="hover-scale"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </div>
      </div>

      {/* User / Notification Area */}
      {!collapsed && (
        <div className="px-3 py-3 border-bottom border-secondary bg-opacity-10 bg-black mb-2">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
                style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                {userRole.charAt(0)}
              </div>
              <div className="ms-2 lh-1 text-truncate" style={{ maxWidth: '120px' }}>
                <div className="fw-semibold small">{userRole}</div>
                <div className="text-muted" style={{ fontSize: '10px' }}>Active</div>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Menu List */}
      <div className="flex-grow-1 overflow-auto py-2 custom-scrollbar">
        {menus.map((menu, idx) => {
          const isActiveGroup = menu.submenus.some(sub => location.pathname.startsWith(sub.path) || location.pathname === sub.path);

          return (
            <div
              key={idx}
              className="position-relative px-2 mb-1"
              onMouseEnter={() => setHoveredMenu(menu.title)}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              {/* Main Menu Item */}
              <div
                className={`d-flex align-items-center px-3 py-2 rounded-3 cursor-pointer ${isActiveGroup ? 'bg-primary bg-opacity-25 text-white' : 'text-white-50 hover-bg-white-10'}`}
                style={{
                  transition: 'all 0.2s',
                  backgroundColor: isActiveGroup ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => !collapsed && navigate(menu.submenus[0].path)}
              >
                <span className={isActiveGroup ? 'text-info' : ''}>{menu.icon}</span>
                {!collapsed && (
                  <span className="ms-3 fw-medium small" style={{ flex: 1 }}>{menu.title}</span>
                )}
              </div>

              {/* Submenus (Expanded Mode) */}
              {!collapsed && isActiveGroup && (
                <div className="mt-1 ms-4 ps-2 border-start border-white-50">
                  {menu.submenus.map((sub, sIdx) => {
                    const isSubActive = location.pathname === sub.path;
                    return (
                      <div
                        key={sIdx}
                        className={`py-1 px-2 rounded small cursor-pointer mb-1 ${isSubActive ? 'text-white fw-bold bg-white bg-opacity-10' : 'text-white-50'}`}
                        onClick={(e) => { e.stopPropagation(); navigate(sub.path); }}
                        style={{
                          transition: '0.2s',
                          fontSize: '0.85rem'
                        }}
                      >
                        {sub.name}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Hover Popover (Collapsed Mode) */}
              {collapsed && hoveredMenu === menu.title && (
                <div
                  style={{
                    position: 'fixed',
                    left: '64px',
                    top: document.querySelector(`div[title="${menu.title}"]`) ? 'auto' : undefined, // simple hack, better via ref
                    backgroundColor: '#1e293b',
                    borderRadius: '0 8px 8px 0',
                    padding: '8px 0',
                    boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
                    zIndex: 9999,
                    minWidth: '180px'
                  }}
                >
                  <div className="px-3 py-2 fw-bold border-bottom border-light border-opacity-10 text-info">
                    {menu.title}
                  </div>
                  {menu.submenus.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className="px-3 py-2 text-white-50 hover-text-white cursor-pointer small"
                      onClick={() => navigate(sub.path)}
                    >
                      {sub.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer / Logout Area (Optional) */}
      {!collapsed && (
        <div className="p-3 text-center text-white-50 small border-top border-white-10">
          © 2024 Maruka ERP
        </div>
      )}
    </div>
  );
}

export default NewSideBar;
