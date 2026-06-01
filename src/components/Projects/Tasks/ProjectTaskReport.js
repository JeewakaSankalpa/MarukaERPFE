import React, { useState, useEffect } from 'react';
import { Table, Card, Spinner, Form, Row, Col, Badge, Button } from 'react-bootstrap';
import api from '../../../api/api';

const ProjectTaskReport = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const [workLogs, setWorkLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tRes, wRes, eRes, pRes] = await Promise.all([
                api.get(projectId ? `/tasks/by-project/${projectId}` : `/tasks/all`),
                api.get(projectId ? `/tasks/worklogs/by-project/${projectId}` : `/tasks/worklogs/all`),
                api.get('/employee/all'),
                api.get(projectId ? `/projects/details/${projectId}` : `/projects`)
            ]);
            setTasks(tRes.data);
            setWorkLogs(wRes.data);
            setEmployees(eRes.data);
            setProjects(projectId ? [pRes.data] : (pRes.data.content || pRes.data));
        } catch (e) {
            console.error("Failed to load task report data", e);
        } finally {
            setLoading(false);
        }
    };

    const getEntityId = (value) => {
        if (!value) return '';
        if (typeof value === 'object') return value.id || value._id || '';
        return value;
    };

    const getEntityLabel = (value, fallback = '-') => {
        if (!value) return fallback;
        if (typeof value !== 'object') return value;
        return value.name || value.projectName || [value.firstName, value.lastName].filter(Boolean).join(' ') || value.id || fallback;
    };

    const getTaskStatus = (status) => {
        if (!status) return 'TODO';
        if (typeof status === 'object') return status.name || status.status || status.id || 'TODO';
        return status;
    };

    const getStatusBadgeVariant = (status) => {
        const label = getTaskStatus(status);
        return label === "DONE" ? "success" : label === "IN_PROGRESS" ? "primary" : "secondary";
    };

    const getEmployeeName = (assignee) => {
        const id = getEntityId(assignee);
        const e = employees.find(e => e.id === id);
        return e ? `${e.firstName} ${e.lastName}` : getEntityLabel(assignee, id || '-');
    };

    const getAssignedIds = (task) => {
        const ids = new Set();
        (task?.assignedToIds || []).forEach(id => id && ids.add(getEntityId(id)));
        if (task?.assignedTo) ids.add(getEntityId(task.assignedTo));
        return Array.from(ids).filter(Boolean);
    };

    const getAssigneeNames = (task) => {
        const ids = getAssignedIds(task);
        return ids.length ? ids.map(getEmployeeName).join(", ") : "Unassigned";
    };

    const getProjectName = (projectRef) => {
        const id = getEntityId(projectRef);
        if (!id) return '-';
        const p = projects.find(p => p.id === id);
        if (!p) return getEntityLabel(projectRef, id);
        
        const no = p.jobNumber || p.referenceNumber || p.id;
        return `${p.projectName} (No: ${no})`;
    };

    // Filter worklogs by selected date if provided
    const filteredWorkLogs = selectedDate 
        ? workLogs.filter(w => w.logDate === selectedDate) 
        : workLogs;

    // Group worklogs by task
    const reportData = tasks.map(task => {
        const taskLogs = filteredWorkLogs.filter(w => w.taskId === task.id);
        const totalHours = taskLogs.reduce((sum, log) => sum + (log.durationHours || 0), 0);
        const uniqueDates = [...new Set(taskLogs.map(log => log.logDate).filter(Boolean))];

        return {
            ...task,
            taskLogs,
            totalHoursThisPeriod: totalHours,
            daysWorked: uniqueDates.length,
            uniqueDates
        };
    }).filter(t => selectedDate ? t.taskLogs.length > 0 : true);

    const totalProjectHours = reportData.reduce((sum, t) => sum + t.totalHoursThisPeriod, 0);
    const completedTasksCount = reportData.filter(t => getTaskStatus(t.status) === 'DONE').length;
    const pendingTasksCount = reportData.length - completedTasksCount;

    if (loading) return <div className="text-center p-4"><Spinner animation="border" /></div>;

    return (
        <div className="mt-3">
            <Card className="mb-3 shadow-sm border-0">
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={4}>
                            <h5 className="mb-0 text-primary">Task Report Summary</h5>
                        </Col>
                        <Col md={8}>
                            <div className="d-flex justify-content-end gap-3 align-items-center">
                                <div className="text-muted small">
                                    <Badge bg="success" className="me-1">{completedTasksCount}</Badge> Completed
                                    <Badge bg="warning" className="ms-2 me-1">{pendingTasksCount}</Badge> Pending
                                </div>
                                <div className="fw-bold text-dark">
                                    Total Hours: <span className="text-primary">{totalProjectHours.toFixed(2)} hrs</span>
                                </div>
                                <Form.Group style={{ minWidth: '150px' }}>
                                    <Form.Control 
                                        type="date" 
                                        value={selectedDate} 
                                        onChange={e => setSelectedDate(e.target.value)} 
                                        placeholder="Filter by Date"
                                    />
                                </Form.Group>
                                {selectedDate && (
                                    <Button variant="outline-secondary" size="sm" onClick={() => setSelectedDate('')}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {reportData.length === 0 ? (
                <div className="text-center p-4 text-muted border rounded bg-light">
                    No task logs found for the selected criteria.
                </div>
            ) : (
                <div className="table-responsive shadow-sm rounded">
                    <Table bordered hover className="mb-0 bg-white" size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>Task Name</th>
                                <th>Assignee</th>
                                <th>Status</th>
                                {!projectId && <th>Project / Inquiry No.</th>}
                                <th>Total Hours {selectedDate ? '(Day)' : '(Overall)'}</th>
                                <th>Days Worked</th>
                                <th>Work Details (Date - Hours - Note)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map(task => (
                                <tr key={task.id}>
                                    <td className="fw-bold">{task.name}</td>
                                    <td>{getAssigneeNames(task)}</td>
                                    <td>
                                        <Badge bg={getStatusBadgeVariant(task.status)}>
                                            {getTaskStatus(task.status)}
                                        </Badge>
                                    </td>
                                    {!projectId && <td>{getProjectName(task.projectId || task.project)}</td>}
                                    <td className="text-end fw-semibold">{task.totalHoursThisPeriod.toFixed(2)}</td>
                                    <td className="text-center">{task.daysWorked}</td>
                                    <td>
                                        {task.taskLogs.length > 0 ? (
                                            <ul className="mb-0 ps-3 small text-muted">
                                                {task.taskLogs.map(log => (
                                                    <li key={log.id}>
                                                        <strong>{log.logDate || 'Unknown'}</strong>: {log.durationHours} hrs 
                                                        {log.note && <span> - {getEntityLabel(log.note, '')}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-muted small">No logs</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default ProjectTaskReport;
