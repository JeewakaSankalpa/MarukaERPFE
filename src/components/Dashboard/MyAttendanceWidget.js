import React, { useEffect, useState } from "react";
import { Card, Button, Badge, Spinner } from "react-bootstrap";
import { FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import api from "../../api/api";
import { toast } from "react-toastify";
import { formatAttendanceTime, getOfficeTodayString } from "../../utils/attendanceTime";

export default function MyAttendanceWidget() {
    const [loading, setLoading] = useState(false);
    const [todayRecord, setTodayRecord] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const employeeId = localStorage.getItem("employeeId");

    useEffect(() => {
        // Clock
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Fetch status
        if (employeeId) {
            fetchAttendance();
        }

        return () => clearInterval(interval);
    }, [employeeId]);

    const fetchAttendance = async () => {
        try {
            // Get all records (Not ideal, but endpoint limitation for now)
            const res = await api.get(`/attendance/${employeeId}`);
            const todayStr = getOfficeTodayString();

            // Find record for today
            const found = res.data?.find(r => r.checkInTime && r.checkInTime.startsWith(todayStr));
            setTodayRecord(found || null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAction = async (type) => { // 'checkin' or 'checkout'
        if (!employeeId) return;
        setLoading(true);
        try {
            if (type === 'checkin') {
                await api.post(`/attendance/checkin`, null, {
                    params: {
                        employeeId,
                        manualEntry: false,
                        shiftType: "REGULAR" // Default
                    }
                });
                toast.success("Checked In Successfully!");
            } else {
                await api.post(`/attendance/checkout`, null, {
                    params: { employeeId }
                });
                toast.success("Checked Out Successfully!");
            }
            fetchAttendance();
        } catch (error) {
            toast.error("Action failed");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!employeeId) return null; // Don't show if not an employee

    const isCheckedIn = !!todayRecord;
    const isCheckedOut = todayRecord?.checkOutTime != null;

    return (
        <Card className="h-100 shadow-sm border-0 dashboard-widget-card dashboard-attendance-card">
            <Card.Body className="d-flex flex-column p-3">
                <div className="dashboard-attendance-heading">
                    <div><span className="dashboard-widget-kicker">Today</span><h5 className="mb-0">Check In</h5></div>
                    <div className="text-end">
                    <h2 className="mb-0 fw-bold text-dark">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
                    <small className="text-muted">{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</small>
                    </div>
                </div>

                <div className="my-3 w-100">
                    {isCheckedIn ? (
                        <div className="p-3 bg-white rounded shadow-sm border">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted small">Check In</span>
                                <span className="fw-bold text-success">
                                    {formatAttendanceTime(todayRecord.checkInTime)}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted small">Check Out</span>
                                <span className={`fw-bold ${isCheckedOut ? 'text-danger' : 'text-secondary'}`}>
                                    {isCheckedOut
                                        ? formatAttendanceTime(todayRecord.checkOutTime)
                                        : '--:--'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted fst-italic py-2">Not checked in today</div>
                    )}
                </div>

                {!isCheckedOut && (
                    <Button
                        variant={isCheckedIn ? "danger" : "success"}
                        size="lg"
                        className="w-100 rounded-pill shadow-sm"
                        onClick={() => handleAction(isCheckedIn ? 'checkout' : 'checkin')}
                        disabled={loading}
                    >
                        {loading ? <Spinner size="sm" /> : (
                            isCheckedIn ? <><FaSignOutAlt className="me-2" />Check Out</> : <><FaSignInAlt className="me-2" />Check In</>
                        )}
                    </Button>
                )}

                {isCheckedOut && (
                    <Badge bg="secondary" className="p-2 w-100">Shift Completed</Badge>
                )}
            </Card.Body>
        </Card>
    );
}
