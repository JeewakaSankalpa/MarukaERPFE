import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Table, Tabs, Tab } from 'react-bootstrap';
import api from '../../api/api';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export default function SettingsPage() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);

    // Filtered lists
    const terms = libraryItems.filter(i => i.type === 'TERM');
    const notes = libraryItems.filter(i => i.type === 'NOTE');

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [sets, libs] = await Promise.all([
                api.get('/settings').then(r => r.data),
                api.get('/quote-library').then(r => r.data)
            ]);
            setSettings(sets);
            setLibraryItems(libs);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSettingChange = (key, val) => {
        const found = settings.find(s => s.key === key);
        if (found) {
            setSettings(settings.map(s => s.key === key ? { ...s, value: val } : s));
        } else {
            console.warn("Setting not found:", key);
            setSettings([...settings, { key, value: val }]);
        }
    };

    const saveSettings = async () => {
        try {
            await api.post('/settings', settings);
            toast.success('Settings saved!');
        } catch (err) {
            toast.error('Error saving settings');
        }
    };

    // Library CRUD
    const saveLibraryItem = async (item) => {
        if (!item.title || !item.content) return;
        try {
            await api.post('/quote-library', item);
            loadAll(); // Reload to get new ID/Updates
        } catch (err) {
            toast.error('Error saving library item');
        }
    };

    const deleteLibraryItem = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.delete(`/quote-library/${id}`);
            setLibraryItems(libraryItems.filter(i => i.id !== id));
        } catch (err) {
            toast.error('Error deleting item');
        }
    };

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
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">System Settings</h3>
            </div>
            
            <Tabs defaultActiveKey="global" className="mb-4 shadow-sm border rounded p-2">
                <Tab eventKey="global" title="Global Variables">
                    <Card className="border-0">
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
                    <Card className="border-0">
                        <Card.Body>
                            <LibraryTable items={terms} type="TERM" />
                        </Card.Body>
                    </Card>
                </Tab>
                <Tab eventKey="notes" title="Notes Library">
                    <Card className="border-0">
                        <Card.Body>
                            <LibraryTable items={notes} type="NOTE" />
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            <Row className="mt-4">
                <Col md={12} className="mb-3">
                    <h5 className="text-secondary border-bottom pb-2">Admin Tools</h5>
                </Col>
                <Col md={4} sm={6}>
                    <Card className="h-100 shadow-sm border-0 bg-light" onClick={() => navigate('/admin/roles')} style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                        <Card.Body className="d-flex align-items-center p-4">
                            <div className="bg-primary bg-opacity-10 p-3 rounded-3 me-3">
                                <i className="fa fa-users-cog text-primary" style={{ fontSize: '1.5rem' }}></i>
                            </div>
                            <div>
                                <h6 className="mb-1">Role Management</h6>
                                <p className="text-muted small mb-0">Manage system roles & access levels.</p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
