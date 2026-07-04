import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Container, Button, Form, Table, Badge, Modal } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";
import SafeSelect from '../ReusableComponents/SafeSelect';
import CompletenessModal from '../ReusableComponents/CompletenessModal';
import { buildCompletenessIssues, hasBlockingIssues } from '../../utils/entityCompleteness';
import { ProductForm } from '../Inventory/ProductPage';
import { SupplierForm } from '../Supplier/SupplierPage';

/* ========== INLINE API HELPERS ========== */
const getPendingPlans = async (sort) => (await api.get(`/stores/pending-purchase`, { params: { sort } })).data;
const createPOsFromPending = async (pendingId, allocation) =>
    (await api.post(`/stores/pending-to-po/${pendingId}`, allocation)).data;
const getSupplier = async (id) => (await api.get(`/suppliers/${id}`)).data;
const getProduct = async (id) => (await api.get(`/products/${id}`)).data;

const getProjectSearchText = (line) => [
    line.jobNumber,
    line.inquiryNumber,
    line.projectNumber,
    line.referenceNumber,
    line.projectId
].filter(Boolean).join(" ").toLowerCase();

const getLineKey = (line) => line.lineKey || `${line.projectId ? `PROJECT:${line.projectId}` : 'STORES'}:${line.productId}`;
const getInitialChoices = (pendingPlan) => Object.fromEntries(
    (pendingPlan?.lines || []).map(l => [getLineKey(l), { supplierId:"", qty:l.shortageQty, unitPrice:"", taxPercent:"" }])
);
const getPlanUpdatedAt = (pendingPlan) => pendingPlan?.updatedAt || pendingPlan?.createdAt || "";
const formatPlanUpdatedAt = (pendingPlan) => {
    const value = getPlanUpdatedAt(pendingPlan);
    if (!value) return "No update date";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

/* ========== PAGE ========== */
export default function PendingToPOPage() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [plan, setPlan] = useState(null); // {id, lines:[{productId, productNameSnapshot, shortageQty, suppliers:[...] }]}
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [pendingSort, setPendingSort] = useState("updatedAtDesc");
    const [hasLoadedPending, setHasLoadedPending] = useState(false);
    const [choices, setChoices] = useState({}); // productId -> { supplierId, qty, unitPrice, taxPercent }
    const [quotationRefs, setQuotationRefs] = useState({}); // supplierId -> quotation no
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completenessIssues, setCompletenessIssues] = useState([]);
    const [showCompletenessModal, setShowCompletenessModal] = useState(false);
    const [pendingCompletenessProceed, setPendingCompletenessProceed] = useState(null);
    const [editRecord, setEditRecord] = useState(null);
    const [projectFilter, setProjectFilter] = useState("");

    const getOriginLabel = (line) => {
        if (line.originType === 'PROJECT' || line.projectId) {
            return {
                title: line.jobNumber || 'No MJN',
                subtitle: `MIN: ${line.inquiryNumber || line.projectId || '-'}`
            };
        }
        return { title: 'From Stores', subtitle: 'Main Store' };
    };

    const applyPlan = useCallback((nextPlan) => {
        setPlan(nextPlan);
        setSelectedPlanId(nextPlan?.id || "");
        setChoices(getInitialChoices(nextPlan));
        setQuotationRefs({});
    }, []);

    const reloadPending = useCallback(async () => {
        const list = await getPendingPlans(pendingSort);
        const pendingPlans = list || [];
        setPlans(pendingPlans);
        applyPlan(pendingPlans.find(p => p.id === selectedPlanId) || pendingPlans[0] || null);
        setHasLoadedPending(true);
    }, [applyPlan, pendingSort, selectedPlanId]);

    useEffect(() => {
        reloadPending().catch(() => {
            setHasLoadedPending(true);
            toast.error("Failed to load pending purchases");
        });
    }, [reloadPending]);

    const handlePlanChange = (planId) => {
        applyPlan(plans.find(p => p.id === planId) || null);
    };

    const filteredLines = useMemo(() => {
        const lines = plan?.lines || [];
        const query = projectFilter.trim().toLowerCase();
        if (!query) return lines;
        return lines.filter(line => getProjectSearchText(line).includes(query));
    }, [plan?.lines, projectFilter]);

    const groupedAllocation = useMemo(() => {
        // supplierId => [{ productId, qty, unitPrice?, taxPercent? }]
        const map = {};
        Object.entries(choices).forEach(([key, c]) => {
            if (!c?.supplierId || !(c.qty>0)) return;
            const line = filteredLines.find(l => getLineKey(l) === key);
            if (!line) return;
            (map[c.supplierId] ||= []).push({
                lineKey: key,
                productId: line.productId,
                originType: line.originType,
                projectId: line.projectId,
                qty: Number(c.qty),
                ...(quotationRefs[c.supplierId]?.trim() ? { quotationRef: quotationRefs[c.supplierId].trim() } : {}),
                ...(c.unitPrice? { unitPrice: String(c.unitPrice) } : {}),
                ...(c.taxPercent? { taxPercent: String(c.taxPercent) } : {})
            });
        });
        return map;
    }, [choices, quotationRefs, filteredLines]);

    const openCompletenessModal = (issues, proceed = null) => {
        setCompletenessIssues(issues);
        setPendingCompletenessProceed(() => proceed);
        setShowCompletenessModal(true);
    };

    const runCompletenessChecks = async () => {
        const selectedSupplierIds = [...new Set(Object.values(choices).map(c => c?.supplierId).filter(Boolean))];
        const selectedProductIds = [...new Set(
            Object.entries(choices)
                .filter(([, c]) => c?.supplierId && Number(c.qty) > 0)
                .map(([key]) => {
                    const line = filteredLines.find(l => getLineKey(l) === key);
                    return line?.productId;
                })
                .filter(Boolean)
        )];

        const suppliers = await Promise.all(selectedSupplierIds.map(id => getSupplier(id).catch(() => ({ id }))));
        const products = await Promise.all(selectedProductIds.map(id => getProduct(id).catch(() => {
            const line = (plan?.lines || []).find(l => l.productId === id);
            return { id, name: line?.productNameSnapshot, sku: line?.sku };
        })));

        return [
            ...buildCompletenessIssues('supplierPurchase', suppliers, item => item?.name || item?.id || 'Supplier'),
            ...buildCompletenessIssues('productPurchase', products, item => item?.name || item?.productNameSnapshot || item?.id || 'Product')
        ];
    };

    const openIssueEditor = (issue) => {
        if (!issue?.entityId) return;
        setEditRecord({
            type: issue.ruleKey === 'supplierPurchase' ? 'supplier' : 'product',
            id: issue.entityId,
            name: issue.name
        });
    };

    const closeIssueEditor = () => setEditRecord(null);

    const handleIssueEditorSaved = async () => {
        closeIssueEditor();
        try {
            await reloadPending();
        } catch {
            toast.error("Saved, but failed to refresh pending purchases");
        }
    };

    const performCreatePOs = async () => {
        if (isSubmitting) return;
        try {
            if (!plan?.id) return;
            if (Object.keys(groupedAllocation).length === 0) { toast.info("No supplier allocation selected"); return; }
            setIsSubmitting(true);
            const res = await createPOsFromPending(plan.id, groupedAllocation);
            toast.success(`Created ${res.length} PO(s)`);
            await reloadPending();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to create POs");
        } finally {
            setIsSubmitting(false);
        }
    };

    const createPOs = async () => {
        if (!plan?.id) return;
        if (Object.keys(groupedAllocation).length === 0) { toast.info("No supplier allocation selected"); return; }

        const issues = await runCompletenessChecks();
        if (issues.length > 0) {
            if (hasBlockingIssues(issues)) {
                openCompletenessModal(issues);
                return;
            }
            openCompletenessModal(issues, performCreatePOs);
            return;
        }

        await performCreatePOs();
    };

    if (!hasLoadedPending) return (
        <Container style={{ width:"80vw", maxWidth:1000, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">Loading…</div>
        </Container>
    );

    if (!plan) return (
        <Container style={{ width:"80vw", maxWidth:1000, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex align-items-center mb-3">
                    <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                    <h2 className="mb-0" style={{ fontSize:"1.5rem" }}>Pending Purchases</h2>
                </div>
                <div className="text-muted">No pending purchases found.</div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );

    return (
        <Container style={{ width:"80vw", maxWidth:1000, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center mb-4">
                        <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                        <h2 className="mb-0" style={{ fontSize:"1.5rem" }}>Pending Purchases → Create POs</h2>
                    </div>
                </div>
                <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
                    <Form.Group style={{ minWidth: 260, maxWidth: 360 }}>
                        <Form.Label className="small fw-bold">Filter by Project / Job No.</Form.Label>
                        <Form.Control
                            value={projectFilter}
                            placeholder="MJN, MIN, project no..."
                            onChange={e => setProjectFilter(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group style={{ minWidth: 220 }}>
                        <Form.Label className="small fw-bold">Sort Pending Purchases</Form.Label>
                        <SafeSelect value={pendingSort} onChange={e => setPendingSort(e.target.value)}>
                            <option value="updatedAtDesc">Newest updated first</option>
                            <option value="updatedAtAsc">Oldest updated first</option>
                        </SafeSelect>
                    </Form.Group>
                    <Form.Group style={{ minWidth: 260, maxWidth: 360 }}>
                        <Form.Label className="small fw-bold">Pending Purchase</Form.Label>
                        <SafeSelect value={selectedPlanId} onChange={e => handlePlanChange(e.target.value)}>
                            {plans.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.planNumber || p.id} - {formatPlanUpdatedAt(p)}
                                </option>
                            ))}
                        </SafeSelect>
                    </Form.Group>
                    {projectFilter.trim() && (
                        <Button variant="outline-secondary" onClick={() => setProjectFilter("")}>
                            Clear
                        </Button>
                    )}
                    <div className="ms-auto text-muted small pb-2">
                        {filteredLines.length} of {(plan.lines || []).length} pending item(s)
                    </div>
                </div>
                <Table hover responsive>
                    <thead>
                    <tr>
                        <th>Product</th>
                        <th>Source</th>
                        <th className="text-end">Shortage</th>
                        <th>Supplier</th>
                        <th style={{width:160}}>Quotation No</th>
                        <th style={{width:120}}>Qty</th>
                        <th style={{width:130}}>Unit Price</th>
                        <th style={{width:120}}>Tax %</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredLines.map(l => {
                        const key = getLineKey(l);
                        const c = choices[key] || {};
                        const origin = getOriginLabel(l);
                        return (
                            <tr key={key}>
                                <td>
                                    <div>{l.productNameSnapshot}</div>
                                    <div className="text-muted" style={{fontSize:12}}>{l.sku}</div>
                                </td>
                                <td>
                                    <Badge bg={l.originType === 'PROJECT' || l.projectId ? 'primary' : 'secondary'}>
                                        {origin.title}
                                    </Badge>
                                    <div className="text-muted" style={{fontSize:12}}>{origin.subtitle}</div>
                                </td>
                                <td className="text-end">{l.shortageQty}</td>
                                <td>
                                    <SafeSelect value={c.supplierId || ""} onChange={e=>setChoices(s=>({ ...s, [key]: { ...c, supplierId: e.target.value } }))}>
                                        <option value="">Select supplier</option>
                                        {(l.suppliers||[]).filter(s=>s.active!==false).map(s =>
                                            <option key={s.supplierId} value={s.supplierId}>
                                                {s.supplierName}{s.lastPurchasePrice?` - ${s.lastPurchasePrice}`:""}
                                            </option>
                                        )}
                                    </SafeSelect>
                                </td>
                                <td>
                                    <Form.Control
                                        value={c.supplierId ? quotationRefs[c.supplierId] || "" : ""}
                                        placeholder="Quotation no"
                                        disabled={!c.supplierId}
                                        onChange={e => {
                                            const value = e.target.value;
                                            setQuotationRefs(prev => ({ ...prev, [c.supplierId]: value }));
                                        }}
                                    />
                                </td>
                                <td>
                                    <Form.Control type="number" min="0" value={c.qty||""}
                                                  onChange={e=>setChoices(s=>({ ...s, [key]: { ...c, qty: e.target.value } }))} />
                                </td>
                                <td>
                                    <Form.Control value={c.unitPrice||""}
                                                  onChange={e=>setChoices(s=>({ ...s, [key]: { ...c, unitPrice: e.target.value } }))} />
                                </td>
                                <td>
                                    <Form.Control value={c.taxPercent||""}
                                                  onChange={e=>setChoices(s=>({ ...s, [key]: { ...c, taxPercent: e.target.value } }))} />
                                </td>
                            </tr>
                        );
                    })}
                    {filteredLines.length === 0 && (
                        <tr>
                            <td colSpan={8} className="text-center text-muted py-4">
                                No pending items match this project filter.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </Table>

                <div className="d-flex justify-content-end gap-2">
                    <Button onClick={createPOs} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating POs...' : 'Create POs (per supplier)'}
                    </Button>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
            <CompletenessModal
                show={showCompletenessModal}
                issues={completenessIssues}
                title="Complete Supplier / Product Details"
                onClose={() => setShowCompletenessModal(false)}
                onEditIssue={openIssueEditor}
                onProceed={pendingCompletenessProceed ? () => {
                    setShowCompletenessModal(false);
                    pendingCompletenessProceed();
                } : null}
            />
            <Modal show={Boolean(editRecord)} onHide={closeIssueEditor} size="xl" centered scrollable>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editRecord?.type === 'supplier' ? 'Edit Supplier Details' : 'Edit Product Details'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editRecord?.type === 'supplier' && (
                        <SupplierForm id={editRecord.id} compact startEditing onClose={closeIssueEditor} onSaved={handleIssueEditorSaved} />
                    )}
                    {editRecord?.type === 'product' && (
                        <ProductForm id={editRecord.id} compact startEditing onClose={closeIssueEditor} onSaved={handleIssueEditorSaved} />
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
}
