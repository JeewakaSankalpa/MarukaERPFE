import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { ArrowLeft, Printer, RotateCcw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
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

const count = (value) => Number(value || 0).toLocaleString();

const compactMoney = (value) => {
    const amount = Number(value || 0);
    const absolute = Math.abs(amount);
    if (absolute >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
    if (absolute >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
    return count(amount);
};

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
    const [showIncludedValues, setShowIncludedValues] = useState(false);

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
    const summary = useMemo(() => report.summary || {}, [report.summary]);
    const pipelineData = useMemo(() => [
        { name: "New inquiries", value: Number(summary.inquiryCreatedCount || 0), color: "#d99a2b" },
        { name: "Still inquiries", value: Number(summary.openInquiryCount || 0), color: "#64748b" },
        { name: "Recorded conversions", value: Number(summary.convertedInquiryCount || 0), color: "#16835b" },
        { name: "Jobs gained", value: Number(summary.jobCreatedCount || 0), color: "#3157a4" }
    ], [summary]);
    const financialData = useMemo(() => [
        { name: "Open inquiry value", value: Number(summary.inquiryValue || 0), color: "#d99a2b" },
        { name: "Job value gained", value: Number(summary.jobValue || 0), color: "#3157a4" },
        { name: "Cash received", value: Number(summary.cashReceived || 0), color: "#16835b" },
        { name: "Expenses", value: Number(summary.expenses || 0), color: "#d14d3f" },
        { name: "Net profit", value: Number(summary.netProfit || 0), color: "#173a63" }
    ], [summary]);
    const hasPipelineActivity = pipelineData.some(item => item.value !== 0);
    const hasFinancialActivity = financialData.some(item => item.value !== 0);

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
                <div className="d-flex align-items-center justify-content-between gap-3 mt-3 flex-wrap">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="text-muted small fw-semibold">Quick range:</span>
                        <QuickDateRangeButtons onSelect={applyQuickRange} />
                    </div>
                    <Form.Check
                        type="checkbox"
                        id="show-included-values"
                        className="small fw-semibold"
                        label="Show included value breakdown"
                        checked={showIncludedValues}
                        onChange={event => setShowIncludedValues(event.target.checked)}
                    />
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
                        {showIncludedValues && (
                            <div>
                                <span>Included Values</span>
                                <strong>{money(summary.includedTotal)}</strong>
                            </div>
                        )}
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

                    <div className="sales-visual-grid mb-3">
                        <section className="sales-visual-panel" aria-labelledby="pipeline-activity-heading">
                            <div className="sales-visual-heading">
                                <div>
                                    <h5 id="pipeline-activity-heading">Pipeline Activity</h5>
                                    <p>Inquiry intake and job conversions recorded in the selected period.</p>
                                </div>
                                <strong>{count(summary.jobCreatedCount)} jobs</strong>
                            </div>
                            {hasPipelineActivity ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={pipelineData} layout="vertical" margin={{ top: 8, right: 42, left: 18, bottom: 2 }}>
                                        <CartesianGrid stroke="#e5eaf1" horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={132}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#526176", fontSize: 11 }}
                                        />
                                        <Tooltip formatter={value => [count(value), "Records"]} cursor={{ fill: "#f3f6fa" }} />
                                        <Bar dataKey="value" name="Records" radius={[0, 4, 4, 0]} maxBarSize={26}>
                                            {pipelineData.map(item => <Cell key={item.name} fill={item.color} />)}
                                            <LabelList dataKey="value" position="right" fill="#172033" fontSize={11} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="sales-chart-empty">No inquiry or job activity for this period.</div>
                            )}
                            <div className="sales-visual-note">
                                New inquiries includes every inquiry opened in the period, even if later converted. Recorded conversions use a customer PO audit or linked quotation; jobs gained also includes legacy dated jobs.
                            </div>
                        </section>

                        <section className="sales-visual-panel" aria-labelledby="revenue-movement-heading">
                            <div className="sales-visual-heading">
                                <div>
                                    <h5 id="revenue-movement-heading">Revenue Movement</h5>
                                    <p>Value gained, collected, spent, and retained in the selected period.</p>
                                </div>
                                <strong>{money(summary.netProfit)}</strong>
                            </div>
                            {hasFinancialActivity ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={financialData} layout="vertical" margin={{ top: 8, right: 18, left: 18, bottom: 2 }}>
                                        <CartesianGrid stroke="#e5eaf1" horizontal={false} />
                                        <XAxis type="number" tickFormatter={compactMoney} axisLine={false} tickLine={false} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={132}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#526176", fontSize: 11 }}
                                        />
                                        <Tooltip formatter={value => [money(value), "Value"]} cursor={{ fill: "#f3f6fa" }} />
                                        <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                                            {financialData.map(item => <Cell key={item.name} fill={item.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="sales-chart-empty">No financial activity for this period.</div>
                            )}
                        </section>
                    </div>

                    <div className="mb-3 small">
                        <div><strong>Job value date:</strong> Customer PO audit date, quotation date, or project update fallback.</div>
                        <div><strong>Cash/expense date:</strong> Each payment or expense transaction date.</div>
                        {showIncludedValues && (
                            <div><strong>Included values:</strong> Delivery + freight + tax minus discount, from latest estimation or quotation totals.</div>
                        )}
                    </div>

                    <Table
                        bordered
                        size="sm"
                        responsive
                        className={`sales-revenue-table ${showIncludedValues ? "show-included-values" : ""}`}
                    >
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
                                {showIncludedValues && (
                                    <>
                                        <th className="text-end">Value Before Included</th>
                                        <th className="text-end">Delivery</th>
                                        <th className="text-end">Freight</th>
                                        <th className="text-end">Tax</th>
                                        <th className="text-end">Discount</th>
                                        <th className="text-end">Included Value</th>
                                    </>
                                )}
                                <th className="text-end">Cash Received</th>
                                <th className="text-end">Expenses</th>
                                <th className="text-end">Net Profit</th>
                                <th className="text-end">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={showIncludedValues ? 20 : 14} className="text-center text-muted py-4">No records found for this range.</td>
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
                                    {showIncludedValues && (
                                        <>
                                            <td className="text-end">{money(row.valueBeforeIncluded)}</td>
                                            <td className="text-end">{money(row.includedDeliveryValue)}</td>
                                            <td className="text-end">{money(row.includedFreightValue)}</td>
                                            <td className="text-end">{money(row.includedTaxValue)}</td>
                                            <td className="text-end">{money(row.includedDiscountValue)}</td>
                                            <td className="text-end fw-semibold">{money(row.includedValueTotal)}</td>
                                        </>
                                    )}
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
                                {showIncludedValues && (
                                    <>
                                        <td></td>
                                        <td className="text-end">{money(summary.includedDelivery)}</td>
                                        <td className="text-end">{money(summary.includedFreight)}</td>
                                        <td className="text-end">{money(summary.includedTax)}</td>
                                        <td className="text-end">{money(summary.includedDiscount)}</td>
                                        <td className="text-end">{money(summary.includedTotal)}</td>
                                    </>
                                )}
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
                            grid-template-columns: repeat(${showIncludedValues ? 6 : 5}, minmax(140px, 1fr));
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
                        .sales-visual-grid {
                            display: grid;
                            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                            gap: 14px;
                        }
                        .sales-visual-panel {
                            min-width: 0;
                            border: 1px solid #dbe3ef;
                            border-radius: 8px;
                            padding: 14px 16px 10px;
                            background: #fbfdff;
                        }
                        .sales-visual-heading {
                            display: flex;
                            align-items: flex-start;
                            justify-content: space-between;
                            gap: 16px;
                            min-height: 54px;
                        }
                        .sales-visual-heading h5 {
                            margin: 0 0 3px;
                            color: #172033;
                            font-size: 15px;
                        }
                        .sales-visual-heading p,
                        .sales-visual-note {
                            margin: 0;
                            color: #526176;
                            font-size: 11px;
                            line-height: 1.45;
                        }
                        .sales-visual-heading strong {
                            flex: 0 0 auto;
                            color: #173a63;
                            font-size: 14px;
                            text-align: right;
                        }
                        .sales-visual-note {
                            border-top: 1px solid #e5eaf1;
                            padding-top: 8px;
                        }
                        .sales-chart-empty {
                            display: grid;
                            place-items: center;
                            height: 250px;
                            color: #64748b;
                            font-size: 12px;
                            background: #f7f9fc;
                            border: 1px dashed #cbd5e1;
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
                            .sales-visual-grid {
                                grid-template-columns: minmax(0, 1fr);
                            }
                        }
                        @media print {
                            .sales-revenue-metrics {
                                grid-template-columns: repeat(${showIncludedValues ? 6 : 5}, minmax(0, 1fr));
                            }
                            .sales-revenue-table.show-included-values th,
                            .sales-revenue-table.show-included-values td {
                                font-size: 8px;
                                padding: 3px !important;
                            }
                            .sales-visual-grid {
                                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                            .sales-visual-panel {
                                box-shadow: none !important;
                            }
                        }
                    `}</style>
                </ReportLayout>
            )}
        </div>
    );
}
