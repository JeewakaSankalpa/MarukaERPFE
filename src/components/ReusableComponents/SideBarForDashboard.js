import React from "react";
import {
  ClipboardList,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Users,
  Puzzle,
  Map,
  Settings,
  LogOut,
} from "lucide-react";

import { FaHome, FaUser, FaCog, FaChartBar } from "react-icons/fa";

const SideBarForDashboard = () => {
  return (
    <div
      style={{
        // width: "16rem", // 64
        width: "20vw",
        height: "100vh",
        backgroundColor: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        // justifyContent: "space-between",
        justifyContent: "center",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 1.5rem",
            // borderBottom: "1px solid #e5e7eb",
          }}
        >
          {/* <div
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
            B
          </div> */}
          {/* <span
            style={{
              fontSize: "1.125rem", // text-lg
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            Maruka Engineering
          </span> */}
        </div>

        <nav
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0 0.5rem",
          }}
        >
          {/* <NavItem icon={<LayoutDashboard size={20} />} label="Boards" />
          <NavItem icon={<Calendar size={20} />} label="Plan Schedule" />
          <NavItem icon={<ClipboardList size={20} />} label="Reporting" active />
          <NavItem icon={<MessageSquare size={20} />} label="Messages" />
          <NavItem icon={<Users size={20} />} label="Team Member" />
          <NavItem icon={<Puzzle size={20} />} label="Tools Plugin" />
          <NavItem icon={<Map size={20} />} label="Roadmap" />
          <NavItem icon={<Settings size={20} />} label="Setting" /> */}

          <NavItem icon={<FaHome size={20} />} label="Home" />
          <NavItem icon={<LayoutDashboard size={20} />} label="Admin" />
          <NavItem icon={<Calendar size={20} />} label="Inventory" />
          <NavItem icon={<FaUser size={20} />} label="Employee" active />
          <NavItem icon={<Users size={20} />} label="Customer" />
          <NavItem icon={<MessageSquare size={20} />} label="Projects" />
          <NavItem icon={<FaChartBar size={20} />} label="Analytics" />
          <NavItem icon={<Settings size={20} />} label="Setting" />
        </nav>
      </div>

      <div style={{ padding: "1rem" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#ef4444",
            backgroundColor: "transparent",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            width: "100%",
            cursor: "pointer",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#fef2f2")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active }) => {
  const baseStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.5rem 1rem",
    borderRadius: "0.375rem",
    width: "100%",
    textAlign: "left",
    backgroundColor: active ? "#dbeafe" : "transparent",
    color: active ? "#2563eb" : "#374151",
    fontWeight: active ? "900" : "normal",
    cursor: "pointer",
  };

  return (
    <button
      style={baseStyle}
      onMouseOver={(e) =>
        !active && (e.currentTarget.style.backgroundColor = "#f3f4f6")
      }
      onMouseOut={(e) =>
        !active && (e.currentTarget.style.backgroundColor = "transparent")
      }
    >
      {icon}
      {label}
    </button>
  );
};

export default SideBarForDashboard;
