import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Table, Spinner, Badge, Modal, Form, Nav, ProgressBar } from 'react-bootstrap';
import { Boxes, CircleAlert, ClipboardList, PackageCheck, Search, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import SafeSelect from '../ReusableComponents/SafeSelect';
import ReportLayout from '../ReusableComponents/ReportLayout';
import './ProjectInventoryCard.css';

/**
 * Component to display project inventory, consumption, and transfers.
 *
 * @component
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Object} props.project - Optional project summary for report headers
 */
export default function ProjectInventoryCard({ projectId, project }) {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [panelInventory, setPanelInventory] = useState([]);
    const [activeInventoryView, setActiveInventoryView] = useState('ALL');
    const [inventorySearch, setInventorySearch] = useState('');
    const [inventoryStatus, setInventoryStatus] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [showConsumedReport, setShowConsumedReport] = useState(false);
    const [showComponentReport, setShowComponentReport] = useState(false);
    const [consumptionRecords, setConsumptionRecords] = useState([]);
    const [loadingConsumption, setLoadingConsumption] = useState(false);

    // Consume state
    const [showConsume, setShowConsume] = useState(false);
    const [consumeData, setConsumeData] = useState({ productId: '', quantity: '', note: '' });

    // Return state
    const [showReturn, setShowReturn] = useState(false);
    const [returnData, setReturnData] = useState({ productId: '', batchId: '', quantity: '', reason: '' });
    const [returnBatches, setReturnBatches] = useState([]); // Batches for the selected return product
    const [selectedReturnSerials, setSelectedReturnSerials] = useState({}); // { batchId: Set(serials) }

    const [submitting, setSubmitting] = useState(false);
    const [acceptingId, setAcceptingId] = useState(null); // track which transfer is being accepted

    const [pendingTransfers, setPendingTransfers] = useState([]);

    // Batch View State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedProductName, setSelectedProductName] = useState("");

    const handleViewBatches = async (product) => {
        try {
            setSelectedProductName(product.productName);
            const res = await api.get(`/inventory/batches?productId=${product.productId}`);
            const projectLoc = `PROJ:${projectId}`;
            const filtered = (res.data || []).filter(b => b.locationId === projectLoc); // Or ownerType=PROJECT ownerId=projectId
            // Note: TransferService uses ownerType/ownerId. Check API returns.
            // If filtering locally, ensure criteria matches backend logic.
            // Better: use filtered API if available.
            setSelectedBatches(filtered);
            setShowBatchModal(true);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load batches");
        }
    };

    useEffect(() => { load(); }, [projectId]);

    const load = async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const [invRes, panelRes, trRes] = await Promise.all([
                api.get(`/inventory/project/${projectId}`),
                api.get(`/inventory/project/${projectId}/panels`).catch(() => ({ data: [] })),
                api.get(`/transfers?status=PENDING_ACCEPTANCE&toLocationId=${encodeURIComponent(projectId)}`)
            ]);

            setInventory(invRes.data || []);
            setPanelInventory(panelRes.data || []);
            setPendingTransfers(trRes.data || []);
        } catch (e) {
            console.error('Failed to load inventory or transfers:', e);
            console.error('Error response:', e?.response?.data);
            toast.error('Failed to load inventory or transfers');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptTransfer = async (id) => {
        if (acceptingId) return; // already processing one
        setAcceptingId(id);
        try {
            await api.patch(`/transfers/${id}/accept`);
            toast.success("Transfer accepted");
            load();
        } catch (e) {
            toast.error("Failed to accept transfer");
        } finally {
            setAcceptingId(null);
        }
    };

    const handleRejectTransfer = async (id) => {
        if (!window.confirm("Reject this transfer?")) return;
        try {
            await api.patch(`/transfers/${id}/reject`);
            toast.info("Transfer rejected");
            load();
        } catch (e) {
            toast.error("Failed to reject transfer");
        }
    };

    const handleConsume = async () => {
        if (!consumeData.productId || !consumeData.quantity) {
            toast.warn('Product and Quantity are required');
            return;
        }
        try {
            setSubmitting(true);
            await api.post('/consumptions', {
                projectId,
                items: [{
                    productId: consumeData.productId,
                    quantity: Number(consumeData.quantity),
                    serials: consumeData.serials ? consumeData.serials.split(',').map(s => s.trim()).filter(s => s) : [],
                    note: consumeData.note
                }]
            });
            toast.success('Items consumed');
            setShowConsume(false);
            setConsumeData({ productId: '', quantity: '', note: '' });
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to consume items');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTime = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString();
    };

    const buildConsumedRows = (records) => {
        const productNames = inventory.reduce((map, item) => {
            map[item.productId] = item.productName;
            return map;
        }, {});

        return records.flatMap((record) => (record.items || []).map((item, index) => ({
            key: `${record.id || record.consumptionNumber || 'consumption'}-${index}`,
            date: record.createdAt,
            consumptionNumber: record.consumptionNumber || record.id || '-',
            productName: item.productNameSnapshot || productNames[item.productId] || item.productId || '-',
            quantity: item.quantity ?? 0,
            unit: item.unit || '',
            serials: (item.serials || []).join(', '),
            note: item.note || '',
            createdBy: record.createdBy || '-'
        })));
    };

    const consumedRows = buildConsumedRows(consumptionRecords);
    const totalConsumedQty = consumedRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

    const openConsumedReport = async () => {
        if (!projectId) return;
        setShowConsumedReport(true);
        setLoadingConsumption(true);
        try {
            const res = await api.get(`/consumptions/project/${projectId}`, {
                params: { size: 1000, sort: 'createdAt,desc' }
            });
            setConsumptionRecords(res.data?.content || res.data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load consumed items");
        } finally {
            setLoadingConsumption(false);
        }
    };

    const handleSelectReturnProduct = async (pid) => {
        setReturnData({ ...returnData, productId: pid, batchId: '' });
        if (!pid) {
            setReturnBatches([]);
            return;
        }
        // Fetch batches for this product in this project
        // Note: We need to filter by current Project ownership.
        // Re-using logic: GET /inventory/batches?productId=... then filter?
        try {
            const res = await api.get(`/inventory/batches?productId=${pid}`);
            // Filter where ownerId == projectId (assuming "PROJECT" ownership)
            // Or locationId == PROJ:{id}
            const filtered = (res.data || []).filter(b => b.ownerId === projectId && b.quantity > 0);
            setReturnBatches(filtered);
            setSelectedReturnSerials({});
        } catch (e) {
            console.error("Failed to fetch batches", e);
        }
    };

    const toggleReturnSerial = (batchId, serial) => {
        setSelectedReturnSerials(prev => {
            const batchSet = new Set(prev[batchId] || []);
            if (batchSet.has(serial)) batchSet.delete(serial);
            else batchSet.add(serial);

            const next = { ...prev };
            if (batchSet.size === 0) delete next[batchId];
            else next[batchId] = batchSet;

            // Auto-update quantity based on total selected serials
            const total = Object.values(next).reduce((sum, s) => sum + s.size, 0);
            setReturnData(d => ({ ...d, quantity: total || '' }));

            return next;
        });
    };

    const handleReturn = async () => {
        if (!returnData.productId || !returnData.quantity) {
            toast.warn('Product and Quantity are required');
            return;
        }
        try {
            setSubmitting(true);

            // Build items payload
            // If serials selected, group by batch.
            // If no serials selected but quantity entered, use single item (FIFO or selected batch).
            const items = [];
            const hasSerials = Object.keys(selectedReturnSerials).length > 0;

            if (hasSerials) {
                // Mult-batch / Multi-serial mode
                for (const [bId, set] of Object.entries(selectedReturnSerials)) {
                    if (set.size > 0) {
                        items.push({
                            productId: returnData.productId,
                            quantity: set.size,
                            batchId: bId,
                            serials: Array.from(set),
                            reason: returnData.reason
                        });
                    }
                }
            } else {
                // Legacy / Manual mode
                items.push({
                    productId: returnData.productId,
                    quantity: Number(returnData.quantity),
                    batchId: returnData.batchId, // Send optional batchId
                    serials: returnData.serials ? returnData.serials.split(',').map(s => s.trim()).filter(s => s) : [],
                    reason: returnData.reason
                });
            }

            if (items.length === 0) { toast.warn("No items to return"); setSubmitting(false); return; }

            await api.post('/inventory/returns/internal', {
                projectId,
                fromType: 'PROJECT',
                items: items
            });
            toast.success('Return request created');
            setShowReturn(false);
            setShowReturn(false);
            setReturnData({ productId: '', batchId: '', quantity: '', reason: '' });
            setSelectedReturnSerials({});
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to create return request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleScan = (qrValue, mode) => {
        if (!qrValue) return;
        // Format: V1|grnId|productId|batchId|batchNo|serialNo|expiryDate
        const parts = qrValue.split('|');
        if (parts.length < 5 || parts[0] !== 'V1') {
            toast.error("Invalid QR Code format");
            return;
        }

        const [_, grnId, productId, batchId, batchNo, serialNo, expiryDate] = parts;

        if (mode === 'CONSUME') {
            setConsumeData(prev => {
                // If product matches or is empty
                if (prev.productId && prev.productId !== productId) {
                    toast.warn("Scanned product does not match selected product. Resetting selection.");
                    return {
                        productId,
                        quantity: 1,
                        serials: serialNo ? serialNo : '',
                        note: prev.note
                    };
                }

                // If same product, append logic
                let newSerials = prev.serials ? prev.serials.split(',').map(s => s.trim()).filter(s => s) : [];
                if (serialNo && !newSerials.includes(serialNo)) {
                    newSerials.push(serialNo);
                }

                // If serialized, qty = count of serials. Else increment.
                let newQty = Number(prev.quantity || 0);
                if (serialNo) {
                    newQty = newSerials.length;
                } else {
                    newQty += 1;
                }

                return {
                    ...prev,
                    productId,
                    quantity: newQty,
                    serials: newSerials.join(', ')
                };
            });
            toast.success(`Scanned: ${serialNo || productId}`);
        } else if (mode === 'RETURN') {
            setReturnData(prev => {
                if (prev.productId && prev.productId !== productId) {
                    toast.warn("Scanned product does not match selected product. Resetting.");
                    // Re-fetch batches for new product
                    handleSelectReturnProduct(productId);
                    return {
                        productId,
                        batchId: batchId || '',
                        quantity: 1,
                        serials: serialNo ? serialNo : '',
                        reason: prev.reason
                    };
                }

                if (prev.productId !== productId) {
                    handleSelectReturnProduct(productId);
                }

                // Logic to update selectedReturnSerials directly
                // We need to access the state setter outside this callback or use a refined approach.
                // Since we are inside setReturnData setter, we can't easily set other state.
                // So we'll handle state updates sequentially *outside*.
                return {
                    ...prev,
                    productId,
                    batchId: batchId || prev.batchId,
                    // quantity: updated later via sync
                };
            });

            // Update Serial State
            if (batchId && serialNo) {
                setSelectedReturnSerials(prev => {
                    const batchSet = new Set(prev[batchId] || []);
                    batchSet.add(serialNo);

                    const next = { ...prev };
                    next[batchId] = batchSet;

                    // Sync quantity
                    const total = Object.values(next).reduce((sum, s) => sum + s.size, 0);
                    setReturnData(d => ({ ...d, quantity: total || 1 })); // Default to 1 if 0? No, if serials exist, count them.

                    return next;
                });
            } else {
                // Non-serialized scan: just increment qty
                setReturnData(prev => ({ ...prev, quantity: Number(prev.quantity || 0) + 1 }));
            }

            toast.success(`Scanned: ${serialNo || productId}`);
        }
    };

    const handleCancelRow = async () => {
        if (!cancelData.productId) return;
        setSubmitting(true);
        try {
            await api.patch(`/inventory/project/${projectId}/cancel?productId=${encodeURIComponent(cancelData.productId)}`, {
                reason: cancelData.reason
            });
            toast.success("Order cancelled successfully");
            setShowCancelModal(false);
            setCancelData({ productId: '', productName: '', reason: '' });
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to cancel order");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRowReturnClick = (item) => {
        // Pre-fill the return modal with the clicked product
        handleSelectReturnProduct(item.productId);
        setShowReturn(true);
    };

    // State for Cancel Modal
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelData, setCancelData] = useState({ productId: '', productName: '', reason: '' });

    const getReceiptStatusBadge = (status) => {
        if (status === 'CANCELED' || status === 'CANCELLED') return <Badge bg="danger">Cancelled</Badge>;
        if (status === 'FULLY_RECEIVED') return <Badge bg="success">Fully received</Badge>;
        if (status === 'COVERED') return <Badge bg="success">Covered</Badge>;
        if (status === 'PARTIALLY_RECEIVED') return <Badge bg="warning" text="dark">Partially received</Badge>;
        if (status === 'PARTIALLY_COVERED') return <Badge bg="warning" text="dark">Partially covered</Badge>;
        if (status === 'NOT_RECEIVED') return <Badge bg="secondary">Not received</Badge>;
        return <Badge bg="secondary">Not covered</Badge>;
    };

    const activeInventory = useMemo(() => inventory.filter(item => !item.isCancelled), [inventory]);
    const cancelledInventory = useMemo(() => inventory.filter(item => item.isCancelled), [inventory]);
    const activePanel = useMemo(
        () => panelInventory.find(panel => panel.panelName === activeInventoryView),
        [panelInventory, activeInventoryView]
    );
    const isPanelView = activeInventoryView !== 'ALL';

    const displayedInventory = useMemo(() => {
        const source = isPanelView ? (activePanel?.items || []) : activeInventory;
        const search = inventorySearch.trim().toLowerCase();
        return source.filter(item => {
            if (item.cancelled) return false;
            const status = isPanelView ? item.coverageStatus : item.orderStatus;
            const matchesSearch = !search
                || String(item.productName || '').toLowerCase().includes(search)
                || String(item.sku || '').toLowerCase().includes(search);
            const matchesStatus = inventoryStatus === 'ALL'
                || (inventoryStatus === 'SHORTFALL'
                    ? (isPanelView ? item.shortfallQty > 0 : item.receivedQty < item.requestedQty)
                    : status === inventoryStatus);
            return matchesSearch && matchesStatus;
        });
    }, [activeInventory, activePanel, inventorySearch, inventoryStatus, isPanelView]);

    const inventorySummary = useMemo(() => {
        if (isPanelView) {
            return {
                products: activePanel?.productCount || 0,
                requested: activePanel?.requestedQty || 0,
                received: activePanel?.coveredQty || 0,
                onHand: (activePanel?.items || []).reduce((sum, item) => sum + Number(item.projectOnHandQty || 0), 0),
                shortfall: activePanel?.shortfallQty || 0
            };
        }
        return {
            products: activeInventory.length,
            requested: activeInventory.reduce((sum, item) => sum + Number(item.requestedQty || 0), 0),
            received: activeInventory.reduce((sum, item) => sum + Number(item.receivedQty || 0), 0),
            onHand: activeInventory.reduce((sum, item) => sum + Number(item.onHandQty || 0), 0),
            shortfall: activeInventory.reduce((sum, item) =>
                sum + Math.max(0, Number(item.requestedQty || 0) - Number(item.receivedQty || 0)), 0)
        };
    }, [activeInventory, activePanel, isPanelView]);

    const coveragePercent = inventorySummary.requested > 0
        ? Math.min(100, Math.round((inventorySummary.received / inventorySummary.requested) * 100))
        : 0;
    const componentReportSummary = useMemo(() => ({
        components: panelInventory.length,
        itemLines: panelInventory.reduce(
            (sum, panel) => sum + (panel.items || []).filter(item => !item.cancelled).length,
            0
        ),
        requested: panelInventory.reduce((sum, panel) => sum + Number(panel.requestedQty || 0), 0),
        covered: panelInventory.reduce((sum, panel) => sum + Number(panel.coveredQty || 0), 0),
        shortage: panelInventory.reduce((sum, panel) => sum + Number(panel.shortfallQty || 0), 0)
    }), [panelInventory]);

    return (
        <Card className="project-inventory h-100 mt-3 shadow-sm">
            <Card.Header className="project-inventory__header d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <Boxes size={20} className="text-primary" />
                        <h5 className="mb-0">Project Inventory</h5>
                    </div>
                    <div className="text-muted small mt-1">
                        Track material coverage, shared project stock, consumption, and incoming transfers.
                    </div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/item/requests?projectId=${projectId}`)} disabled={!projectId}>
                        Request Item
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={openConsumedReport} disabled={!projectId}>
                        Print Consumed Items
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => setShowComponentReport(true)} disabled={!projectId || loading}>
                        Print Component Report
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setShowConsume(true)} disabled={!projectId}>
                        Consume Items
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                {loading ? (
                    <div className="py-5 text-center text-muted">
                        <Spinner size="sm" className="me-2" />
                        Loading project inventory...
                    </div>
                ) : (
                    <>
                        <div className="project-inventory__summary mb-4">
                            <div className="project-inventory__metric">
                                <div className="project-inventory__metric-label"><Boxes size={15} /> Products</div>
                                <div className="project-inventory__metric-value">{inventorySummary.products}</div>
                            </div>
                            <div className="project-inventory__metric">
                                <div className="project-inventory__metric-label"><ClipboardList size={15} /> Requested</div>
                                <div className="project-inventory__metric-value">{inventorySummary.requested}</div>
                            </div>
                            <div className="project-inventory__metric">
                                <div className="project-inventory__metric-label"><PackageCheck size={15} /> {isPanelView ? 'Covered' : 'Received'}</div>
                                <div className="project-inventory__metric-value">{inventorySummary.received}</div>
                            </div>
                            <div className="project-inventory__metric">
                                <div className="project-inventory__metric-label"><Boxes size={15} /> Project on hand</div>
                                <div className="project-inventory__metric-value">{inventorySummary.onHand}</div>
                            </div>
                            <div className={`project-inventory__metric ${inventorySummary.shortfall > 0 ? 'project-inventory__metric--danger' : ''}`}>
                                <div className="project-inventory__metric-label"><CircleAlert size={15} /> Shortfall</div>
                                <div className="project-inventory__metric-value">{inventorySummary.shortfall}</div>
                            </div>
                        </div>

                        <div className="d-flex align-items-center justify-content-between gap-3 mb-2 flex-wrap">
                            <div>
                                <div className="fw-semibold">{isPanelView ? activeInventoryView : 'All Products'}</div>
                                <div className="small text-muted">
                                    {isPanelView
                                        ? 'Panel demand with project-wide stock shown for reference.'
                                        : 'Combined material position across the whole project.'}
                                </div>
                            </div>
                            <div style={{ minWidth: 190 }}>
                                <div className="d-flex justify-content-between small mb-1">
                                    <span className="text-muted">Coverage</span>
                                    <span className="fw-semibold">{coveragePercent}%</span>
                                </div>
                                <ProgressBar now={coveragePercent} variant={coveragePercent < 50 ? 'danger' : coveragePercent < 100 ? 'warning' : 'success'} style={{ height: 7 }} />
                            </div>
                        </div>

                        <Nav className="project-inventory__views" activeKey={activeInventoryView}>
                            <Nav.Item>
                                <Nav.Link eventKey="ALL" onClick={() => { setActiveInventoryView('ALL'); setInventoryStatus('ALL'); }}>
                                    All Products <Badge bg="light" text="dark">{activeInventory.length}</Badge>
                                </Nav.Link>
                            </Nav.Item>
                            {panelInventory.map(panel => (
                                <Nav.Item key={panel.panelName}>
                                    <Nav.Link eventKey={panel.panelName} onClick={() => { setActiveInventoryView(panel.panelName); setInventoryStatus('ALL'); }}>
                                        {panel.panelName} <Badge bg={panel.shortfallQty > 0 ? 'danger' : 'light'} text={panel.shortfallQty > 0 ? undefined : 'dark'}>
                                            {panel.productCount}
                                        </Badge>
                                    </Nav.Link>
                                </Nav.Item>
                            ))}
                        </Nav>

                        <div className="project-inventory__toolbar">
                            <div className="project-inventory__search">
                                <Search size={16} />
                                <Form.Control
                                    size="sm"
                                    value={inventorySearch}
                                    onChange={event => setInventorySearch(event.target.value)}
                                    placeholder="Search product or SKU"
                                />
                            </div>
                            <Form.Select
                                size="sm"
                                value={inventoryStatus}
                                onChange={event => setInventoryStatus(event.target.value)}
                                style={{ width: 190 }}
                            >
                                <option value="ALL">All statuses</option>
                                <option value="SHORTFALL">Has shortfall</option>
                                {isPanelView ? (
                                    <>
                                        <option value="COVERED">Covered</option>
                                        <option value="PARTIALLY_COVERED">Partially covered</option>
                                        <option value="NOT_COVERED">Not covered</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="FULLY_RECEIVED">Fully received</option>
                                        <option value="PARTIALLY_RECEIVED">Partially received</option>
                                        <option value="NOT_RECEIVED">Not received</option>
                                    </>
                                )}
                            </Form.Select>
                        </div>

                        {displayedInventory.length > 0 ? (
                            <Table size="sm" hover responsive className="project-inventory__table mb-4">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th className="text-end">Requested</th>
                                <th className="text-end">{isPanelView ? 'Coverage' : 'Received'}</th>
                                <th className="text-end">{isPanelView ? 'Project consumed' : 'Consumed'}</th>
                                <th className="text-end">{isPanelView ? 'Project on hand' : 'On hand'}</th>
                                <th className="text-end">Shortfall</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedInventory.map((i, idx) => {
                                const receivedQty = isPanelView ? i.coverageQty : i.receivedQty;
                                const consumedQty = isPanelView ? i.projectConsumedQty : i.consumedQty;
                                const onHandQty = isPanelView ? i.projectOnHandQty : i.onHandQty;
                                const shortfallQty = isPanelView
                                    ? i.shortfallQty
                                    : Math.max(0, Number(i.requestedQty || 0) - Number(i.receivedQty || 0));
                                const statusValue = isPanelView ? i.coverageStatus : i.orderStatus;
                                const canCancel = !isPanelView && i.orderStatus === 'NOT_RECEIVED';
                                const canReturn = onHandQty > 0;

                                return (
                                    <tr key={`${i.productId}-active-${idx}`}>
                                        <td className="project-inventory__product">
                                            <div className="fw-semibold">{i.productName}</div>
                                            <div className="project-inventory__sku">{i.sku || i.productId} · {i.unit || 'unit'}</div>
                                        </td>
                                        <td className="text-end">{i.requestedQty}</td>
                                        <td className="text-end fw-semibold">{receivedQty}</td>
                                        <td className="text-end">{consumedQty}</td>
                                        <td className="text-end fw-bold">{onHandQty}</td>
                                        <td className={`text-end fw-semibold ${shortfallQty > 0 ? 'text-danger' : 'text-success'}`}>
                                            {shortfallQty}
                                        </td>
                                        <td className="text-center">
                                            {getReceiptStatusBadge(statusValue)}
                                            {isPanelView && (
                                                <div className="project-inventory__stock-note mt-1">Shared project stock</div>
                                            )}
                                        </td>
                                        <td className="text-center d-flex gap-1 justify-content-center flex-wrap">
                                            <Button size="sm" variant="light" onClick={() => handleViewBatches(i)} title="View QR & Batches">
                                                Batches
                                            </Button>

                                            {canCancel && (
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    title="Cancel project-wide request"
                                                    onClick={() => {
                                                        setCancelData({ productId: i.productId, productName: i.productName, reason: '' });
                                                        setShowCancelModal(true);
                                                    }}>
                                                    Cancel
                                                </Button>
                                            )}

                                            {canReturn && (
                                                <Button size="sm" variant="outline-warning" title="Return" onClick={() => handleRowReturnClick(i)}>
                                                    Return
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                        ) : (
                            <div className="project-inventory__empty mb-4">
                                <Boxes size={28} className="mb-2" />
                                <div className="fw-semibold">No matching inventory lines</div>
                                <div className="small mt-1">Try another panel, status, or search term.</div>
                            </div>
                        )}

                {/* Cancelled Inventory Table */}
                {!isPanelView && cancelledInventory.length > 0 && (
                    <div className="mb-4 mt-2">
                        <h6 className="text-danger fw-bold mb-2">Cancelled requests</h6>
                        <Table size="sm" hover responsive className="project-inventory__table table-light">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th className="text-end" style={{ width: '120px' }}>Requested Qty</th>
                                    <th className="text-center" style={{ width: '150px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cancelledInventory.map((i, idx) => (
                                    <tr key={`${i.productId}-cancelled-${idx}`} style={{ opacity: 0.7 }}>
                                        <td>{i.productName}</td>
                                        <td className="text-end text-danger fw-bold">{i.requestedQty}</td>
                                        <td className="text-center">
                                            <span className="badge bg-danger">CANCELED</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
                    </>
                )}

                {/* Cancel Modal */}
                {showCancelModal && (
                    <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title text-danger">Cancel Order: {cancelData.productName}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowCancelModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted">
                                        This order has not been received yet. Canceling it will mark the request lines as <strong>CANCELED</strong>, 
                                        but they will remain in the system for audit tracking.
                                    </p>
                                    <div className="mb-3">
                                        <label className="form-label">Reason (Optional)</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={cancelData.reason}
                                            onChange={(e) => setCancelData({ ...cancelData, reason: e.target.value })}
                                            placeholder="Why are you canceling this order?"
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Go Back</button>
                                    <button type="button" className="btn btn-danger" onClick={handleCancelRow} disabled={submitting}>
                                        {submitting ? 'Canceling...' : 'Confirm Cancellation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batch/QR Modal */}
                {showBatchModal && (
                    <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Batches: {selectedProductName}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowBatchModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {selectedBatches.length === 0 ? <p>No batches found in this location.</p> : (
                                        <Table size="sm" bordered hover responsive>
                                            <thead>
                                                <tr>
                                                    <th className="text-center" style={{ width: '120px' }}>QR</th>
                                                    <th>Batch Number</th>
                                                    <th className="text-end">Qty</th>
                                                    <th className="text-end">Cost</th>
                                                    <th>Expiry</th>
                                                    <th>Serials</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedBatches.map(b => (
                                                    <tr key={b.id}>
                                                        <td className="text-center align-middle">
                                                            <QRCode
                                                                value={`V1|${b.grnId || ''}|${b.productId || ''}|${b.id}|${b.batchNumber || ''}||${b.expiryDate || ''}`}
                                                                size={80}
                                                                level={"M"}
                                                            />
                                                        </td>
                                                        <td className="align-middle">
                                                            <div className="fw-bold">{b.batchNumber || '(No Batch #)'}</div>
                                                            <div className="text-muted smallest">GRN: {b.grnId || '-'}</div>
                                                        </td>
                                                        <td className="text-end align-middle">{b.quantity}</td>
                                                        <td className="text-end align-middle">{b.costPrice ? Number(b.costPrice).toFixed(2) : '-'}</td>
                                                        <td className="align-middle">{b.expiryDate || '-'}</td>
                                                        <td className="align-middle">
                                                            {b.serials && b.serials.length > 0 ? (
                                                                <div className="d-flex flex-wrap gap-1">
                                                                    {b.serials.map(s => <Badge key={s} bg="secondary" style={{ fontSize: '0.7rem' }}>{s}</Badge>)}
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <Button variant="secondary" onClick={() => setShowBatchModal(false)}>Close</Button>
                                    {selectedBatches.length > 0 && <Button variant="primary" onClick={() => window.print()}>Print</Button>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="project-inventory__transfer d-flex justify-content-between align-items-center gap-2 mt-4 mb-2">
                    <div>
                        <h6 className="mb-0 d-flex align-items-center gap-2">
                            <Truck size={17} className="text-primary" />
                            Incoming transfers
                            <Badge bg={pendingTransfers.length > 0 ? 'primary' : 'light'} text={pendingTransfers.length > 0 ? undefined : 'dark'}>
                                {pendingTransfers.length}
                            </Badge>
                        </h6>
                        <div className="small text-muted mt-1">Items waiting for project acceptance.</div>
                    </div>
                </div>
                {loading && <div className="text-muted small"><Spinner size="sm" /> Loading transfers...</div>}
                {!loading && pendingTransfers.length === 0 && <div className="text-muted small">No pending transfers.</div>}
                {!loading && pendingTransfers.length > 0 && (
                    <Table size="sm" hover responsive className="project-inventory__table">
                        <thead>
                            <tr>
                                <th>TR No</th>
                                <th>From</th>
                                <th>Items</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingTransfers.map(t => (
                                <tr key={t.id}>
                                    <td>{t.trNumber}</td>
                                    <td>{t.fromLocationId}</td>
                                    <td>
                                        {t.items?.map((item, idx) => {
                                            const qty = item.qty || (item.reservations || []).reduce((s, r) => s + r.reservedQty, 0);
                                            const name = item.productNameSnapshot || item.productId;
                                            return (
                                                <div key={idx} className="small">
                                                    <strong>{name}</strong>: {qty} {item.unit || ''}
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="success"
                                            className="me-1"
                                            disabled={acceptingId === t.id}
                                            onClick={() => handleAcceptTransfer(t.id)}
                                        >
                                            {acceptingId === t.id ? (
                                                <><Spinner animation="border" size="sm" className="me-1" />Accepting...</>
                                            ) : 'Accept'}
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleRejectTransfer(t.id)}>Reject</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>

            <Modal show={showConsumedReport} onHide={() => setShowConsumedReport(false)} size="xl" className="report-print-modal">
                <Modal.Header closeButton className="no-print">
                    <Modal.Title>Consumed Items Report</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingConsumption ? (
                        <div className="text-center py-5 no-print">
                            <Spinner animation="border" variant="primary" />
                            <div className="text-muted mt-3">Loading consumed items...</div>
                        </div>
                    ) : (
                        <ReportLayout
                            title="Consumed Items"
                            subtitle={`${project?.projectName || project?.name || 'Project'} | Job: ${project?.jobNumber || projectId}`}
                            orientation="landscape"
                        >
                            <div className="mb-3">
                                <Table bordered size="sm" className="mb-0">
                                    <tbody>
                                        <tr>
                                            <th style={{ width: '18%' }}>Project</th>
                                            <td>{project?.projectName || project?.name || projectId}</td>
                                            <th style={{ width: '16%' }}>Job Number</th>
                                            <td>{project?.jobNumber || '-'}</td>
                                        </tr>
                                        <tr>
                                            <th>Customer</th>
                                            <td>{project?.customerName || '-'}</td>
                                            <th>Total Consumed Qty</th>
                                            <td>{totalConsumedQty}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>

                            {consumedRows.length === 0 ? (
                                <div className="text-center text-muted py-4 border rounded">
                                    No consumed items recorded for this project.
                                </div>
                            ) : (
                                <Table bordered hover size="sm" responsive>
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '12%' }}>Date</th>
                                            <th style={{ width: '13%' }}>Reference</th>
                                            <th>Product</th>
                                            <th className="text-end" style={{ width: '9%' }}>Qty</th>
                                            <th style={{ width: '8%' }}>Unit</th>
                                            <th style={{ width: '18%' }}>Serials</th>
                                            <th style={{ width: '16%' }}>Note</th>
                                            <th style={{ width: '10%' }}>By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consumedRows.map(row => (
                                            <tr key={row.key}>
                                                <td>{formatDateTime(row.date)}</td>
                                                <td>{row.consumptionNumber}</td>
                                                <td className="fw-semibold">{row.productName}</td>
                                                <td className="text-end">{row.quantity}</td>
                                                <td>{row.unit || '-'}</td>
                                                <td>{row.serials || '-'}</td>
                                                <td>{row.note || '-'}</td>
                                                <td>{row.createdBy}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </ReportLayout>
                    )}
                </Modal.Body>
                <Modal.Footer className="no-print">
                    <Button variant="secondary" onClick={() => setShowConsumedReport(false)}>Close</Button>
                    <Button variant="primary" onClick={() => window.print()} disabled={loadingConsumption}>
                        Print
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showComponentReport} onHide={() => setShowComponentReport(false)} size="xl" className="report-print-modal">
                <Modal.Header closeButton className="no-print">
                    <Modal.Title>Component Material Report</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ReportLayout
                        title="Component Material Status"
                        subtitle={`${project?.projectName || project?.name || 'Project'} | Job: ${project?.jobNumber || projectId}`}
                        orientation="landscape"
                    >
                        <Table bordered size="sm" className="mb-4">
                            <tbody>
                                <tr>
                                    <th style={{ width: '13%' }}>Project</th>
                                    <td>{project?.projectName || project?.name || projectId}</td>
                                    <th style={{ width: '13%' }}>Job Number</th>
                                    <td>{project?.jobNumber || '-'}</td>
                                    <th style={{ width: '13%' }}>Customer</th>
                                    <td>{project?.customerName || '-'}</td>
                                </tr>
                                <tr>
                                    <th>Components</th>
                                    <td>{componentReportSummary.components}</td>
                                    <th>Item Lines</th>
                                    <td>{componentReportSummary.itemLines}</td>
                                    <th>Total Shortage</th>
                                    <td className={componentReportSummary.shortage > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                        {componentReportSummary.shortage}
                                    </td>
                                </tr>
                                <tr>
                                    <th>Required Qty</th>
                                    <td>{componentReportSummary.requested}</td>
                                    <th>Allocated Qty</th>
                                    <td>{componentReportSummary.covered}</td>
                                    <th>Overall Status</th>
                                    <td>
                                        {componentReportSummary.shortage > 0
                                            ? <Badge bg="danger">Shortage</Badge>
                                            : <Badge bg="success">Fully covered</Badge>}
                                    </td>
                                </tr>
                            </tbody>
                        </Table>

                        {panelInventory.length === 0 ? (
                            <div className="text-center text-muted py-4 border rounded">
                                No component allocations are recorded for this project.
                            </div>
                        ) : panelInventory.map(panel => {
                            const activeItems = (panel.items || []).filter(item => !item.cancelled);
                            const coverage = Number(panel.requestedQty || 0) > 0
                                ? Math.min(100, Math.round((Number(panel.coveredQty || 0) / Number(panel.requestedQty)) * 100))
                                : 0;

                            return (
                                <section key={panel.panelName} className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center bg-light border rounded-top px-3 py-2">
                                        <div>
                                            <strong>{panel.panelName}</strong>
                                            <span className="text-muted ms-2">{panel.productCount} item(s)</span>
                                        </div>
                                        <div className="small">
                                            Required: <strong>{panel.requestedQty}</strong>
                                            <span className="mx-2">|</span>
                                            Allocated: <strong>{panel.coveredQty}</strong>
                                            <span className="mx-2">|</span>
                                            Coverage: <strong>{coverage}%</strong>
                                            <span className="mx-2">|</span>
                                            Shortage: <strong className={panel.shortfallQty > 0 ? 'text-danger' : 'text-success'}>{panel.shortfallQty}</strong>
                                        </div>
                                    </div>
                                    <Table bordered size="sm" className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Item</th>
                                                <th style={{ width: '11%' }}>SKU</th>
                                                <th style={{ width: '7%' }}>Unit</th>
                                                <th className="text-end" style={{ width: '9%' }}>Required</th>
                                                <th className="text-end" style={{ width: '9%' }}>Allocated</th>
                                                <th className="text-end" style={{ width: '11%' }}>Project Consumed</th>
                                                <th className="text-end" style={{ width: '11%' }}>Project On Hand</th>
                                                <th className="text-end" style={{ width: '9%' }}>Shortage</th>
                                                <th className="text-center" style={{ width: '12%' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeItems.map(item => (
                                                <tr key={`${panel.panelName}-${item.productId}`}>
                                                    <td className="fw-semibold">{item.productName || item.productId}</td>
                                                    <td>{item.sku || '-'}</td>
                                                    <td>{item.unit || '-'}</td>
                                                    <td className="text-end">{item.requestedQty}</td>
                                                    <td className="text-end">{item.coverageQty}</td>
                                                    <td className="text-end">{item.projectConsumedQty}</td>
                                                    <td className="text-end">{item.projectOnHandQty}</td>
                                                    <td className={`text-end fw-bold ${item.shortfallQty > 0 ? 'text-danger' : 'text-success'}`}>
                                                        {item.shortfallQty}
                                                    </td>
                                                    <td className="text-center">{getReceiptStatusBadge(item.coverageStatus)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </section>
                            );
                        })}

                        <div className="small text-muted border-top pt-2">
                            Allocated quantities are distributed once across components. Project Consumed and Project On Hand are shared project-wide figures because consumption records are not assigned to a specific component.
                        </div>
                    </ReportLayout>
                </Modal.Body>
                <Modal.Footer className="no-print">
                    <Button variant="secondary" onClick={() => setShowComponentReport(false)}>Close</Button>
                    <Button variant="primary" onClick={() => window.print()} disabled={loading || panelInventory.length === 0}>
                        Print
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Consume Modal */}
            {showConsume && (
                <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Consume Items</h5>
                                <button type="button" className="btn-close" onClick={() => setShowConsume(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3 p-2 bg-light rounded border">
                                    <label className="form-label small fw-bold">Scan QR to Add</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Click here and scan QR..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScan(e.target.value, 'CONSUME');
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <div className="form-text small">Scan item to auto-select and increment qty.</div>
                                </div>
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label">Product</label>
                                        <SafeSelect
                                            value={consumeData.productId}
                                            onChange={(e) => {
                                                setConsumeData({ ...consumeData, productId: e.target.value });
                                            }}
                                        >
                                            <option value="">Select Product</option>
                                            {inventory.map(i => (
                                                <option key={i.productId} value={i.productId}>{i.productName} (Avail: {i.onHandQty})</option>
                                            ))}
                                        </SafeSelect>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Quantity</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={consumeData.quantity}
                                            onChange={(e) => setConsumeData({ ...consumeData, quantity: e.target.value })}
                                            min="1"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Serial Numbers (Optional)</label>
                                        <textarea
                                            className="form-control"
                                            placeholder="Enter serial numbers separated by comma"
                                            value={consumeData.serials || ''}
                                            onChange={(e) => setConsumeData({ ...consumeData, serials: e.target.value })}
                                            rows={2}
                                        />
                                        <small className="text-muted">For serial-tracked items, enter serials here.</small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Note</label>
                                        <textarea
                                            className="form-control"
                                            value={consumeData.note}
                                            onChange={(e) => setConsumeData({ ...consumeData, note: e.target.value })}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowConsume(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleConsume} disabled={submitting}>
                                    {submitting ? 'Processing...' : 'Consume'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturn && (
                <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Return to Stores</h5>
                                <button type="button" className="btn-close" onClick={() => setShowReturn(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3 p-2 bg-light rounded border">
                                    <label className="form-label small fw-bold">Scan QR to Add</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Click here and scan QR..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScan(e.target.value, 'RETURN');
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <div className="form-text small">Scan item to auto-select and increment qty.</div>
                                </div>
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label">Product</label>
                                        <SafeSelect
                                            value={returnData.productId}
                                            onChange={(e) => handleSelectReturnProduct(e.target.value)}
                                        >
                                            <option value="">Select Product</option>
                                            {inventory.map(i => (
                                                <option key={i.productId} value={i.productId}>{i.productName} (Avail: {i.onHandQty})</option>
                                            ))}
                                        </SafeSelect>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Batch / Serial No</label>
                                        <SafeSelect
                                            value={returnData.batchId}
                                            onChange={(e) => setReturnData({ ...returnData, batchId: e.target.value })}
                                            disabled={!returnData.productId}
                                        >
                                            <option value="">Any Batch / FIFO</option>
                                            {returnBatches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.batchNumber ? b.batchNumber : '(No Batch No)'} - Qty: {b.quantity} {b.costPrice ? `($${Number(b.costPrice).toFixed(2)})` : ''}
                                                </option>
                                            ))}
                                        </SafeSelect>
                                    </div>

                                    {/* Multi-Select Serials (New Feature) */}
                                    {returnData.productId && returnBatches.some(b => b.serials && b.serials.length > 0) && (
                                        <div className="mb-3 border rounded p-2 bg-light">
                                            <label className="form-label small fw-bold">Select Specific Serials (Multi-select)</label>
                                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                {returnBatches.map(b => {
                                                    if (!b.serials || b.serials.length === 0) return null;
                                                    // Only show if "Any Batch" or this batch is selected
                                                    if (returnData.batchId && returnData.batchId !== b.id) return null;

                                                    return (
                                                        <div key={b.id} className="mb-2">
                                                            <div className="small fw-semibold text-muted">Batch: {b.batchNumber}</div>
                                                            <div className="d-flex flex-wrap gap-2">
                                                                {b.serials.map(s => {
                                                                    const isChecked = selectedReturnSerials[b.id]?.has(s);
                                                                    return (
                                                                        <div key={s} className="form-check form-check-inline mb-0">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                id={`ser-${b.id}-${s}`}
                                                                                checked={!!isChecked}
                                                                                onChange={() => toggleReturnSerial(b.id, s)}
                                                                            />
                                                                            <label className="form-check-label small" htmlFor={`ser-${b.id}-${s}`}>
                                                                                {s}
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="form-text small text-primary">
                                                Selecting serials will auto-update quantity and handle batch splitting.
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label">Quantity</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={returnData.quantity}
                                            onChange={(e) => setReturnData({ ...returnData, quantity: e.target.value })}
                                            min="1"
                                        />
                                    </div>
                                    {/* Legacy Serial Input Removed in favor of Multi-select above */}
                                    {/* If manual serial entry is absolutely needed for non-batched items, we can re-enable it or add a small toggle. 
                            For now, consolidating per user request. */}
                                    <div className="mb-3">
                                        <label className="form-label">Reason</label>
                                        <textarea
                                            className="form-control"
                                            value={returnData.reason}
                                            onChange={(e) => setReturnData({ ...returnData, reason: e.target.value })}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowReturn(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleReturn} disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Return Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
