import React, { useEffect, useState } from 'react';
import { Card, Tabs, Tab, Form, Button, Table, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function HRConfiguration() {
    const [key, setKey] = useState('schedule');

    return (
        <div className="p-3">
            <h3>Global HR Configurations</h3>
            <Card>
                <Card.Body>
                    <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
                        <Tab eventKey="schedule" title="Working Schedule">
                            <ScheduleSettings />
                        </Tab>
                        <Tab eventKey="leave" title="Global Leave Quotas">
                            <GlobalLeaveQuota />
                        </Tab>
                        <Tab eventKey="audit" title="Attendance Audit Logs">
                            <AttendanceAudit />
                        </Tab>
                        <Tab eventKey="notifications" title="Notifications">
                            <NotificationSettings />
                        </Tab>
                        <Tab eventKey="tax" title="Taxation (PAYE)">
                            <TaxSettings />
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>
        </div>
    );
}

function ScheduleSettings() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        policyName: "",
        gracePeriodMinutes: 0,
        isDefault: false,
        schedule: []
    });

    useEffect(() => { loadPolicies(); }, []);

    const loadPolicies = async () => {
        try {
            setLoading(true);
            const res = await api.get('/hr/schedule/policies');
            setPolicies(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            toast.error("Failed to load policies");
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        // Initialize Default Empty Schedule
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const emptySchedule = days.map(d => ({
            day: d,
            isWorkDay: ["Saturday", "Sunday"].includes(d) ? false : true,
            startTime: "08:30",
            endTime: "17:00"
        }));

        setFormData({
            policyName: "",
            gracePeriodMinutes: 0,
            isDefault: false,
            schedule: emptySchedule
        });
        setEditingPolicy(null);
        setShowModal(true);
    };

    const handleEdit = (policy) => {
        setFormData({
            policyName: policy.policyName,
            gracePeriodMinutes: policy.gracePeriodMinutes,
            isDefault: policy.isDefault,
            schedule: policy.schedule.map(d => ({
                ...d,
                startTime: d.startTime ? d.startTime.substring(0, 5) : "08:30", // Ensure HH:mm
                endTime: d.endTime ? d.endTime.substring(0, 5) : "17:00"
            }))
        });
        setEditingPolicy(policy);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This might affect employees assigned to this policy.")) return;
        try {
            await api.delete(`/hr/schedule/policies/${id}`);
            toast.success("Policy deleted");
            loadPolicies();
        } catch (e) {
            toast.error("Failed to delete policy");
        }
    };

    const handleSave = async () => {
        if (!formData.policyName) {
            toast.error("Policy Name is required");
            return;
        }

        try {
            const payload = { ...formData };
            if (editingPolicy) {
                await api.put(`/hr/schedule/policies/${editingPolicy.id}`, payload);
            } else {
                await api.post('/hr/schedule/policies', payload);
            }
            toast.success("Policy saved successfully");
            setShowModal(false);
            loadPolicies();
        } catch (e) {
            toast.error("Failed to save policy");
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Work Schedule Policies</h5>
                <Button onClick={handleAddNew}>+ Add Policy</Button>
            </div>

            {loading && <Spinner size="sm" />}

            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>Policy Name</th>
                        <th>Grace Period</th>
                        <th>Default?</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {policies.map(p => (
                        <tr key={p.id}>
                            <td>{p.policyName}</td>
                            <td>{p.gracePeriodMinutes} mins</td>
                            <td>{p.isDefault ? <Badge bg="success">Default</Badge> : ""}</td>
                            <td>
                                <Button size="sm" variant="info" className="me-2" onClick={() => handleEdit(p)}>Edit</Button>
                                <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Delete</Button>
                            </td>
                        </tr>
                    ))}
                    {!loading && policies.length === 0 && <tr><td colSpan="4" className="text-center">No policies found</td></tr>}
                </tbody>
            </Table>

            {/* Modal - Ideally fetch from Reusable or inline */}
            {showModal && (
                <div className="border p-3 mt-4 bg-light rounded">
                    <h6>{editingPolicy ? "Edit Policy" : "New Policy"}</h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Policy Name</Form.Label>
                                <Form.Control value={formData.policyName} onChange={e => setFormData({ ...formData, policyName: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Grace Period</Form.Label>
                                <Form.Control type="number" value={formData.gracePeriodMinutes} onChange={e => setFormData({ ...formData, gracePeriodMinutes: parseInt(e.target.value) || 0 })} />
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Form.Check
                                label="Is Default Policy?"
                                checked={formData.isDefault}
                                onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                            />
                        </Col>
                    </Row>

                    <Table size="sm">
                        <thead>
                            <tr><th>Day</th><th>Work Day?</th><th>Start</th><th>End</th></tr>
                        </thead>
                        <tbody>
                            {formData.schedule.map((d, idx) => (
                                <tr key={d.day}>
                                    <td>{d.day}</td>
                                    <td>
                                        <Form.Check
                                            checked={d.isWorkDay}
                                            onChange={e => {
                                                const ns = [...formData.schedule];
                                                ns[idx].isWorkDay = e.target.checked;
                                                setFormData({ ...formData, schedule: ns });
                                            }}
                                        />
                                    </td>
                                    <td><Form.Control type="time" disabled={!d.isWorkDay} value={d.startTime} onChange={e => {
                                        const ns = [...formData.schedule];
                                        ns[idx].startTime = e.target.value;
                                        setFormData({ ...formData, schedule: ns });
                                    }} /></td>
                                    <td><Form.Control type="time" disabled={!d.isWorkDay} value={d.endTime} onChange={e => {
                                        const ns = [...formData.schedule];
                                        ns[idx].endTime = e.target.value;
                                        setFormData({ ...formData, schedule: ns });
                                    }} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <div className="d-flex justify-content-end gap-2 mt-3">
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave}>Save Policy</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function GlobalLeaveQuota() {
    const [form, setForm] = useState({ year: new Date().getFullYear(), annual: 14, casual: 7, sick: 7, overwrite: false });
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        if (!window.confirm("Are you sure? This will update quotas for ALL employees.")) return;
        try {
            setLoading(true);
            const res = await api.post('/leave/quota/global', form);
            toast.success(res.data);
        } catch (e) {
            toast.error("Failed to update quotas");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 500 }}>
            <h5 className="mb-3">Bulk Update Leave Quotas</h5>
            <Form.Group className="mb-2">
                <Form.Label>Target Year</Form.Label>
                <Form.Control type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} />
            </Form.Group>
            <Row>
                <Col><Form.Group className="mb-2"><Form.Label>Annual</Form.Label><Form.Control type="number" value={form.annual} onChange={e => setForm({ ...form, annual: parseInt(e.target.value) })} /></Form.Group></Col>
                <Col><Form.Group className="mb-2"><Form.Label>Casual</Form.Label><Form.Control type="number" value={form.casual} onChange={e => setForm({ ...form, casual: parseInt(e.target.value) })} /></Form.Group></Col>
                <Col><Form.Group className="mb-2"><Form.Label>Sick</Form.Label><Form.Control type="number" value={form.sick} onChange={e => setForm({ ...form, sick: parseInt(e.target.value) })} /></Form.Group></Col>
            </Row>
            <Form.Check
                type="checkbox"
                label="Overwrite existing quotas? (Check to reset everyone)"
                className="mb-3 text-danger"
                checked={form.overwrite}
                onChange={e => setForm({ ...form, overwrite: e.target.checked })}
            />
            <Button variant="danger" onClick={handleRun} disabled={loading}>{loading ? "Updating..." : "Apply to All Employees"}</Button>
        </div>
    );
}

function AttendanceAudit() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [empId, setEmpId] = useState("");

    const loadLogs = async () => {
        try {
            setLoading(true);
            const url = empId ? `/attendance/logs?employeeId=${empId}` : '/attendance/logs';
            const res = await api.get(url);
            setLogs(res.data || []);
        } catch (e) {
            toast.error("Failed to load logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadLogs(); }, []);

    return (
        <div>
            <div className="d-flex gap-2 mb-3">
                <Form.Control placeholder="Filter by Employee ID" value={empId} onChange={e => setEmpId(e.target.value)} style={{ maxWidth: 200 }} />
                <Button variant="outline-primary" onClick={loadLogs}>Filter</Button>
            </div>
            {loading && <Spinner size="sm" />}
            <Table size="sm" bordered hover responsive>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Admin</th>
                        <th>Employee</th>
                        <th>Changes</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(l => (
                        <tr key={l.id}>
                            <td>{new Date(l.timestamp).toLocaleString()}</td>
                            <td>{l.adminId}</td>
                            <td>{l.employeeId}</td>
                            <td>
                                <div className="small text-muted">Old: {l.oldValue}</div>
                                <div className="small fw-bold">New: {l.newValue}</div>
                            </td>
                            <td>{l.reason}</td>
                        </tr>
                    ))}
                    {!loading && logs.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No logs found</td></tr>}
                </tbody>
            </Table>
        </div>
    );
}

function NotificationSettings() {
    const [config, setConfig] = useState({
        "app.notification.hr.email": "",
        "app.notification.enable.hr.leave": "true",
        "app.notification.enable.hr.advance": "true",
        "app.notification.enable.hr.payslip": "true",
        "app.notification.enable.hr.attendance": "true"
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/config');
            if (res.data) {
                setConfig(prev => ({ ...prev, ...res.data }));
            }
        } catch (e) {
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.post('/admin/config', config);
            toast.success("Notification settings saved");
        } catch (e) {
            toast.error("Failed to save settings");
        }
    };

    const toggle = (key) => {
        setConfig(prev => ({
            ...prev,
            [key]: prev[key] === "true" ? "false" : "true"
        }));
    };

    if (loading) return <Spinner size="sm" />;

    return (
        <div style={{ maxWidth: 600 }}>
            <h5 className="mb-3">HR Email Notifications</h5>

            <Form.Group className="mb-3">
                <Form.Label>HR Contact Email (for alerts)</Form.Label>
                <Form.Control
                    value={config["app.notification.hr.email"]}
                    onChange={e => setConfig({ ...config, "app.notification.hr.email": e.target.value })}
                    placeholder="hr@maruka.com"
                />
            </Form.Group>

            <Card className="mb-3 p-3 bg-light border-0">
                <Form.Check
                    type="switch"
                    id="n-leave"
                    label="Leave Status Updates"
                    checked={config["app.notification.enable.hr.leave"] === "true"}
                    onChange={() => toggle("app.notification.enable.hr.leave")}
                    className="mb-2"
                />
                <Form.Check
                    type="switch"
                    id="n-advance"
                    label="Advance Salary Updates"
                    checked={config["app.notification.enable.hr.advance"] === "true"}
                    onChange={() => toggle("app.notification.enable.hr.advance")}
                    className="mb-2"
                />
                <Form.Check
                    type="switch"
                    id="n-payslip"
                    label="Monthly Payslip Emails"
                    checked={config["app.notification.enable.hr.payslip"] === "true"}
                    onChange={() => toggle("app.notification.enable.hr.payslip")}
                    className="mb-2"
                />
                <Form.Check
                    type="switch"
                    id="n-attendance"
                    label="Late Attendance Alerts"
                    checked={config["app.notification.enable.hr.attendance"] === "true"}
                    onChange={() => toggle("app.notification.enable.hr.attendance")}
                />
            </Card>

            <Button onClick={handleSave}>Save Settings</Button>
        </div>
    );
}

function TaxSettings() {
    const [config, setConfig] = useState({ taxBrackets: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get('/payroll-config');
            setConfig(res.data || { taxBrackets: [] });
        } catch (e) { toast.error("Failed to load tax config"); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            await api.post('/payroll-config', config);
            toast.success("Tax settings saved");
        } catch (e) { toast.error("Failed to save"); }
    };

    const addBracket = () => {
        setConfig({
            ...config,
            taxBrackets: [...(config.taxBrackets || []), { limit: 0, rate: 0 }]
        });
    };

    const updateBracket = (index, field, value) => {
        const newBrackets = [...config.taxBrackets];
        newBrackets[index][field] = parseFloat(value);
        setConfig({ ...config, taxBrackets: newBrackets });
    };

    const removeBracket = (index) => {
        const newBrackets = config.taxBrackets.filter((_, i) => i !== index);
        setConfig({ ...config, taxBrackets: newBrackets });
    };

    return (
        <div style={{ maxWidth: 800 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>PAYE / APIT Tax Brackets (Monthly)</h5>
                <Button onClick={handleSave}>Save Configuration</Button>
            </div>

            <div className="alert alert-info small">
                Define the tax slabs based on monthly income. <br />
                For the final slab (infinite), set Limit to <b>0</b>.<br />
                <strong>Example:</strong> First 100,000 @ 0%, Next 100,000 @ 6%, Remainder @ 12%
            </div>

            <Table size="sm" bordered striped>
                <thead>
                    <tr>
                        <th style={{ width: '60px' }}>#</th>
                        <th>Bracket Limit (LKR)</th>
                        <th>Tax Rate (0.06 = 6%)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {(config.taxBrackets || []).map((b, i) => (
                        <tr key={i}>
                            <td>{i + 1}</td>
                            <td>
                                <Form.Control
                                    type="number"
                                    value={b.limit}
                                    onChange={e => updateBracket(i, 'limit', e.target.value)}
                                    placeholder="0 for Unlimited"
                                />
                                {b.limit === 0 && <small className="text-muted">Unlimited</small>}
                            </td>
                            <td>
                                <div className="input-group">
                                    <Form.Control
                                        type="number"
                                        step="0.01"
                                        value={b.rate}
                                        onChange={e => updateBracket(i, 'rate', e.target.value)}
                                    />
                                    <span className="input-group-text">{(b.rate * 100).toFixed(1)}%</span>
                                </div>
                            </td>
                            <td>
                                <Button size="sm" variant="danger" onClick={() => removeBracket(i)}>Remove</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Button size="sm" variant="outline-primary" onClick={addBracket}>+ Add Tax Bracket</Button>
        </div>
    );
}
