import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import {
    Container,
    Card,
    Table,
    Form,
    Button,
    Row,
    Col,
    Alert,
    Spinner,
    Badge
} from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import 'react-toastify/dist/ReactToastify.css';
import './StockTakingPage.css';

const StockTakingPage = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [adjustments, setAdjustments] = useState({}); // Map: batchId -> physicalQty
    const [searchQuery, setSearchQuery] = useState('');
    const [auditTitle, setAuditTitle] = useState('');
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, CHANGED

    const [selectedApprover, setSelectedApprover] = useState("");
    const [approvers, setApprovers] = useState([]);

    useEffect(() => {
        fetchBatches();
        fetchApprovers();
    }, []);

    const fetchApprovers = async () => {
        try {
            // Fetch all users and filter client side for now, or use dedicated endpoint if available.
            // Assuming /api/user/search returns list.
            const res = await api.get('/user/search');
            // Filter only MANAGER or ADMIN for approval?
            const managers = res.data.filter(u => u.accessLevel === 'MANAGER' || u.accessLevel === 'ADMIN');
            setApprovers(managers);
        } catch (e) {
            console.error("Failed to load approvers", e);
        }
    };

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventory/adjustments/batches');
            setBatches(response.data);
        } catch (err) {
            console.error("Error fetching batches:", err);
            toast.error("Failed to load stock batches.");
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (batchId, value) => {
        setAdjustments(prev => ({
            ...prev,
            [batchId]: value
        }));
    };

    const calculateDifference = (systemQty, physicalQty) => {
        if (physicalQty === undefined || physicalQty === '') return 0;
        return parseFloat(physicalQty) - systemQty;
    };

    const getAdjustedBatches = () => {
        return batches.filter(batch => {
            const physicalQty = adjustments[batch.id];
            return physicalQty !== undefined && physicalQty !== '' && parseFloat(physicalQty) !== batch.quantity;
        });
    };

    const handleSubmitAudit = async () => {
        const itemsToSubmit = getAdjustedBatches();

        if (itemsToSubmit.length === 0) {
            toast.warning("No changes detected to submit.");
            return;
        }

        if (!auditTitle.trim()) {
            toast.warning("Please provide a title or reference for this audit (e.g., 'Year End Count').");
            return;
        }



        setSubmitting(true);

        const auditPayload = {
            title: auditTitle,
            approverIds: selectedApprover ? [selectedApprover] : [],
            approvalPolicy: "ALL",
            items: itemsToSubmit.map(batch => ({
                productId: batch.product.id,
                productName: batch.product.name,
                batchId: batch.id,
                batchNo: batch.batchNo,
                oldQuantity: batch.quantity,
                newQuantity: Number(adjustments[batch.id]),
                adjustmentQuantity: Number(adjustments[batch.id]) - batch.quantity,
                reason: "Manual Stock Taking"
            }))
        };

        try {
            await api.post('/inventory/adjustments/audit', auditPayload);
            toast.success("Stock audit submitted successfully for approval!");
            setAdjustments({});
            setAuditTitle('');
        } catch (err) {
            console.error("Error submitting audit:", err);
            toast.error("Failed to submit stock audit.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter logic
    const filteredBatches = batches.filter(batch => {
        const matchSearch = (batch.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (batch.batchNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (batch.locationId || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'CHANGED') {
            const physicalQty = adjustments[batch.id];
            const isChanged = physicalQty !== undefined && physicalQty !== '' && parseFloat(physicalQty) !== batch.quantity;
            return matchSearch && isChanged;
        }
        return matchSearch;
    });

    if (loading) return <main className="stock-taking-page" aria-busy="true"><div className="stock-taking-loading" role="status"><Spinner animation="border" /> <span>Loading stock batches…</span></div></main>;

    return (
        <Container fluid className="stock-taking-page operational-workspace">
            <header className="stock-taking-header">
                <div className="stock-taking-heading">
                    <button type="button" className="stock-taking-back" aria-label="Go back" onClick={() => navigate(-1)}><ArrowLeft size={18} aria-hidden="true" /></button>
                    <div><span className="stock-taking-eyebrow">INVENTORY · CONTROLLED COUNT</span><h1>Manual stock taking</h1><p>Record physical quantities against system batches and submit only reviewed discrepancies for approval.</p></div>
                </div>
                <div className="stock-taking-count" aria-live="polite"><strong>{getAdjustedBatches().length}</strong><span>changed items</span></div>
            </header>
            <section className="stock-taking-workspace" aria-label="Stock audit setup">
                <Card className="stock-taking-card">
                <Card.Body>
                    <Row className="align-items-center g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Audit Reference / Title</Form.Label>
                                    <Form.Control
                                    aria-label="Audit reference or title"
                                    type="text"
                                    value={auditTitle}
                                    onChange={(e) => setAuditTitle(e.target.value)}
                                    placeholder="e.g. Q4 Inventory Count"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Assign Approver (Optional)</Form.Label>
                                <Select
                                    inputId="stock-taking-approver"
                                    aria-label="Assign approver"
                                    options={[
                                        { value: '', label: 'Auto-Assign (Workflow)' },
                                        ...approvers.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.accessLevel})` }))
                                    ]}
                                    value={
                                        selectedApprover
                                            ? { value: selectedApprover, label: approvers.find(u => u.id === selectedApprover) ? `${approvers.find(u => u.id === selectedApprover).firstName} ${approvers.find(u => u.id === selectedApprover).lastName} (${approvers.find(u => u.id === selectedApprover).accessLevel})` : selectedApprover }
                                            : { value: '', label: 'Auto-Assign (Workflow)' }
                                    }
                                    onChange={(opt) => setSelectedApprover(opt ? opt.value : '')}
                                    isSearchable
                                    className="modern-select-container"
                                    classNamePrefix="modern-select"
                                />
                                <Form.Text className="text-muted">
                                    Leave blank to use configured workflow roles.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={4} className="text-secondary stock-taking-change-summary">Changes: {getAdjustedBatches().length} items</Col>
                        <Col md={2}>
                            <Button
                                variant="primary"
                                className="w-100"
                                onClick={handleSubmitAudit}
                                disabled={submitting || getAdjustedBatches().length === 0}
                            >
                                {submitting ? 'Submitting...' : 'Submit Audit'}
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
                </Card>
            </section>

            <section className="stock-taking-filters" aria-label="Stock batch filters">
                <Row className="align-items-center g-3">
                    <Col md={6}>
                        <Form.Control
                            aria-label="Search product or batch"
                            type="text"
                            placeholder="Search Product or Batch"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </Col>
                    <Col md={6} className="stock-taking-tabs" role="tablist" aria-label="Stock batch views">
                        <Button
                            variant={activeTab === 'ALL' ? "secondary" : "outline-secondary"}
                            role="tab" aria-selected={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')}
                        >
                            All Batches
                        </Button>
                        <Button
                            variant={activeTab === 'CHANGED' ? "secondary" : "outline-secondary"}
                            role="tab" aria-selected={activeTab === 'CHANGED'} onClick={() => setActiveTab('CHANGED')}
                        >
                            Show Changes Only
                        </Button>
                    </Col>
                </Row>
            </section>

            <div className="stock-taking-table-scroll" tabIndex="0" aria-label="Stock taking batches table">
                <Table striped hover className="stock-taking-table mb-0">
                    <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 1 }}>
                        <tr>
                            <th scope="col">Product Name</th><th scope="col">Batch No</th><th scope="col">Location</th><th scope="col">Expiry</th>
                            <th scope="col" className="text-end">System Qty</th><th scope="col" className="text-center" style={{ width: '150px' }}>Physical Qty</th><th scope="col" className="text-end">Difference</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBatches.map((batch) => {
                            const physicalRef = adjustments[batch.id];
                            const diff = calculateDifference(batch.quantity, physicalRef);
                            const hasChange = physicalRef !== undefined && physicalRef !== '' && diff !== 0;

                            return (
                                <tr key={batch.id} className={hasChange ? 'table-warning' : ''}>
                                    <td>{batch.product.name}</td>
                                    <td>{batch.batchNumber || 'No Batch No'}</td>
                                    <td>
                                        <Badge bg={batch.locationId === 'LOC_STORES_MAIN' ? 'success' : 'secondary'}>
                                            {batch.locationId === 'LOC_STORES_MAIN'
                                                ? `Main Store${batch.legacyLocation ? ' (Legacy)' : ''}`
                                                : (batch.locationId || '-')}
                                        </Badge>
                                    </td>
                                    <td>{batch.expiryDate}</td>
                                    <td className="text-end">{batch.quantity}</td>
                                    <td className="text-center">
                                        <Form.Control
                                            aria-label={`Physical quantity for ${batch.product.name}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            size="sm"
                                            value={adjustments[batch.id] !== undefined ? adjustments[batch.id] : ''} // Controlled component
                                            placeholder={batch.quantity.toString()}
                                            onChange={(e) => handleQuantityChange(batch.id, e.target.value)}
                                            style={{ textAlign: 'center' }}
                                        />
                                    </td>
                                    <td className={`text-end fw-bold ${diff < 0 ? 'text-danger' : diff > 0 ? 'text-success' : 'text-muted'}`}>
                                        {diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredBatches.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-4 text-muted">No batches found.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
};

export default StockTakingPage;
