import logo from "./logo.svg";
import "./components/Styles/App.css";

import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import CustomerDashboard from "./components/Customer/CustomerDashboard";
// import EmployerDashboard from './components/Users/UserEdit';
import InventoryAdd from "./components/Inventory/InventoryAdd";
import InventoryView from "./components/Inventory/InventoryView";
import Header from "./components/ReusableComponents/Header";
import NewSideBar from "./components/ReusableComponents/NewSideBar";
import InventoryReturn from "./components/Inventory/InventoryReturn";
import ReturnToInventory from "./components/Project/ReturnToInventory";
import UserCreate from "./components/Users/UserCreate";
import UserSearch from "./components/Users/UserSearch";
import CustomerCreate from "./components/Customer/CustomerCreate";
import CustomerView from "./components/Customer/CustomerView";
import ProjectCreate from "./components/Project/ProjectCreate";
import ProjectSearch from "./components/Project/ProjectSearch";
import ItemAdd from "./components/Inventory/ItemAdd";
import InventoryDashboard from "./components/Inventory/InventoryDashboard";

// import Sidebar from './components/Sidebar';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

function App() {
  // const {isAuthenticated} = useAuth();

//   const location = useLocation();
//   const hideLayoutForRoutes = ["/", "/login"];

//   const isLoginPage = hideLayoutForRoutes.includes(location.pathname);

  return (
    <Router>
      <div className="app-container">
        {/*{isAuthenticated}*/}
        {/* {!isLoginPage && <Header /> } */}
        {<Header />}

        <div className="main-content">
          {<NewSideBar />}
          <Routes>
            {/* <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard"/> : <Login/>}/> */}
            {/*<Route path="/" element={<Login/>}/>*/}
            {/*<Route path="/dashboard" element={isAuthenticated ? <DashboardRe/> : <Navigate to="/"/>}/>*/}

            <Route path="/" element={<Login />} />
            {/* <Route path="/" element={<Dashboard />} /> */}
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/customerDashboard" element={<CustomerDashboard />} />

            {/* <Route path="/userDashboard" element={<EmployerDashboard />} /> */}
            <Route path="/user/create" element={<UserCreate mode="create" />} />
            <Route path="/user/search" element={<UserSearch />} />
            <Route path="/user/edit/:id" element={<UserCreate mode="edit" />} />
            <Route path="/user/view/:id" element={<UserCreate mode="view" />} />

            <Route path="/inventory/dashboard" element={<InventoryDashboard />} />
            <Route path="/item/add" element={<ItemAdd />} />
            <Route path="/inventory/add" element={<InventoryAdd />} />
            <Route path="/inventory/search" element={<InventoryView />} />
            <Route path="/inventory/return" element={<InventoryReturn />} />

            <Route path="/projects/create" element={<ProjectCreate mode="create" />} />
            <Route path="/projects/search" element={<ProjectSearch />} />
            <Route path="/projects/edit/:id" element={<ProjectCreate mode="edit" />} />
            <Route path="/projects/view/:id" element={<ProjectCreate mode="view" />} />

            <Route path="/customer/create" element={<CustomerCreate />} />
            <Route path="/customer/view" element={<CustomerView />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
