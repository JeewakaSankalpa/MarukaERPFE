import React, { useState } from 'react';
import { Card, Form, Accordion, Badge, Button, ListGroup, Modal, Table } from 'react-bootstrap';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { PROJECT_COMPONENTS } from '../Project/ComponentRegistry';

export default function StagePropertyPanel({
    stage,
    flow,
    roles,
    allStages,
    onUpdateFlow,
    onClose,
    onRemoveStage
}) {
    // stage: string (Stage Key)
    // flow: current workflow object
    // onUpdateFlow: (newFlow) => void

    const [showVisibilityModal, setShowVisibilityModal] = useState(false);

    if (!stage) return <div className="p-3 text-muted">Select a stage to edit properties.</div>;

    const approvals = flow.requiredApprovals?.[stage] || [];
    const notifications = flow.notifications?.[stage] || [];
    const isInitial = flow.initialStage === stage;
    const fileRules = flow.fileRequirements?.[stage] || [];

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

    // File Rules Logic
    const addFileRule = () => {
        const rules = [...fileRules, { key: "", label: "New Doc", required: true }];
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


    return (
        <Card className="h-100 border-start border-0 rounded-0" style={{ width: '320px', overflowY: 'auto' }}>
            <Card.Header className="d-flex justify-content-between align-items-center bg-white">
                <h6 className="m-0 text-truncate" title={stage}>{stage}</h6>
                <Button variant="close" size="sm" onClick={onClose} />
            </Card.Header>
            <Card.Body className="p-0">
                <Accordion defaultActiveKey="0" flush alwaysOpen>

                    {/* General Settings */}
                    <Accordion.Item eventKey="0">
                        <Accordion.Header>General</Accordion.Header>
                        <Accordion.Body>
                            <Form.Check
                                type="switch"
                                label="Initial Stage"
                                checked={isInitial}
                                disabled={isInitial} // Cannot uncheck, must set another as initial
                                onChange={() => onUpdateFlow({ ...flow, initialStage: stage })}
                            />
                            {!isInitial && (
                                <div className="mt-3">
                                    <Button variant="outline-danger" size="sm" className="w-100" onClick={() => onRemoveStage(stage)}>
                                        <Trash2 size={14} className="me-2" /> Delete Stage
                                    </Button>
                                </div>
                            )}
                        </Accordion.Body>
                    </Accordion.Item>

                    {/* Approvals */}
                    <Accordion.Item eventKey="1">
                        <Accordion.Header>Required Approvals</Accordion.Header>
                        <Accordion.Body>
                            {roles.length === 0 ? <small className="text-muted">No roles defined.</small> : (
                                <div className="d-flex flex-wrap gap-2">
                                    {roles.map(r => (
                                        <Badge
                                            key={r}
                                            bg={approvals.includes(r) ? 'primary' : 'light'}
                                            text={approvals.includes(r) ? 'white' : 'dark'}
                                            className="cursor-pointer border"
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => toggleApproval(r)}
                                        >
                                            {r}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </Accordion.Body>
                    </Accordion.Item>

                    {/* Notifications */}
                    <Accordion.Item eventKey="2">
                        <Accordion.Header>Notifications</Accordion.Header>
                        <Accordion.Body>
                            <Form.Text muted>Notify these roles when entering this stage.</Form.Text>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                                {roles.map(r => (
                                    <Badge
                                        key={r}
                                        bg={notifications.includes(r) ? 'info' : 'light'}
                                        text={notifications.includes(r) ? 'white' : 'dark'}
                                        className="cursor-pointer border"
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => toggleNotification(r)}
                                    >
                                        {r}
                                    </Badge>
                                ))}
                            </div>
                        </Accordion.Body>
                    </Accordion.Item>

                    {/* Documents */}
                    <Accordion.Item eventKey="3">
                        <Accordion.Header>Required Documents ({fileRules.length})</Accordion.Header>
                        <Accordion.Body className="p-2">
                            <Button size="sm" variant="outline-primary" className="w-100 mb-2" onClick={addFileRule}>+ Add Document Rule</Button>
                            {fileRules.map((rule, i) => (
                                <Card key={i} className="mb-2 bg-light border-0">
                                    <Card.Body className="p-2">
                                        <div className="mb-2">
                                            <Form.Control
                                                size="sm"
                                                placeholder="Doc Name (e.g. BOQ)"
                                                value={rule.label}
                                                onChange={e => updateFileRule(i, { label: e.target.value })}
                                                className="mb-1 fw-bold"
                                            />
                                            <Form.Control
                                                size="sm"
                                                placeholder="Allowed Types (e.g. .pdf,.jpg)"
                                                value={rule.accept || ''}
                                                onChange={e => updateFileRule(i, { accept: e.target.value })}
                                                style={{ fontSize: '0.85em' }}
                                            />
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <Form.Check
                                                type="switch"
                                                label="Required"
                                                style={{ fontSize: '0.8rem' }}
                                                checked={rule.required}
                                                onChange={e => updateFileRule(i, { required: e.target.checked })}
                                            />
                                            <Button variant="link" className="text-danger p-0 opacity-50 hover-opacity-100" size="sm" onClick={() => removeFileRule(i)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            ))}
                        </Accordion.Body>
                    </Accordion.Item>

                    {/* Component Visibility */}
                    <Accordion.Item eventKey="4">
                        <Accordion.Header>Visible Components</Accordion.Header>
                        <Accordion.Body className="p-3 text-center">
                            <div className="small text-muted mb-2">
                                Configure which cards are visible to everyone or specific roles in this stage.
                            </div>
                            <Button variant="outline-primary" size="sm" onClick={() => setShowVisibilityModal(true)}>
                                Configure Visibility
                            </Button>
                        </Accordion.Body>
                    </Accordion.Item>

                </Accordion>
            </Card.Body>

            {/* Visibility Matrix Modal */}
            <Modal show={showVisibilityModal} onHide={() => setShowVisibilityModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Component Visibility: {stage}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted">
                        Check "Everyone" to make a component visible to all users in this stage.<br />
                        If "Everyone" is unchecked, choose specific roles to grant visibility.
                    </p>
                    <div className="table-responsive">
                        <Table bordered hover size="sm" className="small">
                            <thead className="bg-light">
                                <tr>
                                    <th style={{ minWidth: 150 }}>Component</th>
                                    <th className="text-center" style={{ width: 80 }}>Everyone</th>
                                    {roles.map(r => (
                                        <th key={r} className="text-center" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>{r}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {PROJECT_COMPONENTS.map(comp => {
                                    const rule = flow.visibility?.[stage] || {};

                                    // "Everyone" logic: Is it in the base list?
                                    // Note: If no rule exists at all, backend default applies (usually ALL).
                                    // But here we are editing explicit rules. 
                                    // If rule is totally missing, we assume "Everyone" is checked for ALL components to match default behavior.
                                    const isGlobalRule = flow.visibility?.[stage] === undefined;
                                    const currentGlobalList = rule.visibleComponents || (isGlobalRule ? PROJECT_COMPONENTS.map(c => c.id) : []);

                                    const isVisibleAll = currentGlobalList.includes(comp.id);

                                    return (
                                        <tr key={comp.id}>
                                            <td className="fw-bold">{comp.label}</td>
                                            <td className="text-center bg-light">
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={isVisibleAll}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        let nextGlobal = [...currentGlobalList];
                                                        if (checked) nextGlobal.push(comp.id);
                                                        else nextGlobal = nextGlobal.filter(id => id !== comp.id);

                                                        // Update Flow
                                                        onUpdateFlow({
                                                            ...flow,
                                                            visibility: {
                                                                ...flow.visibility,
                                                                [stage]: {
                                                                    ...rule,
                                                                    visibleComponents: nextGlobal
                                                                }
                                                            }
                                                        });
                                                    }}
                                                />
                                            </td>
                                            {roles.map(r => {
                                                const roleMap = rule.roleVisibility || {};
                                                const roleList = roleMap[r] || [];
                                                const isVisibleRole = roleList.includes(comp.id);
                                                const effectiveVisible = isVisibleAll || isVisibleRole;

                                                return (
                                                    <td key={r} className="text-center">
                                                        <Form.Check
                                                            type="checkbox"
                                                            disabled={isVisibleAll} // If global, role is redundant
                                                            checked={effectiveVisible}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                // We modify roleVisibility map
                                                                const nextRoleList = checked
                                                                    ? [...roleList, comp.id]
                                                                    : roleList.filter(id => id !== comp.id);

                                                                onUpdateFlow({
                                                                    ...flow,
                                                                    visibility: {
                                                                        ...flow.visibility,
                                                                        [stage]: {
                                                                            ...rule,
                                                                            roleVisibility: {
                                                                                ...roleMap,
                                                                                [r]: nextRoleList
                                                                            }
                                                                        }
                                                                    }
                                                                });
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
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowVisibilityModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
}
