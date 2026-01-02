import React, { useEffect, useState } from "react";
import { Table, Button, Card, Badge, Spinner, Alert } from "react-bootstrap";
import { listWorkflows, activateWorkflow } from "../../services/workflowApi";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function WorkflowList() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    const handleDuplicate = async (wf) => {
        const newId = prompt("Enter ID for the new duplicated workflow:", wf.id + "_copy");
        if (!newId) return;

        try {
            setLoading(true);
            // 1. Fetch full details of source
            const { getWorkflow, saveWorkflow } = require("../../services/workflowApi"); // Lazy import to allow updates
            const source = await getWorkflow(wf.id);

            // 2. Prepare copy
            const copy = { ...source, id: newId, version: 0 };

            // 3. Save as new
            await saveWorkflow(copy, newId);

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
                <h3>Workflow Configuration</h3>
                <Button onClick={() => navigate("/admin/workflow/new")}>
                    Create New Workflow
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card>
                <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th>ID</th>
                            <th>Version</th>
                            <th>Updated At</th>
                            <th>Updated By</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workflows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-muted p-4">
                                    No workflows found.
                                </td>
                            </tr>
                        ) : (
                            workflows.map((wf) => (
                                <tr key={wf.id}>
                                    <td className="fw-semibold">
                                        <Link to={`/admin/workflow/${wf.id}`} className="text-decoration-none">
                                            {wf.id}
                                        </Link>
                                        {wf.id === 'active' && <Badge bg="success" className="ms-2">Active</Badge>}
                                    </td>
                                    <td>{wf.version}</td>
                                    <td>{wf.updatedAt ? new Date(wf.updatedAt).toLocaleString() : "-"}</td>
                                    <td>{wf.updatedBy || "-"}</td>
                                    <td className="text-end">
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            as={Link}
                                            to={`/admin/workflow/${wf.id}`}
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
                                        {wf.id !== 'active' && (
                                            <Button
                                                size="sm"
                                                variant="outline-success"
                                                onClick={() => handleSetActive(wf.id)}
                                            >
                                                Set Active
                                            </Button>
                                        )}
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
