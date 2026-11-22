import React, { useEffect, useState } from "react";
import { Card, Table, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function PayablesWidget() {
    const [payables, setPayables] = useState([]);
    const [status, setStatus] = useState("loading");
    const navigate = useNavigate();

    const loadPayables = () => {
        setStatus("loading");
        api.get("/reports/payables").then(res => {
            // Sort by due date and take top 5
            const sorted = (res.data || []).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            setPayables(sorted.slice(0, 5));
            setStatus("ready");
        }).catch(() => {
            setPayables([]);
            setStatus("error");
        });
    };

    useEffect(() => { loadPayables(); }, []);

    const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return (
        <Card className="h-100 shadow-sm dashboard-widget-card dashboard-payables-card">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3 dashboard-card-header">
                <div>
                    <h5 className="mb-1 text-primary">Upcoming Payables</h5>
                    <p className="mb-0 small text-muted">Next supplier balances by due date</p>
                </div>
                <Button variant="link" size="sm" onClick={() => navigate("/reports/payables")}>View All</Button>
            </Card.Header>
            <Card.Body className="p-0">
                {status === "loading" ? (
                    <div className="dashboard-widget-state" role="status"><Spinner animation="border" size="sm" /> Loading payables…</div>
                ) : status === "error" ? (
                    <div className="dashboard-widget-state dashboard-widget-state-error" role="alert">
                        <span>Payables could not be loaded.</span>
                        <Button variant="outline-primary" size="sm" onClick={loadPayables}>Try again</Button>
                    </div>
                ) : (
                <Table hover className="mb-0 dashboard-compact-table dashboard-payables-table">
                    <thead className="bg-light">
                        <tr>
                            <th>Supplier</th>
                            <th>Due Date</th>
                            <th className="text-end">Balance (LKR)</th>
                            <th className="text-end">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payables.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-4 text-muted">No pending payables</td></tr>
                        ) : (
                            payables.map((p, i) => (
                                <tr key={i}>
                                    <td data-label="Supplier" className="fw-semibold">{p.supplierName || "Unnamed supplier"}</td>
                                    <td data-label="Due Date" className={new Date(p.dueDate) < new Date() ? "text-danger fw-bold" : ""}>
                                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}
                                    </td>
                                    <td data-label="Balance (LKR)" className="text-end fw-bold">{formatAmount(p.balance)}</td>
                                    <td data-label="Action" className="text-end">
                                        <Button variant="outline-primary" size="sm" onClick={() => navigate("/reports/payables")}>Review</Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
                )}
            </Card.Body>
        </Card>
    );
}
