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

    // Form
    const [leaveForm, setLeaveForm] = useState({
        startDate: "",
        endDate: "",
        reason: ""
    });

    useEffect(() => {
        resolveCurrentEmployee();
        fetchEmployeesMap();
    }, []);

    useEffect(() => {
        if (currentEmployee) {
            fetchMyLeaves();
            if (["ADMIN", "HR", "MANAGER"].includes(userRole)) {
                fetchPendingLeaves();
            }
        }
    }, [currentEmployee, userRole]);

    const resolveCurrentEmployee = async () => {
        try {
            // Inefficient lookup, strictly strictly requires backend refactor to return employeeId on login
            const res = await api.get("/employee/all");
            const me = res.data.find(e => e.username === username); // Match by username
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

    const fetchPendingLeaves = async () => {
        try {
            const res = await api.get(`/leave/pending`);
            setPendingLeaves(res.data || []);
        } catch (e) { toast.error("Failed to fetch pending requests"); }
    };

    const handleApply = async () => {
        if (!currentEmployee) return;
        try {
            const payload = {
                ...leaveForm,
                employeeId: currentEmployee.id
            };
            await api.post("/leave/apply", payload);
            toast.success("Leave requested successfully");
            setShowApplyModal(false);
            fetchMyLeaves();
        } catch (e) {
            toast.error("Application failed");
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === "approve") await api.put(`/leave/approve/${id}`);
            else await api.put(`/leave/reject/${id}`);

            toast.success(`Leave ${action}d`);
            fetchPendingLeaves();
        } catch (e) {
            toast.error("Action failed");
        }
    };

    return (
        <Container className="my-5">
            <div className="d-flex justify-content-between mb-4">
                <h2>Leave Management</h2>
                <Button variant="primary" onClick={() => setShowApplyModal(true)}>+ Apply Leave</Button>
            </div>

            <Tabs activeKey={key} onSelect={k => setKey(k)} className="mb-3">
                <Tab eventKey="my-leaves" title="My Requests">
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Dates</th>
                                <th>Reason</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myLeaves.map(l => (
                                <tr key={l.id}>
                                    <td>{l.startDate} to {l.endDate}</td>
                                    <td>{l.reason}</td>
                                    <td>
                                        <Badge bg={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}>
                                            {l.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {myLeaves.length === 0 && <tr><td colSpan="3" className="text-center">No leave history</td></tr>}
                        </tbody>
                    </Table>
                </Tab>

                {["ADMIN", "HR", "MANAGER"].includes(userRole) && (
                    <Tab eventKey="approvals" title={`Approvals (${pendingLeaves.length})`}>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Dates</th>
                                    <th>Reason</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingLeaves.map(l => (
                                    <tr key={l.id}>
                                        <td>{employeesMap[l.employeeId] || l.employeeId}</td>
                                        <td>{l.startDate} to {l.endDate}</td>
                                        <td>{l.reason}</td>
                                        <td>
                                            <Button size="sm" variant="success" className="me-2" onClick={() => handleAction(l.id, 'approve')}>Approve</Button>
                                            <Button size="sm" variant="danger" onClick={() => handleAction(l.id, 'reject')}>Reject</Button>
                                        </td>
                                    </tr>
                                ))}
                                {pendingLeaves.length === 0 && <tr><td colSpan="4" className="text-center">No pending approvals</td></tr>}
                            </tbody>
                        </Table>
                    </Tab>
                )}
            </Tabs>

            {/* Apply Modal */}
            <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)}>
                <Modal.Header closeButton><Modal.Title>Apply for Leave</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
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
