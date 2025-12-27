import React, { useState } from "react";
import { Button, Form, Spinner, Modal } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import Colors from "../resources/Colors";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotData, setForgotData] = useState({ username: "", email: "" });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleForgotSubmit = async () => {
    if (!forgotData.username || !forgotData.email) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      // Assuming api base url is localhost:8080 or handled by proxy/axios default.
      // Since axios is imported directly, let's use full URL or ensure base URL config.
      // Ideally use the `api` instance from `../api/api` but reusing axios here for speed as per user req style.
      await axios.post("http://localhost:8080/api/auth/forgot-password", forgotData);
      toast.success("Temporary password sent to your email.");
      setShowForgot(false);
    } catch (e) {
      toast.error(e.response?.data || "Failed to reset password");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const { role, userType } = await login(username, password);

      toast.success("Welcome back! 🎉", { autoClose: 1200 });

      // Navigate after a delay to ensure context updates
      setTimeout(() => {
        if (userType === "CUSTOMER") {
          navigate("/customer/home");
        } else {
          navigate("/dashboard");
        }
      }, 1000); // Increased to 1000ms for robustness
    } catch (err) {
      console.error(err);
      setShake(true);
      toast.error("Invalid username or password", { autoClose: 1800 });
      // Remove shake after animation ends
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* local CSS so it’s copy‑pasteable */}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.94); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes floatGlow {
          0% { box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 12px 38px rgba(0,0,0,0.12), 0 0 18px ${Colors.mainBlue}22; }
          100% { box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .login-card {
          animation: popIn .35s ease-out, floatGlow 5s ease-in-out infinite;
          transition: transform .2s ease;
        }
        .login-card:hover {
          transform: translateY(-2px);
        }
        .login-card.shake {
          animation: shake .45s ease, floatGlow 5s ease-in-out infinite;
        }
        .title-gradient {
          background: linear-gradient(90deg, ${Colors.mainBlue}, #6c63ff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      `}</style>

      <div style={styles.body}>
        <div
          className={`login-card ${shake ? "shake" : ""}`}
          style={styles.loginContainer}
        >
          <h2 className="title-gradient" style={styles.titleStyle}>Maruka</h2>

          <h5 style={{ marginBottom: 12, color: "#334" }}>Welcome!</h5>
          <p style={{ marginTop: -4, marginBottom: 18, color: "#667" }}>
            Please sign in to continue.
          </p>

          <Form onSubmit={handleLogin} style={{ width: "80%" }}>
            <Form.Group controlId="formUsername" className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                disabled={loading}
              />
            </Form.Group>

            <Form.Group controlId="formPassword" className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={loading}
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="w-100 mt-2"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            <div className="text-center mt-3">
              <Button variant="link" size="sm" onClick={() => setShowForgot(true)}>Forgot Password?</Button>
            </div>
          </Form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal show={showForgot} onHide={() => setShowForgot(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your username"
                value={forgotData.username}
                onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter registered email"
                value={forgotData.email}
                onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowForgot(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleForgotSubmit}>Send Temporary Password</Button>
        </Modal.Footer>
      </Modal>

      {/* If you already have a global ToastContainer in App, you can remove this */}
      <ToastContainer position="top-right" newestOnTop />
    </>
  );
};

const styles = {
  body: {
    background: `linear-gradient(to bottom right, ${Colors.loginBackground1}, ${Colors.loginBackground2})`,
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loginContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: Colors.white,
    minHeight: 440,
    width: 480,
    border: "1px solid #e6e6e6",
    borderRadius: 20,
    padding: 24,
  },
  titleStyle: {
    fontWeight: "800",
    fontSize: 40,
    marginBottom: 10,
    letterSpacing: 0.6,
  },
};

export default Login;
