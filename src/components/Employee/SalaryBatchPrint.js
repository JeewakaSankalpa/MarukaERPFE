import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";
import { Container, Button, Table, Row, Col, Card } from "react-bootstrap";

export default function SalaryBatchPrint() {
    const { month } = useParams();
    const [salaries, setSalaries] = useState([]);
    const [employees, setEmployees] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [month]);

    const loadData = async () => {
        try {
            const empRes = await api.get("/employee/all");
            const empMap = {};
            (empRes.data || []).forEach(e => empMap[e.id] = e);
            setEmployees(empMap);

            const res = await api.get(`/salary/list?month=${month}`);
            setSalaries(res.data || []);
        } catch (e) {
            alert("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <Container className="my-4">
            <div className="d-print-none mb-4">
                <Button variant="secondary" onClick={() => window.history.back()} className="me-2">Back</Button>
                <Button variant="primary" onClick={() => window.print()}>Print All</Button>
            </div>

            {salaries.map((s, index) => {
                const emp = employees[s.employeeId] || {};
                const gross = s.grossSalary || 0;
                const deductions = (s.epfEmployee || 0) + (s.tax || 0) + (s.otherDeductions || 0) + (s.noPayDeduction || 0);

                return (
                    <div key={s.id} className="payslip-page mb-5 border p-4" style={{ pageBreakAfter: "always" }}>
                        <div className="text-center mb-4">
                            <h3>Maruka ERP - Payslip</h3>
                            <h5>Month: {month}</h5>
                        </div>

                        <Row className="mb-3">
                            <Col>
                                <strong>Employee:</strong> {emp.firstName} {emp.lastName}<br />
                                <strong>Designation:</strong> {emp.designation || '-'}<br />
                                <strong>Date Joined:</strong> {emp.joinDate || '-'}
                            </Col>
                            <Col className="text-end">
                                <strong>Generated:</strong> {new Date().toLocaleDateString()}<br />
                                <strong>Status:</strong> {s.status || 'PENDING'}
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Card className="h-100 border-0">
                                    <div className="fw-bold border-bottom mb-2 pb-1">Earnings</div>
                                    <Table size="sm" borderless>
                                        <tbody>
                                            <tr><td>Basic Salary</td><td className="text-end">{s.basicSalary?.toFixed(2)}</td></tr>
                                            <tr><td>Allowances</td><td className="text-end">{s.allowances?.toFixed(2)}</td></tr>
                                            <tr><td>Bonuses</td><td className="text-end">{s.bonuses?.toFixed(2)}</td></tr>
                                            <tr><td>Overtime ({s.overtimeHours} hrs)</td><td className="text-end">{s.overtimePay?.toFixed(2)}</td></tr>
                                            <tr className="border-top fw-bold"><td>Gross Salary</td><td className="text-end">{s.grossSalary?.toFixed(2)}</td></tr>
                                        </tbody>
                                    </Table>
                                </Card>
                            </Col>
                            <Col md={6}>
                                <Card className="h-100 border-0">
                                    <div className="fw-bold border-bottom mb-2 pb-1">Deductions</div>
                                    <Table size="sm" borderless>
                                        <tbody>
                                            <tr><td>EPF (8%)</td><td className="text-end">{s.epfEmployee?.toFixed(2)}</td></tr>
                                            <tr><td>PAYE Tax</td><td className="text-end">{s.tax?.toFixed(2)}</td></tr>
                                            <tr><td>Other Deductions</td><td className="text-end">{s.otherDeductions?.toFixed(2)}</td></tr>
                                            <tr><td>No Pay</td><td className="text-end">{s.noPayDeduction?.toFixed(2)}</td></tr>
                                            <tr className="border-top fw-bold"><td>Total Deductions</td><td className="text-end">{deductions.toFixed(2)}</td></tr>
                                        </tbody>
                                    </Table>
                                </Card>
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col>
                                <div className="border p-2 bg-light d-flex justify-content-between align-items-center">
                                    <h5 className="m-0">Net Pay</h5>
                                    <h4 className="m-0 fw-bold">{s.netSalary?.toFixed(2)}</h4>
                                </div>
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col>
                                <div className="border p-2">
                                    <strong>Employer Contributions</strong> (Not affecting Net Pay)<br />
                                    EPF (12%): {s.epfEmployer?.toFixed(2)} | ETF (3%): {s.etf?.toFixed(2)}<br />
                                    <strong>Total Company Cost:</strong> {((s.grossSalary - (s.noPayDeduction || 0)) + (s.epfEmployer || 0) + (s.etf || 0)).toFixed(2)}
                                </div>
                            </Col>
                        </Row>

                        <div className="mt-5 pt-3 border-top row">
                            <div className="col-4 text-center">
                                <br /><br />
                                ____________________<br />
                                Prepared By
                            </div>
                            <div className="col-4 text-center">
                                <br /><br />
                                ____________________<br />
                                Approved By
                            </div>
                            <div className="col-4 text-center">
                                <br /><br />
                                ____________________<br />
                                Employee Signature
                            </div>
                        </div>
                    </div>
                );
            })}
        </Container>
    );
}
