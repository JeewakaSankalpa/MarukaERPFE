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

const StockTakingPage = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
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
            setError(null);
        } catch (err) {
            console.error("Error fetching batches:", err);
            setError("Failed to load stock batches.");
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
            setError("No changes detected to submit.");
            return;
        }

        if (!auditTitle.trim()) {
            setError("Please provide a title or reference for this audit (e.g., 'Year End Count').");
            return;
        }



        setSubmitting(true);
        setError(null);

        const auditPayload = {
            title: auditTitle,
            approverIds: selectedApprover ? [selectedApprover] : [],
            approvalPolicy: "ALL",
            items: itemsToSubmit.map(batch => ({
                productId: batch.product.id,
                productName: batch.product.name,
                batchId: batch.id,
                batchNo: batch.batchNumber,
                oldQuantity: batch.quantity,
                newQuantity: parseInt(adjustments[batch.id]),
                adjustmentQuantity: parseInt(adjustments[batch.id]) - batch.quantity,
                reason: "Manual Stock Taking"
            }))
        };

        try {
            await api.post('/inventory/adjustments/audit', auditPayload);
            setSuccess("Stock audit submitted successfully for approval!");
            setAdjustments({});
            setAuditTitle('');
        } catch (err) {
            console.error("Error submitting audit:", err);
            setError("Failed to submit stock audit.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter logic
    const filteredBatches = batches.filter(batch => {
        const matchSearch = batch.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'CHANGED') {
            const physicalQty = adjustments[batch.id];
            const isChanged = physicalQty !== undefined && physicalQty !== '' && parseFloat(physicalQty) !== batch.quantity;
            return matchSearch && isChanged;
        }
        return matchSearch;
    });

    if (loading) return <div className="d-flex justify-content-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container fluid className="p-4">
            <h3 className="mb-4">Manual Stock Taking</h3>

            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Row className="align-items-center g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Audit Reference / Title</Form.Label>
                                <Form.Control
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
                                <Form.Select
                                    value={selectedApprover}
                                    onChange={(e) => setSelectedApprover(e.target.value)}
                                >
                                    <option value="">Auto-Assign (Workflow)</option>
                                    {approvers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.firstName} {u.lastName} ({u.accessLevel})
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Leave blank to use configured workflow roles.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={4} className="text-secondary">
                            Changes: {getAdjustedBatches().length} items
                        </Col>
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

            <Card className="mb-4 shadow-sm p-3 bg-light">
                <Row className="align-items-center g-3">
                    <Col md={6}>
                        <Form.Control
                            type="text"
                            placeholder="Search Product or Batch"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </Col>
                    <Col md={6} className="d-flex gap-2">
                        <Button
                            variant={activeTab === 'ALL' ? "secondary" : "outline-secondary"}
                            onClick={() => setActiveTab('ALL')}
                        >
                            All Batches
                        </Button>
                        <Button
                            variant={activeTab === 'CHANGED' ? "secondary" : "outline-secondary"}
                            onClick={() => setActiveTab('CHANGED')}
                        >
                            Show Changes Only
                        </Button>
                    </Col>
                </Row>
            </Card>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }} className="border rounded">
                <Table striped hover responsive className="mb-0">
                    <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 1 }}>
                        <tr>
                            <th>Product Name</th>
                            <th>Batch No</th>
                            <th>Expiry</th>
                            <th className="text-end">System Qty</th>
                            <th className="text-center" style={{ width: '150px' }}>Physical Qty</th>
                            <th className="text-end">Difference</th>
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
                                    <td>{batch.batchNumber}</td>
                                    <td>{batch.expiryDate}</td>
                                    <td className="text-end">{batch.quantity}</td>
                                    <td className="text-center">
                                        <Form.Control
                                            type="number"
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
                                <td colSpan={6} className="text-center py-4 text-muted">No batches found.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
};

export default StockTakingPage;
