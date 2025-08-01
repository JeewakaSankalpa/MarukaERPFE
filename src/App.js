import logo from './logo.svg';
import './components/Styles/App.css';

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import CustomerDashboard from './components/Customer/CustomerDashboard';
import EmployerDashboard from './components/Users/UserEdit';
import InventoryAdd from './components/Inventory/InventoryAdd';
import InventoryView from './components/Inventory/InventoryView';
import Header from './components/ReusableComponents/Header';
import NewSideBar from './components/ReusableComponents/NewSideBar';
import InventoryReturn from './components/Inventory/InventoryReturn';
import ReturnToInventory from './components/Project/ReturnToInventory';
import UserCreate from './components/Users/UserCreate';
import UserSearch from './components/Users/UserSearch';

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

    return (
        <Router>
            <div className="app-container">
                {/*{isAuthenticated}*/}
                {<Header /> }
                
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

                        <Route path="/userDashboard" element={<EmployerDashboard />} />
                        <Route path="/user/create" element={<UserCreate mode="create"/>} />
                        <Route path="/user/search" element={<UserSearch />} />
                        <Route path="/user/edit/:id" element={<UserCreate mode="edit"/>} />
                        <Route path="/user/view/:id" element={<UserCreate mode="view"/>} />

                        <Route path="/inventory/add" element={<InventoryAdd />} />
                        <Route path="/inventory/search" element={<InventoryView />} />
                        <Route path="/inventory/return" element={<InventoryReturn />} />

                        <Route path="/projects/return" element={<ReturnToInventory />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
