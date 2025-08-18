import React, { useEffect, useState } from "react";
import { Container, Table, Form, Button, Badge, Modal } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ---------- inline API helpers ---------- */
const qp = (o={}) => { const u=new URLSearchParams(); Object.entries(o).forEach(([k,v])=> (v||v===0)&&v!==""&&u.set(k,v)); return u.toString(); };
const fetchDepartments = async ({ q, status, page=0, size=10, sort="name,asc" }) =>
    (await api.get(`/departments?${qp({ q, status, page, size, sort })}`)).data;
const patchStatus = async (id, status) =>
    (await api.patch(`/departments/${id}/status`, { status })).data;
const getDepartment = async (id) => (await api.get(`/departments/${id}`)).data;

export default function DepartmentList({ onOpenForm }) {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(0); const [size] = useState(10);
    const [data, setData] = useState({ content: [], totalPages: 0 });
    const [view, setView] = useState(null); // modal detail

    const load = async () => {
        try { setData(await fetchDepartments({ q, status, page, size })); }
        catch { toast.error("Failed to load departments"); }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status]);

    const toggleStatus = async (row) => {
        try {
            const newStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await patchStatus(row.id, newStatus);
            toast.success(`Status set to ${newStatus}`);
            load();
        } catch { toast.error("Failed to update status"); }
    };

    const openDetail = async (id) => {
        try { setView(await getDepartment(id)); }
        catch { toast.error("Failed to load details"); }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 1100, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Departments</h2>
                    <div className="d-flex gap-2">
                        <Form.Select value={status} onChange={e=>{ setStatus(e.target.value); setPage(0); }} style={{ maxWidth: 200 }}>
                            <option value="">All</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                        </Form.Select>
                        <Form.Control placeholder="Search name/description" value={q} onChange={e=>setQ(e.target.value)} style={{ maxWidth: 260 }} />
                        <Button variant="outline-secondary" onClick={()=>{ setPage(0); load(); }}>Search</Button>
                        <Button onClick={()=>onOpenForm?.()}>+ New Department</Button>
                    </div>
                </div>

                <Table hover responsive>
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th style={{ width: 220 }}></th>
                    </tr>
                    </thead>
                    <tbody>
                    {(data.content || []).map(row => (
                        <tr key={row.id}>
                            <td className="fw-semibold">{row.name}</td>
                            <td className="text-muted">{row.description || "-"}</td>
                            <td>
                                <Badge bg={row.status === "ACTIVE" ? "success" : "secondary"}>{row.status}</Badge>
                            </td>
                            <td className="d-flex gap-2">
                                <Button size="sm" variant="outline-primary" onClick={()=>onOpenForm?.(row.id)}>Edit</Button>
                                <Button size="sm" variant={row.status==="ACTIVE"?"outline-warning":"outline-success"} onClick={()=>toggleStatus(row)}>
                                    {row.status==="ACTIVE" ? "Deactivate" : "Activate"}
                                </Button>
                                <Button size="sm" variant="outline-secondary" onClick={()=>openDetail(row.id)}>View</Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>

                <div className="d-flex justify-content-between align-items-center">
                    <div>Page {page + 1} / {Math.max(1, data.totalPages || 1)}</div>
                    <div className="d-flex gap-2">
                        <Button variant="outline-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                        <Button variant="outline-secondary" disabled={page + 1 >= (data.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            </div>

            {/* detail modal */}
            <Modal show={!!view} onHide={()=>setView(null)}>
                <Modal.Header closeButton><Modal.Title>Department</Modal.Title></Modal.Header>
                <Modal.Body>
                    {!view ? "Loading..." : (
                        <>
                            <div className="mb-2"><strong>Name:</strong> {view.name}</div>
                            <div className="mb-2"><strong>Description:</strong> {view.description || "-"}</div>
                            <div className="mb-2">
                                <strong>Status:</strong> <Badge bg={view.status==="ACTIVE"?"success":"secondary"}>{view.status}</Badge>
                            </div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                                Created: {view.createdAt || "-"} &nbsp;|&nbsp; Updated: {view.updatedAt || "-"}
                            </div>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            <ToastContainer position="top-right" autoClose={2200} hideProgressBar newestOnTop />
        </Container>
    );
}
