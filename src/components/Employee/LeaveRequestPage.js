import React, { useEffect, useState } from "react";
import { Container, Tabs, Tab, Table, Button, Form, Badge, Modal, Row, Col } from "react-bootstrap";
import api from "../../api/api";
import { toast } from "react-toastify";

function LeaveRequestPage() {
    const [key, setKey] = useState("my-leaves");
    const [showApplyModal, setShowApplyModal] = useState(false);

    // User Context
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const username = localStorage.getItem("username"); // Assuming stored on login
    const userRole = localStorage.getItem("role"); // ADMIN, HR, MANAGER, EMPLOYEE

    // Data
    const [myLeaves, setMyLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [employeesMap, setEmployeesMap] = useState({});
    const [quotas, setQuotas] = useState(null);

    // Form
    const [leaveForm, setLeaveForm] = useState({
        startDate: "",
        endDate: "",
        reason: "",
        leaveType: ""
    });

    useEffect(() => {
        resolveCurrentEmployee();
        fetchEmployeesMap();
    }, []);

    useEffect(() => {
        if (currentEmployee) {
            fetchMyLeaves();
            fetchQuota();
            if (["ADMIN", "HR", "MANAGER"].includes(userRole)) {
                fetchPendingLeaves();
            }
        }
    }, [currentEmployee, userRole]);

    const resolveCurrentEmployee = async () => {
        try {
            const res = await api.get("/employee/all");
            const me = res.data.find(e => e.username === username);
            if (me) setCurrentEmployee(me);
        } catch (e) {
            console.error("Failed to resolve employee");
        }
    };

    const fetchEmployeesMap = async () => {
        try {
            const res = await api.get("/employee/all");
            const map = {};
            res.data.forEach(e => map[e.id] = `${e.firstName} ${e.lastName}`);
            setEmployeesMap(map);
        } catch (e) { }
    };

    const fetchMyLeaves = async () => {
        if (!currentEmployee) return;
        try {
            const res = await api.get(`/leave/${currentEmployee.id}`);
            setMyLeaves(res.data || []);
        } catch (e) { toast.error("Failed to fetch leaves"); }
    };

    const fetchQuota = async () => {
        if (!currentEmployee) return;
        try {
            // Default to current year
            const year = new Date().getFullYear();
            const res = await api.get(`/leave/quota/${currentEmployee.id}?year=${year}`);
            setQuotas(res.data);
        } catch (e) { console.error("Failed to fetch quota"); }
    };

    const fetchPendingLeaves = async () => {
        try {
            const res = await api.get(`/leave/pending`);
            setPendingLeaves(res.data || []);
        } catch (e) { toast.error("Failed to fetch pending requests"); }
    };

    const handleApply = async () => {
        if (!currentEmployee) {
            toast.error("Could not identify current employee. Please relogin.");
            return;
        }
        if (!leaveForm.leaveType) {
            toast.error("Please select a Leave Type");
            return;
        }

        try {
            const payload = {
                ...leaveForm,
                employeeId: currentEmployee.id
            };
            await api.post("/leave/apply", payload);
            toast.success("Leave requested successfully");
            setShowApplyModal(false);
            setLeaveForm({ startDate: "", endDate: "", reason: "", leaveType: "" }); // Reset
            fetchMyLeaves();
            fetchQuota(); // Refresh balance
        } catch (e) {
            toast.error(e.response?.data || "Application failed");
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === "approve") await api.put(`/leave/approve/${id}`);
            else await api.put(`/leave/reject/${id}`);

            toast.success(`Leave ${action}d`);
            fetchPendingLeaves();
        } catch (e) {
            toast.error(e.response?.data || "Action failed");
        }
    };

    // Calculate Balances
    const getBalance = (type) => {
        if (!quotas) return { total: 0, used: 0, pending: 0, available: 0 };

        let total = 0;
        let used = 0;

        if (type === 'ANNUAL') { total = quotas.annualLeaveTotal; used = quotas.annualLeaveUsed; }
        else if (type === 'CASUAL') { total = quotas.casualLeaveTotal; used = quotas.casualLeaveUsed; }
        else if (type === 'SICK') { total = quotas.sickLeaveTotal; used = quotas.sickLeaveUsed; }

        // Calculate Pending locally
        // Filter myLeaves for PENDING and matching type AND year (optimistic)
        const currentYear = new Date().getFullYear();
        const pendingCount = myLeaves
            .filter(l => l.status === 'PENDING' && l.leaveType === type && new Date(l.startDate).getFullYear() === currentYear)
            .reduce((acc, l) => {
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                return acc + diffDays;
            }, 0);

        return {
            total,
            used,
            pending: pendingCount,
            available: total - used - pendingCount
        };
    };

    return (
        <Container className="my-5">
            <div className="d-flex justify-content-between mb-4">
                <h2>Leave Management</h2>
                <Button variant="primary" onClick={() => setShowApplyModal(true)}>+ Apply Leave</Button>
            </div>

            <Row>
                {/* Main Content: History & Approvals */}
                <Col md={8}>
                    <Tabs activeKey={key} onSelect={k => setKey(k)} className="mb-3">
                        <Tab eventKey="my-leaves" title="My Requests">
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Dates</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myLeaves.map(l => (
                                        <tr key={l.id}>
                                            <td><Badge bg="info">{l.leaveType}</Badge></td>
                                            <td>{l.startDate} to {l.endDate}</td>
                                            <td>{l.reason}</td>
                                            <td>
                                                <Badge bg={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}>
                                                    {l.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {myLeaves.length === 0 && <tr><td colSpan="4" className="text-center">No leave history</td></tr>}
                                </tbody>
                            </Table>
                        </Tab>

                        {["ADMIN", "HR", "MANAGER"].includes(userRole) && (
                            <Tab eventKey="approvals" title={`Approvals (${pendingLeaves.length})`}>
                                <Table striped bordered hover responsive>
                                    <thead>
                                        <tr className="table-dark">
                                            <th>Employee</th>
                                            <th>Type</th>
                                            <th>Dates</th>
                                            <th>Reason</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingLeaves.map(l => (
                                            <tr key={l.id}>
                                                <td>{employeesMap[l.employeeId] || l.employeeId}</td>
                                                <td><Badge bg="info">{l.leaveType}</Badge></td>
                                                <td>{l.startDate} to {l.endDate}</td>
                                                <td>{l.reason}</td>
                                                <td>
                                                    <Button size="sm" variant="success" className="me-2" onClick={() => handleAction(l.id, 'approve')}>Approve</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleAction(l.id, 'reject')}>Reject</Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {pendingLeaves.length === 0 && <tr><td colSpan="5" className="text-center">No pending approvals</td></tr>}
                                    </tbody>
                                </Table>
                            </Tab>
                        )}
                    </Tabs>
                </Col>

                {/* Sidebar: Quota & Current Year Summary */}
                <Col md={4}>
                    <div className="bg-light p-3 rounded mb-3">
                        <h5 className="mb-3">Leave Balance ({new Date().getFullYear()})</h5>
                        {quotas ? ['ANNUAL', 'CASUAL', 'SICK'].map(type => {
                            const bal = getBalance(type);
                            return (
                                <div key={type} className="mb-3 border-bottom pb-2">
                                    <div className="d-flex justify-content-between">
                                        <strong>{type}</strong>
                                        <span className={bal.available < 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                            {bal.available} / {bal.total}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between small text-muted">
                                        <span>Used: {bal.used}</span>
                                        <span>Pending: {bal.pending}</span>
                                    </div>
                                </div>
                            );
                        }) : <p>Loading quotas...</p>}
                    </div>

                    <div className="bg-light p-3 rounded">
                        <h5 className="mb-3">History ({new Date().getFullYear()})</h5>
                        <ul className="list-unstyled small">
                            {myLeaves
                                .filter(l => new Date(l.startDate).getFullYear() === new Date().getFullYear())
                                .slice(0, 5) // Show top 5
                                .map(l => (
                                    <li key={l.id} className="mb-2 border-bottom pb-1">
                                        <div className="d-flex justify-content-between">
                                            <Badge bg="secondary">{l.leaveType}</Badge>
                                            <span className="text-muted">{l.startDate}</span>
                                        </div>
                                        <div>{l.status}</div>
                                    </li>
                                ))}
                            {myLeaves.filter(l => new Date(l.startDate).getFullYear() === new Date().getFullYear()).length === 0 &&
                                <li>No history this year</li>}
                        </ul>
                    </div>
                </Col>
            </Row>

            {/* Apply Modal */}
            <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)}>
                <Modal.Header closeButton><Modal.Title>Apply for Leave</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Leave Type</Form.Label>
                            <Form.Select
                                value={leaveForm.leaveType || ""}
                                onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                            >
                                <option value="">-- Select Type --</option>
                                <option value="ANNUAL">Annual</option>
                                <option value="CASUAL">Casual</option>
                                <option value="SICK">Sick</option>
                            </Form.Select>
                            {/* LIVE QUOTA HINT */}
                            {leaveForm.leaveType && quotas && (
                                <div className="mt-1 small">
                                    Available Balance: <strong>{getBalance(leaveForm.leaveType).available}</strong> (Pending: {getBalance(leaveForm.leaveType).pending})
                                </div>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Reason</Form.Label>
                            <Form.Control as="textarea" rows={3} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowApplyModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleApply}>Submit Request</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default LeaveRequestPage;
