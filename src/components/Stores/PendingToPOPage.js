import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from "react";
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
const getLatestPending = async () => (await api.get(`/stores/pending-purchase/latest`)).data; // implement endpoint to return latest plan
const createPOsFromPending = async (pendingId, allocation) =>
    (await api.post(`/stores/pending-to-po/${pendingId}`, allocation)).data;
const getSupplier = async (id) => (await api.get(`/suppliers/${id}`)).data;
const getProduct = async (id) => (await api.get(`/products/${id}`)).data;

/* ========== PAGE ========== */
export default function PendingToPOPage() {
    const navigate = useNavigate();
    const [plan, setPlan] = useState(null); // {id, lines:[{productId, productNameSnapshot, shortageQty, suppliers:[...] }]}
    const [choices, setChoices] = useState({}); // productId -> { supplierId, qty, unitPrice, taxPercent }
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completenessIssues, setCompletenessIssues] = useState([]);
    const [showCompletenessModal, setShowCompletenessModal] = useState(false);
    const [pendingCompletenessProceed, setPendingCompletenessProceed] = useState(null);
    const [editRecord, setEditRecord] = useState(null);

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

    const openCompletenessModal = (issues, proceed = null) => {
        setCompletenessIssues(issues);
        setPendingCompletenessProceed(() => proceed);
        setShowCompletenessModal(true);
    };

    const runCompletenessChecks = async () => {
        const selectedSupplierIds = [...new Set(Object.values(choices).map(c => c?.supplierId).filter(Boolean))];
        const selectedProductIds = Object.entries(choices)
            .filter(([, c]) => c?.supplierId && Number(c.qty) > 0)
            .map(([productId]) => productId);

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

    const performCreatePOs = async () => {
        if (isSubmitting) return;
        try {
            if (!plan?.id) return;
            if (Object.keys(groupedAllocation).length === 0) { toast.info("No supplier allocation selected"); return; }
            setIsSubmitting(true);
            const res = await createPOsFromPending(plan.id, groupedAllocation);
            toast.success(`Created ${res.length} PO(s)`);
            // refresh
            const p = await getLatestPending();
            setPlan(p);
            setChoices(Object.fromEntries((p?.lines||[]).map(l => [l.productId, { supplierId:"", qty:l.shortageQty, unitPrice:"", taxPercent:"" }])));
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

    if (!plan) return (
        <Container style={{ width:"80vw", maxWidth:1000, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">Loading…</div>
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
                                    <SafeSelect value={c.supplierId || ""} onChange={e=>setChoices(s=>({ ...s, [l.productId]: { ...c, supplierId: e.target.value } }))}>
                                        <option value="">Select supplier</option>
                                        {(l.suppliers||[]).filter(s=>s.active!==false).map(s =>
                                            <option key={s.supplierId} value={s.supplierId}>
                                                {s.supplierName}{s.lastPurchasePrice?` - ${s.lastPurchasePrice}`:""}
                                            </option>
                                        )}
                                    </SafeSelect>
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
                        <SupplierForm id={editRecord.id} compact startEditing onClose={closeIssueEditor} onSaved={closeIssueEditor} />
                    )}
                    {editRecord?.type === 'product' && (
                        <ProductForm id={editRecord.id} compact startEditing onClose={closeIssueEditor} onSaved={closeIssueEditor} />
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
}
