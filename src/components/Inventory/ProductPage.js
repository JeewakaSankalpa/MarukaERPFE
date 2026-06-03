import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Badge, Row, Col, Tabs, Tab, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import Select from "react-select";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ================== Inline API helpers (same file) ================== */
const qp = (o = {}) => {
    const u = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v));
    return u.toString();
};
const listProducts = async (opts = {}) =>
    (await api.get(`/products?${qp({ page: 0, size: 10, sort: "name,asc", ...opts })}`)).data;
const getProduct = async (id) => (await api.get(`/products/${id}`)).data;
const createProduct = async (payload) => (await api.post("/products", payload)).data;
const updateProduct = async (id, payload) => (await api.put(`/products/${id}`, payload)).data;
const patchProductStatus = async (id, status) =>
    (await api.patch(`/products/${id}/status`, { status })).data;
const getReorderSuggestion = async (id) => (await api.get(`/products/${id}/reorder-suggestion`)).data;

const listSuppliersQuick = async () =>
    (await api.get(`/suppliers?${qp({ status: "ACTIVE", page: 0, size: 100, sort: "name,asc" })}`)).data?.content || [];

/* ================== List ================== */
function ProductList({ onOpen }) {
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [data, setData] = useState({ content: [], totalPages: 0 });

    const load = async () => {
        try {
            const res = await listProducts({ q, status, page, size, sort: "name,asc" });
            setData(res);
        } catch {
            toast.error("Failed to load products");
        }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status]);

    const onSearch = () => { setPage(0); load(); };
    const toggleStatus = async (row) => {
        try {
            const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await patchProductStatus(row.id, next);
            load();
        } catch { toast.error("Failed to update status"); }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 900, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Products</h2>
                        </div>
<Button onClick={() => onOpen(null)}>+ New Product</Button>
                </div>

                <div className="d-flex gap-2 mb-3">
                    <Form.Control placeholder="Search name/SKU/barcode" value={q} onChange={e => setQ(e.target.value)} />
                    <Select
                        options={[
                            { value: '', label: 'All' },
                            { value: 'ACTIVE', label: 'Active' },
                            { value: 'INACTIVE', label: 'Inactive' }
                        ]}
                        value={[
                            { value: '', label: 'All' },
                            { value: 'ACTIVE', label: 'Active' },
                            { value: 'INACTIVE', label: 'Inactive' }
                        ].find(o => o.value === status) || { value: '', label: 'All' }}
                        onChange={opt => setStatus(opt ? opt.value : '')}
                        isSearchable
                        className="modern-select-container"
                        classNamePrefix="modern-select"
                        styles={{ container: base => ({ ...base, width: 200 }) }}
                    />
                    <Button variant="outline-secondary" onClick={onSearch}>Search</Button>
                </div>

                <Table hover responsive>
                    <thead>
                    <tr>
                        <th>Name</th><th>SKU</th><th>Unit</th><th>Selling</th><th>Status</th><th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {(data.content || []).map(row => (
                        <tr key={row.id}>
                            <td><Button variant="link" onClick={() => onOpen(row.id)}>{row.name}</Button></td>
                            <td>{row.sku}</td>
                            <td>{row.unit || "-"}</td>
                            <td>{row.defaultSellingPrice || "-"}</td>
                            <td><Badge bg={row.status === "ACTIVE" ? "success" : "danger"}>{row.status}</Badge></td>
                            <td>
                                <Button size="sm" variant="link" onClick={() => toggleStatus(row)}>
                                    {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                </Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>

                <div className="d-flex justify-content-between align-items-center">
                    <div>Page {page + 1} / {Math.max(1, data.totalPages || 1)}</div>
                    <div className="d-flex gap-2">
                        <Button disabled={page === 0} onClick={() => setPage(p => p - 1)} variant="outline-secondary">Prev</Button>
                        <Button disabled={page + 1 >= (data.totalPages || 1)} onClick={() => setPage(p => p + 1)} variant="outline-secondary">Next</Button>
                    </div>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

/* ================== Form ================== */
export function ProductForm({ id, onClose, onSaved, startEditing = false, compact = false }) {
    const isEdit = Boolean(id);
    const [form, setForm] = useState({
        sku: "", barcode: "", name: "", categoryId: "", unit: "", status: "ACTIVE",
        originalCostPrice: "", defaultSellingPrice: "", reorderLevel: "", suppliers: []
    });
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [validated, setValidated] = useState(false);
    const [isEditMode, setIsEditMode] = useState(!id || startEditing);
    const [activeTab, setActiveTab] = useState("details");
    const [stockBatches, setStockBatches] = useState([]);
    const [reorderSuggestion, setReorderSuggestion] = useState(null);
    const [loadingReorderSuggestion, setLoadingReorderSuggestion] = useState(false);

    const loadStockBatches = async () => {
        if (!id) return;
        try {
            const res = await api.get(`/inventory/available-batches?productId=${id}`);
            setStockBatches(res.data || []);
        } catch {
            toast.error("Failed to load stock details");
        }
    };

    useEffect(() => {
        if (activeTab === "stock" && id) loadStockBatches();
    }, [activeTab, id]);

    const loadReorderSuggestion = async () => {
        if (!id) return;
        setLoadingReorderSuggestion(true);
        try {
            setReorderSuggestion(await getReorderSuggestion(id));
        } catch {
            toast.error("Failed to calculate reorder suggestion");
        } finally {
            setLoadingReorderSuggestion(false);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                setSupplierOptions(await listSuppliersQuick());
            } catch { /* non-blocking */ }
            if (!id) { setIsEditMode(true); return; }
            try {
                const d = await getProduct(id);
                setForm({
                    sku: d.sku,
                    barcode: d.barcode || "",
                    name: d.name || "",
                    categoryId: d.categoryId || "",
                    unit: d.unit || "",
                    status: d.status || "ACTIVE",
                    originalCostPrice: d.originalCostPrice || "",
                    defaultSellingPrice: d.defaultSellingPrice || "",
                    reorderLevel: d.reorderLevel || "",
                    suppliers: d.suppliers || [],
                });
                setIsEditMode(Boolean(startEditing));
                loadReorderSuggestion();
            } catch { toast.error("Failed to load product"); }
        })();
    }, [id, startEditing]);

    const bind = (k, sub) => e => {
        const v = e.target.value;
        if (sub) setForm(f => ({ ...f, [k]: { ...(f[k] || {}), [sub]: v }}));
        else setForm(f => ({ ...f, [k]: v }));
    };

    const addSupplierLink = () => setForm(f => ({ ...f, suppliers: [...(f.suppliers||[]), { supplierId: "", active: true }] }));
    const updSupplierLink = (i, key) => e => {
        const v = key === "active" ? e.target.checked : e.target.value;
        setForm(f => {
            const arr = [...(f.suppliers || [])];
            arr[i] = { ...arr[i], [key]: v };
            return { ...f, suppliers: arr };
        });
    };
    const rmSupplierLink = (i) => setForm(f => ({ ...f, suppliers: f.suppliers.filter((_, idx) => idx !== i) }));

    const save = async (e) => {
        e.preventDefault();
        setValidated(true);
        if (!form.sku && !isEdit) return;
        if (!form.name || !form.defaultSellingPrice) return;

        const payload = {
            sku: form.sku,
            barcode: form.barcode || undefined,
            name: form.name,
            categoryId: form.categoryId || undefined,
            unit: form.unit || undefined,
            status: form.status,
            defaultSellingPrice: form.defaultSellingPrice,
            reorderLevel: form.reorderLevel !== "" && form.reorderLevel !== undefined ? Number(form.reorderLevel) : undefined,
            suppliers: (form.suppliers || []).map(s => ({
                supplierId: s.supplierId,
                supplierItemCode: s.supplierItemCode || undefined,
                leadTimeDays: s.leadTimeDays || undefined,
                minOrderQty: s.minOrderQty || undefined,
                lastPurchasePrice: s.lastPurchasePrice || undefined,
                active: s.active !== false
            }))
        };

        try {
            console.log("Saving payload:", payload);
            if (isEdit) {
                const { sku, ...upd } = payload;
                console.log("Update payload:", upd);
                await updateProduct(id, upd);
                toast.success("Product updated");
            } else {
                await createProduct(payload);
                toast.success("Product created");
            }
            onSaved?.();
            onClose?.();
        } catch (err) {
            const serverMsg = err.response?.data?.message || "Save failed";
            toast.error(serverMsg);
        }
    };

    return (
        <Container style={{ width: compact ? "100%" : "80vw", maxWidth: 900, paddingTop: compact ? 0 : 24, paddingLeft: compact ? 0 : undefined, paddingRight: compact ? 0 : undefined }}>
            <div className={compact ? "bg-white" : "bg-white shadow rounded p-4"}>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <button type="button" className="btn btn-light me-3" onClick={onClose}><ArrowLeft size={18} /></button>
                        <h2 style={{ fontSize: "1.5rem" }} className="mb-0">
                            {id ? (isEditMode ? "Edit Product" : "View Product") : "Create Product"}
                        </h2>
                    </div>
                    {id && (
                        <Button size="sm" variant={isEditMode ? "secondary" : "primary"} onClick={() => setIsEditMode(v => !v)}>
                            {isEditMode ? "Cancel Edit" : "Edit"}
                        </Button>
                    )}
                </div>

                <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mt-3 mb-3">
                    <Tab eventKey="details" title="View Product details">
                        <Form noValidate validated={validated} onSubmit={save}>
                            {!isEdit && (
                                <Form.Group className="mb-3">
                            <Form.Label>SKU *</Form.Label>
                            <Form.Control required isInvalid={validated && !form.sku}
                                          value={form.sku} onChange={bind("sku")} disabled={!isEditMode} />
                            <Form.Control.Feedback type="invalid">SKU is required.</Form.Control.Feedback>
                        </Form.Group>
                    )}

                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Barcode</Form.Label>
                                <Form.Control value={form.barcode} onChange={bind("barcode")} disabled={!isEditMode} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Status</Form.Label>
                                <Select
                                    options={[
                                        { value: 'ACTIVE', label: 'ACTIVE' },
                                        { value: 'INACTIVE', label: 'INACTIVE' }
                                    ]}
                                    value={{ value: form.status, label: form.status }}
                                    onChange={opt => bind("status")({ target: { value: opt ? opt.value : 'ACTIVE' } })}
                                    isDisabled={!isEditMode}
                                    isSearchable
                                    className="modern-select-container"
                                    classNamePrefix="modern-select"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3 mt-3">
                        <Form.Label>Name *</Form.Label>
                        <Form.Control required isInvalid={validated && !form.name}
                                      value={form.name} onChange={bind("name")} disabled={!isEditMode} />
                        <Form.Control.Feedback type="invalid">Name is required.</Form.Control.Feedback>
                    </Form.Group>

                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Category</Form.Label>
                                <Form.Control value={form.categoryId} onChange={bind("categoryId")} disabled={!isEditMode} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Unit</Form.Label>
                                <Form.Control value={form.unit} onChange={bind("unit")} disabled={!isEditMode} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="g-3 mt-1">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Default Selling Price *</Form.Label>
                                <Form.Control required isInvalid={validated && !form.defaultSellingPrice}
                                              value={form.defaultSellingPrice} onChange={bind("defaultSellingPrice")} disabled={!isEditMode} />
                                <Form.Control.Feedback type="invalid">Selling price is required.</Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Reorder Level (Low Stock Alert)</Form.Label>
                                <Form.Control type="number" min="0" value={form.reorderLevel} onChange={bind("reorderLevel")} disabled={!isEditMode} />
                                <Form.Text className="text-muted">Triggers alert when stock drops below this.</Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {id && (
                        <div className="border rounded p-3 mt-3 bg-light">
                            <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                                <div>
                                    <div className="fw-semibold">Reorder suggestion</div>
                                    <div className="small text-muted">
                                        Based on recent outgoing stock and supplier lead time.
                                    </div>
                                </div>
                                <Button size="sm" variant="outline-secondary" onClick={loadReorderSuggestion} disabled={loadingReorderSuggestion}>
                                    {loadingReorderSuggestion ? <Spinner size="sm" className="me-1" /> : null}
                                    Refresh
                                </Button>
                            </div>

                            {reorderSuggestion ? (
                                <>
                                    <Row className="g-2 text-center mb-3">
                                        <Col md={3}>
                                            <div className="bg-white border rounded p-2 h-100">
                                                <div className="small text-muted">Used today</div>
                                                <div className="fw-bold">{reorderSuggestion.usedToday ?? 0}</div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="bg-white border rounded p-2 h-100">
                                                <div className="small text-muted">7-day avg/day</div>
                                                <div className="fw-bold">{reorderSuggestion.averageDailyUsage7Days ?? 0}</div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="bg-white border rounded p-2 h-100">
                                                <div className="small text-muted">30-day avg/day</div>
                                                <div className="fw-bold">{reorderSuggestion.averageDailyUsage30Days ?? 0}</div>
                                            </div>
                                        </Col>
                                        <Col md={3}>
                                            <div className="bg-white border rounded p-2 h-100">
                                                <div className="small text-muted">Suggested level</div>
                                                <div className="fw-bold text-primary">{reorderSuggestion.suggestedReorderLevel ?? 0}</div>
                                            </div>
                                        </Col>
                                    </Row>
                                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                        <div className="small text-muted">
                                            Uses {reorderSuggestion.selectedAverageDailyUsage ?? 0}/day x ({reorderSuggestion.leadTimeDays ?? 0} lead days + {reorderSuggestion.safetyDays ?? 0} safety days).
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            disabled={!isEditMode}
                                            onClick={() => setForm(f => ({ ...f, reorderLevel: reorderSuggestion.suggestedReorderLevel ?? "" }))}
                                        >
                                            Use suggestion
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted small">
                                    {loadingReorderSuggestion ? "Calculating suggestion..." : "No usage data found yet."}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Suppliers</h5>
                            <Button size="sm" variant="outline-secondary" onClick={addSupplierLink} disabled={!isEditMode}>
                                + Add Supplier
                            </Button>
                        </div>

                        {(form.suppliers || []).map((sl, i) => (
                            <div className="border rounded p-3 mb-3 bg-white" key={i}>
                            <Row className="g-3 align-items-end">
                                <Col xs={12} lg={4}>
                                    <Form.Group>
                                        <Form.Label>Supplier *</Form.Label>
                                        <Select
                                            options={[
                                                { value: '', label: 'Select…' },
                                                ...supplierOptions.map(s => ({ value: s.id, label: s.name }))
                                            ]}
                                            value={
                                                sl.supplierId
                                                    ? { value: sl.supplierId, label: supplierOptions.find(s => s.id === sl.supplierId)?.name || sl.supplierId }
                                                    : { value: '', label: 'Select…' }
                                            }
                                            onChange={opt => updSupplierLink(i, "supplierId")({ target: { value: opt ? opt.value : '' } })}
                                            isDisabled={!isEditMode}
                                            isSearchable
                                            className="modern-select-container"
                                            classNamePrefix="modern-select"
                                            menuPortalTarget={document.body}
                                            styles={{
                                                menuPortal: base => ({ ...base, zIndex: 9999 }),
                                                control: base => ({ ...base, minHeight: 38 }),
                                                valueContainer: base => ({ ...base, minWidth: 0 }),
                                                singleValue: base => ({ ...base, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={12} sm={6} lg={2}>
                                    <Form.Group>
                                        <Form.Label>Item Code</Form.Label>
                                        <Form.Control value={sl.supplierItemCode || ""} onChange={updSupplierLink(i, "supplierItemCode")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col xs={6} sm={3} lg={1}>
                                    <Form.Group>
                                        <Form.Label>Lead Time</Form.Label>
                                        <Form.Control type="number" min="0" value={sl.leadTimeDays || ""} onChange={updSupplierLink(i, "leadTimeDays")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col xs={6} sm={3} lg={1}>
                                    <Form.Group>
                                        <Form.Label>MOQ</Form.Label>
                                        <Form.Control type="number" min="0" value={sl.minOrderQty || ""} onChange={updSupplierLink(i, "minOrderQty")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col xs={12} sm={6} lg={2}>
                                    <Form.Group>
                                        <Form.Label>Last Price</Form.Label>
                                        <Form.Control type="number" min="0" step="0.01" value={sl.lastPurchasePrice || ""} onChange={updSupplierLink(i, "lastPurchasePrice")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col xs={12} lg={2}>
                                    <div className="d-flex flex-wrap justify-content-lg-end align-items-center gap-3 h-100">
                                        <Form.Check type="checkbox" label="Active" checked={sl.active !== false}
                                                    onChange={updSupplierLink(i, "active")} disabled={!isEditMode} />
                                        <Button size="sm" variant="outline-danger" onClick={() => rmSupplierLink(i)} disabled={!isEditMode}>Remove</Button>
                                    </div>
                                </Col>
                            </Row>
                            </div>
                        ))}
                    </div>

                            {(isEditMode || !id) && (
                                <Button type="submit" className="w-100 mt-3">{id ? "Update Product" : "Save Product"}</Button>
                            )}
                        </Form>
                    </Tab>
                    
                    {id && (
                        <Tab eventKey="stock" title="Stock details">
                            <div className="mt-3 border rounded p-3 bg-light">
                                <h5 className="mb-3 text-secondary">Non-zero Stock Batches</h5>
                                <Table size="sm" hover responsive className="mb-0 bg-white shadow-sm rounded">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Batch No</th>
                                            <th>Location</th>
                                            <th>Unit Cost</th>
                                            <th>Retail Price</th>
                                            <th>Expiry</th>
                                            <th className="text-end">Qty Left</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockBatches.map(b => (
                                            <tr key={b.id}>
                                                <td><code style={{ fontSize: 13 }}>{b.batchNumber}</code></td>
                                                <td>{b.locationId === "LOC_STORES_MAIN" ? "Main Store" : b.locationId}</td>
                                                <td>{b.costPrice || "-"}</td>
                                                <td>{b.retailPrice || "-"}</td>
                                                <td>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "-"}</td>
                                                <td className="text-end fw-bold">{b.quantity}</td>
                                            </tr>
                                        ))}
                                        {stockBatches.length === 0 && (
                                            <tr><td colSpan={7} className="text-center text-muted py-4">No active stock found for this product.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Tab>
                    )}
                </Tabs>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

/* ================== Page (switch) ================== */
export default function ProductsPage() {
    const [currentId, setCurrentId] = useState(undefined); // undefined=list, null=create, string=edit
    useEffect(() => { setCurrentId(undefined); }, []);

    return currentId === undefined
        ? <ProductList onOpen={(id) => setCurrentId(id)} />
        : <ProductForm id={currentId} onSaved={() => setCurrentId(undefined)} onClose={() => setCurrentId(undefined)} />;
}
