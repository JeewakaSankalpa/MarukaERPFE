import React, { useState } from 'react';
import { Card, Form, Accordion, Badge, Button } from 'react-bootstrap';
import { Trash2 } from 'lucide-react';

export default function TransitionPropertyPanel({
    edgeId, // "FROM->TO"
    flow,
    roles,
    onUpdateFlow,
    onClose,
    onRemoveEdge
}) {
    if (!edgeId) return null;

    const [source, target] = edgeId.split('->');
    if (!source || !target) return null;

    const transitionList = flow.transitions?.[source] || [];
    const ruleIndex = transitionList.findIndex(r => r.to === target);
    const rule = ruleIndex !== -1 ? transitionList[ruleIndex] : null;

    if (!rule) return <div className="p-3 text-muted">Transition not found.</div>;

    const currentRoles = rule.roles || [];

    const toggleRole = (role) => {
        const nextRoles = currentRoles.includes(role)
            ? currentRoles.filter(r => r !== role)
            : [...currentRoles, role];

        // Update specific rule
        const updatedList = [...transitionList];
        updatedList[ruleIndex] = { ...rule, roles: nextRoles };

        onUpdateFlow({
            ...flow,
            transitions: { ...flow.transitions, [source]: updatedList }
        });
    };

    return (
        <Card className="h-100 border-start border-0 rounded-0" style={{ width: '320px', overflowY: 'auto' }}>
            <Card.Header className="d-flex justify-content-between align-items-center bg-white">
                <div>
                    <span className="text-muted small">Transition</span>
                    <h6 className="m-0 text-truncate" style={{ maxWidth: '200px' }}>
                        {source} → {target}
                    </h6>
                </div>
                <Button variant="close" size="sm" onClick={onClose} />
            </Card.Header>
            <Card.Body>
                <div className="mb-4">
                    <label className="fw-bold mb-2 small">Permitted Roles</label>
                    <div className="text-muted small mb-2">
                        Who can trigger this move? (Empty = Any authorized user)
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {roles.map(r => (
                            <Badge
                                key={r}
                                bg={currentRoles.includes(r) ? 'warning' : 'light'}
                                text={currentRoles.includes(r) ? 'dark' : 'dark'}
                                className="cursor-pointer border"
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => toggleRole(r)}
                            >
                                {r}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="border-top pt-3">
                    <Button variant="outline-danger" size="sm" className="w-100" onClick={() => onRemoveEdge(edgeId)}>
                        <Trash2 size={14} className="me-2" /> Delete Connection
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
}
