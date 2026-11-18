import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CalendarRange, Clock3, Printer, ReceiptText, RefreshCw, Search, UsersRound, WalletCards } from "lucide-react";
import { Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/api";
import QuickDateRangeButtons from "../../ReusableComponents/QuickDateRangeButtons";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import SafeDatePicker from "../../ReusableComponents/SafeDatePicker";
import "./ReceivablesReport.css";

const agingBuckets = [
    { key: "age0to30", label: "0-30 days" }, { key: "age30to60", label: "30-60 days" },
    { key: "age60to90", label: "60-90 days" }, { key: "age90Plus", label: "90+ days" }
];
const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReceivablesReport() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [customerName, setCustomerName] = useState("");

    const fetchReport = async (range = { startDate, endDate }, customerFilter = customerName) => {
        setLoading(true); setError("");
        try {
            const params = {};
            if (range.startDate) params.startDate = range.startDate;
            if (range.endDate) params.endDate = range.endDate;
            if (customerFilter) params.customerName = customerFilter;
            const response = await api.get("/reports/receivables", { params });
            setData(response.data || []);
        } catch (requestError) {
            toast.error("Failed to load receivables");
            setError("We couldn't load customer receivables. Check the filters and try again.");
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchReport();
        // The initial all-dates report should load once; later requests are user initiated.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyQuickRange = range => { setStartDate(range.startDate); setEndDate(range.endDate); fetchReport(range); };
    const clearFilters = () => { setStartDate(""); setEndDate(""); setCustomerName(""); fetchReport({ startDate: "", endDate: "" }, ""); };
    const asOfDate = new Date();
    const daysBetween = dateText => {
        if (!dateText) return 0;
        const due = new Date(`${dateText}T00:00:00`);
        if (Number.isNaN(due.getTime())) return 0;
        const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
        return Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    };
    const bucketKeyForAge = days => days <= 30 ? "age0to30" : days <= 60 ? "age30to60" : days <= 90 ? "age60to90" : "age90Plus";
    const agingRows = useMemo(() => data.map(item => {
        const balance = Number(item.balance || 0); const ageDays = daysBetween(item.endDate); const bucketKey = bucketKeyForAge(ageDays);
        return { ...item, balance, ageDays, age0to30: bucketKey === "age0to30" ? balance : 0, age30to60: bucketKey === "age30to60" ? balance : 0, age60to90: bucketKey === "age60to90" ? balance : 0, age90Plus: bucketKey === "age90Plus" ? balance : 0 };
    }), [data]); // eslint-disable-line react-hooks/exhaustive-deps
    const totals = useMemo(() => agingRows.reduce((accumulator, item) => {
        accumulator.totalAmount += Number(item.totalAmount || 0); accumulator.paidAmount += Number(item.paidAmount || 0); accumulator.balance += Number(item.balance || 0);
        agingBuckets.forEach(bucket => { accumulator[bucket.key] += Number(item[bucket.key] || 0); }); return accumulator;
    }, { totalAmount: 0, paidAmount: 0, balance: 0, age0to30: 0, age30to60: 0, age60to90: 0, age90Plus: 0 }), [agingRows]);
    const percentage = value => totals.balance > 0 ? `${((Number(value || 0) / totals.balance) * 100).toFixed(1)}%` : "0.0%";
    const customerCount = new Set(agingRows.map(item => item.customerName).filter(Boolean)).size;
    const summaryCards = [
        { label: "Outstanding receivable", value: money(totals.balance), detail: `${agingRows.length} open invoice${agingRows.length === 1 ? "" : "s"}`, icon: WalletCards, tone: "primary" },
        { label: "Paid against invoices", value: money(totals.paidAmount), detail: `of LKR ${money(totals.totalAmount)} invoiced`, icon: ReceiptText, tone: "settled" },
        { label: "Over 90 days", value: money(totals.age90Plus), detail: `${percentage(totals.age90Plus)} of outstanding`, icon: Clock3, tone: "overdue" },
        { label: "Customers represented", value: customerCount, detail: "in the current result", icon: UsersRound, tone: "customers" }
    ];

    return <main className="receivables-page bg-white min-vh-100">
        <header className="receivables-header no-print"><div className="receivables-heading-group"><button type="button" className="receivables-back" onClick={() => navigate(-1)} aria-label="Back to previous page"><ArrowLeft size={18} /></button><div><span className="receivables-eyebrow">Sales &amp; Finance</span><h1>Customer receivables</h1><p>Review unpaid customer invoices, collection exposure, and aging concentration before follow-up.</p></div></div><Button variant="outline-primary" onClick={() => window.print()}><Printer size={16} />Print / PDF</Button></header>
        <section className="receivables-filter-panel no-print" aria-labelledby="receivables-filter-heading"><div className="receivables-filter-intro"><span className="receivables-filter-icon" aria-hidden="true"><CalendarRange size={19} /></span><div><h2 id="receivables-filter-heading">Collection filters</h2><p>Focus the report by invoice due date or customer name.</p></div></div><Row className="align-items-end g-3 receivables-filter-row"><Col xl={3} md={4}><Form.Group><Form.Label>Start Due Date</Form.Label><SafeDatePicker name="startDate" value={startDate} onChange={event => setStartDate(event.target.value)} /></Form.Group></Col><Col xl={3} md={4}><Form.Group><Form.Label>End Due Date</Form.Label><SafeDatePicker name="endDate" value={endDate} onChange={event => setEndDate(event.target.value)} /></Form.Group></Col><Col xl={3} md={4}><Form.Group><Form.Label>Customer Name</Form.Label><div className="receivables-customer-search"><Search size={16} aria-hidden="true" /><Form.Control aria-label="Filter receivables by customer name" type="text" placeholder="Search by customer…" value={customerName} onChange={event => setCustomerName(event.target.value)} /></div></Form.Group></Col><Col xl={3}><div className="receivables-filter-actions"><Button variant="primary" onClick={fetchReport} disabled={loading}><RefreshCw size={16} className={loading ? "receivables-spin" : ""} />{loading ? "Filtering" : "Apply filters"}</Button><Button variant="outline-secondary" onClick={clearFilters} disabled={loading}>Clear</Button></div></Col></Row><div className="receivables-quick-ranges"><span>Quick due range</span><QuickDateRangeButtons mode="future" onSelect={applyQuickRange} /></div></section>
        {error && <div className="receivables-error no-print" role="alert"><AlertCircle size={20} /><div><strong>Receivables unavailable</strong><span>{error}</span></div><Button variant="outline-danger" size="sm" onClick={() => fetchReport()}>Retry</Button></div>}
        {!loading && !error && <section className="receivables-summary no-print" aria-label="Receivables exposure summary">{summaryCards.map(({ label, value, detail, icon: Icon, tone }) => <article className={`receivables-summary-card receivables-summary-card--${tone}`} key={label}><div><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><small>{detail}</small></article>)}</section>}
        {loading ? <div className="receivables-loading no-print" role="status" aria-label="Loading customer receivables"><Spinner animation="border" /><span>Loading customer receivables…</span></div> : <div className="receivables-report-canvas" role="region" aria-label="Customer aging report" tabIndex="0"><ReportLayout title="Customer Aging Details" orientation="landscape"><div className="mb-3 small"><div><strong>Aged as of:</strong> {asOfDate.toLocaleDateString()}</div><div><strong>Aged by:</strong> Due Date</div><div><strong>Due Date Filter:</strong> {startDate || "Beginning"} to {endDate || "Now"}</div><div><strong>All Amounts in LKR</strong></div></div><Table bordered responsive size="sm" className="aging-report-table"><thead className="table-light"><tr><th>Invoice #</th><th>Customer Name</th><th>Invoice Date</th><th>Due Date</th><th className="text-end">Age Days</th><th className="text-end">Total Amt</th><th className="text-end">Paid</th><th className="text-end">Remaining Amount</th>{agingBuckets.map(bucket => <th key={bucket.key} className="text-end">{bucket.label}</th>)}</tr></thead><tbody>{agingRows.length === 0 ? <tr><td colSpan="12" className="text-center">No records found</td></tr> : agingRows.map((item, index) => <tr key={index}><td>{item.invoiceNumber}</td><td>{item.customerName}</td><td>{item.startDate}</td><td>{item.endDate}</td><td className="text-end">{item.ageDays}</td><td className="text-end">{money(item.totalAmount)}</td><td className="text-end">{money(item.paidAmount)}</td><td className="text-end fw-bold">{money(item.balance)}</td>{agingBuckets.map(bucket => <td key={bucket.key} className="text-end">{item[bucket.key] ? money(item[bucket.key]) : "0.00"}</td>)}</tr>)}<tr className="table-light fw-bold border-top border-dark"><td colSpan="5" className="text-end">TOTAL RECEIVABLE</td><td className="text-end">{money(totals.totalAmount)}</td><td className="text-end">{money(totals.paidAmount)}</td><td className="text-end">{money(totals.balance)}</td>{agingBuckets.map(bucket => <td key={bucket.key} className="text-end">{money(totals[bucket.key])}</td>)}</tr><tr className="fw-semibold"><td colSpan="8" className="text-end">AGING %</td>{agingBuckets.map(bucket => <td key={bucket.key} className="text-end">{percentage(totals[bucket.key])}</td>)}</tr></tbody></Table><style>{`.aging-report-table th,.aging-report-table td{font-size:11px;white-space:nowrap;vertical-align:middle}`}</style></ReportLayout></div>}
    </main>;
}
