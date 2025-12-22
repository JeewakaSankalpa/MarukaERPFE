
import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Table, Tabs, Tab } from 'react-bootstrap';
import api from '../../api/api';

export default function SettingsPage() {
    const [settings, setSettings] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filtered lists
    const terms = libraryItems.filter(i => i.type === 'TERM');
    const notes = libraryItems.filter(i => i.type === 'NOTE');

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [sets, libs] = await Promise.all([
                api.get('/settings').then(r => r.data),
                api.get('/quote-library').then(r => r.data)
            ]);
            setSettings(sets);
            setLibraryItems(libs);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (key, val) => {
        const found = settings.find(s => s.key === key);
        if (found) {
            setSettings(settings.map(s => s.key === key ? { ...s, value: val } : s));
        } else {
            console.warn("Setting not found:", key);
            // Optional: Create if not exists logic, but usually fixed keys.
            // For now, we assume seed data or just pushing new obj if key is known.
            setSettings([...settings, { key, value: val }]);
        }
    };

    const saveSettings = async () => {
        try {
            await api.post('/settings', settings);
            alert('Settings saved!');
        } catch (err) {
            alert('Error saving settings');
        }
    };

    // Library CRUD
    const saveLibraryItem = async (item) => {
        if (!item.title || !item.content) return;
        try {
            await api.post('/quote-library', item);
            loadAll(); // Reload to get new ID/Updates
        } catch (err) {
            alert('Error saving library item');
        }
    };

    const deleteLibraryItem = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.delete(`/quote-library/${id}`);
            setLibraryItems(libraryItems.filter(i => i.id !== id));
        } catch (err) {
            alert('Error deleting item');
        }
    };

    // Sub-components for Library Tables
    const LibraryTable = ({ items, type }) => {
        const [newItem, setNewItem] = useState({ type, title: '', content: '' });

        const add = () => {
            saveLibraryItem(newItem);
            setNewItem({ type, title: '', content: '' });
        };

        return (
            <div className="mt-3">
                <Table bordered size="sm">
                    <thead>
                        <tr>
                            <th>Title / Label</th>
                            <th>Content / Value</th>
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id}>
                                <td>{item.title}</td>
                                <td>
                                    <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{item.content}</pre>
                                </td>
                                <td>
                                    <Button size="sm" variant="danger" onClick={() => deleteLibraryItem(item.id)}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                        <tr className="table-light">
                            <td>
                                <Form.Control
                                    size="sm"
                                    placeholder="e.g. Validity"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                />
                            </td>
                            <td>
                                <Form.Control
                                    as={type === 'NOTE' ? 'textarea' : 'input'}
                                    size="sm"
                                    placeholder={type === 'NOTE' ? "Note text..." : "e.g. 30 Days"}
                                    value={newItem.content}
                                    onChange={e => setNewItem({ ...newItem, content: e.target.value })}
                                />
                            </td>
                            <td>
                                <Button size="sm" variant="success" onClick={add}>Add</Button>
                            </td>
                        </tr>
                    </tbody>
                </Table>
            </div>
        );
    };

    const getVal = (k) => settings.find(s => s.key === k)?.value || '';

    return (
        <Container className="py-3">
            <h3>System Settings</h3>
            <Tabs defaultActiveKey="global" className="mb-3">
                <Tab eventKey="global" title="Global Variables">
                    <Card>
                        <Card.Body>
                            <Form>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm="3">Global VAT Percent (%)</Form.Label>
                                    <Col sm="9">
                                        <Form.Control
                                            type="number"
                                            value={getVal('GLOBAL_VAT_PERCENT')}
                                            onChange={e => handleSettingChange('GLOBAL_VAT_PERCENT', e.target.value)}
                                        />
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row} className="mb-3">
                                    <Form.Label column sm="3">Global Tax Percent (%)</Form.Label>
                                    <Col sm="9">
                                        <Form.Control
                                            type="number"
                                            value={getVal('GLOBAL_TAX_PERCENT')}
                                            onChange={e => handleSettingChange('GLOBAL_TAX_PERCENT', e.target.value)}
                                        />
                                    </Col>
                                </Form.Group>
                                <Button onClick={saveSettings}>Save Global Settings</Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="terms" title="Terms & Conditions Library">
                    <Card>
                        <Card.Body>
                            <LibraryTable items={terms} type="TERM" />
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="notes" title="Notes Library">
                    <Card>
                        <Card.Body>
                            <LibraryTable items={notes} type="NOTE" />
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>
        </Container>
    );
}
