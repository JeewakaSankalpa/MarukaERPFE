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
    const [workLogs, setWorkLogs] = useState([]);

    // Modals
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);

    // Form Data
    const [editingTask, setEditingTask] = useState(null);
    const [submittingTask, setSubmittingTask] = useState(false);
    const [taskForm, setTaskForm] = useState({ name: "", description: "", assignedToIds: [], status: "TODO", priority: "MEDIUM", estimatedHours: "", startDate: "", dueDate: "" });

    // Log Data
    const [logTask, setLogTask] = useState(null);
    const [logForm, setLogForm] = useState({ logDate: new Date().toISOString().split('T')[0] });
    const [logRows, setLogRows] = useState([]);

    const loadData = React.useCallback(async () => {
        try {
            const [tRes, eRes, wlRes] = await Promise.all([
                api.get(`/tasks/by-project/${projectId}`),
                api.get("/employee/all"),
                api.get(`/tasks/worklogs/by-project/${projectId}`)
            ]);
            setTasks(tRes.data);
            setEmployees(eRes.data);
            setWorkLogs(wlRes.data || []);
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
            const rowsToSave = logRows
                .map(row => ({ ...row, durationHours: parseFloat(row.durationHours) }))
                .filter(row => row.userId && row.durationHours > 0);

            if (!rowsToSave.length) {
                toast.warn("Enter time for at least one worker");
                return;
            }

            await Promise.all(rowsToSave.map(row => api.post(`/tasks/${logTask.id}/log-work`, {
                userId: row.userId,
                employeeName: getEmployeeName(row.userId),
                durationHours: row.durationHours,
                note: row.note,
                logDate: logForm.logDate
            })));
            toast.success(`${rowsToSave.length} work log${rowsToSave.length > 1 ? "s" : ""} saved`);
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
        setLogForm({ logDate: new Date().toISOString().split('T')[0] });
        setLogRows(assignedToIds.map(id => ({ userId: id, durationHours: "", note: "" })));
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

    const totalEstimatedHours = tasks.reduce((s, t) => s + (parseFloat(t.estimatedHours) || 0), 0);
    const totalLoggedHours = workLogs.reduce((s, log) => s + (parseFloat(log.durationHours) || 0), 0);
    const workerTotals = workLogs.reduce((acc, log) => {
        if (!log.userId) return acc;
        const key = String(log.userId);
        acc[key] = (acc[key] || 0) + (parseFloat(log.durationHours) || 0);
        return acc;
    }, {});

    const updateLogRow = (index, updates) => {
        setLogRows(rows => rows.map((row, i) => i === index ? { ...row, ...updates } : row));
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
                                {totalEstimatedHours.toFixed(1)} hrs
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
                                {totalLoggedHours.toFixed(1)} hrs
                            </div>
                            {(() => {
                                const est = totalEstimatedHours;
                                const logged = totalLoggedHours;
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
                            {Object.keys(workerTotals).length > 0 && (
                                <div className="small text-muted mt-2">
                                    {Object.entries(workerTotals)
                                        .map(([id, hours]) => `${getEmployeeName(id)}: ${hours.toFixed(1)}h`)
                                        .join(" | ")}
                                </div>
                            )}
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
                    <Modal.Header closeButton><Modal.Title>Log Worker Time: {logTask?.name}</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Date Worked</Form.Label>
                            <SafeDatePicker
                                name="logDate"
                                value={logForm.logDate}
                                onChange={e => setLogForm({ ...logForm, logDate: e.target.value })}
                                required
                            />
                        </Form.Group>
                        {logRows.length ? (
                            <div className="d-flex flex-column gap-3">
                                {logRows.map((row, index) => (
                                    <div key={row.userId || index} className="border rounded p-3 bg-light">
                                        <div className="fw-semibold mb-2">{getEmployeeName(row.userId)}</div>
                                        <div className="d-flex gap-2">
                                            <Form.Group className="mb-2" style={{ width: 140 }}>
                                                <Form.Label>Hours</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="0"
                                                    step="0.25"
                                                    value={row.durationHours}
                                                    onChange={e => updateLogRow(index, { durationHours: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-2 flex-grow-1">
                                                <Form.Label>Note</Form.Label>
                                                <Form.Control
                                                    value={row.note}
                                                    onChange={e => updateLogRow(index, { note: e.target.value })}
                                                    placeholder="Work details"
                                                />
                                            </Form.Group>
                                        </div>
                                    </div>
                                ))}
                                <div className="text-end small text-muted">
                                    Total being added: {logRows.reduce((s, row) => s + (parseFloat(row.durationHours) || 0), 0).toFixed(2)} hrs
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-3 bg-light rounded text-muted">
                                Assign workers to this task before logging time.
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="submit" variant="success" disabled={!logRows.length}>Log Time</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectTasks;
