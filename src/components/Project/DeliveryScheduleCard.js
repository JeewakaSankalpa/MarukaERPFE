import React, { useEffect, useState } from 'react';
import { Card, Form, Row, Col, Button, Modal, Table } from 'react-bootstrap';
import api from '../../api/api';
import SafeSelect from '../ReusableComponents/SafeSelect';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import { toast } from 'react-toastify';
import { FaTruck, FaFilePdf, FaSave } from 'react-icons/fa';

export default function DeliveryScheduleCard({ projectId, reloadKey }) {
    const [data, setData] = useState({
        scheduledDate: '',
        location: '',
        vehicleDetails: '',
        responsibleEmployeeId: '',
        responsibleEmployeeName: '',
        status: 'PENDING', customerName: '', customerId: '', customerAddress: '', customerTelephone: '',
        customerEmail: '', contactPerson: '', deliveryTime: '', poNumber: '', invoiceNumber: '',
        recipientName: '', recipientId: '', recipientDesignation: ''
    });
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [components, setComponents] = useState([]);
    const [selectedComponents, setSelectedComponents] = useState([]);
    const [history, setHistory] = useState([]);
    const [showGatePassModal, setShowGatePassModal] = useState(false);

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, reloadKey]);

    const fetchInitialData = async () => {
        try {
            // Fetch Employees for dropdown
            const empRes = await api.get('/employee/all');
            setEmployees(empRes.data || []);

            // Fetch Delivery Data
            const res = await api.get(`/projects/${projectId}/delivery`);
            if (res.status === 200 && res.data) {
                setData(res.data);
            }
            const [estimationRes, historyRes] = await Promise.all([
                api.get(`/estimations/by-project/${projectId}`),
                api.get(`/projects/${projectId}/delivery/gatepass/history`)
            ]);
            const nextComponents = (estimationRes.data?.components || []).filter(c => c?.name);
            setComponents(nextComponents);
            const nextHistory = historyRes.data || [];
            const sent = new Set(nextHistory.flatMap(item => item.componentNames || []));
            setSelectedComponents(nextComponents.map(c => c.name).filter(name => !sent.has(name)));
            setHistory(nextHistory);
        } catch (e) {
            console.error("Failed to load delivery data", e);
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));

        // If employee changes, update name for convenience (though backend could do it)
        if (name === 'responsibleEmployeeId') {
            const emp = employees.find(e => e.id === value);
            if (emp) {
                setData(prev => ({ ...prev, responsibleEmployeeName: `${emp.firstName} ${emp.lastName}` }));
            }
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.post(`/projects/${projectId}/delivery`, data);
            toast.success("Delivery Schedule Saved! Generating documents...");

            // Poll until the saved record comes back with an ID (backend may need a moment to persist)
            let attempts = 0;
            const poll = async () => {
                try {
                    const res = await api.get(`/projects/${projectId}/delivery`);
                    if (res.status === 200 && res.data && res.data.id) {
                        setData(res.data);
                        toast.success("Gate Pass & Delivery Note are ready!");
                        return;
                    }
                } catch { /* ignore */ }
                attempts++;
                if (attempts < 8) {
                    setTimeout(poll, 1500); // retry every 1.5s, up to 8 times (~12s)
                } else {
                    toast.warn("Documents may still be generating. Please try downloading in a moment.");
                }
            };
            await poll();
        } catch (e) {
            toast.error("Failed to save schedule");
        } finally {
            setLoading(false);
        }
    };

    const downloadPdf = async (type) => { // 'confirmation'
        try {
            const res = await api.get(`/projects/${projectId}/delivery/${type}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_${projectId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            toast.error(`Failed to download ${type}`);
        }
    };

    const generateGatePass = async () => {
        if (!selectedComponents.length) {
            toast.warn('Select at least one estimation component for the gate pass.');
            return;
        }
        try {
            const res = await api.post(`/projects/${projectId}/delivery/gatepass`, { componentNames: selectedComponents }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `gatepass_${projectId}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
            const [deliveryRes, historyRes] = await Promise.all([
                api.get(`/projects/${projectId}/delivery`),
                api.get(`/projects/${projectId}/delivery/gatepass/history`)
            ]);
            setData(deliveryRes.data);
            setHistory(historyRes.data || []);
            setShowGatePassModal(false);
            toast.success('Gate pass generated.');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to generate gate pass');
        }
    };

    const viewGatePass = async (passNumber) => {
        try {
            const res = await api.get(`/projects/${projectId}/delivery/gatepass/history/${encodeURIComponent(passNumber)}`, { responseType: 'blob' });
            window.open(window.URL.createObjectURL(new Blob([res.data])), '_blank', 'noopener,noreferrer');
        } catch (e) {
            toast.error('Failed to open gate pass');
        }
    };

    if (fetching) return <div>Loading Delivery Info...</div>;

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-primary">
                    <FaTruck className="me-2" /> Delivery Schedule
                </h5>
                <div className="d-flex gap-2 align-items-center">
                    {loading && (
                        <span className="text-muted small fst-italic me-1">
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Processing...
                        </span>
                    )}
                    <Button variant="outline-danger" size="sm" onClick={() => setShowGatePassModal(true)} disabled={!data.id || loading}>
                        <FaFilePdf /> Gate Pass
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={() => downloadPdf('confirmation')} disabled={!data.id || loading}>
                        <FaFilePdf /> Delivery Note
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                <Form>
                    <h6 className="text-primary border-bottom pb-2">Customer Information</h6>
                    <Row className="mb-3">
                        <Col md={6}><Form.Label>Customer Name / ID</Form.Label><Form.Control name="customerName" value={data.customerName || ''} onChange={handleChange} /></Col>
                        <Col md={6}><Form.Label>Customer ID</Form.Label><Form.Control name="customerId" value={data.customerId || ''} onChange={handleChange} /></Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}><Form.Label>Address</Form.Label><Form.Control name="customerAddress" value={data.customerAddress || ''} onChange={handleChange} /></Col>
                        <Col md={3}><Form.Label>Telephone</Form.Label><Form.Control name="customerTelephone" value={data.customerTelephone || ''} onChange={handleChange} /></Col>
                        <Col md={3}><Form.Label>Email</Form.Label><Form.Control type="email" name="customerEmail" value={data.customerEmail || ''} onChange={handleChange} /></Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}><Form.Label>Contact Person</Form.Label><Form.Control name="contactPerson" value={data.contactPerson || ''} onChange={handleChange} /></Col>
                    </Row>
                    <h6 className="text-primary border-bottom pb-2">Delivery References</h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Scheduled Date</Form.Label>
                                <SafeDatePicker
                                    name="scheduledDate"
                                    value={data.scheduledDate || ''}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}><Form.Label>Delivery Time</Form.Label><Form.Control type="time" name="deliveryTime" value={data.deliveryTime || ''} onChange={handleChange} /></Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Target Location</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="location"
                                    placeholder="Enter Delivery Address"
                                    value={data.location || ''}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}><Form.Label>PO Number</Form.Label><Form.Control name="poNumber" value={data.poNumber || ''} onChange={handleChange} /></Col>
                        <Col md={6}><Form.Label>Invoice Number</Form.Label><Form.Control name="invoiceNumber" value={data.invoiceNumber || ''} onChange={handleChange} /></Col>
                    </Row>
                    <h6 className="text-primary border-bottom pb-2">Recipient / Acknowledgement</h6>
                    <Row className="mb-3">
                        <Col md={4}><Form.Label>Recipient Name</Form.Label><Form.Control name="recipientName" value={data.recipientName || ''} onChange={handleChange} /></Col>
                        <Col md={4}><Form.Label>Recipient ID</Form.Label><Form.Control name="recipientId" value={data.recipientId || ''} onChange={handleChange} /></Col>
                        <Col md={4}><Form.Label>Designation</Form.Label><Form.Control name="recipientDesignation" value={data.recipientDesignation || ''} onChange={handleChange} /></Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Vehicle Details</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="vehicleDetails"
                                    placeholder="Vehicle No / Type"
                                    value={data.vehicleDetails || ''}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Responsible Person</Form.Label>
                                <SafeSelect
                                    name="responsibleEmployeeId"
                                    value={data.responsibleEmployeeId || ''}
                                    onChange={handleChange}
                                >
                                    <option value="">-- Select Employee --</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.firstName} {e.lastName} ({e.role})
                                        </option>
                                    ))}
                                </SafeSelect>
                            </Form.Group>
                        </Col>
                    </Row>
                    <div className="d-flex justify-content-end">
                        <Button variant="primary" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : <><FaSave className="me-1" /> Save Schedule</>}
                        </Button>
                    </div>
                </Form>
                {history.length > 0 && <div className="mt-4"><h6>Gate Pass Generation History</h6><Table size="sm" responsive><thead><tr><th>Pass</th><th>Components</th><th>Generated by</th><th>Generated at</th><th></th></tr></thead><tbody>{history.map((item, index) => <tr key={`${item.passNumber || 'pass'}-${index}`}><td>{item.passNumber || '-'}</td><td>{(item.componentNames || []).join(', ')}</td><td>{item.generatedBy || '-'}</td><td>{item.generatedAt ? new Date(item.generatedAt).toLocaleString() : '-'}</td><td><Button size="sm" variant="outline-secondary" onClick={() => viewGatePass(item.passNumber)}>View</Button></td></tr>)}</tbody></Table></div>}
            </Card.Body>
            <Modal show={showGatePassModal} onHide={() => setShowGatePassModal(false)}>
                <Modal.Header closeButton><Modal.Title>Generate Gate Pass</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="text-muted">Select the estimation components being sent in this delivery.</p>
                    {components.length === 0 ? <div className="text-muted">No estimation components found.</div> : components.map(component => { const sent = history.some(item => (item.componentNames || []).includes(component.name)); return <Form.Check key={component.name} type="checkbox" label={`${component.name} (${component.items?.length || 0} lines)${sent ? ' - already sent' : ''}`} checked={selectedComponents.includes(component.name)} disabled={sent} onChange={() => setSelectedComponents(current => current.includes(component.name) ? current.filter(name => name !== component.name) : [...current, component.name])} /> })}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowGatePassModal(false)}>Cancel</Button><Button variant="danger" onClick={generateGatePass}>Generate Gate Pass</Button></Modal.Footer>
            </Modal>
        </Card>
    );
}
