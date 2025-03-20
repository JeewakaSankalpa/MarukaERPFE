import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import {Form, Modal} from "react-bootstrap";

const SignupPage = () => {
    const [user, setUser] = useState({ username: "", password: "", firstName: "", lastName: "" });
    const navigate = useNavigate();

    const handleSignup = async () => {
        const response = await authService.createUser({ ...user, role: "c1" }); // Always create a customer
        if (response) {
            alert("Account created successfully!");
            navigate("/login");
        } else {
            alert("Signup failed!");
        }
    };

    return (
        <div>
            <h2>Create Account</h2>
            <Modal.Header>
                <Modal.Title>Create Account</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleLogin}>
                <Form.Group controlId="formUsername">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        required
                    />
                </Form.Group>

                <Form.Group controlId="formPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter username"
                        required
                    />
                </Form.Group>
            </Form>

            {/*<input type="text" placeholder="Username" onChange={(e) => setUser({ ...user, username: e.target.value })} />*/}
            {/*<input type="password" placeholder="Password" onChange={(e) => setUser({ ...user, password: e.target.value })} />*/}
            <input type="text" placeholder="First Name" onChange={(e) => setUser({ ...user, firstName: e.target.value })} />
            <input type="text" placeholder="Last Name" onChange={(e) => setUser({ ...user, lastName: e.target.value })} />
            <button onClick={handleSignup}>Sign Up</button>
        </div>
    );
};

export default SignupPage;
