import React, { useState, useEffect } from "react";
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from "react-bootstrap";
import api from "../api/api";
import CryptoJS from "crypto-js";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Must match backend key
const SECRET_KEY = "MarukaERP_Secret";

export default function SystemConfiguration() {
    const [config, setConfig] = useState({
        "spring.mail.host": "smtp.gmail.com",
        "spring.mail.port": "587",
        "spring.mail.username": "",
        "spring.mail.password": "",
        "spring.mail.properties.mail.smtp.auth": "true",
        "spring.mail.properties.mail.smtp.starttls.enable": "true",
        "app.company.name": "",
        "app.company.address": "",
        "app.company.phone": "",
        "app.company.email": "",
        "app.notification.hr.email": "",
        "app.notification.from.email": "",
        "app.notification.enable.store.procurement": "true",
        "app.notification.enable.inventory.lowstock": "true",
        "app.notification.enable.project.task": "true",
        "app.notification.enable.project.digest": "true",
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/config");
            if (res.data) {
                // Merge with defaults to ensure fields exist
                // Don't overwrite existing user input if we were re-fetching (though here we just init)
                // Password might come back from backend? 
                // Usually backend shouldn't return plain password. 
                // Our backend returns whatever is in DB. If it's plain text in DB, it returns plain text.
                // If we want to be secure, backend shouldn't return password or return masked.
                // For now, let's assuming backend returns it (it's internal tool). 
                // Ideally, use placeholder if empty.
                setConfig(prev => ({ ...prev, ...res.data }));
            }
        } catch (error) {
            console.error("Failed to load config", error);
            setMessage({ type: "danger", text: "Failed to load configurations." });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === "checkbox" ? String(checked) : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // Prepare payload
            const payload = { ...config };

            // Encrypt password if present
            if (payload["spring.mail.password"]) {
                // Encrypting using AES (ECB mode to match Backend CryptoUtil)
                const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
                const encrypted = CryptoJS.AES.encrypt(
                    payload["spring.mail.password"],
                    key,
                    {
                        mode: CryptoJS.mode.ECB,
                        padding: CryptoJS.pad.Pkcs7
                    }
                ).toString();
                payload["spring.mail.password"] = encrypted;
            }

            await api.post("/admin/config", payload);
            setMessage({ type: "success", text: "Configuration saved successfully!" });
        } catch (error) {
            console.error("Save failed", error);
            setMessage({ type: "danger", text: "Failed to save configuration." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <Link to="/admin" className="btn btn-light me-3"><ArrowLeft size={18} /></Link>
                <h2 className="mb-0">System Configuration</h2>
            </div>

            {message && <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>{message.text}</Alert>}



            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-white py-3">
                    <h5 className="mb-0 text-primary">Company Profile</h5>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Company Name</Form.Label>
                                <Form.Control
                                    name="app.company.name"
                                    value={config["app.company.name"] || ""}
                                    onChange={handleChange}
                                    placeholder="Maruka ERP"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Address</Form.Label>
                                <Form.Control
                                    as="textarea" rows={3}
                                    name="app.company.address"
                                    value={config["app.company.address"] || ""}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Phone / Contact</Form.Label>
                                <Form.Control
                                    name="app.company.phone"
                                    value={config["app.company.phone"] || ""}
                                    onChange={handleChange}
                                    placeholder="+94 7..."
                                />
                            </Form.Group>
                            <Form.Group className="mt-2">
                                <Form.Label>Support Email</Form.Label>
                                <Form.Control
                                    name="app.company.email"
                                    value={config["app.company.email"] || ""}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-white py-3">
                    <h5 className="mb-0 text-primary">Module Settings</h5>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <h6 className="text-muted mb-3">Supply Chain & Inventory</h6>
                            <Form.Check
                                type="switch"
                                id="st-proc"
                                label="Procurement Alerts (POs, IRs)"
                                name="app.notification.enable.store.procurement"
                                checked={config["app.notification.enable.store.procurement"] !== "false"} // Default true
                                onChange={(e) => setConfig({ ...config, "app.notification.enable.store.procurement": String(e.target.checked) })}
                                className="mb-2"
                            />
                            <Form.Check
                                type="switch"
                                id="st-low"
                                label="Low Stock Alerts"
                                name="app.notification.enable.inventory.lowstock"
                                checked={config["app.notification.enable.inventory.lowstock"] !== "false"}
                                onChange={(e) => setConfig({ ...config, "app.notification.enable.inventory.lowstock": String(e.target.checked) })}
                            />
                        </Col>
                        <Col md={6}>
                            <h6 className="text-muted mb-3">Projects & Productivity</h6>
                            <Form.Check
                                type="switch"
                                id="pj-task"
                                label="Task Assignment Emails"
                                name="app.notification.enable.project.task"
                                checked={config["app.notification.enable.project.task"] !== "false"}
                                onChange={(e) => setConfig({ ...config, "app.notification.enable.project.task": String(e.target.checked) })}
                                className="mb-2"
                            />
                            <Form.Check
                                type="switch"
                                id="pj-digest"
                                label="Daily Executive Digest (8:00 AM)"
                                name="app.notification.enable.project.digest"
                                checked={config["app.notification.enable.project.digest"] !== "false"}
                                onChange={(e) => setConfig({ ...config, "app.notification.enable.project.digest": String(e.target.checked) })}
                            />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header className="bg-white py-3">
                    <h5 className="mb-0 text-primary">Email Settings (SMTP)</h5>
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleSave}>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>SMTP Host</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="spring.mail.host"
                                        value={config["spring.mail.host"]}
                                        onChange={handleChange}
                                        placeholder="e.g. smtp.gmail.com"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Port</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="spring.mail.port"
                                        value={config["spring.mail.port"]}
                                        onChange={handleChange}
                                        placeholder="587"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} className="d-flex align-items-center pt-4">
                                <Form.Switch
                                    id="auth-switch"
                                    label="SMTP Auth"
                                    name="spring.mail.properties.mail.smtp.auth"
                                    checked={config["spring.mail.properties.mail.smtp.auth"] === "true"}
                                    onChange={(e) => setConfig({ ...config, "spring.mail.properties.mail.smtp.auth": String(e.target.checked) })}
                                />
                                <Form.Switch
                                    id="tls-switch"
                                    label="STARTTLS"
                                    className="ms-3"
                                    name="spring.mail.properties.mail.smtp.starttls.enable"
                                    checked={config["spring.mail.properties.mail.smtp.starttls.enable"] === "true"}
                                    onChange={(e) => setConfig({ ...config, "spring.mail.properties.mail.smtp.starttls.enable": String(e.target.checked) })}
                                />
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Username / Email</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="spring.mail.username"
                                        value={config["spring.mail.username"]}
                                        onChange={handleChange}
                                        autoComplete="off"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="spring.mail.password"
                                        value={config["spring.mail.password"]}
                                        onChange={handleChange}
                                        placeholder="Leave empty to keep unchanged"
                                        autoComplete="new-password"
                                    />
                                    <Form.Text className="text-muted">
                                        Password is encrypted before sending.
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="mt-4 d-flex justify-content-end">
                            <Button variant="primary" type="submit" disabled={saving}>
                                {saving ? <><Spinner size="sm" /> Saving...</> : "Save Configuration"}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container >
    );
}
