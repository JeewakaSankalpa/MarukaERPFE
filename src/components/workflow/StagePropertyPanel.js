import React, { useState } from 'react';
import { Card, Form, Accordion, Badge, Button, Modal, Table } from 'react-bootstrap';
import { Trash2 } from 'lucide-react';
import { PROJECT_COMPONENTS } from '../Project/ComponentRegistry';

const ALWAYS_VISIBLE_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function StagePropertyPanel({
    stage,
    flow,
    roles,
    onUpdateFlow,
    onClose,
    onRemoveStage
}) {
    const [checkingUsage, setCheckingUsage] = useState(false);
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);

    if (!stage) return <div className="p-3 text-muted">Select a stage to edit properties.</div>;

    const approvals = flow.requiredApprovals?.[stage] || [];
    const notifications = flow.notifications?.[stage] || [];
    const isInitial = flow.initialStage === stage;
    const fileRules = flow.fileRequirements?.[stage] || [];
    const visibilityRoles = Array.from(new Set([...ALWAYS_VISIBLE_ROLES, ...(roles || [])]));

    const toggleApproval = (role) => {
        const next = approvals.includes(role)
            ? approvals.filter(r => r !== role)
            : [...approvals, role];
        onUpdateFlow({
            ...flow,
            requiredApprovals: { ...flow.requiredApprovals, [stage]: next }
        });
    };

    const toggleNotification = (role) => {
        const next = notifications.includes(role)
            ? notifications.filter(r => r !== role)
            : [...notifications, role];
        onUpdateFlow({
            ...flow,
            notifications: { ...flow.notifications, [stage]: next }
        });
    };

    const normalizeKey = (s) => s.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_");

    const addFileRule = () => {
        const nextNumber = fileRules.filter(rule => (rule.key || "").startsWith("NEW_DOC")).length + 1;
        const suffix = nextNumber === 1 ? "" : ` ${nextNumber}`;
        const rules = [...fileRules, { key: `NEW_DOC_${Date.now()}`, label: `New Doc${suffix}`, required: true }];
        onUpdateFlow({
            ...flow,
            fileRequirements: { ...(flow.fileRequirements || {}), [stage]: rules }
        });
    };

    const updateFileRule = (idx, patch) => {
        const rules = [...fileRules];
        rules[idx] = { ...rules[idx], ...patch };
        onUpdateFlow({
            ...flow,
            fileRequirements: { ...(flow.fileRequirements || {}), [stage]: rules }
        });
    };

    const removeFileRule = (idx) => {
        const rules = fileRules.filter((_, i) => i !== idx);
        onUpdateFlow({
            ...flow,
            fileRequirements: { ...(flow.fileRequirements || {}), [stage]: rules }
        });
    };

    const checkUsage = async (stageVal) => {
        try {
            const res = await fetch(`/api/workflow/usage/${stageVal}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return res.ok ? await res.json() : 0;
        } catch (e) { return 0; }
    };

    const handleDeleteClick = async () => {
        setCheckingUsage(true);
        const count = await checkUsage(stage);
        setCheckingUsage(false);
        let msg = `Are you sure you want to delete stage "${stage}"?`;
        if (count > 0) msg = `WARNING: This stage is used by ${count} projects!\n\n${msg}`;
        if (window.confirm(msg)) onRemoveStage(stage);
    };

    return (
        <Card className="h-100 border-start border-0 rounded-0" style={{ width: '320px', overflowY: 'auto' }}>
            <Card.Header className="d-flex justify-content-between align-items-center bg-white">
                <h6 className="m-0 text-truncate" title={stage}>{stage}</h6>
                <Button variant="close" size="sm" onClick={onClose} />
            </Card.Header>
            <Card.Body className="p-0">
                <Accordion defaultActiveKey="0" flush alwaysOpen>
                    <Accordion.Item eventKey="0">
                        <Accordion.Header>General</Accordion.Header>
                        <Accordion.Body>
                            <Form.Check
                                type="switch"
                                label="Initial Stage"
                                checked={isInitial}
                                disabled={isInitial}
                                onChange={() => onUpdateFlow({ ...flow, initialStage: stage })}
                            />
                            {!isInitial && (
                                <div className="mt-3">
                                    <Button variant="outline-danger" size="sm" className="w-100" onClick={handleDeleteClick} disabled={checkingUsage}>
                                        <Trash2 size={14} className="me-2" />
                                        {checkingUsage ? "Checking..." : "Delete Stage"}
                                    </Button>
                                </div>
                            )}
                        </Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="1">
                        <Accordion.Header>Required Approvals</Accordion.Header>
                        <Accordion.Body>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                {roles.map(r => (
                                    <Badge
                                        key={r}
                                        bg={approvals.includes(r) ? 'primary' : 'light'}
                                        text={approvals.includes(r) ? 'white' : 'dark'}
                                        className="border cursor-pointer"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => toggleApproval(r)}
                                    >
                                        {r}
                                    </Badge>
                                ))}
                            </div>
                            <Form.Group className="mt-2 pt-2 border-top">
                                <Form.Label className="small fw-bold">Min Approvals Required</Form.Label>
                                <Form.Control 
                                    type="number" size="sm" min={0} max={approvals.length}
                                    value={flow.minimumApprovals?.[stage] || 0}
                                    onChange={(e) => onUpdateFlow({
                                        ...flow,
                                        minimumApprovals: { ...flow.minimumApprovals, [stage]: parseInt(e.target.value) || 0 }
                                    })}
                                />
                                <Form.Text className="text-muted small">0 = Require ALL selected roles.</Form.Text>
                            </Form.Group>
                        </Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="2">
                        <Accordion.Header>Notifications</Accordion.Header>
                        <Accordion.Body>
                            <div className="d-flex flex-wrap gap-2">
                                {roles.map(r => (
                                    <Badge
                                        key={r}
                                        bg={notifications.includes(r) ? 'info' : 'light'}
                                        text={notifications.includes(r) ? 'white' : 'dark'}
                                        className="border cursor-pointer"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => toggleNotification(r)}
                                    >
                                        {r}
                                    </Badge>
                                ))}
                            </div>
                        </Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="3">
                        <Accordion.Header>Required Documents ({fileRules.length})</Accordion.Header>
                        <Accordion.Body className="p-2">
                            <Button size="sm" variant="outline-primary" className="w-100 mb-2" onClick={addFileRule}>+ Add Rule</Button>
                            {fileRules.map((rule, i) => (
                                <Card key={i} className="mb-2 bg-light border-0">
                                    <Card.Body className="p-2">
                                        <Form.Control
                                            size="sm" value={rule.label}
                                            onChange={e => updateFileRule(i, { label: e.target.value, key: normalizeKey(e.target.value) })}
                                            className="mb-1 fw-bold"
                                        />
                                        <div className="d-flex justify-content-between align-items-center">
                                            <Form.Check 
                                                type="switch" label="Required" size="sm" checked={rule.required}
                                                onChange={e => updateFileRule(i, { required: e.target.checked })}
                                            />
                                            <Button variant="link" className="text-danger p-0" onClick={() => removeFileRule(i)}><Trash2 size={14}/></Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            ))}
                        </Accordion.Body>
                    </Accordion.Item>

                    <Accordion.Item eventKey="4">
                        <Accordion.Header>Visibility</Accordion.Header>
                        <Accordion.Body className="text-center">
                            <Button variant="outline-primary" size="sm" onClick={() => setShowVisibilityModal(true)}>Configure Visibility</Button>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            </Card.Body>

            <Modal
                show={showVisibilityModal}
                onHide={() => setShowVisibilityModal(false)}
                size="xl"
                centered
                dialogClassName="workflow-visibility-dialog"
                contentClassName="workflow-visibility-content"
            >
                <Modal.Header closeButton><Modal.Title>Visibility Matrix: {stage}</Modal.Title></Modal.Header>
                <Modal.Body className="workflow-visibility-body">
                    <div className="workflow-visibility-table-wrap">
                    <Table bordered hover size="sm" className="small workflow-visibility-table">
                        <thead>
                            <tr>
                                <th className="workflow-visibility-component-col">Component</th>
                                <th className="workflow-visibility-check-col">Everyone</th>
                                {visibilityRoles.map(r => <th key={r} className="workflow-visibility-role-col">{r}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {PROJECT_COMPONENTS.map(comp => {
                                const rule = flow.visibility?.[stage] || {};
                                const isGlobalList = rule.visibleComponents || PROJECT_COMPONENTS.map(c => c.id);
                                const isVisibleAll = isGlobalList.includes(comp.id);
                                return (
                                    <tr key={comp.id}>
                                        <td className="workflow-visibility-component-col">{comp.label}</td>
                                        <td className="workflow-visibility-check-cell">
                                            <Form.Check 
                                                type="checkbox" checked={isVisibleAll}
                                                onChange={(e) => {
                                                    const nextList = e.target.checked
                                                        ? Array.from(new Set([...isGlobalList, comp.id]))
                                                        : isGlobalList.filter(id => id !== comp.id);
                                                    onUpdateFlow({ ...flow, visibility: { ...flow.visibility, [stage]: { ...rule, visibleComponents: nextList } } });
                                                }}
                                            />
                                        </td>
                                        {visibilityRoles.map(r => {
                                            const isAlwaysVisibleRole = ALWAYS_VISIBLE_ROLES.includes(String(r || "").toUpperCase());
                                            const roleMap = rule.roleVisibility || {};
                                            const existingRoleKey = Object.keys(roleMap).find(key => key.toUpperCase() === String(r || "").toUpperCase());
                                            const roleList = roleMap[existingRoleKey || r] || [];
                                            return (
                                                <td key={r} className="workflow-visibility-check-cell">
                                                    <Form.Check 
                                                        type="checkbox"
                                                        disabled={isVisibleAll || isAlwaysVisibleRole}
                                                        checked={isAlwaysVisibleRole || isVisibleAll || roleList.includes(comp.id)}
                                                        onChange={(e) => {
                                                            const nextRoleList = e.target.checked
                                                                ? Array.from(new Set([...roleList, comp.id]))
                                                                : roleList.filter(id => id !== comp.id);
                                                            const nextRoleMap = { ...roleMap };
                                                            if (existingRoleKey && existingRoleKey !== r) {
                                                                delete nextRoleMap[existingRoleKey];
                                                            }
                                                            nextRoleMap[r] = nextRoleList;
                                                            onUpdateFlow({ ...flow, visibility: { ...flow.visibility, [stage]: { ...rule, roleVisibility: nextRoleMap } } });
                                                        }}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                    </div>
                </Modal.Body>
            </Modal>
        </Card>
    );
}
