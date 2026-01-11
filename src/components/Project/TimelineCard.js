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
