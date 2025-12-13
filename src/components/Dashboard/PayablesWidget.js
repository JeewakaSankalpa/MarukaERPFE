import React, { useEffect, useState } from "react";
import { Card, Table, Badge, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function PayablesWidget() {
    const [payables, setPayables] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/reports/payables").then(res => {
            // Sort by due date and take top 5
            const sorted = (res.data || []).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            setPayables(sorted.slice(0, 5));
        }).catch(() => { });
    }, []);

    return (
        <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 text-primary">Upcoming Payables</h5>
                <Button variant="link" size="sm" onClick={() => navigate("/reports")}>View All</Button>
            </Card.Header>
            <Card.Body className="p-0">
                <Table hover responsive className="mb-0" style={{ fontSize: "0.9rem" }}>
                    <thead className="bg-light">
                        <tr>
                            <th>Supplier</th>
                            <th>Due Date</th>
                            <th className="text-end">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payables.length === 0 ? (
                            <tr><td colSpan="3" className="text-center py-4 text-muted">No pending payables</td></tr>
                        ) : (
                            payables.map((p, i) => (
                                <tr key={i}>
                                    <td>{p.supplierName}</td>
                                    <td className={new Date(p.dueDate) < new Date() ? "text-danger fw-bold" : ""}>
                                        {p.dueDate}
                                    </td>
                                    <td className="text-end fw-bold">{p.balance?.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
}
