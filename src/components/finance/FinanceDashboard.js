import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';

export default function FinanceDashboard() {
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    });
    const [data, setData] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/finance/reports/summary?start=${range.start}&end=${range.end}`);
            setData(res.data);
        } catch (e) {
            toast.error("Failed to load finance data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Finance Dashboard</h2>
                <div className="d-flex gap-2">
                    <Form.Control type="date" value={range.start} onChange={e => setRange({ ...range, start: e.target.value })} />
                    <span className="align-self-center">to</span>
                    <Form.Control type="date" value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} />
                    <Button onClick={loadData} disabled={loading}>{loading ? '...' : 'Refresh'}</Button>
                </div>
            </div>

            {data && (
                <>
                    <Row className="mb-4">
                        <Col md={4}>
                            <Card className="text-center shadow-sm border-success h-100">
                                <Card.Body>
                                    <h6 className="text-muted">Total Inflow</h6>
                                    <h3 className="fw-bold text-success">{data.totalInflow?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                    <div className="small text-muted mt-2">
                                        Projects: {data.incomeProjects?.toLocaleString()}<br />
                                        Loans: {data.incomeLoans?.toLocaleString()}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="text-center shadow-sm border-danger h-100">
                                <Card.Body>
                                    <h6 className="text-muted">Total Outflow</h6>
                                    <h3 className="fw-bold text-danger">{data.grandTotalOutflow?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="text-center shadow-sm border-info h-100">
                                <Card.Body>
                                    <h6 className="text-muted">Net Cash Flow</h6>
                                    <h3 className={`fw-bold ${data.netCashFlow >= 0 ? 'text-primary' : 'text-danger'}`}>{data.netCashFlow?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <h5 className="mb-3">Expense & Outflow Breakdown</h5>
                    <Row className="mb-4">
                        <Col md={2}>
                            <Card className="text-center shadow-sm h-100">
                                <Card.Body>
                                    <h6 className="text-muted small">Operational Ops</h6>
                                    <h5>{data.totalOperationalExpenses?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={2}>
                            <Card className="text-center shadow-sm h-100">
                                <Card.Body>
                                    <h6 className="text-muted small">Payroll (Paid)</h6>
                                    <h5>{data.totalPayroll?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={2}>
                            <Card className="text-center shadow-sm h-100">
                                <Card.Body>
                                    <h6 className="text-muted small">Suppliers</h6>
                                    <h5>{data.totalSupplierPayments?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="text-center shadow-sm h-100">
                                <Card.Body>
                                    <h6 className="text-muted small">Asset Purchases</h6>
                                    <h5>{data.totalAssetPayments?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="text-center shadow-sm h-100">
                                <Card.Body>
                                    <h6 className="text-muted small">Loan Repayments</h6>
                                    <h5>{data.totalLoanRepayments?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h5>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <Row>
                        <Col>
                            <Card className="shadow-sm">
                                <Card.Header>Quick Actions</Card.Header>
                                <Card.Body className="d-flex gap-3">
                                    <Button variant="outline-primary" href="#/finance/expenses">Go to Expenses</Button>
                                    <Button variant="outline-primary" href="#/finance/accounts">Chart of Accounts</Button>
                                    <Button variant="outline-primary" href="#/salary">Go to Payroll</Button>
                                    <Button variant="outline-primary" href="#/assets">Go to Assets</Button>
                                    <Button variant="outline-primary" href="#/finance/loans">Loan Management</Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
}
