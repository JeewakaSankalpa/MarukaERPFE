import { ArrowLeft, PackageOpen, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// src/components/Stores/StoresPlanningPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Button, Form, Table, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "./StoresPlanningPage.css";
import "react-toastify/dist/ReactToastify.css";

const fetchAggregate = async () => (await api.get(`/stores/requests/aggregate`)).data;
const upsertPending   = async (shortages) => (await api.post(`/stores/pending-purchase`, shortages)).data;

export default function StoresPlanningPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);           // [{productId, productName, needQty, availableQty}]
    const [selection, setSelection] = useState({}); // productId -> user-entered qty
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [loadError, setLoadError] = useState("");

    const load = async () => {
        setLoading(true);
        setLoadError("");
        try {
            const data = await fetchAggregate();
            const safe = Array.isArray(data) ? data : [];
            safe.sort((a, b) => {
                const shortA = Math.max(0, (Number(a.needQty) || 0) - (Number(a.availableQty) || 0));
                const shortB = Math.max(0, (Number(b.needQty) || 0) - (Number(b.availableQty) || 0));
                return shortB - shortA;
            });
            setRows(safe);
            // Default suggestion = max(0, need - available)
            setSelection(Object.fromEntries(
                safe.map(r => [r.productId, Math.max(0, (Number(r.needQty)||0) - (Number(r.availableQty)||0))])
            ));
        } catch (e) {
            const message = e?.response?.data?.message || "Stores planning data could not be loaded.";
            setLoadError(message);
            toast.error(message);
            setRows([]);
            setSelection({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Precompute each row's current maximum shortage we should allow to plan
    const maxShortageByProduct = useMemo(() => {
        const m = {};
        rows.forEach(r => {
            const need = Number(r.needQty) || 0;
            const avail = Number(r.availableQty) || 0;
            m[r.productId] = Math.max(0, need - avail);
        });
        return m;
    }, [rows]);

    // Build the payload, capping each entry to the current max shortage
    const shortagesPayload = useMemo(() => {
        const out = {};
        for (const r of rows) {
            const pid = r.productId;
            const asked = Math.max(0, Number(selection[pid] || 0));
            const cap = maxShortageByProduct[pid] ?? 0;
            const finalQty = Math.min(asked, cap);
            if (finalQty > 0) out[pid] = finalQty;
        }
        return out;
    }, [rows, selection, maxShortageByProduct]);

    const totals = useMemo(() => rows.reduce((summary, row) => {
        const shortage = maxShortageByProduct[row.productId] || 0;
        summary.products += 1;
        summary.shortage += shortage;
        if (shortage > 0) summary.actionable += 1;
        return summary;
    }, { products: 0, shortage: 0, actionable: 0 }), [rows, maxShortageByProduct]);

    const doPendingPurchase = async () => {
        const count = Object.keys(shortagesPayload).length;
        if (count === 0) { toast.info("No shortages to plan"); return; }

        setPosting(true);
        try {
            await upsertPending(shortagesPayload);
            toast.success(`Added ${count} shortage${count>1?'s':''} to Pending Purchase`);
            await load(); // refresh — your service now subtracts planned qty, so covered rows disappear
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to add to pending purchases");
        } finally {
            setPosting(false);
        }
    };

    const setQty = (pid, v) => {
        const num = Math.max(0, Number(v || 0));
        // Soft-cap in the UI (server still enforces via subtraction on refresh)
        const cap = maxShortageByProduct[pid] ?? 0;
        setSelection(s => ({ ...s, [pid]: Math.min(num, cap) }));
    };

    return (
        <Container fluid className="stores-planning-page operational-workspace">
            <section className="stores-planning-workspace operational-workspace-surface" aria-labelledby="stores-planning-heading">
                <header className="stores-planning-header">
                    <div className="stores-planning-heading-group">
                        <button type="button" className="stores-planning-back-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={19} aria-hidden="true" /></button>
                        <div>
                            <h1 id="stores-planning-heading">Stores Planning (Procurement)</h1>
                            <p>Review shortages, adjust planned quantities, and send only confirmed gaps to Pending Purchases.</p>
                        </div>
                    </div>
                    <Button className="stores-planning-primary-action" variant="primary" onClick={doPendingPurchase} disabled={posting || loading}>
                        <ShoppingCart size={18} aria-hidden="true" />
                        {posting ? (<><Spinner size="sm" animation="border" />Adding…</>) : "Add shortages to Pending Purchase"}
                    </Button>
                </header>

                <div className="stores-planning-summary" aria-live="polite" aria-busy={loading}>
                    <div><span>Products reviewed</span><strong>{totals.products}</strong></div>
                    <div><span>Actionable shortages</span><strong>{totals.actionable}</strong></div>
                    <div><span>Total shortage</span><strong>{totals.shortage.toLocaleString()}</strong></div>
                </div>

                {loadError && <div className="stores-planning-error" role="alert"><span>{loadError}</span><Button size="sm" variant="outline-danger" onClick={load}>Try again</Button></div>}
                <div className="stores-planning-table-scroll" tabIndex={0} aria-label="Stores planning table">
                <Table hover className="stores-planning-table mb-0">
                    <thead>
                    <tr>
                        <th>Product</th>
                        <th className="text-end">Need (unplanned)</th>
                        <th className="text-end">Available (Main Store)</th>
                        <th style={{ width: 160 }}>Shortage to Plan</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading && [0, 1, 2].map(index => (
                        <tr className="stores-planning-skeleton-row" key={`planning-skeleton-${index}`} aria-hidden="true"><td><span /></td><td><span /></td><td><span /></td><td><span /></td></tr>
                    ))}
                    {!loading && (!rows || rows.length === 0) ? (
                        <tr className="stores-planning-empty-row"><td colSpan={4}><PackageOpen size={28} aria-hidden="true" /><strong>No shortages to plan</strong><span>{loadError ? "Restore the connection and try again." : "All currently reviewed stock requirements are covered."}</span></td></tr>
                    ) : rows.map(r => {
                        const pid = r.productId;
                        const maxShort = maxShortageByProduct[pid] ?? 0;
                        return (
                            <tr key={pid}>
                                <td data-label="Product"><strong>{r.productName || pid}</strong><span className="stores-planning-product-id">{pid}</span></td>
                                <td data-label="Need" className="text-end stores-planning-number">{Number(r.needQty || 0).toLocaleString()}</td>
                                <td data-label="Available" className="text-end stores-planning-number">{Number(r.availableQty || 0).toLocaleString()}</td>
                                <td data-label="Shortage to plan">
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        value={selection[pid] ?? 0}
                                        onChange={e => setQty(pid, e.target.value)}
                                        disabled={posting}
                                        aria-label={`Shortage to plan for ${r.productName || pid}`}
                                    />
                                    {maxShort === 0 && <div className="small text-muted">No shortage</div>}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </Table>
                </div>
            </section>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
