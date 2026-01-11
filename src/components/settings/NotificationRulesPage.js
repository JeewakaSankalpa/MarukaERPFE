
import React, { useEffect, useState } from 'react';
import { Container, Table, Form, Button, Card, Badge, Accordion, Row, Col } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { MenuConfig } from '../../resources/MenuConfig';

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
            setRules(res.data);
        } catch (err) {
            toast.error("Failed to load rules");
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const res = await api.get('/employee/list');
            setEmployees(res.data);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };

    const toggleModule = (ruleId, moduleId) => {
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;

        const currentModules = rule.targetModuleAccess || [];
        const newModules = currentModules.includes(moduleId)
            ? currentModules.filter(m => m !== moduleId)
            : [...currentModules, moduleId];

        updateRule(ruleId, { ...rule, targetModuleAccess: newModules });
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

    const toggleChannel = (ruleId, channel) => {
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;

        const newChannels = rule.channels.includes(channel)
            ? rule.channels.filter(c => c !== channel)
            : [...rule.channels, channel];

        updateRule(ruleId, { ...rule, channels: newChannels });
    };

    const updateRule = async (id, updatedData) => {
        // Optimistic UI update
        setRules(rules.map(r => r.id === id ? updatedData : r));

        try {
            await api.put(`/notification-rules/${id}`, updatedData);
        } catch (err) {
            toast.error("Update failed");
            loadRules(); // Revert
        }
    };

    const CHANNELS = ["EMAIL", "IN_APP"];

    // Flatten MenuConfig for easier selection
    const ALL_MODULES = [];
    MenuConfig.forEach(group => {
        if (group.path) ALL_MODULES.push({ id: group.id, title: `${group.title} (Main)` });
        if (group.subItems) {
            group.subItems.forEach(sub => {
                ALL_MODULES.push({ id: sub.id, title: `${group.title} > ${sub.title}` });
            });
        }
    });

    // Filter employees for search
    const filteredEmployees = employees.filter(e =>
        (e.firstName + " " + e.lastName).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container className="py-3">
            <h3>Notification Rules Manager (Admin)</h3>
            <p className="text-muted">Configure notification routing via Module Access OR Specific Employees.</p>

            <Form.Group className="mb-3">
                <Form.Control
                    type="text"
                    placeholder="Search employees for selection..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </Form.Group>

            <Card>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>Event Type</th>
                            <th style={{ width: '30%' }}>Target Modules</th>
                            <th style={{ width: '30%' }}>Target Employees</th>
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
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        {ALL_MODULES.map(mod => (
                                            <Form.Check
                                                key={mod.id}
                                                type="checkbox"
                                                label={mod.title}
                                                checked={(rule.targetModuleAccess || []).includes(mod.id)}
                                                onChange={() => toggleModule(rule.id, mod.id)}
                                                style={{ fontSize: '0.9em' }}
                                            />
                                        ))}
                                    </div>
                                    <small className="text-muted">
                                        Selected: {(rule.targetModuleAccess || []).length}
                                    </small>
                                </td>
                                <td>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
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
