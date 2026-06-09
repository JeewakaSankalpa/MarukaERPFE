import { ArrowLeft } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { Table, Button, Card, Badge, Spinner, Alert } from "react-bootstrap";
import {
    listWorkflows,
    getWorkflow,
    createWorkflow,
    activateWorkflow,
    setWorkflowEnabled
} from "../../services/workflowApi";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function WorkflowList() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    const handleDuplicate = async (wf) => {
        const newId = prompt("Enter ID for the new duplicated workflow:", wf.id + "_copy")?.trim();
        if (!newId || newId === wf.id) return;

        try {
            setLoading(true);
            const source = await getWorkflow(wf.id);
            await createWorkflow(source, newId);

            toast.success("Workflow duplicated successfully!");
            await loadData();
        } catch (e) {
            console.error(e);
            toast.error("Failed to duplicate workflow: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSetActive = async (id) => {
        if (!window.confirm(`Are you sure you want to set "${id}" as the ACTIVE workflow? This will affect all new projects.`)) {
            return;
        }
        try {
            setLoading(true);
            await activateWorkflow(id);
            toast.success("Workflow activated successfully");
            await loadData();
        } catch (e) {
            console.error(e);
            toast.error("Failed to activate workflow");
            setLoading(false);
        }
    };

    const handleSetEnabled = async (wf, enabled) => {
        const action = enabled ? "enable" : "disable";
        if (!window.confirm(`${action[0].toUpperCase() + action.slice(1)} workflow "${wf.id}"?`)) {
            return;
        }

        try {
            setLoading(true);
            await setWorkflowEnabled(wf.id, enabled);
            toast.success(`Workflow ${enabled ? "enabled" : "disabled"} successfully`);
            await loadData();
        } catch (e) {
            console.error(e);
            const message = e.response?.data?.message || e.response?.data || `Failed to ${action} workflow`;
            toast.error(message);
            setLoading(false);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const list = await listWorkflows();
            setWorkflows(list || []);
            setError(null);
        } catch (e) {
            console.error(e);
            setError("Failed to load workflows.");
            toast.error("Failed to load workflows");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center"><Spinner animation="border" /></div>;

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Workflow Configuration</h3>
                        </div>
<Button onClick={() => navigate("/admin/workflow")}>
                    Create New Workflow
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card>
                <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th>ID</th>
                            <th>Default</th>
                            <th>Availability</th>
                            <th>Version</th>
                            <th>Updated At</th>
                            <th>Updated By</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workflows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center text-muted p-4">
                                    No workflows found.
                                </td>
                            </tr>
                        ) : (
                            workflows.map((wf) => (
                                <tr key={wf.id}>
                                    <td className="fw-semibold">
                                        <Link to={`/admin/workflow/${encodeURIComponent(wf.id)}`} className="text-decoration-none">
                                            {wf.id}
                                        </Link>
                                    </td>
                                    <td>
                                        <Badge bg={wf.active ? "success" : "secondary"}>
                                            {wf.active ? "Active (Default)" : "Not Default"}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Badge bg={wf.enabled ? "primary" : "dark"}>
                                            {wf.enabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </td>
                                    <td>{wf.version}</td>
                                    <td>{wf.updatedAt ? new Date(wf.updatedAt).toLocaleString() : "-"}</td>
                                    <td>{wf.updatedBy || "-"}</td>
                                    <td className="text-end">
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            as={Link}
                                            to={`/admin/workflow/${encodeURIComponent(wf.id)}`}
                                            className="me-2"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline-secondary" // Changed color
                                            className="me-2"
                                            onClick={() => handleDuplicate(wf)}
                                        >
                                            Duplicate
                                        </Button>
                                        {!wf.active && (
                                            <Button
                                                size="sm"
                                                variant="outline-success"
                                                className="me-2"
                                                onClick={() => handleSetActive(wf.id)}
                                            >
                                                Set Active
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant={wf.enabled ? "outline-warning" : "outline-primary"}
                                            disabled={wf.active && wf.enabled}
                                            title={wf.active && wf.enabled ? "Set another workflow as active before disabling this one" : ""}
                                            onClick={() => handleSetEnabled(wf, !wf.enabled)}
                                        >
                                            {wf.enabled ? "Disable" : "Enable"}
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>
        </div>
    );
}
