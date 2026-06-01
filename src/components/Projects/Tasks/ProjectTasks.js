import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Badge, ProgressBar } from "react-bootstrap";
import api from "../../../api/api";
import { toast } from "react-toastify";
import Select from "react-select";
import SafeSelect from '../../ReusableComponents/SafeSelect';
import SafeDatePicker from '../../ReusableComponents/SafeDatePicker';

const ProjectTasks = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Modals
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);

    // Form Data
    const [editingTask, setEditingTask] = useState(null);
    const [submittingTask, setSubmittingTask] = useState(false);
    const [taskForm, setTaskForm] = useState({ name: "", description: "", assignedToIds: [], status: "TODO", priority: "MEDIUM", estimatedHours: "", startDate: "", dueDate: "" });

    // Log Data
    const [logTask, setLogTask] = useState(null);
    const [logForm, setLogForm] = useState({ userId: "", durationHours: "", note: "", logDate: new Date().toISOString().split('T')[0] });

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
            const assignedToIds = Array.isArray(taskForm.assignedToIds)
                ? taskForm.assignedToIds.filter(Boolean)
                : (taskForm.assignedToIds ? [taskForm.assignedToIds] : []);
            const payload = { ...taskForm, assignedToIds, assignedTo: assignedToIds[0] || "", projectId };
            if (editingTask) {
                await api.put(`/tasks/${editingTask.id}`, payload);
            } else {
                await api.post("/tasks", payload);
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
                employeeName: getEmployeeName(logForm.userId),
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
        const assignedToIds = getAssignedIds(t);
        setEditingTask(t);
        setTaskForm({
            name: t.name,
            description: t.description,
            assignedToIds,
            status: t.status,
            priority: t.priority,
            estimatedHours: t.estimatedHours,
            startDate: t.startDate,
            dueDate: t.dueDate
        });
        setShowTaskModal(true);
    };

    const openLog = (t) => {
        const assignedToIds = getAssignedIds(t);
        setLogTask(t);
        setLogForm({ userId: assignedToIds[0] || "", durationHours: "", note: "", logDate: new Date().toISOString().split('T')[0] });
        setShowLogModal(true);
    };

    const getAssignedIds = (task) => {
        const ids = new Set();
        (task?.assignedToIds || []).forEach(id => id && ids.add(id));
        if (task?.assignedTo) ids.add(task.assignedTo);
        return Array.from(ids);
    };

    const getEmployeeName = (id) => {
        const e = employees.find(e => String(e.id) === String(id));
        return e ? `${e.firstName} ${e.lastName}` : id;
    };

    const getAssigneeNames = (task) => {
        const ids = getAssignedIds(task);
        return ids.length ? ids.map(getEmployeeName).join(", ") : "Unassigned";
    };

    const employeeOptions = employees.map(e => ({
        value: String(e.id),
        label: `${e.firstName} ${e.lastName}`
    }));

    const selectedAssigneeOptions = employeeOptions.filter(option =>
        (taskForm.assignedToIds || []).map(String).includes(option.value)
    );

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
                    setTaskForm({ name: "", description: "", assignedToIds: [], status: "TODO", priority: "MEDIUM", estimatedHours: "", startDate: "", dueDate: "" });
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
                                <td>{getAssigneeNames(t)}</td>
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
                            <Form.Label>Assign Workers</Form.Label>
                            <Select
                                isMulti
                                isSearchable
                                closeMenuOnSelect={false}
                                hideSelectedOptions={false}
                                value={selectedAssigneeOptions}
                                onChange={(selected) => setTaskForm({
                                    ...taskForm,
                                    assignedToIds: (selected || []).map(option => option.value)
                                })}
                                options={employeeOptions}
                                placeholder="Select workers"
                                classNamePrefix="modern-select"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                styles={{
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    menu: (base) => ({ ...base, width: 'max-content', minWidth: '100%' })
                                }}
                            />
                            {(taskForm.assignedToIds || []).length > 0 && (
                                <Form.Text className="text-muted">
                                    Assigned: {(taskForm.assignedToIds || []).map(getEmployeeName).join(", ")}
                                </Form.Text>
                            )}
                        </Form.Group>
                        <div className="d-flex gap-2">
                            <Form.Group className="mb-2 flex-grow-1">
                                <Form.Label>Status</Form.Label>
                                <SafeSelect value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                                    <option value="TODO">TODO</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="REVIEW">REVIEW</option>
                                    <option value="DONE">DONE</option>
                                </SafeSelect>
                            </Form.Group>
                            <Form.Group className="mb-2 flex-grow-1">
                                <Form.Label>Priority</Form.Label>
                                <SafeSelect value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                    <option value="LOW">LOW</option>
                                    <option value="MEDIUM">MEDIUM</option>
                                    <option value="HIGH">HIGH</option>
                                </SafeSelect>
                            </Form.Group>
                        </div>
                        <div className="d-flex gap-2">
                            <div className="flex-grow-1">
                                <Form.Label>Est. Hours</Form.Label>
                                <Form.Control type="number" step="0.5" value={taskForm.estimatedHours} onChange={e => setTaskForm({ ...taskForm, estimatedHours: e.target.value })} />
                            </div>
                            <div className="flex-grow-1">
                                <Form.Label>Start Date</Form.Label>
                                <SafeDatePicker name="startDate" value={taskForm.startDate} onChange={e => setTaskForm({ ...taskForm, startDate: e.target.value })} />
                            </div>
                            <div className="flex-grow-1">
                                <Form.Label>Due Date</Form.Label>
                                <SafeDatePicker name="dueDate" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
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
                            <Form.Label>Credit Time To</Form.Label>
                            <SafeSelect required value={logForm.userId} onChange={e => setLogForm({ ...logForm, userId: e.target.value })}>
                                <option value="">Select assigned worker</option>
                                {getAssignedIds(logTask).map(id => <option key={id} value={id}>{getEmployeeName(id)}</option>)}
                            </SafeSelect>
                        </Form.Group>
                        <div className="d-flex gap-2">
                            <Form.Group className="mb-2 flex-grow-1">
                                <Form.Label>Date Worked</Form.Label>
                                <SafeDatePicker 
                                    name="logDate" 
                                    value={logForm.logDate} 
                                    onChange={e => setLogForm({ ...logForm, logDate: e.target.value })} 
                                    required 
                                />
                            </Form.Group>
                            <Form.Group className="mb-2 flex-grow-1">
                                <Form.Label>Hours Worked</Form.Label>
                                <Form.Control type="number" step="0.25" required value={logForm.durationHours} onChange={e => setLogForm({ ...logForm, durationHours: e.target.value })} />
                            </Form.Group>
                        </div>
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
