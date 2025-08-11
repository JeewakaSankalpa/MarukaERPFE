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
} from "react-icons/fa";

function NewSideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

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
      submenus: [{ name: "Home", path: "/dashboard" }],
    },
    {
      title: "Project",
      icon: <FaProjectDiagram />,
      submenus: [
        { name: "New Project", path: "/projects/create" },
        { name: "Workflow Management", path: "/projects/workflow" },
        { name: "Manage Projects", path: "/projects/search" },
        // { name: "View Projects", path: "/projects/edit/:id" },
        { name: "Return Goods", path: "/projects/edit/:id" },
      ],
    },
    {
      title: "Inventory",
      icon: <FaBoxes />,
      submenus: [
        { name: "Add Inventory", path: "/inventory/dashboard" },
        // { name: "Add Item", path: "/item/add" },
        // { name: "Add Inventory", path: "/inventory/add" },
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
        { name: "Add Customers", path: "/customer/create" },
        { name: "Search Customers", path: "/customer/view" },
      ],
    },
  ];

  const sideBarStyle = {
    transition: "width 0.3s ease",
    backgroundColor: `${Colors.sideBar}`, // blue-900
    color: "white",
    height: "100vh",
    width: collapsed ? "50px" : "200px",
    overflow: "hidden",
    position: "relative",
  };

  const buttonStyle = {
    display: "block",
    width: "100%",
    textAlign: "left",
    // padding: "10px",
    // marginLeft: "10px",
    // marginRight: "10px",
    marginTop: "2px",    
    marginBottom: "1px",
    // backgroundColor: "transparent",
    backgroundColor: `${Colors.mainBlue}`,
    border: "none",
    color: "white",
    cursor: "pointer",
  };

  const subMenuStyle = {
    paddingLeft: "20px",
    fontSize: "14px",
    marginBottom: "5px",
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
            padding: "5px",
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
              {/* <Button style={buttonStyle}>{menu.title}</Button> */}

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
                <button style={hoveredSubmenuStyle}>
                  {menu.submenus.map((sub, subIdx) => (
                    <button
                      key={subIdx}
                      style={{
                        padding: "6px 12px",
                        marginBottom: "4px",
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
              {/* {!collapsed && (
                <div>
                  {menu.submenus.map((sub, subIdx) => (
                    <Button
                      key={subIdx}
                      style={subMenuStyle}
                      onClick={() => navigate(sub.path)}
                    >
                      {sub.name}
                    </Button>
                  ))}
                </div>
              )} */}
              {!collapsed && (
                <div>
                  {menu.submenus.map((sub, subIdx) => {
                    const isActive = location.pathname === sub.path;

                    return (
                      <Button
                        key={subIdx}
                        style={{
                          ...subMenuStyle,
                          // backgroundColor: isActive ? "#f0f0f0" : Colors.mainBlue,
                          backgroundColor: isActive ? Colors.white : "transparent",
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
