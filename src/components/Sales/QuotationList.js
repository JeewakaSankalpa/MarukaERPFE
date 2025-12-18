import React, { useEffect, useState } from "react";
import { Container, Table, Button, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function QuotationList() {
    const [quotes, setQuotes] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/quotations").then(res => setQuotes(res.data)).catch(console.error);
    }, []);

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Sales Quotations</h3>
                <Button onClick={() => navigate("/sales/quotations/new")}>+ New Quotation</Button>
            </div>

            <div className="bg-white rounded shadow p-3">
                <Table hover responsive>
                    <thead>
                        <tr>
                            <th>Quote #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Subject</th>
                            <th>Status</th>
                            <th className="text-end">Total</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.map(q => (
                            <tr key={q.id}>
                                <td><Link to={`/sales/quotations/${q.id}`}>{q.quotationNumber}</Link></td>
                                <td>{q.issuedDate}</td>
                                <td>
                                    <div>{q.customerName}</div>
                                    <small className="text-muted">{q.customerEmail}</small>
                                </td>
                                <td>{q.subject}</td>
                                <td>
                                    <Badge bg={
                                        q.status === 'DRAFT' ? 'secondary' :
                                            q.status === 'SENT' ? 'info' :
                                                q.status === 'ACCEPTED' ? 'success' :
                                                    q.status === 'CONVERTED' ? 'primary' : 'danger'
                                    }>{q.status}</Badge>
                                </td>
                                <td className="text-end">{(q.computedGrandTotal || 0).toLocaleString()}</td>
                                <td>
                                    <Link to={`/sales/quotations/${q.id}`} className="btn btn-sm btn-outline-primary me-1">View</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
}
