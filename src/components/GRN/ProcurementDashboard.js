import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
    FaClipboardList, FaExclamationCircle, FaFileInvoiceDollar, FaTruckLoading,
    FaArrowRight, FaCalendarCheck, FaCartPlus
} from "react-icons/fa";
import api from "../../api/api";

const StatCard = ({ title, value, icon, color, subtext, onClick }) => (
    <Card className={`h-100 shadow-sm border-0 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
        <Card.Body className="d-flex align-items-center justify-content-between">
            <div>
                <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>{title}</h6>
                <h2 className="mb-0 fw-bold">{value}</h2>
                {subtext && <small className="text-muted">{subtext}</small>}
            </div>
            <div className={`p-3 rounded-circle bg-${color} bg-opacity-10 text-${color}`}>
                {icon}
            </div>
        </Card.Body>
    </Card>
);

const ProcurementDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/procurement/dashboard-stats');
            setStats(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load procurement stats", err);
            setError("Failed to load dashboard data");
            setLoading(false);
        }
    };

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <Spinner animation="border" variant="primary" />
        </Container>
    );

    return (
        <Container className="py-4" style={{ maxWidth: 1400 }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Procurement Dashboard</h2>
                    <p className="text-muted mb-0">Overview of requests, shortages, and orders</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="primary" onClick={() => navigate('/pos/create')} className="d-flex align-items-center gap-2">
                        <FaCartPlus /> New Purchase Order
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <Row className="g-3 mb-4">
                <Col md={3}>
                    <StatCard
                        title="Pending Requests"
                        value={stats?.pendingRequestsCount || 0}
                        icon={<FaClipboardList size={24} />}
                        color="warning"
                        subtext="Open Item Requests"
                        onClick={() => navigate('/stores/fulfil-requests')}
                    />
                </Col>
                <Col md={3}>
                    <StatCard
                        title="Items in Shortage"
                        value={stats?.itemsInShortageCount || 0}
                        icon={<FaExclamationCircle size={24} />}
                        color="danger"
                        subtext="Requiring Purchase Plan"
                        onClick={() => navigate('/stores/planning')}
                    />
                </Col>
                <Col md={3}>
                    <StatCard
                        title="Active POs"
                        value={stats?.activePOsCount || 0}
                        icon={<FaFileInvoiceDollar size={24} />}
                        color="primary"
                        subtext={`Value: Rs. ${(stats?.totalPendingPOValue || 0).toLocaleString()}`}
                        onClick={() => navigate('/pos')}
                    />
                </Col>
                <Col md={3}>
                    <StatCard
                        title="Pending GRNs"
                        value={stats?.pendingGRNsCount || 0}
                        icon={<FaTruckLoading size={24} />}
                        color="info"
                        subtext="Waiting for Delivery"
                        onClick={() => navigate('/grn')}
                    />
                </Col>
            </Row>

            <Row className="g-4">
                {/* Critical Shortages */}
                <Col lg={6}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white border-bottom-0 py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Critical Shortages</h5>
                            <Button variant="link" size="sm" onClick={() => navigate('/stores/planning')}>Plan All</Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {(!stats?.criticalShortages || stats.criticalShortages.length === 0) ? (
                                <div className="text-center py-5 text-muted">No critical shortages.</div>
                            ) : (
                                <Table hover responsive className="mb-0 align-middle">
                                    <thead className="bg-light text-muted">
                                        <tr>
                                            <th className="ps-4">Product</th>
                                            <th className="text-end pe-4">Shortage Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.criticalShortages.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="ps-4 fw-medium">{item.productName || item.productId}</td>
                                                <td className="text-end pe-4 fw-bold text-danger">{item.shortageQty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Pending Deliveries */}
                <Col lg={6}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white border-bottom-0 py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Expected Deliveries</h5>
                            <Button variant="link" size="sm" onClick={() => navigate('/pos')}>View All POs</Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {(!stats?.pendingDeliveries || stats.pendingDeliveries.length === 0) ? (
                                <div className="text-center py-5 text-muted">No pending deliveries.</div>
                            ) : (
                                <Table hover responsive className="mb-0 align-middle">
                                    <thead className="bg-light text-muted">
                                        <tr>
                                            <th className="ps-4">PO #</th>
                                            <th>Supplier</th>
                                            <th>Expected</th>
                                            <th className="text-end pe-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.pendingDeliveries.map((po, idx) => (
                                            <tr key={idx}>
                                                <td className="ps-4 fw-medium text-primary">{po.poNumber}</td>
                                                <td>{po.supplierName}</td>
                                                <td>{po.expectedDate}</td>
                                                <td className="text-end pe-4">
                                                    <Badge bg={po.status === 'ORDERED' ? 'warning' : 'info'}>{po.status}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Process Flow Hint (Optional Improvement) */}
            <Row className="mt-4">
                <Col>
                    <Alert variant="secondary" className="border-0 bg-light">
                        <div className="d-flex align-items-center gap-2">
                            <FaExclamationCircle className="text-muted" />
                            <strong>Procurement Process Hint:</strong>
                            <span className="text-muted">
                                1. Review <span className="text-decoration-underline cursor-pointer" onClick={() => navigate('/stores/fulfil-requests')}>Requests</span> & identify shortages.
                                2. Plan items in <span className="text-decoration-underline cursor-pointer" onClick={() => navigate('/stores/planning')}>Stores Planning</span>.
                                3. Create POs from <span className="text-decoration-underline cursor-pointer" onClick={() => navigate('/stores/pending-to-po')}>Pending List</span>.
                                4. Receive goods via <span className="text-decoration-underline cursor-pointer" onClick={() => navigate('/grn')}>GRN</span>.
                            </span>
                        </div>
                    </Alert>
                </Col>
            </Row>
        </Container>
    );
};

export default ProcurementDashboard;
