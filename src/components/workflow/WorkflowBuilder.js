import React, { useCallback, useEffect, useState } from "react";
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    MiniMap,
    Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button, Form, Spinner, Modal, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { Undo2, Redo2 } from 'lucide-react';
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { getWorkflow, saveWorkflow } from "../../services/workflowApi";

// Custom Components
import StageNode from "./StageNode";
import StagePropertyPanel from "./StagePropertyPanel";
import TransitionPropertyPanel from "./TransitionPropertyPanel";

// Helpers
const uniq = (arr) => Array.from(new Set(arr));
const normalizeKey = (s) => s.trim().toUpperCase().replace(/\s+/g, "_");

const nodeTypes = {
    stage: StageNode
};

const emptyFlow = {
    id: "",
    stages: [],
    requiredApprovals: {},
    transitions: {},
    initialStage: "",
    version: 0,
    stageRevisions: {},
    notifications: {},
    backwardTransitions: {},
    visibility: {},
    estimationApproverRoles: [],
    purchaseOrderApproverRoles: [],
    stockAuditApproverRoles: [],
    payrollApproverRoles: [],
    visualLayout: {} // { "STAGE": { x: 0, y: 0 } }
};

export default function WorkflowBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    // --- State ---
    // We use a local state 'flow' which represents the current workflow definition
    const [flow, setLocalFlow] = useState({ ...emptyFlow, id: isNew ? "" : id });
    const [workflowIdInput, setWorkflowIdInput] = useState(isNew ? "" : id);

    // History Stacks for Undo/Redo
    const [historyStack, setHistoryStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Backend Data
    const [roles, setRoles] = useState([]);
    const [availableStages, setAvailableStages] = useState([]);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selection, setSelection] = useState(null); // { type: 'node'|'edge', id: string }
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);

    // --- History Helper ---
    // Wrapper around setLocalFlow to push history
    const setFlow = useCallback((action) => {
        const next = typeof action === 'function' ? action(flow) : action;
        if (JSON.stringify(next) === JSON.stringify(flow)) return;

        // Push current to history
        setHistoryStack(prev => [...prev.slice(-49), flow]);
        setRedoStack([]); // Clear redo
        setLocalFlow(next);
    }, [flow]); // flow is the main dependency. historyStack setter is stable.

    const undo = useCallback(() => {
        if (historyStack.length === 0) return;
        const prev = historyStack[historyStack.length - 1];
        setRedoStack(r => [flow, ...r]);
        setHistoryStack(h => h.slice(0, -1));
        setLocalFlow(prev);
    }, [historyStack, flow]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[0];
        setRedoStack(r => r.slice(1));
        setHistoryStack(h => [...h, flow]);
        setLocalFlow(next);
    }, [redoStack, flow]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);


    // Debug Log Removed

    // --- Load Data ---
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);

                // Fetch Data needed
                const fetchFlow = (!isNew) ? getWorkflow(id).catch(() => null) : Promise.resolve(null);

                const [wf, stagesRes, rolesRes] = await Promise.all([
                    fetchFlow,
                    api.get("/workflow/stages").catch(() => ({ data: [] })),
                    api.get("/projects/workflow/roles").catch(() => ({ data: [] })), // Use workflow roles
                ]);

                // Merge with emptyFlow to ensure all fields exist
                const base = {
                    ...emptyFlow,
                    ...(wf || {}),
                    id: (wf && wf.id) ? wf.id : (isNew ? "" : id),
                    // Ensure arrays/objects generic
                    stages: wf?.stages || [],
                    requiredApprovals: wf?.requiredApprovals || {},
                    transitions: wf?.transitions || {},
                    initialStage: wf?.initialStage || (wf?.stages?.[0] || ""),
                    notifications: wf?.notifications || {},
                    backwardTransitions: wf?.backwardTransitions || {},
                    visibility: wf?.visibility || {},
                    estimationApproverRoles: wf?.estimationApproverRoles || [],
                    purchaseOrderApproverRoles: wf?.purchaseOrderApproverRoles || [],
                    stockAuditApproverRoles: wf?.stockAuditApproverRoles || [],
                    payrollApproverRoles: wf?.payrollApproverRoles || [],
                    visualLayout: wf?.visualLayout || {}
                };

                setLocalFlow(base); // Direct set, no history
                if (base.id) setWorkflowIdInput(base.id);

                setAvailableStages(stagesRes.data || []);
                setRoles(rolesRes.data || []);

            } catch (e) {
                console.error(e);
                toast.error("Failed to load workflow data");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isNew]);

    // --- Handlers ---

    const addGlobalRole = async (val) => {
        if (!val) return;
        try {
            await api.post(`/workflow/roles?name=${encodeURIComponent(val)}`);
            setRoles(prev => [...prev, val].sort());
            toast.success("Role added globally");
        } catch (e) {
            toast.error("Failed to add role");
        }
    };

    const removeGlobalRole = async (val) => {
        if (!window.confirm(`Delete global role "${val}"? This will remove it from the list for all workflows.`)) return;
        try {
            await api.delete(`/workflow/roles/${encodeURIComponent(val)}`);
            setRoles(prev => prev.filter(r => r !== val));
            toast.success("Role deleted");
        } catch (e) {
            toast.error("Failed to delete role");
        }
    };

    // --- Sync Flow -> Visual Nodes/Edges ---
    useEffect(() => {
        if (loading) return;

        // Map Stages to Nodes
        const newNodes = (flow.stages || []).map((s, i) => {
            const pos = flow.visualLayout?.[s] || { x: 50 + (i % 3) * 350, y: 50 + Math.floor(i / 3) * 150 };
            return {
                id: s,
                type: 'stage',
                position: pos,
                data: {
                    label: s,
                    isInitial: flow.initialStage === s,
                    approvals: flow.requiredApprovals?.[s] || [],
                    notifications: flow.notifications?.[s] || [],
                    hasFiles: (flow.fileRequirements?.[s] || []).length > 0,
                    onEdit: () => setSelection({ type: 'node', id: s })
                }
            };
        });

        // Map Transitions to Edges
        const newEdges = [];
        Object.entries(flow.transitions || {}).forEach(([from, rules]) => {
            (rules || []).forEach(r => {
                newEdges.push({
                    id: `${from}->${r.to}`,
                    source: from,
                    target: r.to,
                    animated: true,
                    label: r.roles?.length > 0 ? 'Restricted' : null,
                    style: { stroke: r.roles?.length > 0 ? '#fd7e14' : '#b1b7be' }
                });
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [
        loading,
        // Dependencies must cover all visual aspects
        JSON.stringify(flow.stages),
        JSON.stringify(flow.transitions),
        JSON.stringify(flow.requiredApprovals),
        JSON.stringify(flow.initialStage),
        JSON.stringify(flow.fileRequirements),
        JSON.stringify(flow.notifications)
        // Note: Not depending on visualLayout avoids re-render loops/crashes during drag.
        // Positions are updated via onNodesChange (internal) and onNodeDragStop (flow state).
        // Undo of position might need distinct handling or be ignored for stability.
    ]);


    // --- Handlers ---

    const onConnect = useCallback((params) => {
        const { source, target } = params;
        if (source === target) return;

        // Check if exists
        const existingRules = flow.transitions[source] || [];
        if (existingRules.find(r => r.to === target)) return;

        const nextRules = [...existingRules, { to: target, roles: [] }];
        setFlow(f => ({
            ...f,
            transitions: { ...f.transitions, [source]: nextRules }
        }));
    }, [flow.transitions, setFlow]);

    const deleteEdgeById = useCallback((edgeId) => {
        const [source, target] = edgeId.split('->');
        if (!source || !target) return;

        const rules = flow.transitions[source] || [];
        const nextRules = rules.filter(r => r.to !== target);

        setFlow(f => ({
            ...f,
            transitions: { ...f.transitions, [source]: nextRules }
        }));
        setSelection(null);
    }, [flow.transitions, setFlow]);

    const onEdgesDelete = useCallback((edgesToDelete) => {
        // Batch delete
        let nextTrans = { ...flow.transitions };
        let changed = false;
        edgesToDelete.forEach(edge => {
            const { source, target } = edge;
            if (!source || !target) return;
            const rules = nextTrans[source] || [];
            const filtered = rules.filter(r => r.to !== target);
            if (filtered.length !== rules.length) {
                nextTrans[source] = filtered;
                changed = true;
            }
        });
        if (changed) {
            setFlow(f => ({ ...f, transitions: nextTrans }));
            setSelection(null);
        }
    }, [flow.transitions, setFlow]);

    const onNodeDragStop = useCallback((event, node) => {
        try {
            if (!node || !node.id || !node.position) {
                console.warn("Invalid node or position in onNodeDragStop", node);
                return;
            }
            // Ensure position is valid numbers
            if (isNaN(node.position.x) || isNaN(node.position.y)) {
                console.warn("Invalid position NaN", node.position);
                return;
            }

            setFlow(f => ({
                ...f,
                visualLayout: {
                    ...f.visualLayout,
                    [node.id]: node.position
                }
            }));
        } catch (e) {
            console.error("Error in onNodeDragStop", e);
        }
    }, [setFlow]);

    // Add Stage
    const [newStageName, setNewStageName] = useState("");
    const addStage = useCallback(() => {
        const key = normalizeKey(newStageName);
        if (!key) return;
        if (flow.stages.includes(key)) {
            toast.warn("Stage exists");
            return;
        }

        const count = flow.stages.length;
        const newPos = { x: 100 + (count * 50), y: 100 + (count * 50) }; // simple cascade

        setFlow(f => ({
            ...f,
            stages: [...f.stages, key],
            requiredApprovals: { ...f.requiredApprovals, [key]: [] },
            visualLayout: { ...f.visualLayout, [key]: newPos },
            initialStage: f.initialStage || key // Auto-set if empty
        }));
        setNewStageName("");
    }, [flow.stages, newStageName, setFlow]);

    const removeStage = useCallback((key) => {
        setFlow((f) => {
            const stages = f.stages.filter((s) => s !== key);
            const { [key]: _a, ...restApprovals } = f.requiredApprovals;
            const { [key]: _b, ...restTransitions } = f.transitions;

            // Clean incoming
            const cleanedTransitions = Object.fromEntries(
                Object.entries(restTransitions).map(([from, rules]) => [
                    from,
                    (rules || []).filter((r) => r.to !== key),
                ])
            );

            // If we removed the initial stage, reset it
            let nextInitial = f.initialStage;
            if (f.initialStage === key) {
                nextInitial = stages.length > 0 ? stages[0] : "";
            }

            return {
                ...f,
                stages,
                initialStage: nextInitial,
                requiredApprovals: restApprovals,
                transitions: cleanedTransitions,
            };
        });
        setSelection(null);
    }, [setFlow]);

    const toggleGlobalRole = useCallback((field, role) => {
        const current = flow[field] || [];
        const next = current.includes(role)
            ? current.filter(r => r !== role)
            : [...current, role];
        setFlow(f => ({ ...f, [field]: next }));
    }, [flow, setFlow]);


    const save = async () => {
        if (!workflowIdInput) {
            toast.error("Workflow ID is required.");
            return;
        }

        // Basic Validation
        if (flow.stages.length === 0) {
            toast.error("At least one stage is required.");
            return;
        }

        // Ensure initial stage is set (backend requires it)
        if (!flow.initialStage) {
            // Fallback to first stage if somehow missing
            if (flow.stages.length > 0) {
                const first = flow.stages[0];
                toast.info(`Setting initial stage to ${first}`);
                // We can't update state and save immediately easily, so we patch payload
                // But better to return and let user know or auto-fix in state?
                // Let's patch payload for save success
            } else {
                toast.error("Initial stage is missing.");
                return;
            }
        }

        try {
            setSaving(true);
            // Ensure initialStage is populated in payload
            const payload = {
                ...flow,
                id: workflowIdInput,
                initialStage: flow.initialStage || flow.stages[0]
            };

            const savedFlow = await saveWorkflow(payload, workflowIdInput);

            setLocalFlow(savedFlow); // direct update
            toast.success("Workflow Saved Successfully");

            if (isNew) {
                navigate(`/admin/workflow/${workflowIdInput}`, { replace: true });
            }
        } catch (e) {
            console.error(e);
            if (e.response && e.response.status === 409) {
                toast.error("Version Conflict. Please refresh and try again.");
            } else if (e.response && e.response.data) {
                // Show backend validation error
                toast.error(`Error: ${e.response.data}`);
            } else {
                toast.error("Failed to save workflow.");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" /></div>;

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="bg-white border-bottom px-3 py-2 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <Button variant="outline-secondary" size="sm" onClick={() => navigate("/admin/workflows")}>← Back</Button>
                    <span className="fw-bold fs-5">{isNew ? "New Workflow" : id}</span>
                    <Button variant="outline-dark" size="sm" onClick={() => setShowGlobalSettings(true)}>⚙️ Global Settings</Button>
                </div>
                <div className="d-flex gap-2">
                    <Form.Control
                        size="sm"
                        placeholder="Stage Name"
                        value={newStageName}
                        onChange={e => setNewStageName(e.target.value)}
                        style={{ width: 150 }}
                    />
                    <Button size="sm" variant="outline-primary" onClick={addStage} disabled={!newStageName}>+ Add Stage</Button>
                    <div className="vr mx-2"></div>
                    <Form.Control
                        size="sm"
                        placeholder="Workflow ID"
                        value={workflowIdInput}
                        disabled={!isNew}
                        onChange={e => setWorkflowIdInput(e.target.value)}
                        style={{ width: 150 }}
                    />
                    <Button size="sm" variant="primary" onClick={save} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            {/* Content: Canvas + Sidebar */}
            <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
                <div style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onEdgesDelete={onEdgesDelete}
                        onNodeDragStop={onNodeDragStop}
                        onNodeClick={(_, node) => setSelection({ type: 'node', id: node.id })}
                        onEdgeClick={(_, edge) => setSelection({ type: 'edge', id: edge.id })}
                        onPaneClick={() => setSelection(null)}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background color="#aaa" gap={16} />
                        <Controls />
                        <MiniMap style={{ height: 100 }} zoomable pannable />
                        <Panel position="top-left" className="bg-white p-2 rounded shadow-sm border d-flex gap-2">
                            <Button variant={historyStack.length > 0 ? 'light' : 'white'} size="sm" onClick={undo} disabled={historyStack.length === 0} title="Undo (Ctrl+Z)">
                                <Undo2 size={16} className={historyStack.length === 0 ? "text-muted" : "text-dark"} />
                            </Button>
                            <Button variant={redoStack.length > 0 ? 'light' : 'white'} size="sm" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)">
                                <Redo2 size={16} className={redoStack.length === 0 ? "text-muted" : "text-dark"} />
                            </Button>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Sidebar Panel */}
                {selection && selection.type === 'node' && (
                    <div style={{ zIndex: 10, width: '320px', borderLeft: '1px solid #ddd', backgroundColor: 'white', position: 'absolute', right: 0, top: 0, bottom: 0 }}>
                        <StagePropertyPanel
                            stage={selection.id}
                            flow={flow}
                            roles={roles}
                            allStages={availableStages}
                            onUpdateFlow={setFlow}
                            onClose={() => setSelection(null)}
                            onRemoveStage={removeStage}
                        />
                    </div>
                )}
                {selection && selection.type === 'edge' && (
                    <div style={{ zIndex: 10, width: '320px', borderLeft: '1px solid #ddd', backgroundColor: 'white', position: 'absolute', right: 0, top: 0, bottom: 0 }}>
                        <TransitionPropertyPanel
                            edgeId={selection.id}
                            flow={flow}
                            roles={roles}
                            onUpdateFlow={setFlow}
                            onClose={() => setSelection(null)}
                            onRemoveEdge={deleteEdgeById}
                        />
                    </div>
                )}
            </div>

            {/* Global Settings Modal */}
            <Modal show={showGlobalSettings} onHide={() => setShowGlobalSettings(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Global Workflow Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Role Management Section */}
                    <div className="mb-4 border-bottom pb-3">
                        <label className="fw-bold mb-2">Global Roles</label>
                        <div className="d-flex gap-2 mb-2">
                            <Form.Control
                                size="sm"
                                placeholder="Add new global role..."
                                id="new-role-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.target.value.trim().toUpperCase(); // Enforce UPPERCASE
                                        if (val && !roles.includes(val)) {
                                            addGlobalRole(val);
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                            <Button size="sm" variant="outline-primary" onClick={() => {
                                const input = document.getElementById('new-role-input');
                                const val = input.value.trim().toUpperCase();
                                if (val && !roles.includes(val)) {
                                    addGlobalRole(val);
                                    input.value = '';
                                }
                            }}>Add</Button>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {roles.map(r => (
                                <Badge key={r} bg="secondary" className="d-flex align-items-center gap-1">
                                    {r}
                                    <span
                                        style={{ cursor: 'pointer', opacity: 0.7 }}
                                        onClick={() => removeGlobalRole(r)}
                                    >×</span>
                                </Badge>
                            ))}
                            {roles.length === 0 && <small className="text-muted">No global roles defined.</small>}
                        </div>
                    </div>

                    {[
                        { label: 'Estimation Approvers', field: 'estimationApproverRoles' },
                        { label: 'Purchase Order Approvers', field: 'purchaseOrderApproverRoles' },
                        { label: 'Stock Audit Approvers', field: 'stockAuditApproverRoles' },
                        { label: 'Payroll Approvers', field: 'payrollApproverRoles' },
                    ].map(({ label, field }) => (
                        <div key={field} className="mb-3">
                            <label className="fw-bold mb-1">{label}</label>
                            <div className="d-flex flex-wrap gap-2">
                                {roles.map(r => {
                                    const active = (flow[field] || []).includes(r);
                                    return (
                                        <div
                                            key={r}
                                            onClick={() => toggleGlobalRole(field, r)}
                                            className={`badge border ${active ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {r}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowGlobalSettings(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
