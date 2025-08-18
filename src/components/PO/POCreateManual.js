import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Table, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ========== INLINE API HELPERS ========== */
const qp = (o={}) => { const u=new URLSearchParams(); Object.entries(o).forEach(([k,v])=> (v||v===0)&&v!==""&&u.set(k,v)); return u.toString(); };

const searchSuppliers = async (q, page=0, size=8) =>
    (await api.get(`/suppliers?${qp({ q, status:"ACTIVE", page, size, sort:"name,asc" })}`)).data; // Page<SupplierSummaryDTO>
const searchProducts  = async (q, supplierId, page=0, size=8) =>
    (await api.get(`/products?${qp({ q, status:"ACTIVE", supplierId, page, size, sort:"name,asc" })}`)).data; // Page<ProductSummaryDTO>

const createPOManual  = async (payload) => (await api.post(`/pos`, payload)).data;

/* ========== PAGE ========== */
export default function POCreateManual({ onCreated }) {
    const [supplierQ, setSupplierQ] = useState("");
    const [supplierPage, setSupplierPage] = useState(0);
    const [supplierData, setSupplierData] = useState({ content:[], totalPages:0 });
    const [supplier, setSupplier] = useState(null);

    const [productQ, setProductQ] = useState("");
    const [productPage, setProductPage] = useState(0);
    const [productData, setProductData] = useState({ content:[], totalPages:0 });

    const [etaDate, setEtaDate] = useState("");
    const [note, setNote] = useState("");
    const [rows, setRows] = useState([]); // {productId, name, sku, unit, qty, unitPrice, taxPercent, note}

    // Load suppliers
    const loadSuppliers = async () => {
        try { setSupplierData(await searchSuppliers(supplierQ, supplierPage, 8)); }
        catch { toast.error("Failed to search suppliers"); }
    };
    useEffect(()=>{ loadSuppliers(); /* eslint-disable-next-line */ }, [supplierPage]);

    // Load products (optionally filtered by picked supplier)
    const loadProducts = async () => {
        try {
            const sid = supplier?.id || "";
            setProductData(await searchProducts(productQ, sid, productPage, 8));
        } catch { toast.error("Failed to search products"); }
    };
    useEffect(()=>{ loadProducts(); /* eslint-disable-next-line */ }, [productPage, supplier?.id]);

    const pickSupplier = (s) => { setSupplier(s); setRows([]); };

    const addProduct = (p) => {
        setRows(prev => prev.some(r => r.productId===p.id) ? prev : [
            ...prev, {
                productId: p.id, name: p.name, sku: p.sku, unit: p.unit || "pcs",
                qty: "", unitPrice: p.lastPurchasePrice || "", taxPercent: "", note: ""
            }
        ]);
    };

    const setRow = (i,k,v) => setRows(prev => { const cp=[...prev]; cp[i]={...cp[i],[k]:v}; return cp; });
    const removeRow = (i) => setRows(prev => prev.filter((_,idx)=>idx!==i));

    const totals = useMemo(() => {
        let sub = 0, tax = 0;
        rows.forEach(r => {
            const qty = Number(r.qty||0);
            const price = Number(r.unitPrice||0);
            const t = Number(r.taxPercent||0);
            const line = qty * price;
            const taxAmt = line * (t/100);
            sub += line; tax += taxAmt;
        });
        return { sub, tax, grand: sub + tax };
    }, [rows]);

    const save = async () => {
        try {
            if (!supplier?.id) { toast.warn("Select a supplier"); return; }
            const items = rows.filter(r => Number(r.qty)>0).map(r => ({
                productId: r.productId,
                qty: Number(r.qty),
                unitPrice: r.unitPrice ? String(r.unitPrice) : undefined,
                taxPercent: r.taxPercent ? String(r.taxPercent) : undefined,
                note: r.note || undefined
            }));
            if (items.length === 0) { toast.warn("Add at least one product line"); return; }

            const payload = {
                supplierId: supplier.id,
                etaDate: etaDate || null,
                note: note || null,
                items
            };
            const po = await createPOManual(payload);
            toast.success(`PO ${po.poNumber} created`);
            onCreated?.(po.id);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to create PO");
        }
    };

    return (
        <Container style={{ width:"80vw", maxWidth:1200, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">
                <h2 className="mb-3" style={{ fontSize:"1.5rem" }}>Create Purchase Order (Manual)</h2>

                {/* Supplier select */}
                <Row className="g-3">
                    <Col md={6}>
                        <div className="p-3 border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5 className="mb-0">Supplier</h5>
                                <div className="d-flex gap-2">
                                    <Form.Control placeholder="Search suppliers" value={supplierQ} onChange={e=>setSupplierQ(e.target.value)} style={{maxWidth:220}}/>
                                    <Button variant="outline-secondary" onClick={()=>{ setSupplierPage(0); loadSuppliers(); }}>Search</Button>
                                </div>
                            </div>
                            <Table size="sm" hover responsive>
                                <thead><tr><th>Name</th><th>Status</th><th></th></tr></thead>
                                <tbody>
                                {(supplierData.content||[]).map(s => (
                                    <tr key={s.id}>
                                        <td>{s.name}</td>
                                        <td>{s.status==="ACTIVE" ? <Badge bg="success">ACTIVE</Badge> : <Badge bg="secondary">INACTIVE</Badge>}</td>
                                        <td><Button size="sm" onClick={()=>pickSupplier(s)}>Select</Button></td>
                                    </tr>
                                ))}
                                </tbody>
                            </Table>
                            <div className="d-flex justify-content-between">
                                <div>Page {supplierPage+1}/{Math.max(1, supplierData.totalPages||1)}</div>
                                <div className="d-flex gap-2">
                                    <Button size="sm" variant="outline-secondary" disabled={supplierPage===0} onClick={()=>setSupplierPage(p=>p-1)}>Prev</Button>
                                    <Button size="sm" variant="outline-secondary" disabled={supplierPage+1>=(supplierData.totalPages||1)} onClick={()=>setSupplierPage(p=>p+1)}>Next</Button>
                                </div>
                            </div>
                            {supplier && <div className="mt-2">Selected: <Badge bg="light" text="dark">{supplier.name}</Badge></div>}
                        </div>
                    </Col>

                    <Col md={6}>
                        <div className="p-3 border rounded">
                            <h5 className="mb-2">PO Meta</h5>
                            <Form.Group className="mb-2">
                                <Form.Label>ETA Date</Form.Label>
                                <Form.Control type="date" value={etaDate} onChange={e=>setEtaDate(e.target.value)} />
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>Note</Form.Label>
                                <Form.Control as="textarea" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note to supplier or internal remark"/>
                            </Form.Group>
                        </div>
                    </Col>
                </Row>

                {/* Products picker */}
                <div className="mt-4 p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="mb-0">Products</h5>
                        <div className="d-flex gap-2">
                            <Form.Control placeholder="Search products" value={productQ} onChange={e=>setProductQ(e.target.value)} style={{maxWidth:240}}/>
                            <Button variant="outline-secondary" onClick={()=>{ setProductPage(0); loadProducts(); }}>Search</Button>
                        </div>
                    </div>
                    <Table size="sm" hover responsive>
                        <thead><tr><th>Name</th><th>SKU</th><th>Unit</th><th></th></tr></thead>
                        <tbody>
                        {(productData.content||[]).map(p => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.sku}</td>
                                <td>{p.unit || "pcs"}</td>
                                <td><Button size="sm" onClick={()=>addProduct(p)}>Add</Button></td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                    <div className="d-flex justify-content-between">
                        <div>Page {productPage+1}/{Math.max(1, productData.totalPages||1)}</div>
                        <div className="d-flex gap-2">
                            <Button size="sm" variant="outline-secondary" disabled={productPage===0} onClick={()=>setProductPage(p=>p-1)}>Prev</Button>
                            <Button size="sm" variant="outline-secondary" disabled={productPage+1>=(productData.totalPages||1)} onClick={()=>setProductPage(p=>p+1)}>Next</Button>
                        </div>
                    </div>
                </div>

                {/* PO lines */}
                <div className="mt-4">
                    <Table hover responsive>
                        <thead>
                        <tr>
                            <th>Product</th><th>SKU</th><th>Unit</th>
                            <th style={{width:120}}>Qty</th>
                            <th style={{width:140}}>Unit Price</th>
                            <th style={{width:120}}>Tax %</th>
                            <th className="text-end">Line Total</th>
                            <th style={{width:80}}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r,i) => {
                            const qty = Number(r.qty||0), price = Number(r.unitPrice||0), tax = Number(r.taxPercent||0);
                            const line = qty*price, taxAmt = line*(tax/100), total = line+taxAmt;
                            return (
                                <tr key={r.productId}>
                                    <td>{r.name}</td>
                                    <td>{r.sku}</td>
                                    <td>{r.unit}</td>
                                    <td><Form.Control type="number" min="0" value={r.qty} onChange={e=>setRow(i,"qty",e.target.value)} /></td>
                                    <td><Form.Control value={r.unitPrice} onChange={e=>setRow(i,"unitPrice",e.target.value)} /></td>
                                    <td><Form.Control value={r.taxPercent} onChange={e=>setRow(i,"taxPercent",e.target.value)} /></td>
                                    <td className="text-end">{isFinite(total)? total.toFixed(2) : "0.00"}</td>
                                    <td><Button size="sm" variant="link" onClick={()=>removeRow(i)}>Remove</Button></td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </Table>

                    {/* totals */}
                    <div className="d-flex flex-column align-items-end">
                        <div>Subtotal: <strong>{totals.sub.toFixed(2)}</strong></div>
                        <div>Tax: <strong>{totals.tax.toFixed(2)}</strong></div>
                        <div>Grand Total: <strong>{totals.grand.toFixed(2)}</strong></div>
                    </div>

                    <Button className="w-100 mt-3" onClick={save}>Create PO</Button>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
