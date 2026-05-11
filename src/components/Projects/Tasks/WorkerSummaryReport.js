import React, { useState, useEffect } from 'react';
import { Table, Card, Spinner, Row, Col, Badge, Form, Button, ProgressBar } from 'react-bootstrap';
import api from '../../../api/api';

const WorkerSummaryReport = () => {
    const [tasks, setTasks] = useState([]);
    const [workLogs, setWorkLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tRes, wRes, eRes] = await Promise.all([
                api.get('/tasks/all'),
                api.get('/tasks/worklogs/all'),
                api.get('/employee/all')
            ]);
            setTasks(tRes.data);
            setWorkLogs(wRes.data);
            setEmployees(eRes.data);
        } catch (e) {
            console.error('Failed to load worker report data', e);
        } finally {
            setLoading(false);
        }
    };

    const getEmployeeName = (id) => {
        const e = employees.find(e => e.id === id);
        return e ? `${e.firstName} ${e.lastName}` : null;
    };

    const getEmployeeDesignation = (id) => {
        const e = employees.find(e => e.id === id);
        return e?.designation || e?.department || '-';
    };

    // Build a resolved name: try employee lookup first, then log.employeeName, then raw id
    const resolveWorkerName = (userId, logsForWorker) => {
        const fromEmployee = getEmployeeName(userId);
        if (fromEmployee) return fromEmployee;
        // Use first log's employeeName if available
        const fromLog = logsForWorker?.find(l => l.employeeName)?.employeeName;
        if (fromLog) return fromLog;
        return userId;
    };

    // Filter work logs by date range and map orphaned IDs to task assignees
    const filteredLogs = workLogs.map(log => {
        // If the log's userId doesn't match an employee, try to map it to the task's assignedTo
        let effectiveUserId = log.userId;
        if (!getEmployeeName(log.userId)) {
            const relatedTask = tasks.find(t => t.id === log.taskId);
            if (relatedTask && relatedTask.assignedTo) {
                effectiveUserId = relatedTask.assignedTo;
            }
        }
        return { ...log, effectiveUserId };
    }).filter(log => {
        if (!log.logDate) return true;
        if (dateFrom && log.logDate < dateFrom) return false;
        if (dateTo && log.logDate > dateTo) return false;
        return true;
    });

    // Aggregate per worker using effectiveUserId
    const allWorkerIds = [
        ...new Set([
            ...tasks.map(t => t.assignedTo).filter(Boolean),
            ...filteredLogs.map(l => l.effectiveUserId).filter(Boolean)
        ])
    ];

    const workerData = allWorkerIds.map(workerId => {
        const assignedTasks = tasks.filter(t => t.assignedTo === workerId);
        const completedTasks = assignedTasks.filter(t => t.status === 'DONE');
        const inProgressTasks = assignedTasks.filter(t => t.status === 'IN_PROGRESS');
        const reviewTasks = assignedTasks.filter(t => t.status === 'REVIEW');
        const pendingTasks = assignedTasks.filter(t => t.status === 'TODO');

        const workerLogs = filteredLogs.filter(l => l.effectiveUserId === workerId);
        const totalLoggedHours = workerLogs.reduce((sum, l) => sum + (l.durationHours || 0), 0);

        const uniqueDates = [...new Set(workerLogs.map(l => l.logDate).filter(Boolean))];
        const completionRate = assignedTasks.length > 0
            ? Math.round((completedTasks.length / assignedTasks.length) * 100)
            : 0;

        return {
            workerId,
            name: resolveWorkerName(workerId, workerLogs),
            designation: getEmployeeDesignation(workerId),
            totalTasks: assignedTasks.length,
            completedTasks: completedTasks.length,
            inProgressTasks: inProgressTasks.length,
            reviewTasks: reviewTasks.length,
            pendingTasks: pendingTasks.length,
            totalLoggedHours,
            daysActive: uniqueDates.length,
            completionRate,
            recentLogs: workerLogs
                .filter(l => l.logDate)
                .sort((a, b) => b.logDate.localeCompare(a.logDate))
                .slice(0, 3)
        };
    }).sort((a, b) => b.totalLoggedHours - a.totalLoggedHours);

    // Summary stats
    const totalHoursAllWorkers = workerData.reduce((sum, w) => sum + w.totalLoggedHours, 0);
    const totalCompletedAllWorkers = workerData.reduce((sum, w) => sum + w.completedTasks, 0);

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            {/* Summary Cards */}
            <Row className="g-3 mb-4">
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', borderLeft: '4px solid #0284c7' }}>
                        <Card.Body>
                            <div className="text-muted small mb-1">👷 Total Workers</div>
                            <div className="fs-3 fw-bold text-primary">{workerData.length}</div>
                            <div className="small text-muted">with tasks or logged time</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', borderLeft: '4px solid #16a34a' }}>
                        <Card.Body>
                            <div className="text-muted small mb-1">✅ Total Completed Tasks</div>
                            <div className="fs-3 fw-bold" style={{ color: '#166534' }}>{totalCompletedAllWorkers}</div>
                            <div className="small text-muted">across all workers</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderLeft: '4px solid #d97706' }}>
                        <Card.Body>
                            <div className="text-muted small mb-1">⏱ Total Hours Logged</div>
                            <div className="fs-3 fw-bold" style={{ color: '#92400e' }}>{totalHoursAllWorkers.toFixed(1)} hrs</div>
                            <div className="small text-muted">
                                {dateFrom || dateTo ? `${dateFrom || '...'} → ${dateTo || '...'}` : 'All time'}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', borderLeft: '4px solid #7c3aed' }}>
                        <Card.Body>
                            <div className="text-muted small mb-1">📊 Avg Hours / Worker</div>
                            <div className="fs-3 fw-bold" style={{ color: '#4c1d95' }}>
                                {workerData.length > 0 ? (totalHoursAllWorkers / workerData.length).toFixed(1) : '0'} hrs
                            </div>
                            <div className="small text-muted">per worker</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Date Filter */}
            <Card className="mb-3 border-0 shadow-sm">
                <Card.Body className="py-2">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <span className="fw-semibold text-muted small">Filter by Date Range:</span>
                        <Form.Control
                            type="date"
                            size="sm"
                            style={{ maxWidth: '160px' }}
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            placeholder="From"
                        />
                        <span className="text-muted small">to</span>
                        <Form.Control
                            type="date"
                            size="sm"
                            style={{ maxWidth: '160px' }}
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            placeholder="To"
                        />
                        {(dateFrom || dateTo) && (
                            <Button size="sm" variant="outline-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                                Clear
                            </Button>
                        )}
                    </div>
                </Card.Body>
            </Card>

            {/* Worker Table */}
            {workerData.length === 0 ? (
                <div className="text-center p-4 text-muted border rounded bg-light">
                    No worker data found.
                </div>
            ) : (
                <div className="table-responsive shadow-sm rounded">
                    <Table bordered hover className="mb-0 bg-white" size="sm">
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>Worker Name</th>
                                <th>Designation</th>
                                <th className="text-center">Total Tasks</th>
                                <th className="text-center">✅ Done</th>
                                <th className="text-center">🔄 In Progress</th>
                                <th className="text-center">👁 Review</th>
                                <th className="text-center">📌 Pending</th>
                                <th className="text-center">Completion</th>
                                <th className="text-end">⏱ Hours Logged</th>
                                <th className="text-center">Days Active</th>
                                <th>Recent Activity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workerData.map((w, idx) => (
                                <tr key={w.workerId}>
                                    <td className="text-muted small">{idx + 1}</td>
                                    <td className="fw-bold">{w.name}</td>
                                    <td className="text-muted small">{w.designation}</td>
                                    <td className="text-center">{w.totalTasks}</td>
                                    <td className="text-center">
                                        {w.completedTasks > 0 && (
                                            <Badge bg="success">{w.completedTasks}</Badge>
                                        )}
                                        {w.completedTasks === 0 && <span className="text-muted">-</span>}
                                    </td>
                                    <td className="text-center">
                                        {w.inProgressTasks > 0 && (
                                            <Badge bg="primary">{w.inProgressTasks}</Badge>
                                        )}
                                        {w.inProgressTasks === 0 && <span className="text-muted">-</span>}
                                    </td>
                                    <td className="text-center">
                                        {w.reviewTasks > 0 && (
                                            <Badge bg="warning" text="dark">{w.reviewTasks}</Badge>
                                        )}
                                        {w.reviewTasks === 0 && <span className="text-muted">-</span>}
                                    </td>
                                    <td className="text-center">
                                        {w.pendingTasks > 0 && (
                                            <Badge bg="secondary">{w.pendingTasks}</Badge>
                                        )}
                                        {w.pendingTasks === 0 && <span className="text-muted">-</span>}
                                    </td>
                                    <td style={{ minWidth: '120px' }}>
                                        <div className="d-flex align-items-center gap-1">
                                            <ProgressBar
                                                now={w.completionRate}
                                                variant={w.completionRate === 100 ? 'success' : w.completionRate >= 50 ? 'primary' : 'warning'}
                                                style={{ height: '8px', flex: 1 }}
                                            />
                                            <small className="text-muted">{w.completionRate}%</small>
                                        </div>
                                    </td>
                                    <td className="text-end fw-semibold text-primary">{w.totalLoggedHours.toFixed(2)}</td>
                                    <td className="text-center">{w.daysActive}</td>
                                    <td>
                                        {w.recentLogs.length > 0 ? (
                                            <ul className="mb-0 ps-3 small text-muted">
                                                {w.recentLogs.map((log, i) => (
                                                    <li key={i}>
                                                        <strong>{log.logDate}</strong>: {log.durationHours} hrs
                                                        {log.note && <span> — {log.note}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-muted small">No recent logs</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="table-light fw-bold">
                            <tr>
                                <td colSpan={9} className="text-end">Totals</td>
                                <td className="text-end text-primary">{totalHoursAllWorkers.toFixed(2)}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default WorkerSummaryReport;
