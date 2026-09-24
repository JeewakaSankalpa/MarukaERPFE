import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, RefreshCw, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/api";
import { confirmAction } from "../../utils/brandedDialogs";
import "./GRNRateCorrectionPage.css";

const money = value => Number(value || 0).toFixed(2);
const unitRate = value => Number(value || 0).toFixed(4);

export default function GRNRateCorrectionPage() {
    const { grnId } = useParams();
    const navigate = useNavigate();
    const role = (localStorage.getItem("role") || "").toUpperCase();
    const authorized = role === "ADMIN" || role === "SUPER_ADMIN";
    const [grn, setGrn] = useState(null);
    const [batches, setBatches] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [newRate, setNewRate] = useState("");
    const [newVatAmount, setNewVatAmount] = useState("");
    const [vatReviewed, setVatReviewed] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const [grnResponse, candidatesResponse] = await Promise.all([
                api.get(`/grns/${grnId}`),
                api.get(`/grns/${grnId}/rate-corrections`),
            ]);
            setGrn(grnResponse.data);
            setBatches(candidatesResponse.data || []);
            setSelectedId(current => candidatesResponse.data?.some(batch => batch.batchId === current)
                ? current : (candidatesResponse.data?.find(batch => batch.eligible) || candidatesResponse.data?.[0])?.batchId || "");
            setNewVatAmount(Number(grnResponse.data?.vatAmount ?? 0).toFixed(2));
        } catch (error) {
            const status = error?.response?.status;
            const message = status === 404
                ? "The correction service is unavailable on the running backend, or this GRN no longer exists."
                : status === 403
                    ? "Your account is not authorized to load GRN corrections."
                    : error?.response?.data?.message || "Could not load the correction details. Check the backend connection and retry.";
            setLoadError(message);
            setBatches([]);
        } finally {
            setLoading(false);
        }
    }, [grnId]);

    useEffect(() => {
        if (!authorized) return;
        load();
    }, [authorized, load]);

    const selected = batches.find(batch => batch.batchId === selectedId);
    const rate = Number(newRate);
    const delta = selected && Number.isFinite(rate)
        ? (rate - Number(selected.unitCost)) * Number(selected.quantity) : 0;
    const vatDelta = newVatAmount !== "" ? Number(newVatAmount) - Number(grn?.vatAmount || 0) : 0;
    const oldGross = Number(grn?.invoiceAmount || 0) + Number(grn?.vatAmount || 0) + Number(grn?.deliveryCharge || 0);
    const valid = selected?.eligible && newRate !== "" && rate > 0
        && rate !== Number(selected.unitCost) && reason.trim().length >= 8
        && newVatAmount !== "" && Number(newVatAmount) >= 0 && vatReviewed;

    const submit = async event => {
        event.preventDefault();
        if (!valid || busy) return;
        if (!await confirmAction({
            title: "Apply GRN rate correction",
            message: `${grn.grnNumber}: change the selected rate from Rs. ${unitRate(selected.unitCost)} to Rs. ${unitRate(newRate)}. The gross total changes by Rs. ${money(delta + vatDelta)} including the VAT amount you reviewed.`,
            confirmLabel: "Apply correction",
            tone: "warning",
        })) return;
        setBusy(true);
        try {
            await api.post(`/grns/${grnId}/rate-corrections`, {
                batchId: selected.batchId,
                expectedUnitCost: selected.unitCost,
                newUnitCost: newRate,
                expectedVatAmount: grn.vatAmount ?? 0,
                newVatAmount,
                vatReviewed,
                reason: reason.trim(),
            });
            toast.success("GRN rate corrected and adjustment recorded");
            setSelectedId("");
            setNewRate("");
            setVatReviewed(false);
            setReason("");
            await load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Rate correction failed");
        } finally {
            setBusy(false);
        }
    };

    if (!authorized) return <main className="grnc-page"><div className="grnc-shell"><div className="grnc-notice grnc-notice--danger">Admin access is required.</div></div></main>;

    return <main className="grnc-page"><div className="grnc-shell">
        <button type="button" className="grnc-back" onClick={() => navigate("/grns")}><ArrowLeft size={16} /> GRN history</button>
        <header className="grnc-header">
            <div><span className="grnc-eyebrow"><ShieldCheck size={15} /> ADMIN CORRECTION · UNIT RATE</span>
                <h1>Correct a received rate</h1>
                <p>Choose the exact receipt batch, enter the corrected rate and VAT, then review the new total before saving.</p>
            </div>
            <button type="button" className="grnc-refresh" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
        </header>
        {loading && <div className="grnc-notice" role="status">Loading the GRN and its received batches…</div>}
        {loadError && <div className="grnc-notice grnc-notice--danger" role="alert">{loadError}<button type="button" onClick={load}>Retry</button></div>}

        {grn && !loadError && <section className="grnc-summary" aria-label="GRN summary">
            <div className="grnc-summary-identity"><span className="grnc-label">GOODS RECEIVED NOTE</span><strong>{grn.grnNumber}</strong><span>{grn.supplierNameSnapshot || "Supplier unavailable"} · PO {grn.poNumber || "—"}</span></div>
            <div><span className="grnc-label">RECEIPT STATUS</span><strong>{grn.status || "—"}</strong><span>{grn.paymentStatus || "—"}</span></div>
            <div className="grnc-summary-total"><span className="grnc-label">CURRENT GROSS TOTAL</span><strong>Rs. {money(oldGross)}</strong><span>Goods Rs. {money(grn.invoiceAmount)} · VAT Rs. {money(grn.vatAmount)}</span></div>
        </section>}

        {!loading && !loadError && batches.length === 0 && <div className="grnc-notice grnc-notice--warning" role="status">No received stock batches were found for this GRN. It needs a manual review before a rate can be corrected.</div>}
        {!loading && !loadError && batches.length > 0 && <div className="grnc-workspace">
            <section className="grnc-batches" aria-label="Received batches">
                <div className="grnc-section-heading"><div><span className="grnc-label">STEP 01</span><h2>Received batches</h2></div><span className="grnc-count">{batches.filter(batch => batch.eligible).length} of {batches.length} available</span></div>
                <div className="grnc-batch-list">{batches.map(batch => <button type="button" key={batch.batchId}
                    className={`grnc-batch ${batch.batchId === selectedId ? "grnc-batch--selected" : ""}`}
                    onClick={() => { setSelectedId(batch.batchId); setNewRate(""); setReason(""); setVatReviewed(false); }} aria-pressed={batch.batchId === selectedId}>
                    <span className="grnc-batch-top"><strong>{batch.productName || batch.productId}</strong><span className={`grnc-status ${batch.eligible ? "grnc-status--ready" : "grnc-status--blocked"}`}>{batch.eligible ? "Ready" : "Review required"}</span></span>
                    <span className="grnc-batch-details"><span>Batch {batch.batchNo || batch.batchId}</span><span>Received {batch.quantity}</span></span>
                    <span className="grnc-batch-bottom"><span>Current rate <b>Rs. {unitRate(batch.unitCost)}</b></span><ArrowRight size={17} /></span>
                </button>)}</div>
            </section>

            <section className="grnc-editor" aria-label="Rate correction">
                <div className="grnc-section-heading"><div><span className="grnc-label">STEP 02</span><h2>Review correction</h2></div></div>
                {selected && <><div className="grnc-selection"><strong>{selected.productName || selected.productId}</strong><span>Batch {selected.batchNo || selected.batchId} · {selected.quantity} received</span></div>
                    {!selected.eligible ? <div className="grnc-blocker" role="alert"><CircleAlert size={23} /><div><strong>This batch needs review before its rate can change</strong><p>{selected.ineligibleReason || "The eligibility check did not return a reason."}</p><small>The rate has not been changed.</small></div></div>
                        : <form onSubmit={submit}>
                            <div className="grnc-rate-grid"><div className="grnc-current"><span className="grnc-label">CURRENT UNIT RATE</span><strong>Rs. {unitRate(selected.unitCost)}</strong></div><div className="grnc-new"><label htmlFor="grnc-rate" className="grnc-label">CORRECT UNIT RATE</label><div className="grnc-input-prefix"><span>Rs.</span><input id="grnc-rate" type="number" min="0.0001" step="0.0001" value={newRate} onChange={event => setNewRate(event.target.value)} placeholder="Enter rate" required /></div></div></div>
                            <p className="grnc-help">Use the received unit cost after any seller discount.</p>
                            <div className="grnc-vat-row"><div><label htmlFor="grnc-vat" className="grnc-label">CORRECT VAT AMOUNT</label><p>Current VAT: Rs. {money(grn?.vatAmount)}. Confirm the amount against the supplier invoice.</p></div><div className="grnc-input-prefix"><span>Rs.</span><input id="grnc-vat" type="number" min="0" step="0.01" value={newVatAmount} onChange={event => { setNewVatAmount(event.target.value); setVatReviewed(false); }} required /></div></div>
                            <label className="grnc-check"><input type="checkbox" checked={vatReviewed} onChange={event => setVatReviewed(event.target.checked)} /><span>I checked this VAT amount against the supplier invoice.</span></label>
                            <label htmlFor="grnc-reason" className="grnc-label">REASON FOR CORRECTION</label><textarea id="grnc-reason" rows={3} minLength={8} value={reason} onChange={event => setReason(event.target.value)} placeholder="Describe why the original rate was incorrect" required /><span className="grnc-help">At least 8 characters. This note stays in the audit record.</span>
                            <div className="grnc-preview"><div><span>Goods subtotal</span><strong>Rs. {money(grn?.invoiceAmount)} <ArrowRight size={14} /> Rs. {money(Number(grn?.invoiceAmount || 0) + delta)}</strong></div><div><span>VAT</span><strong>Rs. {money(grn?.vatAmount)} <ArrowRight size={14} /> Rs. {money(newVatAmount)}</strong></div><div className="grnc-preview-total"><span>NEW GROSS TOTAL</span><strong>Rs. {money(oldGross + delta + vatDelta)}</strong></div></div>
                            <button type="submit" className="grnc-apply" disabled={!valid || busy}>{busy ? "Saving correction…" : "Apply rate correction"}<ArrowRight size={17} /></button>
                        </form>}
                </>}
            </section>
        </div>}

        {grn?.rateCorrections?.length > 0 && <section className="grnc-history"><div className="grnc-section-heading"><div><span className="grnc-label">AUDIT TRAIL</span><h2>Previous corrections</h2></div></div>{grn.rateCorrections.map(correction => <div className="grnc-history-row" key={correction.id}><div><strong>Rs. {unitRate(correction.oldUnitCost)} <ArrowRight size={14} /> Rs. {unitRate(correction.newUnitCost)}</strong><span>{correction.reason}</span></div><span>{correction.actor} · {correction.at?.substring(0, 16)}</span><CheckCircle2 size={17} /></div>)}</section>}
    </div></main>;
}
