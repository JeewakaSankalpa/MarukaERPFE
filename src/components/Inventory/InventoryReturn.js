import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card } from 'react-bootstrap';
import api from '../../api/api';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SafeSelect from '../ReusableComponents/SafeSelect';

function InventoryReturn() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');

    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');

    const [returnQty, setReturnQty] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProductsWithStock = async () => {
            try {
                // Only fetch products that have stock in the main store!
                const res = await api.get('/inventory/available-summary?locationId=LOC_STORES_MAIN');
                const content = res.data || [];
                setProducts(content.map(p => ({
                    value: p.productId,
                    label: `${p.productName} (Main Store Qty: ${p.mainStoreQuantity})`,
                    productName: p.productName
                })));
            } catch (err) {
                console.error("Failed to load products with stock", err);
                toast.error("Failed to load available products.");
            }
        };
        fetchProductsWithStock();
    }, []);

    const handleProductSelect = async (e) => {
        const productId = e.target.value;
        setSelectedProduct(productId);
        setSelectedBatch('');
        setBatches([]);
        setReturnQty('');

        if (productId) {
            try {
                // Fetch available batches for the chosen product
                const res = await api.get(`/inventory/available-batches?productId=${productId}`);
                const data = res.data || [];
                // Only allow returning from Main Store
                const mainBatches = data.filter(b => b.locationId === "LOC_STORES_MAIN" && b.quantity > 0);
                
                setBatches(mainBatches.map(b => ({
                    value: b.id,
                    label: `Batch: ${b.batchNumber} (Available: ${b.quantity})`,
                    raw: b
                })));
            } catch (err) {
                console.error("Failed to load batches", err);
                toast.error("Failed to load batches for product");
            }
        }
    };

    const handleBatchSelect = (e) => {
        setSelectedBatch(e.target.value);
        setReturnQty('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !selectedBatch) {
            toast.warning("Please select a Product and a Batch.");
            return;
        }

        const batchData = batches.find(b => b.value === selectedBatch)?.raw;
        const prodData = products.find(p => p.value === selectedProduct);

        if (!batchData) return;

        const maxQty = batchData.quantity;
        const qty = Number(returnQty);

        if (qty <= 0) {
            toast.warning("Quantity must be greater than 0");
            return;
        }
        if (qty > maxQty) {
            toast.error(`Cannot return more than available quantity (${maxQty})`);
            return;
        }

        setIsSubmitting(true);
        try {
            // We need supplierId/Name. The available-summary doesn't have it, but the backend 
            // accepts 'UNKNOWN' and resolves it if needed. Or we can just pass 'UNKNOWN'.
            const payload = {
                supplierId: 'UNKNOWN',
                supplierName: 'Unknown Supplier',
                productId: prodData.value,
                productName: prodData.productName,
                batchId: batchData.id,
                batchNo: batchData.batchNumber,
                quantity: qty,
                unitCost: batchData.costPrice,
                reason: reason
            };

            await api.post('/inventory/returns/supplier', payload);
            toast.success("Supplier Return Request created successfully! Sent for approval.");
            
            // Reset form
            setSelectedProduct('');
            setSelectedBatch('');
            setReturnQty('');
            setReason('');
        } catch (error) {
            console.error('Failed to submit return:', error);
            toast.error(error.response?.data?.message || 'Failed to submit return request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedBatchData = batches.find(b => b.value === selectedBatch)?.raw;

    return (
        <Container className="py-4" style={{ maxWidth: '800px' }}>
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0">Create Supplier Return</h2>
            </div>

            <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                    <Form onSubmit={handleSubmit}>
                        <Row className="mb-4">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">1. Select Product</Form.Label>
                                    <SafeSelect
                                        name="product"
                                        value={selectedProduct}
                                        onChange={handleProductSelect}
                                        placeholder="Search by product name..."
                                        isSearchable={true}
                                    >
                                        <option value="">Select a product...</option>
                                        {products.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </SafeSelect>
                                </Form.Group>
                            </Col>
                        </Row>

                        {selectedProduct && (
                            <Row className="mb-4">
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold">2. Select Batch from Main Store</Form.Label>
                                        <SafeSelect
                                            name="batch"
                                            value={selectedBatch}
                                            onChange={handleBatchSelect}
                                            placeholder="Select a batch..."
                                            isDisabled={batches.length === 0}
                                        >
                                            <option value="">Select a batch...</option>
                                            {batches.map(b => (
                                                <option key={b.value} value={b.value}>{b.label}</option>
                                            ))}
                                        </SafeSelect>
                                        {batches.length === 0 && (
                                            <Form.Text className="text-danger">
                                                No active stock available in the Main Store for this product.
                                            </Form.Text>
                                        )}
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}

                        {selectedBatchData && (
                            <div className="bg-light p-3 rounded mb-4">
                                <h6 className="mb-3 text-muted">Batch Details</h6>
                                <Row className="mb-3">
                                    <Col md={4}>
                                        <Form.Label className="small text-muted mb-1">Max Returnable</Form.Label>
                                        <div className="fw-bold text-success fs-5">{selectedBatchData.quantity} Units</div>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label className="small text-muted mb-1">Unit Cost</Form.Label>
                                        <div className="fw-bold">Rs. {selectedBatchData.costPrice?.toLocaleString() || '0.00'}</div>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label className="small text-muted mb-1">Expiry Date</Form.Label>
                                        <div className="fw-bold">{selectedBatchData.expiryDate ? new Date(selectedBatchData.expiryDate).toLocaleDateString() : 'N/A'}</div>
                                    </Col>
                                </Row>

                                <hr />

                                <Row className="mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Return Quantity</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min="1"
                                                max={selectedBatchData.quantity}
                                                value={returnQty}
                                                onChange={(e) => setReturnQty(e.target.value)}
                                                required
                                                placeholder={`Max: ${selectedBatchData.quantity}`}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Total Return Value</Form.Label>
                                            <Form.Control
                                                type="text"
                                                disabled
                                                value={`Rs. ${((Number(returnQty) || 0) * (Number(selectedBatchData.costPrice) || 0)).toLocaleString()}`}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Reason for Return</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="e.g., Damaged items, expired, incorrect item..."
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="light" onClick={() => navigate(-1)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                variant="primary" 
                                disabled={isSubmitting || !selectedProduct || !selectedBatch || !returnQty}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

export default InventoryReturn;
