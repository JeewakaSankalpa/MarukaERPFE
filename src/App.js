// import logo from './logo.svg';
import './styleSheets/App.css';
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './components/Styles/App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import CustomerDashboard from './components/Customer/CustomerDashboard';
import EmployerDashboard from './components/Employee/EmployeeDashboard';
import EmployerCreate from './components/Employee/EmployeeCreate';
import InventoryDashboard from './components/Inventory/InventoryDashboard';

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
                <div className="main-content">
                    <Routes>
                        {/* <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard"/> : <Login/>}/> */}
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/customer/dashboard" element={<CustomerDashboard />} />

                        <Route path="/employee/dashboard" element={<EmployerDashboard />} />
                        <Route path="/employee/create" element={<EmployerCreate mode="create"/>} />
                        <Route path="/employee/edit/:id" element={<EmployerCreate mode="edit"/>} />
                        <Route path="/employee/search" element={<EmployerCreate />} />

                        <Route path="/inventory/dashboard" element={<InventoryDashboard />} />
                        {/*<Route path="/" element={<Login/>}/>*/}
                        {/*<Route path="/dashboard" element={isAuthenticated ? <DashboardRe/> : <Navigate to="/"/>}/>*/}
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
