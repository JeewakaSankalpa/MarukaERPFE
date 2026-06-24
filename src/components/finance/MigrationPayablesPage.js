import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { CreditCard, FileText, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/api';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import SafeSelect from '../ReusableComponents/SafeSelect';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';

const emptyForm = {
    supplierId: '',
    projectIds: [],
    inquiryNumber: '',
    description: '',
    amount: '',
    payableDate: new Date().toISOString().slice(0, 10),
    dueDate: ''
};

const emptyPayment = {
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: '',
    note: '',
    paymentAccountId: '',
    paymentAccountName: '',
    paymentAccountType: '',
    paymentMethod: ''
};

export default function MigrationPayablesPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [backlogDocs, setBacklogDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [paymentTarget, setPaymentTarget] = useState(null);
    const [payment, setPayment] = useState(emptyPayment);
    const [paymentDocs, setPaymentDocs] = useState([]);

    const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [supplierRes, projectRes, payablesRes] = await Promise.all([
                api.get('/suppliers', { params: { status: 'ACTIVE', page: 0, size: 1000, sort: 'name,asc' } }),
                api.get('/projects/search'),
                api.get('/finance/migration-payables/report')
            ]);
            setSuppliers(supplierRes.data?.content || []);
            setProjects(projectRes.data || []);
            setRows(payablesRes.data || []);
        } catch (error) {
            toast.error('Failed to load migration payables');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const totals = useMemo(() => rows.reduce((acc, row) => {
        acc.amount += Number(row.amount || 0);
        acc.paid += Number(row.paidAmount || 0);
        acc.balance += Number(row.balance || 0);
        return acc;
    }, { amount: 0, paid: 0, balance: 0 }), [rows]);

    const handleProjectChange = (projectIds) => {
        setForm(current => ({ ...current, projectIds }));
    };

    const submitBacklog = async (event) => {
        event.preventDefault();
        if (!form.supplierId || form.projectIds.length === 0 || !form.inquiryNumber || Number(form.amount) <= 0) {
            toast.error('Supplier, project, inquiry number, and amount are required');
            return;
        }

        setSaving(true);
        try {
            const body = new FormData();
            body.append('payable', new Blob([JSON.stringify({
                ...form,
                amount: Number(form.amount),
                dueDate: form.dueDate || null
            })], { type: 'application/json' }));
            backlogDocs.forEach(file => body.append('documents', file));
            await api.post('/finance/migration-payables', body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Supplier payable backlog added');
            setForm(emptyForm);
            setBacklogDocs([]);
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add payable backlog');
        } finally {
            setSaving(false);
        }
    };

    const openPayment = (row) => {
        setPaymentTarget(row);
        setPayment({ ...emptyPayment, amount: row.balance || '' });
        setPaymentDocs([]);
    };

    const submitPayment = async (event) => {
        event.preventDefault();
        if (!paymentTarget || Number(payment.amount) <= 0 || !payment.paymentAccountId || !payment.paymentMethod) {
            toast.error('Amount, payment account, and payment method are required');
            return;
        }

        setSaving(true);
        try {
            const body = new FormData();
            body.append('payment', new Blob([JSON.stringify({
                ...payment,
                amount: Number(payment.amount)
            })], { type: 'application/json' }));
            paymentDocs.forEach(file => body.append('documents', file));
            await api.post(`/finance/migration-payables/${paymentTarget.id}/payments`, body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Supplier payment recorded');
            setPaymentTarget(null);
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to record supplier payment');
        } finally {
            setSaving(false);
        }
    };

    const documentLinks = (docs = []) => docs.length === 0 ? '-' : docs.map((doc, index) => (
        <a key={`${doc.url}-${index}`} href={doc.url} target="_blank" rel="noreferrer" className="d-block">
            {doc.fileName || `Document ${index + 1}`}
        </a>
    ));

    const projectLabel = (project) => project.projectName || project.referenceNumber || project.jobNumber || project.id;
    const rowProjects = (row) => (row.projects || []).map(projectLabel).join(', ') || '-';

    return (
        <div className="p-4 bg-white min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Migration Payables</h2>
                    <div className="text-muted">Supplier backlog, payments, documents, and audit report.</div>
                </div>
                <Button variant="outline-primary" onClick={loadData} disabled={loading}>
                    <RefreshCw size={16} className="me-2" /> Refresh
                </Button>
            </div>

            <Row className="g-3 mb-4">
                <Col md={4}><SummaryCard title="Total Backlog" value={money(totals.amount)} /></Col>
                <Col md={4}><SummaryCard title="Paid" value={money(totals.paid)} tone="success" /></Col>
                <Col md={4}><SummaryCard title="Outstanding" value={money(totals.balance)} tone="danger" /></Col>
            </Row>

            <Card className="shadow-sm mb-4">
                <Card.Header className="fw-semibold">Add Supplier Payable Backlog</Card.Header>
                <Card.Body>
                    <Form onSubmit={submitBacklog}>
                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Label>Supplier</Form.Label>
                                <SafeSelect value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} isSearchable required>
                                    <option value="">Select supplier</option>
                                    {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                                </SafeSelect>
                            </Col>
                            <Col md={4}>
                                <Form.Label>Projects</Form.Label>
                                <SafeSelect multiple value={form.projectIds} onChange={e => handleProjectChange(e.target.value)} isSearchable required>
                                    <option value="">Select projects</option>
                                    {projects.map(project => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}
                                </SafeSelect>
                            </Col>
                            <Col md={4}>
                                <Form.Label>Inquiry Number</Form.Label>
                                <Form.Control value={form.inquiryNumber} onChange={e => setForm({ ...form, inquiryNumber: e.target.value })} required />
                            </Col>
                            <Col md={3}>
                                <Form.Label>Amount to Pay</Form.Label>
                                <Form.Control type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                            </Col>
                            <Col md={3}>
                                <Form.Label>Payable Date</Form.Label>
                                <SafeDatePicker name="payableDate" value={form.payableDate} onChange={e => setForm({ ...form, payableDate: e.target.value })} />
                            </Col>
                            <Col md={3}>
                                <Form.Label>Due Date</Form.Label>
                                <SafeDatePicker name="dueDate" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                            </Col>
                            <Col md={3}>
                                <Form.Label>Backlog Documents</Form.Label>
                                <Form.Control type="file" multiple onChange={e => setBacklogDocs(Array.from(e.target.files || []))} />
                            </Col>
                            <Col md={12}>
                                <Form.Label>Description</Form.Label>
                                <Form.Control as="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </Col>
                            <Col md={12} className="text-end">
                                <Button type="submit" disabled={saving}>
                                    <Plus size={16} className="me-2" /> {saving ? 'Saving...' : 'Add Payable'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header className="fw-semibold">Migration Payables Report</Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5"><Spinner animation="border" /></div>
                    ) : (
                        <Table responsive hover className="mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Inquiry</th>
                                    <th>Supplier</th>
                                    <th>Projects</th>
                                    <th>Added By</th>
                                    <th>Backlog Docs</th>
                                    <th className="text-end">Amount</th>
                                    <th className="text-end">Paid</th>
                                    <th className="text-end">Balance</th>
                                    <th>Transactions</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan="11" className="text-center text-muted py-4">No migration payables found</td></tr>
                                ) : rows.map(row => (
                                    <tr key={row.id}>
                                        <td>
                                            <div className="fw-semibold">{row.inquiryNumber || '-'}</div>
                                            <small className="text-muted">{row.dueDate || row.payableDate || ''}</small>
                                        </td>
                                        <td>{row.supplierName}</td>
                                        <td style={{ minWidth: 180 }}>{rowProjects(row)}</td>
                                        <td>
                                            <div>{row.createdBy || '-'}</div>
                                            <small className="text-muted">{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</small>
                                        </td>
                                        <td><FileText size={14} className="me-1" />{documentLinks(row.documents)}</td>
                                        <td className="text-end">{money(row.amount)}</td>
                                        <td className="text-end">{money(row.paidAmount)}</td>
                                        <td className="text-end fw-semibold">{money(row.balance)}</td>
                                        <td style={{ minWidth: 260 }}>
                                            {(row.transactions || []).length === 0 ? '-' : row.transactions.map(tx => (
                                                <div key={tx.id} className="border-bottom pb-2 mb-2">
                                                    <div className="d-flex justify-content-between">
                                                        <span>{money(tx.amount)}</span>
                                                        <small className="text-muted">{tx.paymentDate}</small>
                                                    </div>
                                                    <small className="d-block">Added by {tx.addedBy || '-'}</small>
                                                    <small className="d-block text-muted">{tx.reference || tx.paymentMethod || ''}</small>
                                                    <small>{documentLinks(tx.documents)}</small>
                                                </div>
                                            ))}
                                        </td>
                                        <td><Badge bg={row.status === 'PAID' ? 'success' : row.status === 'PARTIALLY_PAID' ? 'warning' : 'secondary'}>{row.status}</Badge></td>
                                        <td className="text-end">
                                            <Button size="sm" variant="outline-success" disabled={Number(row.balance || 0) <= 0} onClick={() => openPayment(row)}>
                                                <CreditCard size={14} className="me-1" /> Pay
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            <Modal show={!!paymentTarget} onHide={() => setPaymentTarget(null)} size="lg" centered>
                <Form onSubmit={submitPayment}>
                    <Modal.Header closeButton>
                        <Modal.Title>Pay Supplier</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {paymentTarget && (
                            <div className="mb-3">
                                <div className="fw-semibold">{paymentTarget.supplierName} - {paymentTarget.inquiryNumber}</div>
                                <small className="text-muted">Outstanding: {money(paymentTarget.balance)}</small>
                            </div>
                        )}
                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Label>Amount</Form.Label>
                                <Form.Control type="number" min="0" step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} required />
                            </Col>
                            <Col md={4}>
                                <Form.Label>Payment Date</Form.Label>
                                <SafeDatePicker name="paymentDate" value={payment.paymentDate} onChange={e => setPayment({ ...payment, paymentDate: e.target.value })} />
                            </Col>
                            <Col md={4}>
                                <Form.Label>Reference</Form.Label>
                                <Form.Control value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} />
                            </Col>
                            <Col md={12}>
                                <PaymentAccountPicker
                                    required
                                    value={payment.paymentAccountId}
                                    onChange={value => setPayment(current => ({ ...current, ...value }))}
                                />
                            </Col>
                            <Col md={12}>
                                <Form.Label>Transaction Documents</Form.Label>
                                <Form.Control type="file" multiple onChange={e => setPaymentDocs(Array.from(e.target.files || []))} />
                            </Col>
                            <Col md={12}>
                                <Form.Label>Note</Form.Label>
                                <Form.Control as="textarea" rows={2} value={payment.note} onChange={e => setPayment({ ...payment, note: e.target.value })} />
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setPaymentTarget(null)}>Cancel</Button>
                        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

function SummaryCard({ title, value, tone = 'primary' }) {
    return (
        <Card className={`shadow-sm border-${tone}`}>
            <Card.Body>
                <div className="text-muted small">{title}</div>
                <h4 className={`mb-0 text-${tone}`}>{value}</h4>
            </Card.Body>
        </Card>
    );
}
