import React, { useState, useEffect } from "react";
import api from "../../../api/api";
import { Button, Form, Table, Spinner, Row, Col } from "react-bootstrap";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ReceivablesReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [customerName, setCustomerName] = useState("");
    const navigate = useNavigate();

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (customerName) params.customerName = customerName;

            const res = await api.get("/reports/receivables", { params });
            setData(res.data || []);
        } catch (error) {
            toast.error("Failed to load receivables");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const totalReceivable = data.reduce((sum, item) => sum + (item.balance || 0), 0);

    return (
        <div className="p-4 bg-white min-vh-100">
            <div className="d-flex justify-content-between mb-3 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div>
                    <h4 className="mb-0">Receivables Report</h4>
                </div>
                <Button variant="primary" onClick={() => window.print()}>Print / PDF</Button>
            </div>

            <div className="mb-4 p-3 bg-light rounded no-print">
                <Row className="align-items-end">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Start Due Date</Form.Label>
                            <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>End Due Date</Form.Label>
                            <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Customer Name</Form.Label>
                            <Form.Control type="text" placeholder="Search by customer..." value={customerName} onChange={e => setCustomerName(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <div className="d-flex w-100 gap-2">
                            <Button variant="info" className="flex-grow-1" onClick={fetchReport}>Filter</Button>
                            <Button variant="outline-secondary" className="flex-grow-1" onClick={() => { setStartDate(""); setEndDate(""); setCustomerName(""); }}>Clear</Button>
                        </div>
                    </Col>
                </Row>
            </div>

            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                <ReportLayout title="Accounts Receivable Report" orientation="portrait">
                    <div className="mb-3">
                        <strong>Period: </strong> {startDate || "Begining"} to {endDate || "Now"}
                    </div>
                    <Table bordered size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer Name</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th className="text-end">Total Amt</th>
                                <th className="text-end">Paid</th>
                                <th className="text-end">Balance Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr><td colSpan="7" className="text-center">No records found</td></tr>
                            ) : (
                                data.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.invoiceNumber}</td>
                                        <td>{item.customerName}</td>
                                        <td>{item.startDate}</td>
                                        <td>{item.endDate}</td>
                                        <td className="text-end">{item.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="text-end">{item.paidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="text-end fw-bold text-success">{item.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            )}
                            <tr className="table-light fw-bold border-top border-dark">
                                <td colSpan="6" className="text-end">GRAND TOTAL</td>
                                <td className="text-end text-success" style={{ fontSize: "1.2em" }}>{totalReceivable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </Table>
                </ReportLayout>
            )}
        </div>
    );
};

export default ReceivablesReport;
