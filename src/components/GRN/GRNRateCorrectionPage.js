import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, RefreshCw, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/api";
import { confirmAction } from "../../utils/brandedDialogs";
import "./GRNRateCorrectionPage.css";

const money = value => Number(value || 0).toFixed(2);
const unitRate = value => Number(value || 0).toFixed(4);
const internalId = value => /^[a-f0-9]{24}$/i.test(value || "") || /^[a-f0-9-]{36}$/i.test(value || "");

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
    const [impact, setImpact] = useState(null);
    const [review, setReview] = useState(null);
    const [impactError, setImpactError] = useState("");
    const [impactLoading, setImpactLoading] = useState(false);
    const [discountAmount, setDiscountAmount] = useState("");
    const [discountReason, setDiscountReason] = useState("");
    const [discountPreview, setDiscountPreview] = useState(null);
    const [discountError, setDiscountError] = useState("");
    const [discountBusy, setDiscountBusy] = useState(false);

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
            setImpact(null);
            setReview(null);
            setDiscountPreview(null);
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
    const batchName = id => {
        const batch = batches.find(item => item.batchId === id);
        return batch ? `${batch.productName || "Product"} · Batch ${batch.batchNo || "unnumbered"}` : "Batch record unavailable";
    };
    const impactName = (id, fallback) => impact?.displayNames?.[id] || fallback;
    const impactReference = record => {
        if (record.kind === "TRANSFER") return `${record.reference || "Transfer"} · ${impactName(record.id, "Destination unavailable")}`;
        if (record.kind === "STOCK_BATCH") return impactName(record.batchId, "Stock batch");
        if (record.kind === "STOCK_MOVEMENT") return impactName(record.reference, record.note?.split(":")[0] || "Stock movement");
        return impactName(record.reference, internalId(record.reference) ? record.kind.replaceAll("_", " ") : record.reference || record.kind.replaceAll("_", " "));
    };
    const riskDestination = risk => {
        if (risk.code === "TRANSFER_NOT_ACCEPTED") return { label: "Review transfer", path: "/transfers/inbox" };
        if (["PROJECT_BATCH_ALLOCATION_REQUIRED", "SOURCE_ALLOCATION_REQUIRED", "DESTINATION_ALLOCATION_REQUIRED"].includes(risk.code)) {
            const projectId = impact?.impacts?.find(record => record.projectId && record.status === "ALLOCATION_REQUIRED")?.projectId;
            if (projectId) return { label: "Review project", path: `/projects/manage/${projectId}` };
        }
        if (risk.code === "ACCOUNT_MAPPING" || risk.code === "FISCAL_YEAR" || risk.code === "ACCOUNTING_RECONCILIATION")
            return { label: "Review finance", path: "/finance/accounts" };
        if (risk.code === "SUPPLIER_RETURN_REVIEW") return { label: "Review supplier returns", path: "/inventory/supplier-returns/approvals" };
        return null;
    };
    const rate = Number(newRate);
    const oldGross = Number(grn?.invoiceAmount || 0) + Number(grn?.vatAmount || 0) + Number(grn?.deliveryCharge || 0);
    const valid = review?.canApply && selected && newRate !== "" && rate > 0
        && rate !== Number(selected.unitCost) && reason.trim().length >= 8
        && newVatAmount !== "" && Number(newVatAmount) >= 0 && vatReviewed;
    const canPreview = selected && newRate !== "" && rate > 0
        && rate !== Number(selected.unitCost) && newVatAmount !== ""
        && Number(newVatAmount) >= 0;

    const reviewImpact = async () => {
        if (!canPreview || impactLoading) return;
        setImpactLoading(true);
        setImpactError("");
        try {
            const response = await api.get(`/grns/${grnId}/rate-corrections/review`, {
                params: { batchId: selected.batchId, newUnitCost: newRate, newVatAmount },
            });
            setReview(response.data);
            setImpact(response.data.impact);
        } catch (error) {
            setImpact(null);
            setReview(null);
            setImpactError(error?.response?.status === 404
                ? "The impact preview is not available on the running backend yet."
                : error?.response?.data?.message || "Could not trace this batch. No data was changed.");
        } finally {
            setImpactLoading(false);
        }
    };

    const reviewDiscount = async () => {
        setDiscountError("");
        setDiscountPreview(null);
        try {
            const response = await api.get(`/grns/${grnId}/discount-corrections/impact`, {
                params: { amount: discountAmount },
            });
            setDiscountPreview(response.data);
        } catch (error) {
            setDiscountError(error?.response?.data?.message || "Could not preview this discount. No data was changed.");
        }
    };

    const applyDiscount = async () => {
        if (!discountPreview || discountPreview.blockedReason || discountReason.trim().length < 8 || discountBusy) return;
        if (!await confirmAction({
            title: "Apply total GRN discount",
            message: `${grn.grnNumber}: reduce stock cost and supplier payable by Rs. ${money(discountPreview.discountAmount)}. The new payable will be Rs. ${money(discountPreview.proposedPayable)}.`,
            confirmLabel: "Apply discount",
            tone: "warning",
        })) return;
        setDiscountBusy(true);
        try {
            await api.post(`/grns/${grnId}/discount-corrections`, {
                amount: discountAmount,
                expectedSubtotal: discountPreview.currentSubtotal,
                reason: discountReason.trim(),
            });
            toast.success("Total discount applied with an accounting adjustment");
            setDiscountAmount("");
            setDiscountReason("");
            setDiscountPreview(null);
            await load();
        } catch (error) {
            setDiscountError(error?.response?.data?.message || "Discount correction failed. Refresh and review again.");
        } finally {
            setDiscountBusy(false);
        }
    };

    const submit = async event => {
        event.preventDefault();
        if (!valid || busy) return;
        if (!await confirmAction({
            title: "Approve posted GRN correction",
            message: `${grn.grnNumber} · ${grn.supplierNameSnapshot || "Supplier"}\n${selected.productName || selected.productId} · ${selected.quantity} units\nRate: Rs. ${unitRate(selected.unitCost)} → Rs. ${unitRate(newRate)}\nVAT: Rs. ${money(grn.vatAmount)} → Rs. ${money(newVatAmount)}\nGoods: Rs. ${money(review.oldSubtotal)} → Rs. ${money(review.newSubtotal)}\nPayable: Rs. ${money(review.oldGross)} → Rs. ${money(review.newGross)}\nAffected batches: ${review.affectedBatchIds.length}. An audited adjustment journal will be posted. Reason: ${reason.trim()}`,
            confirmLabel: "Apply correction",
            tone: "warning",
        })) return;
        setBusy(true);
        try {
            await api.post(`/grns/${grnId}/rate-corrections/apply`, {
                batchId: selected.batchId,
                newUnitCost: newRate,
                newVatAmount,
                approvalToken: review.approvalToken,
                vatReviewed,
                reason: reason.trim(),
            });
            toast.success("GRN rate corrected and adjustment recorded");
            setSelectedId("");
            setNewRate("");
            setVatReviewed(false);
            setReview(null);
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
            <div className="grnc-summary-total"><span className="grnc-label">CURRENT GROSS TOTAL</span><strong>Rs. {money(oldGross)}</strong><span>Goods Rs. {money(grn.invoiceAmount)} · VAT Rs. {money(grn.vatAmount)} · Later discounts Rs. {money(grn.postReceiptDiscountAmount)}</span></div>
        </section>}

        {!loading && !loadError && batches.length === 0 && <div className="grnc-notice grnc-notice--warning" role="status">No received stock batches were found for this GRN. It needs a manual review before a rate can be corrected.</div>}
        {!loading && !loadError && batches.length > 0 && <div className="grnc-workspace">
            <section className="grnc-batches" aria-label="Original GRN receipt batches">
                <div className="grnc-section-heading"><div><span className="grnc-label">STEP 01</span><h2>Original receipt batches</h2></div><span className="grnc-count">{batches.filter(batch => batch.eligible).length} of {batches.length} available</span></div>
                <div className="grnc-batch-list">{batches.map(batch => <button type="button" key={batch.batchId}
                    className={`grnc-batch ${batch.batchId === selectedId ? "grnc-batch--selected" : ""}`}
                    onClick={() => { setSelectedId(batch.batchId); setNewRate(""); setReason(""); setVatReviewed(false); setImpact(null); setReview(null); setImpactError(""); }} aria-pressed={batch.batchId === selectedId}>
                    <span className="grnc-batch-top"><strong>{batch.productName || batch.productId}</strong><span className={`grnc-status ${batch.eligible ? "grnc-status--ready" : "grnc-status--blocked"}`}>{batch.eligible ? "Ready" : "Review required"}</span></span>
                    <span className="grnc-batch-details"><span>Batch {batch.batchNo || batch.batchId}</span><span>Received {batch.quantity}</span></span>
                    <span className="grnc-batch-bottom"><span>Current rate <b>Rs. {unitRate(batch.unitCost)}</b></span><ArrowRight size={17} /></span>
                </button>)}</div>
            </section>

            <section className="grnc-editor" aria-label="Rate correction">
                <div className="grnc-section-heading"><div><span className="grnc-label">STEP 02</span><h2>Review correction</h2></div></div>
                {selected && <><div className="grnc-selection"><strong>{selected.productName || selected.productId}</strong><span>Batch {selected.batchNo || selected.batchId} · {selected.quantity} received</span></div>
                    {!selected.eligible && <div className="grnc-blocker" role="status"><CircleAlert size={23} /><div><strong>Dependencies need review</strong><p>{selected.ineligibleReason || "This batch needs an impact review."}</p><small>Analyze Impact will show which dependencies can be adjusted and which need action.</small></div></div>}
                    <form id="grnc-correction-form" onSubmit={submit}>
                            <div className="grnc-rate-grid"><div className="grnc-current"><span className="grnc-label">CURRENT UNIT RATE</span><strong>Rs. {unitRate(selected.unitCost)}</strong></div><div className="grnc-new"><label htmlFor="grnc-rate" className="grnc-label">PROPOSED NET UNIT RATE</label><div className="grnc-input-prefix"><span>Rs.</span><input id="grnc-rate" type="number" min="0.0001" step="0.0001" value={newRate} onChange={event => { setNewRate(event.target.value); setImpact(null); setReview(null); }} placeholder="Enter net rate" required /></div></div></div>
                            <p className="grnc-help">Enter the final unit cost after any seller discount. Gross invoice price and total discount require one combined review.</p>
                            <div className="grnc-vat-row"><div><label htmlFor="grnc-vat" className="grnc-label">PROPOSED VAT AMOUNT</label><p>Current VAT: Rs. {money(grn?.vatAmount)}. Confirm the amount against the supplier invoice.</p></div><div className="grnc-input-prefix"><span>Rs.</span><input id="grnc-vat" type="number" min="0" step="0.01" value={newVatAmount} onChange={event => { setNewVatAmount(event.target.value); setVatReviewed(false); setImpact(null); setReview(null); }} required /></div></div>
                            <label className="grnc-check"><input type="checkbox" checked={vatReviewed} onChange={event => setVatReviewed(event.target.checked)} /><span>I checked this VAT amount against the supplier invoice.</span></label>
                            <label htmlFor="grnc-reason" className="grnc-label">REASON FOR CORRECTION</label><textarea id="grnc-reason" rows={3} minLength={8} value={reason} onChange={event => setReason(event.target.value)} placeholder="Describe why the original rate was incorrect" required /><span className="grnc-help">At least 8 characters. This note stays in the audit record.</span>
                            <div className="grnc-actions"><button type="button" className="grnc-review" onClick={reviewImpact} disabled={!canPreview || impactLoading}>{impactLoading ? "Tracing records…" : "Analyze impact"}<ArrowRight size={17} /></button>
                            </div>
                        </form>
                </>}
            </section>
        </div>}

        {impactError && <div className="grnc-notice grnc-notice--danger" role="alert">{impactError}</div>}
        {impact && <section className="grnc-impact" aria-label="Read-only impact review">
            <div className="grnc-section-heading"><div><span className="grnc-label">READ-ONLY TRACE</span><h2>Impact review</h2></div><span className="grnc-count">{impact.impacts?.length || 0} records</span></div>
            <div className="grnc-impact-intro"><strong>Rs. {unitRate(impact.currentRate)} <ArrowRight size={15} /> Rs. {unitRate(impact.proposedRate)}</strong><span>Estimated GRN gross total: Rs. {money(impact.currentGross)} → Rs. {money(impact.proposedGross)}</span><p>Original posted journals remain unchanged. Proposed values are shown only where source quantities can be traced. No correction is applied from this review.</p></div>
            {review && <div className="grnc-review-summary"><div><span>Goods subtotal</span><strong>Rs. {money(review.oldSubtotal)} → Rs. {money(review.newSubtotal)}</strong></div><div><span>Inventory value</span><strong>Rs. {money(review.oldInventoryValue)} → Rs. {money(review.newInventoryValue)}</strong></div><div><span>Consumed project cost</span><strong>Rs. {money(review.oldConsumptionValue)} → Rs. {money(review.newConsumptionValue)}</strong></div><div><span>Supplier payable</span><strong>Rs. {money(review.oldGross)} → Rs. {money(review.newGross)}</strong></div>{review.oldProductAverage != null && <div><span>Product cost price</span><strong>Rs. {unitRate(review.oldProductAverage)} → Rs. {unitRate(review.newProductAverage)}</strong></div>}</div>}
            {review?.accountingChanges?.length > 0 && <div className="grnc-journal-preview"><h3>Adjustment journal to be posted</h3><div className="grnc-journal-head"><span>Account and purpose</span><span>Debit</span><span>Credit</span></div>{review.accountingChanges.map((line, index) => <div className="grnc-journal-row" key={`${line.account}-${index}`}><span><b>{line.account}</b><small>{line.description}</small></span><strong>{Number(line.debit) ? `Rs. ${money(line.debit)}` : "—"}</strong><strong>{Number(line.credit) ? `Rs. ${money(line.credit)}` : "—"}</strong></div>)}</div>}
            {review && <div className="grnc-risk-section"><h3>Risks and required actions</h3>{review.risks.map((risk, index) => <div className={`grnc-risk grnc-risk--${risk.status.toLowerCase()}`} key={`${risk.code}-${index}`}><strong>{risk.status === "SAFE" ? "✓ Safe to update" : risk.status === "ACTION_REQUIRED" ? "⚠ Action required" : "⛔ Cannot safely correct"}</strong><div><b>{risk.summary}</b><span>{risk.resolution}</span>{riskDestination(risk) && <button type="button" className="grnc-risk-link" onClick={() => navigate(riskDestination(risk).path)}>{riskDestination(risk).label} <ArrowRight size={14} /></button>}</div></div>)}{!review.canApply && <p className="grnc-risk-gate">Resolve the required actions and run Analyze Impact again. No records have been changed.</p>}</div>}
            {impact.issues?.length > 0 && <div className="grnc-impact-issues"><h3>Items requiring allocation or review</h3>{impact.issues.map((issue, index) => <div className="grnc-impact-issue" key={`${issue.code}-${issue.reference}-${index}`}><CircleAlert size={17} /><div><strong>{issue.code.replaceAll("_", " ")}</strong><span>{issue.reference ? `${impactName(issue.reference, internalId(issue.reference) ? "Related movement" : issue.reference)} · ` : ""}{issue.message}</span>{issue.sourceCandidates?.length > 0 && <small>Candidate sources: {issue.sourceCandidates.map(candidate => `${impactName(candidate.batchId, "Batch record unavailable")} (${candidate.quantity})`).join(", ")}</small>}</div></div>)}</div>}
            <div className="grnc-impact-list">{impact.impacts?.map((record, index) => <div className="grnc-impact-record" key={`${record.kind}-${record.id}-${index}`}>
                <div className="grnc-impact-record-head"><strong>{record.kind.replaceAll("_", " ")}</strong><span className={record.status === "TRACED" ? "grnc-traced" : "grnc-needs-review"}>{record.status.replaceAll("_", " ")}</span></div>
                <div className="grnc-impact-record-meta">{impactReference(record)}{record.projectId ? ` · Project ${impactName(record.projectId, "Project unavailable")}` : ""}{record.batchId && record.kind !== "STOCK_BATCH" ? ` · ${impactName(record.batchId, "Batch record unavailable")}` : ""}{record.accountId ? ` · Account ${impactName(record.accountId, "Account unavailable")}` : ""}</div>
                <div className="grnc-impact-values"><span>Quantity <b>{record.quantity ?? "—"}</b></span><span>Rate <b>{record.currentRate == null ? "—" : `Rs. ${unitRate(record.currentRate)}`} → {record.proposedRate == null ? "Requires review" : `Rs. ${unitRate(record.proposedRate)}`}</b></span><span>Value <b>{record.currentValue == null ? "—" : `Rs. ${money(record.currentValue)}`} → {record.proposedValue == null ? "Requires review" : `Rs. ${money(record.proposedValue)}`}</b></span></div>
                <p>{record.note}</p>
            </div>)}</div>
            {review?.canApply && <div className="grnc-final-approval"><span className="grnc-label">FINAL ADMIN APPROVAL</span><h3>Approve the posted correction</h3><p>You are about to correct posted GRN financial and inventory data. Review every affected record above before continuing.</p><div><span>GRN <b>{grn?.grnNumber}</b></span><span>Supplier <b>{grn?.supplierNameSnapshot || "—"}</b></span><span>GRN date <b>{grn?.createdAt?.substring(0, 10) || "—"}</b></span><span>Product <b>{selected?.productName || selected?.productId}</b></span><span>Batch <b>{selected?.batchNo || "Unnumbered"}</b></span><span>Quantity <b>{selected?.quantity}</b></span><span>VAT <b>Rs. {money(grn?.vatAmount)} → Rs. {money(newVatAmount)}</b></span><span>Gross payable <b>Rs. {money(review.oldGross)} → Rs. {money(review.newGross)}</b></span><span>Correction reason <b>{reason.trim() || "Enter a reason above"}</b></span><span>Admin <b>{localStorage.getItem("username") || "Signed-in admin"}</b></span></div><button type="submit" form="grnc-correction-form" className="grnc-apply" disabled={!valid || busy}>{busy ? "Applying correction…" : "Apply correction"}<ArrowRight size={17} /></button></div>}
        </section>}

        {grn && !loadError && <section className="grnc-discount" aria-label="Total GRN discount correction">
            <div className="grnc-section-heading"><div><span className="grnc-label">SUPPLIER DISCOUNT</span><h2>Add a discount to the total GRN</h2></div></div>
            <div className="grnc-discount-body"><p>Use this only for an additional discount received after the GRN was posted. It reduces every untouched receipt batch and supplier payable. For an invoice showing a gross rate and one discount, enter the final net rate in the correction above; do not apply the gross rate and discount as separate corrections.</p>
                <div className="grnc-discount-fields"><label htmlFor="grnc-discount-amount">Discount amount (Rs.)<input id="grnc-discount-amount" type="number" min="0.01" step="0.01" value={discountAmount} onChange={event => { setDiscountAmount(event.target.value); setDiscountPreview(null); }} placeholder="0.00" /></label>
                    <button type="button" className="grnc-review" disabled={!discountAmount || Number(discountAmount) <= 0 || discountBusy} onClick={reviewDiscount}>Review discount <ArrowRight size={16} /></button></div>
                {discountError && <div className="grnc-notice grnc-notice--danger" role="alert">{discountError}</div>}
                {discountPreview && <div className="grnc-discount-result"><div className="grnc-discount-totals"><span>Goods subtotal: Rs. {money(discountPreview.currentSubtotal)} → Rs. {money(discountPreview.proposedSubtotal)}</span><strong>Payable: Rs. {money(discountPreview.currentPayable)} → Rs. {money(discountPreview.proposedPayable)}</strong></div>
                    {discountPreview.blockedReason ? <div className="grnc-notice grnc-notice--warning" role="alert">{discountPreview.blockedReason}. No records can be changed from this preview.</div> : <><div className="grnc-discount-batches">{discountPreview.batches.map(batch => <div key={batch.batchId}><span>{batchName(batch.batchId)} · {batch.quantity} units</span><strong>Rs. {unitRate(batch.oldUnitCost)} → Rs. {unitRate(batch.newUnitCost)}</strong></div>)}</div>
                        <label className="grnc-discount-reason" htmlFor="grnc-discount-reason">Reason for discount<textarea id="grnc-discount-reason" rows={2} minLength={8} value={discountReason} onChange={event => setDiscountReason(event.target.value)} placeholder="Describe the supplier's discount" /></label>
                        <button type="button" className="grnc-apply" disabled={discountReason.trim().length < 8 || discountBusy} onClick={applyDiscount}>{discountBusy ? "Applying discount…" : "Apply total discount"}<ArrowRight size={16} /></button></>}</div>}
            </div>
        </section>}

        {grn?.rateCorrections?.length > 0 && <section className="grnc-history"><div className="grnc-section-heading"><div><span className="grnc-label">AUDIT TRAIL</span><h2>Previous corrections</h2></div></div>{grn.rateCorrections.map(correction => <div className="grnc-history-row" key={correction.id}><div><strong>Rs. {unitRate(correction.oldUnitCost)} <ArrowRight size={14} /> Rs. {unitRate(correction.newUnitCost)}</strong><span>{correction.reason}</span>{correction.oldGross != null && <span>Payable Rs. {money(correction.oldGross)} → Rs. {money(correction.newGross)} · VAT Rs. {money(correction.oldVatAmount)} → Rs. {money(correction.newVatAmount)}</span>}{correction.journalReference && <span>Adjustment journal: {correction.journalReference}</span>}{correction.affectedBatchIds?.length > 0 && <span>{correction.affectedBatchIds.length} batch{correction.affectedBatchIds.length === 1 ? "" : "es"} · {correction.affectedLedgerIds?.length || 0} stock movements traced</span>}</div><span>{correction.actorName || correction.actor} · {correction.at?.substring(0, 16)} · {correction.status || "Posted"}</span><CheckCircle2 size={17} /></div>)}</section>}
        {grn?.discountCorrections?.length > 0 && <section className="grnc-history"><div className="grnc-section-heading"><div><span className="grnc-label">AUDIT TRAIL</span><h2>Previous total discounts</h2></div></div>{grn.discountCorrections.map(correction => <div className="grnc-history-row" key={correction.id}><div><strong>Rs. {money(correction.amount)} discount</strong><span>{correction.reason}</span></div><span>{correction.actor} · {correction.at?.substring(0, 16)}</span><CheckCircle2 size={17} /></div>)}</section>}
    </div></main>;
}
