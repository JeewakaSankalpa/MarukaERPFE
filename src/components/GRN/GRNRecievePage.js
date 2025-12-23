import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Row, Col, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import { QRCodeSVG as QRCode } from 'qrcode.react';

/* ========== INLINE API HELPERS ========== */
const getPO = async (id) => (await api.get(`/pos/${id}`)).data;
const createGRN = async (payload) => (await api.post(`/grns`, payload)).data;

export default function GRNReceivePage({ poId: initialPoId }) {
    const [poId, setPoId] = useState(initialPoId || "");
    const [po, setPo] = useState(null);
    const [locationId, setLocationId] = useState("LOC_STORES_MAIN");
    const [rows, setRows] = useState([]); // {productId, receivedQty, unitCost, batches:[{batchNo,expiryDate,qty}], serials:[]}

    const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
    const [supplierInvoiceDate, setSupplierInvoiceDate] = useState("");
    const [creditPeriodDays, setCreditPeriodDays] = useState("");
    const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
    const [initialPaymentRef, setInitialPaymentRef] = useState("");

    useEffect(() => {
        (async () => {
            if (!poId) { setPo(null); setRows([]); return; }
            try {
                const d = await getPO(poId);
                setPo(d);
                setRows((d.items || []).map(it => ({
                    productId: it.productId,
                    productName: it.productName,
                    sku: it.sku,
                    unit: it.unit || "pcs",
                    orderedQty: it.orderedQty,
                    receivedQty: 0,
                    batches: [],
                    serials: []
                })));
            } catch { toast.error("Failed to load PO"); }
        })();
    }, [poId]);

    const setField = (i, k, v) => setRows(rs => { const cp = [...rs]; cp[i] = { ...cp[i], [k]: v }; return cp; });
    const addBatch = (i) => setRows(rs => {
        const cp = [...rs];
        const row = { ...cp[i] };
        row.batches = [...(row.batches || []), { batchNo: "", expiryDate: "", qty: "", unitCost: "" }];
        cp[i] = row;
        return cp;
    });
    const setBatch = (i, bi, k, v) => setRows(rs => { const cp = [...rs]; const bs = [...(cp[i].batches || [])]; bs[bi] = { ...bs[bi], [k]: v }; cp[i].batches = bs; return cp; });
    const rmBatch = (i, bi) => setRows(rs => { const cp = [...rs]; cp[i].batches = (cp[i].batches || []).filter((_, idx) => idx !== bi); return cp; });

    const [showQrModal, setShowQrModal] = useState(false);
    const [createdBatches, setCreatedBatches] = useState([]);

    const save = async () => {
        try {
            if (!po?.id) { toast.warn("Select a PO"); return; }
            const items = rows.map(r => {
                const totalQty = (r.batches || []).reduce((sum, b) => sum + (Number(b.qty) || 0), 0);
                return {
                    productId: r.productId,
                    unit: r.unit,
                    receivedQty: totalQty,
                    batches: (r.batches || []).filter(b => Number(b.qty) > 0).map(b => ({
                        batchNo: b.batchNo || undefined,
                        expiryDate: b.expiryDate || undefined,
                        qty: Number(b.qty),
                        unitCost: b.unitCost ? String(b.unitCost) : undefined,
                        serials: (b.serials || []).filter(s => s && s.trim())
                    })),
                    // Item-level serials no longer used
                    serials: []
                };
            }).filter(r => r.receivedQty > 0);

            if (items.length === 0) { toast.info("Enter received quantities via batches"); return; }

            const payload = {
                poId: po.id,
                locationId,
                items,
                supplierInvoiceNo,
                supplierInvoiceDate: supplierInvoiceDate || undefined,
                creditPeriodDays: creditPeriodDays ? Number(creditPeriodDays) : undefined,
                initialPaymentAmount: initialPaymentAmount ? Number(initialPaymentAmount) : undefined,
                initialPaymentRef
            };

            const res = await createGRN(payload);
            toast.success(`GRN ${res.grnNumber} posted`);

            // Success reset
            setPoId(""); setPo(null); setRows([]);
            setSupplierInvoiceNo(""); setSupplierInvoiceDate("");
            setCreditPeriodDays(""); setInitialPaymentAmount(""); setInitialPaymentRef("");

            // Fetch created batches for QR display
            try {
                const batches = (await api.get(`/inventory/batches?grnId=${res.id}`)).data;
                if (batches && batches.length > 0) {
                    setCreatedBatches(batches);
                    setShowQrModal(true);
                }
            } catch (e) {
                console.error("Failed to fetch batches for QR", e);
                toast.warn("GRN posted, but failed to load generated QR codes.");
            }

        } catch (e) { toast.error(e?.response?.data?.message || "Failed to post GRN"); }
    };

    const [printBatches, setPrintBatches] = useState([]);

    const handlePrintOne = (item) => {
        setPrintBatches([item]);
        setTimeout(() => {
            window.print();
            setPrintBatches([]); // clear after print dialog closes/invokes
        }, 500);
    };

    const handlePrintAll = () => {
        // Flatten logic
        const allItems = createdBatches.flatMap(batch => {
            if (batch.serials && batch.serials.length > 0) {
                return batch.serials.map(serial => ({
                    ...batch,
                    isSerial: true,
                    serialNo: serial,
                    qrValue: `V1|${batch.grnId || ''}|${batch.productId || ''}|${batch.id}|${batch.batchNumber}|${serial}|${batch.expiryDate || ''}`
                }));
            }
            return [{
                ...batch,
                isSerial: false,
                serialNo: '',
                qrValue: `V1|${batch.grnId || ''}|${batch.productId || ''}|${batch.id}|${batch.batchNumber}||${batch.expiryDate || ''}`
            }];
        });
        setPrintBatches(allItems);
        setTimeout(() => {
            window.print();
            setPrintBatches([]);
        }, 500);
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 1100, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={{ fontSize: "1.5rem" }}>Receive (GRN)</h2>
                    <div className="d-flex gap-2">
                        <Form.Control placeholder="PO ID" value={poId} onChange={e => setPoId(e.target.value)} style={{ maxWidth: 280 }} />
                        <Button variant="outline-secondary" onClick={() => setPoId(poId)}>Load</Button>
                    </div>
                </div>

                <Row className="g-3 mb-3">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Receive to Location</Form.Label>
                            <Form.Control value={locationId} onChange={e => setLocationId(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Supplier Invoice No</Form.Label>
                            <Form.Control value={supplierInvoiceNo} onChange={e => setSupplierInvoiceNo(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Invoice Date</Form.Label>
                            <Form.Control type="date" value={supplierInvoiceDate} onChange={e => setSupplierInvoiceDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Credit Period (Days)</Form.Label>
                            <Form.Control type="number" value={creditPeriodDays} onChange={e => setCreditPeriodDays(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Initial Payment</Form.Label>
                            <Form.Control type="number" value={initialPaymentAmount} onChange={e => setInitialPaymentAmount(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Payment Ref (Check No)</Form.Label>
                            <Form.Control value={initialPaymentRef} onChange={e => setInitialPaymentRef(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        {po && (
                            <div className="d-flex gap-3 align-items-center mt-4">
                                <Badge bg="light" text="dark">PO: {po.poNumber}</Badge>
                                <Badge bg="light" text="dark">Supplier: {po.supplierName}</Badge>
                                <Badge bg={po.status === "FULLY_RECEIVED" ? "success" : po.status === "PARTIALLY_RECEIVED" ? "info" : "secondary"}>{po.status}</Badge>
                            </div>
                        )}
                    </Col>
                </Row>

                {!po ? <div className="text-muted">Enter and load a PO to proceed.</div> :
                    <>
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>Product</th><th>SKU</th><th className="text-end">Ordered</th>
                                    <th style={{ width: 100 }}>Receive Qty</th><th>Batches / Serials</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => {
                                    // Calculate total qty from batches
                                    const totalQty = (r.batches || []).reduce((sum, b) => sum + (Number(b.qty) || 0), 0);

                                    return (
                                        <tr key={r.productId}>
                                            <td>{r.productName}</td>
                                            <td>{r.sku}</td>
                                            <td className="text-end">{r.orderedQty}</td>
                                            <td>
                                                <Form.Control type="number" readOnly value={totalQty} style={{ backgroundColor: '#e9ecef' }} />
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column gap-2">
                                                    {(r.batches || []).map((b, bi) => (
                                                        <div key={bi} className="border p-2 rounded">
                                                            <div className="d-flex gap-2 mb-2">
                                                                <Form.Control placeholder="Batch / Serial No" value={b.batchNo} onChange={e => setBatch(i, bi, "batchNo", e.target.value)} style={{ maxWidth: 180 }} />
                                                                <Form.Control type="date" value={b.expiryDate} onChange={e => setBatch(i, bi, "expiryDate", e.target.value)} style={{ maxWidth: 160 }} />
                                                                <Form.Control type="number" min="0" placeholder="Qty" value={b.qty} onChange={e => setBatch(i, bi, "qty", e.target.value)} style={{ maxWidth: 80 }} />
                                                                <Form.Control type="number" min="0" placeholder="Cost" value={b.unitCost} onChange={e => setBatch(i, bi, "unitCost", e.target.value)} style={{ maxWidth: 100 }} />
                                                                <Button size="sm" variant="outline-danger" onClick={() => rmBatch(i, bi)}>✕</Button>
                                                            </div>
                                                            {/* Serials input removed as per Unified Batch/Serial Request */}
                                                                    const val = e.target.value.split(",").map(s => s.trim());
                                                            setBatch(i, bi, "serials", val);
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="d-flex gap-2">
                                                        <Button size="sm" variant="outline-secondary" onClick={() => addBatch(i)}>+ Batch</Button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>

                        <Button className="w-100 mt-2" onClick={save}>Post GRN</Button>
                    </>}
            </div>

            {/* QR Codes Modal */}
            {showQrModal && (
                <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">GRN Successful - Generated Batches</h5>
                                <button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-muted">The following batches were created. You can scan these QR codes for tracking.</p>
                                <div className="row g-3">
                                    {createdBatches.flatMap(batch => {
                                        // If serials exist, create one card per serial
                                        if (batch.serials && batch.serials.length > 0) {
                                            return batch.serials.map(serial => ({
                                                ...batch,
                                                isSerial: true,
                                                serialNo: serial,
                                                qrValue: `V1|${batch.grnId || ''}|${batch.productId || ''}|${batch.id}|${batch.batchNumber}|${serial}|${batch.expiryDate || ''}`
                                            }));
                                        }
                                        // Otherwise return single batch card
                                        return [{
                                            ...batch,
                                            isSerial: false,
                                            serialNo: '',
                                            qrValue: `V1|${batch.grnId || ''}|${batch.productId || ''}|${batch.id}|${batch.batchNumber}||${batch.expiryDate || ''}`
                                        }];
                                    }).map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className="col-md-4 col-lg-3">
                                            <div className="card h-100 p-3 text-center">
                                                <div className="mb-2 d-flex justify-content-center">
                                                    <QRCode
                                                        value={item.qrValue}
                                                        size={120}
                                                        level={"M"}
                                                    />
                                                </div>
                                                <h6 className="mb-1">{item.batchNumber}</h6>
                                                {item.isSerial && <div className="badge bg-info text-dark mb-1">{item.serialNo}</div>}
                                                <small className="d-block text-muted">Qty: {item.isSerial ? 1 : item.quantity}</small>
                                                <small className="d-block text-muted">Exp: {item.expiryDate || "N/A"}</small>
                                                <Button size="sm" variant="outline-dark" className="mt-2" onClick={() => handlePrintOne(item)}>Print Sticker</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowQrModal(false)}>Close</button>
                                <button className="btn btn-primary" onClick={handlePrintAll}>Print All</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Section */}
            <div className="print-only-section">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {printBatches.map((item, idx) => (
                        <div key={idx} style={{
                            border: '1px dashed #000',
                            padding: '10px',
                            textAlign: 'center',
                            width: '200px',
                            height: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pageBreakInside: 'avoid'
                        }}>
                            <QRCode value={item.qrValue} size={100} level={"M"} />
                            <div style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>{item.batchNumber}</div>
                            {item.isSerial && <div style={{ fontSize: '10px' }}>SN: {item.serialNo}</div>}
                            <div style={{ fontSize: '10px' }}>Qty: {item.isSerial ? 1 : item.quantity}</div>
                        </div>
                    ))}
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
