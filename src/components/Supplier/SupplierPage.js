import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Badge, Row, Col, ListGroup } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ================== Inline API helpers (same file) ================== */
const qp = (o = {}) => {
    const u = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v));
    return u.toString();
};
const listSuppliers = async (opts = {}) =>
    (await api.get(`/suppliers?${qp({ page: 0, size: 10, sort: "name,asc", ...opts })}`)).data;
const getSupplier = async (id) => (await api.get(`/suppliers/${id}`)).data;
const createSupplier = async (payload) => (await api.post("/suppliers", payload)).data;
const updateSupplier = async (id, payload) => (await api.put(`/suppliers/${id}`, payload)).data;
const patchSupplierStatus = async (id, status) =>
    (await api.patch(`/suppliers/${id}/status`, { status })).data;

/* ================== List ================== */
function SupplierList({ onOpen }) {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [data, setData] = useState({ content: [], totalPages: 0 });

    const load = async () => {
        try {
            const res = await listSuppliers({ q, status, page, size, sort: "name,asc" });
            setData(res);
        } catch {
            toast.error("Failed to load suppliers");
        }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status]);

    const onSearch = () => { setPage(0); load(); };
    const toggleStatus = async (row) => {
        try {
            const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await patchSupplierStatus(row.id, next);
            load();
        } catch { toast.error("Failed to update status"); }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 900, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Suppliers</h2>
                    <Button onClick={() => onOpen(null)}>+ New Supplier</Button>
                </div>

                <div className="d-flex gap-2 mb-3">
                    <Form.Control placeholder="Search name/code" value={q} onChange={e => setQ(e.target.value)} />
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
                        <th>Name</th><th>Code</th><th>Phone</th><th>Email</th><th>Status</th><th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {(data.content || []).map(row => (
                        <tr key={row.id}>
                            <td><Button variant="link" onClick={() => onOpen(row.id)}>{row.name}</Button></td>
                            <td>{row.supplierCode || "-"}</td>
                            <td>{row.phone || "-"}</td>
                            <td>{row.email || "-"}</td>
                            <td>
                                <Badge bg={row.status === "ACTIVE" ? "success" : "danger"}>{row.status}</Badge>
                            </td>
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
        </Container>
    );
}

/* ================== Form ================== */
function SupplierForm({ id, onClose, onSaved }) {
    const isEdit = Boolean(id);
    const [form, setForm] = useState({ supplierCode: "", name: "", status: "ACTIVE", email: "", phone: "", taxId: "", address: {} });
    const [validated, setValidated] = useState(false);
    const [isEditMode, setIsEditMode] = useState(!id);

    useEffect(() => {
        (async () => {
            if (!id) { setIsEditMode(true); return; }
            try {
                const d = await getSupplier(id);
                setForm({
                    supplierCode: d.supplierCode || "",
                    name: d.name || "",
                    status: d.status || "ACTIVE",
                    email: d.email || "",
                    phone: d.phone || "",
                    taxId: d.taxId || "",
                    address: d.address || {},
                });
                setIsEditMode(false);
            } catch { toast.error("Failed to load supplier"); }
        })();
    }, [id]);

    const bind = (k, sub) => e => {
        const v = e.target.value;
        if (sub) setForm(f => ({ ...f, [k]: { ...(f[k] || {}), [sub]: v }}));
        else setForm(f => ({ ...f, [k]: v }));
    };

    const save = async (e) => {
        e.preventDefault();
        setValidated(true);
        if (!form.name) return;
        try {
            const payload = {
                name: form.name,
                status: form.status,
                email: form.email || undefined,
                phone: form.phone || undefined,
                taxId: form.taxId || undefined,
                address: form.address,
                ...(isEdit ? {} : { supplierCode: form.supplierCode || undefined }),
            };
            if (isEdit) await updateSupplier(id, payload);
            else await createSupplier(payload);
            toast.success(isEdit ? "Supplier updated" : "Supplier created");
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
                        {id ? (isEditMode ? "Edit Supplier" : "View Supplier") : "Create Supplier"}
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
                            <Form.Label>Supplier Code</Form.Label>
                            <Form.Control value={form.supplierCode} onChange={bind("supplierCode")} disabled={!isEditMode} />
                        </Form.Group>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Name</Form.Label>
                        <Form.Control required isInvalid={validated && !form.name}
                                      value={form.name} onChange={bind("name")} disabled={!isEditMode} />
                        <Form.Control.Feedback type="invalid">Name is required.</Form.Control.Feedback>
                    </Form.Group>

                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Status</Form.Label>
                                <Form.Select value={form.status} onChange={bind("status")} disabled={!isEditMode}>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Tax ID</Form.Label>
                                <Form.Control value={form.taxId} onChange={bind("taxId")} disabled={!isEditMode} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="g-3 mt-1">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Email</Form.Label>
                                <Form.Control value={form.email} onChange={bind("email")} disabled={!isEditMode} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Phone</Form.Label>
                                <Form.Control value={form.phone} onChange={bind("phone")} disabled={!isEditMode} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="g-3 mt-1">
                        {["line1","line2","city","state","postalCode","country"].map(k => (
                            <Col md={k === "line1" || k === "line2" ? 12 : 4} key={k}>
                                <Form.Group>
                                    <Form.Label>{k}</Form.Label>
                                    <Form.Control value={(form.address||{})[k] || ""} onChange={bind("address", k)} disabled={!isEditMode} />
                                </Form.Group>
                            </Col>
                        ))}
                    </Row>

                    {(isEditMode || !id) && (
                        <Button type="submit" className="w-100 mt-3">{id ? "Update Supplier" : "Save Supplier"}</Button>
                    )}
                </Form>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

/* ================== Page (switch) ================== */
export default function SuppliersPage() {
    const [currentId, setCurrentId] = useState(null); // null = create; string = edit; undefined = list
    const mode = currentId === undefined ? "list" : "form";
    useEffect(() => { setCurrentId(undefined); }, []); // show list first

    return mode === "list"
        ? <SupplierList onOpen={(id) => setCurrentId(id)} />
        : <SupplierForm id={currentId} onSaved={() => setCurrentId(undefined)} onClose={() => setCurrentId(undefined)} />;
}
