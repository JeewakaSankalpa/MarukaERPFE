import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Colors from "../../resources/Colors";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaBoxes, FaBriefcase, FaHome, FaProjectDiagram, FaUsers } from "react-icons/fa";

function NewSideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

  const navigate = useNavigate();


  // const menus = [
  //   {
  //     title: "Project",
  //     submenus: ["New Project", "View Projects"],
  //   },
  //   {
  //     title: "Inventory",
  //     submenus: ["Add Inventory", "Return Inventory", "Inventory Summary"],
  //   },
  //   {
  //     title: "Employee",
  //     submenus: ["Add Employee", "View Employees", "Attendance"],
  //   },
  // ];

  const menus = [
    {
    title: "Home",
    icon: <FaHome />,
    submenus: [
      { name: "Home", path: "/dashboard" },
    ],
  },
  {
    title: "Project",
    icon: <FaProjectDiagram />,
    submenus: [
      { name: "New Project", path: "/Projects/new" },
      { name: "View Projects", path: "/projects/view" },
      { name: "Return Goods", path: "/projects/return" },
    ],
  },
  {
    title: "Inventory",
    icon: <FaBoxes />,
    submenus: [
      { name: "Add Inventory", path: "/inventory/add" },
      { name: "Search Inventory", path: "/inventory/search" },
      { name: "Return Inventory", path: "/inventory/return" },
    ],
  },
  {
    title: "Users",
    icon: <FaUsers />,
    submenus: [
      { name: "Create Users", path: "/user/create" },
      { name: "Search Users", path: "/user/search" },
    ],
  },
  {
    title: "Customer",
    icon: <FaBriefcase />,
    submenus: [
      { name: "Add Customers", path: "/user/create" },
      { name: "Search Customers", path: "/user/search" },
    ],
  },
];

  const sideBarStyle = {
    transition: "width 0.3s ease",
    backgroundColor: `${Colors.sideBar}`, // blue-900
    color: "white",
    height: "100vh",
    width: collapsed ? "60px" : "200px",
    overflow: "hidden",
    position: "relative",
  };

  const buttonStyle = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px",
    backgroundColor: "transparent",
    border: "none",
    color: "white",
    cursor: "pointer",
  };

  const subMenuStyle = {
    paddingLeft: "20px",
    fontSize: "14px",
    // color: "#d1d5db", // gray-300
    color: `${Colors.black}`,
  };

  const hoveredSubmenuStyle = {
    position: "absolute",
    left: "60px",
    // backgroundColor: "#1e40af", // blue-800
    backgroundColor: `${Colors.white}`,
    borderRadius: "4px",
    padding: "4px 0",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 10,
  };

  return (
  <div style={{ display: "flex" }}>
    {/* Sidebar */}
    <div style={sideBarStyle}>
      {/* Collapse/Expand Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px",
          cursor: "pointer",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </div>

      {/* Menu Items */}
      <div>
        {menus.map((menu, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoveredMenu(menu.title)}
            onMouseLeave={() => setHoveredMenu(null)}
            style={{ position: "relative" }}
          >
            <Button style={buttonStyle}>{menu.title}</Button>

            {/* Submenus (collapsed & hovered) */}
            {hoveredMenu === menu.title && collapsed && (
              <button style={hoveredSubmenuStyle}>
                {menu.submenus.map((sub, subIdx) => (
                  <button
                    key={subIdx}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      color: "black",
                    }}
                  >
                    {sub.name}
                  </button>
                ))}
              </button>
            )}

            {/* Submenus (expanded) */}
            {!collapsed && (
              <div>
                {menu.submenus.map((sub, subIdx) => (
                  <Button key={subIdx} style={subMenuStyle} onClick={() => navigate(sub.path)}>
                    {sub.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);


  // return React.createElement(
  //   "div",
  //   { style: { display: "flex" } },
  //   // Sidebar
  //   React.createElement(
  //     "div",
  //     { style: sideBarStyle },
  //     // Collapse/Expand Button
  //     React.createElement(
  //       "div",
  //       {
  //         style: {
  //           display: "flex",
  //           justifyContent: "flex-end",
  //           padding: "8px",
  //           cursor: "pointer",
  //         },
  //         onClick: () => setCollapsed(!collapsed),
  //       },
  //       collapsed
  //         ? React.createElement(ChevronRight, { size: 20 })
  //         : React.createElement(ChevronLeft, { size: 20 })
  //     ),

  //     // Menu Items
  //     React.createElement(
  //       "div",
  //       null,
  //       menus.map((menu, idx) =>
  //         React.createElement(
  //           "div",
  //           {
  //             key: idx,
  //             onMouseEnter: () => setHoveredMenu(menu.title),
  //             onMouseLeave: () => setHoveredMenu(null),
  //             style: { position: "relative" },
  //           },
  //           React.createElement("button", { style: buttonStyle }, menu.title),

  //           // Submenus (collapsed & hovered)
  //           hoveredMenu === menu.title && collapsed
  //             ? React.createElement(
  //                 "button",
  //                 { style: hoveredSubmenuStyle },
  //                 menu.submenus.map((sub, subIdx) =>
  //                   React.createElement(
  //                     "button",
  //                     {
  //                       key: subIdx,
  //                       style: {
  //                         padding: "6px 12px",
  //                         cursor: "pointer",
  //                         color: "white",
  //                       },
  //                     },
  //                     sub
  //                   )
  //                 )
  //               )
  //             : null,

  //           // Submenus (expanded)
  //           !collapsed
  //             ? React.createElement(
  //                 "div",
  //                 null,
  //                 menu.submenus.map((sub, subIdx) =>
  //                   React.createElement(
  //                     "div",
  //                     {
  //                       key: subIdx,
  //                       style: subMenuStyle,
  //                     },
  //                     sub
  //                   )
  //                 )
  //               )
  //             : null
  //         )
  //       )
  //     )
  //   )
  // );
}

export default NewSideBar;
