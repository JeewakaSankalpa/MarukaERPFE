import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Table, Badge, Modal } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import CompletenessModal from '../ReusableComponents/CompletenessModal';
import { buildCompletenessIssues, hasBlockingIssues } from '../../utils/entityCompleteness';
import { ProductForm } from '../Inventory/ProductPage';
import { SupplierForm } from '../Supplier/SupplierPage';

/* ========== INLINE API HELPERS ========== */
const qp = (o = {}) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v)); return u.toString(); };

const searchSuppliers = async (q, page = 0, size = 100) =>
    (await api.get(`/suppliers?${qp({ q, status: "ACTIVE", page, size, sort: "name,asc" })}`)).data;
const searchProducts = async (q, supplierId, page = 0, size = 100) =>
    (await api.get(`/products?${qp({ q, status: "ACTIVE", supplierId, page, size, sort: "name,asc" })}`)).data;
const getSupplier = async (id) => (await api.get(`/suppliers/${id}`)).data;
const getProduct = async (id) => (await api.get(`/products/${id}`)).data;
const updateProduct = async (id, payload) => (await api.put(`/products/${id}`, payload)).data;

const createPOManual = async (payload) => (await api.post(`/pos`, payload)).data;

/* ========== PAGE ========== */
export default function POCreateManual({ onCreated }) {
    const navigate = useNavigate();
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
    const [rows, setRows] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completenessIssues, setCompletenessIssues] = useState([]);
    const [showCompletenessModal, setShowCompletenessModal] = useState(false);
    const [pendingCompletenessProceed, setPendingCompletenessProceed] = useState(null);
    const [editRecord, setEditRecord] = useState(null);
    const [showSupplierAssistModal, setShowSupplierAssistModal] = useState(false);
    const [supplierAssistLoading, setSupplierAssistLoading] = useState(false);
    const [commonSuppliers, setCommonSuppliers] = useState([]);
    const [showQuickSupplierCreate, setShowQuickSupplierCreate] = useState(false);
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
        try { setSupplierData(await searchSuppliers(supplierQ, supplierPage, 100)); }
        catch { toast.error("Failed to search suppliers"); }
    };
    useEffect(() => { loadSuppliers(); }, [supplierPage]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load products
    const loadProducts = async () => {
        try {
            const sid = supplier?.id || "";
            setProductData(await searchProducts(productQ, sid, productPage, 100));
        } catch { toast.error("Failed to search products"); }
    };
    useEffect(() => { loadProducts(); }, [productPage, supplier?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const pickSupplier = async (s, clearRows = true) => {
        try {
            setSupplier(await getSupplier(s.id));
            if (clearRows) setRows([]);
        } catch {
            setSupplier(s);
            if (clearRows) setRows([]);
            toast.warn("Loaded supplier summary only. Some completeness checks may be limited.");
        }
    };

    const addProduct = async (p) => {
        let product = p;
        try {
            product = await getProduct(p.id);
        } catch {
            toast.warn("Loaded product summary only. Some completeness checks may be limited.");
        }
        setRows(prev => prev.some(r => r.productId === p.id) ? prev : [
            ...prev, {
                productId: product.id, name: product.name, sku: product.sku, unit: product.unit || "",
                status: product.status, originalCostPrice: product.originalCostPrice, reorderLevel: product.reorderLevel,
                suppliers: product.suppliers || [], defaultSellingPrice: product.defaultSellingPrice,
                barcode: product.barcode, categoryId: product.categoryId,
                qty: "", unitPrice: product.lastPurchasePrice || product.originalCostPrice || "",
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

        // 2. Base for Tax
        const taxableBase = sub + del;

        // 3. VAT
        let vatAmt = 0;
        let vatRate = 0;
        if (enableVat) {
            vatRate = Number(globalSettings['GLOBAL_VAT_PERCENT'] || 0);
            vatAmt = taxableBase * (vatRate / 100);
        }

        // 4. Other Tax
        let otherAmt = 0;
        let otherRate = 0;
        if (enableOtherTax) {
            otherRate = Number(globalSettings['GLOBAL_TAX_PERCENT'] || 0);
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

    const openCompletenessModal = (issues, proceed = null) => {
        setCompletenessIssues(issues);
        setPendingCompletenessProceed(() => proceed);
        setShowCompletenessModal(true);
    };

    const runCompletenessChecks = () => {
        const supplierIssues = buildCompletenessIssues('supplierPurchase', supplier, item => item?.name || 'Supplier');
        const productIssues = buildCompletenessIssues('productPurchase', rows, item => item?.name || 'Product');
        return [...supplierIssues, ...productIssues];
    };

    const openIssueEditor = (issue) => {
        if (!issue?.entityId) return;
        setEditRecord({
            type: issue.ruleKey === 'supplierPurchase' ? 'supplier' : 'product',
            id: issue.entityId,
            name: issue.name
        });
    };

    const closeIssueEditor = () => setEditRecord(null);

    const refreshEditedRecord = async () => {
        if (!editRecord?.id) return;
        try {
            if (editRecord.type === 'supplier') {
                const updated = await getSupplier(editRecord.id);
                setSupplier(updated);
                return;
            }
            const updated = await getProduct(editRecord.id);
            setRows(prev => prev.map(row => row.productId === editRecord.id ? {
                ...row,
                name: updated.name,
                sku: updated.sku,
                unit: updated.unit || "",
                status: updated.status,
                originalCostPrice: updated.originalCostPrice,
                reorderLevel: updated.reorderLevel,
                suppliers: updated.suppliers || [],
                defaultSellingPrice: updated.defaultSellingPrice,
                barcode: updated.barcode,
                categoryId: updated.categoryId,
                unitPrice: row.unitPrice || updated.lastPurchasePrice || updated.originalCostPrice || ""
            } : row));
        } catch {
            toast.warn("Saved, but could not refresh the record in this screen.");
        } finally {
            closeIssueEditor();
        }
    };

    const activeSupplierLinks = (row) => (row.suppliers || []).filter(link => link?.supplierId && link.active !== false);

    const openSupplierAssist = async () => {
        if (rows.length === 0) { toast.warn("Add at least one product line"); return; }
        setShowSupplierAssistModal(true);
        setSupplierAssistLoading(true);
        setShowQuickSupplierCreate(false);
        try {
            const supplierIdSets = rows.map(row => new Set(activeSupplierLinks(row).map(link => link.supplierId)));
            const commonIds = supplierIdSets.length
                ? [...supplierIdSets[0]].filter(id => supplierIdSets.every(set => set.has(id)))
                : [];
            const suppliers = await Promise.all(commonIds.map(id => getSupplier(id).catch(() => ({ id, name: id }))));
            setCommonSuppliers(suppliers);
        } catch {
            toast.error("Failed to check available suppliers");
            setCommonSuppliers([]);
        } finally {
            setSupplierAssistLoading(false);
        }
    };

    const selectAssistedSupplier = async (candidate) => {
        await pickSupplier(candidate, false);
        setShowSupplierAssistModal(false);
    };

    const linkSupplierToSelectedProducts = async (savedSupplier) => {
        if (!savedSupplier?.id) return;
        const refreshedRows = [];
        for (const row of rows) {
            try {
                const product = await getProduct(row.productId);
                const links = product.suppliers || [];
                const alreadyLinked = links.some(link => link.supplierId === savedSupplier.id);
                if (!alreadyLinked) {
                    await updateProduct(product.id, {
                        barcode: product.barcode || undefined,
                        name: product.name,
                        categoryId: product.categoryId || undefined,
                        unit: product.unit || undefined,
                        status: product.status,
                        originalCostPrice: product.originalCostPrice || undefined,
                        defaultSellingPrice: product.defaultSellingPrice || undefined,
                        reorderLevel: product.reorderLevel,
                        suppliers: [
                            ...links,
                            {
                                supplierId: savedSupplier.id,
                                active: true
                            }
                        ]
                    });
                }
                const updated = await getProduct(row.productId);
                refreshedRows.push({
                    ...row,
                    suppliers: updated.suppliers || [],
                    defaultSellingPrice: updated.defaultSellingPrice,
                    barcode: updated.barcode,
                    categoryId: updated.categoryId,
                    unit: updated.unit || row.unit,
                    status: updated.status || row.status
                });
            } catch {
                refreshedRows.push(row);
            }
        }
        if (refreshedRows.length) setRows(refreshedRows);
    };

    const handleQuickSupplierSaved = async (savedSupplier) => {
        try {
            await linkSupplierToSelectedProducts(savedSupplier);
            setSupplier(savedSupplier);
            setShowSupplierAssistModal(false);
            toast.success("Supplier created and linked to selected products");
        } catch {
            setSupplier(savedSupplier);
            setShowSupplierAssistModal(false);
            toast.warn("Supplier selected, but product supplier links may need to be updated manually.");
        }
    };

    const performSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!supplier?.id) { toast.warn("Select a supplier"); setIsSubmitting(false); return; }

            const items = rows.filter(r => Number(r.qty) > 0).map(r => ({
                productId: r.productId,
                qty: Number(r.qty),
                unitPrice: r.unitPrice ? String(r.unitPrice) : undefined,
                note: r.note || undefined
            }));

            if (items.length === 0) { toast.warn("Add at least one product line"); return; }

            const payload = {
                supplierId: supplier.id,
                etaDate: etaDate || null,
                note: note || null,
                items,
                deliveryCharge: totals.delivery,
                vatAmount: totals.vat,
                otherTaxAmount: totals.other,
                grandTotal: totals.grand,
                taxTotal: totals.vat + totals.other
            };

            const po = await createPOManual(payload);
            toast.success(`PO ${po.poNumber} created`);
            onCreated?.(po.id);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to create PO");
        } finally {
            setIsSubmitting(false);
        }
    };

    const save = async () => {
        if (rows.length === 0) { toast.warn("Add at least one product line"); return; }
        if (!supplier?.id) {
            await openSupplierAssist();
            return;
        }

        const issues = runCompletenessChecks();
        if (issues.length > 0) {
            if (hasBlockingIssues(issues)) {
                openCompletenessModal(issues);
                return;
            }
            openCompletenessModal(issues, performSave);
            return;
        }

        await performSave();
    };

    return (
        <Container className="py-4">
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center">
                        <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                        <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Create Purchase Order (Manual)</h2>
                    </div>
                    <Badge bg="info" className="p-2">Format: MT/PO-{new Date().getFullYear().toString().slice(-2)}-MM-XXXXXX</Badge>
                </div>
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
                                <>
                                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
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
                                    </div>
                                    {supplierData.totalPages > 1 && (
                                        <div className="d-flex justify-content-between align-items-center mt-2">
                                            <Button size="sm" variant="outline-secondary" disabled={supplierPage === 0} onClick={() => setSupplierPage(p => p - 1)}>‹ Prev</Button>
                                            <small className="text-muted">Page {supplierPage + 1} / {supplierData.totalPages}</small>
                                            <Button size="sm" variant="outline-secondary" disabled={supplierPage >= supplierData.totalPages - 1} onClick={() => setSupplierPage(p => p + 1)}>Next ›</Button>
                                        </div>
                                    )}
                                </>
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
                                        <SafeDatePicker name="etaDate" value={etaDate} onChange={e => setEtaDate(e.target.value)} />
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
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        <Table size="sm" hover className="mb-0 bg-white">
                            <tbody>
                                {(productData.content || []).map(p => (
                                    <tr key={p.id}>
                                        <td>{p.name}</td>
                                        <td><small className="text-muted">{p.sku}</small></td>
                                        <td className="text-end"><Button size="sm" variant="link" onClick={() => addProduct(p)} style={{ padding: 0 }}>Add +</Button></td>
                                    </tr>
                                ))}
                                {productData.content?.length === 0 && (
                                    <tr><td colSpan={3} className="text-center text-muted small py-2">No products found</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                    {/* Product pagination */}
                    {productData.totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <Button size="sm" variant="outline-secondary" disabled={productPage === 0} onClick={() => setProductPage(p => p - 1)}>‹ Prev</Button>
                            <small className="text-muted">Page {productPage + 1} / {productData.totalPages} ({productData.totalElements} products)</small>
                            <Button size="sm" variant="outline-secondary" disabled={productPage >= productData.totalPages - 1} onClick={() => setProductPage(p => p + 1)}>Next ›</Button>
                        </div>
                    )}
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
                            <Button className="w-100 mt-2" variant="success" size="lg" onClick={save} disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create PO'}
                            </Button>
                        </Col>
                    </Row>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
            <CompletenessModal
                show={showCompletenessModal}
                issues={completenessIssues}
                title="Complete Supplier / Product Details"
                onClose={() => setShowCompletenessModal(false)}
                onEditIssue={openIssueEditor}
                onProceed={pendingCompletenessProceed ? () => {
                    setShowCompletenessModal(false);
                    pendingCompletenessProceed();
                } : null}
            />
            <Modal show={showSupplierAssistModal} onHide={() => setShowSupplierAssistModal(false)} size="xl" centered scrollable>
                <Modal.Header closeButton>
                    <Modal.Title>Select Supplier for Selected Products</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {!showQuickSupplierCreate ? (
                        <>
                            <div className="border rounded p-3 mb-3 bg-light">
                                <div className="fw-semibold mb-1">Selected products</div>
                                <div className="d-flex flex-wrap gap-2">
                                    {rows.map(row => (
                                        <Badge bg="secondary" key={row.productId}>{row.name}</Badge>
                                    ))}
                                </div>
                            </div>

                            {supplierAssistLoading ? (
                                <div className="text-muted py-4 text-center">Checking suppliers...</div>
                            ) : commonSuppliers.length > 0 ? (
                                <>
                                    <div className="mb-2 text-muted small">
                                        These suppliers are linked to every selected product.
                                    </div>
                                    <Table hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Supplier</th>
                                                <th>Phone</th>
                                                <th>Email</th>
                                                <th className="text-end"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {commonSuppliers.map(candidate => (
                                                <tr key={candidate.id}>
                                                    <td className="fw-semibold">{candidate.name}</td>
                                                    <td>{candidate.phone || "-"}</td>
                                                    <td>{candidate.email || "-"}</td>
                                                    <td className="text-end">
                                                        <Button size="sm" onClick={() => selectAssistedSupplier(candidate)}>Use this supplier</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </>
                            ) : (
                                <div className="alert alert-warning mb-3">
                                    No existing supplier is linked to all selected products. Create a supplier here and it will be linked to these products.
                                </div>
                            )}

                            <div className="d-flex justify-content-end gap-2">
                                <Button variant="outline-secondary" onClick={() => setShowSupplierAssistModal(false)}>Cancel</Button>
                                <Button variant="outline-primary" onClick={() => setShowQuickSupplierCreate(true)}>Create New Supplier</Button>
                            </div>
                        </>
                    ) : (
                        <SupplierForm
                            id={null}
                            compact
                            startEditing
                            onClose={() => setShowQuickSupplierCreate(false)}
                            onSaved={handleQuickSupplierSaved}
                        />
                    )}
                </Modal.Body>
            </Modal>
            <Modal show={Boolean(editRecord)} onHide={closeIssueEditor} size="xl" centered scrollable>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editRecord?.type === 'supplier' ? 'Edit Supplier Details' : 'Edit Product Details'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editRecord?.type === 'supplier' && (
                        <SupplierForm id={editRecord.id} compact startEditing onClose={closeIssueEditor} onSaved={refreshEditedRecord} />
                    )}
                    {editRecord?.type === 'product' && (
                        <ProductForm id={editRecord.id} compact startEditing onClose={closeIssueEditor} onSaved={refreshEditedRecord} />
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
}
