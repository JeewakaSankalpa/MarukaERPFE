import React, { useEffect, useState } from "react";
import { Container, Button, Card, Table, Badge, Row, Col } from "react-bootstrap";
import api from "../../api/api";
import { toast } from "react-toastify";

function AttendancePage() {
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("UNKNOWN"); // CHECKED_IN, CHECKED_OUT

    useEffect(() => {
        resolveCurrentEmployee();
    }, []);

    const resolveCurrentEmployee = async () => {
        const username = localStorage.getItem("username");
        if (!username) return;
        try {
            const res = await api.get("/employee/all");
            const me = res.data.find(e => e.username === username);
            if (me) {
                setCurrentEmployee(me);
                fetchLogs(me.id);
            }
        } catch (e) { }
    };

    const fetchLogs = async (empId) => {
        try {
            const res = await api.get(`/attendance/${empId}`);
            const data = res.data || [];
            setLogs(data);

            // Determine status
            const lastLog = data[data.length - 1];
            if (lastLog && !lastLog.checkOutTime) {
                setStatus("CHECKED_IN");
            } else {
                setStatus("CHECKED_OUT");
            }
        } catch (e) { }
    };

    const getGeoLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                resolve({ lat: null, lon: null });
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        });
                    },
                    (error) => {
                        console.error("Geo error:", error);
                        resolve({ lat: null, lon: null }); // Proceed without geo if error
                    }
                );
            }
        });
    };

    const handleCheckIn = async () => {
        if (!currentEmployee) return;
        setLoading(true);
        try {
            const { lat, lon } = await getGeoLocation();

            // shiftType hardcoded for now, could be dropdown
            let url = `/attendance/checkin?employeeId=${currentEmployee.id}&manualEntry=false&shiftType=REGULAR`;
            if (lat) url += `&lat=${lat}&lon=${lon}`;

            await api.post(url);
            toast.success("Checked In Successfully!");
            fetchLogs(currentEmployee.id);
            setStatus("CHECKED_IN");
        } catch (e) {
            toast.error("Check-in failed");
        } finally { setLoading(false); }
    };

    const handleCheckOut = async () => {
        if (!currentEmployee) return;
        setLoading(true);
        try {
            const { lat, lon } = await getGeoLocation();

            let url = `/attendance/checkout?employeeId=${currentEmployee.id}`;
            if (lat) url += `&lat=${lat}&lon=${lon}`;

            await api.post(url);
            toast.success("Checked Out Successfully!");
            fetchLogs(currentEmployee.id);
            setStatus("CHECKED_OUT");
        } catch (e) {
            toast.error("Check-out failed");
        } finally { setLoading(false); }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "-";
        return new Date(timeStr).toLocaleString();
    };

    return (
        <Container className="my-5">
            <h2 className="mb-4">Attendance Tracker</h2>

            <Card className="text-center p-5 mb-4 shadow-sm">
                <h3>Hello, {currentEmployee?.firstName}</h3>
                <p className="lead">Current Status:
                    <Badge bg={status === 'CHECKED_IN' ? 'success' : 'secondary'} className="ms-2">
                        {status === 'CHECKED_IN' ? 'Working' : 'Away'}
                    </Badge>
                </p>

                <div className="d-flex justify-content-center gap-3 mt-3">
                    <Button
                        variant="success"
                        size="lg"
                        onClick={handleCheckIn}
                        disabled={status === 'CHECKED_IN' || loading}
                    >
                        Check In
                    </Button>
                    <Button
                        variant="warning"
                        size="lg"
                        onClick={handleCheckOut}
                        disabled={status !== 'CHECKED_IN' || loading}
                    >
                        Check Out
                    </Button>
                </div>
            </Card>

            <h4>Recent Logs</h4>
            <Table striped bordered>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Shift</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.slice().reverse().map((l, i) => (
                        <tr key={i}>
                            <td>{new Date(l.checkInTime).toLocaleDateString()}</td>
                            <td>{formatTime(l.checkInTime)}</td>
                            <td>{formatTime(l.checkOutTime)}</td>
                            <td>{l.shiftType}</td>
                        </tr>
                    ))}
                    {logs.length === 0 && <tr><td colSpan="4">No attendance records found.</td></tr>}
                </tbody>
            </Table>
        </Container>
    );
}

export default AttendancePage;
