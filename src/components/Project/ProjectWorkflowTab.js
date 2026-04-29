import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Alert, Spinner, Table, Badge, Modal } from 'react-bootstrap';
import { listWorkflows } from '../../services/workflowApi';
import api from '../../api/api';
import SafeSelect from '../ReusableComponents/SafeSelect';
import { toast } from 'react-toastify';

export default function ProjectWorkflowTab({ projectId, currentWorkflow, currentStageId, onUpdate, project, setProcessingMessage }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmData, setConfirmData] = useState(null);

    // Resolve the actual active workflow ID from either the snapshot or the project field
    const activeWorkflowId = currentWorkflow?.id || project?.workflowId || 'active';

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        setLoading(true);
        try {
            const data = await listWorkflows();
            setWorkflows(data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load available workflows");
        } finally {
            setLoading(false);
        }
    };

    const confirmSync = (targetId) => {
        if (!targetId) return;

        const isSame = targetId === activeWorkflowId;
        
        let message = '';
        let title = '';
        if (!isSame) {
            const target = workflows.find(w => w.id === targetId);
            if (!target) return;
            title = 'Confirm Workflow Switch';
            message = `Are you sure you want to switch this project to workflow "${target.id}" (v${target.version || 0})?\n\nThis will create a backup snapshot of the current state.`;
        } else {
            title = 'Confirm Workflow Sync';
            message = `Sync the latest global updates from the "${targetId}" workflow to this project?\n\nThis will create a backup snapshot of the current state.`;
        }

        setConfirmData({ targetId, isSame, message, title });
        setShowConfirmModal(true);
    };

    const proceedWithSync = async () => {
        if (!confirmData) return;
        const { targetId, isSame } = confirmData;
        setShowConfirmModal(false);

        setSwitching(true);
        if (setProcessingMessage) {
            setProcessingMessage(isSame ? 'Syncing latest workflow updates…' : 'Switching workflow…');
        } else {
            toast.info(isSame ? "Syncing updates..." : "Switching workflow...");
        }

        try {
            await api.post(`/projects/${projectId}/workflow/switch`, {
                targetWorkflowId: targetId
            });
            toast.success(isSame ? "Workflow synced to latest version!" : "Workflow switched successfully!");
            if (onUpdate) await onUpdate(); // Pulls the latest project details in-place
        } catch (e) {
            console.error(e);
            const msg = e.response?.data?.message || e.message;
            toast.error("Failed to update: " + msg);
        } finally {
            setSwitching(false);
            if (setProcessingMessage) setProcessingMessage('');
        }
    };

    return (
        <Card className="mt-3 shadow-sm">
            <Card.Header className="bg-white">
                <h5 className="mb-0">Workflow Management</h5>
            </Card.Header>
            <Card.Body>
                <div className="mb-4">
                    <h6>Current Configuration</h6>
                    <Table size="sm" bordered className="mb-0">
                        <tbody>
                            <tr>
                                <td className="bg-light" style={{ width: '200px' }}>Current Workflow ID</td>
                                <td>{activeWorkflowId === 'active' ? <em>Global Default (active)</em> : activeWorkflowId}</td>
                            </tr>
                            <tr>
                                <td className="bg-light">Version</td>
                                <td>{currentWorkflow?.version ?? '-'}</td>
                            </tr>
                            <tr>
                                <td className="bg-light">Snapshotted Stages</td>
                                <td>
                                    {currentWorkflow?.stages?.map(s => (
                                        <Badge bg="secondary" className="me-1" key={s}>{s}</Badge>
                                    )) || <em className="text-muted">No snapshot (using global)</em>}
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </div>

                <hr />

                <h6>Switch Workflow</h6>
                <p className="text-muted small">
                    You can switch this project to a different workflow definition.
                    The system will validate that the project's current stage exists in the target workflow.
                </p>

                {loading ? (
                    <div className="text-center p-3"><Spinner size="sm" /> Loading workflows...</div>
                ) : (
                    <>
                        <div className="d-flex gap-2 mb-4 align-items-center">
                            <Button 
                                variant="primary" 
                                disabled={switching} 
                                onClick={() => confirmSync(activeWorkflowId)}
                            >
                                {switching ? <Spinner size="sm" /> : 'Sync Latest Workflow Updates'}
                            </Button>
                            <span className="text-muted small ms-2">
                                Pulls the very latest changes from the global "{activeWorkflowId}" workflow.
                            </span>
                        </div>

                        <div className="d-flex gap-3 align-items-end">
                            <Form.Group style={{ minWidth: '300px' }}>
                                <Form.Label>Select Target Workflow</Form.Label>
                                <SafeSelect
                                    value={selectedWorkflowId}
                                    onChange={e => setSelectedWorkflowId(e.target.value)}
                                >
                                    {workflows.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.id === 'active' ? 'Active (Default)' : w.id}
                                            {w.version ? ` (v${w.version})` : ''}
                                            {activeWorkflowId === w.id && ' ★ Current'}
                                        </option>
                                    ))}
                                </SafeSelect>
                            </Form.Group>
                            <Button
                                variant="warning"
                                disabled={!selectedWorkflowId || switching || selectedWorkflowId === activeWorkflowId}
                                onClick={() => confirmSync(selectedWorkflowId)}
                            >
                                {switching ? <Spinner size="sm" /> : 'Switch Workflow'}
                            </Button>
                        </div>
                    </>
                )}
            </Card.Body>

            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{confirmData?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p style={{ whiteSpace: 'pre-wrap' }} className="mb-0">{confirmData?.message}</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                    <Button variant={confirmData?.isSame ? "primary" : "warning"} onClick={proceedWithSync}>
                        {confirmData?.isSame ? "Confirm Sync" : "Confirm Switch"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
}
