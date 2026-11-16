import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Container, Table } from "react-bootstrap";
import { ArrowLeft, ClipboardList, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { normalizeItemRequest } from "./decimalQuantity";
import "./MyRequestList.css";

const statusVariant = (status) => ({ DRAFT: "secondary", SUBMITTED: "primary", PARTIALLY_FULFILLED: "warning", PENDING_PURCHASE: "info", FULFILLED: "success", CANCELLED: "danger" }[status] || "dark");
const statusLabel = (status) => String(status || "Unknown").replaceAll("_", " ");
const requestedFor = (request) => request.projectId ? `Project: ${request.projectId}` : request.departmentId ? `Department: ${request.departmentId}` : "Not specified";
const requestDate = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(); };

const MyRequestList = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const fetchMyRequests = useCallback(async () => {
        try {
            setLoading(true); setLoadError("");
            const res = await api.get("/item-requests/my");
            const rows = Array.isArray(res.data) ? res.data : [];
            setRequests(rows.map(normalizeItemRequest).sort((a, b) => {
                if (a.status === "DRAFT" && b.status !== "DRAFT") return -1;
                if (a.status !== "DRAFT" && b.status === "DRAFT") return 1;
                return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
            }));
        } catch {
            setLoadError("Your item requests could not be loaded. Check the connection and try again."); setRequests([]);
        } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchMyRequests(); }, [fetchMyRequests]);
    const summary = useMemo(() => ({ total: requests.length, drafts: requests.filter((request) => request.status === "DRAFT").length, active: requests.filter((request) => !["DRAFT", "FULFILLED", "CANCELLED"].includes(request.status)).length }), [requests]);
    const openDraft = (requestId) => navigate(`/item/requests/${requestId}`);
    return (
        <Container fluid className="my-requests-page operational-workspace">
            <section className="my-requests-workspace operational-workspace-surface" aria-labelledby="my-requests-heading">
                <header className="my-requests-header">
                    <div className="my-requests-heading-group"><button type="button" className="my-requests-back-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={19} aria-hidden="true" /></button><div><h1 id="my-requests-heading">My Item Requests</h1><p>Review drafts, submitted requirements, and fulfilment progress in one place.</p></div></div>
                    <Button className="my-requests-primary-action" onClick={() => navigate("/item/requests")}><Plus size={18} aria-hidden="true" />New Request</Button>
                </header>
                <div className="my-requests-summary" aria-label="Request summary"><div><span>Total requests</span><strong>{summary.total}</strong></div><div><span>Drafts to finish</span><strong>{summary.drafts}</strong></div><div><span>Active requests</span><strong>{summary.active}</strong></div></div>
                <div className="my-requests-table-region" aria-live="polite" aria-busy={loading}>
                    {loadError && <div className="my-requests-error" role="alert"><span>{loadError}</span><Button size="sm" variant="outline-danger" onClick={fetchMyRequests}><RefreshCw size={15} aria-hidden="true" />Try again</Button></div>}
                    <div className="my-requests-table-scroll" tabIndex={0} aria-label="My item requests table">
                        <Table hover className="my-requests-table mb-0 align-middle"><thead><tr><th>Request</th><th>Created</th><th>Requested items</th><th>Status</th><th>Requested for</th><th><span className="visually-hidden">Action</span></th></tr></thead><tbody>
                            {loading && [0, 1, 2].map((index) => <tr className="my-requests-skeleton-row" key={`my-request-skeleton-${index}`} aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((cell) => <td key={cell}><span /></td>)}</tr>)}
                            {!loading && requests.map((request) => <tr key={request.id} className={request.status === "DRAFT" ? "my-requests-draft-row" : undefined} onClick={() => request.status === "DRAFT" && openDraft(request.id)}><td data-label="Request"><span className="my-requests-number">{request.irNumber || request.id}</span></td><td data-label="Created">{requestDate(request.createdAt)}</td><td data-label="Requested items" className="my-requests-items">{(request.items || []).map((item, index) => <div key={`${item.productId || item.productNameSnapshot}-${index}`} className="my-requests-item"><span>{item.productNameSnapshot || item.productId || "Unnamed product"}</span><Badge bg="light" text="dark">×{item.requestedQty} {item.unit || ""}</Badge></div>)}</td><td data-label="Status"><Badge bg={statusVariant(request.status)}>{statusLabel(request.status)}</Badge></td><td data-label="Requested for">{requestedFor(request)}</td><td data-label="Action" className="my-requests-row-action">{request.status === "DRAFT" && <Button size="sm" variant="outline-primary" onClick={(event) => { event.stopPropagation(); openDraft(request.id); }}>Continue draft</Button>}</td></tr>)}
                            {!loading && !loadError && requests.length === 0 && <tr className="my-requests-empty-row"><td colSpan="6"><ClipboardList size={28} aria-hidden="true" /><strong>No item requests yet</strong><span>Start a request when materials are needed for a project or department.</span><Button size="sm" variant="outline-primary" onClick={() => navigate("/item/requests")}>Create request</Button></td></tr>}
                        </tbody></Table>
                    </div>
                </div>
            </section>
        </Container>
    );
};
export default MyRequestList;
