import React, { useState, useMemo } from 'react';
import { Card, Button, Modal, Form, ProgressBar, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';

/**
 * Component to display project timeline and allow editing dates.
 * 
 * @param {Object} props
 * @param {string} props.projectId
 * @param {Object} props.project
 * @param {boolean} props.readOnly
 * @param {Function} props.onRefresh
 */
export default function TimelineCard({ projectId, project, readOnly, onRefresh }) {
    const [showDates, setShowDates] = useState(false);
    const [dates, setDates] = useState({ start: '', end: '', due: '' });

    const stageHistory = useMemo(() => {
        const stages = Array.isArray(project?.stages) ? project.stages : [];
        return [...stages].sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0));
    }, [project]);

    const formatDateTime = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatStageName = (value) => {
        if (!value) return 'Unknown Stage';
        return String(value)
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    };

    // Calculate Progress
    const dueMeta = useMemo(() => {
        if (!project?.dueDate) return null;
        const now = new Date();
        const due = new Date(project.dueDate);
        const start = project?.estimatedStart ? new Date(project.estimatedStart) : now;
        const totalMs = Math.max(1, due - start);
        const usedMs = Math.max(0, now - start);
        const pct = Math.min(100, Math.max(0, Math.round((usedMs / totalMs) * 100)));
        const remainingMs = Math.max(0, due - now);
        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return { pct, label: `${days}d ${hours}h` };
    }, [project]);

    const openModal = () => {
        if (readOnly) return;
        setDates({
            start: project?.estimatedStart ? project.estimatedStart.substring(0, 16) : '',
            end: project?.estimatedEnd ? project.estimatedEnd.substring(0, 16) : '',
            due: project?.dueDate ? project.dueDate.substring(0, 16) : ''
        });
        setShowDates(true);
    };

    const saveDates = async () => {
        try {
            await api.patch(`/projects/${projectId}/dates`, {
                estimatedStart: dates.start || null,
                estimatedEnd: dates.end || null,
                dueDate: dates.due || null
            });
            toast.success("Dates updated");
            setShowDates(false);
            onRefresh?.();
        } catch (e) {
            toast.error("Failed to update dates");
        }
    };

    return (
        <Card className="h-100 shadow-sm border-0">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-calendar-check text-primary fs-5"></i>
                    <h6 className="mb-0 fw-bold text-dark">Timeline & Dates</h6>
                </div>
                {!readOnly && (
                    <Button variant="light" size="sm" className="text-secondary border-0" onClick={openModal}>
                        <i className="bi bi-pencil me-1"></i> Edit
                    </Button>
                )}
            </Card.Header>
            <Card.Body>
                <Row className="text-center mb-4">
                    <Col xs={4}>
                        <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>Start</small>
                        <span className="fw-bold text-dark">
                            {project?.estimatedStart ? new Date(project.estimatedStart).toLocaleDateString() : '—'}
                        </span>
                    </Col>
                    <Col xs={4}>
                        <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>End (Est)</small>
                        <span className="fw-bold text-dark">
                            {project?.estimatedEnd ? new Date(project.estimatedEnd).toLocaleDateString() : '—'}
                        </span>
                    </Col>
                    <Col xs={4}>
                        <small className="text-muted d-block text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>Due Date</small>
                        <span className={`fw-bold ${dueMeta ? 'text-primary' : 'text-secondary'}`}>
                            {project?.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}
                        </span>
                    </Col>
                </Row>

                {dueMeta ? (
                    <div className="px-2">
                        <div className="d-flex justify-content-between align-items-end mb-1">
                            <small className="fw-semibold text-secondary">Time Elapsed</small>
                            <small className={`fw-bold ${dueMeta.pct > 90 ? 'text-danger' : 'text-success'}`}>
                                {dueMeta.label} remaining
                            </small>
                        </div>
                        <ProgressBar
                            now={dueMeta.pct}
                            variant={dueMeta.pct > 90 ? 'danger' : dueMeta.pct > 75 ? 'warning' : 'success'}
                            style={{ height: '8px', borderRadius: '4px' }}
                            animated={dueMeta.pct < 100}
                        />
                        <div className="d-flex justify-content-between mt-1">
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>0%</small>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>100%</small>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-3 bg-light rounded-3 text-muted small">
                        No due date set
                    </div>
                )}

                <div className="mt-4">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <i className="bi bi-clock-history text-primary"></i>
                        <span className="fw-bold text-dark small text-uppercase">Stage Movement History</span>
                    </div>
                    {stageHistory.length ? (
                        <div className="d-flex flex-column gap-3">
                            {stageHistory.map((stage, index) => {
                                const isCurrent = stage.id && project?.currentStage?.id === stage.id;
                                const approvals = Array.isArray(stage.approvals) ? stage.approvals : [];
                                const latestApproval = approvals
                                    .filter(a => a?.timestamp)
                                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                                return (
                                    <div key={stage.id || `${stage.stageType}-${index}`} className="d-flex gap-3">
                                        <div className="d-flex flex-column align-items-center">
                                            <div
                                                className={`rounded-circle ${isCurrent ? 'bg-primary' : 'bg-secondary'}`}
                                                style={{ width: 12, height: 12, marginTop: 4 }}
                                            />
                                            {index < stageHistory.length - 1 && (
                                                <div className="bg-light border-start" style={{ width: 1, flex: 1, minHeight: 38 }} />
                                            )}
                                        </div>
                                        <div className="flex-grow-1 pb-2">
                                            <div className="d-flex justify-content-between align-items-start gap-2">
                                                <div>
                                                    <div className="fw-semibold text-dark">
                                                        {formatStageName(stage.stageType)}
                                                        {isCurrent && <span className="badge bg-primary-subtle text-primary ms-2">Current</span>}
                                                    </div>
                                                    <div className="text-muted small">Moved on {formatDateTime(stage.createdAt)}</div>
                                                </div>
                                                {stage.updatedAt && stage.updatedAt !== stage.createdAt && (
                                                    <small className="text-muted text-end">Updated {formatDateTime(stage.updatedAt)}</small>
                                                )}
                                            </div>
                                            {latestApproval && (
                                                <div className="small text-muted mt-1">
                                                    Last approval: {latestApproval.status || 'Recorded'}
                                                    {latestApproval.approverName ? ` by ${latestApproval.approverName}` : ''}
                                                    {latestApproval.timestamp ? ` on ${formatDateTime(latestApproval.timestamp)}` : ''}
                                                </div>
                                            )}
                                            {latestApproval?.comments && (
                                                <div className="small bg-light rounded-2 px-2 py-1 mt-2 text-secondary">
                                                    {latestApproval.comments}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-3 bg-light rounded-3 text-muted small">
                            No stage movement recorded yet
                        </div>
                    )}
                </div>
            </Card.Body>

            <Modal show={showDates} onHide={() => setShowDates(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Edit Project Timeline</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted small mb-4">
                        Adjust key project milestones. Changes will be reflected immediately.
                    </p>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold text-secondary">Estimated Start Date</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={dates.start}
                            onChange={e => setDates({ ...dates, start: e.target.value })}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold text-secondary">Estimated Completion</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={dates.end}
                            onChange={e => setDates({ ...dates, end: e.target.value })}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold text-secondary">Hard Due Date</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={dates.due}
                            onChange={e => setDates({ ...dates, due: e.target.value })}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" onClick={() => setShowDates(false)}>Cancel</Button>
                    <Button variant="primary" onClick={saveDates}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
}
