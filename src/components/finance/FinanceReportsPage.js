import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Table, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';

export default function FinanceReportsPage() {
    const [activeTab, setActiveTab] = useState('PL');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab, month]);

    const loadData = async () => {
        setData(null);
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/statements?type=${activeTab}&month=${month}-01`);
            setData(res.data);
        } catch (e) {
            toast.error("Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => val?.toLocaleString(undefined, { minimumFractionDigits: 2 });

    const print = () => window.print();

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 noprint">
                <h2>Financial Statements</h2>
                <div className="d-flex gap-2">
                    <Form.Control type="month" value={month} onChange={e => setMonth(e.target.value)} />
                    <Button variant="outline-dark" onClick={print}>Print Report</Button>
                </div>
            </div>

            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 noprint">
                <Tab eventKey="PL" title="Profit & Loss" />
                <Tab eventKey="BS" title="Balance Sheet" />
                <Tab eventKey="TAX" title="Tax Summary (VAT)" />
            </Tabs>

            {loading && <div className="text-center py-5">Loading report...</div>}

            {!loading && data && activeTab === 'PL' && (
                <Card className="shadow-sm print-border">
                    <Card.Body>
                        <h4 className="text-center mb-4">Profit & Loss Statement - {month}</h4>
                        <Table bordered striped>
                            <tbody>
                                <tr className="table-success">
                                    <th>Total Revenue</th>
                                    <th className="text-end">{formatCurrency(data.revenue)}</th>
                                </tr>
                                <tr><td colSpan="2" className="fw-bold bg-light">Expenses</td></tr>
                                <tr>
                                    <td>Operational Expenses</td>
                                    <td className="text-end">{formatCurrency(data.opex)}</td>
                                </tr>
                                <tr>
                                    <td>Payroll (Gross)</td>
                                    <td className="text-end">{formatCurrency(data.payroll)}</td>
                                </tr>
                                <tr>
                                    <td>Depreciation</td>
                                    <td className="text-end">{formatCurrency(data.depreciation)}</td>
                                </tr>
                                <tr className="table-light fw-bold">
                                    <td>Total Expenses</td>
                                    <td className="text-end">{formatCurrency(data.totalExpenses)}</td>
                                </tr>
                                <tr className={data.netProfit >= 0 ? "table-primary fw-bold" : "table-danger fw-bold"}>
                                    <td>Net Profit</td>
                                    <td className="text-end">{formatCurrency(data.netProfit)}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {!loading && data && activeTab === 'BS' && (
                <Card className="shadow-sm print-border">
                    <Card.Body>
                        <h4 className="text-center mb-4">Balance Sheet - As of {month}</h4>
                        <Row>
                            <Col md={6}>
                                <h5 className="text-success border-bottom pb-2">Assets</h5>
                                <Table size="sm" borderless>
                                    <tbody>
                                        <tr><td colSpan="2" className="fw-bold">Current Assets</td></tr>
                                        <tr><td className="ps-3">Cash / Bank</td><td className="text-end">{formatCurrency(data.currentAssets?.cash)}</td></tr>
                                        <tr><td className="ps-3">Inventory Value</td><td className="text-end">{formatCurrency(data.currentAssets?.inventory)}</td></tr>
                                        <tr><td className="ps-3">Receivables</td><td className="text-end">{formatCurrency(data.currentAssets?.receivables)}</td></tr>

                                        <tr><td colSpan="2" className="fw-bold mt-2">Fixed Assets</td></tr>
                                        <tr><td className="ps-3">Property, Plant & Equip.</td><td className="text-end">{formatCurrency(data.fixedAssets)}</td></tr>

                                        <tr className="border-top fw-bold">
                                            <td>Total Assets</td>
                                            <td className="text-end">{formatCurrency(data.totalAssets)}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </Col>
                            <Col md={6}>
                                <h5 className="text-danger border-bottom pb-2">Liabilities & Equity</h5>
                                <Table size="sm" borderless>
                                    <tbody>
                                        <tr><td colSpan="2" className="fw-bold">Liabilities</td></tr>
                                        <tr><td className="ps-3">Loans Payable</td><td className="text-end">{formatCurrency(data.liabilities?.loans)}</td></tr>
                                        <tr><td className="ps-3">Accounts Payable</td><td className="text-end">{formatCurrency(data.liabilities?.payables)}</td></tr>

                                        <tr className="border-top fw-bold">
                                            <td>Total Liabilities</td>
                                            <td className="text-end">{formatCurrency(data.totalLiabilities)}</td>
                                        </tr>

                                        <tr><td colSpan="2" className="pt-4 fw-bold">Equity</td></tr>
                                        <tr className="border-top fw-bold table-info">
                                            <td>Total Equity</td>
                                            <td className="text-end">{formatCurrency(data.equity)}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </Col>
                        </Row>
                        <Alert variant="info" className="mt-3 text-center small">
                            Total Assets must equal Total Liabilities + Equity.
                        </Alert>
                    </Card.Body>
                </Card>
            )}

            {!loading && data && activeTab === 'TAX' && (
                <Card className="shadow-sm print-border">
                    <Card.Body>
                        <h4 className="text-center mb-4">Tax Summary - {month}</h4>
                        <Alert variant="warning">
                            {data.vatMessage}
                        </Alert>
                        <Table bordered>
                            <tbody>
                                <tr>
                                    <th>Income Tax Base (Total Revenue)</th>
                                    <td className="text-end">{formatCurrency(data.taxableIncome)}</td>
                                </tr>
                                <tr>
                                    <th>PAYE Tax Collected (To be remitted)</th>
                                    <td className="text-end">{formatCurrency(data.payeCollected)}</td>
                                </tr>
                                <tr>
                                    <th>EPF/ETF Employer Liability</th>
                                    <td className="text-end">{formatCurrency(data.epfEtfPayable)}</td>
                                </tr>
                            </tbody>
                        </Table>
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
