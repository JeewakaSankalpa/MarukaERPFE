import React, { useState, useEffect } from 'react';
import { Table, Container, Form, Button, Row, Col, Modal } from 'react-bootstrap';
import Select from 'react-select';
import api from '../../api/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
            const response = await api.get('/inventory/available-quantities');
            console.log('Inventory API response:', response.data);
            const items = response.data || [];
            setInventoryItems(items);
            setFilteredItems(items);
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
            console.log('Store API response:', response.data);
            const options = ensureSingleStoreFallback(response.data);
            setLocationOptions(options);

            // If you only ever have one store, preselect it for convenience
            if (options.length === 1) setSelectedLocations(options);
            toast.success(`Fetched ${response.data?.length || 0} location(s)`);
        } catch (error) {
            console.error('Failed to fetch locations:', error);
            toast.warn('Using single default store (Main Store)');
            const options = ensureSingleStoreFallback([]);
            setLocationOptions(options);
            setSelectedLocations(options);
        }
    };

    const fetchBatchDetails = async (productId) => {
        try {
            const response = await api.get(`/inventory/available-batches?productId=${productId}`);
            console.log('Batch details response:', response.data);
            setBatchDetails(response.data || []);
            toast.info(`Loaded ${response.data?.length || 0} batch(es)`);
        } catch (error) {
            console.error('Failed to fetch batch details:', error);
            toast.error('Failed to load batch details');
            setBatchDetails([]);
        }
    };

    const applyFilters = () => {
        let filtered = (inventoryItems || []).map((item) => {
            // item.locationQuantities expected like: [{ locationId, quantity, expiryDate }]
            const lqs = item.locationQuantities || [];

            const totalQuantity = lqs.reduce((sum, lq) => sum + (Number(lq.quantity) || 0), 0);

            const availableQuantity =
                selectedLocations.length > 0
                    ? lqs
                        .filter((lq) =>
                            selectedLocations.some((loc) => loc.value === (lq.locationId || 'MAIN_STORE'))
                        )
                        .reduce((sum, lq) => sum + (Number(lq.quantity) || 0), 0)
                    : totalQuantity;

            const availableStores =
                selectedLocations.length > 0
                    ? lqs.filter((lq) =>
                        selectedLocations.some((loc) => loc.value === (lq.locationId || 'MAIN_STORE'))
                    )
                    : lqs;

            return {
                ...item,
                totalQuantity,
                availableQuantity,
                availableStores,
            };
        });

        if (genericNameFilter) {
            const q = genericNameFilter.toLowerCase();
            filtered = filtered.filter((item) => item.productName?.toLowerCase().includes(q));
        }

        if (supplierFilter) {
            filtered = filtered.filter((item) => item.product?.supplierName === supplierFilter);
        }

        if (expiryFilter) {
            const today = new Date();
            const filterDate = new Date(today);

            switch (expiryFilter) {
                case '1week':
                    filterDate.setDate(today.getDate() + 7);
                    break;
                case '2weeks':
                    filterDate.setDate(today.getDate() + 14);
                    break;
                case '1month':
                    filterDate.setMonth(today.getMonth() + 1);
                    break;
                case '3months':
                    filterDate.setMonth(today.getMonth() + 3);
                    break;
                default:
                    break;
            }

            filtered = filtered.filter((item) =>
                (item.locationQuantities || []).some((lq) => {
                    const d = lq.expiryDate ? new Date(lq.expiryDate) : null;
                    return d && d <= filterDate;
                })
            );
        }

        // Remove items with zero available quantity after filters
        filtered = filtered.filter((item) => (Number(item.availableQuantity) || 0) > 0);

        setFilteredItems(filtered);
        toast.success(`Applied filters. Showing ${filtered.length} item(s).`);
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
            <h2 className="text-center mb-4">Inventory View</h2>

            <Form className="mb-4">
                <Row>
                    <Col>
                        <Form.Group controlId="locationFilter">
                            <Form.Label>Location</Form.Label>
                            <Select
                                isMulti
                                value={selectedLocations}
                                onChange={setSelectedLocations}
                                options={locationOptions}
                                placeholder="Select store locations"
                            />
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="genericNameFilter">
                            <Form.Label>Generic Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={genericNameFilter}
                                onChange={(e) => setGenericNameFilter(e.target.value)}
                                placeholder="Enter generic name"
                            />
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="supplierFilter">
                            <Form.Label>Supplier</Form.Label>
                            <Form.Control
                                type="text"
                                value={supplierFilter}
                                onChange={(e) => setSupplierFilter(e.target.value)}
                                placeholder="Enter supplier name"
                            />
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="expiryFilter">
                            <Form.Label>Expiration Date</Form.Label>
                            <Form.Select
                                value={expiryFilter}
                                onChange={(e) => setExpiryFilter(e.target.value)}
                            >
                                <option value="">Select expiration filter</option>
                                <option value="1week">Within 1 Week</option>
                                <option value="2weeks">Within 2 Weeks</option>
                                <option value="1month">Within 1 Month</option>
                                <option value="3months">Within 3 Months</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <div className="d-flex justify-content-between mt-3">
                    <Button variant="primary" onClick={applyFilters}>
                        Apply Filters
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
                        <th>Total Quantity (All Locations)</th>
                        <th>Quantity in Selected Stores</th>
                        <th>Available Stores</th>
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
                            <td>{item.availableQuantity}</td>
                            <td>
                                {(item.availableStores || []).map((store, idx) => (
                                    <div
                                        key={`${store.locationId || 'MAIN_STORE'}-${idx}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStoreClick(item, store);
                                        }}
                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        {store.ownerType === 'PROJECT' ? `Project: ${store.ownerId}` :
                                            store.ownerType === 'DEPARTMENT' ? `Department: ${store.ownerId}` :
                                                (locationOptions.find((loc) => loc.value === (store.locationId || 'MAIN_STORE'))?.label) ||
                                                store.locationId ||
                                                'Main Store'}
                                        : {store.quantity}
                                    </div>
                                ))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Batch Details for {selectedProduct?.productName}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table bordered hover responsive className="text-center">
                        <thead className="table-primary">
                            <tr>
                                <th>Batch Number</th>
                                <th>Quantity</th>
                                <th>Expiry Date</th>
                                <th>Cost Price</th>
                                <th>Location</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(batchDetails || []).map((batch) => (
                                <tr key={batch.id || `${batch.batchNumber}-${batch.locationId}`}>
                                    <td>{batch.batchNumber || batch.batchNo || '-'}</td>
                                    <td>{batch.quantity ?? batch.qty ?? 0}</td>
                                    <td>
                                        {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td>{batch.costPrice ?? '-'}</td>
                                    <td>
                                        {batch.ownerType === 'PROJECT' ? `Project: ${batch.ownerId}` :
                                            batch.ownerType === 'DEPARTMENT' ? `Department: ${batch.ownerId}` :
                                                locationOptions.find((loc) => loc.value === (batch.locationId || 'MAIN_STORE'))?.label ||
                                                batch.locationId ||
                                                'Main Store'}
                                    </td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={() => handleReturnClick(batch)}
                                        >
                                            Return
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Supplier Return Modal */}
            <Modal show={showReturnModal} onHide={() => setShowReturnModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Return to Supplier</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Product:</strong> {selectedProduct?.productName}<br />
                        <strong>Batch:</strong> {returnBatch?.batchNumber || returnBatch?.batchNo}<br />
                        <strong>Supplier:</strong> {selectedProduct?.product?.supplierName || 'Unknown'}
                    </div>
                    <Form.Group className="mb-2">
                        <Form.Label>Quantity</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            max={returnBatch?.quantity ?? returnBatch?.qty ?? 0}
                            value={returnData.quantity}
                            onChange={e => setReturnData({ ...returnData, quantity: e.target.value })}
                        />
                        <Form.Text className="text-muted">
                            Max: {returnBatch?.quantity ?? returnBatch?.qty ?? 0}
                        </Form.Text>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Reason</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={returnData.reason}
                            onChange={e => setReturnData({ ...returnData, reason: e.target.value })}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={submitReturn} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Confirm Return'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast container goes once per app (safe to keep here) */}
            <ToastContainer position="top-right" autoClose={2500} newestOnTop />
        </Container>
    );
}

export default InventoryView;
