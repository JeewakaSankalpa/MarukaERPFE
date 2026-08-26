import React, { useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from "react-bootstrap";
import { ArrowLeft, RefreshCw, Search, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/api";
import { confirmAction } from "../../utils/brandedDialogs";

const statusVariant = (status) => {
    if (status === "BACKFILL") return "primary";
    if (status === "RESET_STATUS" || status === "UPDATE_STATUS") return "warning";
    if (status === "MANUAL_REVIEW") return "danger";
    return "secondary";
};

const traceSections = [
    ["Pending Purchase", "pendingPurchaseLines"],
    ["Purchase Orders", "purchaseOrderItems"],
    ["GRNs", "grnItems"],
    ["Stock Batches", "stockBatches"],
    ["Ledger", "inventoryLedgerEntries"],
    ["Transfers", "transfers"],
    ["Legacy Candidates", "legacyCandidates"],
];

export default function ItemRequestTraceAdminPage() {
    const navigate = useNavigate();
    const [lookup, setLookup] = useState("");
    const [trace, setTrace] = useState(null);
    const [report, setReport] = useState(null);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [repairing, setRepairing] = useState(false);

    const loadTrace = async () => {
        if (!lookup.trim()) {
            toast.warn("Enter an IR number or item request ID.");
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/item-request-trace/${encodeURIComponent(lookup.trim())}`);
            setTrace(data);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to load item request trace.");
        } finally {
            setLoading(false);
        }
    };

    const previewRepair = async () => {
        setRepairing(true);
        try {
            const payload = trace?.itemRequestId ? { itemRequestIds: [trace.itemRequestId] } : {};
            const { data } = await api.post("/admin/item-request-trace/repair/preview", payload);
            setReport(data);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to preview trace repair.");
        } finally {
            setRepairing(false);
        }
    };

    const applyRepair = async () => {
        if (!reason.trim()) {
            toast.warn("Enter an admin repair reason.");
            return;
        }
        const ok = await confirmAction({
            title: "Apply item request trace repair",
            message: "This will update historical trace/status data for the selected item request. Continue?",
            confirmLabel: "Apply repair",
            tone: "danger",
        });
        if (!ok) return;

        setRepairing(true);
        try {
            const payload = {
                itemRequestIds: trace?.itemRequestId ? [trace.itemRequestId] : undefined,
                reason: reason.trim(),
            };
            const { data } = await api.post("/admin/item-request-trace/repair/apply", payload);
            setReport(data);
            toast.success("Trace repair applied.");
            if (trace?.itemRequestNumber || trace?.itemRequestId) {
                const key = trace.itemRequestNumber || trace.itemRequestId;
                const refreshed = await api.get(`/admin/item-request-trace/${encodeURIComponent(key)}`);
                setTrace(refreshed.data);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to apply trace repair.");
        } finally {
            setRepairing(false);
        }
    };

    const renderRecords = (title, key) => {
        const rows = trace?.[key] || [];
        return (
            <Card className="mb-3" key={key}>
                <Card.Header className="d-flex justify-content-between align-items-center py-2">
                    <strong>{title}</strong>
                    <Badge bg={rows.length ? "primary" : "light"} text={rows.length ? undefined : "dark"}>{rows.length}</Badge>
                </Card.Header>
                <Table responsive size="sm" className="mb-0 align-middle">
                    <thead>
                        <tr>
                            <th>Document</th>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Status</th>
                            <th>Trace</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan="5" className="text-muted">No records.</td></tr>
                        )}
                        {rows.map((row, idx) => (
                            <tr key={`${key}-${row.documentId || idx}-${row.productId || ""}`}>
                                <td>
                                    <div className="fw-semibold">{row.documentNumber || row.documentId || "-"}</div>
                                    <div className="text-muted small">{row.step}</div>
                                </td>
                                <td>
                                    <div>{row.productNameSnapshot || row.productId || "-"}</div>
                                    <div className="text-muted small">{row.productId || ""}</div>
                                </td>
                                <td>{row.qty ?? "-"}</td>
                                <td>{row.status || "-"}</td>
                                <td className="small">
                                    <div>IR: {row.itemRequestNumber || row.itemRequestId || "-"}</div>
                                    <div>Line: {row.lineKey || "-"}</div>
                                    <div>MIN: {row.projectId || "-"}{row.jobNumber ? ` / MJN: ${row.jobNumber}` : ""}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>
        );
    };

    return (
        <Container fluid className="py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                    <Button variant="light" onClick={() => navigate(-1)}><ArrowLeft size={18} /></Button>
                    <div>
                        <h4 className="mb-0">Item Request Trace Repair</h4>
                        <div className="text-muted small">Admin and Super Admin only</div>
                    </div>
                </div>
            </div>

            <Card className="mb-3">
                <Card.Body>
                    <Row className="g-2 align-items-end">
                        <Col md={5}>
                            <Form.Label>IR number or request ID</Form.Label>
                            <Form.Control value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="IR-2026-08-24-1808" />
                        </Col>
                        <Col md="auto">
                            <Button onClick={loadTrace} disabled={loading}>
                                {loading ? <Spinner size="sm" /> : <Search size={16} />} Track
                            </Button>
                        </Col>
                        <Col md="auto">
                            <Button variant="outline-primary" onClick={previewRepair} disabled={repairing}>
                                {repairing ? <Spinner size="sm" /> : <RefreshCw size={16} />} Preview Repair
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {trace && (
                <Row className="g-3">
                    <Col lg={4}>
                        <Card className="mb-3">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 className="mb-1">{trace.itemRequestNumber || trace.itemRequestId}</h5>
                                        <div className="text-muted small">Project: {trace.projectId || "-"}</div>
                                    </div>
                                    <Badge bg={trace.fullyTraceable ? "success" : "danger"}>{trace.status}</Badge>
                                </div>
                                <Alert className="mt-3 mb-0" variant={trace.fullyTraceable ? "success" : "warning"}>
                                    {trace.summary}
                                </Alert>
                            </Card.Body>
                        </Card>

                        <Card className="mb-3">
                            <Card.Header className="py-2"><strong>Request Lines</strong></Card.Header>
                            <Table size="sm" responsive className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Req</th>
                                        <th>Done</th>
                                        <th>Bal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(trace.itemLines || []).map((line) => (
                                        <tr key={line.productId}>
                                            <td>
                                                <div>{line.productNameSnapshot || line.productId}</div>
                                                <div className="text-muted small">{line.sku || line.productId}</div>
                                            </td>
                                            <td>{line.requestedQty}</td>
                                            <td>{line.fulfilledQty}</td>
                                            <td>{line.balanceQty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card>

                        <Card>
                            <Card.Body>
                                <Form.Label>Admin repair reason</Form.Label>
                                <Form.Control as="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                                <Button className="mt-2" variant="danger" onClick={applyRepair} disabled={repairing}>
                                    {repairing ? <Spinner size="sm" /> : <Wrench size={16} />} Apply Repair
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={8}>
                        {traceSections.map(([title, key]) => renderRecords(title, key))}
                    </Col>
                </Row>
            )}

            {report && (
                <Card className="mt-3">
                    <Card.Header className="py-2">
                        <strong>{report.dryRun ? "Repair Preview" : "Repair Result"}</strong>
                    </Card.Header>
                    <Table responsive size="sm" className="mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>IR</th>
                                <th>Action</th>
                                <th>Status</th>
                                <th>Trace</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(report.rows || []).map((row) => (
                                <tr key={row.itemRequestId}>
                                    <td>{row.itemRequestNumber || row.itemRequestId}</td>
                                    <td><Badge bg={statusVariant(row.action)}>{row.action}</Badge></td>
                                    <td>{row.currentStatus} -> {row.recommendedStatus}</td>
                                    <td>{row.exactTraceCount} exact / {row.clearLegacyCandidateCount} clear / {row.ambiguousLegacyCandidateCount} review</td>
                                    <td>{row.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            )}
        </Container>
    );
}
