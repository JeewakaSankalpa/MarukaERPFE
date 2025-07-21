import React, { useState } from "react";
import { FaHome, FaUser, FaCog, FaChartBar } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);

  const menuItems = [
    {
      id: 1,
      icon: <FaHome />,
      title: "Dashboard",
      route: "/",
      subMenu: ["Overview", "Stats", "Reports"],
    },
    {
      id: 2,
      icon: <FaUser />,
      title: "Users",
      route: "/",
      subMenu: ["Add User", "Manage Users", "Profile"],
    },
    {
      id: 3,
      icon: <FaCog />,
      title: "Settings",
      route: "/",
      subMenu: ["General", "Security", "Notifications"],
    },
    {
      id: 4,
      icon: <FaChartBar />,
      title: "Analytics",
      route: "/",
      subMenu: ["Traffic", "Sales", "Performance"],
    },
  ];

  return (
    <div
      style={{
        width: "10vw",
        height: "100vh",
        backgroundColor: "#1f2937", // Tailwind's gray-900
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "16px",
        position: "relative",
      }}
    >
      {menuItems.map((item) => (
        <div
          key={item.id}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            padding: "12px 0",
            cursor: "pointer",
          }}
          onMouseEnter={() => setActiveMenu(item.id)}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <div style={{ fontSize: "20px" }}>{item.icon}</div>
          {activeMenu === item.id && (
            <div
              style={{
                position: "absolute",
                left: "100%",
                marginLeft: "8px",
                backgroundColor: "#2d3748", // gray-800
                color: "#fff",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                padding: "8px",
                width: "160px",
                zIndex: 10,
              }}
            >
              {item.subMenu.map((sub, index) => (
                <div
                  key={index}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#374151"; // gray-700
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {sub}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;

// ---------------------------------------------------------------------------------------------------------

// import React, { useState } from "react";
// import { FaHome, FaUser, FaCog, FaChartBar } from "react-icons/fa";

// const Sidebar = () => {
//     const [activeMenu, setActiveMenu] = useState(null);

//     const menuItems = [
//         { id: 1, icon: <FaHome />, title: "Dashboard", subMenu: ["Overview", "Stats", "Reports"] },
//         { id: 2, icon: <FaUser />, title: "Users", subMenu: ["Add User", "Manage Users", "Profile"] },
//         { id: 3, icon: <FaCog />, title: "Settings", subMenu: ["General", "Security", "Notifications"] },
//         { id: 4, icon: <FaChartBar />, title: "Analytics", subMenu: ["Traffic", "Sales", "Performance"] },
//     ];

//     return (
//         <div className="w-16 h-screen bg-gray-900 text-white flex flex-col items-center py-4 relative">
//             {menuItems.map((item) => (
//                 <div
//                     key={item.id}
//                     className="relative flex flex-col items-center w-full py-3 cursor-pointer group"
//                     onMouseEnter={() => setActiveMenu(item.id)}
//                     onMouseLeave={() => setActiveMenu(null)}
//                 >
//                     <div className="text-xl">{item.icon}</div>
//                     {activeMenu === item.id && (
//                         <div className="absolute left-full ml-2 bg-gray-800 text-white rounded-lg shadow-lg p-2 w-40">
//                             {item.subMenu.map((sub, index) => (
//                                 <div key={index} className="p-2 hover:bg-gray-700 rounded-md">
//                                     {sub}
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             ))}
//         </div>
//     );
// };

// export default Sidebar;
