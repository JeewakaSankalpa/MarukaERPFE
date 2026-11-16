import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaClipboardList, FaExclamationCircle, FaFileInvoiceDollar, FaTruckLoading, FaArrowRight, FaCartPlus, FaSearch, FaRoute } from "react-icons/fa";
import api from "../../api/api";
import "./ProcurementDashboard.css";

const STATUS_LABELS = { SENT_TO_SUPPLIER: "Sent to supplier", CONFIRMED: "Confirmed", PARTIALLY_RECEIVED: "Partially received", ORDERED: "Ordered" };
const formatStatus = (status) => STATUS_LABELS[status] || String(status || "Unknown").replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const statusTone = (status) => status === "PARTIALLY_RECEIVED" ? "info" : status === "CONFIRMED" ? "success" : "warning";
const formatQuantity = (item) => Number(item.shortageQtyDecimal ?? item.shortageQty ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

const StatCard = ({ title, value, icon, color, subtext, onClick }) => (
    <button type="button" className="procurement-kpi" onClick={onClick} aria-label={`${title}: ${value}. ${subtext}`}>
        <span className="procurement-kpi-copy"><span className="procurement-kpi-label">{title}</span><strong className="procurement-kpi-value">{value}</strong><span className="procurement-kpi-subtext">{subtext}</span></span>
        <span className={`procurement-kpi-icon bg-${color} bg-opacity-10 text-${color}`} aria-hidden="true">{icon}</span>
        <FaArrowRight className="procurement-kpi-arrow" aria-hidden="true" />
    </button>
);

const ProcurementDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [deliveryStatus, setDeliveryStatus] = useState("ALL");

    const fetchStats = async () => {
        setLoading(true); setError(null);
        try { const response = await api.get('/procurement/dashboard-stats'); setStats(response.data); }
        catch (err) { console.error("Failed to load procurement stats", err); setError("Procurement data could not be loaded. Please try again."); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchStats(); }, []);

    const shortages = useMemo(() => stats?.criticalShortages || [], [stats]);
    const deliveries = useMemo(() => stats?.pendingDeliveries || [], [stats]);
    const statusSummary = useMemo(() => Object.entries(deliveries.reduce((summary, delivery) => { const key = delivery.status || "UNKNOWN"; summary[key] = (summary[key] || 0) + 1; return summary; }, {})).map(([status, count]) => ({ status, count })), [deliveries]);
    const maxStatusCount = Math.max(1, ...statusSummary.map((item) => item.count));
    const normalizedSearch = search.trim().toLowerCase();
    const filteredShortages = shortages.filter((item) => !normalizedSearch || [item.productName, item.productId].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)));
    const filteredDeliveries = deliveries.filter((po) => (!normalizedSearch || [po.poNumber, po.supplierName, po.expectedDate, po.status].some((value) => String(value || "").toLowerCase().includes(normalizedSearch))) && (deliveryStatus === "ALL" || po.status === deliveryStatus));

    if (loading) return <Container fluid className="procurement-dashboard operational-workspace procurement-loading" aria-busy="true"><Spinner animation="border" variant="primary" /><span>Loading procurement dashboard…</span></Container>;
    if (error) return <Container fluid className="procurement-dashboard operational-workspace"><Alert variant="danger" className="procurement-error" role="alert"><Alert.Heading>Procurement dashboard unavailable</Alert.Heading><p>{error}</p><Button variant="outline-danger" onClick={fetchStats}>Try again</Button></Alert></Container>;

    return (
        <Container fluid className="procurement-dashboard operational-workspace">
            <main aria-labelledby="procurement-dashboard-heading">
                <header className="procurement-dashboard-header"><div><p className="procurement-dashboard-eyebrow">Procurement control</p><h1 id="procurement-dashboard-heading">Procurement Dashboard</h1><p className="procurement-dashboard-subtitle">Track demand, shortages, open purchase orders, and incoming deliveries.</p></div><Button variant="primary" onClick={() => navigate('/pos/create')} className="procurement-primary-action"><FaCartPlus aria-hidden="true" /> New Purchase Order</Button></header>
                <section aria-label="Procurement key performance indicators" className="procurement-kpi-grid">
                    <StatCard title="Pending Requests" value={(stats?.pendingRequestsCount || 0).toLocaleString()} icon={<FaClipboardList />} color="warning" subtext="Open item requests" onClick={() => navigate('/stores/fulfil-requests')} />
                    <StatCard title="Items in Shortage" value={(stats?.itemsInShortageCount || 0).toLocaleString()} icon={<FaExclamationCircle />} color="danger" subtext="Require purchase planning" onClick={() => navigate('/stores/planning')} />
                    <StatCard title="Active POs" value={(stats?.activePOsCount || 0).toLocaleString()} icon={<FaFileInvoiceDollar />} color="primary" subtext={`Rs. ${(stats?.totalPendingPOValue || 0).toLocaleString()} open value`} onClick={() => navigate('/pos')} />
                    <StatCard title="Pending GRNs" value={(stats?.pendingGRNsCount || 0).toLocaleString()} icon={<FaTruckLoading />} color="info" subtext="Awaiting full receipt" onClick={() => navigate('/grn')} />
                </section>
                <section className="procurement-overview-grid" aria-label="Procurement summary">
                    <Card className="procurement-panel procurement-status-panel border-0"><Card.Header className="procurement-panel-header"><div><h2>Purchase order status</h2><p>Current mix across the returned active orders</p></div><Badge bg="light" text="dark">{deliveries.length} shown</Badge></Card.Header><Card.Body>
                        {statusSummary.length === 0 ? <p className="procurement-empty mb-0">No active purchase order statuses to display.</p> : <div className="procurement-status-chart" role="img" aria-label={statusSummary.map((item) => `${formatStatus(item.status)} ${item.count}`).join(', ')}>{statusSummary.map((item) => <div className="procurement-status-row" key={item.status}><div className="procurement-status-meta"><span>{formatStatus(item.status)}</span><strong>{item.count}</strong></div><div className="procurement-status-track"><span className={`procurement-status-fill is-${statusTone(item.status)}`} style={{ width: `${(item.count / maxStatusCount) * 100}%` }} /></div></div>)}</div>}
                    </Card.Body></Card>
                    <Card className="procurement-panel procurement-flow-panel border-0"><Card.Header className="procurement-panel-header"><div><h2>Procurement flow</h2><p>Move from demand to receipt</p></div><FaRoute aria-hidden="true" /></Card.Header><Card.Body className="procurement-flow-list">
                        {[['1','Review requests','Confirm demand and shortages','/stores/fulfil-requests'],['2','Plan shortages','Prepare purchase requirements','/stores/planning'],['3','Convert to PO','Assign suppliers and quotations','/stores/pending-to-po'],['4','Receive goods','Record delivered quantities','/grn']].map(([step,title,detail,path]) => <button type="button" className="procurement-flow-step" onClick={() => navigate(path)} key={step}><span className="procurement-flow-number">{step}</span><span><strong>{title}</strong><small>{detail}</small></span><FaArrowRight aria-hidden="true" /></button>)}
                    </Card.Body></Card>
                </section>
                <section className="procurement-table-section" aria-labelledby="procurement-activity-heading">
                    <div className="procurement-section-heading"><div><h2 id="procurement-activity-heading">Procurement activity</h2><p>Review priority shortages and upcoming deliveries from one workspace.</p></div><div className="procurement-filters">
                        <Form.Group className="procurement-search" controlId="procurement-dashboard-search"><Form.Label className="visually-hidden">Search procurement activity</Form.Label><FaSearch aria-hidden="true" /><Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, PO, or supplier" /></Form.Group>
                        <Form.Group controlId="procurement-delivery-status"><Form.Label className="visually-hidden">Filter expected deliveries by status</Form.Label><Form.Select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)} aria-label="Filter expected deliveries by status"><option value="ALL">All PO statuses</option>{statusSummary.map(({ status }) => <option value={status} key={status}>{formatStatus(status)}</option>)}</Form.Select></Form.Group>
                    </div></div>
                    <Row className="g-4"><Col xl={5}><Card className="procurement-panel h-100 border-0"><Card.Header className="procurement-panel-header"><div><h2>Critical shortages</h2><p>{filteredShortages.length} of {shortages.length} priority items</p></div><Button variant="link" size="sm" onClick={() => navigate('/stores/planning')}>Plan all <FaArrowRight aria-hidden="true" /></Button></Card.Header><Card.Body className="procurement-table-scroll p-0" role="region" tabIndex="0" aria-label="Critical shortages table">
                        {filteredShortages.length === 0 ? <div className="procurement-empty">No shortages match the current search.</div> : <Table hover className="procurement-table procurement-shortages-table mb-0 align-middle"><thead><tr><th>Product</th><th className="text-end">Shortage qty</th></tr></thead><tbody>{filteredShortages.map((item, idx) => <tr key={item.productId || idx}><td><strong>{item.productName || item.productId}</strong>{item.productName && item.productId && <small>{item.productId}</small>}</td><td className="text-end"><span className="procurement-quantity">{formatQuantity(item)}</span></td></tr>)}</tbody></Table>}
                    </Card.Body></Card></Col><Col xl={7}><Card className="procurement-panel h-100 border-0"><Card.Header className="procurement-panel-header"><div><h2>Expected deliveries</h2><p>{filteredDeliveries.length} of {deliveries.length} open orders</p></div><Button variant="link" size="sm" onClick={() => navigate('/pos')}>View all POs <FaArrowRight aria-hidden="true" /></Button></Card.Header><Card.Body className="procurement-table-scroll p-0" role="region" tabIndex="0" aria-label="Expected deliveries table">
                        {filteredDeliveries.length === 0 ? <div className="procurement-empty">No deliveries match the current filters.</div> : <Table hover className="procurement-table procurement-deliveries-table mb-0 align-middle"><thead><tr><th>PO number</th><th>Supplier</th><th>Expected</th><th>Status</th></tr></thead><tbody>{filteredDeliveries.map((po, idx) => <tr key={`${po.poNumber}-${idx}`}><td><strong className="text-primary">{po.poNumber}</strong></td><td>{po.supplierName}</td><td>{po.expectedDate || '—'}</td><td><Badge bg={statusTone(po.status)} text={statusTone(po.status) === 'warning' ? 'dark' : undefined}>{formatStatus(po.status)}</Badge></td></tr>)}</tbody></Table>}
                    </Card.Body></Card></Col></Row>
                </section>
            </main>
        </Container>
    );
};
export default ProcurementDashboard;
