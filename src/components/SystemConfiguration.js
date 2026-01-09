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
        "app.notification.enable.project.task": "true",
        "app.notification.enable.project.digest": "true",
        "app.estimation.vat": "18",
        "app.estimation.tax": "0",
        "app.estimation.margin": "15",
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
                                onChange={handleChange}
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
                    <h5 className="mb-0 text-primary">Email Configuration</h5>
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleSave}>
                        <div className="mb-4">
                            <label className="form-label fw-bold">Email Provider</label>
                            <select
                                className="form-select"
                                value={config['app.email.provider'] || 'SMTP'}
                                onChange={(e) => setConfig({ ...config, 'app.email.provider': e.target.value })}
                            >
                                <option value="SMTP">SMTP (Standard)</option>
                                <option value="GMAIL">Gmail API (Recommended for Render)</option>
                                <option value="BREVO">Brevo API (Free Tier)</option>
                            </select>
                            <small className="text-muted">
                                Select "Gmail API" if your hosting provider blocks SMTP ports (e.g. Render Free Tier).
                            </small>
                        </div>

                        {config['app.email.provider'] === 'GMAIL' ? (
                            <div className="p-3 bg-light rounded border mb-3">
                                <h6 className="text-primary mb-3">
                                    <i className="bi bi-google me-2"></i>Gmail API Credentials
                                </h6>
                                <div className="mb-3">
                                    <label className="form-label">Client ID</label>
                                    <Form.Control
                                        type="text"
                                        value={config['app.email.gmail.client_id'] || ''}
                                        onChange={(e) => setConfig({ ...config, 'app.email.gmail.client_id': e.target.value })}
                                        placeholder="Running on Google Cloud..."
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Client Secret</label>
                                    <Form.Control
                                        type="password"
                                        value={config['app.email.gmail.client_secret'] || ''}
                                        onChange={(e) => setConfig({ ...config, 'app.email.gmail.client_secret': e.target.value })}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Refresh Token</label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={config['app.email.gmail.refresh_token'] || ''}
                                        onChange={(e) => setConfig({ ...config, 'app.email.gmail.refresh_token': e.target.value })}
                                        placeholder="Enter your OAuth2 Refresh Token here..."
                                    />
                                    <div className="form-text mt-2">
                                        <strong>How to get this?</strong> Use the <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer">Google OAuth Playground</a> to authorize the 'https://mail.google.com/' scope and exchange the authorization code for a Refresh Token.
                                    </div>
                                </div>
                            </div>
                        ) : config['app.email.provider'] === 'BREVO' ? (
                            <div className="p-3 bg-light rounded border mb-3">
                                <h6 className="text-success mb-3">Brevo API Settings</h6>
                                <div className="mb-3">
                                    <label className="form-label">API Key</label>
                                    <Form.Control
                                        type="password"
                                        value={config['app.email.brevo.apikey'] || ''}
                                        onChange={(e) => setConfig({ ...config, 'app.email.brevo.apikey': e.target.value })}
                                        placeholder="xkeysib-..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-light rounded border mb-3">
                                <h6 className="text-secondary mb-3">SMTP Settings</h6>
                                <Row className="g-3">
                                    <Col md={8}>
                                        <Form.Group>
                                            <Form.Label>SMTP Host</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={config["spring.mail.host"] || ""}
                                                onChange={(e) => setConfig({ ...config, "spring.mail.host": e.target.value })}
                                                placeholder="e.g. smtp.gmail.com"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Port</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={config["spring.mail.port"] || ""}
                                                onChange={(e) => setConfig({ ...config, "spring.mail.port": e.target.value })}
                                                placeholder="587"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <div className="mb-3 mt-3">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={config["spring.mail.username"] || ""}
                                        onChange={(e) => setConfig({ ...config, "spring.mail.username": e.target.value })}
                                    />
                                </div>
                                <div className="mb-3">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={config["spring.mail.password"] || ""}
                                        onChange={(e) => setConfig({ ...config, "spring.mail.password": e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mb-3">
                            <Form.Label>From Address (Notification Email)</Form.Label>
                            <Form.Control
                                type="email"
                                value={config['app.notification.from.email'] || ''}
                                onChange={(e) => setConfig({ ...config, 'app.notification.from.email': e.target.value })}
                                placeholder="e.g. notifications@yourcompany.com"
                            />
                        </div>

                        <div className="mt-4 d-flex justify-content-end">
                            <Button variant="primary" type="submit" disabled={saving}>
                                {saving ? <><Spinner size="sm" /> Saving...</> : "Save Configuration"}
                            </Button>
                        </div>
                    </Form>
                </Card.Body >
            </Card >
        </Container >
    );
}
