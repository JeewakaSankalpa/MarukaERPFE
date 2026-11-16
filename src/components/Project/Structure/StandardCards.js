import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';

const inquiryTypeLabels = {
    JOB: 'Job Inquiry',
    MAINTENANCE: 'Maintenance',
    RETAIL_SALE: 'Retail Sale'
};

const inquiryTypeBadge = {
    JOB: 'primary',
    MAINTENANCE: 'warning',
    RETAIL_SALE: 'success'
};

export const OverviewCard = ({ id, project, stageObj, viewVersion, navigate, openEmailModal, loading }) => {
    // Fallbacks
    const p = project || {};

    return (
        <Card className="project-summary-card h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Project overview</span>
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
            <Card.Body>
                <dl className="project-summary-list">
                    <div><dt>Inquiry ID</dt><dd>{id || '-'}</dd></div>
                    {p.jobNumber && <div><dt>Job ID</dt><dd><Badge bg="success">{p.jobNumber}</Badge></dd></div>}
                    <div><dt>Inquiry type</dt><dd>
                    <Badge bg={inquiryTypeBadge[p.inquiryType || 'JOB'] || 'secondary'}>
                        {inquiryTypeLabels[p.inquiryType || 'JOB'] || p.inquiryType || 'Job Inquiry'}
                    </Badge>
                    </dd></div>
                    <div><dt>Client</dt><dd>{p.customerName || p.customerId || '-'}</dd></div>
                    <div><dt>Sales rep</dt><dd>{p.salesRepName || p.salesRep || '-'}</dd></div>
                </dl>

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
        <Card className="project-status-card h-100 border-0 shadow-sm">
            <Card.Header className="bg-white fw-bold">Current status &amp; actions</Card.Header>
            <Card.Body>
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
