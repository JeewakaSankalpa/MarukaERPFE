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
                <div><strong>Inquiry ID:</strong> {id || '-'}</div>
                {p.jobNumber && <div><strong>Job ID:</strong> <Badge bg="success">{p.jobNumber}</Badge></div>}
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

export const StatusCard = ({ id, project, stageObj, effectiveActions }) => {

    return (
        <Card className="h-100 border-0 shadow-sm">
            <Card.Header className="bg-white fw-bold">Current Status & Actions</Card.Header>
            <Card.Body style={{ overflowY: 'auto' }}>
                <div className="mb-3">
                    <strong>Current Stage:</strong> <Badge bg="primary">{stageObj?.stageType || '-'}</Badge>
                </div>

                {effectiveActions ? (
                    <>
                        {effectiveActions?.missingFiles && effectiveActions.missingFiles.length > 0 ? (
                            <div className="alert alert-warning py-2 mb-3">
                                <div className="fw-semibold mb-1">Required files missing:</div>
                                <ul className="mb-0 px-3">
                                    {effectiveActions.missingFiles.map((m) => <li key={m}>{m}</li>)}
                                </ul>
                            </div>
                        ) : (
                            <div className="small text-success mb-3 fw-bold">
                                All required files are present ✅
                            </div>
                        )}

                        {effectiveActions.canApprove ? (
                            <div className="alert alert-info py-2 mt-2">
                                <strong>Approval Required:</strong> Please review the details and submit your approval in the Action Bar above.
                            </div>
                        ) : (effectiveActions.canMove && effectiveActions.canMove.length > 0) ? (
                            <div className="alert alert-success py-2 mt-2">
                                <strong>Ready for Next Stage!</strong> All requirements have been met. Use the Action Bar above to move the project forward.
                            </div>
                        ) : (
                            <div className="alert alert-secondary py-2 mt-2 text-dark">
                                <strong>Pending State:</strong> Waiting for other required approvals or missing tasks before you can proceed.
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-muted small">
                        Actions are not loaded yet or unavailable.
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};
