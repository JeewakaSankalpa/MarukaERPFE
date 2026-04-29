import React, { useState, useEffect, useRef } from "react";
import { Container, Card, Form, Button, Row, Col, Spinner, Table, Badge, Alert } from "react-bootstrap";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from "../api/api";
import CryptoJS from "crypto-js";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, SkipForward } from "lucide-react";
import * as XLSX from "xlsx";
import SafeSelect from "./ReusableComponents/SafeSelect";

// Must match backend key
const SECRET_KEY = "MarukaERP_Secret";

export default function SystemConfiguration() {
    const navigate = useNavigate();
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
    const [mappingRoles, setMappingRoles] = useState([]);
    const [mappingLoading, setMappingLoading] = useState(false);

    // ---- Bulk Import State ----
    const fileInputRef = useRef(null);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);   // parsed rows for preview
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState("LOC_STORES_MAIN");
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);   // BulkImportResultDTO

    useEffect(() => {
        loadConfig();
        loadMappingRoles();
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const res = await api.get("/store/all");
            const locs = (res.data || []).map(l => ({ id: l.code || l.id || l.name, label: l.name }));
            setLocations(locs);
            if (locs.length > 0 && !selectedLocation) setSelectedLocation(locs[0].id);
        } catch (e) {
            // Non-fatal: default location already set
        }
    };

    // Download a blank Excel template
    const handleDownloadTemplate = () => {
        const headers = [["Product / Service Name", "Sales Description", "SKU", "Type", "Sales Price / Rate", "Tax on Sales", "Price / Rate Includes Tax", "Income Account", "Purchase Description", "Purchase Cost", "Tax on Purchase", "Purchase Cost Includes Tax", "Expense Account", "Quantity on hand", "Reorder point", "Inventory asset account", "Quantity as of date"]];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        // Set column widths
        ws["!cols"] = [30, 20, 15, 12, 15, 12, 12, 15, 20, 15, 12, 12, 15, 15, 15, 15, 15].map(w => ({ wch: w }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, "inventory_import_template.xlsx");
    };

    // Parse the selected file and populate preview rows
    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setImportFile(f);
        setImportResult(null);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            // data[0] = headers, data[1..] = rows
            const rows = data.slice(1).filter(r => r.some(c => String(c).trim() !== "")).map((r, i) => ({
                rowNum: i + 2,
                name: String(r[0] || "").trim(),
                sku: String(r[2] || "").trim() || String(i + 1).padStart(3, '0'),
                sellingPrice: r[4] !== undefined ? r[4] : "",
                costPrice: r[9] !== undefined ? r[9] : "",
                openingQty: r[13] !== undefined ? r[13] : "",
            }));
            setImportPreview(rows);
        };
        reader.readAsBinaryString(f);
    };

    // Submit the file to the backend
    const handleImport = async () => {
        if (!importFile) { toast.warn("Please select an Excel file first."); return; }
        if (!selectedLocation) { toast.warn("Please select a target location."); return; }
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append("file", importFile);
            formData.append("locationId", selectedLocation);
            const res = await api.post("/admin/import/inventory", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setImportResult(res.data);
            const { productsCreated, productsSkipped, errors, grnNumber } = res.data;
            if (errors === 0) {
                toast.success(`Import complete! ${productsCreated} created, ${productsSkipped} skipped. GRN: ${grnNumber}`);
            } else {
                toast.warn(`Import finished with ${errors} error(s). Check the results below.`);
            }
        } catch (err) {
            toast.error("Import failed: " + (err?.response?.data?.message || err.message));
        } finally {
            setImporting(false);
        }
    };

    const resetImport = () => {
        setImportFile(null);
        setImportPreview([]);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };


    const loadMappingRoles = async () => {
        setMappingLoading(true);
        try {
            const res = await api.get("/finance/account-mappings/roles");
            setMappingRoles(res.data || []);
        } catch (error) {
            console.error("Failed to load mapping roles", error);
        } finally {
            setMappingLoading(false);
        }
    };

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
            toast.error("Failed to load configurations.");
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
            toast.success("Configuration saved successfully!");
        } catch (error) {
            console.error("Save failed", error);
            toast.error("Failed to save configuration.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0">System Configuration</h2>
            </div>



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

            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 text-primary">Business Mappings (Finance)</h5>
                    <small className="text-muted">Links application logic to specific GL Accounts</small>
                </Card.Header>
                <Card.Body>
                    <p className="text-muted small mb-3">
                        Define which General Ledger account codes should be used for core business operations. 
                        The system uses default codes but you can override them here. 
                        A 🟢 indicates the account exists in your Chart of Accounts.
                    </p>
                    {mappingLoading ? (
                        <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover border-top">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Business Role</th>
                                        <th>Mapped GL Code</th>
                                        <th className="text-center">Status</th>
                                        <th>Default</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappingRoles.map(role => (
                                        <tr key={role.role}>
                                            <td className="align-middle">
                                                <div className="fw-bold">{role.displayName}</div>
                                                <small className="text-muted">{role.configKey}</small>
                                            </td>
                                            <td>
                                                <Form.Control 
                                                    size="sm"
                                                    value={config[role.configKey] || role.currentCode}
                                                    name={role.configKey}
                                                    onChange={handleChange}
                                                    placeholder={role.defaultCode}
                                                />
                                            </td>
                                            <td className="text-center align-middle">
                                                {role.exists ? (
                                                    <span className="badge bg-success" title="Valid Account Code">🟢 Valid</span>
                                                ) : (
                                                    <span className="badge bg-danger" title="Account not found in COA">🔴 Missing</span>
                                                )}
                                            </td>
                                            <td className="align-middle text-muted small">
                                                <code>{role.defaultCode}</code>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* ============================================================
                  INVENTORY BULK IMPORT
             ============================================================ */}
            <Card className="shadow-sm mb-4 border-0" style={{ overflow: "hidden" }}>
                <Card.Header className="py-3" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <div style={{ background: "rgba(99,179,237,0.15)", borderRadius: 8, padding: "6px 10px" }}>
                                <Upload size={18} color="#63b3ed" />
                            </div>
                            <div>
                                <h5 className="mb-0 text-white">Inventory Bulk Import</h5>
                                <small style={{ color: "#a0aec0" }}>Upload an Excel file to create products and load opening stock</small>
                            </div>
                        </div>
                        <Button
                            variant="outline-light"
                            size="sm"
                            onClick={handleDownloadTemplate}
                            className="d-flex align-items-center gap-1"
                            id="btn-download-import-template"
                        >
                            <Download size={14} /> Template
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body className="p-4">
                    {/* Step 1: Column guide */}
                    <div className="mb-4 p-3 rounded" style={{ background: "#f8f9ff", border: "1px solid #e2e8f0" }}>
                        <p className="mb-2 fw-semibold small text-secondary">Expected Excel columns (1 to 17):</p>
                        <div className="d-flex flex-wrap gap-2">
                            {[
                                { col: "1", label: "Product / Service Name *" },
                                { col: "2", label: "Sales Description" },
                                { col: "3", label: "SKU" },
                                { col: "4", label: "Type" },
                                { col: "5", label: "Sales Price / Rate *" },
                                { col: "6", label: "Tax on Sales" },
                                { col: "7", label: "Price / Rate Includes Tax" },
                                { col: "8", label: "Income Account" },
                                { col: "9", label: "Purchase Description" },
                                { col: "10", label: "Purchase Cost" },
                                { col: "11", label: "Tax on Purchase" },
                                { col: "12", label: "Purchase Cost Includes Tax" },
                                { col: "13", label: "Expense Account" },
                                { col: "14", label: "Quantity on hand *" },
                                { col: "15", label: "Reorder point" },
                                { col: "16", label: "Inventory asset account" },
                                { col: "17", label: "Quantity as of date" },
                            ].map(({ col, label }) => (
                                <span key={col} className="badge d-flex align-items-center gap-1"
                                    style={{ background: "#edf2f7", color: "#2d3748", fontWeight: 500, fontSize: 12 }}>
                                    <span style={{ background: "#4299e1", color: "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>{col}</span>
                                    {label}
                                </span>
                            ))}
                        </div>
                        <p className="mb-0 mt-2 text-muted" style={{ fontSize: 12 }}>* Product Name, Sales Price, and Quantity are required. SKU is auto-generated if left blank. Other fields use system defaults if empty.</p>
                    </div>

                    <Row className="g-3 align-items-end mb-3">
                        {/* File picker */}
                        <Col md={6}>
                            <Form.Label className="fw-semibold">Select Excel File (.xlsx)</Form.Label>
                            <Form.Control
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                id="inventory-import-file"
                            />
                            {importFile && (
                                <small className="text-success mt-1 d-block">
                                    ✓ {importFile.name} — {importPreview.length} data row(s) detected
                                </small>
                            )}
                        </Col>

                        {/* Location selector */}
                        <Col md={4}>
                            <Form.Label className="fw-semibold">Target Location (Store)</Form.Label>
                            <SafeSelect
                                value={selectedLocation}
                                onChange={e => setSelectedLocation(e.target.value)}
                                id="import-location-select"
                            >
                                {locations.length > 0
                                    ? locations.map(l => <option key={l.id} value={l.id}>{l.label}</option>)
                                    : <option value="LOC_STORES_MAIN">Main Stores</option>
                                }
                            </SafeSelect>
                        </Col>

                        {/* Action buttons */}
                        <Col md={2} className="d-flex gap-2">
                            <Button
                                variant="primary"
                                onClick={handleImport}
                                disabled={importing || !importFile}
                                className="w-100"
                                id="btn-run-inventory-import"
                            >
                                {importing ? <><Spinner size="sm" className="me-1" />Importing...</> : <><Upload size={14} className="me-1" />Import</>}
                            </Button>
                        </Col>
                    </Row>

                    {/* Preview Table */}
                    {importPreview.length > 0 && !importResult && (
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="fw-semibold text-secondary small">Preview ({importPreview.length} rows)</span>
                                <Button variant="link" size="sm" className="text-danger p-0" onClick={resetImport}>✕ Clear</Button>
                            </div>
                            <div className="table-responsive" style={{ maxHeight: 280, overflowY: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                <Table size="sm" hover className="mb-0" style={{ fontSize: 13 }}>
                                    <thead style={{ background: "#f7fafc", position: "sticky", top: 0 }}>
                                        <tr>
                                            <th>#</th>
                                            <th>Item Name</th>
                                            <th>SKU</th>
                                            <th>Cost</th>
                                            <th>Sell</th>
                                            <th>Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importPreview.map(r => (
                                            <tr key={r.rowNum} className={(!r.name || r.sellingPrice === "" || r.openingQty === "") ? "table-warning" : ""}>
                                                <td className="text-muted">{r.rowNum}</td>
                                                <td>{r.name || <span className="text-danger">—</span>}</td>
                                                <td><code style={{ fontSize: 12 }}>{r.sku}</code></td>
                                                <td>{r.costPrice}</td>
                                                <td>{r.sellingPrice === "" ? <span className="text-danger">—</span> : r.sellingPrice}</td>
                                                <td><strong>{r.openingQty === "" ? <span className="text-danger">—</span> : r.openingQty}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                            <p className="text-muted mt-1 mb-0" style={{ fontSize: 11 }}>
                                Rows highlighted in yellow are missing required fields and will be skipped.
                            </p>
                        </div>
                    )}

                    {/* Import Result Panel */}
                    {importResult && (
                        <div className="mt-3">
                            <Alert variant={importResult.errors > 0 ? "warning" : "success"} className="mb-3">
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <div>
                                        <strong>Import Complete</strong>
                                        {importResult.grnNumber && (
                                            <span className="ms-2 text-muted small">Opening Stock GRN: <strong>{importResult.grnNumber}</strong></span>
                                        )}
                                    </div>
                                    <div className="d-flex gap-3">
                                        <span className="text-success fw-bold"><CheckCircle size={14} className="me-1" />{importResult.productsCreated} Created</span>
                                        <span className="text-secondary fw-bold"><SkipForward size={14} className="me-1" />{importResult.productsSkipped} Skipped</span>
                                        <span className="text-danger fw-bold"><XCircle size={14} className="me-1" />{importResult.errors} Errors</span>
                                    </div>
                                </div>
                            </Alert>

                            <div className="table-responsive" style={{ maxHeight: 300, overflowY: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                <Table size="sm" hover className="mb-0" style={{ fontSize: 13 }}>
                                    <thead style={{ background: "#f7fafc", position: "sticky", top: 0 }}>
                                        <tr>
                                            <th>#</th>
                                            <th>SKU</th>
                                            <th>Item Name</th>
                                            <th>Status</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(importResult.rows || []).map(r => (
                                            <tr key={r.rowNum}>
                                                <td className="text-muted">{r.rowNum}</td>
                                                <td><code style={{ fontSize: 12 }}>{r.sku}</code></td>
                                                <td>{r.name}</td>
                                                <td>
                                                    <Badge bg={r.status === "CREATED" ? "success" : r.status === "SKIPPED" ? "secondary" : "danger"}>
                                                        {r.status}
                                                    </Badge>
                                                </td>
                                                <td className="text-muted small">{r.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                            <div className="mt-2 text-end">
                                <Button variant="link" size="sm" className="p-0 text-secondary" onClick={resetImport}>
                                    ✕ Clear &amp; Import Another File
                                </Button>
                            </div>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* ============================================================
                  EMAIL CONFIGURATION (existing)
             ============================================================ */}
            <Card className="shadow-sm">
                <Card.Header className="bg-white py-3">
                    <h5 className="mb-0 text-primary">Email Configuration</h5>
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleSave}>
                        <div className="mb-4">
                            <label className="form-label fw-bold">Email Provider</label>
                            <SafeSelect
                                value={config['app.email.provider'] || 'SMTP'}
                                onChange={(e) => setConfig({ ...config, 'app.email.provider': e.target.value })}
                            >
                                <option value="SMTP">SMTP (Standard)</option>
                                <option value="GMAIL">Gmail API (Recommended for Render)</option>
                                <option value="BREVO">Brevo API (Free Tier)</option>
                            </SafeSelect>
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
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container >
    );
}
