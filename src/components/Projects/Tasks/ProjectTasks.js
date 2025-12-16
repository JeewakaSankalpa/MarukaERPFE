import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Badge, ProgressBar } from "react-bootstrap";
import api from "../../../api/api";
import { toast } from "react-toastify";

const ProjectTasks = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Modals
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);

    // Form Data
    const [editingTask, setEditingTask] = useState(null);
    const [taskForm, setTaskForm] = useState({ name: "", description: "", assignedTo: "", status: "TODO", priority: "MEDIUM", estimatedHours: "", dueDate: "" });

    // Log Data
    const [logTask, setLogTask] = useState(null);
    const [logForm, setLogForm] = useState({ durationHours: "", note: "" });

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            const [tRes, eRes] = await Promise.all([
                api.get(`/tasks/by-project/${projectId}`),
                api.get("/employee/all")
            ]);
            setTasks(tRes.data);
            setEmployees(eRes.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTask) {
                await api.put(`/tasks/${editingTask.id}`, { ...taskForm, projectId });
            } else {
                await api.post("/tasks", { ...taskForm, projectId });
            }
            toast.success("Task Saved");
            setShowTaskModal(false);
            loadData();
        } catch (e) {
            toast.error("Failed to save task");
        }
    };

    const handleLogSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/tasks/${logTask.id}/log-work`, {
                ...logForm,
                durationHours: parseFloat(logForm.durationHours)
            });
            toast.success("Work Logged");
            setShowLogModal(false);
            loadData();
        } catch (e) {
            toast.error("Failed to log work");
        }
    };

    const openEdit = (t) => {
        setEditingTask(t);
        setTaskForm({
            name: t.name,
            description: t.description,
            assignedTo: t.assignedTo,
            status: t.status,
            priority: t.priority,
            estimatedHours: t.estimatedHours,
            dueDate: t.dueDate
        });
        setShowTaskModal(true);
    };

    const openLog = (t) => {
        setLogTask(t);
        setLogForm({ durationHours: "", note: "" });
        setShowLogModal(true);
    };

    const getEmployeeName = (id) => {
        const e = employees.find(e => e.id === id);
        return e ? `${e.firstName} ${e.lastName}` : id;
    };

    return (
        <div className="p-3">
            <div className="d-flex justify-content-between mb-3">
                <h5 className="mb-0">Project Tasks</h5>
                <Button onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Add Task</Button>
            </div>

            <Table hover bordered>
                <thead className="table-light">
                    <tr>
                        <th>Task</th>
                        <th>Assignee</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th className="text-end">Hours (Log / Est)</th>
                        <th>Due Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(t => {
                        const progress = t.estimatedHours ? (t.loggedHours / t.estimatedHours) * 100 : 0;
                        return (
                            <tr key={t.id}>
                                <td>
                                    <div className="fw-bold">{t.name}</div>
                                    <small className="text-muted">{t.description}</small>
                                </td>
                                <td>{getEmployeeName(t.assignedTo)}</td>
                                <td><Badge bg={t.status === "DONE" ? "success" : t.status === "IN_PROGRESS" ? "primary" : "secondary"}>{t.status}</Badge></td>
                                <td>{t.priority}</td>
                                <td className="text-end" style={{ width: 150 }}>
                                    <div>{t.loggedHours || 0} / {t.estimatedHours || "-"}</div>
                                    {t.estimatedHours && <ProgressBar now={progress} variant={progress > 100 ? "danger" : "success"} style={{ height: 4 }} />}
                                </td>
                                <td>{t.dueDate}</td>
                                <td>
                                    <Button size="sm" variant="link" onClick={() => openEdit(t)}>Edit</Button>
                                    <Button size="sm" variant="outline-success" onClick={() => openLog(t)}>Log Time</Button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </Table>

            {/* Task Modal */}
            <Modal show={showTaskModal} onHide={() => setShowTaskModal(false)}>
                <Form onSubmit={handleTaskSubmit}>
                    <Modal.Header closeButton><Modal.Title>{editingTask ? "Edit Task" : "New Task"}</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-2">
                            <Form.Label>Task Name</Form.Label>
                            <Form.Control required value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Assign To</Form.Label>
                            <Form.Select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                                <option value="">Unassigned</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Status</Form.Label>
                            <Form.Select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                                <option>TODO</option>
                                <option>IN_PROGRESS</option>
                                <option>REVIEW</option>
                                <option>DONE</option>
                            </Form.Select>
                        </Form.Group>
                        <div className="d-flex gap-2">
                            <div className="flex-grow-1">
                                <Form.Label>Est. Hours</Form.Label>
                                <Form.Control type="number" step="0.5" value={taskForm.estimatedHours} onChange={e => setTaskForm({ ...taskForm, estimatedHours: e.target.value })} />
                            </div>
                            <div className="flex-grow-1">
                                <Form.Label>Due Date</Form.Label>
                                <Form.Control type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="submit">Save Task</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Log Modal */}
            <Modal show={showLogModal} onHide={() => setShowLogModal(false)}>
                <Form onSubmit={handleLogSubmit}>
                    <Modal.Header closeButton><Modal.Title>Log Work: {logTask?.name}</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-2">
                            <Form.Label>Hours Worked</Form.Label>
                            <Form.Control type="number" step="0.25" required value={logForm.durationHours} onChange={e => setLogForm({ ...logForm, durationHours: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Note</Form.Label>
                            <Form.Control as="textarea" value={logForm.note} onChange={e => setLogForm({ ...logForm, note: e.target.value })} />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="submit" variant="success">Log Time</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectTasks;
