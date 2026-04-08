import React, { useState, useEffect } from "react";
import { Modal, Table, Row, Col, Form, Button, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../api/api";
import PaymentAccountPicker from "../ReusableComponents/PaymentAccountPicker";
import OverdraftConfirmModal from "../ReusableComponents/OverdraftConfirmModal";

const addPayment = async (id, payload) => (await api.post(`/grns/${id}/payments`, payload)).data;

export default function GRNPaymentModal({ grn, onClose }) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [ref, setRef] = useState("");
    const [paymentInfo, setPaymentInfo] = useState({ paymentAccountId: '', paymentAccountName: '', paymentAccountType: '', paymentMethod: '' });
    const [accountBalance, setAccountBalance] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOverdraft, setShowOverdraft] = useState(false);

    // Max payable = invoice amount minus what's already been paid
    const totalPaid = grn.totalPaid || 0;
    const invoiceAmount = grn.invoiceAmount || 0;
    const maxPayable = Math.max(0, invoiceAmount - totalPaid);

    // Load account balance when account is selected
    useEffect(() => {
        if (paymentInfo.paymentAccountId) {
            api.get(`/finance/accounts/${paymentInfo.paymentAccountId}`)
                .then(res => setAccountBalance(Number(res.data.balance) || 0))
                .catch(() => setAccountBalance(null));
        } else {
            setAccountBalance(null);
        }
    }, [paymentInfo.paymentAccountId]);

    const handleAmountChange = (val) => {
        const num = Number(val);
        if (num > maxPayable) {
            toast.warn(`Amount cannot exceed the remaining balance due: Rs. ${maxPayable.toFixed(2)}`);
            setAmount(maxPayable.toString());
        } else {
            setAmount(val);
        }
    };

    const submitPayment = async (allowOverdraft = false) => {
        setIsSubmitting(true);
        try {
            await addPayment(grn.id, {
                amount: Number(amount),
                date,
                reference: ref,
                paymentAccountId: paymentInfo.paymentAccountId,
                paymentAccountName: paymentInfo.paymentAccountName,
                paymentAccountType: paymentInfo.paymentAccountType,
                paymentMethod: paymentInfo.paymentMethod,
                allowOverdraft
            });
            toast.success("Payment added");
            onClose();
        } catch (e) {
            toast.error("Failed to add payment");
            setIsSubmitting(false);
        }
    };

    const doPay = async () => {
        if (!amount || Number(amount) <= 0) { toast.warn("Enter valid amount"); return; }
        if (Number(amount) > maxPayable) { toast.error(`Cannot exceed remaining balance due: Rs. ${maxPayable.toFixed(2)}`); return; }
        if (!paymentInfo.paymentAccountId) { toast.warn("Please select a payment account"); return; }
        if (!paymentInfo.paymentMethod) { toast.warn("Please explicitly select a Payment Method (e.g. Card, Cash)"); return; }

        // Check if amount exceeds account balance → prompt overdraft
        if (accountBalance !== null && Number(amount) > accountBalance) {
            setShowOverdraft(true);
            return;
        }
        await submitPayment(false);
    };

    const history = grn.paymentHistory || [];

    return (
        <>
            <Modal show={true} onHide={onClose} size="lg">
                <Modal.Header closeButton><Modal.Title>Payments for {grn.grnNumber}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className="mb-4">
                        <h5>Payment History</h5>
                        {history.length === 0 ? <div className="text-muted">No payments recorded.</div> :
                            <Table size="sm" bordered>
                                <thead><tr><th>Date</th><th>Ref</th><th className="text-end">Amount</th><th>Method</th><th>Added By</th></tr></thead>
                                <tbody>
                                    {history.map((p, i) => (
                                        <tr key={i}>
                                            <td>{p.paymentDate}</td>
                                            <td>{p.reference}</td>
                                            <td className="text-end">{p.amount?.toFixed(2)}</td>
                                            <td>{p.paymentMethod || '—'}</td>
                                            <td>{p.addedBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        }
                        <div className="d-flex justify-content-end gap-3 mt-2 fw-bold">
                            <span>Total Paid: {totalPaid?.toFixed(2)}</span>
                            <span>Invoice: {invoiceAmount?.toFixed(2)}</span>
                            <span className={maxPayable > 0 ? "text-danger" : "text-success"}>
                                Remaining: {maxPayable.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="border-top pt-3">
                        <h5>Add New Payment</h5>
                        {maxPayable <= 0 && (
                            <Alert variant="success">✅ This GRN is fully paid.</Alert>
                        )}
                        {maxPayable > 0 && (
                            <>
                                <div className="mb-3">
                                    <PaymentAccountPicker
                                        required={true}
                                        value={paymentInfo.paymentAccountId}
                                        onChange={(details) => setPaymentInfo(details)}
                                    />
                                    {accountBalance !== null && (
                                        <small className={`mt-1 d-block ${accountBalance < Number(amount || 0) ? 'text-danger fw-bold' : 'text-muted'}`}>
                                            Account balance: Rs. {accountBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                            {accountBalance < Number(amount || 0) && ' ⚠️ Insufficient — overdraft will apply'}
                                        </small>
                                    )}
                                </div>
                                <Row className="g-2 align-items-end">
                                    <Col md={3}>
                                        <Form.Label>Date</Form.Label>
                                        <Form.Control type="date" value={date} onChange={e => setDate(e.target.value)} />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Label>Amount <small className="text-muted">(max: {maxPayable.toFixed(2)})</small></Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={amount}
                                            max={maxPayable}
                                            onChange={e => handleAmountChange(e.target.value)}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label>Reference / Check No</Form.Label>
                                        <Form.Control value={ref} onChange={e => setRef(e.target.value)} />
                                    </Col>
                                    <Col md={2}>
                                        <Button className="w-100" onClick={doPay} disabled={isSubmitting || maxPayable <= 0}>
                                            {isSubmitting ? "Adding..." : "Add"}
                                        </Button>
                                    </Col>
                                </Row>
                            </>
                        )}
                    </div>
                </Modal.Body>
            </Modal>

            <OverdraftConfirmModal
                show={showOverdraft}
                amount={amount}
                balance={accountBalance}
                accountName={paymentInfo.paymentAccountName}
                onConfirm={() => { setShowOverdraft(false); submitPayment(true); }}
                onCancel={() => setShowOverdraft(false)}
            />
        </>
    );
}
