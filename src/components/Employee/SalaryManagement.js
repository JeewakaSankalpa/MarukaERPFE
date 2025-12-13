import React, { useEffect, useState } from "react";
import { Container, Tabs, Tab, Form, Button, Table, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { toast } from "react-toastify";

function SalaryManagement() {
    const [key, setKey] = useState("processing");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // -- Processing State --
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [salaries, setSalaries] = useState([]);
    const [employees, setEmployees] = useState({}); // Map ID -> Name

    // -- Config State --
    const [config, setConfig] = useState({
        reportingTime: "08:30",
        shiftEndTime: "17:00",
        otRateMultiplier: 1.5,
        epfRateEmployee: 0.08,
        epfRateEmployer: 0.12,
        etfRate: 0.03
    });

    useEffect(() => {
        fetchEmployees();
        if (key === "processing") fetchSalaries();
        if (key === "config") fetchConfig();
    }, [key, selectedMonth]);

    const fetchEmployees = async () => {
        try {
            const res = await api.get("/employee/all");
            const map = {};
            (res.data || []).forEach(e => map[e.id] = `${e.firstName} ${e.lastName}`);
            setEmployees(map);
        } catch (e) { }
    };

    const fetchSalaries = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/salary/list?month=${selectedMonth}`);
            setSalaries(res.data || []);
        } catch (e) {
            toast.error("Failed to load salaries");
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await api.get("/payroll-config");
            if (res.data) setConfig(res.data);
        } catch (e) {
            // toast.error("Failed to load config");
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/salary/generate?month=${selectedMonth}`);
            toast.success(res.data);
            fetchSalaries();
        } catch (e) {
            toast.error("Generation failed");
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        try {
            await api.post("/payroll-config", config);
            toast.success("Configuration saved");
        } catch (e) {
            toast.error("Save failed");
        }
    };

    return (
        <Container className="my-5">
            <h2 className="mb-4">Salary & Payroll Management</h2>

            <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-4">

                <Tab eventKey="processing" title="Monthly Processing">
                    <Card className="p-4 shadow-sm">
                        <Row className="align-items-center mb-3">
                            <Col md={4}>
                                <Form.Label>Select Month</Form.Label>
                                <Form.Control
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            </Col>
                            <Col md={8} className="text-end">
                                <Button variant="success" onClick={handleGenerate} disabled={loading} className="me-2">
                                    {loading ? <Spinner size="sm" animation="border" /> : "Generate / Refresh"}
                                </Button>
                                <Button variant="outline-dark" onClick={() => navigate(`/salary/report?month=${selectedMonth}`)}>
                                    🖨️ Print Report
                                </Button>
                            </Col>
                        </Row>

                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Basic</th>
                                    <th>Allowances</th>
                                    <th>OT (Hrs/Pay)</th>
                                    <th>Gross</th>
                                    <th>Deductions (EPF/Tax)</th>
                                    <th>Net Salary</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salaries.map(s => (
                                    <tr key={s.id}>
                                        <td>{employees[s.employeeId] || s.employeeId}</td>
                                        <td>{s.basicSalary?.toFixed(2)}</td>
                                        <td>{s.allowances?.toFixed(2)}</td>
                                        <td>{s.overtimeHours} / {s.overtimePay?.toFixed(2)}</td>
                                        <td><strong>{s.grossSalary?.toFixed(2)}</strong></td>
                                        <td>
                                            EPF: {s.epfEmployee?.toFixed(2)}<br />
                                            Tax: {s.tax?.toFixed(2)}
                                        </td>
                                        <td className="text-success fw-bold">{s.netSalary?.toFixed(2)}</td>
                                        <td>
                                            <Button size="sm" variant="outline-primary" onClick={() => toast.info("Detailed view coming soon")}>View</Button>
                                            {/* Edit mode could be added here */}
                                        </td>
                                    </tr>
                                ))}
                                {salaries.length === 0 && <tr><td colSpan="8" className="text-center">No records generated for this month.</td></tr>}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="config" title="Configuration">
                    <Card className="p-4 shadow-sm" style={{ maxWidth: "600px" }}>
                        <h5 className="mb-3">Global Payroll Settings</h5>
                        <Form>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Reporting Time</Form.Label>
                                        <Form.Control type="time" value={config.reportingTime} onChange={e => setConfig({ ...config, reportingTime: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Shift End Time</Form.Label>
                                        <Form.Control type="time" value={config.shiftEndTime} onChange={e => setConfig({ ...config, shiftEndTime: e.target.value })} />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>OT Rate Multiplier</Form.Label>
                                        <Form.Control type="number" step="0.1" value={config.otRateMultiplier} onChange={e => setConfig({ ...config, otRateMultiplier: parseFloat(e.target.value) })} />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <hr />
                            <h6>Statutory Rates (0.08 = 8%)</h6>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>EPF (Employee)</Form.Label>
                                        <Form.Control type="number" step="0.01" value={config.epfRateEmployee} onChange={e => setConfig({ ...config, epfRateEmployee: parseFloat(e.target.value) })} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>EPF (Employer)</Form.Label>
                                        <Form.Control type="number" step="0.01" value={config.epfRateEmployer} onChange={e => setConfig({ ...config, epfRateEmployer: parseFloat(e.target.value) })} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>ETF</Form.Label>
                                        <Form.Control type="number" step="0.01" value={config.etfRate} onChange={e => setConfig({ ...config, etfRate: parseFloat(e.target.value) })} />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button variant="primary" onClick={saveConfig}>Save Configuration</Button>
                        </Form>
                    </Card>
                </Tab>
            </Tabs>
        </Container>
    );
}

export default SalaryManagement;
