import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CustomerHome = () => {
    const navigate = useNavigate();

    return (
        <div>
            <h1>Welcome to Our Platform</h1>
            <button onClick={() => navigate("/login")}>Login</button>
            <button onClick={() => navigate("/signup")}>Create Account</button>
        </div>
    );
};

export default CustomerHome;
