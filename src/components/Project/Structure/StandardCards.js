import React, { useState } from 'react';
import { Card, Button, Badge, Form } from 'react-bootstrap';

export const OverviewCard = ({ id, project, stageObj, viewVersion, navigate, openEmailModal, loading }) => {
    // Fallbacks
    const p = project || {};

    return (
        <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Project Overview</span>
                <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-dark" onClick={openEmailModal} disabled={!id || !!viewVersion}>Email</Button>
                    <Button
                        size="sm"
                        variant="outline-primary"
                        disabled={!id || !!viewVersion}
                        onClick={() => navigate(`/projects/edit/${id}`)}
                    >
                        Edit
                    </Button>
                </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto' }}>
                <div><strong>ID:</strong> {id || '-'}</div>
                <div><strong>Name:</strong> {p.projectName || '-'}</div>
                <div><strong>Client:</strong> {p.customerName || p.customerId || '-'}</div>
                <div><strong>Sales Rep:</strong> {p.salesRepName || p.salesRep || '-'}</div>

                <div className="mt-2">
                    <strong>Status:</strong>{' '}
                    <Badge bg="info">{p.status || '-'}</Badge>
                </div>

                <div className="mt-2 text-muted small">
                    Stage: {stageObj?.stageType || '-'}
                </div>
                <div className="mt-2 text-muted small">
                    Currency: {p.currency || 'LKR'}
                </div>

                <div className="mt-2 text-muted small">
                    Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}<br />
                    Updated: {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-'}
                </div>

                {p.comment ? <div className="mt-2"><em>{p.comment}</em></div> : null}

                {!id && <div className="mt-2 text-warning">No project id provided.</div>}
                {id && !project && !loading && (
                    <div className="mt-2 text-warning">Project not found.</div>
                )}
            </Card.Body>
        </Card>
    );
};

export const StatusCard = ({ id, project, stageObj, effectiveActions, viewVersion, comment, setComment }) => {

    return (
        <Card className="h-100">
            <Card.Header>Current Status & Actions</Card.Header>
            <Card.Body style={{ overflowY: 'auto' }}>
                <div className="mb-2">
                    <strong>Stage:</strong> {stageObj?.stageType || '-'}
                </div>

                {effectiveActions ? (
                    <>
                        {effectiveActions?.missingFiles && effectiveActions.missingFiles.length > 0 ? (
                            <div className="alert alert-warning py-2">
                                <div className="fw-semibold mb-1">Required files missing for this stage:</div>
                                <ul className="mb-0">
                                    {effectiveActions.missingFiles.map((m) => <li key={m}>{m}</li>)}
                                </ul>
                            </div>
                        ) : (
                            <div className="small text-success mb-2">All required files are present ✅</div>
                        )}

                        <Form.Group className="mb-2">
                            <Form.Label className="small">Approval comment</Form.Label>
                            <Form.Control
                                size="sm"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Optional"
                                disabled={!id || !project || !!viewVersion}
                            />
                        </Form.Group>

                        <div className="text-muted small mb-2">
                            <em>Use the Action Bar above to Approve, Reject, or Move stage.</em>
                        </div>
                    </>
                ) : (
                    <div className="text-muted">
                        Actions are not loaded yet or unavailable.
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};
