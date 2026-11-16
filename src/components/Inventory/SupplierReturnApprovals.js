import { ArrowLeft, CheckCircle2, Clock3, PackageCheck, Search, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import api from '../../api/api';
import { Table, Button, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';
import { confirmAction } from '../../utils/brandedDialogs';
import './SupplierReturnApprovals.css';

const returnQuantity = item => Number(item?.quantityDecimal ?? item?.quantity ?? 0);
const settledQuantity = item => Number(item?.quantitySettledDecimal ?? item?.quantitySettled ?? 0);
const formatQuantity = value => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 3 }).format(Number(value || 0));
const formatMoney = value => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(Number(value || 0));
const formatDate = value => value ? new Date(value).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const statusDetails = {
    PENDING: { label: 'Pending approval', shortLabel: 'Pending', icon: Clock3, description: 'Review returns before stock is deducted.' },
    APPROVED: { label: 'Approved & settled', shortLabel: 'Approved', icon: CheckCircle2, description: 'Review approved returns and supplier settlements.' },
    REJECTED: { label: 'Rejected history', shortLabel: 'Rejected', icon: XCircle, description: 'Review returns that were not approved.' },
};

const SupplierReturnApprovals = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [settlementData, setSettlementData] = useState({ type: 'REPLACEMENT', quantitySettled: '', amountSettled: '', referenceId: '', notes: '' });
    const [submittingSettlement, setSubmittingSettlement] = useState(false);

    const fetchReturns = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/inventory/returns/supplier?status=${statusFilter}&size=100`);
            setReturns(response.data?.content || response.data || []);
        } catch (err) {
            console.error('Error fetching supplier returns:', err);
            toast.error('Failed to load supplier returns.');
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetchReturns(); }, [fetchReturns]);

    const handleApprove = async (ret) => {
        if (!await confirmAction({ title: 'Approve supplier return', message: `Approve this return?\nThis will deduct ${returnQuantity(ret)} units from batch ${ret.batchNo}.`, confirmLabel: 'Approve return', tone: 'warning' })) return;
        setProcessingId(ret.id);
        try { await api.post(`/inventory/returns/supplier/${ret.id}/approve`); toast.success('Supplier return approved. Stock has been deducted.'); fetchReturns(); }
        catch (err) { console.error(err); toast.error(err.response?.data?.message || 'Failed to approve return.'); }
        finally { setProcessingId(null); }
    };

    const handleReject = async (ret) => {
        setProcessingId(ret.id);
        try { await api.post(`/inventory/returns/supplier/${ret.id}/reject`); toast.success('Supplier return rejected.'); fetchReturns(); }
        catch (err) { console.error(err); toast.error(err.response?.data?.message || 'Failed to reject return.'); }
        finally { setProcessingId(null); }
    };

    const openSettlementModal = (ret) => {
        setSelectedReturn(ret);
        const alreadySettled = (ret.settlements || []).reduce((acc, settlement) => acc + settledQuantity(settlement), 0);
        const remainingToSettle = returnQuantity(ret) - alreadySettled;
        setSettlementData({ type: 'REPLACEMENT', quantitySettled: remainingToSettle, amountSettled: remainingToSettle * (ret.unitCost || 0), referenceId: '', notes: '' });
        setShowSettlementModal(true);
    };

    const handleSettlementChange = (field, value) => setSettlementData(previous => {
        const updated = { ...previous, [field]: value };
        if (field === 'quantitySettled' && selectedReturn) updated.amountSettled = Number(value) * (selectedReturn.unitCost || 0);
        return updated;
    });

    const submitSettlement = async (event) => {
        event.preventDefault(); setSubmittingSettlement(true);
        try {
            const payload = { type: settlementData.type, quantitySettled: Math.trunc(Number(settlementData.quantitySettled)), quantitySettledDecimal: String(settlementData.quantitySettled), amountSettled: Number(settlementData.amountSettled), referenceId: settlementData.referenceId, notes: settlementData.notes };
            await api.post(`/inventory/returns/supplier/${selectedReturn.id}/settle`, payload);
            toast.success('Settlement recorded successfully!'); setShowSettlementModal(false); fetchReturns();
        } catch (err) { console.error(err); toast.error(err.response?.data?.message || 'Failed to record settlement.'); }
        finally { setSubmittingSettlement(false); }
    };

    const visibleReturns = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return returns;
        return returns.filter(ret => [ret.returnNumber, ret.id, ret.supplierNameSnapshot, ret.supplierName, ret.supplierId, ret.productName, ret.productId, ret.batchNumber, ret.batchNo, ret.reason].some(value => String(value || '').toLowerCase().includes(query)));
    }, [returns, searchTerm]);
    const activeStatus = statusDetails[statusFilter];

    return <main className="supplier-returns-page">
        <section className="supplier-returns-header" aria-labelledby="supplier-returns-title"><div className="supplier-returns-heading"><button type="button" className="supplier-returns-back" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={19} /></button><div><span className="supplier-returns-eyebrow">Inventory · supplier returns</span><h1 id="supplier-returns-title">Supplier return approvals</h1><p>Review return quantities, costs, decisions, and supplier settlement progress.</p></div></div><div className="supplier-returns-count" aria-live="polite"><strong>{visibleReturns.length}</strong><span>{activeStatus.shortLabel.toLowerCase()} {visibleReturns.length === 1 ? 'return' : 'returns'}</span></div></section>
        <section className="supplier-returns-workspace" aria-label="Supplier return review workspace">
            <div className="supplier-returns-tabs" role="tablist" aria-label="Return status">{Object.entries(statusDetails).map(([status, details]) => { const Icon = details.icon; return <button key={status} type="button" role="tab" aria-selected={statusFilter === status} className={statusFilter === status ? 'is-active' : ''} onClick={() => { setStatusFilter(status); setSearchTerm(''); }}><Icon size={17} /><span>{details.label}</span></button>; })}</div>
            <div className="supplier-returns-toolbar"><div><h2>{activeStatus.label}</h2><p>{activeStatus.description}</p></div><label className="supplier-returns-search"><Search size={17} aria-hidden="true" /><span className="visually-hidden">Search supplier returns</span><input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search return, supplier, item, batch…" /></label></div>
            {loading ? <div className="supplier-returns-loading" role="status"><Spinner animation="border" size="sm" /><span>Loading {activeStatus.shortLabel.toLowerCase()} returns…</span></div> : <ReturnTable returns={visibleReturns} statusFilter={statusFilter} searchTerm={searchTerm} activeStatus={activeStatus} processingId={processingId} onApprove={handleApprove} onReject={handleReject} onSettlement={openSettlementModal} />}
        </section>
        <SettlementModal show={showSettlementModal} onHide={() => setShowSettlementModal(false)} selectedReturn={selectedReturn} settlementData={settlementData} submitting={submittingSettlement} onChange={handleSettlementChange} onSubmit={submitSettlement} />
        <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
    </main>;
};

const ReturnTable = ({ returns, statusFilter, searchTerm, activeStatus, processingId, onApprove, onReject, onSettlement }) => <div className="supplier-returns-table-scroll" tabIndex="0" aria-label={`${activeStatus.label} table. Scroll horizontally to view all columns.`}><Table className={`supplier-returns-table supplier-returns-table-${statusFilter.toLowerCase()}`}><thead><tr><th>Return</th><th>Supplier</th><th>Item & batch</th><th>Quantity & value</th>{statusFilter === 'APPROVED' && <th>Settlement</th>}<th>Reason</th><th>Status</th>{statusFilter !== 'REJECTED' && <th>Actions</th>}</tr></thead><tbody>{returns.length === 0 ? <tr className="supplier-returns-empty"><td colSpan={statusFilter === 'REJECTED' ? 7 : 8}><PackageCheck size={24} /><strong>{searchTerm ? 'No matching returns' : `No ${activeStatus.shortLabel.toLowerCase()} returns`}</strong><span>{searchTerm ? 'Try a return reference, supplier, item, or batch.' : 'This queue is currently clear.'}</span></td></tr> : returns.map(ret => {
    const alreadySettled = (ret.settlements || []).reduce((acc, settlement) => acc + settledQuantity(settlement), 0); const isFullySettled = alreadySettled >= returnQuantity(ret); const totalValue = returnQuantity(ret) * Number(ret.unitCost || 0);
    return <tr key={ret.id}><td data-label="Return"><strong className="supplier-returns-reference">{ret.returnNumber || ret.id}</strong><span>{formatDate(ret.createdAt)}</span></td><td data-label="Supplier"><strong>{ret.supplierNameSnapshot || ret.supplierName || ret.supplierId}</strong></td><td data-label="Item & batch"><strong>{ret.productName || ret.productId}</strong><span>Batch {ret.batchNumber || ret.batchNo || '—'}</span></td><td data-label="Quantity & value" className="supplier-returns-numeric"><strong>{formatQuantity(returnQuantity(ret))}</strong><span>{ret.unitCost > 0 ? `${formatMoney(ret.unitCost)} each · ${formatMoney(totalValue)} total` : 'Unit cost unavailable'}</span></td>{statusFilter === 'APPROVED' && <td data-label="Settlement"><span className={`supplier-returns-status status-${String(ret.settlementStatus || 'PENDING').toLowerCase()}`}>{String(ret.settlementStatus || 'PENDING').replaceAll('_', ' ')}</span><span>{formatQuantity(alreadySettled)} of {formatQuantity(returnQuantity(ret))} settled</span></td>}<td data-label="Reason" className="supplier-returns-reason">{ret.reason || 'No reason provided'}</td><td data-label="Status"><span className={`supplier-returns-status status-${String(ret.status).toLowerCase()}`}>{String(ret.status).replaceAll('_', ' ')}</span></td>{statusFilter === 'PENDING' && <td data-label="Actions"><div className="supplier-returns-actions"><Button variant="success" size="sm" onClick={() => onApprove(ret)} disabled={processingId === ret.id}>{processingId === ret.id ? 'Working…' : 'Approve'}</Button><Button variant="outline-danger" size="sm" onClick={() => onReject(ret)} disabled={processingId === ret.id}>{processingId === ret.id ? 'Working…' : 'Reject'}</Button></div></td>}{statusFilter === 'APPROVED' && <td data-label="Actions"><Button variant={isFullySettled ? 'outline-secondary' : 'primary'} size="sm" onClick={() => onSettlement(ret)}>{isFullySettled ? 'View settlements' : 'Record settlement'}</Button></td>}</tr>;
})}</tbody></Table></div>;

const SettlementModal = ({ show, onHide, selectedReturn, settlementData, submitting, onChange, onSubmit }) => {
    const totalSettled = selectedReturn ? (selectedReturn.settlements || []).reduce((acc, settlement) => acc + settledQuantity(settlement), 0) : 0;
    const hasBalance = selectedReturn && totalSettled < returnQuantity(selectedReturn);
    return <Modal show={show} onHide={onHide} size="lg" className="supplier-settlement-modal" centered><Form onSubmit={onSubmit}><Modal.Header closeButton><div><span className="supplier-returns-eyebrow">Supplier settlement</span><Modal.Title>{hasBalance ? 'Record supplier settlement' : 'Settlement history'}</Modal.Title></div></Modal.Header><Modal.Body>{selectedReturn && <><section className="supplier-settlement-summary" aria-label="Return summary"><div><span>Product</span><strong>{selectedReturn.productName}</strong></div><div><span>Returned</span><strong>{formatQuantity(returnQuantity(selectedReturn))}</strong></div><div><span>Unit cost</span><strong>{formatMoney(selectedReturn.unitCost)}</strong></div></section><section className="supplier-settlement-history"><h3>Past settlements</h3>{(selectedReturn.settlements || []).length === 0 ? <p>No settlements recorded yet.</p> : <div className="supplier-settlement-table-scroll" tabIndex="0"><Table size="sm"><thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Amount</th><th>Reference / notes</th></tr></thead><tbody>{selectedReturn.settlements.map((settlement, index) => <tr key={index}><td>{formatDate(settlement.createdAt)}</td><td>{settlement.type}</td><td>{formatQuantity(settledQuantity(settlement))}</td><td>{formatMoney(settlement.amountSettled)}</td><td><strong>{settlement.referenceId || '—'}</strong><span>{settlement.notes}</span></td></tr>)}</tbody></Table></div>}</section>{hasBalance && <section className="supplier-settlement-entry"><h3>New settlement entry</h3><Row className="g-3"><Col md={4}><Form.Group><Form.Label>Settlement type</Form.Label><Form.Select value={settlementData.type} onChange={event => onChange('type', event.target.value)}><option value="REPLACEMENT">Replacement items</option><option value="REFUND">Cash/bank refund</option><option value="CREDIT_NOTE">Credit note</option></Form.Select></Form.Group></Col><Col md={4}><Form.Group><Form.Label>Quantity settling</Form.Label><Form.Control type="number" min="1" max={returnQuantity(selectedReturn) - totalSettled} step="0.01" value={settlementData.quantitySettled} onChange={event => onChange('quantitySettled', event.target.value)} required /></Form.Group></Col><Col md={4}><Form.Group><Form.Label>Total amount (LKR)</Form.Label><Form.Control type="number" value={settlementData.amountSettled} onChange={event => onChange('amountSettled', event.target.value)} required /></Form.Group></Col><Col xs={12}>{settlementData.type === 'REFUND' ? <PaymentAccountPicker required value={settlementData.referenceId} onChange={account => { onChange('referenceId', account.paymentAccountId); if (account.paymentMethod) onChange('notes', `Refund to ${account.paymentAccountName} via ${account.paymentMethod}`); }} /> : <Form.Group><Form.Label>Reference</Form.Label><Form.Control type="text" value={settlementData.referenceId} onChange={event => onChange('referenceId', event.target.value)} placeholder={settlementData.type === 'CREDIT_NOTE' ? 'Credit note number' : 'Reference ID'} /></Form.Group>}</Col><Col xs={12}><Form.Group><Form.Label>Notes</Form.Label><Form.Control type="text" value={settlementData.notes} onChange={event => onChange('notes', event.target.value)} placeholder="Additional settlement remarks" /></Form.Group></Col></Row>{settlementData.type === 'REPLACEMENT' && <p className="supplier-settlement-note">Recording a replacement automatically creates a draft GRN. Verify and post it from the standard GRN screen to update inventory.</p>}</section>}</>}</Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={onHide}>Close</Button>{hasBalance && <Button variant="primary" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Record settlement'}</Button>}</Modal.Footer></Form></Modal>;
};

export default SupplierReturnApprovals;
