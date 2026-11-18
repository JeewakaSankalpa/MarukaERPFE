import React, { useState, useEffect, useMemo } from "react";
import api from "../../../api/api";
import { Button, Form, Table, Spinner, Row, Col } from "react-bootstrap";
import { AlertCircle, ArrowLeft, CalendarRange, Clock3, Printer, ReceiptText, RefreshCw, WalletCards } from "lucide-react";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import SafeDatePicker from '../../ReusableComponents/SafeDatePicker';
import QuickDateRangeButtons from '../../ReusableComponents/QuickDateRangeButtons';
import './PayablesReport.css';

const PayablesReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const fetchReport = async (range = { startDate, endDate }) => {
        setLoading(true);
        setError("");
        try {
            const params = {};
            if (range.startDate) params.startDate = range.startDate;
            if (range.endDate) params.endDate = range.endDate;

            const res = await api.get("/reports/payables", { params });
            setData(res.data || []);
        } catch (error) {
            toast.error("Failed to load payables");
            setError("We couldn't load the supplier payables. Check the due-date range and try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // The initial all-dates report should load once; later requests are user initiated.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    const cleanInvoiceNumbers = (values = []) => values
        .map(value => (value || "").trim())
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index);
    const invoiceNumbersFor = (item = {}) => {
        if (Array.isArray(item.invoiceNumbers) && item.invoiceNumbers.length) {
            return cleanInvoiceNumbers(item.invoiceNumbers);
        }
        return cleanInvoiceNumbers(String(item.invoiceNumber || item.grnNumber || "")
            .split(",")
            .map(value => value.trim()));
    };
    const invoiceNumberList = (item) => {
        const invoices = invoiceNumbersFor(item);
        return invoices.length === 0 ? "-" : invoices.map(invoice => (
            <span key={invoice} className="d-block fw-semibold">{invoice}</span>
        ));
    };
    const documentLinks = (docs = []) => {
        if (!Array.isArray(docs) || docs.length === 0) return "-";
        return docs.map((doc, index) => (
            <a
                key={`${doc.url || doc.fileName || "document"}-${index}`}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="d-block"
            >
                {doc.fileName || `Document ${index + 1}`}
            </a>
        ));
    };
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

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        fetchReport({ startDate: "", endDate: "" });
    };

    const summaryCards = [
        { label: "Outstanding payable", value: money(totals.balance), detail: `${agingRows.length} supplier balance${agingRows.length === 1 ? "" : "s"}`, icon: WalletCards, tone: "primary" },
        { label: "Paid against invoices", value: money(totals.paidAmount), detail: `of LKR ${money(totals.invoiceAmount)} invoiced`, icon: ReceiptText, tone: "settled" },
        { label: "Over 90 days", value: money(totals.age90Plus), detail: `${percentage(totals.age90Plus)} of outstanding`, icon: Clock3, tone: "overdue" }
    ];

    return (
        <main className="payables-page bg-white min-vh-100">
            <header className="payables-header no-print">
                <div className="payables-heading-group">
                    <button type="button" className="payables-back" onClick={() => navigate(-1)} aria-label="Back to previous page"><ArrowLeft size={18} /></button>
                    <div>
                        <span className="payables-eyebrow">Sales &amp; Finance</span>
                        <h1>Supplier payables</h1>
                        <p>Review outstanding supplier balances and identify aging exposure before payment planning.</p>
                    </div>
                </div>
                <Button variant="outline-primary" onClick={() => window.print()}><Printer size={16} />Print / PDF</Button>
            </header>

            <section className="payables-filter-panel no-print" aria-labelledby="payables-filter-heading">
                <div className="payables-filter-intro">
                    <span className="payables-filter-icon" aria-hidden="true"><CalendarRange size={19} /></span>
                    <div><h2 id="payables-filter-heading">Due-date range</h2><p>Use invoice due dates to focus the aging view.</p></div>
                </div>
                <Row className="align-items-end g-3 payables-filter-row">
                    <Col lg={3} md={4}>
                        <Form.Group>
                            <Form.Label>Start Due Date</Form.Label>
                            <SafeDatePicker name="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4}>
                        <Form.Group>
                            <Form.Label>End Due Date</Form.Label>
                            <SafeDatePicker name="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col lg={3} md={4}>
                        <div className="payables-filter-actions">
                            <Button variant="primary" onClick={fetchReport} disabled={loading}><RefreshCw size={16} className={loading ? "payables-spin" : ""} />{loading ? "Filtering" : "Apply range"}</Button>
                            <Button variant="outline-secondary" onClick={clearFilters} disabled={loading}>Clear</Button>
                        </div>
                    </Col>
                </Row>
                <div className="payables-quick-ranges">
                    <span>Quick due range</span>
                    <QuickDateRangeButtons mode="future" onSelect={applyQuickRange} />
                </div>
            </section>

            {error && <div className="payables-error no-print" role="alert"><AlertCircle size={20} /><div><strong>Payables unavailable</strong><span>{error}</span></div><Button variant="outline-danger" size="sm" onClick={() => fetchReport()}>Retry</Button></div>}

            {!loading && !error && <section className="payables-summary no-print" aria-label="Payables exposure summary">
                {summaryCards.map(({ label, value, detail, icon: Icon, tone }) => <article className={`payables-summary-card payables-summary-card--${tone}`} key={label}><div><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><small>{detail}</small></article>)}
            </section>}

            {loading ? <div className="payables-loading no-print" role="status" aria-label="Loading supplier payables"><Spinner animation="border" /><span>Loading supplier payables…</span></div> : (
                <div className="payables-report-canvas" role="region" aria-label="Supplier aging report" tabIndex="0">
                <ReportLayout title="Supplier Aging Details" orientation="landscape">
                    <div className="mb-3 small">
                        <div><strong>Aged as of:</strong> {asOfDate.toLocaleDateString()}</div>
                        <div><strong>Aged by:</strong> Due Date</div>
                        <div><strong>Due Date Filter:</strong> {startDate || "Beginning"} to {endDate || "Now"}</div>
                        <div><strong>All Amounts in LKR</strong></div>
                    </div>
                    <Table bordered responsive size="sm" className="aging-report-table">
                        <thead className="table-light">
                            <tr>
                                <th>Invoice Numbers</th>
                                <th>Invoice Files</th>
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
                                <tr><td colSpan="13" className="text-center">No records found</td></tr>
                            ) : (
                                agingRows.map((item, i) => (
                                    <tr key={i}>
                                        <td className="text-wrap">{invoiceNumberList(item)}</td>
                                        <td className="text-wrap">{documentLinks(item.documents)}</td>
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
                                <td colSpan="6" className="text-end">TOTAL PAYABLE</td>
                                <td className="text-end">{money(totals.invoiceAmount)}</td>
                                <td className="text-end">{money(totals.paidAmount)}</td>
                                <td className="text-end">{money(totals.balance)}</td>
                                {agingBuckets.map(bucket => (
                                    <td key={bucket.key} className="text-end">{money(totals[bucket.key])}</td>
                                ))}
                            </tr>
                            <tr className="fw-semibold">
                                <td colSpan="9" className="text-end">AGING %</td>
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
                        .aging-report-table .text-wrap {
                            white-space: normal;
                            min-width: 120px;
                        }
                    `}</style>
                </ReportLayout>
                </div>
            )}
        </main>
    );
};

export default PayablesReport;
