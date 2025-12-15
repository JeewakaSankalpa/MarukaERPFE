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
                    </Tabs>
                </Card.Body>
            </Card>
        </div>
    );
}

function ScheduleSettings() {
    // ... existing ScheduleSettings code ...
    const [global, setGlobal] = useState({
        schedule: [],
        gracePeriodMinutes: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get('/hr/schedule/global');
            if (res.data) {
                // Ensure time format HH:mm and list of 7 days
                const s = res.data;
                setGlobal({
                    schedule: (s.schedule || []).map(d => ({
                        ...d,
                        startTime: d.startTime ? d.startTime.substring(0, 5) : '08:30',
                        endTime: d.endTime ? d.endTime.substring(0, 5) : '17:00'
                    })),
                    gracePeriodMinutes: s.gracePeriodMinutes || 0
                });
            }
        } catch (e) {
            toast.error("Failed to load global schedule");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.post('/hr/schedule/global', {
                schedule: global.schedule.map(d => ({
                    ...d,
                    startTime: d.startTime + ":00",
                    endTime: d.endTime + ":00"
                })),
                gracePeriodMinutes: global.gracePeriodMinutes
            });
            toast.success("Global Schedule Updated");
        } catch (e) {
            toast.error("Failed to save settings");
        }
    };

    const updateDay = (index, field, value) => {
        const newSched = [...global.schedule];
        newSched[index] = { ...newSched[index], [field]: value };
        setGlobal({ ...global, schedule: newSched });
    };

    if (loading) return <Spinner size="sm" />;

    return (
        <div>
            <h5 className="mb-3">Global Default Schedule</h5>

            <Form.Group className="mb-3" style={{ maxWidth: 300 }}>
                <Form.Label>Grace Period (Minutes)</Form.Label>
                <Form.Control type="number" value={global.gracePeriodMinutes} onChange={e => setGlobal({ ...global, gracePeriodMinutes: parseInt(e.target.value) })} />
                <Form.Text className="text-muted">Allowed delay before marking 'Late'</Form.Text>
            </Form.Group>

            <Table striped bordered hover size="sm">
                <thead>
                    <tr>
                        <th>Day</th>
                        <th className="text-center">Work Day?</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                    </tr>
                </thead>
                <tbody>
                    {global.schedule.map((d, idx) => (
                        <tr key={d.day}>
                            <td>{d.day}</td>
                            <td className="text-center">
                                <Form.Check
                                    checked={d.isWorkDay}
                                    onChange={e => updateDay(idx, 'isWorkDay', e.target.checked)}
                                />
                            </td>
                            <td>
                                <Form.Control
                                    type="time"
                                    value={d.startTime}
                                    disabled={!d.isWorkDay}
                                    onChange={e => updateDay(idx, 'startTime', e.target.value)}
                                />
                            </td>
                            <td>
                                <Form.Control
                                    type="time"
                                    value={d.endTime}
                                    disabled={!d.isWorkDay}
                                    onChange={e => updateDay(idx, 'endTime', e.target.value)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Button onClick={handleSave} className="mt-2">Save Global Schedule</Button>
            <hr />
            <p className="text-muted small">
                Individual overrides can set totally different schedules per employee.
            </p>
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
