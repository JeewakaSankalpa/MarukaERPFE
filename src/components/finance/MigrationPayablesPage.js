import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { CreditCard, FileText, FileUp, Plus, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/api';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import SafeSelect from '../ReusableComponents/SafeSelect';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';

const emptyPayableForm = {
    supplierId: '',
    projectIds: [],
    invoiceNumbers: [''],
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

const emptyReceivableForm = {
    projectId: '',
    totalValue: '',
    invoiceNumbers: ['']
};

const MIGRATION_RECEIVABLE_DOC_TYPE = 'MIGRATION_RECEIVABLE';
const MIGRATION_RECEIVABLE_STORAGE_KEY = 'migrationReceivableInvoices';

const money = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const projectLabel = (project) => project.projectName || project.referenceNumber || project.jobNumber || project.projectId || project.id;
const projectOptionLabel = (project) => {
    const bits = [projectLabel(project)];
    if (project.customerName) bits.push(project.customerName);
    if (project.jobNumber || project.referenceNumber) bits.push(project.jobNumber || project.referenceNumber);
    return bits.join(' - ');
};

async function loadMigrationReceivableCandidates(projectRows, receivableRows) {
    return deriveMigrationReceivableCandidates(projectRows, receivableRows);
}

async function loadMigrationReceivables(receivableRows) {
    const withValue = receivableRows.filter(row => Number(row.totalProjectValue || 0) > 0);
    const checks = await Promise.all(withValue.map(async row => {
        const hasEstimation = await projectHasEstimation(row.projectId);
        if (hasEstimation) return null;
        const documents = await loadMigrationReceivableDocuments(row.projectId);
        const invoiceNumbers = invoiceNumbersFromDocuments(documents);
        return {
            ...row,
            documents,
            invoiceNumbers: invoiceNumbers.length ? invoiceNumbers : getStoredMigrationReceivableInvoices(row.projectId)
        };
    }));
    return checks.filter(Boolean);
}

async function deriveMigrationReceivableCandidates(projectRows, receivableRows) {
    const valueByProjectId = new Map(receivableRows.map(row => [row.projectId, Number(row.totalProjectValue || 0)]));
    const withoutValue = projectRows.filter(project => Number(valueByProjectId.get(project.id) || 0) <= 0);
    const checks = await Promise.all(withoutValue.map(async project => {
        const hasEstimation = await projectHasEstimation(project.id);
        return hasEstimation ? null : project;
    }));
    return checks.filter(Boolean);
}

async function projectHasEstimation(projectId) {
    if (!projectId) return false;
    try {
        const res = await api.get(`/estimations/by-project/${encodeURIComponent(projectId)}`);
        return !!res.data?.id;
    } catch (error) {
        return false;
    }
}

async function saveMigrationReceivable(projectId, totalValue, invoiceNumbers, files) {
    const body = new FormData();
    body.append('receivable', new Blob([JSON.stringify({
        totalValue: Number(totalValue),
        invoiceNumber: invoiceNumbers.join(', '),
        invoiceNumbers
    })], { type: 'application/json' }));
    files.forEach(file => body.append('documents', file));

    try {
        await api.post(`/projects/${projectId}/migration-value`, body, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return;
    } catch (error) {
        if (![404, 405].includes(error.response?.status)) {
            throw error;
        }
    }

    await api.patch(`/projects/${projectId}/value`, { totalValue: Number(totalValue) });
    if (files.length > 0) {
        await uploadReceivableFallbackDocuments(projectId, invoiceNumbers, files);
    }
}

async function uploadReceivableFallbackDocuments(projectId, invoiceNumbers, files) {
    const body = new FormData();
    files.forEach(file => body.append('files', file));

    try {
        await api.post(`/projects/${projectId}/files/upload`, body, {
            params: {
                stage: 'FINANCE',
                docType: MIGRATION_RECEIVABLE_DOC_TYPE,
                version: invoiceNumbers.join(', ')
            },
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    } catch (error) {
        toast.warn('Receivable value was saved, but invoice file upload failed');
    }
}

async function loadMigrationReceivableDocuments(projectId) {
    if (!projectId) return [];
    try {
        const res = await api.get(`/projects/${encodeURIComponent(projectId)}/files`);
        const files = Array.isArray(res.data) ? res.data : [];
        return files
            .filter(file => String(file.docType || '').toUpperCase() === MIGRATION_RECEIVABLE_DOC_TYPE)
            .map(file => ({
                ...file,
                fileName: file.fileName || file.displayName || file.originalName || file.storedName,
                url: file.url || file.publicUrl
            }));
    } catch {
        return [];
    }
}

function invoiceNumbersFromDocuments(documents = []) {
    return cleanInvoiceNumbers(documents.flatMap(doc =>
        String(doc.version || '')
            .split(',')
            .map(value => value.trim())
    ));
}

function getStoredMigrationReceivableInvoices(projectId) {
    try {
        const stored = JSON.parse(localStorage.getItem(MIGRATION_RECEIVABLE_STORAGE_KEY) || '{}');
        return cleanInvoiceNumbers(stored[projectId] || []);
    } catch {
        return [];
    }
}

function storeMigrationReceivableInvoices(projectId, invoiceNumbers) {
    if (!projectId) return;
    try {
        const stored = JSON.parse(localStorage.getItem(MIGRATION_RECEIVABLE_STORAGE_KEY) || '{}');
        stored[projectId] = cleanInvoiceNumbers(invoiceNumbers);
        localStorage.setItem(MIGRATION_RECEIVABLE_STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // Local storage is only a compatibility fallback for the old backend.
    }
}

export default function MigrationPayablesPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [receivableCandidates, setReceivableCandidates] = useState([]);
    const [payables, setPayables] = useState([]);
    const [receivables, setReceivables] = useState([]);
    const [activeTab, setActiveTab] = useState('payables');
    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [supplierRes, projectRes, payablesRes, allReceivablesRes] = await Promise.all([
                api.get('/suppliers', { params: { status: 'ACTIVE', page: 0, size: 1000, sort: 'name,asc' } }),
                api.get('/projects/search'),
                api.get('/finance/migration-payables/report'),
                api.get('/projects/receivables')
            ]);
            const projectRows = projectRes.data || [];
            const receivableRows = allReceivablesRes.data || [];

            const [candidateRows, migrationReceivableRows] = await Promise.all([
                loadMigrationReceivableCandidates(projectRows, receivableRows),
                loadMigrationReceivables(receivableRows)
            ]);

            setSuppliers(supplierRes.data?.content || []);
            setProjects(projectRows);
            setReceivableCandidates(candidateRows);
            setPayables(payablesRes.data || []);
            setReceivables(migrationReceivableRows);
        } catch (error) {
            toast.error('Failed to load migration data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="p-4 bg-white min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Migration</h2>
                    <div className="text-muted">Bring opening supplier payables and project receivables into finance.</div>
                </div>
                <Button variant="outline-primary" onClick={loadData} disabled={loading}>
                    <RefreshCw size={16} className="me-2" /> Refresh
                </Button>
            </div>

            <Tabs activeKey={activeTab} onSelect={(key) => setActiveTab(key || 'payables')} className="mb-4">
                <Tab eventKey="payables" title="Payables">
                    <PayablesTab
                        suppliers={suppliers}
                        projects={projects}
                        rows={payables}
                        loading={loading}
                        onRefresh={loadData}
                    />
                </Tab>
                <Tab eventKey="receivables" title="Receivables">
                    <ReceivablesTab
                        projects={projects}
                        candidates={receivableCandidates}
                        rows={receivables}
                        loading={loading}
                        onRefresh={loadData}
                    />
                </Tab>
            </Tabs>
        </div>
    );
}

function PayablesTab({ suppliers, projects, rows, loading, onRefresh }) {
    const [searchInvoice, setSearchInvoice] = useState('');
    const [searchJob, setSearchJob] = useState('');
    const [form, setForm] = useState(emptyPayableForm);
    const [backlogDocs, setBacklogDocs] = useState([]);
    const [saving, setSaving] = useState(false);
    const [paymentTarget, setPaymentTarget] = useState(null);
    const [payment, setPayment] = useState(emptyPayment);
    const [paymentDocs, setPaymentDocs] = useState([]);

    const filteredRows = useMemo(() => {
        const invoice = searchInvoice.trim().toLowerCase();
        const job = searchJob.trim().toLowerCase();
        return rows.filter(row => {
            const invoiceText = formatInvoiceNumbers(row).toLowerCase();
            const matchInvoice = !invoice || invoiceText.includes(invoice);
            const matchJob = !job || (row.projects || []).some(p =>
                (p.jobNumber || '').toLowerCase().includes(job) ||
                (p.referenceNumber || '').toLowerCase().includes(job) ||
                (p.projectName || '').toLowerCase().includes(job)
            );
            return matchInvoice && matchJob;
        });
    }, [rows, searchInvoice, searchJob]);

    const totals = useMemo(() => filteredRows.reduce((acc, row) => {
        acc.amount += Number(row.amount || 0);
        acc.paid += Number(row.paidAmount || 0);
        acc.balance += Number(row.balance || 0);
        return acc;
    }, { amount: 0, paid: 0, balance: 0 }), [filteredRows]);

    const submitBacklog = async (event) => {
        event.preventDefault();
        const invoiceNumbers = cleanInvoiceNumbers(form.invoiceNumbers);
        if (!form.supplierId || form.projectIds.length === 0 || invoiceNumbers.length === 0 || Number(form.amount) <= 0) {
            toast.error('Supplier, project, invoice number, and amount are required');
            return;
        }

        setSaving(true);
        try {
            const body = new FormData();
            body.append('payable', new Blob([JSON.stringify({
                ...form,
                inquiryNumber: invoiceNumbers.join(', '),
                invoiceNumbers,
                amount: Number(form.amount),
                dueDate: form.dueDate || null
            })], { type: 'application/json' }));
            backlogDocs.forEach(file => body.append('documents', file));
            await api.post('/finance/migration-payables', body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Supplier payable added');
            setForm(emptyPayableForm);
            setBacklogDocs([]);
            await onRefresh();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add payable');
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
            await onRefresh();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to record supplier payment');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Row className="g-3 mb-4">
                <Col md={4}><SummaryCard title="Opening Payables" value={money(totals.amount)} /></Col>
                <Col md={4}><SummaryCard title="Paid" value={money(totals.paid)} tone="success" /></Col>
                <Col md={4}><SummaryCard title="Outstanding" value={money(totals.balance)} tone="danger" /></Col>
            </Row>

            <Card className="shadow-sm mb-4 border-start border-4 border-danger">
                <Card.Header className="fw-semibold">Add Supplier Payable</Card.Header>
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
                                <SafeSelect multiple value={form.projectIds} onChange={e => setForm({ ...form, projectIds: e.target.value })} isSearchable required>
                                    <option value="">Select projects</option>
                                    {projects.map(project => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}
                                </SafeSelect>
                            </Col>
                            <Col md={4}>
                                <InvoiceNumberList
                                    label="Invoice Numbers"
                                    values={form.invoiceNumbers}
                                    onChange={invoiceNumbers => setForm({ ...form, invoiceNumbers })}
                                />
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
                                <Form.Label>Supplier Invoice Files</Form.Label>
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

            <MigrationPayablesTable
                rows={filteredRows}
                allRows={rows}
                loading={loading}
                searchInvoice={searchInvoice}
                searchJob={searchJob}
                setSearchInvoice={setSearchInvoice}
                setSearchJob={setSearchJob}
                onPayment={openPayment}
            />

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
                                <Form.Label>Payment Files</Form.Label>
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
        </>
    );
}

function ReceivablesTab({ candidates, rows, loading, onRefresh }) {
    const [form, setForm] = useState(emptyReceivableForm);
    const [docs, setDocs] = useState([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(row =>
            (row.projectName || '').toLowerCase().includes(q) ||
            (row.customerName || '').toLowerCase().includes(q) ||
            (row.projectId || '').toLowerCase().includes(q) ||
            formatInvoiceNumbers(row).toLowerCase().includes(q)
        );
    }, [rows, search]);

    const totals = useMemo(() => filteredRows.reduce((acc, row) => {
        acc.value += Number(row.totalProjectValue || 0);
        acc.received += Number(row.totalReceived || 0);
        acc.balance += Number(row.balance || 0);
        return acc;
    }, { value: 0, received: 0, balance: 0 }), [filteredRows]);

    const submitReceivable = async (event) => {
        event.preventDefault();
        const invoiceNumbers = cleanInvoiceNumbers(form.invoiceNumbers);
        if (!form.projectId || Number(form.totalValue) <= 0 || invoiceNumbers.length === 0) {
            toast.error('Project, project value, and at least one invoice number are required');
            return;
        }

        setSaving(true);
        try {
            await saveMigrationReceivable(form.projectId, form.totalValue, invoiceNumbers, docs);
            storeMigrationReceivableInvoices(form.projectId, invoiceNumbers);
            toast.success('Project receivable added');
            setForm(emptyReceivableForm);
            setDocs([]);
            await onRefresh();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add receivable');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Row className="g-3 mb-4">
                <Col md={4}><SummaryCard title="Opening Receivables" value={money(totals.value)} /></Col>
                <Col md={4}><SummaryCard title="Received" value={money(totals.received)} tone="success" /></Col>
                <Col md={4}><SummaryCard title="Balance Due" value={money(totals.balance)} tone="danger" /></Col>
            </Row>

            <Card className="shadow-sm mb-4 border-start border-4 border-primary">
                <Card.Header className="fw-semibold">Add Project Receivable</Card.Header>
                <Card.Body>
                    <Form onSubmit={submitReceivable}>
                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Label>Project</Form.Label>
                                <SafeSelect value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} isSearchable required>
                                    <option value="">Select project</option>
                                    {candidates.map(project => <option key={project.id} value={project.id}>{projectOptionLabel(project)}</option>)}
                                </SafeSelect>
                            </Col>
                            <Col md={3}>
                                <Form.Label>Project Value</Form.Label>
                                <Form.Control type="number" min="0" step="0.01" value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} required />
                            </Col>
                            <Col md={3}>
                                <InvoiceNumberList
                                    label="Invoice Numbers"
                                    values={form.invoiceNumbers}
                                    onChange={invoiceNumbers => setForm({ ...form, invoiceNumbers })}
                                />
                            </Col>
                            <Col md={2}>
                                <Form.Label>Customer Invoice Files</Form.Label>
                                <Form.Control type="file" multiple onChange={e => setDocs(Array.from(e.target.files || []))} />
                            </Col>
                            <Col md={12} className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="text-muted small">Only projects without an estimation or existing value are shown. Payments are recorded from the project payments path after this one-time setup.</div>
                                <Button type="submit" disabled={saving}>
                                    <FileUp size={16} className="me-2" /> {saving ? 'Saving...' : 'Add Receivable'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header className="fw-semibold d-flex flex-wrap align-items-center gap-2 justify-content-between">
                    <span>Migration Receivables Report</span>
                    <div className="input-group input-group-sm" style={{ width: 260 }}>
                        <span className="input-group-text"><Search size={13} /></span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search project / customer..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="btn btn-outline-secondary" type="button" onClick={() => setSearch('')}>
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5"><Spinner animation="border" /></div>
                    ) : (
                        <Table responsive hover className="mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Project</th>
                                    <th>Customer</th>
                                    <th>Invoice Numbers</th>
                                    <th>Customer Invoice Files</th>
                                    <th className="text-end">Project Value</th>
                                    <th className="text-end">Received</th>
                                    <th className="text-end">Balance Due</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center text-muted py-4">
                                        {rows.length === 0 ? 'No migration receivables found' : 'No results match your search'}
                                    </td></tr>
                                ) : filteredRows.map(row => (
                                    <tr key={row.projectId}>
                                        <td className="fw-semibold">{row.projectName || row.projectId}</td>
                                        <td>{row.customerName || '-'}</td>
                                        <td>{invoiceNumberList(row)}</td>
                                        <td><FileText size={14} className="me-1" />{documentLinks(row.documents)}</td>
                                        <td className="text-end">{money(row.totalProjectValue)}</td>
                                        <td className="text-end">{money(row.totalReceived)}</td>
                                        <td className="text-end fw-semibold">{money(row.balance)}</td>
                                        <td>
                                            <Badge bg={Number(row.balance || 0) <= 0 ? 'success' : Number(row.totalReceived || 0) > 0 ? 'warning' : 'secondary'}>
                                                {Number(row.balance || 0) <= 0 ? 'PAID' : Number(row.totalReceived || 0) > 0 ? 'PARTIAL' : 'OPEN'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </>
    );
}

function MigrationPayablesTable({ rows, allRows, loading, searchInvoice, searchJob, setSearchInvoice, setSearchJob, onPayment }) {
    return (
        <Card className="shadow-sm">
            <Card.Header className="fw-semibold d-flex flex-wrap align-items-center gap-2 justify-content-between">
                <span>Migration Payables Report</span>
                <div className="d-flex gap-2 flex-wrap">
                    <div className="input-group input-group-sm" style={{ width: 220 }}>
                        <span className="input-group-text"><Search size={13} /></span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search invoice no..."
                            value={searchInvoice}
                            onChange={e => setSearchInvoice(e.target.value)}
                        />
                        {searchInvoice && (
                            <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchInvoice('')}>
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <div className="input-group input-group-sm" style={{ width: 220 }}>
                        <span className="input-group-text"><Search size={13} /></span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search job / project..."
                            value={searchJob}
                            onChange={e => setSearchJob(e.target.value)}
                        />
                        {searchJob && (
                            <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchJob('')}>
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </Card.Header>
            <Card.Body className="p-0">
                {loading ? (
                    <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : (
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Invoice Numbers</th>
                                <th>Supplier</th>
                                <th>Projects</th>
                                <th>Added By</th>
                                <th>Invoice Files</th>
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
                                <tr><td colSpan="11" className="text-center text-muted py-4">
                                    {allRows.length === 0 ? 'No migration payables found' : 'No results match your search'}
                                </td></tr>
                            ) : rows.map(row => (
                                <tr key={row.id}>
                                    <td>
                                        {invoiceNumberList(row)}
                                        <small className="text-muted">{row.dueDate || row.payableDate || ''}</small>
                                    </td>
                                    <td>{row.supplierName}</td>
                                    <td style={{ minWidth: 180 }}>{(row.projects || []).map(projectLabel).join(', ') || '-'}</td>
                                    <td>
                                        <div>{row.createdBy || '-'}</div>
                                        <small className="text-muted">{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</small>
                                    </td>
                                    <td><FileText size={14} className="me-1" />{documentLinks(row.documents)}</td>
                                    <td className="text-end">{money(row.amount)}</td>
                                    <td className="text-end">{money(row.paidAmount)}</td>
                                    <td className="text-end fw-semibold">{money(row.balance)}</td>
                                    <td style={{ minWidth: 260 }}>
                                        {(row.transactions || []).length === 0 ? '-' : row.transactions.map((tx, txIndex) => (
                                            <div key={tx.id || `${row.id}-tx-${txIndex}`} className="border-bottom pb-2 mb-2">
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
                                        <Button size="sm" variant="outline-success" disabled={Number(row.balance || 0) <= 0} onClick={() => onPayment(row)}>
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
    );
}

function InvoiceNumberList({ label, values, onChange }) {
    const list = values && values.length ? values : [''];

    const updateValue = (index, value) => {
        onChange(list.map((item, i) => i === index ? value : item));
    };

    const addValue = () => onChange([...list, '']);
    const removeValue = (index) => {
        const next = list.filter((_, i) => i !== index);
        onChange(next.length ? next : ['']);
    };

    return (
        <div>
            <Form.Label>{label}</Form.Label>
            <div className="d-flex flex-column gap-2">
                {list.map((value, index) => (
                    <div className="d-flex gap-2" key={index}>
                        <Form.Control
                            value={value}
                            onChange={e => updateValue(index, e.target.value)}
                            placeholder={`Invoice ${index + 1}`}
                            required={index === 0}
                        />
                        {list.length > 1 && (
                            <Button type="button" variant="outline-secondary" onClick={() => removeValue(index)}>
                                <X size={14} />
                            </Button>
                        )}
                    </div>
                ))}
                <Button type="button" size="sm" variant="outline-primary" className="align-self-start" onClick={addValue}>
                    <Plus size={14} className="me-1" /> Add Invoice
                </Button>
            </div>
        </div>
    );
}

function cleanInvoiceNumbers(values = []) {
    return values
        .map(value => (value || '').trim())
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index);
}

function formatInvoiceNumbers(row) {
    const invoices = getInvoiceNumbers(row);
    return invoices.length ? invoices.join(', ') : '-';
}

function getInvoiceNumbers(row = {}) {
    if (Array.isArray(row.invoiceNumbers) && row.invoiceNumbers.length) {
        return cleanInvoiceNumbers(row.invoiceNumbers);
    }
    return cleanInvoiceNumbers(String(row.inquiryNumber || row.invoiceNumber || '')
        .split(',')
        .map(value => value.trim()));
}

function invoiceNumberList(row) {
    const invoices = getInvoiceNumbers(row);
    return invoices.length === 0 ? '-' : (
        <div className="d-flex flex-column gap-1">
            {invoices.map(invoice => (
                <span key={invoice} className="fw-semibold">{invoice}</span>
            ))}
        </div>
    );
}

function documentLinks(docs = []) {
    return docs.length === 0 ? '-' : docs.map((doc, index) => (
        doc.url ? (
            <a key={`${doc.url || doc.fileName || 'document'}-${index}`} href={doc.url} target="_blank" rel="noreferrer" className="d-block">
                {doc.fileName || doc.displayName || doc.originalName || doc.storedName || `Document ${index + 1}`}
            </a>
        ) : (
            <span key={`${doc.fileName || doc.displayName || 'document'}-${index}`} className="d-block">
                {doc.fileName || doc.displayName || doc.originalName || doc.storedName || `Document ${index + 1}`}
            </span>
        )
    ));
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
