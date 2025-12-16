import React, { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Spinner, Badge } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';

export default function EmployeeHRWidget({ user }) {
    const [attendance, setAttendance] = useState(null);
    const [leave, setLeave] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const employeeId = localStorage.getItem("employeeId"); // Assuming stored on login
            if (!employeeId) return;

            // Load Attendance (Today)
            const attRes = await api.get(`/attendance/${employeeId}`);
            if (attRes.data && attRes.data.length > 0) {
                // Find today's record
                const today = new Date().toISOString().split('T')[0];
                const todayRecord = attRes.data.find(r => r.checkInTime && r.checkInTime.startsWith(today));
                setAttendance(todayRecord || null);
            }

            // Load Leave Quota
            const leaveRes = await api.get(`/leave/quota/${employeeId}`);
            setLeave(leaveRes.data);

        } catch (e) {
            console.error("Failed to load HR widget", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCheckIn = async () => {
        try {
            const employeeId = localStorage.getItem("employeeId");
            if (!employeeId) return toast.error("Employee ID not found");
            await api.post(`/attendance/checkin?employeeId=${employeeId}&manualEntry=false&shiftType=Morning`);
            toast.success("Checked In!");
            load();
        } catch (e) {
            toast.error("Check-in failed");
        }
    };

    const handleCheckOut = async () => {
        try {
            const employeeId = localStorage.getItem("employeeId");
            await api.post(`/attendance/checkout?employeeId=${employeeId}`);
            toast.success("Checked Out!");
            load();
        } catch (e) {
            toast.error("Check-out failed");
        }
    };

    if (!localStorage.getItem("employeeId")) return null; // Hide if not an employee

    return (
        <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-white fw-bold text-primary">HR & Attendance</Card.Header>
            <Card.Body>
                {loading ? <Spinner size="sm" /> : (
                    <Row>
                        <Col md={6} className="border-end">
                            <h6 className="text-muted">Today's Attendance</h6>
                            {attendance ? (
                                <div>
                                    <div className="mb-2">
                                        <Badge bg="success">In</Badge> {new Date(attendance.checkInTime).toLocaleTimeString()}
                                    </div>
                                    {attendance.checkOutTime ? (
                                        <div><Badge bg="danger">Out</Badge> {new Date(attendance.checkOutTime).toLocaleTimeString()}</div>
                                    ) : (
                                        <Button size="sm" variant="outline-danger" onClick={handleCheckOut}>Check Out Now</Button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div className="text-muted small mb-2">Not checked in</div>
                                    <Button size="sm" variant="primary" onClick={handleCheckIn}>Check In</Button>
                                </div>
                            )}
                        </Col>
                        <Col md={6}>
                            <h6 className="text-muted">Leave Balance</h6>
                            {leave ? (
                                <div className="small">
                                    <div className="d-flex justify-content-between">
                                        <span>Annual</span>
                                        <strong>{leave.annualLeaveTotal - leave.annualLeaveUsed}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span>Casual</span>
                                        <strong>{leave.casualLeaveTotal - leave.casualLeaveUsed}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span>Sick</span>
                                        <strong>{leave.sickLeaveTotal - leave.sickLeaveUsed}</strong>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted small">No quota assigned</div>
                            )}
                        </Col>
                    </Row>
                )}
            </Card.Body>
        </Card>
    );
}
