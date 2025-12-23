import React, { useState, useEffect } from "react";
import api from "../../../api/api";
import { Button, Form, Table, Spinner, Row, Col } from "react-bootstrap";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const PayablesReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const navigate = useNavigate();

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await api.get("/reports/payables", { params });
            setData(res.data || []);
        } catch (error) {
            toast.error("Failed to load payables");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []); // Load initial (all) on mount

    const totalPayable = data.reduce((sum, item) => sum + (item.balance || 0), 0);

    return (
        <div className="p-4 bg-white min-vh-100">
            <div className="d-flex justify-content-between mb-3 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div>
                    <h4 className="mb-0">Payables Report</h4>
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
                    <Col md={2}>
                        <Button variant="info" className="w-100" onClick={fetchReport}>Filter</Button>
                    </Col>
                    <Col md={2}>
                        <Button variant="outline-secondary" className="w-100" onClick={() => { setStartDate(""); setEndDate(""); fetchReport(); }}>Clear</Button>
                    </Col>
                </Row>
            </div>

            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                <ReportLayout title="Accounts Payable Report" orientation="portrait">
                    <div className="mb-3">
                        <strong>Period: </strong> {startDate || "Begining"} to {endDate || "Now"}
                    </div>
                    <Table bordered size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>GRN #</th>
                                <th>Supplier</th>
                                <th>Due Date</th>
                                <th className="text-end">Invoice Amt</th>
                                <th className="text-end">Paid</th>
                                <th className="text-end">Balance To Pay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr><td colSpan="6" className="text-center">No records found</td></tr>
                            ) : (
                                data.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.grnNumber}</td>
                                        <td>{item.supplierName}</td>
                                        <td>{item.dueDate}</td>
                                        <td className="text-end">{item.invoiceAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="text-end">{item.paidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="text-end fw-bold text-danger">{item.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            )}
                            <tr className="table-light fw-bold border-top border-dark">
                                <td colSpan="5" className="text-end">GRAND TOTAL PAYABLE</td>
                                <td className="text-end text-danger" style={{ fontSize: "1.2em" }}>{totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </Table>
                </ReportLayout>
            )}
        </div>
    );
};

export default PayablesReport;
