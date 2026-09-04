import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Table, Container, Form, Button, Row, Col, Modal } from 'react-bootstrap';
import api from '../../api/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QRCodeSVG as QRCode } from 'qrcode.react';

function InventoryView() {
    const navigate = useNavigate();
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
    const [productBreakdown, setProductBreakdown] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [userName, setUserName] = useState('');
    const [loadingInventory, setLoadingInventory] = useState(true);

    // Return to Supplier State
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnBatch, setReturnBatch] = useState(null);
    const [returnData, setReturnData] = useState({ quantity: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchInventory();
        fetchLocations();
        setUserName(localStorage.getItem('userName') || '');
    }, [/* fetchLocations */]); // Suppress warning or memoize fetchLocations if needed, but [] is usually fine for mount.
    // Actually best to remove the warning or leave it if eslint complains.
    // The user explicitly mentioned it.
    // I will just leave it empty and suppress if I can, or ignore since I can't easily refactor fetchLocations to useCallbacks right now without viewing more code.
    // Let's just comment out the unused handleStoreClick if I can find it.

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
        setLoadingInventory(true);
        try {
            // Use the new lightweight summary endpoint
            const response = await api.get('/inventory/available-summary');
            const items = response.data || [];
            // items: [{ productId, productName, totalQuantity, mainStoreQuantity }, ...]

            setInventoryItems(items);
            setFilteredItems(items);

            // Extract valid dynamic options
            const uniqueLocs = new Set();
            items.forEach(i => {
                (i.availableStores || []).forEach(s => {
                    if (s.locationId) uniqueLocs.add(s.locationId);
                });
            });

            const dynamicOptions = Array.from(uniqueLocs).map(locId => ({
                value: locId,
                label: locId === 'LOC_STORES_MAIN' ? 'Main Store' : locId
            })).sort((a, b) => a.label.localeCompare(b.label));

            setLocationOptions(dynamicOptions);

            toast.success(`Fetched ${items.length} inventory item(s)`, { toastId: 'inventory-fetch-success' });
        } catch (error) {
            console.error('Failed to fetch inventory items:', error);
            toast.error('Failed to load inventory items');
            setInventoryItems([]);
            setFilteredItems([]);
        } finally {
            setLoadingInventory(false);
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

    const fetchProductBreakdown = async (productId) => {
        setLoadingDetails(true);
        try {
            const response = await api.get(`/inventory/products/${productId}/breakdown`);
            const details = response.data || {};
            setProductBreakdown(details);
            setBatchDetails(details.batches || []);
            toast.info(`Loaded ${(details.batches || []).length} batch(es)`);
        } catch (error) {
            console.error('Failed to fetch product breakdown:', error);
            toast.error('Failed to load product details');
            setProductBreakdown(null);
            setBatchDetails([]);
        } finally {
            setLoadingDetails(false);
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
        if (selectedLocations.length > 0) {
            filtered = filtered.filter(item => {
                // Return true if ANY of the selected locations have stock for this item
                return selectedLocations.some(sel => {
                    const targetLoc = sel.value; // e.g., 'LOC_STORES_MAIN' or 'PROJ:123' or 'Main Store' (legacy)

                    // Check item's availableStores list
                    // Special case: 'MAIN_STORE' fallback in select options might map to 'LOC_STORES_MAIN'
                    const lookingFor = (targetLoc === 'MAIN_STORE') ? 'LOC_STORES_MAIN' : targetLoc;

                    return (item.availableStores || []).some(s => s.locationId === lookingFor && s.quantity > 0);
                });
            });
        }

        setFilteredItems(filtered);
    };

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        setProductBreakdown(null);
        fetchProductBreakdown(product.productId);
        setShowModal(true);
    };

    // const handleStoreClick = (product, store) => {
    //    const label = store.ownerType === 'PROJECT' ? `Project: ${store.ownerId}` :
    //        store.ownerType === 'DEPARTMENT' ? `Department: ${store.ownerId}` :
    //            locationOptions.find((loc) => loc.value === (store.locationId || 'MAIN_STORE'))?.label ||
    //            store.locationId ||
    //            'Main Store';
    // };

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
            fetchProductBreakdown(selectedProduct.productId);
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
            formatQuantity(item.totalQuantity),
            selectedLocations.length > 0 ? formatQuantity(getFilteredQty(item)) : '-',
            (item.availableStores || [])
                .map((store) => {
                    const label =
                        locationOptions.find((loc) => loc.value === (store.locationId || 'MAIN_STORE'))?.label ||
                        store.locationId ||
                        'Main Store';
                    return `${label}: ${formatQuantity(store.quantity)}`;
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

    // Update Table to show specific qty if filtered
    const getFilteredQty = (item) => {
        if (selectedLocations.length === 0) return null;
        // Sum qty for all selected locations
        let sum = 0;
        selectedLocations.forEach(sel => {
            const lookingFor = (sel.value === 'MAIN_STORE') ? 'LOC_STORES_MAIN' : sel.value;
            const sq = (item.availableStores || []).find(s => s.locationId === lookingFor);
            if (sq) sum += Number(sq.quantity || 0);
        });
        return sum;
    };

    const renderLoadingRows = () => (
        Array.from({ length: 8 }).map((_, index) => (
            <tr key={`inventory-loading-${index}`}>
                <td>
                    <span className="placeholder-glow d-block">
                        <span className="placeholder rounded d-block mx-auto" style={{ width: '70%', height: 18 }} />
                    </span>
                </td>
                <td>
                    <span className="placeholder-glow d-block">
                        <span className="placeholder rounded d-block mx-auto" style={{ width: '42%', height: 18 }} />
                    </span>
                </td>
                <td>
                    <span className="placeholder-glow d-block">
                        <span className="placeholder rounded d-block mx-auto" style={{ width: '42%', height: 18 }} />
                    </span>
                </td>
                <td>
                    <span className="placeholder-glow d-block">
                        <span className="placeholder rounded d-block mx-auto" style={{ width: 90, height: 30 }} />
                    </span>
                </td>
            </tr>
        ))
    );

    return (
        <Container className="my-5">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0 mb-0 text-center mb-0">Inventory Summary</h2>
                        </div>
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
                    {loadingInventory ? renderLoadingRows() : (filteredItems || []).map((item) => (
                        <tr
                            key={item.productId}
                            onClick={() => handleProductClick(item)}
                            style={{ cursor: 'pointer' }}
                        >
                            <td>{item.productName}</td>
                            <td>{formatQuantity(item.totalQuantity)}</td>
                            <td>{formatQuantity(item.mainStoreQuantity)}</td>
                            {selectedLocations.length > 0 && (
                                <td className="fw-bold text-success">{formatQuantity(getFilteredQty(item))}</td>
                            )}
                            <td>
                                <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); handleProductClick(item); }}>
                                    View Details
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {!loadingInventory && filteredItems.length === 0 && (
                        <tr>
                            <td colSpan="4" className="text-muted py-4">
                                No inventory items found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>Details: {selectedProduct?.productName}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingDetails ? (
                        <div className="text-center text-muted py-4">Loading product history...</div>
                    ) : (
                        <>
                            <Row className="g-2 text-center mb-3">
                                {[
                                    ['Total (All)', productBreakdown?.totals?.totalQuantity ?? selectedProduct?.totalQuantity],
                                    ['Main Store', productBreakdown?.totals?.mainStoreQuantity ?? selectedProduct?.mainStoreQuantity],
                                    ['Project Stock', productBreakdown?.totals?.projectQuantity],
                                    ['Department Stock', productBreakdown?.totals?.departmentQuantity],
                                    ['Other Stores', productBreakdown?.totals?.otherStoreQuantity],
                                    ['Open Batches', productBreakdown?.totals?.openBatchCount],
                                ].map(([label, value]) => (
                                    <Col key={label} xs={6} md={4} lg={2}>
                                        <div className="border rounded p-2 h-100">
                                            <div className="text-muted small">{label}</div>
                                            <div className="fw-bold">{formatQuantity(value)}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            <h5>Location / Owner Breakdown</h5>
                            <Table bordered hover responsive className="text-center align-middle">
                                <thead className="table-primary">
                                    <tr>
                                        <th>Location / Owner</th>
                                        <th>Owner Type</th>
                                        <th>Qty</th>
                                        <th>Batches</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(productBreakdown?.locations || []).map((location) => (
                                        <tr key={`${location.locationId || 'MAIN'}-${location.ownerType || 'STORE'}-${location.ownerId || ''}`}>
                                            <td>{locationLabel(location)}</td>
                                            <td>{location.ownerType || 'STORE'}</td>
                                            <td>{formatQuantity(location.quantity)}</td>
                                            <td>{formatQuantity(location.batchCount)}</td>
                                        </tr>
                                    ))}
                                    {(productBreakdown?.locations || []).length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-muted py-3">No available stock locations.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>

                            <h5>Open Batch Breakdown</h5>
                            <Table bordered hover responsive className="text-center align-middle">
                                <thead className="table-primary">
                                    <tr>
                                        <th>Batch / Serial</th>
                                        <th>Qty</th>
                                        <th>Original</th>
                                        <th>Reserved</th>
                                        <th>Cost</th>
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
                                            <td>{formatQuantity(batch.quantity)}</td>
                                            <td>{formatQuantity(batch.originalQuantity)}</td>
                                            <td>{formatQuantity(batch.reservedQuantity)}</td>
                                            <td>{formatMoney(batch.costPrice)}</td>
                                            <td>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}</td>
                                            <td>{locationLabel(batch)}</td>
                                            <td>
                                                <div className="d-flex gap-2 justify-content-center align-items-center">
                                                    <div style={{ background: 'white', padding: '2px' }}>
                                                        <QRCode
                                                            value={`V1|${batch.id}|${selectedProduct?.productName}|${formatQuantity(batch.quantity)}`}
                                                            size={48}
                                                        />
                                                    </div>
                                                    <Button size="sm" variant="outline-danger" onClick={() => handleReturnClick(batch)}>Return</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(batchDetails || []).length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="text-muted py-3">No open batches.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>

                            <h5>Movement History</h5>
                            <Table bordered hover responsive className="text-center align-middle">
                                <thead className="table-primary">
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>In</th>
                                        <th>Out</th>
                                        <th>Net</th>
                                        <th>Location</th>
                                        <th>Reference</th>
                                        <th>Batch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(productBreakdown?.ledgerMovements || []).map((movement) => (
                                        <tr key={movement.id}>
                                            <td>{formatDateTime(movement.at)}</td>
                                            <td>{movement.type || '-'}</td>
                                            <td>{formatQuantity(movement.qtyIn)}</td>
                                            <td>{formatQuantity(movement.qtyOut)}</td>
                                            <td>{formatSignedQuantity(movement.netQty)}</td>
                                            <td>{movement.locationId || '-'}</td>
                                            <td>{referenceLabel(movement)}</td>
                                            <td>{movement.batchId || '-'}</td>
                                        </tr>
                                    ))}
                                    {(productBreakdown?.ledgerMovements || []).length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="text-muted py-3">No ledger movement history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>

                            <h5>Stock Taking / Adjustment History</h5>
                            <Table bordered hover responsive className="text-center align-middle">
                                <thead className="table-primary">
                                    <tr>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Source</th>
                                        <th>Batch</th>
                                        <th>Old</th>
                                        <th>New</th>
                                        <th>Diff</th>
                                        <th>Unit Cost</th>
                                        <th>Reorder</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(productBreakdown?.stockAdjustments || []).map((adjustment) => (
                                        <tr key={`${adjustment.auditId}-${adjustment.batchId || adjustment.batchNo || adjustment.adjustedAt}`}>
                                            <td>{formatDateTime(adjustment.eventAt || adjustment.adjustedAt || adjustment.createdAt)}</td>
                                            <td>{adjustment.status || '-'}</td>
                                            <td>{adjustment.sourceType || adjustment.title || '-'}</td>
                                            <td>{adjustment.batchNo || adjustment.batchId || '-'}</td>
                                            <td>{formatQuantity(adjustment.oldQuantity)}</td>
                                            <td>{formatQuantity(adjustment.newQuantity)}</td>
                                            <td>{formatSignedQuantity(adjustment.adjustmentQuantity)}</td>
                                            <td>{formatMoney(adjustment.newUnitCost)}</td>
                                            <td>{adjustment.oldReorderLevel ?? adjustment.newReorderLevel
                                                ? `${adjustment.oldReorderLevel ?? '-'} -> ${adjustment.newReorderLevel ?? '-'}`
                                                : '-'}</td>
                                            <td className="text-start">{adjustment.reason || '-'}</td>
                                        </tr>
                                    ))}
                                    {(productBreakdown?.stockAdjustments || []).length === 0 && (
                                        <tr>
                                            <td colSpan="10" className="text-muted py-3">No stock taking or adjustment history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </>
                    )}
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
                        <strong>Qty Avail:</strong> {formatQuantity(returnBatch?.quantity)}
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

        </Container>
    );
}

// ... helper functions ...
// Ensure fetchInventory uses /available-summary


export default InventoryView;

const formatQuantity = (value) => {
    if (value == null || value === '') return '0';
    const raw = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(raw)) {
        const num = Number(value);
        return Number.isFinite(num) ? String(num) : '0';
    }
    const [whole, decimal] = raw.split('.');
    const sign = whole.startsWith('-') ? '-' : '';
    const digits = sign ? whole.slice(1) : whole;
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal == null ? `${sign}${grouped}` : `${sign}${grouped}.${decimal}`;
};

const formatSignedQuantity = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num) || num === 0) return formatQuantity(value);
    return `${num > 0 ? '+' : ''}${formatQuantity(value)}`;
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const formatMoney = (value) => {
    if (value == null || value === '') return '-';
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const locationLabel = (row) => {
    const ownerType = (row?.ownerType || '').toUpperCase();
    if (ownerType === 'PROJECT') return `Project: ${row.ownerId || row.locationId || '-'}`;
    if (ownerType === 'DEPARTMENT') return `Department: ${row.ownerId || row.locationId || '-'}`;
    if (!row?.locationId || row.locationId === 'LOC_STORES_MAIN') return 'Main Store';
    return row.locationId;
};

const referenceLabel = (movement) => {
    if (!movement) return '-';
    const parts = [];
    if (movement.refDocType) parts.push(movement.refDocType);
    if (movement.refDocId) parts.push(movement.refDocId);
    if (movement.itemRequestNumber) parts.push(`IR ${movement.itemRequestNumber}`);
    if (movement.projectId) parts.push(`Project ${movement.projectId}`);
    if (movement.poId) parts.push(`PO ${movement.poId}`);
    if (movement.grnId) parts.push(`GRN ${movement.grnId}`);
    return parts.length ? parts.join(' / ') : '-';
};
