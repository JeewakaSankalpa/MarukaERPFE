import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import Colors from "../resources/Colors";
import api from "../services/api"; // Ensure this is correctly set up

const Login = () => {
    const [show, setShow] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate(); // ✅ React Router navigation

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const requestData = { username, password };

        try {
            const response = await api.post("/user/login", requestData);

            if (response.data && response.data.token) {
                const userType = response.data.role; // Assuming role is sent in response

                localStorage.setItem("firstName", response.data.firstName);
                localStorage.setItem("lastName", response.data.lastName);
                localStorage.setItem("username", username);
                localStorage.setItem("userType", userType); // ✅ Store user role

                login(response.data.token);
                setShow(false);

                // ✅ Redirect based on user type
                if (userType === "c1") {
                    navigate("/CustomerDashboard");
                } else if (userType === "a1") {
                    navigate("/AdminDashboard");
                } else {
                    setError("Invalid user type. Contact support.");
                }
            } else {
                throw new Error("Invalid login credentials");
            }
        } catch (error) {
            setError(error.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.body}>
            {error && <div className="alert alert-danger">{error}</div>}
            <div style={styles.loginContainer}>
                <h2 style={styles.titleStyle}>Maruka Engineering</h2>

                <Modal.Header>
                    <Modal.Title>Welcome!</Modal.Title>
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
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </Form.Group>

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                        className="w-100 mt-3"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </Button>
                </Form>
            </div>

            <ToastContainer />
        </div>
    );
};

const styles = {
    body: {
        background: `linear-gradient(to bottom right, ${Colors.loginBackground1}, ${Colors.loginBackground2})`,
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
    },
    loginContainer: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.white,
        height: "70vh",
        width: "70vh",
        border: "2px solid black",
        borderRadius: "50px",
    },
    titleStyle: {
        color: Colors.mainBlue,
        fontWeight: "bold",
        fontSize: "50px",
        paddingBottom: "40px",
    },
};

export default Login;
