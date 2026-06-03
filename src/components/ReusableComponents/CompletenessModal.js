import React from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { hasBlockingIssues } from '../../utils/entityCompleteness';

export default function CompletenessModal({ show, title = 'Missing Required Details', issues = [], onClose, onProceed, onEditIssue }) {
    const blocking = hasBlockingIssues(issues);

    return (
        <Modal show={show} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Alert variant={blocking ? 'danger' : 'warning'} className="mb-3">
                    {blocking
                        ? 'Please complete the required details before continuing.'
                        : 'Some optional details are missing. You can continue, but completing them will improve records and reports.'}
                </Alert>

                <div className="d-flex flex-column gap-3">
                    {issues.map((issue, idx) => (
                        <div key={`${issue.name}-${idx}`} className="border rounded p-3">
                            <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                                <div>
                                    <div className="fw-semibold">{issue.name}</div>
                                    {issue.entityLabel && <div className="small text-muted">{issue.entityLabel}</div>}
                                </div>
                                {onEditIssue && issue.entityId && (
                                    <Button size="sm" variant="outline-primary" onClick={() => onEditIssue(issue)}>
                                        Edit details
                                    </Button>
                                )}
                            </div>
                            {issue.missingRequired.length > 0 && (
                                <div className="mb-2">
                                    <div className="small text-danger fw-semibold">Required</div>
                                    <ul className="mb-0">
                                        {issue.missingRequired.map(item => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                            )}
                            {issue.missingOptional.length > 0 && (
                                <div>
                                    <div className="small text-muted fw-semibold">Optional</div>
                                    <ul className="mb-0 text-muted">
                                        {issue.missingOptional.map(item => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>Close</Button>
                {!blocking && onProceed && (
                    <Button variant="warning" onClick={onProceed}>Continue Anyway</Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}
