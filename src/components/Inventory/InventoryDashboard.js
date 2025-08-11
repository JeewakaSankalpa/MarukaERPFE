import React from "react";
import SideBarForDashboard from "../ReusableComponents/SideBarForDashboard";
import Header from "../ReusableComponents/Header";
import "../Styles/DashboardStyle.css";
import { useNavigate } from "react-router-dom"; // ✅ Import
import { FaBoxes, FaUserPlus } from "react-icons/fa";
import MenuCard from "../ReusableComponents/MenuCard";
import { Button, Container } from "react-bootstrap";
import { AlignCenter, Calendar } from "lucide-react";

const InventoryDashboard = () => {
  const navigate = useNavigate(); // ✅ Hook

  const handleCreateEmployer = () => {
    navigate("/employee/create"); // ✅ Adjust the route if needed
  };

  const MenuList = [
    {
      title: "+ Add Inventory",
      path: "/inventory/add",
      icon: <FaUserPlus />,
    },
    {
      title: "View Inventory",
      path: "/inventory/view",
      // icon: <Calender />,
      icon: <Calendar size={20} />,
    },
    {
      title: "Returns for SUpplier",
      path: "/employee/view",
      // icon: <Calender />,
      icon: <Calendar size={20} />,
    },
    {
      title: "Allocate Goods for Projects",
      path: "/employee/view",
      // icon: <Calender />,
      icon: <Calendar size={20} />,
    },
    {
      title: "Project Returns",
      path: "/employee/view",
      // icon: <Calender />,
      icon: <Calendar size={20} />,
    },
  ];

  // return (
  //   <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
  //     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl">

  //       {/* Tile 1 */}
  //       <button className="bg-white rounded-2xl shadow-md p-10 text-center hover:shadow-lg hover:scale-105 transition-all">
  //         <h2 className="text-2xl font-bold text-gray-700">📦 Inventory</h2>
  //         <p className="mt-2 text-gray-500">Manage stock, view items, and update quantities</p>
  //       </button>

  //       {/* Tile 2 */}
  //       <button className="bg-white rounded-2xl shadow-md p-10 text-center hover:shadow-lg hover:scale-105 transition-all">
  //         <h2 className="text-2xl font-bold text-gray-700">📊 Reports</h2>
  //         <p className="mt-2 text-gray-500">View sales reports, inventory trends, and stats</p>
  //       </button>

  //     </div>
  //   </div>
  // );

  // return (
  //   <Container className="my-5">
  //     <Button className="w-75 mb-3" >
  //       <MenuCard
  //         title="📦 Add Stock"
  //         icon={<FaBoxes />}
  //         path={"/inventory/add"}
  //       />
  //     </Button>

  //     <Button className="w-75 mb-3" >
  //       <MenuCard title="📦 Add Item" icon={<FaBoxes />} path={"/item/add"} />
  //     </Button>
  //   </Container>
  // );

  return (
  <Container
    className="my-5 d-flex flex-column align-items-center justify-content-center"
    style={{ minHeight: "100vh" }} // full screen height for vertical centering
  >
    <Button
      className="w-25 mb-3"
      style={{ paddingRight: "20px", display: "flex", alignItems: "center", justifyContent: "center"}}
    >
      <MenuCard
        title="📦 Add Stock"
        icon={<FaBoxes />}
        path={"/inventory/add"}
      />
    </Button>

    <Button
      className="w-25 mb-3"
      style={{ paddingLeft: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <MenuCard
        title="📦 Add Item"
        icon={<FaBoxes />}
        path={"/item/add"}
      />
    </Button>
  </Container>
);

};

export default InventoryDashboard;
