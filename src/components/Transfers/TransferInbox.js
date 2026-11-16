import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Inbox, MapPin, PackageCheck, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Container, Form, Spinner, Table } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "./TransferInbox.css";

const listPendingTransfers = async (toLocationId) =>
    (await api.get(`/transfers?status=PENDING_ACCEPTANCE&toLocationId=${encodeURIComponent(toLocationId)}`)).data;
const acceptTransfer = async (id) => (await api.patch(`/transfers/${id}/accept`)).data;
const rejectTransfer = async (id) => (await api.patch(`/transfers/${id}/reject`)).data;
const quantity = (value, fallback = 0) => value ?? fallback;
const formatQuantity = (value) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(Number(value || 0));

export default function TransfersInbox() {
    const navigate = useNavigate();
    const [toLocationId, setToLocationId] = useState("LOC_PROJECT_OR_DEPT");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [query, setQuery] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [scanInput, setScanInput] = useState("");
    const [scannedKeys, setScannedKeys] = useState(new Set());
    const [processing, setProcessing] = useState(false);

    const load = async () => {
        setLoading(true);
        setLoadError("");
        try { setRows(await listPendingTransfers(toLocationId)); }
        catch {
            setRows([]);
            setLoadError("Transfers could not be loaded. Check the destination and try again.");
            toast.error("Failed to load transfers");
        } finally { setLoading(false); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [toLocationId]);

    const visibleRows = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => [row.trNumber, row.fromLocationId, row.toLocationId, row.sourceItemRequestNumber,
            ...(row.items || []).flatMap((item) => [item.productNameSnapshot, item.sku])]
            .some((value) => String(value || "").toLowerCase().includes(term)));
    }, [query, rows]);
    const totalUnits = useMemo(() => rows.reduce((sum, row) => sum + (row.items || []).reduce(
        (itemSum, item) => itemSum + Number(quantity(item.qtyDecimal, item.qty)), 0), 0), [rows]);

    const onAccept = async (id) => {
        if (processing) return;
        setProcessing(true);
        try { await acceptTransfer(id); toast.success("Accepted"); load(); }
        catch (e) {
            const message = e?.response?.data?.message || e?.message || "Failed to accept transfer";
            toast.error(message);
            console.error("Failed to accept transfer:", e?.response?.data || e);
        } finally { setProcessing(false); }
    };
    const onReject = async (id) => {
        if (processing) return;
        setProcessing(true);
        try { await rejectTransfer(id); toast.info("Rejected"); load(); }
        catch (e) {
            const message = e?.response?.data?.message || e?.message || "Failed to reject transfer";
            toast.error(message);
            console.error("Failed to reject transfer:", e?.response?.data || e);
        } finally { setProcessing(false); }
    };

    const toggleDetails = (id) => {
        setExpandedId((current) => current === id ? null : id);
        setScanInput("");
        setScannedKeys(new Set());
    };
    const handleScan = (qrValue) => {
        if (!expandedId) return;
        const parts = qrValue.split('|');
        if (parts.length < 5 || parts[0] !== 'V1') { toast.error("Invalid QR"); return; }
        const [, , productId, batchId, batchNo, serialNo] = parts;
        const transfer = rows.find((row) => row.id === expandedId);
        if (!transfer) return;
        const found = (transfer.items || []).some((item) => item.productId === productId &&
            (item.reservations || []).some((reservation) => reservation.batchId === batchId));
        if (found) {
            const key = serialNo || batchId;
            setScannedKeys((previous) => new Set(previous).add(key));
            toast.success("Verified: " + (serialNo || batchNo));
        } else toast.warn("Item not in this transfer: " + batchNo);
    };

    return (
        <Container fluid className="transfer-inbox-shell">
            <main className="transfer-inbox" aria-labelledby="transfer-inbox-heading">
                <header className="transfer-inbox-header">
                    <div className="transfer-inbox-title-row">
                        <Button variant="light" className="transfer-back" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={18} aria-hidden="true" /></Button>
                        <div><p className="transfer-eyebrow">Inventory movement</p><h1 id="transfer-inbox-heading">Transfers Inbox</h1><p>Review stock sent to this destination before accepting it into local inventory.</p></div>
                    </div>
                    <div className="transfer-destination"><Form.Label htmlFor="transfer-location">Destination location</Form.Label><Form.Control id="transfer-location" value={toLocationId} onChange={(event) => setToLocationId(event.target.value)} placeholder="Location ID" /></div>
                </header>

                <section className="transfer-summary" aria-label="Transfer inbox summary">
                    <div><span>Awaiting review</span><strong>{rows.length}</strong><small>pending transfers</small></div>
                    <div><span>Line items</span><strong>{rows.reduce((sum, row) => sum + (row.items || []).length, 0)}</strong><small>products to verify</small></div>
                    <div><span>Total quantity</span><strong>{formatQuantity(totalUnits)}</strong><small>units allocated</small></div>
                </section>

                <section className="transfer-workspace" aria-labelledby="transfer-queue-heading">
                    <div className="transfer-toolbar"><div><h2 id="transfer-queue-heading">Pending acceptance</h2><p>Confirm batches and quantities before taking action.</p></div><div className="transfer-search"><Search size={17} aria-hidden="true" /><Form.Control type="search" aria-label="Search pending transfers" placeholder="Search transfer, item, SKU or request" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>

                    {loading ? <div className="transfer-state" role="status"><Spinner size="sm" /><strong>Loading transfers</strong><span>Checking pending stock for {toLocationId}.</span></div>
                        : loadError ? <div className="transfer-state transfer-state-error" role="alert"><X aria-hidden="true" /><strong>Unable to load transfers</strong><span>{loadError}</span><Button variant="outline-danger" size="sm" onClick={load}>Try again</Button></div>
                        : visibleRows.length === 0 ? <div className="transfer-state"><Inbox aria-hidden="true" /><strong>{query ? "No matching transfers" : "No pending transfers"}</strong><span>{query ? "Try another transfer number, item, SKU, or request." : "New transfers for this destination will appear here."}</span></div>
                        : <div className="transfer-list">{visibleRows.map((row) => {
                            const itemCount = (row.items || []).length;
                            const rowQuantity = (row.items || []).reduce((sum, item) => sum + Number(quantity(item.qtyDecimal, item.qty)), 0);
                            const expanded = expandedId === row.id;
                            return <article className={`transfer-card${expanded ? " is-expanded" : ""}`} key={row.id}>
                                <div className="transfer-card-main">
                                    <div className="transfer-reference"><span>Transfer</span><strong>{row.trNumber || "Unnumbered transfer"}</strong>{row.sourceItemRequestNumber && <small>Request {row.sourceItemRequestNumber}</small>}</div>
                                    <div className="transfer-route" aria-label={`From ${row.fromLocationId} to ${row.toLocationId}`}><div><MapPin size={16} aria-hidden="true" /><span>Source</span><strong>{row.fromLocationId || "—"}</strong></div><ArrowRight size={18} aria-hidden="true" /><div><MapPin size={16} aria-hidden="true" /><span>Destination</span><strong>{row.toLocationId || "—"}</strong></div></div>
                                    <div className="transfer-counts"><div><span>Items</span><strong>{itemCount}</strong></div><div><span>Quantity</span><strong>{formatQuantity(rowQuantity)}</strong></div></div>
                                    <Badge className="transfer-status" bg="warning" text="dark">Pending acceptance</Badge>
                                    <Button variant="outline-primary" className="transfer-detail-toggle" aria-expanded={expanded} aria-controls={`transfer-details-${row.id}`} onClick={() => toggleDetails(row.id)}>{expanded ? "Hide details" : "Review details"}{expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}</Button>
                                </div>
                                {expanded && <div className="transfer-details" id={`transfer-details-${row.id}`}>
                                    <div className="transfer-detail-heading"><div><h3>Verify transfer items</h3><p>Scan a batch QR or compare the allocation below.</p></div><div className="transfer-scan"><Form.Label htmlFor={`scan-${row.id}`}>Batch or serial QR</Form.Label><Form.Control id={`scan-${row.id}`} size="sm" placeholder="Scan QR and press Enter" value={scanInput} onChange={(event) => setScanInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleScan(scanInput); setScanInput(""); } }} autoFocus /></div></div>
                                    <div className="transfer-items-scroll" tabIndex="0" aria-label={`Items in transfer ${row.trNumber}`}><Table className="transfer-items-table" responsive={false}><thead><tr><th>Product</th><th>Transfer quantity</th><th>Allocated batches</th><th>Verification</th></tr></thead><tbody>{(row.items || []).map((item, index) => {
                                        const verified = (item.reservations || []).some((reservation) => scannedKeys.has(reservation.batchId) || (reservation.serials || []).some((serial) => scannedKeys.has(serial)));
                                        return <tr key={item.productId || index}><td><strong>{item.productNameSnapshot || "Unnamed item"}</strong><small>{item.sku || "No SKU"}{item.unit ? ` · ${item.unit}` : ""}</small></td><td className="transfer-number">{formatQuantity(quantity(item.qtyDecimal, item.qty))}</td><td>{(item.reservations || []).length ? (item.reservations || []).map((reservation) => <div className="transfer-batch" key={reservation.batchId}><strong>{formatQuantity(quantity(reservation.reservedQtyDecimal, reservation.reservedQty))}</strong><span>{reservation.batchNumber || reservation.batchId}</span></div>) : <span className="transfer-muted">No batch allocation</span>}</td><td>{verified ? <Badge bg="success"><Check size={13} aria-hidden="true" /> Verified</Badge> : <Badge bg="light" text="dark"><PackageCheck size={13} aria-hidden="true" /> Not verified</Badge>}</td></tr>;
                                    })}</tbody></Table></div>
                                    <div className="transfer-actions"><p>Accept adds the allocated stock to this destination. Reject returns the transfer to the sender.</p><div><Button variant="outline-danger" onClick={() => onReject(row.id)} disabled={processing}>Reject transfer</Button><Button onClick={() => onAccept(row.id)} disabled={processing}>Accept transfer</Button></div></div>
                                </div>}
                            </article>;
                        })}</div>}
                </section>
            </main>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
