// src/pages/Login.jsx
import React, { useState } from "react";
import { Button, Form, Spinner } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import Colors from "../resources/Colors";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const { role, userType } = await login(username, password);

      toast.success("Welcome back! 🎉", { autoClose: 1200 });

      // Navigate after a short delay so the toast is visible
      setTimeout(() => {
        if (userType === "CUSTOMER") {
          navigate("/customer/home");
        } else if (role === "ADMIN") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }, 300);
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
            </Form>
          </div>
        </div>

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
