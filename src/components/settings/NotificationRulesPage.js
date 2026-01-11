import React, { useEffect, useState } from 'react';
import { Container, Table, Form, Button, Card, Badge, Accordion, Row, Col } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';


export default function NotificationRulesPage() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadRules();
        loadEmployees();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notification-rules');
            setRules(res.data || []);
        } catch (err) {
            toast.error("Failed to load rules");
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const res = await api.get('/employee/all');
            setEmployees(res.data || []);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };



    const toggleEmployee = (ruleId, empId) => {
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;

        const currentEmps = rule.targetEmployeeIds || [];
        const newEmps = currentEmps.includes(empId)
            ? currentEmps.filter(e => e !== empId)
            : [...currentEmps, empId];

        updateRule(ruleId, { ...rule, targetEmployeeIds: newEmps });
    };

    const selectAllFiltered = (ruleId) => {
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;

        const currentEmps = new Set(rule.targetEmployeeIds || []);
        filteredEmployees.forEach(e => currentEmps.add(e.id));

        updateRule(ruleId, { ...rule, targetEmployeeIds: Array.from(currentEmps) });
    };

    const clearAllFiltered = (ruleId) => {
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;

        const currentEmps = new Set(rule.targetEmployeeIds || []);
        filteredEmployees.forEach(e => currentEmps.delete(e.id));

        updateRule(ruleId, { ...rule, targetEmployeeIds: Array.from(currentEmps) });
    };

    const toggleChannel = (ruleId, channel) => {
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;

        const channels = rule.channels || [];
        const newChannels = channels.includes(channel)
            ? channels.filter(c => c !== channel)
            : [...channels, channel];

        updateRule(ruleId, { ...rule, channels: newChannels });
    };

    const updateRule = async (id, updatedData) => {
        // Enforce WYSIWYG: Clear hidden fields that are not in the UI
        const payload = {
            ...updatedData,
            targetRoles: [],
            targetModuleAccess: []
        };

        // Optimistic UI update
        setRules(rules.map(r => r.id === id ? payload : r));

        try {
            await api.put(`/notification-rules/${id}`, payload);
        } catch (err) {
            toast.error("Update failed");
            loadRules(); // Revert
        }
    };

    const CHANNELS = ["EMAIL", "IN_APP"];

    // Filter employees for search
    const filteredEmployees = (employees || []).filter(e =>
        (e.firstName + " " + e.lastName).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container className="py-3">
            <h3>Notification Rules Manager (Admin)</h3>
            <p className="text-muted">Configure notification routing via Specific Employees.</p>

            <Form.Group className="mb-3">
                <Form.Control
                    type="text"
                    placeholder="Search employees for bulk selection..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </Form.Group>

            <Card>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>Event Type</th>
                            <th style={{ width: '50%' }}>Target Employees</th>
                            <th>Channels</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr key={rule.id}>
                                <td>
                                    <strong>{rule.eventType}</strong>
                                </td>
                                <td>
                                    <div className="d-flex gap-2 mb-2">
                                        <Button size="sm" variant="outline-primary" onClick={() => selectAllFiltered(rule.id)}>
                                            Select All (Filtered)
                                        </Button>
                                        <Button size="sm" variant="outline-secondary" onClick={() => clearAllFiltered(rule.id)}>
                                            Clear All (Filtered)
                                        </Button>
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {filteredEmployees.map(emp => (
                                            <Form.Check
                                                key={emp.id}
                                                type="checkbox"
                                                label={`${emp.firstName} ${emp.lastName}`}
                                                checked={(rule.targetEmployeeIds || []).includes(emp.id)}
                                                onChange={() => toggleEmployee(rule.id, emp.id)}
                                                style={{ fontSize: '0.9em' }}
                                            />
                                        ))}
                                    </div>
                                    <small className="text-muted">
                                        Selected: {(rule.targetEmployeeIds || []).length}
                                    </small>
                                </td>
                                <td>
                                    <div className="d-flex flex-column gap-2">
                                        {CHANNELS.map(ch => (
                                            <Form.Check
                                                key={ch}
                                                type="switch"
                                                label={ch}
                                                checked={rule.channels.includes(ch)}
                                                onChange={() => toggleChannel(rule.id, ch)}
                                            />
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <Form.Check
                                        type="switch"
                                        label={rule.enabled ? "Active" : "Disabled"}
                                        checked={rule.enabled}
                                        onChange={() => updateRule(rule.id, { ...rule, enabled: !rule.enabled })}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>
        </Container>
    );
}
