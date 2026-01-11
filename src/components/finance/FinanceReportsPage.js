import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Table, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';

export default function FinanceReportsPage() {
    const [activeTab, setActiveTab] = useState('PL');

    // Filters
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)); // Start of this month
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); // Today
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10)); // Today

    const [loading, setLoading] = useState(false);
    const [plData, setPlData] = useState(null);
    const [bsData, setBsData] = useState(null);

    useEffect(() => {
        loadData();
    }, [activeTab]); // Load when tab changes. Filters handled by "Apply" button? Or auto? Auto is better UX for date changes.

    // Effect for filter changes within tab
    useEffect(() => {
        if (activeTab === 'PL') loadPL();
        if (activeTab === 'BS') loadBS();
    }, [startDate, endDate, asOfDate]);

    const loadData = () => {
        if (activeTab === 'PL') loadPL();
        if (activeTab === 'BS') loadBS();
    };

    const loadPL = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/income-statement?start=${startDate}&end=${endDate}`);
            setPlData(res.data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load Income Statement");
        } finally {
            setLoading(false);
        }
    };

    const loadBS = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/balance-sheet?asOfDate=${asOfDate}`);
            setBsData(res.data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load Balance Sheet");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => val?.toLocaleString(undefined, { minimumFractionDigits: 2 });

    const print = () => window.print();

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 noprint">
                <h2>Financial Reports</h2>
                <div className="d-flex gap-2">
                    <Button variant="outline-dark" onClick={print}>Print Report</Button>
                </div>
            </div>

            <Card className="mb-4 noprint">
                <Card.Body>
                    <Row className="align-items-end">
                        <Col md={12}>
                            {activeTab === 'PL' && (
                                <div className="d-flex gap-3">
                                    <Form.Group>
                                        <Form.Label>From</Form.Label>
                                        <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </Form.Group>
                                    <Form.Group>
                                        <Form.Label>To</Form.Label>
                                        <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    </Form.Group>
                                </div>
                            )}
                            {activeTab === 'BS' && (
                                <div className="d-flex gap-3">
                                    <Form.Group>
                                        <Form.Label>As of Date</Form.Label>
                                        <Form.Control type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
                                    </Form.Group>
                                </div>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 noprint">
                <Tab eventKey="PL" title="Income Statement (P&L)" />
                <Tab eventKey="BS" title="Balance Sheet" />
            </Tabs>

            {loading && <div className="text-center py-5"><Spinner animation="border" /> Loading...</div>}

            {!loading && activeTab === 'PL' && plData && (
                <Card className="shadow-sm print-border">
                    <Card.Body>
                        <div className="text-center mb-4">
                            <h4>Income Statement</h4>
                            <p className="text-muted">For the period {plData.startDate} to {plData.endDate}</p>
                        </div>

                        <div className="table-responsive">
                            <Table hover size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>Account</th>
                                        <th className="text-end" style={{ width: '200px' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="table-success fw-bold"><td colSpan="2">Revenue</td></tr>
                                    {plData.revenue && plData.revenue.map(r => (
                                        <tr key={r.accountId}>
                                            <td className="ps-4">{r.accountName} <small className="text-muted">({r.code})</small></td>
                                            <td className="text-end">{formatCurrency(r.balance)}</td>
                                        </tr>
                                    ))}
                                    <tr className="fw-bold border-top">
                                        <td className="ps-4">Total Revenue</td>
                                        <td className="text-end text-success">{formatCurrency(plData.totalRevenue)}</td>
                                    </tr>

                                    <tr className="table-danger fw-bold mt-4"><td colSpan="2">Expenses</td></tr>
                                    {plData.expenses && plData.expenses.map(r => (
                                        <tr key={r.accountId}>
                                            <td className="ps-4">{r.accountName} <small className="text-muted">({r.code})</small></td>
                                            <td className="text-end">{formatCurrency(r.balance)}</td>
                                        </tr>
                                    ))}
                                    <tr className="fw-bold border-top">
                                        <td className="ps-4">Total Expenses</td>
                                        <td className="text-end text-danger">{formatCurrency(plData.totalExpenses)}</td>
                                    </tr>

                                    <tr className="table-primary fw-bold fs-5">
                                        <td>Net Income</td>
                                        <td className="text-end">{formatCurrency(plData.netIncome)}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {!loading && activeTab === 'BS' && bsData && (
                <Card className="shadow-sm print-border">
                    <Card.Body>
                        <div className="text-center mb-4">
                            <h4>Balance Sheet</h4>
                            <p className="text-muted">As of {bsData.asOfDate}</p>
                        </div>

                        <Row>
                            <Col md={6}>
                                <h5 className="text-primary border-bottom pb-2">Assets</h5>
                                <Table size="sm" borderless hover>
                                    <tbody>
                                        {bsData.assets && bsData.assets.map(a => (
                                            <tr key={a.accountId}>
                                                <td>{a.accountName} <small className="text-muted">({a.code})</small></td>
                                                <td className="text-end">{formatCurrency(a.balance)}</td>
                                            </tr>
                                        ))}
                                        <tr className="border-top fw-bold fs-6">
                                            <td>Total Assets</td>
                                            <td className="text-end">{formatCurrency(bsData.totalAssets)}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </Col>
                            <Col md={6}>
                                <h5 className="text-danger border-bottom pb-2">Liabilities</h5>
                                <Table size="sm" borderless hover>
                                    <tbody>
                                        {bsData.liabilities && bsData.liabilities.map(a => (
                                            <tr key={a.accountId}>
                                                <td>{a.accountName} <small className="text-muted">({a.code})</small></td>
                                                <td className="text-end">{formatCurrency(a.balance)}</td>
                                            </tr>
                                        ))}
                                        <tr className="border-top fw-bold">
                                            <td>Total Liabilities</td>
                                            <td className="text-end">{formatCurrency(bsData.totalLiabilities)}</td>
                                        </tr>
                                    </tbody>
                                </Table>

                                <h5 className="text-info border-bottom pb-2 mt-4">Equity</h5>
                                <Table size="sm" borderless hover>
                                    <tbody>
                                        {bsData.equity && bsData.equity.map(a => (
                                            <tr key={a.accountId}>
                                                <td>{a.accountName} <small className="text-muted">({a.code})</small></td>
                                                <td className="text-end">{formatCurrency(a.balance)}</td>
                                            </tr>
                                        ))}
                                        <tr className="border-top fw-bold">
                                            <td>Total Equity</td>
                                            <td className="text-end">{formatCurrency(bsData.totalEquity)}</td>
                                        </tr>
                                    </tbody>
                                </Table>

                                <div className="mt-3 p-2 bg-light border rounded d-flex justify-content-between fw-bold">
                                    <span>Total Liabilities + Equity</span>
                                    <span>{formatCurrency(bsData.totalLiabilities + bsData.totalEquity)}</span>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            <style>
                {`
                    @media print {
                        .noprint { display: none !important; }
                        .print-border { border: none !important; box-shadow: none !important; }
                    }
                `}
            </style>
        </Container>
    );
}
