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
    const [submittingTask, setSubmittingTask] = useState(false);
    const [taskForm, setTaskForm] = useState({ name: "", description: "", assignedTo: "", status: "TODO", priority: "MEDIUM", estimatedHours: "", startDate: "", dueDate: "" });

    // Log Data
    const [logTask, setLogTask] = useState(null);
    const [logForm, setLogForm] = useState({ durationHours: "", note: "" });

    const loadData = React.useCallback(async () => {
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
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        setSubmittingTask(true);
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
        } finally {
            setSubmittingTask(false);
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
            startDate: t.startDate,
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
            {/* Summary Cards */}
            <div className="row g-3 mb-3">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', borderLeft: '4px solid #0284c7' }}>
                        <div className="card-body">
                            <div className="text-muted small mb-1">📋 Total Tasks</div>
                            <div className="fs-3 fw-bold text-primary">{tasks.length}</div>
                            <div className="small text-muted mt-1">
                                ✅ Done: {tasks.filter(t => t.status === 'DONE').length} &nbsp;|&nbsp;
                                🔄 In Progress: {tasks.filter(t => t.status === 'IN_PROGRESS').length} &nbsp;|&nbsp;
                                📌 Todo: {tasks.filter(t => t.status === 'TODO').length}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderLeft: '4px solid #d97706' }}>
                        <div className="card-body">
                            <div className="text-muted small mb-1">⏱ Total Estimated Time</div>
                            <div className="fs-3 fw-bold text-warning" style={{ color: '#92400e' }}>
                                {tasks.reduce((s, t) => s + (parseFloat(t.estimatedHours) || 0), 0).toFixed(1)} hrs
                            </div>
                            <div className="small text-muted mt-1">
                                Across {tasks.filter(t => t.estimatedHours).length} task(s) with estimates
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', borderLeft: '4px solid #16a34a' }}>
                        <div className="card-body">
                            <div className="text-muted small mb-1">⏳ Total Time Taken</div>
                            <div className="fs-3 fw-bold" style={{ color: '#166534' }}>
                                {tasks.reduce((s, t) => s + (parseFloat(t.loggedHours) || 0), 0).toFixed(1)} hrs
                            </div>
                            {(() => {
                                const est = tasks.reduce((s, t) => s + (parseFloat(t.estimatedHours) || 0), 0);
                                const logged = tasks.reduce((s, t) => s + (parseFloat(t.loggedHours) || 0), 0);
                                const pct = est > 0 ? Math.min((logged / est) * 100, 100) : 0;
                                const over = est > 0 && logged > est;
                                return (
                                    <div className="small mt-1">
                                        <div className={`progress mt-1`} style={{ height: 6 }}>
                                            <div className={`progress-bar ${over ? 'bg-danger' : 'bg-success'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-muted">{pct.toFixed(0)}% of estimated{over ? ' ⚠️ Over budget' : ''}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex justify-content-between mb-3">
                <h5 className="mb-0">Project Tasks</h5>
                <Button onClick={() => { 
                    setEditingTask(null); 
                    setTaskForm({ name: "", description: "", assignedTo: "", status: "TODO", priority: "MEDIUM", estimatedHours: "", startDate: "", dueDate: "" });
                    setShowTaskModal(true); 
                }}>+ Add Task</Button>
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
                                <Form.Label>Start Date</Form.Label>
                                <Form.Control type="date" value={taskForm.startDate} onChange={e => setTaskForm({ ...taskForm, startDate: e.target.value })} />
                            </div>
                            <div className="flex-grow-1">
                                <Form.Label>Due Date</Form.Label>
                                <Form.Control type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="submit" disabled={submittingTask}>
                            {submittingTask ? "Saving..." : "Save Task"}
                        </Button>
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
