import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Container, Button, Form, Table, Row, Col, Badge, InputGroup } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ========== INLINE API HELPERS ========== */
const qp = (o = {}) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v)); return u.toString(); };
const searchProducts = async (q, page = 0, size = 10) =>
    (await api.get(`/products?${qp({ q, status: "ACTIVE", page, size, sort: "name,asc" })}`)).data; // Page<ProductSummaryDTO>
const createIR = async (payload) => (await api.post(`/item-requests`, payload)).data;            // ItemRequest JSON
const getIR = async (id) => (await api.get(`/item-requests/${id}`)).data;

/** Load ACTIVE departments; return [] on 403/404 to keep UI usable */
const listDepartments = async () => {
    try {
        const res = await api.get(`/departments?${qp({ status: "ACTIVE", page: 0, size: 1000, sort: "name,asc" })}`);
        return res.data?.content || [];
    } catch (e) {
        if (e.response?.status === 403 || e.response?.status === 404) return [];
        throw e;
    }
};

/** Load only incomplete projects (try multiple server filters, then client filter) */
const listActiveProjects = async () => {
    try {
        const res = await api.get(`/projects?${qp({ status: "ACTIVE", page: 0, size: 1000, sort: "projectName,asc" })}`);
        return res.data?.content || [];
    } catch {
        try {
            const res = await api.get(`/projects?${qp({ incomplete: true, page: 0, size: 1000, sort: "projectName,asc" })}`);
            return res.data?.content || [];
        } catch {
            try {
                const res = await api.get(`/projects?${qp({ page: 0, size: 1000, sort: "projectName,asc" })}`);
                const all = res.data?.content || [];
                const closed = new Set(["COMPLETED", "CLOSED", "ARCHIVED", "DONE"]);
                return all.filter(p => !closed.has(String(p.status || "").toUpperCase()));
            } catch (e3) {
                if (e3.response?.status === 403 || e3.response?.status === 404) return [];
                throw e3;
            }
        }
    }
};

export default function ItemRequestForm({ irId, defaultDepartmentId, defaultProjectId }) {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const urlProjectId = queryParams.get("projectId");

    const [routeId, setRouteId] = useState(irId || null);
    const [isEditMode, setIsEditMode] = useState(!irId);
    const [validated, setValidated] = useState(false);

    // dropdown data
    const [departments, setDepartments] = useState([]); // [{id,name,description,status,...}]
    const [projects, setProjects] = useState([]);       // [{id,projectName,status,...}]

    // form state
    const [departmentId, setDepartmentId] = useState(defaultDepartmentId || "");
    const [projectId, setProjectId] = useState(defaultProjectId || "");
    const [comment, setComment] = useState("");

    // search state
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [searchData, setSearchData] = useState({ content: [], totalPages: 0 });

    // request lines
    const [rows, setRows] = useState([]); // [{productId, name, sku, unit, qty, note, fulfilledQty?}]

    /* Load Departments + Incomplete Projects once */
    useEffect(() => {
        (async () => {
            try {
                const [deps, projs] = await Promise.all([listDepartments(), listActiveProjects()]);
                setDepartments(deps);
                setProjects(projs);
                setDepartments(deps);
                setProjects(projs);

                // Auto-select from URL if present
                if (urlProjectId) {
                    setProjectId(urlProjectId);
                    const eng = deps.find(d => d.name === "Engineering");
                    if (eng) setDepartmentId(eng.id);
                } else {
                    if (defaultDepartmentId && !deps.some(d => d.id === defaultDepartmentId)) setDepartmentId("");
                    if (defaultProjectId && !projs.some(p => p.id === defaultProjectId)) setProjectId("");
                }
            } catch {
                toast.error("Failed to load Departments/Projects");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlProjectId]);

    // load existing IR for view mode
    useEffect(() => {
        (async () => {
            if (!routeId) return;
            try {
                const ir = await getIR(routeId);
                setDepartmentId(ir.departmentId || "");
                setProjectId(ir.projectId || "");
                setComment(ir.comment || "");
                setRows((ir.items || []).map(it => ({
                    productId: it.productId,
                    name: it.productNameSnapshot,
                    sku: it.sku,
                    unit: it.unit || "pcs",
                    qty: it.requestedQty,
                    note: it.note || "",
                    fulfilledQty: it.fulfilledQty || 0
                })));
                setIsEditMode(false);
            } catch { toast.error("Failed to load item request"); }
        })();
    }, [routeId]);

    // product search
    const loadProducts = async () => {
        try {
            const res = await searchProducts(q, page, 8);
            setSearchData(res);
        } catch { toast.error("Failed to search products"); }
    };
    useEffect(() => { loadProducts(); /* eslint-disable-next-line */ }, [page]);

    // add product to request
    const addProduct = (p) => {
        setRows(prev => prev.some(r => r.productId === p.id) ? prev : [
            ...prev, { productId: p.id, name: p.name, sku: p.sku, unit: p.unit || "pcs", qty: "", note: "" }
        ]);
    };
    const setRow = (i, k, v) => setRows(prev => { const cp = [...prev]; cp[i] = { ...cp[i], [k]: v }; return cp; });
    const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

    const totalLines = useMemo(() => rows.filter(r => Number(r.qty) > 0).length, [rows]);

    const save = async (e) => {
        e.preventDefault();
        setValidated(true);
        if (!departmentId && !projectId) { toast.warn("Please select a Department or Project"); return; }
        const items = rows.filter(r => Number(r.qty) > 0).map(r => ({
            productId: r.productId, unit: r.unit, quantity: Number(r.qty), note: r.note || ""
        }));
        if (items.length === 0) { toast.warn("Add at least one product with quantity"); return; }

        try {
            const body = { departmentId, projectId, comment, items };
            const created = await createIR(body);
            toast.success(`Item Request submitted (${created.irNumber})`);
            setRouteId(created.id);
            setIsEditMode(false);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to submit request");
        }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 1000, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center">
                    <h2 style={{ fontSize: "1.5rem" }}>
                        {routeId ? (isEditMode ? "Edit Item Request" : "View Item Request") : "Create Item Request"}
                    </h2>
                    {routeId && (
                        <Button size="sm" variant={isEditMode ? "secondary" : "primary"} onClick={() => setIsEditMode(v => !v)}>
                            {isEditMode ? "Cancel Edit" : "Edit"}
                        </Button>
                    )}
                </div>

                <Form noValidate validated={validated} onSubmit={save} className="mt-3">
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Department</Form.Label>
                                <Form.Select
                                    value={departmentId}
                                    onChange={e => setDepartmentId(e.target.value)}
                                    disabled={!isEditMode || !!urlProjectId}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}{d.description ? ` — ${d.description}` : ""}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Project (incomplete)</Form.Label>
                                <Form.Select
                                    value={projectId}
                                    onChange={e => setProjectId(e.target.value)}
                                    disabled={!isEditMode || !!urlProjectId}
                                >
                                    <option value="">Select Project</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.projectName || p.name || p.id}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mt-3">
                        <Form.Label>Comment</Form.Label>
                        <Form.Control as="textarea" rows={2} value={comment}
                            onChange={e => setComment(e.target.value)} disabled={!isEditMode} />
                    </Form.Group>

                    {/* Product search + add */}
                    {isEditMode && (
                        <div className="mt-4">
                            <div className="d-flex gap-2 mb-2">
                                <Form.Control placeholder="Search product name/SKU" value={q} onChange={e => setQ(e.target.value)} />
                                <Button variant="outline-secondary" onClick={() => { setPage(0); loadProducts(); }}>Search</Button>
                            </div>
                            <Table size="sm" hover responsive>
                                <thead><tr><th>Product</th><th>SKU</th><th>Unit</th><th></th></tr></thead>
                                <tbody>
                                    {(searchData.content || []).map(p => (
                                        <tr key={p.id}>
                                            <td>{p.name}</td>
                                            <td>{p.sku}</td>
                                            <td>{p.unit || "pcs"}</td>
                                            <td><Button size="sm" onClick={() => addProduct(p)}>Add</Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <div className="d-flex justify-content-between">
                                <div>Page {page + 1}/{Math.max(1, searchData.totalPages || 1)}</div>
                                <div className="d-flex gap-2">
                                    <Button size="sm" variant="outline-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                                    <Button size="sm" variant="outline-secondary" disabled={page + 1 >= (searchData.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Request lines */}
                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Requested Items <Badge bg="light" text="dark">{totalLines}</Badge></h5>
                        </div>
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>Product</th><th>SKU</th><th>Unit</th>
                                    <th style={{ width: 140 }}>Qty</th><th>Note</th>
                                    {routeId && !isEditMode ? <th>Fulfilled</th> : null}
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={r.productId}>
                                        <td>{r.name}</td>
                                        <td>{r.sku}</td>
                                        <td>{r.unit}</td>
                                        <td>
                                            <InputGroup>
                                                <Form.Control type="number" min="0" value={r.qty}
                                                    onChange={e => setRow(i, "qty", e.target.value)} disabled={!isEditMode} />
                                                <InputGroup.Text>{r.unit}</InputGroup.Text>
                                            </InputGroup>
                                        </td>
                                        <td>
                                            <Form.Control value={r.note} onChange={e => setRow(i, "note", e.target.value)} disabled={!isEditMode} />
                                        </td>
                                        {routeId && !isEditMode ? <td>{r.fulfilledQty ?? 0}</td> : null}
                                        <td>{isEditMode && <Button size="sm" variant="link" onClick={() => removeRow(i)}>Remove</Button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    {(isEditMode || !routeId) && (
                        <Button type="submit" className="w-100 mt-2">Submit Item Request</Button>
                    )}
                </Form>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
