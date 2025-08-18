import React, { useEffect, useState } from "react";
import { Container, Form, Button } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ---------- inline API helpers ---------- */
const createDepartment = async (payload) => (await api.post(`/departments`, payload)).data;
const getDepartment    = async (id)      => (await api.get(`/departments/${id}`)).data;
const updateDepartment = async (id, payload) => (await api.put(`/departments/${id}`, payload)).data;

export default function DepartmentForm({ id: routeId, onDone }) {
    const [isEditMode, setIsEditMode] = useState(!routeId);
    const [validated, setValidated] = useState(false);

    const [form, setForm] = useState({ name: "", description: "" });
    const [status, setStatus] = useState("ACTIVE");

    useEffect(() => {
        (async () => {
            if (!routeId) return;
            try {
                const d = await getDepartment(routeId);
                setForm({ name: d.name || "", description: d.description || "" });
                setStatus(d.status || "ACTIVE");
                setIsEditMode(false);
            } catch { toast.error("Failed to load department"); }
        })();
    }, [routeId]);

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault(); setValidated(true);
        if (!form.name?.trim()) return;

        try {
            if (!routeId) {
                const res = await createDepartment({ name: form.name.trim(), description: form.description || "" });
                toast.success("Department created");
                setIsEditMode(false);
                onDone?.(res.id);
            } else {
                const res = await updateDepartment(routeId, { name: form.name.trim(), description: form.description || "" });
                toast.success("Department updated");
                setIsEditMode(false);
                onDone?.(res.id);
            }
        } catch (err) {
            const msg = err?.response?.data?.message || "Save failed";
            toast.error(msg);
        }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 800, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>
                        {routeId ? (isEditMode ? "Edit Department" : "View Department") : "Create Department"}
                    </h2>
                    {routeId && (
                        <Button size="sm" variant={isEditMode ? "secondary" : "primary"} onClick={()=>setIsEditMode(v=>!v)}>
                            {isEditMode ? "Cancel Edit" : "Edit"}
                        </Button>
                    )}
                </div>

                <Form noValidate validated={validated} onSubmit={submit}>
                    <Form.Group className="mb-3" controlId="depName">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            disabled={!isEditMode}
                            required
                            isInvalid={validated && !form.name}
                            placeholder="e.g. Stores"
                        />
                        <Form.Control.Feedback type="invalid">Name is required.</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="depDesc">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea" rows={3}
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            disabled={!isEditMode}
                            placeholder="Short description of the department"
                        />
                    </Form.Group>

                    {routeId && (
                        <Form.Group className="mb-3">
                            <Form.Label>Status</Form.Label><br/>
                            <span className={`badge rounded-pill ${status==="ACTIVE" ? "bg-success" : "bg-secondary"}`}>{status}</span>
                        </Form.Group>
                    )}

                    {(isEditMode || !routeId) && (
                        <Button type="submit" className="w-100">{routeId ? "Update Department" : "Create Department"}</Button>
                    )}
                </Form>
            </div>

            <ToastContainer position="top-right" autoClose={2200} hideProgressBar newestOnTop />
        </Container>
    );
}
