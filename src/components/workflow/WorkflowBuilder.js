import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    MiniMap,
    Panel // For Undo/Redo buttons
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button, Form, Spinner, Modal, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { Undo2, Redo2 } from 'lucide-react';
import api from "../../api/api";
<<<<<<< Updated upstream

/**
 * Backend endpoints expected:
 *  GET  /api/workflow                -> { stages, requiredApprovals, transitions, initialStage, version }
 *  PUT  /api/workflow                -> same shape, returns updated (with new version)
 *  GET  /api/workflow/stages         -> ["INQUIRY","ESTIMATION",...]
 *  GET  /api/roles                   -> ["ADMIN","APPROVER","SALES","MANAGER", ...]
 *  POST /api/roles                   -> body: { name: "NEW_ROLE" }
 *  DELETE /api/roles/{name}          -> delete role
 *
 * If you don’t have roles endpoints yet, you can start with GET/POST/DELETE in a simple controller.
 */

// helpers
const uniq = (arr) => Array.from(new Set(arr));
const normalizeKey = (s) => s.trim().toUpperCase().replace(/\s+/g, "_");

const emptyFlow = {
    stages: [],                // ["INQUIRY","ESTIMATION",...]
    requiredApprovals: {},     // { INQUIRY: ["SALES"], ... }
    transitions: {},           // { INQUIRY: [{to:"ESTIMATION", roles:["SALES"], notifyRoles:["MANAGER"]}], ... }
    initialStage: "",
    version: 0,
    stageRevisions: {},        // { INQUIRY: true, ESTIMATION: false ... }
    notifications: {},         // { INQUIRY: ["HR"], ... }  NEW
    backwardTransitions: {},   // { ESTIMATION: ["INQUIRY"], ... } NEW
    visibility: {},            // { INQUIRY: { fieldsVisible: ["FILES"] } } NEW
    estimationApproverRoles: [], // NEW: Global list of roles for Estimation Approval
    purchaseOrderApproverRoles: [], // NEW: Global list of roles for PO Approval
    stockAuditApproverRoles: [], // NEW: Global list of roles for Stock Audit Approval
    payrollApproverRoles: [], // NEW: Global list of roles for Payroll Approval
=======
import { useParams, useNavigate } from "react-router-dom";
import { getWorkflow, saveWorkflow } from "../../services/workflowApi";
import { StageNode } from "./StageNode"; // Custom Node
import StagePropertyPanel from "./StagePropertyPanel"; // Inspector
import TransitionPropertyPanel from "./TransitionPropertyPanel"; // Edge Inspector

// initial empty flow
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
    fileRequirements: {},
    visualLayout: {} // { "STAGE": {x, y} }
>>>>>>> Stashed changes
};

const nodeTypes = {
    stage: StageNode,
};

// --- Custom History Hook ---
// function useHistory(initialState) {
//     const [history, setHistory] = useState([initialState]);
//     const [pointer, setPointer] = useState(0);

//     const state = history[pointer];

//     const maxHistory = 30;

//     const setState = useCallback((action) => {
//         setHistory((prev) => {
//             const current = prev[pointer];
//             const next = typeof action === 'function' ? action(current) : action;
//             // Equality check to avoid duplicates (optional but good)
//             if (JSON.stringify(current) === JSON.stringify(next)) return prev;

//             const newHistory = prev.slice(0, pointer + 1);
//             newHistory.push(next);
//             if (newHistory.length > maxHistory) newHistory.shift();
//             return newHistory;
//         });
//         setPointer((p) => Math.min(p + 1, maxHistory)); // Correct pointer update logic needs to account for shift
//         // Simplified pointer logic: just point to last
//         setPointer(prev => {
//              const newLen = Math.min(prev + 2, maxHistory + 1); // rough guess, let's fix
//              return pointer + 1 >= maxHistory ? maxHistory - 1 : pointer + 1;
//         });
//     }, [pointer]);

//     // Fixed History Logic
//     const pushState = useCallback((newState) => {
//         setHistory(prev => {
//             const chopped = prev.slice(0, pointer + 1);
//             const next = [...chopped, newState];
//             if (next.length > 50) next.shift();
//             return next;
//         });
//         setPointer(prev => Math.min(prev + 1, 49)); // Max index 49 (len 50)
//     }, [pointer]);

//     const undo = useCallback(() => {
//         if (pointer > 0) setPointer(p => p - 1);
//     }, [pointer]);

//     const redo = useCallback(() => {
//         if (pointer < history.length - 1) setPointer(p => p + 1);
//     }, [pointer, history.length]);

//     return { state, pushState, undo, redo, canUndo: pointer > 0, canRedo: pointer < history.length - 1 };
// }


export default function WorkflowBuilder() {
<<<<<<< Updated upstream
    const [flow, setFlow] = useState(emptyFlow);
=======
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    // State via History Hook
    const [localFlow, setLocalFlow] = useState({ ...emptyFlow, id: isNew ? "" : id });
    // We implement manual History stack to have better control than relying on generic hooks
    // Let's use simple state and separate history arrays

    // --- Manual History Implementation ---
    const [historyStack, setHistoryStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const setFlow = (action) => {
        const next = typeof action === 'function' ? action(localFlow) : action;
        if (JSON.stringify(next) === JSON.stringify(localFlow)) return;

        // Push current to history
        setHistoryStack(prev => [...prev.slice(-49), localFlow]);
        setRedoStack([]); // Clear redo
        setLocalFlow(next);
    };

    const undo = () => {
        if (historyStack.length === 0) return;
        const prev = historyStack[historyStack.length - 1];
        setRedoStack(r => [localFlow, ...r]);
        setHistoryStack(h => h.slice(0, -1));
        setLocalFlow(prev);
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[0];
        setRedoStack(r => r.slice(1));
        setHistoryStack(h => [...h, localFlow]);
        setLocalFlow(next);
    };

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
    }, [historyStack, redoStack, localFlow]); // Dependencies important for closure
>>>>>>> Stashed changes

    const flow = localFlow; // alias for compatibility


    const [workflowIdInput, setWorkflowIdInput] = useState(isNew ? "" : id);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [roles, setRoles] = useState([]);
    const [availableStages, setAvailableStages] = useState([]); // from backend

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Selection: { type: 'node' | 'edge', id: string }
    const [selection, setSelection] = useState(null);

    // Global Settings Modal State
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);

    // Initial Load
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
<<<<<<< Updated upstream
                toastId = toast.loading("Loading workflow…");
                const [wfRes, stagesRes, rolesRes] = await Promise.all([
                    api.get("/workflow").catch(() => ({ data: null })),
=======
                const fetchFlow = (!isNew) ? getWorkflow(id).catch(() => null) : Promise.resolve(null);
                const [wf, stagesRes, rolesRes] = await Promise.all([
                    fetchFlow,
>>>>>>> Stashed changes
                    api.get("/workflow/stages").catch(() => ({ data: [] })),
                    api.get("/roles").catch(() => ({ data: [] })),
                ]);

<<<<<<< Updated upstream
                const wf = wfRes.data || emptyFlow;
                const base = {
                    ...emptyFlow,
                    ...wf,
                    stages: wf.stages || [],
                    requiredApprovals: wf.requiredApprovals || {},
                    transitions: wf.transitions || {},
                    initialStage: wf.initialStage || (wf.stages?.[0] || ""),
                    version: wf.version ?? 0,
                    stageRevisions: wf.stageRevisions || {},
                    notifications: wf.notifications || {},
                    backwardTransitions: wf.backwardTransitions || {},
                    visibility: wf.visibility || {},
                    estimationApproverRoles: wf.estimationApproverRoles || [],
                    purchaseOrderApproverRoles: wf.purchaseOrderApproverRoles || [],
                    purchaseOrderApproverRoles: wf.purchaseOrderApproverRoles || [],
                    stockAuditApproverRoles: wf.stockAuditApproverRoles || [],
                    payrollApproverRoles: wf.payrollApproverRoles || [],
                };

                setFlow(base);
                setAllStages(stagesRes.data || []);
=======
                const base = { ...emptyFlow, ...(wf || {}) };
                // Ensure maps exist
                base.stages = base.stages || [];
                base.transitions = base.transitions || {};
                base.requiredApprovals = base.requiredApprovals || {};
                base.visualLayout = base.visualLayout || {};

                setLocalFlow(base); // Update base directly, don't push to history on load
                if (base.id) setWorkflowIdInput(base.id);

                setAvailableStages(stagesRes.data || []);
>>>>>>> Stashed changes
                setRoles(rolesRes.data || []);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load workflow data");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Sync Flow -> Nodes/Edges (On Load or Major Change)
    useEffect(() => {
        if (loading) return;

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
        JSON.stringify(flow.stages),
        JSON.stringify(flow.transitions),
        JSON.stringify(flow.requiredApprovals),
        JSON.stringify(flow.initialStage), // update badges
        JSON.stringify(flow.fileRequirements),
        JSON.stringify(flow.notifications),
        // We do NOT include visualLayout here to avoid jitter if we are dragging.
        // We rely on onNodeDragStop to update visualLayout.
    ]);

    // Handle Connection (Add Transition)
    const onConnect = useCallback((params) => {
        const { source, target } = params;
        if (source === target) return;

        // Add to flow
        const existingRules = flow.transitions[source] || [];
        if (existingRules.find(r => r.to === target)) return; // already exists

        const nextRules = [...existingRules, { to: target, roles: [] }];
        const nextTransitions = { ...flow.transitions, [source]: nextRules };

        setFlow(f => ({ ...f, transitions: nextTransitions }));
    }, [flow.transitions]);

    // Handle Edge Delete
    const onEdgesDelete = useCallback((edgesToDelete) => {
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
        if (changed) setFlow(f => ({ ...f, transitions: nextTrans }));
        setSelection(null);
    }, [flow.transitions]);

    // Helper to delete specific edge ID
    const deleteEdgeById = (edgeId) => {
        // Find edge object to trigger onEdgesDelete logic or do it manually
        // edgeId is "FROM->TO"
        const [source, target] = edgeId.split('->');
        if (!source || !target) return;

        const rules = flow.transitions[source] || [];
        const nextRules = rules.filter(r => r.to !== target);

        setFlow(f => ({
            ...f,
            transitions: { ...f.transitions, [source]: nextRules }
        }));
        setSelection(null);
    }

    // Handle Node Drag Stop (Save Position)
    const onNodeDragStop = useCallback((event, node) => {
        setFlow(f => ({
            ...f,
            visualLayout: {
                ...f.visualLayout,
                [node.id]: node.position
            }
        }));
    }, [setFlow]);

    // Add Stage Logic
    const [newStageName, setNewStageName] = useState("");
    const addStage = () => {
        const key = newStageName.trim().toUpperCase().replace(/\s+/g, "_");
        if (!key) return;
        if (flow.stages.includes(key)) {
            toast.warn("Stage exists");
            return;
        }

        // Find a free spot visually? Just offset from last
        const count = flow.stages.length;
        const newPos = { x: 100 + (count * 50), y: 100 + (count * 50) };

        setFlow(f => ({
            ...f,
            stages: [...f.stages, key],
            requiredApprovals: { ...f.requiredApprovals, [key]: [] },
            visualLayout: { ...f.visualLayout, [key]: newPos }
        }));
        setNewStageName("");
    };

    const removeStage = (key) => {
        // cleanup logic
        setFlow((f) => {
            const stages = f.stages.filter((s) => s !== key);
            const { [key]: _a, ...restApprovals } = f.requiredApprovals;
            const { [key]: _b, ...restTransitions } = f.transitions;
            // cleanup incoming transitions
            const cleanedTransitions = Object.fromEntries(
                Object.entries(restTransitions).map(([from, rules]) => [
                    from,
                    (rules || []).filter((r) => r.to !== key),
                ])
            );
            return {
                ...f,
                stages,
                requiredApprovals: restApprovals,
                transitions: cleanedTransitions,
                // layout cleanup? optional
            };
        });
        setSelection(null);
    };

    const toggleGlobalRole = (field, role) => {
        const current = flow[field] || [];
        const next = current.includes(role)
            ? current.filter(r => r !== role)
            : [...current, role];
        setFlow(f => ({ ...f, [field]: next }));
    };

<<<<<<< Updated upstream
    // --- Validation (no mutation!) ---
    const validation = useMemo(() => {
        const errors = [];
        const stages = flow.stages || [];

        // normalized readonly transitions
        const normalizedTransitions = stages.reduce((acc, s) => {
            acc[s] = (flow.transitions && flow.transitions[s]) ? flow.transitions[s] : [];
            return acc;
        }, {});

        if (stages.length === 0) errors.push("At least one stage is required.");
        if (!flow.initialStage) errors.push("Initial stage is not set.");
        if (flow.initialStage && !stages.includes(flow.initialStage)) {
            errors.push("Initial stage must be an existing stage.");
        }

        // Unknown roles referenced?
        const unknown = [];
        stages.forEach((s) => {
            (flow.requiredApprovals?.[s] || []).forEach((r) => {
                if (!roles.includes(r)) unknown.push(r);
            });
            (normalizedTransitions[s] || []).forEach((t) => {
                (t.roles || []).forEach((r) => { if (!roles.includes(r)) unknown.push(r); });
            });
        });
        if (unknown.length) {
            errors.push(`Unknown roles referenced: ${uniq(unknown).join(", ")}`);
        }

        return { valid: errors.length === 0, errors };
    }, [flow, roles]);

    // --- Save flow ---
    // in save()
    const save = async () => {
        if (!validation.valid) {
            toast.error("Please fix validation errors before saving.");
            return;
        }
        let toastId;
        try {
            setSaving(true);
            toastId = toast.loading("Saving workflow…");
            const { data } = await api.put("/workflow", flow);
            setFlow(f => ({ ...f, version: data?.version ?? f.version }));
            toast.update(toastId, { render: "Workflow saved", type: "success", isLoading: false, autoClose: 1200 });
        } catch (e) {
            console.error(e);
            const msg = e?.response?.status === 409
                ? "This workflow was modified by someone else. Reload and try again."
                : "Failed to save workflow";
            if (toastId) toast.update(toastId, { render: msg, type: "error", isLoading: false, autoClose: 2500 });
            else toast.error(msg);
=======
    const save = async () => {
        if (!workflowIdInput) { toast.error("ID required"); return; }
        try {
            setSaving(true);
            const payload = { ...flow, id: workflowIdInput };
            const savedFlow = await saveWorkflow(payload, workflowIdInput);

            // Update local state with new version and data
            // We preserve the current visualLayout just in case, but backend should return it.
            setLocalFlow(savedFlow);

            toast.success("Workflow Saved");
            if (isNew) navigate(`/admin/workflow/${workflowIdInput}`, { replace: true });
        } catch (e) {
            console.error(e);
            if (e.response && e.response.status === 409) {
                toast.error("Version Conflict. Please refresh and try again.");
            } else {
                toast.error("Failed to save");
            }
>>>>>>> Stashed changes
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" /></div>;

    return (
<<<<<<< Updated upstream
        <div className="p-3" style={{ width: "100%", overflow: "auto" }}>
            <Row className="g-3">
                {/* Stages (from backend, plus you can add) */}
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Stages</Card.Header>
                        <Card.Body>
                            <div className="d-flex gap-2 mb-2">
                                <Form.Control
                                    placeholder='e.g. "Estimation"'
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                />
                                <Button onClick={addStage}>Add</Button>
                            </div>

                            {loading ? (
                                <div>Loading…</div>
                            ) : flow.stages.length === 0 ? (
                                <div className="text-muted">No stages in this flow yet.</div>
                            ) : (
                                <Table size="sm" bordered>
                                    <tbody>
                                        {flow.stages.map((s, i) => (
                                            <tr key={s}>
                                                <td className="align-middle">
                                                    <Badge bg={s === flow.initialStage ? "primary" : "secondary"}>
                                                        {s}
                                                    </Badge>
                                                </td>
                                                <td className="align-middle">
                                                    <Form.Check
                                                        type="radio"
                                                        label="Initial"
                                                        checked={flow.initialStage === s}
                                                        onChange={() => setFlow((f) => ({ ...f, initialStage: s }))}
                                                    />
                                                </td>
                                                <td className="text-nowrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        onClick={() => moveStageUp(i)}
                                                        disabled={i === 0}
                                                    >
                                                        ↑
                                                    </Button>{" "}
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        onClick={() => moveStageDown(i)}
                                                        disabled={i === flow.stages.length - 1}
                                                    >
                                                        ↓
                                                    </Button>{" "}
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        onClick={() => removeStage(s)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}

                            {/* Optional: show “available stages from backend” */}
                            <div className="small text-muted mt-2">
                                Available stages from backend: {allStages.length ? allStages.join(", ") : "—"}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Roles (from backend) + add/remove */}
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Employee Roles</Card.Header>
                        <Card.Body>
                            <div className="d-flex gap-2 mb-2">
                                <Form.Control
                                    placeholder='e.g. "Designer"'
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                />
                                <Button variant="secondary" onClick={addRole}>Add Role</Button>
                            </div>

                            {roles.length === 0 ? (
                                <div className="text-muted">No roles found.</div>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {roles.map((r) => (
                                        <div key={r} className="d-flex align-items-center gap-1 border rounded px-2 py-1">
                                            <span>{r}</span>
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={() => removeRole(r)}
                                                title="Remove role"
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Approvals per stage */}
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Approvals per Stage</Card.Header>
                        <Card.Body style={{ maxHeight: 420, overflow: "auto" }}>
                            {flow.stages.length === 0 ? (
                                <div className="text-muted">Add a stage to configure approvals.</div>
                            ) : flow.stages.map((s) => (
                                <div key={s} className="mb-3 border rounded p-2">
                                    <div className="fw-semibold mb-1">{s}</div>
                                    {roles.length === 0 ? (
                                        <div className="text-muted">No roles to assign.</div>
                                    ) : roles.map((r) => (
                                        <Form.Check
                                            key={`${s}-${r}`}
                                            inline
                                            type="checkbox"
                                            label={r}
                                            checked={(flow.requiredApprovals[s] || []).includes(r)}
                                            onChange={() => toggleRequiredRole(s, r)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Notifications per stage (NEW) */}
            <Row className="g-3 mt-1">
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Notifications per Stage</Card.Header>
                        <Card.Body style={{ maxHeight: 420, overflow: "auto" }}>
                            {flow.stages.length === 0 ? (
                                <div className="text-muted">Add a stage to configure notifications.</div>
                            ) : flow.stages.map((s) => (
                                <div key={s} className="mb-3 border rounded p-2">
                                    <div className="fw-semibold mb-1">{s}</div>
                                    {roles.length === 0 ? (
                                        <div className="text-muted">No roles.</div>
                                    ) : roles.map((r) => (
                                        <Form.Check
                                            key={`notif-${s}-${r}`}
                                            inline
                                            type="checkbox"
                                            label={r}
                                            checked={(flow.notifications?.[s] || []).includes(r)}
                                            onChange={() => {
                                                const current = flow.notifications?.[s] || [];
                                                const next = current.includes(r)
                                                    ? current.filter((x) => x !== r)
                                                    : [...current, r];
                                                setFlow((f) => ({
                                                    ...f,
                                                    notifications: { ...f.notifications, [s]: next },
                                                }));
                                            }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Backward Routes (NEW) */}
                <Col lg={8}>
                    <Card className="h-100">
                        <Card.Header>Backward Routes (Allowed "Return To")</Card.Header>
                        <Card.Body style={{ overflow: "auto" }}>
                            {flow.stages.length < 2 ? (
                                <div className="text-muted">Add at least two stages.</div>
                            ) : (
                                <Table bordered size="sm" responsive>
                                    <thead>
                                        <tr>
                                            <th>From \ To (Backward)</th>
                                            {flow.stages.map((to) => <th key={to}>{to}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flow.stages.map((from) => (
                                            <tr key={from}>
                                                <td className="fw-semibold">{from}</td>
                                                {flow.stages.map((to) => {
                                                    const active = (flow.backwardTransitions?.[from] || []).includes(to);
                                                    return (
                                                        <td key={`back-${from}-${to}`} className="text-center">
                                                            <Form.Check
                                                                type="checkbox"
                                                                disabled={from === to}
                                                                checked={from === to ? false : active}
                                                                onChange={() => {
                                                                    const current = flow.backwardTransitions?.[from] || [];
                                                                    const next = current.includes(to)
                                                                        ? current.filter(x => x !== to)
                                                                        : [...current, to];
                                                                    setFlow((f) => ({
                                                                        ...f,
                                                                        backwardTransitions: { ...f.backwardTransitions, [from]: next },
                                                                    }));
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Component Visibility per Stage (NEW) */}
            <Row className="g-3 mt-1">
                <Col lg={12}>
                    <Card className="h-100">
                        <Card.Header>Component Visibility & Role Overrides</Card.Header>
                        <Card.Body style={{ overflow: "auto" }}>
                            {flow.stages.length === 0 ? (
                                <div className="text-muted">Add a stage to configure visibility.</div>
                            ) : (
                                <Table bordered size="sm" responsive>
                                    <thead>
                                        <tr>
                                            <th>Stage</th>
                                            {["FILES", "PAYMENTS", "INVENTORY", "ESTIMATION", "TASKS", "REVISIONS", "DELIVERY", "TIMELINE"].map(c => <th key={c}>{c}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flow.stages.map((s) => {
                                            const rule = flow.visibility?.[s] || {};
                                            const visibleList = rule.fieldsVisible; // null means ALL default
                                            const isAllDefault = !visibleList;
                                            const roleVis = rule.roleVisibility || {};

                                            return (
                                                <tr key={s}>
                                                    <td className="fw-semibold">
                                                        <div>{s}</div>
                                                        <div className="text-muted small" style={{ fontSize: '0.75em' }}>
                                                            {isAllDefault ? "(Default)" : "(Custom)"}
                                                        </div>
                                                    </td>
                                                    {["FILES", "PAYMENTS", "INVENTORY", "ESTIMATION", "TASKS", "REVISIONS", "DELIVERY", "TIMELINE"].map((comp) => {
                                                        const isVisible = isAllDefault ? true : visibleList.includes(comp);
                                                        const activeRoles = Object.entries(roleVis).filter(([r, comps]) => comps && comps.includes(comp)).map(([r]) => r);

                                                        return (
                                                            <td key={comp} className="text-center">
                                                                <div
                                                                    className="d-flex flex-column align-items-center justify-content-center p-1 rounded"
                                                                    style={{ cursor: 'pointer', backgroundColor: isVisible ? '#f0f9ff' : '#fef2f2', border: '1px solid transparent', minHeight: '40px' }}
                                                                    onClick={() => setVisModal({ show: true, stage: s, component: comp })}
                                                                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#ccc'}
                                                                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                                                >
                                                                    {isVisible
                                                                        ? <Badge bg="success" className="mb-1">Everyone</Badge>
                                                                        : <Badge bg="secondary" className="mb-1">Restricted</Badge>
                                                                    }

                                                                    {!isVisible && activeRoles.length > 0 && (
                                                                        <div className="d-flex flex-wrap justify-content-center gap-1">
                                                                            {activeRoles.map(r => (
                                                                                <Badge key={r} bg="info" text="dark" style={{ fontSize: '0.6rem' }}>
                                                                                    {r.substring(0, 2)}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>


            {/* Global Approvers (NEW) */}
            <Row className="g-3 mt-1">
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Estimation Approvers (Global)</Card.Header>
                        <Card.Body>
                            <div className="text-muted small mb-2">
                                Users with these roles will be required to approve estimations.
                            </div>
                            {roles.length === 0 ? (
                                <div className="text-muted">No roles found.</div>
                            ) : roles.map((r) => (
                                <Form.Check
                                    key={`est-role-${r}`}
                                    type="checkbox"
                                    label={r}
                                    checked={(flow.estimationApproverRoles || []).includes(r)}
                                    onChange={() => {
                                        const current = flow.estimationApproverRoles || [];
                                        const next = current.includes(r)
                                            ? current.filter(x => x !== r)
                                            : [...current, r];
                                        setFlow(f => ({ ...f, estimationApproverRoles: next }));
                                    }}
                                />
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Purchase Order Approvers (Global)</Card.Header>
                        <Card.Body>
                            <div className="text-muted small mb-2">
                                Users with these roles will be required to approve POs.
                            </div>
                            {roles.length === 0 ? (
                                <div className="text-muted">No roles found.</div>
                            ) : roles.map((r) => (
                                <Form.Check
                                    key={`po-role-${r}`}
                                    type="checkbox"
                                    label={r}
                                    checked={(flow.purchaseOrderApproverRoles || []).includes(r)}
                                    onChange={() => {
                                        const current = flow.purchaseOrderApproverRoles || [];
                                        const next = current.includes(r)
                                            ? current.filter(x => x !== r)
                                            : [...current, r];
                                        setFlow(f => ({ ...f, purchaseOrderApproverRoles: next }));
                                    }}
                                />
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Stock Audit Approvers (Global)</Card.Header>
                        <Card.Body>
                            <div className="text-muted small mb-2">
                                Users with these roles will be required to approve Stock Audits.
                            </div>
                            {roles.length === 0 ? (
                                <div className="text-muted">No roles found.</div>
                            ) : roles.map((r) => (
                                <Form.Check
                                    key={`stock-role-${r}`}
                                    type="checkbox"
                                    label={r}
                                    checked={(flow.stockAuditApproverRoles || []).includes(r)}
                                    onChange={() => {
                                        const current = flow.stockAuditApproverRoles || [];
                                        const next = current.includes(r)
                                            ? current.filter(x => x !== r)
                                            : [...current, r];
                                        setFlow(f => ({ ...f, stockAuditApproverRoles: next }));
                                    }}
                                />
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Global Approvers (NEW Row 2) */}
            <Row className="g-3 mt-1">
                <Col lg={4}>
                    <Card className="h-100">
                        <Card.Header>Payroll Approvers (Global)</Card.Header>
                        <Card.Body>
                            <div className="text-muted small mb-2">
                                Users with these roles will be required to approve Payroll Runs.
                            </div>
                            {roles.length === 0 ? (
                                <div className="text-muted">No roles found.</div>
                            ) : roles.map((r) => (
                                <Form.Check
                                    key={`payroll-role-${r}`}
                                    type="checkbox"
                                    label={r}
                                    checked={(flow.payrollApproverRoles || []).includes(r)}
                                    onChange={() => {
                                        const current = flow.payrollApproverRoles || [];
                                        const next = current.includes(r)
                                            ? current.filter(x => x !== r)
                                            : [...current, r];
                                        setFlow(f => ({ ...f, payrollApproverRoles: next }));
                                    }}
                                />
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Transitions */}
            <Row className="g-3 mt-1">
                <Col>
                    <Card>
                        <Card.Header>Transitions</Card.Header>
                        <Card.Body style={{ overflow: "auto" }}>
                            {flow.stages.length < 2 ? (
                                <div className="text-muted">Add at least two stages to define transitions.</div>
                            ) : (
                                <>
                                    <Table bordered size="sm" responsive>
                                        <thead>
                                            <tr>
                                                <th>From \ To</th>
                                                {flow.stages.map((to) => <th key={to}>{to}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {flow.stages.map((from) => (
                                                <tr key={from}>
                                                    <td className="fw-semibold">{from}</td>
                                                    {flow.stages.map((to) => {
                                                        const active = (flow.transitions[from] || []).some(r => r.to === to);
                                                        return (
                                                            <td key={`${from}-${to}`} className="text-center">
                                                                <Form.Check
                                                                    type="checkbox"
                                                                    disabled={from === to}
                                                                    checked={from === to ? false : active}
                                                                    onChange={() => toggleTransition(from, to)}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>

                                    {/* Per-transition roles */}
                                    <div className="mt-3">
                                        <div className="fw-semibold mb-2">Who can move?</div>
                                        {flow.stages.map((from) => (
                                            <div key={`${from}-roles`}>
                                                {(flow.transitions[from] || []).map((rule) => (
                                                    <div key={`${from}->${rule.to}`} className="mb-2">
                                                        <div className="mb-1">
                                                            <Badge bg="secondary">{from}</Badge>{" "}
                                                            <span className="mx-1">→</span>
                                                            <Badge bg="secondary">{rule.to}</Badge>
                                                        </div>
                                                        {roles.length === 0 ? (
                                                            <div className="text-muted">No roles to assign.</div>
                                                        ) : roles.map((r) => (
                                                            <Form.Check
                                                                key={`${from}-${rule.to}-${r}`}
                                                                inline
                                                                type="checkbox"
                                                                label={r}
                                                                checked={(rule.roles || []).includes(r)}
                                                                onChange={() => toggleTransitionRole(from, rule.to, r)}
                                                            />
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Validation + Save */}
            <Row className="g-3 mt-1">
                <Col lg={8}>
                    <Card>
                        <Card.Header>Validation</Card.Header>
                        <Card.Body>
                            {validation.valid ? (
                                <div className="text-success">Looks good ✅</div>
                            ) : (
                                <ul className="mb-0">
                                    {validation.errors.map((e) => <li key={e} className="text-danger">{e}</li>)}
                                </ul>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card>
                        <Card.Header>Save</Card.Header>
                        <Card.Body className="d-flex gap-2">
                            <Button onClick={save} disabled={saving}>
                                {saving ? "Saving…" : "Save workflow"}
=======
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
>>>>>>> Stashed changes
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
                        <label className="fw-bold mb-2">Available Roles</label>
                        <div className="d-flex gap-2 mb-2">
                            <Form.Control
                                size="sm"
                                placeholder="Add new role..."
                                id="new-role-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.target.value.trim();
                                        if (val && !roles.includes(val)) {
                                            setRoles([...roles, val]);
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                            <Button size="sm" variant="outline-primary" onClick={() => {
                                const input = document.getElementById('new-role-input');
                                const val = input.value.trim();
                                if (val && !roles.includes(val)) {
                                    setRoles([...roles, val]);
                                    input.value = '';
                                }
                            }}>Add</Button>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {roles.map(r => (
                                <Badge key={r} bg="secondary" className="d-flex align-items-center gap-1">
                                    {r}
                                    {/* Allow deleting role if not strictly used? For now just allow removing from list to clean up view */}
                                    <span
                                        style={{ cursor: 'pointer', opacity: 0.7 }}
                                        onClick={() => {
                                            if (window.confirm(`Remove role "${r}" from this view? (It will reappear if used in backend)`)) {
                                                setRoles(roles.filter(x => x !== r));
                                            }
                                        }}
                                    >×</span>
                                </Badge>
                            ))}
                            {roles.length === 0 && <small className="text-muted">No roles found.</small>}
                        </div>
                        <Form.Text muted>
                            Add roles here to make them available for assignment in stages.
                        </Form.Text>
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
