import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Badge, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function IncomePage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/invoices'); // Uses the new getAllInvoices endpoint
            setInvoices(res.data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load income data");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID': return <Badge bg="success">PAID</Badge>;
            case 'PENDING': return <Badge bg="warning" text="dark">PENDING</Badge>;
            case 'PARTIALLY_PAID': return <Badge bg="info">PARTIAL</Badge>;
            case 'CANCELLED': return <Badge bg="danger">CANCELLED</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    // Filter logic
    const filteredInvoices = invoices.filter(inv => {
        const matchStatus = filterStatus === 'ALL' || inv.status === filterStatus;
        const searchLower = searchTerm.toLowerCase();
        const matchSearch = (
            (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchLower)) ||
            (inv.projectId && inv.projectId.toLowerCase().includes(searchLower))
        );
        return matchStatus && matchSearch;
    });

    // Calculate totals based on filtered view
    const totalIncome = filteredInvoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalReceived = filteredInvoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const totalPending = filteredInvoices
        .filter(i => i.status !== 'CANCELLED' && i.status !== 'PAID')
        .reduce((acc, curr) => acc + ((curr.totalAmount || 0) - (curr.paidAmount || 0)), 0);


    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">Income Management</h2>

            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="text-center shadow-sm border-0 bg-primary text-white">
                        <Card.Body>
                            <h6>Total Invoiced Value</h6>
                            <h3>{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center shadow-sm border-0 bg-success text-white">
                        <Card.Body>
                            <h6>Total Received</h6>
                            <h3>{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center shadow-sm border-0 bg-warning text-dark">
                        <Card.Body>
                            <h6>Outstanding / Pending</h6>
                            <h3>{totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3">
                    <Row className="g-2 align-items-center">
                        <Col md={4}>
                            <InputGroup>
                                <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                                <Form.Control
                                    placeholder="Search Project ID or Invoice #..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="ALL">All Statuses</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="PARTIALLY_PAID">Partially Paid</option>
                                <option value="CANCELLED">Cancelled</option>
                            </Form.Select>
                        </Col>
                        <Col className="text-end">
                            <small className="text-muted">Showing {filteredInvoices.length} invoices</small>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive striped className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4">Invoice #</th>
                                <th>Project ID</th>
                                <th>Issued Date</th>
                                <th>Due Date</th>
                                <th className="text-end">Amount</th>
                                <th className="text-end">Paid</th>
                                <th className="text-end">Balance</th>
                                <th className="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan="8" className="text-center py-4 text-muted">No invoices found.</td></tr>
                            ) : (
                                filteredInvoices.map(inv => {
                                    const balance = (inv.totalAmount || 0) - (inv.paidAmount || 0);
                                    return (
                                        <tr key={inv.id}>
                                            <td className="ps-4 fw-bold">{inv.invoiceNumber}</td>
                                            <td>{inv.projectId}</td>
                                            <td>{inv.issuedDate}</td>
                                            <td>{inv.dueDate}</td>
                                            <td className="text-end">{inv.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end text-success">{inv.paidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end fw-bold">{balance > 0 ? balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td className="text-center">{getStatusBadge(inv.status)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
}
