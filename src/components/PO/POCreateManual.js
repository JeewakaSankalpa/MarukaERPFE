import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ========== INLINE API HELPERS ========== */
const qp = (o = {}) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v)); return u.toString(); };

const searchSuppliers = async (q, page = 0, size = 8) =>
    (await api.get(`/suppliers?${qp({ q, status: "ACTIVE", page, size, sort: "name,asc" })}`)).data; // Page<SupplierSummaryDTO>
const searchProducts = async (q, supplierId, page = 0, size = 8) =>
    (await api.get(`/products?${qp({ q, status: "ACTIVE", supplierId, page, size, sort: "name,asc" })}`)).data; // Page<ProductSummaryDTO>

const createPOManual = async (payload) => (await api.post(`/pos`, payload)).data;

/* ========== PAGE ========== */
export default function POCreateManual({ onCreated }) {
    const [supplierQ, setSupplierQ] = useState("");
    const [supplierPage, setSupplierPage] = useState(0);
    const [supplierData, setSupplierData] = useState({ content: [], totalPages: 0 });
    const [supplier, setSupplier] = useState(null);

    const [productQ, setProductQ] = useState("");
    const [productPage, setProductPage] = useState(0);
    const [productData, setProductData] = useState({ content: [], totalPages: 0 });

    const [etaDate, setEtaDate] = useState("");
    const [note, setNote] = useState("");

    // Rows: { productId, name, sku, unit, qty, unitPrice, taxPercent, taxAmount, note }
    // We now support explicit taxAmount per line if needed, but UI might still drive by %
    const [rows, setRows] = useState([]);

    // Settings & Toggles
    const [globalSettings, setGlobalSettings] = useState({});
    const [enableVat, setEnableVat] = useState(false);
    const [enableOtherTax, setEnableOtherTax] = useState(false);

    const [deliveryCharge, setDeliveryCharge] = useState(""); // User input

    // Load Settings on Mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await api.get('/settings');
                // Convert array [{key, value}] to object {KEY: value}
                const map = (res.data || []).reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {});
                setGlobalSettings(map);
            } catch (e) {
                console.warn("Failed to load settings", e);
            }
        };
        loadSettings();
    }, []);

    // Load suppliers
    const loadSuppliers = async () => {
        try { setSupplierData(await searchSuppliers(supplierQ, supplierPage, 8)); }
        catch { toast.error("Failed to search suppliers"); }
    };
    useEffect(() => { loadSuppliers(); }, [supplierPage]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load products
    const loadProducts = async () => {
        try {
            const sid = supplier?.id || "";
            setProductData(await searchProducts(productQ, sid, productPage, 8));
        } catch { toast.error("Failed to search products"); }
    };
    useEffect(() => { loadProducts(); }, [productPage, supplier?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const pickSupplier = (s) => { setSupplier(s); setRows([]); };

    const addProduct = (p) => {
        setRows(prev => prev.some(r => r.productId === p.id) ? prev : [
            ...prev, {
                productId: p.id, name: p.name, sku: p.sku, unit: p.unit || "pcs",
                qty: "", unitPrice: p.lastPurchasePrice || "",
                taxPercent: "", // Line-level tax override
                note: ""
            }
        ]);
    };

    const setRow = (i, k, v) => setRows(prev => { const cp = [...prev]; cp[i] = { ...cp[i], [k]: v }; return cp; });
    const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

    // Calculation Logic
    const totals = useMemo(() => {
        let sub = 0;

        // Sum line items
        rows.forEach(r => {
            const qty = Number(r.qty || 0);
            const price = Number(r.unitPrice || 0);
            sub += (qty * price);
        });

        // 1. Delivery Charge
        const del = Number(deliveryCharge || 0);

        // 2. Base for Tax (Subtotal + Delivery?) 
        // Typically VAT is on (Sub + Delivery) depending on implementation. 
        // User asked to "load tax and vat from saved ones... enable or disable"
        const taxableBase = sub + del;

        // 3. VAT
        let vatAmt = 0;
        let vatRate = 0;
        if (enableVat) {
            vatRate = Number(globalSettings['GLOBAL_VAT_PERCENT'] || 0);
            vatAmt = taxableBase * (vatRate / 100);
        }

        // 4. Other Tax (NBT/SSCL etc.) - simplfied as "Other Tax" for now
        let otherAmt = 0;
        let otherRate = 0;
        if (enableOtherTax) {
            otherRate = Number(globalSettings['GLOBAL_TAX_PERCENT'] || 0); // Reuse global tax key
            // Is this on base or base+VAT? Assuming base for now.
            otherAmt = taxableBase * (otherRate / 100);
        }

        return {
            sub,
            delivery: del,
            vatRate,
            vat: vatAmt,
            otherRate,
            other: otherAmt,
            grand: sub + del + vatAmt + otherAmt
        };
    }, [rows, deliveryCharge, enableVat, enableOtherTax, globalSettings]);

    const save = async () => {
        try {
            if (!supplier?.id) { toast.warn("Select a supplier"); return; }

            const items = rows.filter(r => Number(r.qty) > 0).map(r => ({
                productId: r.productId,
                qty: Number(r.qty),
                unitPrice: r.unitPrice ? String(r.unitPrice) : undefined,
                note: r.note || undefined,
                // We are using global tax mostly, line specific taxPercent is ignored here unless we want overrides
                // For this implementation, we rely on PO-level fields for the calculated tax breakdown
                // but if backend needs line tax, we could push it. 
                // Let's stick effectively to PO level tax for simplicity as per request
            }));

            if (items.length === 0) { toast.warn("Add at least one product line"); return; }

            const payload = {
                supplierId: supplier.id,
                etaDate: etaDate || null,
                note: note || null,
                items,
                // New Fields
                deliveryCharge: totals.delivery,
                vatAmount: totals.vat,
                otherTaxAmount: totals.other,
                grandTotal: totals.grand, // Optional if backend recalcs, but safer to send what user saw
                taxTotal: totals.vat + totals.other // Legacy field support
            };

            const po = await createPOManual(payload);
            toast.success(`PO ${po.poNumber} created`);
            onCreated?.(po.id);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to create PO");
        }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 1200, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <h2 className="mb-3" style={{ fontSize: "1.5rem" }}>Create Purchase Order (Manual)</h2>

                {/* Supplier select */}
                <Row className="g-3">
                    <Col md={6}>
                        <div className="p-3 border rounded h-100">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5 className="mb-0">Supplier</h5>
                                <div className="d-flex gap-2">
                                    <Form.Control placeholder="Search" value={supplierQ} onChange={e => setSupplierQ(e.target.value)} size="sm" style={{ maxWidth: 150 }} />
                                    <Button size="sm" variant="outline-secondary" onClick={() => { setSupplierPage(0); loadSuppliers(); }}>Find</Button>
                                </div>
                            </div>
                            {supplier ? (
                                <div className="alert alert-info py-2 mb-0 d-flex justify-content-between align-items-center">
                                    <strong>{supplier.name}</strong>
                                    <Button size="sm" variant="link" onClick={() => setSupplier(null)}>Change</Button>
                                </div>
                            ) : (
                                <Table size="sm" hover responsive className="mb-0">
                                    <tbody>
                                        {(supplierData.content || []).map(s => (
                                            <tr key={s.id}>
                                                <td>{s.name}</td>
                                                <td className="text-end"><Button size="sm" variant="outline-primary" onClick={() => pickSupplier(s)}>Select</Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    </Col>

                    <Col md={6}>
                        <div className="p-3 border rounded h-100">
                            <h5 className="mb-2">Details & Settings</h5>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-2">
                                        <Form.Label>ETA Date</Form.Label>
                                        <Form.Control type="date" value={etaDate} onChange={e => setEtaDate(e.target.value)} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-2">
                                        <Form.Label>Note</Form.Label>
                                        <Form.Control type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Remark..." />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <hr className="my-2" />

                            <div className="d-flex gap-3">
                                <Form.Check
                                    type="switch"
                                    id="enable-vat"
                                    label={`VAT (${globalSettings['GLOBAL_VAT_PERCENT'] || 0}%)`}
                                    checked={enableVat}
                                    onChange={e => setEnableVat(e.target.checked)}
                                />
                                <Form.Check
                                    type="switch"
                                    id="enable-other"
                                    label={`Other Tax (${globalSettings['GLOBAL_TAX_PERCENT'] || 0}%)`}
                                    checked={enableOtherTax}
                                    onChange={e => setEnableOtherTax(e.target.checked)}
                                />
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Products picker */}
                <div className="mt-4 p-3 border rounded bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="mb-0">Add Products</h5>
                        <div className="d-flex gap-2">
                            <Form.Control placeholder="Search products" value={productQ} onChange={e => setProductQ(e.target.value)} style={{ maxWidth: 200 }} size="sm" />
                            <Button size="sm" variant="outline-secondary" onClick={() => { setProductPage(0); loadProducts(); }}>Search</Button>
                        </div>
                    </div>
                    {/* Small Product List */}
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        <Table size="sm" hover className="mb-0 bg-white">
                            <tbody>
                                {(productData.content || []).map(p => (
                                    <tr key={p.id}>
                                        <td>{p.name}</td>
                                        <td><small className="text-muted">{p.sku}</small></td>
                                        <td className="text-end"><Button size="sm" variant="link" onClick={() => addProduct(p)} style={{ padding: 0 }}>Add +</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </div>

                {/* PO lines */}
                <div className="mt-4">
                    <Table hover responsive bordered>
                        <thead className="bg-light">
                            <tr>
                                <th>Product</th>
                                <th style={{ width: 100 }}>Qty</th>
                                <th style={{ width: 140 }}>Unit Price</th>
                                <th className="text-end" style={{ width: 150 }}>Line Total</th>
                                <th style={{ width: 50 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => {
                                const qty = Number(r.qty || 0), price = Number(r.unitPrice || 0);
                                const line = qty * price;
                                return (
                                    <tr key={r.productId}>
                                        <td>
                                            <div>{r.name}</div>
                                            <small className="text-muted">{r.sku}</small>
                                        </td>
                                        <td><Form.Control size="sm" type="number" min="0" value={r.qty} onChange={e => setRow(i, "qty", e.target.value)} /></td>
                                        <td><Form.Control size="sm" type="number" value={r.unitPrice} onChange={e => setRow(i, "unitPrice", e.target.value)} /></td>
                                        <td className="text-end align-middle">{line.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="align-middle"><Button size="sm" variant="close" onClick={() => removeRow(i)} /></td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No items added</td></tr>}
                        </tbody>
                    </Table>

                    {/* Totals Section */}
                    <Row className="justify-content-end mt-3">
                        <Col md={5} lg={4}>
                            <Table size="sm" borderless>
                                <tbody>
                                    <tr>
                                        <td>Subtotal</td>
                                        <td className="text-end fw-bold">{totals.sub.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr>
                                        <td className="align-middle">Delivery Charge</td>
                                        <td className="text-end">
                                            <Form.Control
                                                size="sm"
                                                type="number"
                                                className="text-end d-inline-block"
                                                style={{ width: '120px' }}
                                                value={deliveryCharge}
                                                onChange={e => setDeliveryCharge(e.target.value)}
                                            />
                                        </td>
                                    </tr>

                                    {enableVat && (
                                        <tr>
                                            <td>VAT ({totals.vatRate}%)</td>
                                            <td className="text-end">{totals.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                    {enableOtherTax && (
                                        <tr>
                                            <td>Other Tax ({totals.otherRate}%)</td>
                                            <td className="text-end">{totals.other.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}

                                    <tr className="border-top border-dark">
                                        <td className="fs-5 fw-bold">Grand Total</td>
                                        <td className="text-end fs-5 fw-bold">{totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </Table>
                            <Button className="w-100 mt-2" variant="success" size="lg" onClick={save}>Create PO</Button>
                        </Col>
                    </Row>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
