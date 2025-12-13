import React, { useEffect, useState } from "react";
import { Container, Table, Tabs, Tab, Badge, Form, Row, Col } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";

const getStock = async () => (await api.get("/reports/stock")).data;
const getPayables = async () => (await api.get("/reports/payables")).data;
const getReceivables = async () => (await api.get("/projects/receivables")).data;

export default function ReportsPage() {
    const [key, setKey] = useState("hr");
    const navigate = useNavigate();
    const [stock, setStock] = useState([]);
    const [payables, setPayables] = useState([]);
    const [receivables, setReceivables] = useState([]);
    const [filteredReceivables, setFilteredReceivables] = useState([]);

    // Filter state for Receivables
    const [filterText, setFilterText] = useState("");

    useEffect(() => {
        if (key === "stock") {
            getStock().then(setStock).catch(() => toast.error("Failed to load stock"));
        } else if (key === "payables") {
            getPayables().then(setPayables).catch(() => toast.error("Failed to load payables"));
        } else if (key === "receivables") {
            getReceivables().then(data => {
                setReceivables(data);
                setFilteredReceivables(data);
            }).catch(() => toast.error("Failed to load receivables"));
        }
    }, [key]);

    useEffect(() => {
        if (key === "receivables") {
            const lower = filterText.toLowerCase();
            setFilteredReceivables(receivables.filter(r =>
                (r.projectName || "").toLowerCase().includes(lower) ||
                (r.customerName || "").toLowerCase().includes(lower)
            ));
        }
    }, [filterText, receivables, key]);

    return (
        <Container style={{ width: "85vw", maxWidth: 1200, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <h2 className="mb-4">Reports</h2>
                <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
                    <Tab eventKey="hr" title="HR & Payroll">
                        <div className="p-3">
                            <h5 className="mb-3">Available Reports</h5>
                            <Row>
                                <Col md={6} className="mb-3">
                                    <div className="p-3 border rounded shadow-sm">
                                        <h6>Leave Utilization Report</h6>
                                        <p className="text-muted small">View annual leave balances and usage for all employees.</p>
                                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate("/reports/leave")}>
                                            View Report
                                        </button>
                                    </div>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <div className="p-3 border rounded shadow-sm">
                                        <h6>Monthly Salary Sheet</h6>
                                        <p className="text-muted small">Generate and print monthly salary sheets.</p>
                                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate("/salary")}>
                                            Go to Payroll Generation
                                        </button>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </Tab>
                    <Tab eventKey="stock" title="Current Stock">
                        <div className="text-end mb-2">
                            <button className="btn btn-primary btn-sm" onClick={() => navigate("/reports/stock")}>
                                📄 View Stock Valuation Report
                            </button>
                        </div>
                        <Table hover responsive striped>
                            <thead>
                                <tr>
                                    <th>Product ID</th>
                                    <th className="text-end">Quantity On Hand</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stock.map((s, i) => (
                                    <tr key={i}>
                                        <td>{s.productId}</td>
                                        <td className="text-end">{s.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Tab>
                    <Tab eventKey="payables" title="Payables (Upcoming Payments)">
                        <Table hover responsive striped>
                            <thead>
                                <tr>
                                    <th>GRN No</th>
                                    <th>Supplier</th>
                                    <th>Due Date</th>
                                    <th className="text-end">Invoice Amount</th>
                                    <th className="text-end">Paid Amount</th>
                                    <th className="text-end">Balance Due</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payables.map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.grnNumber}</td>
                                        <td>{p.supplierName}</td>
                                        <td className={new Date(p.dueDate) < new Date() ? "text-danger fw-bold" : ""}>
                                            {p.dueDate}
                                        </td>
                                        <td className="text-end">{p.invoiceAmount?.toFixed(2)}</td>
                                        <td className="text-end">{p.paidAmount?.toFixed(2)}</td>
                                        <td className="text-end fw-bold">{p.balance?.toFixed(2)}</td>
                                        <td>
                                            <Badge bg={
                                                p.status === "PAID" ? "success" :
                                                    p.status === "PARTIALLY_PAID" ? "warning" :
                                                        p.status === "INVOICED" ? "info" : "secondary"
                                            }>{p.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Tab>
                    <Tab eventKey="receivables" title="Project Receivables">
                        <Row className="mb-3">
                            <Col md={4}>
                                <Form.Control
                                    placeholder="Filter by Project or Customer..."
                                    value={filterText}
                                    onChange={e => setFilterText(e.target.value)}
                                />
                            </Col>
                        </Row>
                        <Table hover responsive striped>
                            <thead>
                                <tr>
                                    <th>Project ID</th>
                                    <th>Project Name</th>
                                    <th>Customer Name</th>
                                    <th className="text-end">Total Value</th>
                                    <th className="text-end">Total Received</th>
                                    <th className="text-end">Balance Due</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceivables.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.projectId}</td>
                                        <td>{r.projectName}</td>
                                        <td>{r.customerName}</td>
                                        <td className="text-end">{r.totalProjectValue?.toLocaleString()}</td>
                                        <td className="text-end">{r.totalReceived?.toLocaleString()}</td>
                                        <td className="text-end fw-bold text-danger">{r.balance?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Tab>
                </Tabs>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
