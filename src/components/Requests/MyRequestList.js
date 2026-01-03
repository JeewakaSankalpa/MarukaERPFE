import React, { useState, useEffect } from "react";
import { Table, Card, Badge, Spinner } from "react-bootstrap";
import api from "../../api/api";

const MyRequestList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyRequests();
    }, []);

    const fetchMyRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get("/item-requests/my");
            setRequests(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case "DRAFT": return "secondary";
            case "SUBMITTED": return "primary";
            case "PARTIALLY_FULFILLED": return "warning";
            case "PENDING_PURCHASE": return "info";
            case "FULFILLED": return "success";
            case "CANCELLED": return "danger";
            default: return "dark";
        }
    };

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-white">
                <h5 className="mb-0">My Item Requests</h5>
            </Card.Header>
            <Card.Body className="p-0">
                {loading ? (
                    <div className="text-center p-4">
                        <Spinner animation="border" />
                    </div>
                ) : (
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th>IR Number</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Requested For</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-4 text-muted">No requests found</td>
                                </tr>
                            ) : (
                                requests.map(ir => (
                                    <tr key={ir.id}>
                                        <td>{ir.irNumber}</td>
                                        <td>{new Date(ir.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <ul className="list-unstyled mb-0" style={{ fontSize: '0.9em' }}>
                                                {ir.items.map((it, idx) => (
                                                    <li key={idx}>
                                                        {it.productNameSnapshot} <Badge bg="light" text="dark">x{it.requestedQty} {it.unit}</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td>
                                            <Badge bg={getStatusVariant(ir.status)}>{ir.status.replace('_', ' ')}</Badge>
                                        </td>
                                        <td>
                                            {ir.projectId ? `Project: ${ir.projectId}` : `Dept: ${ir.departmentId}`}
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
};

export default MyRequestList;
