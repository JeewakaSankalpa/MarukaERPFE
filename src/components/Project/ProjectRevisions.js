import React, { useState } from 'react';
import { Table, Button, Badge, Modal, Form, Spinner } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';

export default function ProjectRevisions({ projectId, versions, roleHeader, onRevise, onViewSnapshot }) {
    const [showReviseModal, setShowReviseModal] = useState(false);
    const [reason, setReason] = useState('');
    const [targetStage, setTargetStage] = useState('INQUIRY');
    const [submitting, setSubmitting] = useState(false);

    // Restore Modal State
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [versionToRestore, setVersionToRestore] = useState(null);

    const handleRevise = async () => {
        if (!reason) return toast.warn("Reason is required");
        setSubmitting(true);
        try {
            await api.post(`/projects/${projectId}/revise`,
                { reason, targetStage },
                { headers: roleHeader }
            );
            toast.success("Revision Triggered!");
            setShowReviseModal(false);
            setReason('');
            if (onRevise) onRevise();
        } catch (e) {
            toast.error("Failed to revise project");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRestoreClick = (v) => {
        setVersionToRestore(v);
        setShowRestoreModal(true);
    };

    const confirmRestore = async () => {
        if (!versionToRestore) return;
        setSubmitting(true);
        try {
            await api.post(`/projects/${projectId}/versions/${versionToRestore.revisionNumber}/restore`);
            toast.success(`Successfully restored version v${versionToRestore.revisionNumber}`);
            setShowRestoreModal(false);
            setVersionToRestore(null);
            // Refresh parent?
            if (onRevise) onRevise(); // Reuse refresh callback
        } catch (e) {
            console.error(e);
            toast.error("Failed to restore version");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Version History</h5>
                <Button variant="outline-danger" size="sm" onClick={() => setShowReviseModal(true)}>
                    Request Revision
                </Button>
            </div>

            <div className="table-responsive bg-white rounded shadow-sm">
                <Table hover size="sm" className="mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th>Ver #</th>
                            <th>Date</th>
                            <th>Stage</th>
                            <th>Reason</th>
                            <th>Files Snapshot</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!versions || versions.length === 0) && (
                            <tr><td colSpan="6" className="text-center text-muted p-3">No revisions yet.</td></tr>
                        )}
                        {(versions || []).map((v, idx) => (
                            <tr key={idx}>
                                <td><Badge bg="secondary">v{v.revisionNumber}</Badge></td>
                                <td>{new Date(v.snapshotDate).toLocaleString()}</td>
                                <td>{v.stageType || '-'}</td>
                                <td>{v.reasonForRevision}</td>
                                <td>
                                    <small>{(v.fileList || []).join(", ")}</small>
                                </td>
                                <td>
                                    <Button size="sm" variant="info" onClick={() => onViewSnapshot && onViewSnapshot(v.revisionNumber)} className="me-2">
                                        View Snapshot
                                    </Button>
                                    <Button size="sm" variant="outline-warning" onClick={() => handleRestoreClick(v)}>
                                        Restore
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Revision Modal */}
            <Modal show={showReviseModal} onHide={() => setShowReviseModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Request Revision</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">
                        This will create a read-only snapshot of the current project state and move the project back to the selected stage.
                    </p>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason / Change Request</Form.Label>
                        <Form.Control
                            as="textarea" rows={3}
                            value={reason} onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Client requested design changes..."
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Move Back To</Form.Label>
                        <Form.Select value={targetStage} onChange={e => setTargetStage(e.target.value)}>
                            <option value="INQUIRY">Inquiry / Requirements</option>
                            <option value="DESIGN">Design Phase</option>
                            <option value="ESTIMATION">Estimation</option>
                            <option value="QUOTATION">Quotation</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReviseModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleRevise} disabled={submitting}>
                        {submitting ? <Spinner size="sm" /> : "Confirm Revision"}
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Restore Confirmation Modal */}
            <Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Confirm Restore</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className="alert alert-warning">
                        <strong>Warning:</strong> You are about to restore
                        <strong> Version {versionToRestore?.revisionNumber}</strong>.
                    </div>
                    <p>
                        This will overwrite the current project details (Name, Customer, Comments, Stage, etc.) with the data from this version.
                    </p>
                    <p className="text-muted small">
                        A safety snapshot of the <em>current</em> state will be created before restoring.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRestoreModal(false)} disabled={submitting}>Cancel</Button>
                    <Button variant="warning" onClick={confirmRestore} disabled={submitting}>
                        {submitting ? <Spinner size="sm" /> : "Yes, Restore it"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
