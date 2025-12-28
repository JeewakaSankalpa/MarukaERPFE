// src/components/admin/WorkflowBuilder.js
import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Button, Form, Table, Badge, Modal } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../api/api";

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
};

export default function WorkflowBuilder() {
    const [flow, setFlow] = useState(emptyFlow);

    // From backend
    const [roles, setRoles] = useState([]);         // GET /api/roles
    const [allStages, setAllStages] = useState([]); // GET /api/workflow/stages

    // Local UI states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [newRoleName, setNewRoleName] = useState("");

    // Visibility Modal State
    const [visModal, setVisModal] = useState({ show: false, stage: null, component: null });

    useEffect(() => {
        (async () => {
            let toastId;
            try {
                setLoading(true);
                toastId = toast.loading("Loading workflow…");
                const [wfRes, stagesRes, rolesRes] = await Promise.all([
                    api.get("/workflow").catch(() => ({ data: null })),
                    api.get("/workflow/stages").catch(() => ({ data: [] })),
                    api.get("/roles").catch(() => ({ data: ["ADMIN", "APPROVER", "SALES", "MANAGER"] })),
                ]);

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
                setRoles(rolesRes.data || []);
                toast.update(toastId, { render: "Workflow loaded", type: "success", isLoading: false, autoClose: 1200 });
            } catch (e) {
                console.error(e);
                if (toastId) toast.update(toastId, { render: "Failed to load workflow", type: "error", isLoading: false, autoClose: 2500 });
                setFlow(emptyFlow);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // --- Stage management (within the flow) ---
    const addStage = () => {
        const key = normalizeKey(newStageName);
        if (!key) return;
        if (flow.stages.includes(key)) {
            toast.warn("Stage already exists in the flow");
            return;
        }
        const stages = [...flow.stages, key];
        const requiredApprovals = { ...flow.requiredApprovals, [key]: [] };
        const transitions = { ...flow.transitions, [key]: [] };
        const stageRevisions = { ...flow.stageRevisions, [key]: false }; // default: false?
        setFlow((f) => ({
            ...f,
            stages,
            requiredApprovals,
            transitions,
            stageRevisions,
            initialStage: f.initialStage || key,
        }));
        setNewStageName("");
        if (!allStages.includes(key)) {
            setAllStages((prev) => [...prev, key]); // optional: reflect new stage globally too
        }
    };

    const removeStage = (key) => {
        const stages = flow.stages.filter((s) => s !== key);
        const { [key]: _a, ...restApprovals } = flow.requiredApprovals;
        const { [key]: _b, ...restTransitions } = flow.transitions;
        const { [key]: _c, ...restRevisions } = flow.stageRevisions || {};

        // Remove transitions TO this stage as well
        const cleanedTransitions = Object.fromEntries(
            Object.entries(restTransitions).map(([from, rules]) => [
                from,
                (rules || []).filter((r) => r.to !== key),
            ])
        );

        setFlow((f) => ({
            ...f,
            stages,
            requiredApprovals: restApprovals,
            transitions: cleanedTransitions,
            stageRevisions: restRevisions,
            initialStage: f.initialStage === key ? (stages[0] || "") : f.initialStage,
        }));
    };

    const moveStageUp = (idx) => {
        if (idx <= 0) return;
        const stages = [...flow.stages];
        [stages[idx - 1], stages[idx]] = [stages[idx], stages[idx - 1]];
        setFlow((f) => ({ ...f, stages }));
    };
    const moveStageDown = (idx) => {
        if (idx >= flow.stages.length - 1) return;
        const stages = [...flow.stages];
        [stages[idx + 1], stages[idx]] = [stages[idx], stages[idx + 1]];
        setFlow((f) => ({ ...f, stages }));
    };

    // --- Approvals per stage ---
    const toggleRequiredRole = (stage, role) => {
        const current = flow.requiredApprovals[stage] || [];
        const next = current.includes(role)
            ? current.filter((r) => r !== role)
            : [...current, role];
        setFlow((f) => ({
            ...f,
            requiredApprovals: { ...f.requiredApprovals, [stage]: next },
        }));
    };

    // --- Transitions & transition roles ---
    const toggleTransition = (from, to) => {
        if (from === to) return; // no self transition
        const rules = flow.transitions[from] || [];
        const exists = rules.find((r) => r.to === to);
        const next = exists ? rules.filter((r) => r.to !== to) : [...rules, { to, roles: [] }];
        setFlow((f) => ({ ...f, transitions: { ...f.transitions, [from]: next } }));
    };

    const toggleTransitionRole = (from, to, role) => {
        const rules = flow.transitions[from] || [];
        const idx = rules.findIndex((r) => r.to === to);
        if (idx === -1) return;
        const r = rules[idx];
        const nextRoles = (r.roles || []).includes(role)
            ? r.roles.filter((x) => x !== role)
            : [...(r.roles || []), role];
        const next = [...rules];
        next[idx] = { ...r, roles: nextRoles };
        setFlow((f) => ({ ...f, transitions: { ...f.transitions, [from]: next } }));
    };

    // --- Role management (from backend) ---
    const addRole = async () => {
        const name = normalizeKey(newRoleName);
        if (!name) return;
        if (roles.includes(name)) {
            toast.info("Role already exists");
            return;
        }
        try {
            await api.post("/roles", { name });
            setRoles((r) => [...r, name]);
            toast.success("Role added");
            setNewRoleName("");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add role");
        }
    };
    // NEW helpers in WorkflowBuilder.js
    const emptyRule = { key: "", label: "", required: true, accept: "", minCount: 1, maxCount: undefined, pattern: "" };

    const addFileRule = (stage) => {
        const rules = (flow.fileRequirements?.[stage] || []).concat([{ ...emptyRule }]);
        setFlow(f => ({ ...f, fileRequirements: { ...(f.fileRequirements || {}), [stage]: rules } }));
    };

    const updateFileRule = (stage, idx, patch) => {
        const rules = [...(flow.fileRequirements?.[stage] || [])];
        rules[idx] = { ...rules[idx], ...patch };
        setFlow(f => ({ ...f, fileRequirements: { ...(f.fileRequirements || {}), [stage]: rules } }));
    };

    const removeFileRule = (stage, idx) => {
        const rules = [...(flow.fileRequirements?.[stage] || [])];
        rules.splice(idx, 1);
        setFlow(f => ({ ...f, fileRequirements: { ...(f.fileRequirements || {}), [stage]: rules } }));
    };

    const removeRole = async (name) => {
        try {
            await api.delete(`/roles/${encodeURIComponent(name)}`);
            setRoles((r) => r.filter((x) => x !== name));
            // Also scrub it from the flow (approvals + transitions)
            setFlow((f) => {
                const ra = Object.fromEntries(
                    (f.stages || []).map((s) => [
                        s,
                        (f.requiredApprovals?.[s] || []).filter((r) => r !== name),
                    ])
                );
                const tr = Object.fromEntries(
                    Object.entries(f.transitions || {}).map(([from, rules]) => [
                        from,
                        (rules || []).map((rule) => ({
                            ...rule,
                            roles: (rule.roles || []).filter((r) => r !== name),
                        })),
                    ])
                );
                return { ...f, requiredApprovals: ra, transitions: tr };
            });
            toast.success("Role removed");
        } catch (e) {
            console.error(e);
            toast.error("Failed to remove role");
        }
    };

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
        } finally {
            setSaving(false);
        }
    };


    return (
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
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Row className="g-3 mt-1">
                <Col>
                    <Card>
                        <Card.Header>Required Files per Stage</Card.Header>
                        <Card.Body>
                            {flow.stages.length === 0 ? (
                                <div className="text-muted">Add stages to configure file rules.</div>
                            ) : flow.stages.map((s) => (
                                <div key={s} className="mb-3 border rounded p-2">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="fw-semibold">{s}</div>
                                        <Button size="sm" onClick={() => addFileRule(s)}>Add file rule</Button>
                                    </div>

                                    {(flow.fileRequirements?.[s] || []).length === 0 ? (
                                        <div className="text-muted">No file rules.</div>
                                    ) : (
                                        <Table size="sm" bordered responsive className="mb-0">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 140 }}>Key</th>
                                                    <th>Label</th>
                                                    <th style={{ width: 100 }}>Required</th>
                                                    <th>Accept</th>
                                                    <th>Notify Roles</th>
                                                    <th style={{ width: '10%' }}>Allow Revisions</th>
                                                    <th style={{ width: 110 }}>Min</th>
                                                    <th style={{ width: 110 }}>Max</th>
                                                    <th>Pattern (regex)</th>
                                                    <th style={{ width: 90 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(flow.fileRequirements?.[s] || []).map((r, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            <Form.Control value={r.key || ""} onChange={e => updateFileRule(s, idx, { key: normalizeKey(e.target.value) })} />
                                                        </td>
                                                        <td>
                                                            <Form.Control value={r.label || ""} onChange={e => updateFileRule(s, idx, { label: e.target.value })} />
                                                        </td>
                                                        <td className="text-center">
                                                            <Form.Check type="checkbox" checked={!!r.required} onChange={e => updateFileRule(s, idx, { required: e.target.checked })} />
                                                        </td>
                                                        <td>
                                                            <Form.Control placeholder=".pdf,.png" value={r.accept || ""} onChange={e => updateFileRule(s, idx, { accept: e.target.value })} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" min={0} value={r.minCount ?? ""} onChange={e => updateFileRule(s, idx, { minCount: e.target.value === "" ? null : Number(e.target.value) })} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" min={0} value={r.maxCount ?? ""} onChange={e => updateFileRule(s, idx, { maxCount: e.target.value === "" ? null : Number(e.target.value) })} />
                                                        </td>
                                                        <td>
                                                            <Form.Control placeholder="optional regex" value={r.pattern || ""} onChange={e => updateFileRule(s, idx, { pattern: e.target.value })} />
                                                        </td>
                                                        <td className="text-center">
                                                            <Button size="sm" variant="outline-danger" onClick={() => removeFileRule(s, idx)}>Remove</Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* JSON Preview */}
            <Row className="g-3 mt-1">
                <Col>
                    <Card>
                        <Card.Header>JSON Preview</Card.Header>
                        <Card.Body>
                            <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                                {JSON.stringify(flow, null, 2)}
                            </pre>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Visibility Config Modal */}
            <Modal show={visModal.show} onHide={() => setVisModal({ ...visModal, show: false })} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Visibility: {visModal.stage} - {visModal.component}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {visModal.show && (() => {
                        const { stage, component } = visModal;
                        const rule = flow.visibility?.[stage] || {};
                        const visibleList = rule.fieldsVisible; // null means ALL default
                        const isAllDefault = !visibleList;
                        const isVisible = isAllDefault ? true : visibleList.includes(component);
                        const roleVis = rule.roleVisibility || {};

                        const toggleBase = () => {
                            const all = ["FILES", "PAYMENTS", "INVENTORY", "ESTIMATION", "TASKS", "REVISIONS", "DELIVERY", "TIMELINE"];
                            let nextList;
                            if (isAllDefault) {
                                // Default (All) -> Custom (All minus this one) -> logic: user unchecked "Everyone"
                                // If they uncheck "Everyone", it means "Hidden for Everyone" (unless role override)
                                nextList = all.filter(c => c !== component);
                            } else {
                                nextList = isVisible
                                    ? visibleList.filter(c => c !== component) // Hide
                                    : [...visibleList, component];             // Show
                            }
                            setFlow(f => ({
                                ...f,
                                visibility: {
                                    ...f.visibility,
                                    [stage]: { ...rule, fieldsVisible: nextList }
                                }
                            }));
                        };

                        const toggleRole = (r) => {
                            const currentRoleComps = roleVis[r] || [];
                            const hasAccess = currentRoleComps.includes(component);
                            const nextRoleComps = hasAccess
                                ? currentRoleComps.filter(c => c !== component)
                                : [...currentRoleComps, component];

                            setFlow(f => ({
                                ...f,
                                visibility: {
                                    ...f.visibility,
                                    [stage]: {
                                        ...rule,
                                        roleVisibility: { ...roleVis, [r]: nextRoleComps }
                                    }
                                }
                            }));
                        };

                        return (
                            <div>
                                <Form.Group className="mb-3 border-bottom pb-3">
                                    <Form.Check
                                        type="switch"
                                        id="base-vis-switch"
                                        label={<strong>Visible to Everyone</strong>}
                                        checked={isVisible}
                                        onChange={toggleBase}
                                    />
                                    <Form.Text className="text-muted">
                                        If disabled, this component will be hidden by default. You can grant access to specific roles below.
                                    </Form.Text>
                                </Form.Group>

                                {!isVisible && (
                                    <div>
                                        <h6>Role Overrides</h6>
                                        <p className="small text-muted">Select roles that should still see this component:</p>
                                        <div className="d-flex flex-wrap gap-2">
                                            {roles.length === 0 ? <em className="text-muted">No roles defined.</em> : roles.map(r => {
                                                const hasAccess = (roleVis[r] || []).includes(component);
                                                return (
                                                    <Button
                                                        key={r}
                                                        size="sm"
                                                        variant={hasAccess ? "success" : "outline-secondary"}
                                                        onClick={() => toggleRole(r)}
                                                        className="d-flex align-items-center gap-2"
                                                    >
                                                        {r}
                                                        {hasAccess && <span>✓</span>}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {isVisible && (
                                    <div className="alert alert-light border">
                                        Since "Everyone" has access, role-based overrides are not applicable.
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setVisModal({ ...visModal, show: false })}>Close</Button>
                </Modal.Footer>
            </Modal>

            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
        </div >
    );
}
