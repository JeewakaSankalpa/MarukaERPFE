import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Container, Button, Form, Table, Row, Col, Badge, InputGroup
} from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ================== Inline API helpers ================== */
const qp = (o = {}) => {
    const u = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v));
    return u.toString();
};

const listActiveSuppliers = async () =>
    (await api.get(`/suppliers?${qp({ status: "ACTIVE", page: 0, size: 100, sort: "name,asc" })}`)).data?.content || [];

const listProductsBySupplier = async (supplierId) =>
    (await api.get(`/products?${qp({ supplierId, status: "ACTIVE", page: 0, size: 1000, sort: "name,asc" })}`)).data?.content || [];

/** Preferred (faster): batch summary */
const getInventorySummaryBatch = async (productIds) => {
    try {
        const res = await api.post(`/inventory/summary/batch`, { productIds });
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return null; // fall back to per-product
    }
};

/** Fallback: single summary */
const getInventorySummary = async (productId) =>
    (await api.get(`/inventory/summary?${qp({ productId })}`)).data;

/** Create PR */
const createPR = async (payload) => (await api.post(`/prs`, payload)).data;

/** Fetch PR details */
const getPR = async (id) => (await api.get(`/prs/${id}`)).data;

/** Download server PDF */
const fetchPRPdfBlob = async (id) => {
    const res = await api.get(`/prs/${id}/pdf`, { responseType: "blob" });
    return res.data; // Blob
};

/* ================== Lightweight formatters ================== */
const fmtNum = (v) => (v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString());
const safe = (s) => (s ?? "");

/* ================== Create / Edit Form ================== */
function PRForm({ onSaved }) {
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState("");
    const [products, setProducts] = useState([]); // supplier's products
    const [summaries, setSummaries] = useState({}); // {productId: { totalQty, serialTracked, serialCount }}
    const [rows, setRows] = useState([]); // editable lines: {productId, name, sku, unit, qty, note}
    const [comment, setComment] = useState("");
    const [validated, setValidated] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setSuppliers(await listActiveSuppliers());
            } catch {
                toast.error("Failed to load suppliers");
            }
        })();
    }, []);

    // load products when supplier changes
    useEffect(() => {
        (async () => {
            if (!supplierId) { setProducts([]); setRows([]); setSummaries({}); return; }
            setLoadingProducts(true);
            try {
                const list = await listProductsBySupplier(supplierId);
                setProducts(list);

                // build a default grid of 0 qty rows
                setRows(list.map(p => ({
                    productId: p.id, name: p.name, sku: p.sku, unit: p.unit || "pcs", qty: "", note: ""
                })));

                // inventory summaries (prefer batch)
                const ids = list.map(p => p.id);
                const batch = await getInventorySummaryBatch(ids);
                if (batch) {
                    const map = {};
                    batch.forEach(su => { map[su.productId] = su; });
                    setSummaries(map);
                } else {
                    // fallback: sequential (okay for <1000)
                    const map = {};
                    for (const id of ids) {
                        try { map[id] = await getInventorySummary(id); } catch { /* ignore */ }
                    }
                    setSummaries(map);
                }
            } catch {
                toast.error("Failed to load products");
            } finally {
                setLoadingProducts(false);
            }
        })();
    }, [supplierId]);

    const totalLines = useMemo(() => rows.filter(r => Number(r.qty) > 0).length, [rows]);

    const setRow = (i, key, value) => {
        setRows(prev => {
            const copy = [...prev];
            copy[i] = { ...copy[i], [key]: value };
            return copy;
        });
    };

    const save = async (e) => {
        e.preventDefault();
        setValidated(true);
        if (!supplierId) return;
        const items = rows
            .filter(r => Number(r.qty) > 0)
            .map(r => ({ productId: r.productId, quantity: Number(r.qty), unit: r.unit || "pcs", note: r.note || "" }));
        if (items.length === 0) {
            toast.warn("Please enter quantities for at least one product");
            return;
        }

        try {
            const payload = { supplierId, comment: comment || "", items };
            const created = await createPR(payload);
            toast.success("Purchase Request created");
            onSaved?.(created.id);
        } catch (err) {
            if (err?.response?.status === 400) toast.error(err.response.data?.message || "Validation failed");
            else toast.error("Failed to create PR");
        }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 980, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center">
                    <h2 style={{ fontSize: "1.5rem" }}>Create Purchase Request</h2>
                </div>

                <Form noValidate validated={validated} onSubmit={save} className="mt-3">
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Supplier *</Form.Label>
                                <Form.Select
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    required
                                    isInvalid={validated && !supplierId}
                                >
                                    <option value="">Select supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">Please select a supplier.</Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Comment</Form.Label>
                                <Form.Control as="textarea" rows={1} value={comment} onChange={(e) => setComment(e.target.value)} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Items ({fmtNum(totalLines)})</h5>
                            {loadingProducts && <Badge bg="info">Loading products…</Badge>}
                        </div>

                        <Table hover responsive size="sm">
                            <thead>
                            <tr>
                                <th style={{ minWidth: 180 }}>Product</th>
                                <th>SKU</th>
                                <th>Stock</th>
                                <th>Serial</th>
                                <th style={{ width: 140 }}>Qty</th>
                                <th style={{ minWidth: 200 }}>Note</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map((r, i) => {
                                const sum = summaries[r.productId] || {};
                                const serialTracked = !!sum.serialTracked;
                                return (
                                    <tr key={r.productId}>
                                        <td>{r.name}</td>
                                        <td>{r.sku}</td>
                                        <td>
                                            {fmtNum(sum.totalQty || 0)}{" "}
                                            <span className="text-muted">({safe(r.unit)})</span>
                                        </td>
                                        <td>
                                            {serialTracked ? (
                                                <Badge bg="secondary">Tracked ({fmtNum(sum.serialCount || 0)})</Badge>
                                            ) : (
                                                <span className="text-muted">No</span>
                                            )}
                                        </td>
                                        <td>
                                            <InputGroup>
                                                <Form.Control
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    value={r.qty}
                                                    onChange={(e) => setRow(i, "qty", e.target.value)}
                                                />
                                                <InputGroup.Text>{safe(r.unit)}</InputGroup.Text>
                                            </InputGroup>
                                        </td>
                                        <td>
                                            <Form.Control
                                                value={r.note}
                                                onChange={(e) => setRow(i, "note", e.target.value)}
                                                placeholder="optional"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </Table>
                    </div>

                    <Button type="submit" className="w-100 mt-3">Save Purchase Request</Button>
                </Form>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

/* ================== View / Print ================== */
function PRView({ id, onBack }) {
    const [pr, setPr] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        (async () => {
            try {
                setPr(await getPR(id));
            } catch {
                toast.error("Failed to load PR");
            }
        })();
    }, [id]);

    const downloadPdf = async () => {
        try {
            const blob = await fetchPRPdfBlob(id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${pr?.prNumber || "PR"}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Failed to download PDF");
        }
    };

    const printHtml = () => {
        if (!printRef.current) return;
        const content = printRef.current.innerHTML;
        const win = window.open("", "printWindow", "width=900,height=700");
        win.document.open();
        win.document.write(`
      <html>
        <head>
          <title>${pr?.prNumber || "Purchase Request"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; }
            .logo { height: 48px; }
            h1 { font-size: 20px; margin: 0 0 4px 0; }
            .meta { color:#555; font-size: 12px; }
            table { width:100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border:1px solid #ccc; padding:8px; font-size: 12px; }
            th { background:#f8f8f8; }
            .footer { margin-top:24px; font-size: 12px; color:#666; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);
        win.document.close();
    };

    if (!pr) return (
        <Container style={{ width: "80vw", maxWidth: 980, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">Loading…</div>
        </Container>
    );

    return (
        <Container style={{ width: "80vw", maxWidth: 980, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center">
                    <h2 style={{ fontSize: "1.5rem" }}>Purchase Request</h2>
                    <div className="d-flex gap-2">
                        <Button variant="outline-secondary" onClick={onBack}>Back</Button>
                        <Button variant="outline-primary" onClick={downloadPdf}>Download PDF</Button>
                        <Button variant="success" onClick={printHtml}>Print</Button>
                    </div>
                </div>

                {/* Printable content */}
                <div ref={printRef}>
                    <div className="header">
                        <img src="/logo-maruka.png" alt="Maruka" className="logo" />
                        <div style={{ textAlign: "right" }}>
                            <h1>Purchase Request</h1>
                            <div className="meta">
                                <div><strong>No:</strong> {pr.prNumber}</div>
                                <div><strong>Date:</strong> {new Date(pr.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="meta" style={{ marginBottom: 8 }}>
                        <div><strong>Supplier:</strong> {pr.supplierName} ({pr.supplierCode || "-"})</div>
                        <div><strong>Comment:</strong> {pr.comment || "-"}</div>
                    </div>

                    <table>
                        <thead>
                        <tr>
                            <th style={{ width: "40%" }}>Product</th>
                            <th>SKU</th>
                            <th>Unit</th>
                            <th style={{ textAlign: "right" }}>Qty</th>
                            <th>Note</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(pr.items || []).map((it, idx) => (
                            <tr key={idx}>
                                <td>{it.productName}</td>
                                <td>{it.sku}</td>
                                <td>{it.unit || "pcs"}</td>
                                <td style={{ textAlign: "right" }}>{fmtNum(it.quantity)}</td>
                                <td>{it.note || ""}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    <div className="footer">
                        <div><strong>Prepared by:</strong> {pr.createdBy || "—"}</div>
                        <div>© Maruka — Generated by MarukaERP</div>
                    </div>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

/* ================== Page Switch ================== */
export default function PurchaseRequestPage() {
    const [mode, setMode] = useState("form"); // "form" | "view"
    const [prId, setPrId] = useState(null);

    return mode === "form"
        ? <PRForm onSaved={(id) => { setPrId(id); setMode("view"); }} />
        : <PRView id={prId} onBack={() => { setMode("form"); setPrId(null); }} />;
}
