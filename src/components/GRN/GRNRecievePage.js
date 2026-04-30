import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Row, Col, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import { QRCodeSVG as QRCode } from 'qrcode.react';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';

/* ========== INLINE API HELPERS ========== */
const getPO = async (id) => (await api.get(`/pos/${id}`)).data;
const searchPOs = async (q) => (await api.get(`/pos?q=${q}`)).data;
const createGRN = async (payload) => (await api.post(`/grns`, payload)).data;

export default function GRNReceivePage({ poId: initialPoId }) {
    const navigate = useNavigate();
    const [poInput, setPoInput] = useState(initialPoId || "");  // what the user types
    const [poId, setPoId] = useState(initialPoId || "");         // triggers the fetch
    const [po, setPo] = useState(null);
    const [locationId, setLocationId] = useState("LOC_STORES_MAIN");
    const [rows, setRows] = useState([]); // {productId, productName, sku, unit, orderedQty, batches:[]}

    const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
    const [supplierInvoiceDate, setSupplierInvoiceDate] = useState("");
    const [creditPeriodDays, setCreditPeriodDays] = useState("");
    const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
    const [initialPaymentRef, setInitialPaymentRef] = useState("");
    const [vatAmount, setVatAmount] = useState("");
    const [deliveryCharge, setDeliveryCharge] = useState("");

    const [posting, setPosting] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [createdBatches, setCreatedBatches] = useState([]);
    const [printBatches, setPrintBatches] = useState([]);

    useEffect(() => {
        (async () => {
            if (!poId) { setPo(null); setRows([]); return; }
            try {
                let actualId = poId;
                if (poId.toUpperCase().startsWith("MT/PO-") || poId.toUpperCase().startsWith("PO-") || poId.toUpperCase().startsWith("MIN-") || poId.toUpperCase().startsWith("MJN-")) {
                    const searchRes = await searchPOs(poId);
                    if (searchRes && searchRes.content && searchRes.content.length > 0) {
                        const preciseMatch = searchRes.content.find(p => p.poNumber === poId.trim().toUpperCase() || p.jobNumber === poId.trim().toUpperCase());
                        actualId = preciseMatch ? preciseMatch.id : searchRes.content[0].id;
                    } else {
                        toast.error(`No PO found matching "${poId.trim()}"`);
                        setPoId("");
                        return;
                    }
                }
                const d = await getPO(actualId);
                setPoInput(d.poNumber); // update the label with full number
                setPo(d);
                setRows((d.items || []).map(it => ({
                    productId: it.productId,
                    productName: it.productNameSnapshot || it.productName,
                    sku: it.sku,
                    unit: it.unit || "pcs",
                    orderedQty: it.orderedQty,
                    batches: []
                })));
                if (d.deliveryCharge) setDeliveryCharge(d.deliveryCharge);
                if (d.vatAmount) setVatAmount(d.vatAmount);
            } catch (e) { console.error(e); toast.error(e?.response?.data?.message || e?.message || "Failed to load PO"); }
        })();
    }, [poId]);

    const addBatch = (i) => setRows(rs => {
        const cp = [...rs];
        cp[i] = { ...cp[i], batches: [...(cp[i].batches || []), { batchNo: "", expiryDate: "", qty: "", unitCost: "" }] };
        return cp;
    });
    const setBatch = (i, bi, k, v) => setRows(rs => {
        const cp = [...rs];
        const bs = [...(cp[i].batches || [])]; bs[bi] = { ...bs[bi], [k]: v }; cp[i] = { ...cp[i], batches: bs };
        return cp;
    });
    const rmBatch = (i, bi) => setRows(rs => {
        const cp = [...rs];
        cp[i] = { ...cp[i], batches: (cp[i].batches || []).filter((_, idx) => idx !== bi) };
        return cp;
    });

    const save = async () => {
        try {
            if (!po?.id) { toast.warn("Select a PO"); return; }
            const items = rows.map(r => {
                const activeBatches = (r.batches || []).filter(b => Number(b.qty) > 0);
                
                // Validate Unit Cost for each active batch
                for (const b of activeBatches) {
                    if (!b.unitCost || isNaN(Number(b.unitCost)) || Number(b.unitCost) <= 0) {
                        throw new Error(`Unit Cost is required and must be greater than zero for product: ${r.productName}`);
                    }
                }

                const totalQty = activeBatches.reduce((sum, b) => sum + (Number(b.qty) || 0), 0);
                return {
                    productId: r.productId,
                    unit: r.unit,
                    receivedQty: totalQty,
                    batches: activeBatches.map(b => ({
                        batchNo: b.batchNo || undefined,
                        expiryDate: b.expiryDate || undefined,
                        qty: Number(b.qty),
                        unitCost: String(b.unitCost),
                        serials: []
                    })),
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
                initialPaymentRef,
                vatAmount: vatAmount ? Number(vatAmount) : 0,
                deliveryCharge: deliveryCharge ? Number(deliveryCharge) : 0
            };

            setPosting(true);
            const res = await createGRN(payload);
            toast.success(`GRN ${res.grnNumber} posted`);

            // Reset form
            setPoInput(""); setPoId(""); setPo(null); setRows([]);
            setSupplierInvoiceNo(""); setSupplierInvoiceDate("");
            setCreditPeriodDays(""); setInitialPaymentAmount(""); setInitialPaymentRef("");

            // Fetch created batches for QR display
            try {
                const batches = (await api.get(`/inventory/batches?grnId=${res.id}`)).data;
                if (batches && batches.length > 0) {
                    setCreatedBatches(batches);
                    setShowQrModal(true);
                } else {
                    toast.info("GRN posted. No batch QR codes to display.");
                }
            } catch (e) {
                console.error("Failed to fetch batches for QR", e);
                toast.warn("GRN posted, but failed to load generated QR codes.");
            }

        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to post GRN");
        } finally {
            setPosting(false);
        }
    };

    const buildQrItems = (batches) => batches.flatMap(batch => {
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

    const handlePrintOne = (item) => {
        setPrintBatches([item]);
        setTimeout(() => { window.print(); setPrintBatches([]); }, 500);
    };

    const handlePrintAll = () => {
        setPrintBatches(buildQrItems(createdBatches));
        setTimeout(() => { window.print(); setPrintBatches([]); }, 500);
    };

    return (
        <Container className="py-4">
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center mb-4">
                        <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                        <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Receive (GRN)</h2>
                    </div>
                    <div className="d-flex gap-2">
                        <Form.Control
                            placeholder="PO Number"
                            value={poInput}
                            onChange={e => setPoInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') setPoId(poInput.trim()); }}
                            style={{ maxWidth: 200 }}
                        />
                        <Button variant="outline-primary" onClick={() => setPoId(poInput.trim())}>Load</Button>
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
                            <SafeDatePicker name="supplierInvoiceDate" value={supplierInvoiceDate} onChange={e => setSupplierInvoiceDate(e.target.value)} />
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
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>VAT Amount</Form.Label>
                            <Form.Control type="number" value={vatAmount} onChange={e => setVatAmount(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Delivery Charge</Form.Label>
                            <Form.Control type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        {po && (
                            <div className="d-flex gap-3 align-items-center mt-4">
                                <Badge bg="light" text="dark">PO: {po.poNumber}</Badge>
                                <Badge bg="light" text="dark">Supplier: {po.supplierNameSnapshot || po.supplierName}</Badge>
                                <Badge bg={po.status === "FULLY_RECEIVED" ? "success" : po.status === "PARTIALLY_RECEIVED" ? "info" : "secondary"}>{po.status}</Badge>
                                <Badge bg="primary">Payable: Rs. {((rows.reduce((acc, r) => acc + (r.batches || []).reduce((sum, b) => sum + ((Number(b.qty) || 0) * (Number(b.unitCost) || 0)), 0), 0)) + (Number(vatAmount) || 0) + (Number(deliveryCharge) || 0)).toFixed(2)}</Badge>
                            </div>
                        )}
                    </Col>
                </Row>

                {!po
                    ? <div className="text-muted">Enter and load a PO to proceed.</div>
                    : (
                        <>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>Product</th><th>SKU</th><th className="text-end">Ordered</th>
                                        <th style={{ width: 100 }}>Receive Qty</th><th>Batches</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => {
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
                                                                <div className="d-flex gap-2">
                                                                    <Form.Control
                                                                        placeholder="Batch No"
                                                                        value={b.batchNo}
                                                                        onChange={e => setBatch(i, bi, "batchNo", e.target.value)}
                                                                        style={{ maxWidth: 160 }}
                                                                    />
                                                                    <SafeDatePicker
                                                                        name="expiryDate"
                                                                        value={b.expiryDate}
                                                                        onChange={e => setBatch(i, bi, "expiryDate", e.target.value)}
                                                                        style={{ maxWidth: 150 }}
                                                                    />
                                                                    <Form.Control
                                                                        type="number" min="0" placeholder="Qty"
                                                                        value={b.qty}
                                                                        onChange={e => setBatch(i, bi, "qty", e.target.value)}
                                                                        style={{ maxWidth: 80 }}
                                                                    />
                                                                    <Form.Control
                                                                        type="number" min="0" step="0.01" placeholder="Unit Cost *"
                                                                        value={b.unitCost}
                                                                        onChange={e => setBatch(i, bi, "unitCost", e.target.value)}
                                                                        style={{ maxWidth: 110, borderColor: (!b.unitCost && b.qty > 0) ? 'red' : undefined }}
                                                                    />
                                                                    <Button size="sm" variant="outline-danger" onClick={() => rmBatch(i, bi)}>✕</Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div>
                                                            <Button size="sm" variant="outline-secondary" onClick={() => addBatch(i)}>+ Batch</Button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>

                            <Button
                                className="w-100 mt-2"
                                onClick={save}
                                disabled={posting || po.status === 'FULLY_RECEIVED'}
                            >
                                {posting
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Posting GRN&hellip;</>
                                    : po.status === 'FULLY_RECEIVED' ? "PO Already Fully Received" : "Post GRN"}
                            </Button>
                        </>
                    )
                }
            </div>

            {/* QR Codes Modal */}
            {showQrModal && (
                <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">GRN Successful — Generated Batches</h5>
                                <button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-muted">Scan these QR codes for inventory tracking.</p>
                                <div className="row g-3">
                                    {buildQrItems(createdBatches).map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className="col-md-4 col-lg-3">
                                            <div className="card h-100 p-3 text-center">
                                                <div className="mb-2 d-flex justify-content-center">
                                                    <QRCode value={item.qrValue} size={120} level="M" />
                                                </div>
                                                <h6 className="mb-1">{item.batchNumber || item.batchNo}</h6>
                                                {item.isSerial && <div className="badge bg-info text-dark mb-1">{item.serialNo}</div>}
                                                <small className="d-block text-muted">Product: {item.productNameSnapshot || item.productId}</small>
                                                <small className="d-block text-muted">Qty: {item.isSerial ? 1 : (item.quantity || item.receivedQty)}</small>
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
                            border: '1px dashed #000', padding: '10px', textAlign: 'center',
                            width: '200px', height: '200px', display: 'flex',
                            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            pageBreakInside: 'avoid'
                        }}>
                            <QRCode value={item.qrValue} size={100} level="M" />
                            <div style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>{item.batchNumber || item.batchNo}</div>
                            {item.isSerial && <div style={{ fontSize: '10px' }}>SN: {item.serialNo}</div>}
                            <div style={{ fontSize: '10px' }}>Qty: {item.isSerial ? 1 : (item.quantity || item.receivedQty)}</div>
                        </div>
                    ))}
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
