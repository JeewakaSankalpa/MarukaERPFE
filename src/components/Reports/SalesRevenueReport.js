import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { ArrowLeft, Printer, RotateCcw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import ReportLayout from "../ReusableComponents/ReportLayout";
import SafeDatePicker from "../ReusableComponents/SafeDatePicker";
import SafeSelect from "../ReusableComponents/SafeSelect";
import QuickDateRangeButtons from "../ReusableComponents/QuickDateRangeButtons";

const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const todayInput = () => toDateInputValue(new Date());

const thirtyDaysAgoInput = () => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return toDateInputValue(date);
};

const money = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const dateText = (value) => value || "-";

export default function SalesRevenueReport() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState({ summary: {}, rows: [], salesReps: [], notes: [] });
    const [filters, setFilters] = useState({
        startDate: thirtyDaysAgoInput(),
        endDate: todayInput(),
        salesRepId: ""
    });

    const fetchReport = async (nextFilters = filters) => {
        setLoading(true);
        try {
            const params = {};
            if (nextFilters.startDate) params.startDate = nextFilters.startDate;
            if (nextFilters.endDate) params.endDate = nextFilters.endDate;
            if (nextFilters.salesRepId) params.salesRepId = nextFilters.salesRepId;
            const res = await api.get("/reports/sales-revenue", { params });
            setReport(res.data || { summary: {}, rows: [], salesReps: [], notes: [] });
        } catch (error) {
            toast.error("Failed to load sales revenue report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedRepName = useMemo(() => {
        if (!filters.salesRepId) return "All sales reps";
        return report.salesReps?.find(rep => rep.id === filters.salesRepId)?.name || "Selected sales rep";
    }, [filters.salesRepId, report.salesReps]);

    const updateFilter = (event) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyQuickRange = (range) => {
        const next = { ...filters, ...range };
        setFilters(next);
        fetchReport(next);
    };

    const clearFilters = () => {
        const next = { startDate: "", endDate: "", salesRepId: "" };
        setFilters(next);
        fetchReport(next);
    };

    const rows = report.rows || [];
    const summary = report.summary || {};

    return (
        <div className="p-4 bg-white min-vh-100 sales-revenue-report">
            <div className="d-flex justify-content-between align-items-start mb-3 no-print gap-3 flex-wrap">
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} className="me-1" />
                    Back
                </Button>
                <div>
                    <h4 className="mb-1">Sales Revenue Report</h4>
                    <div className="text-muted small">{selectedRepName}</div>
                </div>
                <Button variant="primary" onClick={() => window.print()}>
                    <Printer size={16} className="me-1" />
                    Print / PDF
                </Button>
            </div>

            <div className="mb-4 p-3 bg-light rounded no-print">
                <Row className="align-items-end g-3">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Start Date</Form.Label>
                            <SafeDatePicker name="startDate" value={filters.startDate} onChange={updateFilter} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>End Date</Form.Label>
                            <SafeDatePicker name="endDate" value={filters.endDate} onChange={updateFilter} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Sales Rep</Form.Label>
                            <SafeSelect name="salesRepId" value={filters.salesRepId} onChange={updateFilter}>
                                <option value="">All sales reps</option>
                                {(report.salesReps || []).map(rep => (
                                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                                ))}
                            </SafeSelect>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <div className="d-flex gap-2">
                            <Button variant="info" className="flex-grow-1" onClick={() => fetchReport()}>
                                <Search size={16} className="me-1" />
                                Filter
                            </Button>
                            <Button variant="outline-secondary" onClick={clearFilters} title="Clear filters">
                                <RotateCcw size={16} />
                            </Button>
                        </div>
                    </Col>
                </Row>
                <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
                    <span className="text-muted small fw-semibold">Quick range:</span>
                    <QuickDateRangeButtons onSelect={applyQuickRange} />
                </div>
            </div>

            {loading ? (
                <div className="text-center p-5"><Spinner animation="border" /></div>
            ) : (
                <ReportLayout
                    title="Sales Revenue Report"
                    subtitle={`${selectedRepName} | ${filters.startDate || "Beginning"} to ${filters.endDate || "Now"}`}
                    orientation="landscape"
                >
                    <div className="sales-revenue-metrics mb-3">
                        <div>
                            <span>Inquiry Value</span>
                            <strong>{money(summary.inquiryValue)}</strong>
                        </div>
                        <div>
                            <span>Job Value Gained</span>
                            <strong>{money(summary.jobValue)}</strong>
                        </div>
                        <div>
                            <span>Cash Received</span>
                            <strong>{money(summary.cashReceived)}</strong>
                        </div>
                        <div>
                            <span>Expenses</span>
                            <strong>{money(summary.expenses)}</strong>
                        </div>
                        <div>
                            <span>Net Profit</span>
                            <strong>{money(summary.netProfit)}</strong>
                        </div>
                    </div>

                    <div className="mb-3 small">
                        <div><strong>Job value date:</strong> Customer PO audit date, quotation date, or project update fallback.</div>
                        <div><strong>Cash/expense date:</strong> Each payment or expense transaction date.</div>
                    </div>

                    <Table bordered size="sm" responsive className="sales-revenue-table">
                        <thead className="table-light">
                            <tr>
                                <th>Project</th>
                                <th>Customer</th>
                                <th>Sales Rep</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Job Date</th>
                                <th>Date Source</th>
                                <th className="text-end">Project Value</th>
                                <th className="text-end">Inquiry Value</th>
                                <th className="text-end">Job Value</th>
                                <th className="text-end">Cash Received</th>
                                <th className="text-end">Expenses</th>
                                <th className="text-end">Net Profit</th>
                                <th className="text-end">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="text-center text-muted py-4">No records found for this range.</td>
                                </tr>
                            ) : rows.map(row => (
                                <tr key={row.projectId}>
                                    <td>
                                        <div className="fw-semibold">{row.projectNumber}</div>
                                        <div className="text-muted small">{row.projectName}</div>
                                    </td>
                                    <td>{row.customerName || "-"}</td>
                                    <td>{row.salesRepName}</td>
                                    <td>
                                        <Badge bg={row.isJob ? "success" : "secondary"}>{row.isJob ? "Job" : "Inquiry"}</Badge>
                                        <div className="text-muted small mt-1">{row.status}</div>
                                    </td>
                                    <td>{dateText(row.createdDate)}</td>
                                    <td>{dateText(row.jobDate)}</td>
                                    <td>{row.jobDateSource || "-"}</td>
                                    <td className="text-end">{money(row.projectValue)}</td>
                                    <td className="text-end">{money(row.inquiryValueInRange)}</td>
                                    <td className="text-end">{money(row.jobValueInRange)}</td>
                                    <td className="text-end">{money(row.cashReceivedInRange)}</td>
                                    <td className="text-end">{money(row.expensesInRange)}</td>
                                    <td className={`text-end fw-bold ${Number(row.netProfitInRange || 0) < 0 ? "text-danger" : "text-success"}`}>
                                        {money(row.netProfitInRange)}
                                    </td>
                                    <td className="text-end">{money(row.lifetimeBalance)}</td>
                                </tr>
                            ))}
                            <tr className="table-light fw-bold border-top border-dark">
                                <td colSpan="8" className="text-end">TOTAL</td>
                                <td className="text-end">{money(summary.inquiryValue)}</td>
                                <td className="text-end">{money(summary.jobValue)}</td>
                                <td className="text-end">{money(summary.cashReceived)}</td>
                                <td className="text-end">{money(summary.expenses)}</td>
                                <td className="text-end">{money(summary.netProfit)}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </Table>

                    <style>{`
                        .sales-revenue-metrics {
                            display: grid;
                            gap: 10px;
                            grid-template-columns: repeat(5, minmax(150px, 1fr));
                        }
                        .sales-revenue-metrics div {
                            border: 1px solid #dbe3ef;
                            border-radius: 8px;
                            padding: 10px 12px;
                            background: #f8fafc;
                        }
                        .sales-revenue-metrics span {
                            display: block;
                            color: #64748b;
                            font-size: 11px;
                            font-weight: 700;
                            text-transform: uppercase;
                        }
                        .sales-revenue-metrics strong {
                            display: block;
                            margin-top: 3px;
                            color: #172033;
                            font-size: 16px;
                            text-align: right;
                        }
                        .sales-revenue-table th,
                        .sales-revenue-table td {
                            font-size: 11px;
                            vertical-align: middle;
                            white-space: nowrap;
                        }
                        .sales-revenue-table td:first-child {
                            min-width: 170px;
                            white-space: normal;
                        }
                        @media (max-width: 991.98px) {
                            .sales-revenue-metrics {
                                grid-template-columns: repeat(2, minmax(0, 1fr));
                            }
                        }
                        @media print {
                            .sales-revenue-metrics {
                                grid-template-columns: repeat(5, minmax(0, 1fr));
                            }
                        }
                    `}</style>
                </ReportLayout>
            )}
        </div>
    );
}
