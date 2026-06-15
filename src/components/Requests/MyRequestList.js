import React, { useState, useEffect } from "react";
import { Table, Card, Badge, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

const MyRequestList = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyRequests();
    }, []);

    const fetchMyRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get("/item-requests/my");
            const rows = Array.isArray(res.data) ? res.data : [];
            setRequests([...rows].sort((a, b) => {
                if (a.status === "DRAFT" && b.status !== "DRAFT") return -1;
                if (a.status !== "DRAFT" && b.status === "DRAFT") return 1;
                return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
            }));
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
                                <th className="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">No requests found</td>
                                </tr>
                            ) : (
                                requests.map(ir => (
                                    <tr key={ir.id}
                                        onClick={() => ir.status === "DRAFT" && navigate(`/item/requests/${ir.id}`)}
                                        style={{ cursor: ir.status === "DRAFT" ? "pointer" : "default" }}>
                                        <td>{ir.irNumber}</td>
                                        <td>{new Date(ir.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <ul className="list-unstyled mb-0" style={{ fontSize: '0.9em' }}>
                                                {(ir.items || []).map((it, idx) => (
                                                    <li key={idx}>
                                                        {it.productNameSnapshot} <Badge bg="light" text="dark">x{it.requestedQty} {it.unit}</Badge>
                                                    </li>
                                                ))}
                                                {ir.status === "DRAFT" && <li className="text-primary mt-1">Open draft</li>}
                                            </ul>
                                        </td>
                                        <td>
                                            <Badge bg={getStatusVariant(ir.status)}>{ir.status.replace('_', ' ')}</Badge>
                                        </td>
                                        <td>
                                            {ir.projectId ? `Project: ${ir.projectId}` : `Dept: ${ir.departmentId}`}
                                        </td>
                                        <td className="text-end">
                                            {ir.status === "DRAFT" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        navigate(`/item/requests/${ir.id}`);
                                                    }}
                                                >
                                                    Continue Draft
                                                </Button>
                                            )}
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
