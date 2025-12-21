import React, { useState, useEffect } from 'react';
import { Table, Container, Form, Button, Row, Col, Modal } from 'react-bootstrap';
import Select from 'react-select';
import api from '../../api/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QRCodeSVG as QRCode } from 'qrcode.react';

function InventoryView() {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [locationOptions, setLocationOptions] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [genericNameFilter, setGenericNameFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [expiryFilter, setExpiryFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [batchDetails, setBatchDetails] = useState([]);
    const [userName, setUserName] = useState('');

    // Return to Supplier State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnBatch, setReturnBatch] = useState(null);
    const [returnData, setReturnData] = useState({ quantity: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchInventory();
        fetchLocations();
        setUserName(localStorage.getItem('userName') || '');
    }, []);

    const ensureSingleStoreFallback = (stores) => {
        // If no stores returned, fall back to a single default store
        if (!stores || stores.length === 0) {
            return [{ value: 'MAIN_STORE', label: 'Main Store' }];
        }
        // Map to Select options; assume backend returns {id,name} OR just {name}
        return stores.map((loc) => ({
            value: loc.id || loc.name || 'MAIN_STORE',
            label: loc.name || 'Main Store',
        }));
    };

    const fetchInventory = async () => {
        try {
            // Use the new lightweight summary endpoint
            const response = await api.get('/inventory/available-summary');
            const items = response.data || [];
            // items: [{ productId, productName, totalQuantity, mainStoreQuantity }, ...]

            setInventoryItems(items);
            setFilteredItems(items);

            // Note: We can no longer extract ALL locations from the summary.
            // If the user needs to filter by location, we might need a separate call 
            // OR rely on the "Detailed" view.
            // However, the request specifically asked for Main Store qty.
            // We can pre-load Store list though.

            toast.success(`Fetched ${items.length} inventory item(s)`);
        } catch (error) {
            console.error('Failed to fetch inventory items:', error);
            toast.error('Failed to load inventory items');
            setInventoryItems([]);
            setFilteredItems([]);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await api.get('/store/all');
            const options = ensureSingleStoreFallback(response.data);
            setLocationOptions(options);

            // Default select "Main Store" if it exists? No, user might want "All"
        } catch (error) {
            console.error('Failed to fetch locations:', error);
            const options = ensureSingleStoreFallback([]);
            setLocationOptions(options);
        }
    };

    const fetchBatchDetails = async (productId) => {
        try {
            const response = await api.get(`/inventory/available-batches?productId=${productId}`);
            setBatchDetails(response.data || []);
            toast.info(`Loaded ${response.data?.length || 0} batch(es)`);
        } catch (error) {
            console.error('Failed to fetch batch details:', error);
            toast.error('Failed to load batch details');
            setBatchDetails([]);
        }
    };

    const applyFilters = () => {
        let filtered = (inventoryItems || []);

        if (genericNameFilter) {
            const q = genericNameFilter.toLowerCase();
            filtered = filtered.filter((item) => item.productName?.toLowerCase().includes(q));
        }

        // Supplier Filter: The Summary DTO does NOT have supplier info.
        // We cannot filter by supplier in this view anymore unless we fetch it.
        // User agreed: "Other stuff can be loaded when we click on a product"
        // So we might disable Supplier Filter or warn user.
        // Or we assume it won't work.

        // Expiry Filter: Summary DTO does not have expiry.
        // Same constraint.

        // Location Filter: 
        // Logic change: The Summary DTO has `mainStoreQuantity` and `totalQuantity`.
        // It does NOT have per-project quantities. 
        // If the user selects "Main Store", we can check `mainStoreQuantity`.
        // If they select a Project, we don't have that data in summary.
        // We will just filter based on what we have (Main Store vs Total).

        if (selectedLocations.length > 0) {
            const wantsMainStore = selectedLocations.some(l => l.value === 'MAIN_STORE' || l.label === 'Main Store');
            // If they want specific projects, we can't show that in summary view. 
            // We'll trust "Total Quantity" usually implies "All".
            // But if they ONLY want Main Store, we can filtering items where mainStoreQuantity > 0 ?
            // Or maybe we treat `availableQuantity` display column as dynamic.

            // Let's simplified calculation for Table Display:
            // If Main Store selected -> Show Main Store Qty
            // Else -> Show Total (or 0 if we can't determine)
            // The user mainly cares about "Quantity in selected Store".
        }

        setFilteredItems(filtered);
    };

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        fetchBatchDetails(product.productId);
        setShowModal(true);
    };

    const handleStoreClick = (product, store) => {
        const label = store.ownerType === 'PROJECT' ? `Project: ${store.ownerId}` :
            store.ownerType === 'DEPARTMENT' ? `Department: ${store.ownerId}` :
                locationOptions.find((loc) => loc.value === (store.locationId || 'MAIN_STORE'))?.label ||
                store.locationId ||
                'Main Store';
        alert(`Product: ${product.productName}\nLocation: ${label}\nQuantity: ${store.quantity}`);
    };

    const handleReturnClick = (batch) => {
        setReturnBatch(batch);
        setReturnData({ quantity: '', reason: '' });
        setShowReturnModal(true);
    };

    const submitReturn = async () => {
        if (!returnData.quantity || !returnBatch) {
            toast.warn('Quantity is required');
            return;
        }
        try {
            setSubmitting(true);
            await api.post('/inventory/returns/supplier', {
                supplierId: selectedProduct?.product?.supplierId || 'UNKNOWN',
                supplierName: selectedProduct?.product?.supplierName || 'Unknown',
                productId: selectedProduct?.productId,
                productName: selectedProduct?.productName,
                batchId: returnBatch.id,
                batchNo: returnBatch.batchNumber || returnBatch.batchNo,
                quantity: Number(returnData.quantity),
                reason: returnData.reason
            });
            toast.success('Return request created');
            setShowReturnModal(false);
            // Refresh batches
            fetchBatchDetails(selectedProduct.productId);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to create return request');
        } finally {
            setSubmitting(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(14);
        doc.text('Inventory View Report', 105, 10, { align: 'center' });

        const currentDate = new Date().toLocaleString();
        doc.setFontSize(10);
        doc.text(`Generated By: ${userName}`, 10, 20);
        doc.text(`Generated On: ${currentDate}`, 10, 25);

        doc.setFontSize(12);
        doc.text('Filters Applied:', 10, 35);

        let y = 40;
        if (selectedLocations.length > 0) {
            const locations = selectedLocations.map((loc) => loc.label).join(', ');
            doc.text(`Locations: ${locations}`, 10, y);
            y += 5;
        }
        if (genericNameFilter) {
            doc.text(`Generic Name Filter: ${genericNameFilter}`, 10, y);
            y += 5;
        }
        if (supplierFilter) {
            doc.text(`Supplier Filter: ${supplierFilter}`, 10, y);
            y += 5;
        }
        if (expiryFilter) {
            const map = {
                '1week': 'Within 1 Week',
                '2weeks': 'Within 2 Weeks',
                '1month': 'Within 1 Month',
                '3months': 'Within 3 Months',
            };
            doc.text(`Expiry Filter: ${map[expiryFilter] || 'Not Applied'}`, 10, y);
            y += 5;
        }
        if (y > 40) y += 5;

        const tableHead = [['Product Name', 'Total Qty', 'Qty in Selected Stores', 'Available Stores']];
        const tableRows = (filteredItems || []).map((item) => [
            item.productName,
            item.totalQuantity,
            item.availableQuantity,
            (item.availableStores || [])
                .map((store) => {
                    const label =
                        locationOptions.find((loc) => loc.value === (store.locationId || 'MAIN_STORE'))?.label ||
                        store.locationId ||
                        'Main Store';
                    return `${label}: ${store.quantity}`;
                })
                .join('\n'),
        ]);

        doc.autoTable({
            head: tableHead,
            body: tableRows,
            startY: y,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [135, 206, 235] },
        });

        const pdfData = doc.output('blob');
        const pdfURL = URL.createObjectURL(pdfData);
        const printWindow = window.open(pdfURL, '_blank');
        if (printWindow) {
            printWindow.onload = () => printWindow.print();
        } else {
            console.error("Couldn't open print window. Check popup settings.");
            toast.error('Popup blocked. Allow popups to print.');
        }
    };

    return (
        <Container className="my-5">
            <h2 className="text-center mb-4">Inventory Summary</h2>

            <Form className="mb-4">
                <Row>
                    {/* Simplified Filters - Removed Location/Expiry/Supplier for Summary View stability */}
                    <Col md={6}>
                        <Form.Group controlId="genericNameFilter">
                            <Form.Label>Product Name Search</Form.Label>
                            <Form.Control
                                type="text"
                                value={genericNameFilter}
                                onChange={(e) => setGenericNameFilter(e.target.value)}
                                placeholder="Enter product name..."
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6} className="d-flex align-items-end">
                        <div className="text-muted small">
                            Note: For detailed batch/expiry/supplier info and specific location quantities, click on a product row.
                        </div>
                    </Col>
                </Row>
                <div className="d-flex justify-content-between mt-3">
                    <Button variant="primary" onClick={applyFilters}>
                        Filter
                    </Button>
                    <Button variant="secondary" onClick={generatePDF}>
                        Print View
                    </Button>
                </div>
            </Form>

            <Table bordered hover responsive className="text-center">
                <thead className="table-primary">
                    <tr>
                        <th>Product Name</th>
                        <th>Total Quantity (All)</th>
                        <th>Main Store Qty</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {(filteredItems || []).map((item) => (
                        <tr
                            key={item.productId}
                            onClick={() => handleProductClick(item)}
                            style={{ cursor: 'pointer' }}
                        >
                            <td>{item.productName}</td>
                            <td>{item.totalQuantity}</td>
                            <td>{item.mainStoreQuantity}</td>
                            <td>
                                <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); handleProductClick(item); }}>
                                    View Details
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Modals remain same ... */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Details: {selectedProduct?.productName}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p><strong>Total (All):</strong> {selectedProduct?.totalQuantity} | <strong>Main Store:</strong> {selectedProduct?.mainStoreQuantity}</p>
                    <hr />
                    <h5>Batch Breakdown</h5>
                    {/* ... Existing Batch Table ... */}
                    <Table bordered hover responsive className="text-center">
                        <thead className="table-primary">
                            <tr>
                                <th>Batch / Serial</th>
                                <th>Qty</th>
                                <th>Expiry</th>
                                <th>Location</th>
                                <th>QR / Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(batchDetails || []).map((batch) => (
                                <tr key={batch.id}>
                                    <td>
                                        <div>{batch.batchNumber || batch.batchNo || '-'}</div>
                                        <small className="text-muted">{batch.id}</small>
                                    </td>
                                    <td>{batch.quantity}</td>
                                    <td>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}</td>
                                    <td>
                                        {batch.ownerType === 'PROJECT' ? `Proj: ${batch.ownerId}` :
                                            batch.ownerType === 'DEPARTMENT' ? `Dept: ${batch.ownerId}` :
                                                (batch.locationId === 'LOC_STORES_MAIN' ? 'Main Store' : batch.locationId)}
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2 justify-content-center align-items-center">
                                            <div style={{ background: 'white', padding: '2px' }}>
                                                <QRCode
                                                    value={`V1|${batch.id}|${selectedProduct?.productName}|${batch.quantity}`}
                                                    size={48}
                                                />
                                            </div>
                                            <Button size="sm" variant="outline-danger" onClick={() => handleReturnClick(batch)}>Return</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Supplier Return Modal (Same) */}
            <Modal show={showReturnModal} onHide={() => setShowReturnModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Return to Supplier</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Batch:</strong> {returnBatch?.batchNumber || returnBatch?.batchNo}<br />
                        <strong>Qty Avail:</strong> {returnBatch?.quantity}
                    </div>
                    <Form.Group className="mb-2">
                        <Form.Label>Return Qty</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            max={returnBatch?.quantity || 0}
                            value={returnData.quantity}
                            onChange={e => setReturnData({ ...returnData, quantity: e.target.value })}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Reason</Form.Label>
                        <Form.Control as="textarea" rows={2} value={returnData.reason} onChange={e => setReturnData({ ...returnData, reason: e.target.value })} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={submitReturn} disabled={submitting}>Confirm</Button>
                </Modal.Footer>
            </Modal>

            <ToastContainer position="top-right" autoClose={2500} />
        </Container>
    );
}

// ... helper functions ...
// Ensure fetchInventory uses /available-summary


export default InventoryView;
