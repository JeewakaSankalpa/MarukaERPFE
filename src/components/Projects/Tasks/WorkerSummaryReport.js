import React, { useState, useEffect } from 'react';
import { Table, Card, Spinner, Row, Col, Badge, Form, Button, ProgressBar } from 'react-bootstrap';
import { Printer } from 'lucide-react';
import api from '../../../api/api';
import QuickDateRangeButtons from '../../ReusableComponents/QuickDateRangeButtons';
import ReportLayout from '../../ReusableComponents/ReportLayout';

const WorkerSummaryReport = () => {
    const [tasks, setTasks] = useState([]);
    const [workLogs, setWorkLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [workerSearch, setWorkerSearch] = useState('');

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

    const applyQuickRange = (range) => {
        setDateFrom(range.startDate);
        setDateTo(range.endDate);
    };

    const getEntityId = (value) => {
        if (!value) return '';
        if (typeof value === 'object') return value.id || value._id || '';
        return value;
    };

    const getEntityLabel = (value, fallback = '-') => {
        if (!value) return fallback;
        if (typeof value !== 'object') return value;
        return value.name || [value.firstName, value.lastName].filter(Boolean).join(' ') || value.id || fallback;
    };

    const getTaskStatus = (status) => {
        if (!status) return 'TODO';
        if (typeof status === 'object') return status.name || status.status || status.id || 'TODO';
        return status;
    };

    const getAssignedIds = (task) => {
        const ids = new Set();
        (task?.assignedToIds || []).forEach(id => id && ids.add(getEntityId(id)));
        if (task?.assignedTo) ids.add(getEntityId(task.assignedTo));
        return Array.from(ids).filter(Boolean);
    };

    const getEmployeeName = (assignee) => {
        const id = getEntityId(assignee);
        const employee = employees.find(e => e.id === id);
        return employee ? `${employee.firstName} ${employee.lastName}` : getEntityLabel(assignee, null);
    };

    const getEmployeeDesignation = (assignee) => {
        const id = getEntityId(assignee);
        const employee = employees.find(e => e.id === id);
        return getEntityLabel(employee?.designation || employee?.department || assignee?.description, '-');
    };

    const resolveWorkerName = (userId, logsForWorker) => {
        const fromEmployee = getEmployeeName(userId);
        if (fromEmployee) return fromEmployee;
        const fromLog = logsForWorker?.find(l => l.employeeName)?.employeeName;
        if (fromLog) return fromLog;
        return userId;
    };

    const filteredLogs = workLogs.map(log => {
        let effectiveUserId = getEntityId(log.userId || log.user);
        if (!effectiveUserId || !getEmployeeName(effectiveUserId)) {
            const relatedTask = tasks.find(t => t.id === log.taskId);
            const assignedIds = getAssignedIds(relatedTask);
            if (assignedIds.length === 1) {
                effectiveUserId = assignedIds[0];
            }
        }
        return { ...log, effectiveUserId };
    }).filter(log => {
        if (!log.logDate) return true;
        if (dateFrom && log.logDate < dateFrom) return false;
        if (dateTo && log.logDate > dateTo) return false;
        return true;
    });

    const allWorkerIds = [
        ...new Set([
            ...tasks.flatMap(getAssignedIds).filter(Boolean),
            ...filteredLogs.map(l => l.effectiveUserId).filter(Boolean)
        ])
    ];

    const workerData = allWorkerIds.map(workerId => {
        const assignedTasks = tasks.filter(t => getAssignedIds(t).includes(workerId));
        const completedTasks = assignedTasks.filter(t => getTaskStatus(t.status) === 'DONE');
        const inProgressTasks = assignedTasks.filter(t => getTaskStatus(t.status) === 'IN_PROGRESS');
        const reviewTasks = assignedTasks.filter(t => getTaskStatus(t.status) === 'REVIEW');
        const pendingTasks = assignedTasks.filter(t => getTaskStatus(t.status) === 'TODO');
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
    }).filter(worker => {
        const q = workerSearch.trim().toLowerCase();
        if (!q) return true;
        return `${worker.name || ''} ${worker.workerId || ''} ${worker.designation || ''}`.toLowerCase().includes(q);
    }).sort((a, b) => b.totalLoggedHours - a.totalLoggedHours);

    const totalHoursAllWorkers = workerData.reduce((sum, w) => sum + w.totalLoggedHours, 0);
    const totalCompletedAllWorkers = workerData.reduce((sum, w) => sum + w.completedTasks, 0);
    const reportPeriod = dateFrom || dateTo ? `${dateFrom || 'Start'} to ${dateTo || 'Today'}` : 'All time';

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <Card className="mb-3 border-0 shadow-sm no-print">
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
                        <QuickDateRangeButtons onSelect={applyQuickRange} />
                        {(dateFrom || dateTo) && (
                            <Button size="sm" variant="outline-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                                Clear
                            </Button>
                        )}
                        <div className="vr d-none d-md-block" />
                        <span className="fw-semibold text-muted small">Worker:</span>
                        <Form.Control
                            type="search"
                            size="sm"
                            style={{ maxWidth: '220px' }}
                            value={workerSearch}
                            onChange={e => setWorkerSearch(e.target.value)}
                            placeholder="Search by worker name"
                        />
                        {workerSearch && (
                            <Button size="sm" variant="outline-secondary" onClick={() => setWorkerSearch('')}>
                                Clear Worker
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="primary"
                            className="ms-md-auto d-inline-flex align-items-center"
                            onClick={() => window.print()}
                            disabled={workerData.length === 0}
                        >
                            <Printer size={16} className="me-2" />
                            Print / PDF
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            <ReportLayout title="Daily Worker Summary" subtitle={`Period: ${reportPeriod}`} orientation="landscape">
                <style>{`
                    .worker-summary-stat {
                        border: 1px solid #e5e7eb;
                        border-left-width: 4px;
                        border-radius: 8px;
                        background: #fff;
                    }

                    .worker-summary-table th,
                    .worker-summary-table td {
                        vertical-align: top;
                    }

                    @media print {
                        .worker-summary-stat {
                            box-shadow: none !important;
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }

                        .worker-summary-stat .fs-3 {
                            font-size: 20px !important;
                        }

                        .worker-summary-table {
                            font-size: 10px;
                        }

                        .worker-summary-table th,
                        .worker-summary-table td {
                            padding: 4px 5px !important;
                        }

                        .worker-summary-table ul {
                            padding-left: 14px !important;
                        }
                    }
                `}</style>

                <Row className="g-3 mb-4">
                    <Col md={3}>
                        <Card className="worker-summary-stat h-100" style={{ borderLeftColor: '#0284c7' }}>
                            <Card.Body>
                                <div className="text-muted small mb-1">Total Workers</div>
                                <div className="fs-3 fw-bold text-primary">{workerData.length}</div>
                                <div className="small text-muted">with tasks or logged time</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="worker-summary-stat h-100" style={{ borderLeftColor: '#16a34a' }}>
                            <Card.Body>
                                <div className="text-muted small mb-1">Total Completed Tasks</div>
                                <div className="fs-3 fw-bold" style={{ color: '#166534' }}>{totalCompletedAllWorkers}</div>
                                <div className="small text-muted">across all workers</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="worker-summary-stat h-100" style={{ borderLeftColor: '#d97706' }}>
                            <Card.Body>
                                <div className="text-muted small mb-1">Total Hours Logged</div>
                                <div className="fs-3 fw-bold" style={{ color: '#92400e' }}>{totalHoursAllWorkers.toFixed(1)} hrs</div>
                                <div className="small text-muted">{reportPeriod}</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="worker-summary-stat h-100" style={{ borderLeftColor: '#7c3aed' }}>
                            <Card.Body>
                                <div className="text-muted small mb-1">Avg Hours / Worker</div>
                                <div className="fs-3 fw-bold" style={{ color: '#4c1d95' }}>
                                    {workerData.length > 0 ? (totalHoursAllWorkers / workerData.length).toFixed(1) : '0'} hrs
                                </div>
                                <div className="small text-muted">per worker</div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {workerData.length === 0 ? (
                    <div className="text-center p-4 text-muted border rounded bg-light">
                        No worker data found.
                    </div>
                ) : (
                    <div className="table-responsive shadow-sm rounded">
                        <Table bordered hover className="mb-0 bg-white worker-summary-table" size="sm">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Worker Name</th>
                                    <th>Designation</th>
                                    <th className="text-center">Total Tasks</th>
                                    <th className="text-center">Done</th>
                                    <th className="text-center">In Progress</th>
                                    <th className="text-center">Review</th>
                                    <th className="text-center">Pending</th>
                                    <th className="text-center">Completion</th>
                                    <th className="text-end">Hours Logged</th>
                                    <th className="text-center">Days Active</th>
                                    <th>Recent Activity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workerData.map((worker, idx) => (
                                    <tr key={worker.workerId}>
                                        <td className="text-muted small">{idx + 1}</td>
                                        <td className="fw-bold">{worker.name}</td>
                                        <td className="text-muted small">{worker.designation}</td>
                                        <td className="text-center">{worker.totalTasks}</td>
                                        <td className="text-center">
                                            {worker.completedTasks > 0 && (
                                                <Badge bg="success">{worker.completedTasks}</Badge>
                                            )}
                                            {worker.completedTasks === 0 && <span className="text-muted">-</span>}
                                        </td>
                                        <td className="text-center">
                                            {worker.inProgressTasks > 0 && (
                                                <Badge bg="primary">{worker.inProgressTasks}</Badge>
                                            )}
                                            {worker.inProgressTasks === 0 && <span className="text-muted">-</span>}
                                        </td>
                                        <td className="text-center">
                                            {worker.reviewTasks > 0 && (
                                                <Badge bg="warning" text="dark">{worker.reviewTasks}</Badge>
                                            )}
                                            {worker.reviewTasks === 0 && <span className="text-muted">-</span>}
                                        </td>
                                        <td className="text-center">
                                            {worker.pendingTasks > 0 && (
                                                <Badge bg="secondary">{worker.pendingTasks}</Badge>
                                            )}
                                            {worker.pendingTasks === 0 && <span className="text-muted">-</span>}
                                        </td>
                                        <td style={{ minWidth: '120px' }}>
                                            <div className="d-flex align-items-center gap-1">
                                                <ProgressBar
                                                    now={worker.completionRate}
                                                    variant={worker.completionRate === 100 ? 'success' : worker.completionRate >= 50 ? 'primary' : 'warning'}
                                                    style={{ height: '8px', flex: 1 }}
                                                />
                                                <small className="text-muted">{worker.completionRate}%</small>
                                            </div>
                                        </td>
                                        <td className="text-end fw-semibold text-primary">{worker.totalLoggedHours.toFixed(2)}</td>
                                        <td className="text-center">{worker.daysActive}</td>
                                        <td>
                                            {worker.recentLogs.length > 0 ? (
                                                <ul className="mb-0 ps-3 small text-muted">
                                                    {worker.recentLogs.map((log, index) => (
                                                        <li key={index}>
                                                            <strong>{log.logDate}</strong>: {log.durationHours} hrs
                                                            {log.note && <span> - {getEntityLabel(log.note, '')}</span>}
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
            </ReportLayout>
        </div>
    );
};

export default WorkerSummaryReport;
