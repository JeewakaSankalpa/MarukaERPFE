import React, { useEffect, useState } from "react";
import { Container, Tabs, Tab, Form, Button, Table, Row, Col, Card, Alert, Spinner, Badge, Modal } from "react-bootstrap";
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

    // -- Attendance State --
    const [attendanceReport, setAttendanceReport] = useState([]);
    const [viewingEmployee, setViewingEmployee] = useState(null); // For attendance modal/expand
    const [viewingSalary, setViewingSalary] = useState(null); // For salary Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editRecord, setEditRecord] = useState(null);

    useEffect(() => {
        fetchEmployees();
        if (key === "processing") fetchSalaries();
        if (key === "config") fetchConfig();
        if (key === "attendance") fetchAttendanceReport();
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

    const fetchAttendanceReport = async () => {
        setLoading(true);
        try {
            const [year, month] = selectedMonth.split("-");
            const res = await api.get(`/attendance/report?year=${year}&month=${month}`);
            setAttendanceReport(res.data || []);
        } catch (e) {
            console.error("Attendance Report Error:", e);
            if (e.response) {
                console.error("Status:", e.response.status);
                console.error("Data:", e.response.data);
                toast.error(`Failed to load: ${e.response.status} - ${JSON.stringify(e.response.data)}`);
            } else {
                toast.error(`Error: ${e.message}`);
            }
        } finally { setLoading(false); }
    };

    const handleEditAttendance = async () => {
        try {
            if (!editRecord.reason) { toast.error("Reason is required"); return; }

            if (editRecord.attendanceId) {
                // Update existing
                await api.put(`/attendance/${editRecord.attendanceId}`, {
                    checkIn: editRecord.checkIn,
                    checkOut: editRecord.checkOut,
                    reason: editRecord.reason
                });
            } else {
                // Create manual
                await api.post(`/attendance/manual`, {
                    employeeId: viewingEmployee.employeeId,
                    checkIn: editRecord.checkIn,
                    checkOut: editRecord.checkOut,
                    reason: editRecord.reason
                });
            }
            toast.success("Attendance Updated");
            setShowEditModal(false);
            fetchAttendanceReport();
        } catch (e) {
            toast.error("Update failed");
        }
    };

    const exportExcel = () => {
        let csv = "Employee,Date,Status,CheckIn,CheckOut,WorkedHours,Comments\n";
        attendanceReport.forEach(e => {
            e.dailyRecords.forEach(d => {
                csv += `${e.employeeName},${d.date},${d.status},${d.checkIn || ''},${d.checkOut || ''},${d.workedHours || 0},${d.comments || ''}\n`;
            });
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_${selectedMonth}.csv`;
        a.click();
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
                                    <th>Deductions</th>
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
                                            <small className="d-block">EPF(8%): {s.epfEmployee?.toFixed(2)}</small>
                                            <small className="d-block">Tax: {s.tax?.toFixed(2)}</small>
                                            {s.noPayDeduction > 0 && <small className="d-block text-danger">No Pay: {s.noPayDeduction?.toFixed(2)}</small>}
                                        </td>
                                        <td className="text-success fw-bold">{s.netSalary?.toFixed(2)}</td>
                                        <td>
                                            <Button size="sm" variant="outline-primary" onClick={() => setViewingSalary(s)}>View</Button>
                                        </td>
                                    </tr>
                                ))}
                                {salaries.length === 0 && <tr><td colSpan="8" className="text-center">No records generated for this month.</td></tr>}
                            </tbody>
                        </Table>
                    </Card>

                    {/* Salary Breakdown Modal */}
                    <Modal show={!!viewingSalary} onHide={() => setViewingSalary(null)} size="lg">
                        <Modal.Header closeButton>
                            <Modal.Title>Salary Breakdown: {viewingSalary && (employees[viewingSalary.employeeId] || viewingSalary.employeeId)}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            {viewingSalary && (
                                <Container>
                                    <Row className="mb-3">
                                        <Col md={6}>
                                            <Card className="h-100 border-success">
                                                <Card.Header className="bg-success text-white">Earnings</Card.Header>
                                                <Card.Body>
                                                    <Table size="sm" borderless>
                                                        <tbody>
                                                            <tr><td>Basic Salary</td><td className="text-end">{viewingSalary.basicSalary?.toFixed(2)}</td></tr>
                                                            <tr><td>Allowances</td><td className="text-end">{viewingSalary.allowances?.toFixed(2)}</td></tr>
                                                            <tr><td>Bonuses</td><td className="text-end">{viewingSalary.bonuses?.toFixed(2)}</td></tr>
                                                            <tr><td>Overtime ({viewingSalary.overtimeHours} hrs)</td><td className="text-end">{viewingSalary.overtimePay?.toFixed(2)}</td></tr>
                                                            <tr className="border-top mt-2 fw-bold"><td>Gross Salary</td><td className="text-end">{viewingSalary.grossSalary?.toFixed(2)}</td></tr>
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={6}>
                                            <Card className="h-100 border-danger">
                                                <Card.Header className="bg-danger text-white">Deductions</Card.Header>
                                                <Card.Body>
                                                    <Table size="sm" borderless>
                                                        <tbody>
                                                            <tr><td>EPF (Employee 8%)</td><td className="text-end">{viewingSalary.epfEmployee?.toFixed(2)}</td></tr>
                                                            <tr><td>Tax (PAYE)</td><td className="text-end">{viewingSalary.tax?.toFixed(2)}</td></tr>
                                                            <tr><td>Other Deductions</td><td className="text-end">{viewingSalary.otherDeductions?.toFixed(2)}</td></tr>
                                                            <tr className="text-danger"><td>No Pay Deduction</td><td className="text-end">{viewingSalary.noPayDeduction?.toFixed(2)}</td></tr>
                                                            <tr className="border-top mt-2 fw-bold"><td>Total Deductions</td><td className="text-end">{(viewingSalary.epfEmployee + viewingSalary.tax + viewingSalary.otherDeductions + viewingSalary.noPayDeduction).toFixed(2)}</td></tr>
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <Alert variant="info" className="d-flex justify-content-between align-items-center">
                                                <h4 className="m-0">Net Salary</h4>
                                                <h3 className="m-0 fw-bold">{viewingSalary.netSalary?.toFixed(2)}</h3>
                                            </Alert>
                                        </Col>
                                    </Row>
                                    <Row className="mt-3">
                                        <Col>
                                            <h6 className="text-muted">Employer Contributions (Not deducted from Net)</h6>
                                            <Table size="sm" bordered>
                                                <tbody>
                                                    <tr><td>EPF (Employer 12%)</td><td>{viewingSalary.epfEmployer?.toFixed(2)}</td></tr>
                                                    <tr><td>ETF (3%)</td><td>{viewingSalary.etf?.toFixed(2)}</td></tr>
                                                    <tr className="fw-bold bg-light"><td>Total Company Cost</td><td>{(viewingSalary.grossSalary + viewingSalary.epfEmployer + viewingSalary.etf).toFixed(2)}</td></tr>
                                                </tbody>
                                            </Table>
                                        </Col>
                                    </Row>
                                </Container>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setViewingSalary(null)}>Close</Button>
                            <Button variant="primary" onClick={() => window.print()}>Print View</Button>
                        </Modal.Footer>
                    </Modal>
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

                <Tab eventKey="attendance" title="Attendance Review">
                    <Card className="p-4 shadow-sm">
                        <div className="d-flex justify-content-between mb-3 align-items-center">
                            <div>
                                <Form.Label>Review Month</Form.Label>
                                <Form.Control type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                            </div>
                            <Button variant="success" onClick={exportExcel}>Export Excel/CSV</Button>
                        </div>
                        <Table striped bordered size="sm" hover>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Present</th>
                                    <th>Late</th>
                                    <th>Leaves</th>
                                    <th>Worked Hrs</th>
                                    <th>OT Hrs</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceReport.map(r => (
                                    <React.Fragment key={r.employeeId}>
                                        <tr onClick={() => setViewingEmployee(viewingEmployee?.employeeId === r.employeeId ? null : r)} style={{ cursor: 'pointer' }}>
                                            <td>{r.employeeName}</td>
                                            <td>{r.totalPresent}</td>
                                            <td>{r.totalLate}</td>
                                            <td>{r.totalLeaves}</td>
                                            <td>{r.totalWorkedHours.toFixed(1)}</td>
                                            <td>{r.totalOvertimeHours.toFixed(1)}</td>
                                            <td>
                                                {r.totalLate > 0 && <Badge bg="warning" className="me-1">Late</Badge>}
                                            </td>
                                            <td>
                                                <small>{viewingEmployee?.employeeId === r.employeeId ? '▼' : '▶'}</small>
                                            </td>
                                        </tr>
                                        {viewingEmployee?.employeeId === r.employeeId && (
                                            <tr>
                                                <td colSpan="8" className="bg-light p-3">
                                                    <strong>Daily Breakdown:</strong>
                                                    <Table size="sm" bordered className="mt-2 bg-white">
                                                        <thead>
                                                            <tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th>Hours</th><th>Comments</th><th>Edit</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {r.dailyRecords.map(d => (
                                                                <tr key={d.date} className={d.status === 'ABSENT' ? 'table-danger' : ''}>
                                                                    <td>{d.date} <small className="text-muted">{d.dayOfWeek}</small></td>
                                                                    <td>{d.status}</td>
                                                                    <td>{d.checkIn ? new Date(d.checkIn).toLocaleTimeString() : '-'}</td>
                                                                    <td>{d.checkOut ? new Date(d.checkOut).toLocaleTimeString() : '-'}</td>
                                                                    <td>{d.workedHours}</td>
                                                                    <td>{d.comments}</td>
                                                                    <td>
                                                                        <Button size="sm" variant="link" onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditRecord({
                                                                                attendanceId: d.attendanceId,
                                                                                checkIn: d.checkIn ? d.checkIn : `${d.date}T08:30`,
                                                                                checkOut: d.checkOut ? d.checkOut : `${d.date}T17:00`,
                                                                                reason: "",
                                                                                date: d.date // Pass date for manual creation reference if needed
                                                                            });
                                                                            setShowEditModal(true);
                                                                        }}>Edit</Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>
            </Tabs>

            {/* Edit Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Attendance Record</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editRecord && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Check In</Form.Label>
                                <Form.Control type="datetime-local" value={editRecord.checkIn} onChange={(e) => setEditRecord({ ...editRecord, checkIn: e.target.value })} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Check Out</Form.Label>
                                <Form.Control type="datetime-local" value={editRecord.checkOut} onChange={(e) => setEditRecord({ ...editRecord, checkOut: e.target.value })} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Reason / Correction Note (Required)</Form.Label>
                                <Form.Control as="textarea" rows={3} value={editRecord.reason} onChange={(e) => setEditRecord({ ...editRecord, reason: e.target.value })} />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleEditAttendance}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default SalaryManagement;
