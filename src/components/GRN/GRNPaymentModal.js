import React, { useState } from "react";
import { Modal, Table, Row, Col, Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../api/api";

const addPayment = async (id, payload) => (await api.post(`/grns/${id}/payments`, payload)).data;

export default function GRNPaymentModal({ grn, onClose }) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [ref, setRef] = useState("");

    const doPay = async () => {
        if (!amount || Number(amount) <= 0) { toast.warn("Enter valid amount"); return; }
        try {
            await addPayment(grn.id, { amount: Number(amount), date, reference: ref });
            toast.success("Payment added");
            onClose();
        } catch (e) { toast.error("Failed to add payment"); }
    };

    const history = grn.paymentHistory || [];

    return (
        <Modal show={true} onHide={onClose} size="lg">
            <Modal.Header closeButton><Modal.Title>Payments for {grn.grnNumber}</Modal.Title></Modal.Header>
            <Modal.Body>
                <div className="mb-4">
                    <h5>Payment History</h5>
                    {history.length === 0 ? <div className="text-muted">No payments recorded.</div> :
                        <Table size="sm" bordered>
                            <thead><tr><th>Date</th><th>Ref</th><th className="text-end">Amount</th><th>Added By</th></tr></thead>
                            <tbody>
                                {history.map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.paymentDate}</td>
                                        <td>{p.reference}</td>
                                        <td className="text-end">{p.amount?.toFixed(2)}</td>
                                        <td>{p.addedBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    }
                    <div className="d-flex justify-content-end gap-3 mt-2 fw-bold">
                        <span>Total Paid: {grn.totalPaid?.toFixed(2)}</span>
                        <span>Invoice: {grn.invoiceAmount?.toFixed(2)}</span>
                        <span className={grn.invoiceAmount > grn.totalPaid ? "text-danger" : "text-success"}>
                            Balance: {(grn.invoiceAmount - grn.totalPaid)?.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="border-top pt-3">
                    <h5>Add New Payment</h5>
                    <Row className="g-2 align-items-end">
                        <Col md={3}>
                            <Form.Label>Date</Form.Label>
                            <Form.Control type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </Col>
                        <Col md={3}>
                            <Form.Label>Amount</Form.Label>
                            <Form.Control type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                        </Col>
                        <Col md={4}>
                            <Form.Label>Reference / Check No</Form.Label>
                            <Form.Control value={ref} onChange={e => setRef(e.target.value)} />
                        </Col>
                        <Col md={2}>
                            <Button className="w-100" onClick={doPay}>Add</Button>
                        </Col>
                    </Row>
                </div>
            </Modal.Body>
        </Modal>
    );
}
