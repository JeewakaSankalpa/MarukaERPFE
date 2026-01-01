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

import { MenuConfig } from "../../resources/MenuConfig";

function NewSideBar({ isMobileOpen = false, onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Role Access
  const userRole = localStorage.getItem("role") || "EMPLOYEE";
  const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");

  const hasAccess = (item) => {
    // If no restrictions, accessible
    if (!item.roles) return true;

    // 1. Role Check (Must match one of the allowed roles)
    const roleMatch = item.roles.includes(userRole);
    if (!roleMatch) return false;

    // 2. Module/ID Check
    // If Admin/Manager, do we skip module check? 
    // User said: "Admin manager and employee all. Acces to modules should be managed based on allowed criterial."
    // So we apply STRICT check for everyone?
    // "Admin should have system config access. and access to any other modules he/she is allowed"
    // THIS IMPLIES: Admin isn't omnipotent, but has specific grants? 
    // OR Admin implicitly has everything? Usually Admin has everything.
    // Let's assume ADMIN has everything for now to avoid locking them out.
    // ADMIN Access Note: User requested strict module checks for Admin too.
    // So we do NOT return true for ADMIN automatically anymore.
    // if (userRole === "ADMIN") return true;

    // For others, if the item has an ID, we check if it's in their list.
    // If it's a top-level menu (e.g. Projects), we simply check if they have ANY child OR the parent ID?
    // Implementation Plan said: "user.moduleAccess.includes(menuItem.id)"
    // If undefined ID (like Home?), pass.
    if (!item.id || item.id === "home") return true;

    // Check if ID is in access list
    // Also, legacy support: if they have "PROJECTS" (old style), maybe map it? 
    // For now, strict new ID check.
    // Check if ID is in access list
    const hasPermission = userModules.includes(item.id);

    // DEBUG LOG
    if (item.id === "inventory") {
      console.log(`Checking Access: ${item.title} (${item.id}) - Role: ${userRole}, HasPerm: ${hasPermission}, Modules:`, userModules);
    }

    return hasPermission;
  };

  const iconMap = {
    "FaHome": <FaHome size={18} />,
    "FaProjectDiagram": <FaProjectDiagram size={18} />,
    "FaBoxes": <FaBoxes size={18} />,
    "FaChartLine": <FaChartLine size={18} />,
    "FaUsers": <FaUsers size={18} />,
    "FaBriefcase": <FaBriefcase size={18} />,
    "FaCogs": <FaCogs size={18} />,
  };

  const menus = MenuConfig.map(menu => ({
    ...menu,
    icon: iconMap[menu.icon] || <FaHome size={18} />, // Fallback

    submenus: menu.subItems.map(item => ({ ...item, name: item.title })) // Map 'title' to 'name' to fix display issue
  })).map(menu => {
    // Filter submenus first
    const visibleSubmenus = menu.submenus.filter(sub => hasAccess(sub) && !sub.hidden);

    // If no filtered submenus, do we show parent? 
    // Only if parent itself is accessible AND (has submenus OR is a leaf?)
    // Actually, usually if all children are hidden, hide parent.
    // Let's check parent access first
    if (!hasAccess(menu)) return null;
    if (menu.hidden) return null; // Hide parent if marked hidden

    // If parent has access, show it. 
    return { ...menu, submenus: visibleSubmenus };
  }).filter(Boolean); // Remove nulls

  const handleMobileNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <div
      className={`sidebar-container no-print ${isMobileOpen ? 'mobile-open' : ''}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%", // Fit parent (main-content), not viewport
        background: `linear-gradient(180deg, ${Colors.sideBar} 0%, #0f172a 100%)`,
        width: collapsed ? "64px" : "240px",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease-in-out",
        color: "#fff",
        boxShadow: "4px 0 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
        // position: 'sticky', // Not needed in flex layout
        // top: 0
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
            <div
              className="d-flex align-items-center cursor-pointer hover-opacity-80"
              onClick={() => navigate('/employee/profile')}
              title="Go to My Profile"
              style={{ cursor: 'pointer' }}
            >
              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                {userRole.charAt(0)}
              </div>
              <div className="ms-2 lh-1 text-truncate" style={{ maxWidth: '120px' }}>
                <div className="fw-semibold small text-light">{userRole}</div>
                <div className="text-muted" style={{ fontSize: '10px' }}>View Profile</div>
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
                onClick={() => !collapsed && handleMobileNav(menu.submenus[0]?.path || menu.path)}
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
                        onClick={(e) => { e.stopPropagation(); handleMobileNav(sub.path); }}
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
                      onClick={() => handleMobileNav(sub.path)}
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
