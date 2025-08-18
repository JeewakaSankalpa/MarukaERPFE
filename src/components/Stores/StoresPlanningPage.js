// src/components/Stores/StoresPlanningPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Button, Form, Table, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

const fetchAggregate = async () => (await api.get(`/stores/requests/aggregate`)).data;
const upsertPending   = async (shortages) => (await api.post(`/stores/pending-purchase`, shortages)).data;

export default function StoresPlanningPage() {
    const [rows, setRows] = useState([]);           // [{productId, productName, needQty, availableQty}]
    const [selection, setSelection] = useState({}); // productId -> user-entered qty
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchAggregate();
            const safe = Array.isArray(data) ? data : [];
            setRows(safe);
            // Default suggestion = max(0, need - available)
            setSelection(Object.fromEntries(
                safe.map(r => [r.productId, Math.max(0, (Number(r.needQty)||0) - (Number(r.availableQty)||0))])
            ));
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to load stores planning data");
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
        <Container style={{ width: "80vw", maxWidth: 1000, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Stores Planning (Procurement)</h2>
                    {loading && <div className="d-flex align-items-center gap-2">
                        <Spinner size="sm" animation="border" /> <span className="text-muted small">Loading…</span>
                    </div>}
                </div>

                <Table hover responsive>
                    <thead>
                    <tr>
                        <th>Product</th>
                        <th className="text-end">Need (unplanned)</th>
                        <th className="text-end">Available (Main Store)</th>
                        <th style={{ width: 160 }}>Shortage to Plan</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(!rows || rows.length === 0) ? (
                        <tr><td colSpan={4} className="text-center text-muted">{loading ? "Loading…" : "No rows"}</td></tr>
                    ) : rows.map(r => {
                        const pid = r.productId;
                        const maxShort = maxShortageByProduct[pid] ?? 0;
                        return (
                            <tr key={pid}>
                                <td>{r.productName || pid}</td>
                                <td className="text-end">{r.needQty}</td>
                                <td className="text-end">{r.availableQty}</td>
                                <td>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        value={selection[pid] ?? 0}
                                        onChange={e => setQty(pid, e.target.value)}
                                        disabled={posting}
                                    />
                                    {maxShort === 0 && <div className="small text-muted">No shortage</div>}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </Table>

                <div className="d-flex gap-2 justify-content-end">
                    <Button variant="outline-primary" onClick={doPendingPurchase} disabled={posting || loading}>
                        {posting ? (<><Spinner size="sm" animation="border" className="me-2" />Adding…</>) : "Add Shortages to Pending Purchase"}
                    </Button>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
