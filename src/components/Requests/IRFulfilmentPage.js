// src/components/Stores/IRFulfilmentPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Spinner, Button, Form, Table, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

// expects [{productId, productName?, availableQty}]
const fetchMainAvail = async () => {
    const res = await api.get("/reports/stock");
    return (res.data || []).map(r => ({ ...r, availableQty: r.quantity }));
};

const listIRs = async (page, size, status) => {
    const params = { page, size, sort: "createdAt,desc" };
    if (status) params.status = status.join(",");
    return (await api.get("/item-requests", { params })).data;
};

const getIR = async (id) => (await api.get(`/item-requests/${id}`)).data;

const fulfilIR = async (id, productIdToQty) =>
    (await api.post(`/item-requests/${id}/fulfil`, productIdToQty)).data;

const listDepartments = async () =>
    (await api.get(`/departments`, { params: { page: 0, size: 1000 } })).data?.content || [];
const listProjects = async () =>
    (await api.get(`/projects`, { params: { page: 0, size: 1000 } })).data?.content || [];

/* ---------- Page ---------- */
export default function IRFulfilmentPage() {
    // allocations: productId -> [{ batchId, batchNumber, qty, serials: [] }]
    const [allocations, setAllocations] = useState({});
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchModalProduct, setBatchModalProduct] = useState(null); // { productId, productName, reqQty }
    const [availBatches, setAvailBatches] = useState([]);
    const [selectedSerials, setSelectedSerials] = useState({}); // { batchId: Set(serial) }

    // Standard State
    const [irs, setIrs] = useState({});
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState(null);
    const [issue, setIssue] = useState({}); // { productId: qty }
    const [statusFilter, setStatusFilter] = useState("SUBMITTED");

    // Filters
    const [fDept, setFDept] = useState("");
    const [fProj, setFProj] = useState("");
    const [fRequester, setFRequester] = useState("");

    // Lookups
    const [deptMap, setDeptMap] = useState({});
    const [projMap, setProjMap] = useState({});

    // Data
    const [onHand, setOnHand] = useState({}); // { productId: availQty }

    // Loading
    const [loadingList, setLoadingList] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Initial Load
    useEffect(() => {
        (async () => {
            const [d, p] = await Promise.all([listDepartments(), listProjects()]);
            setDeptMap(d.reduce((m, x) => ({ ...m, [x.id]: x.name }), {}));
            setProjMap(p.reduce((m, x) => ({ ...m, [x.id]: x.name }), {}));
        })();
    }, []);

    // Load List
    useEffect(() => {
        (async () => {
            setLoadingList(true);
            try {
                const s = statusFilter === "ALL" ? null : [statusFilter];
                setIrs(await listIRs(page, 20, s));
            } catch { toast.error("Failed to load requests"); }
            setLoadingList(false);
        })();
    }, [page, statusFilter]);

    const openIR = async (id) => {
        setLoadingDetail(true);
        try {
            const data = await getIR(id);
            setSelected(data);
            setIssue({});
            setAllocations({});
        } catch { toast.error("Failed to load IR details"); }
        setLoadingDetail(false);
    };

    const refreshOnHand = async () => {
        try {
            const rows = await fetchMainAvail();
            setOnHand(rows.reduce((m, r) => ({ ...m, [r.productId]: r.availableQty }), {}));
        } catch { /* ignore */ }
    };

    useEffect(() => { refreshOnHand(); }, []);

    const addShortagesForIR = async () => {
        if (!selected) return;
        const shortages = {};
        let hasShortage = false;

        (selected.items || []).forEach(it => {
            const remaining = Math.max(0, (it.requestedQty || 0) - (it.fulfilledQty || 0));
            const avail = Number(onHand[it.productId] || 0);

            // If we don't have enough to fulfill remaining, that's a shortage
            if (remaining > avail) {
                const diff = remaining - avail;
                shortages[it.productId] = diff;
                hasShortage = true;
            }
        });

        if (!hasShortage) {
            toast.info("No shortages found (Available >= Remaining)");
            return;
        }

        try {
            await api.post("/stores/pending-purchase", shortages);
            toast.success("Shortages added to Pending Purchase Plan");
        } catch (e) {
            toast.error("Failed to add shortages");
        }
    };

    // Scan Input State
    const [scanInput, setScanInput] = useState("");

    const handleScan = (qrValue) => {
        if (!selected || !qrValue) return;
        // Format: V1|grnId|productId|batchId|batchNo|serialNo|expiryDate
        const parts = qrValue.split('|');
        if (parts.length < 5 || parts[0] !== 'V1') {
            toast.error("Invalid QR Code");
            return;
        }

        const [_, grnId, productId, batchId, batchNo, serialNo, expiryDate] = parts;

        // Check if product is in this IR
        const line = (selected.items || []).find(i => i.productId === productId);
        if (!line) {
            toast.warn(`Product ${productId} is not in this Request`);
            return;
        }

        // Add allocation
        setAllocations(prev => {
            const list = prev[productId] || [];
            // Check if batch already exists in list
            const existingIdx = list.findIndex(a => a.batchId === batchId);

            let newList = [...list];
            if (existingIdx >= 0) {
                const item = newList[existingIdx];
                // Check duplicate serial
                if (serialNo && item.serials && item.serials.includes(serialNo)) {
                    toast.warn("Serial already scanned: " + serialNo);
                    return prev; // No change
                }

                let newSerials = item.serials ? [...item.serials] : [];
                let newQty = item.qty;

                if (serialNo) {
                    newSerials.push(serialNo);
                    newQty = newSerials.length;
                } else {
                    newQty += 1;
                }

                newList[existingIdx] = { ...item, qty: newQty, serials: newSerials };
            } else {
                // New batch entry
                newList.push({
                    batchId,
                    batchNumber: batchNo,
                    qty: 1,
                    serials: serialNo ? [serialNo] : []
                });
            }

            // Sync with simple issue state to show total
            const total = newList.reduce((s, x) => s + x.qty, 0);
            setIssue(s => ({ ...s, [productId]: total }));

            return { ...prev, [productId]: newList };
        });
        toast.success(`Scanned ${serialNo || batchNo}`);
    };

    const openBatchModal = async (it) => {
        // Fetch batches
        try {
            const res = await api.get(`/inventory/batches?productId=${it.productId}`);
            const mainLocId = "LOC_STORES_MAIN";
            const fallbackLocId = "warehouse"; // Backend default
            // Filter: Must match distinct main locations AND have qty
            const filtered = (res.data || []).filter(b =>
                (b.locationId === mainLocId || b.locationId === fallbackLocId) && b.remainingQty > 0
            );
            setAvailBatches(filtered);
            setBatchModalProduct(it);
            setSelectedSerials({});
            setShowBatchModal(true);
        } catch (e) {
            toast.error("Failed to fetch batches");
        }
    };

    // Updated to accept serials list or simple qty
    const addToAllocation = (batch, qtyToAdd, serialsList = []) => {
        if (!batchModalProduct || qtyToAdd <= 0) return;
        const pid = batchModalProduct.productId;

        setAllocations(prev => {
            const list = prev[pid] || [];
            const existingIdx = list.findIndex(a => a.batchId === batch.id);
            let newList = [...list];
            if (existingIdx >= 0) {
                // Merge serials
                const currentSerials = newList[existingIdx].serials || [];
                const mergedSerials = Array.from(new Set([...currentSerials, ...serialsList]));

                newList[existingIdx] = {
                    ...newList[existingIdx],
                    qty: newList[existingIdx].qty + qtyToAdd,
                    serials: mergedSerials
                };
            } else {
                newList.push({
                    batchId: batch.id,
                    batchNumber: batch.batchNumber,
                    qty: qtyToAdd,
                    serials: serialsList
                });
            }

            // Sync total
            const total = newList.reduce((s, x) => s + x.qty, 0);
            setIssue(s => ({ ...s, [pid]: total }));

            return { ...prev, [pid]: newList };
        });
        toast.success(`Added ${qtyToAdd} from ${batch.batchNumber}`);
    };

    const toggleSerial = (batchId, serial) => {
        setSelectedSerials(prev => {
            const set = new Set(prev[batchId] || []);
            if (set.has(serial)) set.delete(serial);
            else set.add(serial);

            const next = { ...prev };
            if (set.size === 0) delete next[batchId];
            else next[batchId] = set;
            return next;
        });
    };

    const confirmSelections = () => {
        if (!batchModalProduct) return;
        // Add all selected serials to allocation
        Object.entries(selectedSerials).forEach(([bId, set]) => {
            if (set.size > 0) {
                const batch = availBatches.find(b => b.id === bId);
                if (batch) {
                    addToAllocation(batch, set.size, Array.from(set));
                }
            }
        });
        setSelectedSerials({}); // Clear selection after adding
        // Don't close modal immediately, allow more adds? Or maybe close?
        // Let's keep open for "Add +1" clicks.
        // But for serials, users probably expect "Add Selected" to be atomic.
        toast.success("Added selected serials");
    };

    const clearAllocations = (pid) => {
        setAllocations(prev => {
            const next = { ...prev };
            delete next[pid];
            return next;
        });
        setIssue(s => ({ ...s, [pid]: 0 }));
    };

    const doIssue = async () => {
        if (!selected) return;
        try {
            // Build DTO list
            const payload = [];

            // Iterate over all items in IR
            (selected.items || []).forEach(it => {
                const pid = it.productId;
                const allocs = allocations[pid];
                const simpleQty = Number(issue[pid] || 0);

                if (allocs && allocs.length > 0) {
                    // Use allocations
                    allocs.forEach(a => {
                        payload.push({
                            productId: pid,
                            qty: a.qty,
                            batchId: a.batchId,
                            serials: a.serials
                        });
                    });
                } else if (simpleQty > 0) {
                    // Use FIFO fallback
                    payload.push({
                        productId: pid,
                        qty: simpleQty,
                        batchId: null, // explicit null
                        serials: null
                    });
                }
            });

            if (payload.length === 0) {
                toast.info("Enter quantities to issue or scan items");
                return;
            }

            const updated = await fulfilIR(selected.id, payload);
            setSelected(updated);
            setAllocations({}); // clear allocations on success
            setIssue({});
            await refreshOnHand();
            const p = await listIRs(page, 20);
            setIrs(p);
            toast.success("Issued items successfully");
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to issue items");
        }
    };

    const filteredIRs = useMemo(() => {
        const rows = irs.content || [];
        return rows.filter((ir) => {
            const deptOk = !fDept || ir.departmentId === fDept;
            const projOk = !fProj || ir.projectId === fProj;
            const reqOk = !fRequester || (ir.createdBy || "").toLowerCase().includes(fRequester.toLowerCase());
            return deptOk && projOk && reqOk;
        });
    }, [irs, fDept, fProj, fRequester]);

    return (
        <Container style={{ width: "95vw", maxWidth: 1400, paddingTop: 24 }}>
            <Row className="g-3">
                {/* -------- Left: List & Filters -------- */}
                <Col md={5}>
                    <div className="bg-white shadow rounded p-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Item Requests</h5>
                            {loadingList && <Spinner animation="border" size="sm" />}
                        </div>
                        {/* Filters ... (Keep existing ui) */}
                        <div className="mb-3">
                            <Form.Group>
                                <Form.Label className="small fw-bold">Filter by Status</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="SUBMITTED">Submitted</option>
                                    <option value="PENDING_PURCHASE">Pending Purchase</option>
                                    <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
                                    <option value="FULFILLED">Fulfilled</option>
                                    <option value="CANCELLED">Cancelled</option>
                                    <option value="CLOSED">Closed</option>
                                    <option value="DRAFT">Draft</option>
                                </Form.Select>
                            </Form.Group>
                        </div>
                        {/* Other Filters (Keep existing) */}
                        <Row className="g-2 mb-3">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small">Department</Form.Label>
                                    <Form.Select value={fDept} onChange={(e) => setFDept(e.target.value)}>
                                        <option value="">All</option>
                                        {Object.entries(deptMap).map(([id, name]) => (
                                            <option key={id} value={id}>{name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small">Project</Form.Label>
                                    <Form.Select value={fProj} onChange={(e) => setFProj(e.target.value)}>
                                        <option value="">All</option>
                                        {Object.entries(projMap).map(([id, name]) => (
                                            <option key={id} value={id}>{name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small">Requester</Form.Label>
                                    <Form.Control
                                        placeholder="username..."
                                        value={fRequester}
                                        onChange={(e) => setFRequester(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Table hover size="sm" responsive className="mb-2">
                            <thead>
                                <tr>
                                    <th>IR #</th>
                                    <th>Status</th>
                                    <th>Department</th>
                                    <th>Project</th>
                                    <th>Requester</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIRs.map((ir) => (
                                    <tr key={ir.id} onClick={() => openIR(ir.id)} style={{ cursor: "pointer" }}>
                                        <td>{ir.irNumber}</td>
                                        <td><Badge bg={ir.status === "SUBMITTED" ? "secondary" : ir.status === "PARTIALLY_FULFILLED" ? "info" : "success"}>{ir.status}</Badge></td>
                                        <td>{deptMap[ir.departmentId] || ir.departmentId || "-"}</td>
                                        <td>{projMap[ir.projectId] || ir.projectId || "-"}</td>
                                        <td>{ir.createdBy || "-"}</td>
                                        <td>{ir.createdAt ? new Date(ir.createdAt).toLocaleString() : "-"}</td>
                                    </tr>
                                ))}
                                {filteredIRs.length === 0 && (
                                    <tr><td colSpan={6} className="text-center text-muted">No item requests found.</td></tr>
                                )}
                            </tbody>
                        </Table>

                        <div className="d-flex justify-content-between">
                            <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                            <span>Page {page + 1} / {irs.totalPages || 1}</span>
                            <Button size="sm" disabled={page + 1 >= (irs.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                        </div>
                    </div>
                </Col>

                {/* -------- Right: Detail & Issue -------- */}
                <Col md={7}>
                    <div className="bg-white shadow rounded p-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">IR Details</h5>
                            {loadingDetail && <Spinner animation="border" size="sm" />}
                        </div>

                        {!selected ? (
                            <div className="text-muted">Select an IR to fulfil</div>
                        ) : (
                            <>
                                <div className="mb-3">
                                    <strong>{selected.irNumber}</strong>{" "}
                                    <Badge bg={selected.status === "SUBMITTED" ? "secondary" : selected.status === "PARTIALLY_FULFILLED" ? "info" : "success"}>{selected.status}</Badge>
                                    <div className="small text-muted">
                                        Dept: {deptMap[selected.departmentId] || selected.departmentId || "-"} &nbsp;|&nbsp; Project:{" "}
                                        {projMap[selected.projectId] || selected.projectId || "-"} &nbsp;|&nbsp; Requester:{" "}
                                        {selected.createdBy || "-"}
                                    </div>
                                </div>

                                {/* Scan Input */}
                                <div className="mb-3 p-3 bg-light rounded border">
                                    <label className="fw-bold mb-1">Scan QR to Allocate</label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Click here and scan QR..."
                                        value={scanInput}
                                        onChange={e => setScanInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScan(scanInput);
                                                setScanInput('');
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <div className="form-text small">Scan item QR to auto-allocate batch and increment quantity.</div>
                                </div>

                                <Table hover size="sm" responsive>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th className="text-end">Req</th>
                                            <th className="text-end">Done</th>
                                            <th className="text-end">Avail</th>
                                            <th>Allocation / Qty</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selected.items || []).map((it) => {
                                            const remaining = Math.max(0, (it.requestedQty || 0) - (it.fulfilledQty || 0));
                                            const avail = Number(onHand[it.productId] || 0);
                                            const maxIssuable = Math.min(remaining, avail);
                                            const allocs = allocations[it.productId] || [];
                                            const isAllocated = allocs.length > 0;

                                            // Calculate total from allocations or simple input
                                            const currentQty = issue[it.productId] || 0;

                                            return (
                                                <tr key={it.productId}>
                                                    <td>{it.productNameSnapshot || it.productId}</td>
                                                    <td className="text-end">{it.requestedQty}</td>
                                                    <td className="text-end">{it.fulfilledQty}</td>
                                                    <td className="text-end">{avail}</td>
                                                    <td>
                                                        {isAllocated ? (
                                                            <div>
                                                                <Badge bg="primary">{currentQty}</Badge>
                                                                <small className="d-block text-muted">
                                                                    {allocs.length} batch(es) selected
                                                                </small>
                                                            </div>
                                                        ) : (
                                                            <Form.Control
                                                                type="number"
                                                                min="0"
                                                                max={maxIssuable}
                                                                value={issue[it.productId] ?? 0}
                                                                onChange={(e) => {
                                                                    const v = Math.max(0, Math.min(maxIssuable, Number(e.target.value || 0)));
                                                                    setIssue((s) => ({ ...s, [it.productId]: v }));
                                                                }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Button size="sm" variant="outline-dark" onClick={() => openBatchModal(it)}>
                                                            Batches
                                                        </Button>
                                                        {isAllocated && (
                                                            <Button size="sm" variant="link" className="text-danger p-0 ms-2" onClick={() => clearAllocations(it.productId)}>
                                                                Clear
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>

                                <div className="d-flex justify-content-end gap-2 mt-3">
                                    <Button variant="outline-primary" onClick={addShortagesForIR}>
                                        Add Shortages to Pending
                                    </Button>
                                    <Button onClick={doIssue} disabled={!selected}>Issue from Main Store</Button>
                                </div>
                            </>
                        )}
                    </div>
                </Col>
            </Row>

            {/* Batch Selection Modal */}
            <div className={`modal ${showBatchModal ? 'd-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Select Batch: {batchModalProduct?.productNameSnapshot}</h5>
                            <button className="btn-close" onClick={() => setShowBatchModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            <Table size="sm" hover>
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Expiry</th>
                                        <th>Cost</th>
                                        <th>Avail Qty</th>
                                        <th>Allocated</th>
                                        <th>Add</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availBatches.map(b => {
                                        const currentAlloc = (allocations[batchModalProduct?.productId] || []).find(a => a.batchId === b.id);
                                        const allocatedQty = currentAlloc ? currentAlloc.qty : 0;

                                        // Filter allocated serials to disable checkboxes
                                        const allocatedSerials = new Set(currentAlloc?.serials || []);

                                        return (
                                            <tr key={b.id}>
                                                <td>
                                                    <div>{b.batchNumber}</div>
                                                    {b.serials && b.serials.length > 0 && (
                                                        <div className="mt-1 p-2 border rounded bg-light">
                                                            <small className="d-block fw-bold text-muted mb-1">Select Serials:</small>
                                                            <div className="d-flex flex-wrap gap-2" style={{ maxHeight: 100, overflowY: 'auto' }}>
                                                                {b.serials.map(s => {
                                                                    const isAllocated = allocatedSerials.has(s);
                                                                    const isSelected = selectedSerials[b.id]?.has(s);

                                                                    return (
                                                                        <div key={s} className="form-check form-check-inline mb-0">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                id={`ir-ser-${b.id}-${s}`}
                                                                                disabled={isAllocated}
                                                                                checked={!!isSelected || !!isAllocated}
                                                                                onChange={() => toggleSerial(b.id, s)}
                                                                            />
                                                                            <label className={`form-check-label small ${isAllocated ? 'text-decoration-line-through text-muted' : ''}`} htmlFor={`ir-ser-${b.id}-${s}`}>
                                                                                {s}
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{b.expiryDate || '-'}</td>
                                                <td>{b.costPrice ? Number(b.costPrice).toFixed(2) : '-'}</td>
                                                <td>{b.quantity}</td>
                                                <td>{allocatedQty}</td>
                                                <td style={{ verticalAlign: 'top' }}>
                                                    <div className="d-flex flex-column gap-1">
                                                        <div className="d-flex gap-1">
                                                            <Button size="sm" variant="success" onClick={() => addToAllocation(b, 1)}>+1</Button>
                                                            <Button size="sm" variant="success" onClick={() => addToAllocation(b, 5)}>+5</Button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {availBatches.length === 0 && <tr><td colSpan={5}>No available batches in Main Store</td></tr>}
                                </tbody>
                            </Table>
                        </div>
                        <div className="modal-footer d-flex justify-content-between">
                            <div className="text-muted small">
                                {Object.values(selectedSerials).reduce((acc, s) => acc + s.size, 0) > 0 &&
                                    <span>Selected {Object.values(selectedSerials).reduce((acc, s) => acc + s.size, 0)} serials to add.</span>
                                }
                            </div>
                            <div>
                                <Button variant="secondary" className="me-2" onClick={() => setShowBatchModal(false)}>Close</Button>
                                {Object.keys(selectedSerials).length > 0 && (
                                    <Button variant="primary" onClick={confirmSelections}>Add Selected Serials</Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
