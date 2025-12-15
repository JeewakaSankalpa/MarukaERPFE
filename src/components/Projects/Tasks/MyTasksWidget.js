import React, { useEffect, useState } from "react";
import { Card, Table, Button, Badge, Modal, Form } from "react-bootstrap";
import { FaPlay, FaPause, FaCheck, FaClock } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../../api/api"; // Adjust path as needed

const MyTasksWidget = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [logData, setLogData] = useState({ durationHours: 0, note: "" });

    useEffect(() => {
        fetchMyTasks();
    }, []);

    const fetchMyTasks = async () => {
        try {
            const res = await api.get("/tasks/my-tasks");
            setTasks(res.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const handleLogWork = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/tasks/${selectedTask.id}/log-work`, logData);
            toast.success("Time logged!");
            setShowLogModal(false);
            fetchMyTasks();
        } catch (e) {
            toast.error("Failed to log time");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "TODO": return "secondary";
            case "IN_PROGRESS": return "primary";
            case "REVIEW": return "warning";
            case "DONE": return "success";
            default: return "secondary";
        }
    };

    if (loading) return <div>Loading tasks...</div>;

    return (
        <Card className="shadow-sm h-100">
            <Card.Header className="bg-white border-bottom-0 d-flex justify-content-between align-items-center">
                <h5 className="mb-0"><FaClock className="me-2 text-primary" />My Assigned Tasks</h5>
                <Button variant="link" size="sm" onClick={fetchMyTasks}>Refresh</Button>
            </Card.Header>
            <Card.Body className="p-0 table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Table hover className="mb-0 text-nowrap">
                    <thead className="table-light">
                        <tr>
                            <th>Task</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Due</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.length === 0 ? (
                            <tr><td colSpan="5" className="text-center text-muted">No active tasks assigned.</td></tr>
                        ) : (
                            tasks.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="fw-bold text-truncate" style={{ maxWidth: '150px' }}>{t.name}</div>
                                        <small className="text-muted">{t.projectName}</small> {/* Ensure backend sends this or fetch it */}
                                    </td>
                                    <td><Badge bg={getStatusBadge(t.status)}>{t.status}</Badge></td>
                                    <td>
                                        <Badge bg={t.priority === 'HIGH' ? 'danger' : t.priority === 'MEDIUM' ? 'warning' : 'info'}>
                                            {t.priority}
                                        </Badge>
                                    </td>
                                    <td>{t.dueDate}</td>
                                    <td>
                                        <Button size="sm" variant="outline-success" onClick={() => { setSelectedTask(t); setShowLogModal(true); }}>
                                            Log Time
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card.Body>

            <Modal show={showLogModal} onHide={() => setShowLogModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Log Time: {selectedTask?.name}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleLogWork}>
                        <Form.Group className="mb-3">
                            <Form.Label>Hours Spent</Form.Label>
                            <Form.Control type="number" step="0.5" required
                                value={logData.durationHours}
                                onChange={e => setLogData({ ...logData, durationHours: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Note</Form.Label>
                            <Form.Control as="textarea" rows={2}
                                value={logData.note}
                                onChange={e => setLogData({ ...logData, note: e.target.value })}
                            />
                        </Form.Group>
                        <Button type="submit" variant="primary" className="w-100">Submit Log</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Card>
    );
};

export default MyTasksWidget;
