import React, { useEffect, useMemo, useState } from "react";
import { Container, Button, Form, Table, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ========== INLINE API HELPERS ========== */
const getLatestPending = async () => (await api.get(`/stores/pending-purchase/latest`)).data; // implement endpoint to return latest plan
const createPOsFromPending = async (pendingId, allocation) =>
    (await api.post(`/stores/pending-to-po/${pendingId}`, allocation)).data;

/* ========== PAGE ========== */
export default function PendingToPOPage() {
    const [plan, setPlan] = useState(null); // {id, lines:[{productId, productNameSnapshot, shortageQty, suppliers:[...] }]}
    const [choices, setChoices] = useState({}); // productId -> { supplierId, qty, unitPrice, taxPercent }

    useEffect(() => {
        (async () => {
            try {
                const p = await getLatestPending();
                setPlan(p);
                setChoices(Object.fromEntries((p?.lines||[]).map(l => [l.productId, { supplierId:"", qty:l.shortageQty, unitPrice:"", taxPercent:"" }])));
            } catch { toast.error("Failed to load pending purchases"); }
        })();
    }, []);

    const groupedAllocation = useMemo(() => {
        // supplierId => [{ productId, qty, unitPrice?, taxPercent? }]
        const map = {};
        Object.entries(choices).forEach(([pid, c]) => {
            if (!c?.supplierId || !(c.qty>0)) return;
            (map[c.supplierId] ||= []).push({
                productId: pid,
                qty: Number(c.qty),
                ...(c.unitPrice? { unitPrice: String(c.unitPrice) } : {}),
                ...(c.taxPercent? { taxPercent: String(c.taxPercent) } : {})
            });
        });
        return map;
    }, [choices]);

    const createPOs = async () => {
        try {
            if (!plan?.id) return;
            if (Object.keys(groupedAllocation).length === 0) { toast.info("No supplier allocation selected"); return; }
            const res = await createPOsFromPending(plan.id, groupedAllocation);
            toast.success(`Created ${res.length} PO(s)`);
            // refresh
            const p = await getLatestPending();
            setPlan(p);
            setChoices(Object.fromEntries((p?.lines||[]).map(l => [l.productId, { supplierId:"", qty:l.shortageQty, unitPrice:"", taxPercent:"" }])));
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to create POs");
        }
    };

    if (!plan) return (
        <Container style={{ width:"80vw", maxWidth:1000, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">Loading…</div>
        </Container>
    );

    return (
        <Container style={{ width:"80vw", maxWidth:1000, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={{ fontSize:"1.5rem" }}>Pending Purchases → Create POs</h2>
                </div>

                <Table hover responsive>
                    <thead>
                    <tr>
                        <th>Product</th>
                        <th className="text-end">Shortage</th>
                        <th>Supplier</th>
                        <th style={{width:120}}>Qty</th>
                        <th style={{width:130}}>Unit Price</th>
                        <th style={{width:120}}>Tax %</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(plan.lines||[]).map(l => {
                        const c = choices[l.productId] || {};
                        return (
                            <tr key={l.productId}>
                                <td>
                                    <div>{l.productNameSnapshot}</div>
                                    <div className="text-muted" style={{fontSize:12}}>{l.sku}</div>
                                </td>
                                <td className="text-end">{l.shortageQty}</td>
                                <td>
                                    <Form.Select value={c.supplierId || ""} onChange={e=>setChoices(s=>({ ...s, [l.productId]: { ...c, supplierId: e.target.value } }))}>
                                        <option value="">Select supplier</option>
                                        {(l.suppliers||[]).filter(s=>s.active!==false).map(s =>
                                            <option key={s.supplierId} value={s.supplierId}>
                                                {s.supplierName}{s.lastPurchasePrice?` — ${s.lastPurchasePrice}`:""}
                                            </option>
                                        )}
                                    </Form.Select>
                                </td>
                                <td>
                                    <Form.Control type="number" min="0" value={c.qty||""}
                                                  onChange={e=>setChoices(s=>({ ...s, [l.productId]: { ...c, qty: e.target.value } }))} />
                                </td>
                                <td>
                                    <Form.Control value={c.unitPrice||""}
                                                  onChange={e=>setChoices(s=>({ ...s, [l.productId]: { ...c, unitPrice: e.target.value } }))} />
                                </td>
                                <td>
                                    <Form.Control value={c.taxPercent||""}
                                                  onChange={e=>setChoices(s=>({ ...s, [l.productId]: { ...c, taxPercent: e.target.value } }))} />
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </Table>

                <div className="d-flex justify-content-end gap-2">
                    <Button onClick={createPOs}>Create POs (per supplier)</Button>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
