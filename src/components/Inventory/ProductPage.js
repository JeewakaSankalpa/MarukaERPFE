import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Badge, Row, Col } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
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

const listSuppliersQuick = async () =>
    (await api.get(`/suppliers?${qp({ status: "ACTIVE", page: 0, size: 100, sort: "name,asc" })}`)).data?.content || [];

/* ================== List ================== */
function ProductList({ onOpen }) {
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
                    <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Products</h2>
                    <Button onClick={() => onOpen(null)}>+ New Product</Button>
                </div>

                <div className="d-flex gap-2 mb-3">
                    <Form.Control placeholder="Search name/SKU/barcode" value={q} onChange={e => setQ(e.target.value)} />
                    <Form.Select value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 200 }}>
                        <option value="">All</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </Form.Select>
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
function ProductForm({ id, onClose, onSaved }) {
    const isEdit = Boolean(id);
    const [form, setForm] = useState({
        sku: "", barcode: "", name: "", categoryId: "", unit: "", status: "ACTIVE",
        originalCostPrice: "", defaultSellingPrice: "", suppliers: []
    });
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [validated, setValidated] = useState(false);
    const [isEditMode, setIsEditMode] = useState(!id);

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
                    suppliers: d.suppliers || [],
                });
                setIsEditMode(false);
            } catch { toast.error("Failed to load product"); }
        })();
    }, [id]);

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
        if (!form.name || !form.originalCostPrice) return;

        const payload = {
            sku: form.sku,
            barcode: form.barcode || undefined,
            name: form.name,
            categoryId: form.categoryId || undefined,
            unit: form.unit || undefined,
            status: form.status,
            originalCostPrice: form.originalCostPrice,
            defaultSellingPrice: form.defaultSellingPrice || undefined,
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
            if (isEdit) {
                const { sku, ...upd } = payload;
                await updateProduct(id, upd);
                toast.success("Product updated");
            } else {
                await createProduct(payload);
                toast.success("Product created");
            }
            onSaved?.();
            onClose?.();
        } catch {
            toast.error("Save failed");
        }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 900, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center">
                    <h2 style={{ fontSize: "1.5rem" }}>
                        {id ? (isEditMode ? "Edit Product" : "View Product") : "Create Product"}
                    </h2>
                    {id && (
                        <Button size="sm" variant={isEditMode ? "secondary" : "primary"} onClick={() => setIsEditMode(v => !v)}>
                            {isEditMode ? "Cancel Edit" : "Edit"}
                        </Button>
                    )}
                </div>

                <Form noValidate validated={validated} onSubmit={save} className="mt-3">
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
                                <Form.Select value={form.status} onChange={bind("status")} disabled={!isEditMode}>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                </Form.Select>
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
                                <Form.Label>Original Cost Price *</Form.Label>
                                <Form.Control required isInvalid={validated && !form.originalCostPrice}
                                              value={form.originalCostPrice} onChange={bind("originalCostPrice")} disabled={!isEditMode} />
                                <Form.Control.Feedback type="invalid">Cost price is required.</Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Default Selling Price</Form.Label>
                                <Form.Control value={form.defaultSellingPrice} onChange={bind("defaultSellingPrice")} disabled={!isEditMode} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Suppliers</h5>
                            <Button size="sm" variant="outline-secondary" onClick={addSupplierLink} disabled={!isEditMode}>
                                + Add Supplier
                            </Button>
                        </div>

                        {(form.suppliers || []).map((sl, i) => (
                            <Row className="g-3 border rounded p-2 mb-2" key={i}>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Supplier *</Form.Label>
                                        <Form.Select value={sl.supplierId || ""} onChange={updSupplierLink(i, "supplierId")} disabled={!isEditMode}>
                                            <option value="">Select…</option>
                                            {supplierOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>Item Code</Form.Label>
                                        <Form.Control value={sl.supplierItemCode || ""} onChange={updSupplierLink(i, "supplierItemCode")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>Lead Time</Form.Label>
                                        <Form.Control value={sl.leadTimeDays || ""} onChange={updSupplierLink(i, "leadTimeDays")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>MOQ</Form.Label>
                                        <Form.Control value={sl.minOrderQty || ""} onChange={updSupplierLink(i, "minOrderQty")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>Last Price</Form.Label>
                                        <Form.Control value={sl.lastPurchasePrice || ""} onChange={updSupplierLink(i, "lastPurchasePrice")} disabled={!isEditMode} />
                                    </Form.Group>
                                </Col>
                                <Col md={2} className="d-flex align-items-center">
                                    <Form.Check type="checkbox" label="Active" checked={sl.active !== false}
                                                onChange={updSupplierLink(i, "active")} disabled={!isEditMode} />
                                </Col>
                                <Col md={12} className="d-flex justify-content-end">
                                    <Button size="sm" variant="link" onClick={() => rmSupplierLink(i)} disabled={!isEditMode}>Remove</Button>
                                </Col>
                            </Row>
                        ))}
                    </div>

                    {(isEditMode || !id) && (
                        <Button type="submit" className="w-100 mt-3">{id ? "Update Product" : "Save Product"}</Button>
                    )}
                </Form>
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
