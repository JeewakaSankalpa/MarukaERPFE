import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { listWorkflows } from '../../services/workflowApi';
import api from '../../api/api';
import { toast } from 'react-toastify';

export default function ProjectWorkflowTab({ projectId, currentWorkflow, currentStageId, onUpdate }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState('');

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

    const handleSwitch = async () => {
        if (!selectedWorkflowId) return;

        const target = workflows.find(w => w.id === selectedWorkflowId);
        if (!target) return;

        if (!window.confirm(`Are you sure you want to switch this project to workflow "${target.id}" (v${target.version || 0})?\n\nThis will create a backup snapshot of the current state.`)) {
            return;
        }

        setSwitching(true);
        try {
            await api.post(`/projects/${projectId}/workflow/switch`, {
                targetWorkflowId: selectedWorkflowId
            });
            toast.success("Workflow switched successfully");
            if (onUpdate) onUpdate();
        } catch (e) {
            console.error(e);
            const msg = e.response?.data?.message || e.message;
            toast.error("Failed to switch: " + msg);
        } finally {
            setSwitching(false);
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
                                <td>{currentWorkflow?.id || <em>Global Default</em>}</td>
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
                    <div className="d-flex gap-3 align-items-end">
                        <Form.Group style={{ minWidth: '300px' }}>
                            <Form.Label>Select Target Workflow</Form.Label>
                            <Form.Select
                                value={selectedWorkflowId}
                                onChange={e => setSelectedWorkflowId(e.target.value)}
                            >
                                <option value="">-- Choose Workflow --</option>
                                {workflows.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.id === 'active' ? 'Active (Default)' : w.id}
                                        {w.version ? ` (v${w.version})` : ''}
                                        {currentWorkflow?.id === w.id && ' (Current)'}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Button
                            variant="warning"
                            disabled={!selectedWorkflowId || switching || selectedWorkflowId === currentWorkflow?.id}
                            onClick={handleSwitch}
                        >
                            {switching ? <Spinner size="sm" /> : 'Switch Workflow'}
                        </Button>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}
