import React, { useState, useEffect, useMemo } from "react";
import api from "../../../api/api";
import { Button, Form, Table, Spinner, Row, Col } from "react-bootstrap";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import SafeDatePicker from '../../ReusableComponents/SafeDatePicker';
import QuickDateRangeButtons from '../../ReusableComponents/QuickDateRangeButtons';

const PayablesReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const navigate = useNavigate();

    const fetchReport = async (range = { startDate, endDate }) => {
        setLoading(true);
        try {
            const params = {};
            if (range.startDate) params.startDate = range.startDate;
            if (range.endDate) params.endDate = range.endDate;

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

    const applyQuickRange = (range) => {
        setStartDate(range.startDate);
        setEndDate(range.endDate);
        fetchReport(range);
    };

    const asOfDate = new Date();
    const agingBuckets = [
        { key: "age0to30", label: "0-30 days" },
        { key: "age30to60", label: "30-60 days" },
        { key: "age60to90", label: "60-90 days" },
        { key: "age90Plus", label: "90+ days" }
    ];

    const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const daysBetween = (dateText) => {
        if (!dateText) return 0;
        const due = new Date(`${dateText}T00:00:00`);
        if (Number.isNaN(due.getTime())) return 0;
        const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
        return Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    };
    const bucketKeyForAge = (days) => {
        if (days <= 30) return "age0to30";
        if (days <= 60) return "age30to60";
        if (days <= 90) return "age60to90";
        return "age90Plus";
    };

    const agingRows = useMemo(() => data.map(item => {
        const balance = Number(item.balance || 0);
        const ageDays = daysBetween(item.dueDate);
        const bucketKey = bucketKeyForAge(ageDays);
        return {
            ...item,
            balance,
            ageDays,
            age0to30: bucketKey === "age0to30" ? balance : 0,
            age30to60: bucketKey === "age30to60" ? balance : 0,
            age60to90: bucketKey === "age60to90" ? balance : 0,
            age90Plus: bucketKey === "age90Plus" ? balance : 0
        };
    }), [data]); // eslint-disable-line react-hooks/exhaustive-deps

    const totals = useMemo(() => agingRows.reduce((acc, item) => {
        acc.invoiceAmount += Number(item.invoiceAmount || 0);
        acc.paidAmount += Number(item.paidAmount || 0);
        acc.balance += Number(item.balance || 0);
        agingBuckets.forEach(bucket => {
            acc[bucket.key] += Number(item[bucket.key] || 0);
        });
        return acc;
    }, { invoiceAmount: 0, paidAmount: 0, balance: 0, age0to30: 0, age30to60: 0, age60to90: 0, age90Plus: 0 }), [agingRows]); // eslint-disable-line react-hooks/exhaustive-deps

    const percentage = (value) => totals.balance > 0 ? `${((Number(value || 0) / totals.balance) * 100).toFixed(1)}%` : "0.0%";

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
                            <SafeDatePicker name="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>End Due Date</Form.Label>
                            <SafeDatePicker name="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Button variant="info" className="w-100" onClick={fetchReport}>Filter</Button>
                    </Col>
                    <Col md={2}>
                        <Button variant="outline-secondary" className="w-100" onClick={() => { setStartDate(""); setEndDate(""); fetchReport({ startDate: "", endDate: "" }); }}>Clear</Button>
                    </Col>
                </Row>
                <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
                    <span className="text-muted small fw-semibold">Quick due range:</span>
                    <QuickDateRangeButtons mode="future" onSelect={applyQuickRange} />
                </div>
            </div>

            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                <ReportLayout title="Supplier Aging Details" orientation="landscape">
                    <div className="mb-3 small">
                        <div><strong>Aged as of:</strong> {asOfDate.toLocaleDateString()}</div>
                        <div><strong>Aged by:</strong> Due Date</div>
                        <div><strong>Due Date Filter:</strong> {startDate || "Beginning"} to {endDate || "Now"}</div>
                        <div><strong>All Amounts in LKR</strong></div>
                    </div>
                    <Table bordered size="sm" className="aging-report-table">
                        <thead className="table-light">
                            <tr>
                                <th>Reference</th>
                                <th>Source</th>
                                <th>Supplier</th>
                                <th>Due Date</th>
                                <th className="text-end">Age Days</th>
                                <th className="text-end">Invoice Amt</th>
                                <th className="text-end">Paid</th>
                                <th className="text-end">Remaining Amount</th>
                                {agingBuckets.map(bucket => (
                                    <th key={bucket.key} className="text-end">{bucket.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {agingRows.length === 0 ? (
                                <tr><td colSpan="12" className="text-center">No records found</td></tr>
                            ) : (
                                agingRows.map((item, i) => (
                                    <tr key={i}>
                                        <td>{item.grnNumber}</td>
                                        <td>{item.source || "GRN"}</td>
                                        <td>{item.supplierName}</td>
                                        <td>{item.dueDate}</td>
                                        <td className="text-end">{item.ageDays}</td>
                                        <td className="text-end">{money(item.invoiceAmount)}</td>
                                        <td className="text-end">{money(item.paidAmount)}</td>
                                        <td className="text-end fw-bold">{money(item.balance)}</td>
                                        {agingBuckets.map(bucket => (
                                            <td key={bucket.key} className="text-end">{item[bucket.key] ? money(item[bucket.key]) : "0.00"}</td>
                                        ))}
                                    </tr>
                                ))
                            )}
                            <tr className="table-light fw-bold border-top border-dark">
                                <td colSpan="5" className="text-end">TOTAL PAYABLE</td>
                                <td className="text-end">{money(totals.invoiceAmount)}</td>
                                <td className="text-end">{money(totals.paidAmount)}</td>
                                <td className="text-end">{money(totals.balance)}</td>
                                {agingBuckets.map(bucket => (
                                    <td key={bucket.key} className="text-end">{money(totals[bucket.key])}</td>
                                ))}
                            </tr>
                            <tr className="fw-semibold">
                                <td colSpan="8" className="text-end">AGING %</td>
                                {agingBuckets.map(bucket => (
                                    <td key={bucket.key} className="text-end">{percentage(totals[bucket.key])}</td>
                                ))}
                            </tr>
                        </tbody>
                    </Table>
                    <style>{`
                        .aging-report-table th,
                        .aging-report-table td {
                            font-size: 11px;
                            white-space: nowrap;
                            vertical-align: middle;
                        }
                    `}</style>
                </ReportLayout>
            )}
        </div>
    );
};

export default PayablesReport;
