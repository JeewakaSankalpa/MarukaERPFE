import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, Boxes, CalendarClock,
    CheckCircle2, CircleDollarSign, Clock3, PackagePlus, RefreshCw, Truck, WalletCards
} from "lucide-react";
import {
    Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis
} from "recharts";
import api from "../../api/api";
import "./ExecutiveDashboard.css";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
})}`;
const number = (value) => Number(value || 0).toLocaleString("en-LK");
const date = (value) => value ? new Date(value).toLocaleDateString("en-LK", {
    day: "2-digit", month: "short", year: "numeric"
}) : "Not set";
const label = (value) => String(value || "Unknown").replace(/_/g, " ");
const AUTO_REFRESH_MS = 60_000;

const ExecutiveDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [accessDenied, setAccessDenied] = useState(false);

    const load = useCallback(async ({ background = false } = {}) => {
        if (accessDenied) return;
        try {
            if (!background) {
                setLoading(true);
                setError("");
            }
            const response = await api.get("/executive-dashboard");
            setData(response.data);
            setError("");
            setAccessDenied(false);
        } catch (requestError) {
            const forbidden = requestError.response?.status === 403;
            if (forbidden) {
                setAccessDenied(true);
                setError("Administrator access is required. Please sign in again with an administrator account.");
            } else if (!background) {
                setError("The executive summary could not be loaded.");
            }
        } finally {
            if (!background) setLoading(false);
        }
    }, [accessDenied]);

    useEffect(() => {
        load();
        const refresh = () => load({ background: true });
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === "visible") refresh();
        }, AUTO_REFRESH_MS);
        const handleVisibility = () => {
            if (document.visibilityState === "visible") refresh();
        };
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [load]);

    const alerts = useMemo(() => data ? [
        {
            level: data.finance.overdueClientCount > 0 ? "critical" : "clear",
            title: "Overdue client payments",
            value: data.finance.overdueClientCount,
            detail: money(data.finance.overdueClientTotal),
            path: "/reports/receivables"
        },
        {
            level: data.projects.overdueTaskCount > 0 ? "critical" : "clear",
            title: "Overdue tasks",
            value: data.projects.overdueTaskCount,
            detail: "Across all projects and users",
            path: "/reports/all-tasks"
        },
        {
            level: data.inventory.lowStockCount > 0 ? "warning" : "clear",
            title: "Low stock items",
            value: data.inventory.lowStockCount,
            detail: "Below reorder level",
            path: "/inventory/dashboard"
        },
        {
            level: data.finance.pendingSupplierCount > 0 ? "warning" : "clear",
            title: "Pending supplier payments",
            value: data.finance.pendingSupplierCount,
            detail: money(data.finance.pendingSupplierTotal),
            path: "/reports/payables"
        }
    ] : [], [data]);

    if (loading && !data) return <ExecutiveSkeleton />;
    if (error && !data) return (
        <main className="executive-dashboard">
            <div className="executive-error">
                <AlertTriangle size={28} />
                <h2>Executive dashboard unavailable</h2>
                <p>{error}</p>
                <button type="button" onClick={load}>Try again</button>
            </div>
        </main>
    );

    const { finance, inventory, projects } = data;
    const taskChart = mergeSeries(projects.activeTasksByProject, projects.overdueTasksByProject);
    const cashFlow = [
        { name: "Client receipts", value: Number(finance.clientReceivedToday || 0), color: "#16835b" },
        { name: "Supplier payments", value: Number(finance.supplierPaidToday || 0), color: "#d14d3f" }
    ];

    return (
        <main className="executive-dashboard">
            <header className="executive-header">
                <div>
                    <p className="executive-context">Admin view</p>
                    <h1>Executive Dashboard</h1>
                    <p>Daily financial position, inventory movement, and project exceptions in one view.</p>
                </div>
                <button className="executive-refresh" type="button" onClick={() => load()} disabled={loading}>
                    <RefreshCw size={17} className={loading ? "is-spinning" : ""} />
                    Refresh data
                </button>
            </header>

            {data.warnings?.length > 0 && (
                <section className="executive-data-warning" role="alert">
                    <AlertTriangle size={19} />
                    <div>
                        <strong>Some dashboard data could not be loaded</strong>
                        <p>{data.warnings.map(warning => warning.message).join(" ")}</p>
                    </div>
                </section>
            )}

            <section className="attention-strip" aria-label="Items requiring attention">
                <div className="attention-heading">
                    <div>
                        <h2>Needs attention</h2>
                        <p>Open exceptions that may affect cash flow or delivery.</p>
                    </div>
                    <span>{alerts.filter(item => item.level !== "clear").length} active</span>
                </div>
                <div className="attention-grid">
                    {alerts.map(item => (
                        <button key={item.title} className={`attention-item ${item.level}`} onClick={() => navigate(item.path)}>
                            {item.level === "clear" ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
                            <span>
                                <strong>{item.title}</strong>
                                <small>{item.detail}</small>
                            </span>
                            <b>{item.value}</b>
                        </button>
                    ))}
                </div>
            </section>

            <DashboardSection title="Finance" subtitle="Today’s movement and current exposure">
                <div className="metric-row">
                    <Metric icon={<ArrowUpRight />} tone="positive" label="Client payments received today"
                        value={money(finance.clientReceivedToday)} />
                    <Metric icon={<ArrowDownRight />} tone="negative" label="Supplier payments today"
                        value={money(finance.supplierPaidToday)} />
                    <Metric icon={<CircleDollarSign />} tone={finance.netToday >= 0 ? "positive" : "negative"}
                        label="Net cash movement today" value={money(finance.netToday)} />
                    <Metric icon={<WalletCards />} tone="neutral" label="Active account balances"
                        value={finance.accounts.length} suffix="accounts" />
                </div>

                <div className="executive-grid finance-grid">
                    <Panel title="Cash movement today" subtitle="Client receipts compared with supplier payments">
                        <ChartEmpty data={cashFlow}>
                            <ResponsiveContainer width="100%" height={245}>
                                <BarChart data={cashFlow} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                                    <CartesianGrid stroke="#e8edf3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={compactMoney} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={value => money(value)} cursor={{ fill: "#f4f7fa" }} />
                                    <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={72}>
                                        {cashFlow.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartEmpty>
                    </Panel>
                    <Panel title="Account balances" subtitle="Individual cash, bank, card, and operating accounts" action="Open accounts"
                        onAction={() => navigate("/finance/accounts")}>
                        <div className="balance-list">
                            {finance.accounts.length === 0 ? <Empty text="No active leaf accounts found." /> :
                                finance.accounts.map(account => (
                                    <div className="balance-row" key={account.id}>
                                        <span><strong>{account.name}</strong><small>{account.code} · {label(account.paymentAccountType || account.type)}</small></span>
                                        <b className={Number(account.balance) < 0 ? "negative-text" : ""}>{money(account.balance)}</b>
                                    </div>
                                ))}
                        </div>
                    </Panel>
                </div>

                <div className="executive-grid two-column">
                    <DataTable title="Pending supplier payments" rows={finance.pendingSuppliers}
                        totalCount={finance.pendingSupplierCount}
                        columns={[
                            ["Supplier", row => row.name],
                            ["Invoice", row => row.reference || "Not set"],
                            ["Due", row => date(row.dueDate)],
                            ["Outstanding", row => money(row.amount)]
                        ]} onOpen={() => navigate("/reports/payables")} />
                    <DataTable title="Overdue client payments" rows={finance.overdueClients}
                        totalCount={finance.overdueClientCount}
                        columns={[
                            ["Client / project", row => <><strong>{row.name}</strong><small>{row.projectName}</small></>],
                            ["Invoice", row => row.reference || "Not set"],
                            ["Overdue", row => `${row.daysOverdue} days`],
                            ["Outstanding", row => money(row.amount)]
                        ]} onOpen={() => navigate("/reports/receivables")} danger />
                </div>
            </DashboardSection>

            <DashboardSection title="Inventory" subtitle="Stock health and today’s material movement">
                <div className="metric-row">
                    <Metric icon={<Boxes />} tone={inventory.lowStockCount ? "warning" : "positive"}
                        label="Low stock items" value={number(inventory.lowStockCount)} />
                    <Metric icon={<Banknote />} tone="neutral" label="Total stock value" value={money(inventory.totalStockValue)} />
                    <Metric icon={<PackagePlus />} tone="positive" label="New stock added today"
                        value={number(inventory.newStockQty)} suffix={money(inventory.newStockValue)} />
                    <Metric icon={<ArrowDownRight />} tone="neutral" label="Consumed today"
                        value={number(inventory.consumptionTodayQty)} suffix={money(inventory.consumptionTodayValue)} />
                </div>

                <div className="executive-grid inventory-grid">
                    <Panel title="Consumption by project" subtitle="Material value consumed today">
                        <ChartEmpty data={inventory.consumptionByProject}>
                            <ResponsiveContainer width="100%" height={270}>
                                <BarChart data={inventory.consumptionByProject.slice(0, 8)} layout="vertical"
                                    margin={{ top: 4, right: 16, left: 18, bottom: 0 }}>
                                    <CartesianGrid stroke="#e8edf3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={compactMoney} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="projectName" type="category" width={115} tick={{ fontSize: 11, fill: "#475569" }}
                                        tickFormatter={truncate} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={value => money(value)} />
                                    <Bar dataKey="value" name="Consumed value" fill="#3157a4" radius={[0, 5, 5, 0]} maxBarSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartEmpty>
                    </Panel>
                    <DataTable title="Low stock" rows={inventory.lowStockItems}
                        totalCount={inventory.lowStockCount}
                        columns={[
                            ["Item", row => row.productName],
                            ["On hand", row => number(row.currentQty)],
                            ["Reorder at", row => number(row.reorderLevel)]
                        ]} onOpen={() => navigate("/inventory/dashboard")} danger />
                    <DataTable title="Stock added today" rows={inventory.newStockItems}
                        columns={[
                            ["Item", row => row.productName],
                            ["Qty", row => number(row.quantity)],
                            ["Value", row => money(row.value)]
                        ]} onOpen={() => navigate("/grns")} />
                </div>
            </DashboardSection>

            <DashboardSection title="Projects" subtitle="Pipeline, transitions, commitments, and task load">
                <div className="metric-row">
                    <Metric icon={<CircleDollarSign />} tone="neutral" label="New inquiries, last 7 days"
                        value={projects.newInquiryCount} />
                    <Metric icon={<CalendarClock />} tone={projects.upcomingDeadlineCount ? "warning" : "positive"}
                        label="Deadlines, next 14 days" value={projects.upcomingDeadlineCount} />
                    <Metric icon={<Truck />} tone={projects.upcomingDeliveryCount ? "neutral" : "positive"}
                        label="Deliveries, next 14 days" value={projects.upcomingDeliveryCount} />
                    <Metric icon={<Clock3 />} tone={projects.overdueTaskCount ? "negative" : "positive"}
                        label="Overdue tasks" value={projects.overdueTaskCount} />
                </div>

                <div className="executive-grid projects-grid">
                    <Panel title="Task load by project" subtitle="All open tasks and the overdue portion">
                        <ChartEmpty data={taskChart}>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={taskChart} margin={{ top: 8, right: 12, left: 0, bottom: 34 }}>
                                    <CartesianGrid stroke="#e8edf3" vertical={false} />
                                    <XAxis dataKey="name" angle={-22} textAnchor="end" height={55}
                                        tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Bar dataKey="activeTasks" name="Open tasks" fill="#3157a4" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="overdue" name="Overdue" fill="#d14d3f" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartEmpty>
                        <div className="chart-legend"><span className="blue-dot">Open tasks</span><span className="red-dot">Overdue</span></div>
                    </Panel>
                    <Panel title="Transition summary" subtitle="Project workflow changes in the last 7 days">
                        <ChartEmpty data={projects.transitionSummary}>
                            <ResponsiveContainer width="100%" height={235}>
                                <PieChart>
                                    <Pie data={projects.transitionSummary} dataKey="count" nameKey="name" innerRadius={55}
                                        outerRadius={88} paddingAngle={3}>
                                        {projects.transitionSummary.map((entry, index) =>
                                            <Cell key={entry.name} fill={["#3157a4", "#16835b", "#d99a2b", "#7c5aa6", "#d14d3f"][index % 5]} />
                                        )}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartEmpty>
                        <div className="transition-key">
                            {projects.transitionSummary.slice(0, 5).map((item, index) => (
                                <span key={item.name}><i style={{ background: ["#3157a4", "#16835b", "#d99a2b", "#7c5aa6", "#d14d3f"][index % 5] }} />
                                    {item.name} <b>{item.count}</b></span>
                            ))}
                        </div>
                    </Panel>
                </div>

                <div className="executive-grid three-column">
                    <DataTable title="Upcoming deadlines" rows={projects.upcomingDeadlines}
                        columns={[["Project", row => row.name], ["Stage", row => label(row.stage || row.status)], ["Due", row => date(row.date)]]}
                        onOpen={() => navigate("/projects/search")} />
                    <DataTable title="Upcoming deliveries" rows={projects.upcomingDeliveries}
                        columns={[["Project", row => row.projectName], ["Status", row => label(row.status)], ["Date", row => date(row.date)]]}
                        onOpen={() => navigate("/projects/search")} />
                    <DataTable title="Overdue tasks" rows={projects.overdueTasks}
                        totalCount={projects.overdueTaskCount}
                        columns={[
                            ["Task", row => <><strong>{row.name}</strong><small>{row.projectName}</small></>],
                            ["Owner", row => row.assignee],
                            ["Due", row => date(row.dueDate)]
                        ]} onOpen={() => navigate("/reports/all-tasks")} danger />
                </div>
            </DashboardSection>

            <footer className="executive-footer">
                Updates automatically every minute. Last refreshed {new Date(data.generatedAt).toLocaleString("en-LK")}
            </footer>
        </main>
    );
};

const DashboardSection = ({ title, subtitle, children }) => (
    <section className="dashboard-section">
        <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
        {children}
    </section>
);

const Metric = ({ icon, tone, label: metricLabel, value, suffix }) => (
    <div className={`executive-metric ${tone}`}>
        <span className="metric-icon">{icon}</span>
        <div><p>{metricLabel}</p><strong>{value}</strong>{suffix && <small>{suffix}</small>}</div>
    </div>
);

const Panel = ({ title, subtitle, action, onAction, children }) => (
    <article className="executive-panel">
        <div className="panel-heading">
            <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
            {action && <button type="button" onClick={onAction}>{action}</button>}
        </div>
        {children}
    </article>
);

const DataTable = ({ title, rows = [], totalCount, columns, onOpen, danger = false }) => {
    const count = totalCount ?? rows.length;
    const recordSummary = rows.length < count
        ? `Showing ${rows.length} of ${count} records`
        : `${count} record${count === 1 ? "" : "s"}`;
    return (
    <article className={`executive-panel executive-table-panel ${danger ? "danger-panel" : ""}`}>
        <div className="panel-heading">
            <div><h3>{title}</h3><p>{recordSummary}</p></div>
            <button type="button" onClick={onOpen}>View all</button>
        </div>
        {rows.length === 0 ? <Empty text="Nothing requires attention here." positive /> : (
            <div className="table-scroll"><table><thead><tr>{columns.map(([heading]) => <th key={heading}>{heading}</th>)}</tr></thead>
                <tbody>{rows.map((row, index) => <tr key={row.id || `${title}-${index}`}>
                    {columns.map(([heading, render]) => <td key={heading}>{render(row)}</td>)}
                </tr>)}</tbody></table></div>
        )}
    </article>
    );
};

const Empty = ({ text, positive = false }) => (
    <div className={`executive-empty ${positive ? "positive" : ""}`}>
        {positive ? <CheckCircle2 size={22} /> : <Boxes size={22} />}<span>{text}</span>
    </div>
);

const ChartEmpty = ({ data, children }) => data?.some(item =>
    Object.entries(item || {}).some(([key, value]) => key !== "name" && Number(value) > 0)
)
    ? children : <Empty text="No activity to chart for this period." />;

const ExecutiveSkeleton = () => (
    <main className="executive-dashboard executive-skeleton">
        <div className="skeleton-block title" />
        <div className="skeleton-block attention" />
        <div className="skeleton-row">{[1, 2, 3, 4].map(item => <div className="skeleton-block metric" key={item} />)}</div>
        <div className="skeleton-row panels">{[1, 2].map(item => <div className="skeleton-block panel" key={item} />)}</div>
    </main>
);

const compactMoney = value => {
    const amount = Number(value || 0);
    if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}m`;
    if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return amount;
};
const truncate = value => String(value || "").length > 18 ? `${String(value).slice(0, 18)}…` : value;
const mergeSeries = (activeItems = [], overdueItems = []) => {
    const merged = new Map();
    activeItems.forEach(item => merged.set(item.name, { name: item.name, activeTasks: item.count, overdue: 0 }));
    overdueItems.forEach(item => {
        const current = merged.get(item.name) || { name: item.name, activeTasks: 0, overdue: 0 };
        current.overdue = item.count;
        merged.set(item.name, current);
    });
    return [...merged.values()].sort((a, b) => (b.overdue + b.activeTasks) - (a.overdue + a.activeTasks)).slice(0, 8);
};

export default ExecutiveDashboard;
