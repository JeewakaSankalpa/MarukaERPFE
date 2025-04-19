import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
// import api from "../services/api";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
import Colors from "../resources/Colors";

const Login = () => {
    const [show, setShow] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [store, setStore] = useState(null);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();

    // useEffect(() => {
    //     const fetchStores = async () => {
    //         try {
    //             const response = await api.get("/store/all");
    //             setStores(
    //                 response.data.map((store) => ({
    //                     value: store.name,
    //                     label: store.name,
    //                 }))
    //             );
    //         } catch (error) {
    //             console.error("Failed to fetch stores:", error);
    //         }
    //     };
    //     fetchStores();
    // }, []);

    // const showError = () => {
    //     toast.error("An error occurred!", {
    //         // position: toast.POSITION.TOP_CENTER,
    //         autoClose: 3000,
    //     });
    // };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const requestData = {
            username,
            password,
            storeName: store.value, // Pass the store name instead of ID
        };

        // console.log("Sending request:", requestData); // Print the request object

        try {
            const response = await api.post("/user/login", requestData);

            if (response.data && response.data.token) {
                const r1 = await api.get("/store/name/" + store.value);
                localStorage.setItem("firstName", response.data.firstName);
                localStorage.setItem("lastName", response.data.lastName);
                localStorage.setItem("store", store.value);
                localStorage.setItem("storeAddress", r1.data.address);
                localStorage.setItem("storeCity", r1.data.city);
                localStorage.setItem("username", username);

                login(response.data.token);
                setShow(false);
            } else {
                throw new Error("Invalid login credentials");
            }
        } catch (error) {
            // showError()
            setError(
                error.response?.data?.message || "Login failed. Please try again."
            );
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
                    <Modal.Title>Welcome !</Modal.Title>
                </Modal.Header>

                <Form onSubmit={handleLogin}>
                    {/* {error && <div className="alert alert-danger">{error}</div>} */}
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
                    {/*<Form.Group controlId="formStore">*/}
                    {/*    <Form.Label>Store</Form.Label>*/}
                    {/*    <Select*/}
                    {/*        value={store}*/}
                    {/*        onChange={setStore}*/}
                    {/*        options={stores}*/}
                    {/*        placeholder="Select store"*/}
                    {/*        required*/}
                    {/*    />*/}
                    {/*</Form.Group>*/}
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
        // margin: "0",
        // fontFamily: "Arial, sans-serif",
        // background: "linear-gradient(to bottom right, #e0f7fa, #b2ebf2)",
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
        backgroundColor: `${Colors.white}`,
        height: "70vh",
        width: "70vh",
        border: '2px solid black',
        borderRadius: "50px",
    },
    titleStyle: {
        color: `${Colors.mainBlue}`,
        fontWeight: 'bold',
        fontSize: '50px',
        paddingBottom: '40px',
    },
    // errorAlert: {
    //   backgroundColor: "#f8d7da",
    //   color: "#721c24",
    //   padding: "10px 20px",
    //   margin: "10px 0",
    //   border: "1px solid #f5c6cb",
    //   borderRadius: "5px",
    //   display: "flex",
    //   justifyContent: "space-between",
    //   alignItems: "center",
    // },
    // closeButton: {
    //   background: "none",
    //   border: "none",
    //   fontSize: "16px",
    //   cursor: "pointer",
    //   color: "#721c24",
    // },
};

export default Login;
