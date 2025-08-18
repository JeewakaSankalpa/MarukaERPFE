// src/components/Stores/IRFulfilmentPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Table, Button, Form, Row, Col, Badge, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ---------- API helpers ---------- */
const listIRs = async (page = 0, size = 20) =>
    (await api.get(`/item-requests`, { params: { page, size, status: ["SUBMITTED","PENDING_PURCHASE", "PARTIALLY_FULFILLED"] } })).data;

const getIR = async (id) => (await api.get(`/item-requests/${id}`)).data;
const fulfilIR = async (id, body) => (await api.post(`/item-requests/${id}/fulfil`, body)).data;

const fetchMainAvail = async () => (await api.get(`/inventory/available-quantities-main`)).data;
// expects [{productId, productName?, availableQty}]

const listDepartments = async () =>
    (await api.get(`/departments`, { params: { page: 0, size: 1000 } })).data?.content || [];
const listProjects = async () =>
    (await api.get(`/projects`, { params: { page: 0, size: 1000 } })).data?.content || [];

/* ---------- Page ---------- */
export default function IRFulfilmentPage() {
    // pagination + data
    const [page, setPage] = useState(0);
    const [irs, setIrs] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [loadingList, setLoadingList] = useState(false);

    // maps for names
    const [deptMap, setDeptMap] = useState({}); // id -> name
    const [projMap, setProjMap] = useState({}); // id -> projectName

    // filters
    const [fDept, setFDept] = useState("");
    const [fProj, setFProj] = useState("");
    const [fRequester, setFRequester] = useState(""); // matches createdBy contains

    // selected IR detail
    const [selected, setSelected] = useState(null);
    const [issue, setIssue] = useState({}); // productId -> qty to issue now
    const [loadingDetail, setLoadingDetail] = useState(false);

    // on hand at Main (map)
    const [onHand, setOnHand] = useState({}); // productId -> number
    const refreshOnHand = async () => {
        try {
            const data = await fetchMainAvail();
            setOnHand(Object.fromEntries(data.map((r) => [r.productId, Number(r.availableQty || 0)])));
        } catch {
            // ignore
        }
    };

    // initial loads: depts, projects, IR page, on-hand
    useEffect(() => {
        (async () => {
            try {
                const [depts, projs] = await Promise.all([listDepartments(), listProjects()]);
                setDeptMap(Object.fromEntries(depts.map((d) => [d.id, d.name || d.id])));
                setProjMap(Object.fromEntries(projs.map((p) => [p.id, p.projectName || p.id])));
            } catch {
                // non-blocking
            }
            await refreshOnHand();
        })();
    }, []);

    // load IR page
    useEffect(() => {
        (async () => {
            setLoadingList(true);
            try {
                const p = await listIRs(page, 20);
                setIrs(p);
            } catch {
                toast.error("Failed to load item requests");
            } finally {
                setLoadingList(false);
            }
        })();
    }, [page]);

    const openIR = async (id) => {
        setLoadingDetail(true);
        try {
            const ir = await getIR(id);
            setSelected(ir);
            setIssue(Object.fromEntries((ir.items || []).map((it) => [it.productId, 0])));
        } catch {
            toast.error("Failed to open IR");
        } finally {
            setLoadingDetail(false);
        }
    };

    const doIssue = async () => {
        if (!selected) return;
        try {
            const lines = {};
            Object.entries(issue).forEach(([pid, qty]) => {
                const q = Number(qty || 0);
                if (q > 0) lines[pid] = q;
            });
            if (Object.keys(lines).length === 0) {
                toast.info("Enter quantities to issue");
                return;
            }
            const updated = await fulfilIR(selected.id, lines);
            setSelected(updated);
            await refreshOnHand(); // on-hand changed
            // Also reload current page to see status change
            const p = await listIRs(page, 20);
            setIrs(p);
            toast.success("Issued to Project/Department and updated IR");
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to issue items");
        }
    };

    const addShortagesForIR = async () => {
        if (!selected) return;
        const shortages = {};
        (selected.items || []).forEach((it) => {
            const remaining = Math.max(0, (it.requestedQty || 0) - (it.fulfilledQty || 0));
            const avail = Number(onHand[it.productId] || 0);
            const short = Math.max(0, remaining - avail);
            if (short > 0) shortages[it.productId] = short;
        });
        if (Object.keys(shortages).length === 0) {
            toast.info("No shortages for this IR");
            return;
        }
        try {
            await api.post(`/stores/pending-purchase`, shortages);
            toast.success("Shortages added to Pending Purchase");
        } catch {
            toast.error("Failed to add shortages");
        }
    };

    // client-side filtered list
    const filteredIRs = useMemo(() => {
        const rows = irs.content || [];
        return rows.filter((ir) => {
            const deptOk = !fDept || ir.departmentId === fDept;
            const projOk = !fProj || ir.projectId === fProj;
            const reqOk = !fRequester || (ir.createdBy || "").toLowerCase().includes(fRequester.toLowerCase());
            return deptOk && projOk && reqOk;
        });
    }, [irs, fDept, fProj, fRequester]);

    return (
        <Container style={{ width: "95vw", maxWidth: 1400, paddingTop: 24 }}>
            <Row className="g-3">
                {/* -------- Left: List & Filters -------- */}
                <Col md={5}>
                    <div className="bg-white shadow rounded p-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">Pending Item Requests</h5>
                            {loadingList && <Spinner animation="border" size="sm" />}
                        </div>

                        {/* Filters */}
                        <Row className="g-2 mb-3">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small">Department</Form.Label>
                                    <Form.Select value={fDept} onChange={(e) => setFDept(e.target.value)}>
                                        <option value="">All</option>
                                        {Object.entries(deptMap).map(([id, name]) => (
                                            <option key={id} value={id}>
                                                {name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small">Project</Form.Label>
                                    <Form.Select value={fProj} onChange={(e) => setFProj(e.target.value)}>
                                        <option value="">All</option>
                                        {Object.entries(projMap).map(([id, name]) => (
                                            <option key={id} value={id}>
                                                {name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small">Requester</Form.Label>
                                    <Form.Control
                                        placeholder="username..."
                                        value={fRequester}
                                        onChange={(e) => setFRequester(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Table hover size="sm" responsive className="mb-2">
                            <thead>
                            <tr>
                                <th>IR #</th>
                                <th>Status</th>
                                <th>Department</th>
                                <th>Project</th>
                                <th>Requester</th>
                                <th>Created</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredIRs.map((ir) => (
                                <tr key={ir.id} onClick={() => openIR(ir.id)} style={{ cursor: "pointer" }}>
                                    <td>{ir.irNumber}</td>
                                    <td>
                                        <Badge
                                            bg={
                                                ir.status === "SUBMITTED"
                                                    ? "secondary"
                                                    : ir.status === "PARTIALLY_FULFILLED"
                                                        ? "info"
                                                        : "success"
                                            }
                                        >
                                            {ir.status}
                                        </Badge>
                                    </td>
                                    <td>{deptMap[ir.departmentId] || ir.departmentId || "-"}</td>
                                    <td>{projMap[ir.projectId] || ir.projectId || "-"}</td>
                                    <td>{ir.createdBy || "-"}</td>
                                    <td>{ir.createdAt ? new Date(ir.createdAt).toLocaleString() : "-"}</td>
                                </tr>
                            ))}
                            {filteredIRs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted">
                                        No item requests found.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </Table>

                        <div className="d-flex justify-content-between">
                            <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                                Prev
                            </Button>
                            <span>
                Page {page + 1} / {irs.totalPages || 1}
              </span>
                            <Button size="sm" disabled={page + 1 >= (irs.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>
                                Next
                            </Button>
                        </div>
                    </div>
                </Col>

                {/* -------- Right: Detail & Issue -------- */}
                <Col md={7}>
                    <div className="bg-white shadow rounded p-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">IR Details</h5>
                            {loadingDetail && <Spinner animation="border" size="sm" />}
                        </div>

                        {!selected ? (
                            <div className="text-muted">Select an IR to fulfil</div>
                        ) : (
                            <>
                                <div className="mb-3">
                                    <strong>{selected.irNumber}</strong>{" "}
                                    <Badge
                                        bg={
                                            selected.status === "SUBMITTED"
                                                ? "secondary"
                                                : selected.status === "PARTIALLY_FULFILLED"
                                                    ? "info"
                                                    : "success"
                                        }
                                    >
                                        {selected.status}
                                    </Badge>
                                    <div className="small text-muted">
                                        Dept: {deptMap[selected.departmentId] || selected.departmentId || "-"} &nbsp;|&nbsp; Project:{" "}
                                        {projMap[selected.projectId] || selected.projectId || "-"} &nbsp;|&nbsp; Requester:{" "}
                                        {selected.createdBy || "-"}
                                    </div>
                                </div>

                                <Table hover size="sm" responsive>
                                    <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th className="text-end">Requested</th>
                                        <th className="text-end">Fulfilled</th>
                                        <th className="text-end">Avail @ Main</th>
                                        <th style={{ width: 140 }}>Issue Now</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {(selected.items || []).map((it) => {
                                        const remaining = Math.max(0, (it.requestedQty || 0) - (it.fulfilledQty || 0));
                                        const avail = Number(onHand[it.productId] || 0);
                                        const maxIssuable = Math.min(remaining, avail);
                                        const low = avail < remaining;
                                        return (
                                            <tr key={it.productId}>
                                                <td>{it.productNameSnapshot || it.productId}</td>
                                                <td className="text-end">{it.requestedQty}</td>
                                                <td className="text-end">{it.fulfilledQty}</td>
                                                <td className={low ? "text-danger fw-bold text-end" : "text-end"}>{avail}</td>
                                                <td>
                                                    <Form.Control
                                                        type="number"
                                                        min="0"
                                                        max={maxIssuable}
                                                        value={issue[it.productId] ?? 0}
                                                        onChange={(e) => {
                                                            const v = Math.max(0, Math.min(maxIssuable, Number(e.target.value || 0)));
                                                            setIssue((s) => ({ ...s, [it.productId]: v }));
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {(!selected.items || selected.items.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted">
                                                No lines
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </Table>

                                <div className="d-flex justify-content-end gap-2">
                                    <Button variant="outline-primary" onClick={addShortagesForIR}>
                                        Add Shortages to Pending
                                    </Button>
                                    <Button onClick={doIssue}>Issue from Main Store</Button>
                                </div>
                            </>
                        )}
                    </div>
                </Col>
            </Row>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
