import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, FileClock, FileText, GitBranch, RefreshCw, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import api from "../../api/api";
import "./ExecutiveDashboard.css";
import "./ProjectSummaryDashboard.css";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
const number = (value) => Number(value || 0).toLocaleString("en-LK");
const dateTime = (value) => value ? new Date(value).toLocaleString("en-LK", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
}) : "Not recorded";
const dateOnly = (value) => value ? new Date(value).toLocaleDateString("en-LK", {
    day: "2-digit", month: "short", year: "numeric"
}) : "Not set";
const label = (value) => String(value || "Unknown").replace(/_/g, " ");
const AUTO_REFRESH_MS = 60_000;

const ProjectSummaryDashboard = () => {
    const [data, setData] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async (projectId, { background = false, detailOnly = false } = {}) => {
        try {
            if (detailOnly) {
                setDetailLoading(true);
                setError("");
            } else if (!background) {
                setLoading(true);
                setError("");
            }
            const response = await api.get("/project-summary-dashboard", {
                params: projectId ? { projectId } : {}
            });
            setData(response.data);
            setSelectedProjectId(response.data.selectedProjectId || "");
        } catch (requestError) {
            const forbidden = requestError.response?.status === 403;
            setError(forbidden
                ? "Administrator access is required to view the project summary dashboard."
                : "The project summary dashboard could not be loaded.");
        } finally {
            if (detailOnly) {
                setDetailLoading(false);
            } else if (!background) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") load(selectedProjectId, { background: true });
        };
        const intervalId = window.setInterval(refresh, AUTO_REFRESH_MS);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [load, selectedProjectId]);

    const filteredProjects = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const projects = data?.projects || [];
        if (!needle) return projects;
        return projects.filter(project => [
            project.name, project.reference, project.customer, project.status, project.stage, project.createdBy
        ].some(value => String(value || "").toLowerCase().includes(needle)));
    }, [data, query]);

    const handleSelectProject = (projectId) => {
        if (projectId === selectedProjectId || detailLoading) return;
        setSelectedProjectId(projectId);
        load(projectId, { detailOnly: true });
    };

    if (loading && !data) return <ProjectSummarySkeleton />;
    if (error && !data) return (
        <main className="executive-dashboard">
            <div className="executive-error">
                <AlertTriangle size={28} />
                <h2>Project dashboard unavailable</h2>
                <p>{error}</p>
                <button type="button" onClick={() => load(selectedProjectId)}>Try again</button>
            </div>
        </main>
    );

    const detail = data?.detail;
    const summary = data?.summary || {};
    const statusData = summary.byStatus || [];

    return (
        <main className="executive-dashboard project-summary-dashboard">
            <header className="executive-header">
                <div>
                    <p className="executive-context">Admin view</p>
                    <h1>Project Summary Dashboard</h1>
                    <p>Project-by-project audit trail, approvals, documents, generated records, owners, and dates.</p>
                </div>
                <button className="executive-refresh" type="button" onClick={() => load(selectedProjectId)} disabled={loading}>
                    <RefreshCw size={17} className={loading ? "is-spinning" : ""} />
                    Refresh data
                </button>
            </header>

            {error && (
                <section className="executive-data-warning" role="alert">
                    <AlertTriangle size={19} />
                    <div><strong>Refresh failed</strong><p>{error}</p></div>
                </section>
            )}

            <section className="metric-row">
                <Metric icon={<FileClock />} tone="neutral" label="Total projects recorded" value={number(summary.totalProjects)} />
                <Metric icon={<GitBranch />} tone="positive" label="Active projects" value={number(summary.activeProjects)} />
                <Metric icon={<CheckCircle2 />} tone="positive" label="Completed projects" value={number(summary.completedProjects)} />
                <Metric icon={<CalendarDays />} tone={summary.overdueProjects ? "negative" : "positive"} label="Overdue projects" value={number(summary.overdueProjects)} />
            </section>

            <div className="project-summary-layout">
                <aside className="project-index executive-panel">
                    <div className="panel-heading">
                        <div><h3>Projects</h3><p>{filteredProjects.length} visible</p></div>
                    </div>
                    <label className="project-search">
                        <Search size={16} />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, customer, status" />
                    </label>
                    <div className="project-list">
                        {filteredProjects.map(project => (
                            <button
                                key={project.id}
                                className={project.id === selectedProjectId ? "selected" : ""}
                                type="button"
                                onClick={() => handleSelectProject(project.id)}
                            >
                                <span><strong>{project.name}</strong><small>{project.reference} - {project.customer || "No customer"}</small></span>
                                <b>{label(project.status)}</b>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="project-detail" aria-busy={detailLoading}>
                    {detailLoading ? <ProjectDetailLoading /> : !detail ? <Empty text="Select a project to inspect its complete project record." /> : (
                        <>
                            <ProjectHeader project={detail.project} />

                            <div className="executive-grid project-audit-grid">
                                <Panel title="Status mix" subtitle="All projects by current status">
                                    <ChartEmpty data={statusData}>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie data={statusData} dataKey="count" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3}>
                                                    {statusData.map((entry, index) => <Cell key={entry.name} fill={["#3157a4", "#16835b", "#d99a2b", "#7c5aa6", "#d14d3f"][index % 5]} />)}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartEmpty>
                                </Panel>
                                <Panel title="Selected project counts" subtitle="Everything recorded against this project">
                                    <div className="audit-count-grid">
                                        {Object.entries(detail.counts || {}).map(([key, value]) => (
                                            <span key={key}><strong>{number(value)}</strong><small>{label(key)}</small></span>
                                        ))}
                                    </div>
                                </Panel>
                            </div>

                            <Panel title="Complete timeline" subtitle="Created, updated, generated, uploaded, requested, approved, and paid events">
                                <Timeline events={detail.timeline || []} />
                            </Panel>

                            <section className="executive-grid two-column">
                                <WorkflowPanel stages={detail.workflow || []} />
                                <DataTable title="Tasks" rows={detail.tasks || []} columns={[
                                    ["Task", row => <><strong>{row.name}</strong><small>{row.description || row.priority}</small></>],
                                    ["Owner", row => row.assignedTo || "Unassigned"],
                                    ["Status", row => label(row.status)],
                                    ["Due", row => dateOnly(row.dueDate)]
                                ]} />
                            </section>

                            <section className="executive-grid two-column">
                                <DataTable title="Documents updated" rows={detail.files || []} columns={[
                                    ["Document", row => <><strong>{row.name}</strong><small>{row.docType || row.stage || "Project file"}</small></>],
                                    ["By", row => row.uploadedBy || "Unknown"],
                                    ["Version", row => row.version || "-"],
                                    ["Uploaded", row => dateTime(row.uploadedAt)]
                                ]} />
                                <DataTable title="Revision requests and approvals" rows={detail.revisions || []} columns={[
                                    ["Revision", row => <><strong>Revision {row.revisionNumber}</strong><small>{row.reason || "No reason recorded"}</small></>],
                                    ["Requested by", row => row.requestedBy || "Unknown"],
                                    ["Status", row => label(row.status)],
                                    ["Requested", row => dateTime(row.requestedAt)]
                                ]} />
                            </section>

                            <section className="executive-grid two-column">
                                <DataTable title="Generated invoices" rows={detail.invoices || []} columns={[
                                    ["Invoice", row => <><strong>{row.number}</strong><small>{label(row.type)}</small></>],
                                    ["By", row => row.createdBy || "Unknown"],
                                    ["Status", row => label(row.status)],
                                    ["Total", row => money(row.total)]
                                ]} />
                                <DataTable title="Payments recorded" rows={detail.payments || []} columns={[
                                    ["Payment", row => <><strong>{money(row.amount)}</strong><small>{row.reference || row.method || "No reference"}</small></>],
                                    ["By", row => row.addedBy || "Unknown"],
                                    ["Account", row => row.account || "-"],
                                    ["Recorded", row => dateTime(row.addedAt || row.paymentDate)]
                                ]} />
                            </section>

                            <section className="executive-grid two-column">
                                <DataTable title="Generated quotations" rows={detail.quotations || []} columns={[
                                    ["Quotation", row => <><strong>{row.number}</strong><small>{row.subject || `Revision ${row.revision}`}</small></>],
                                    ["By", row => row.createdBy || "Unknown"],
                                    ["Status", row => label(row.status)],
                                    ["Updated", row => dateTime(row.updatedAt || row.createdAt)]
                                ]} />
                                <DataTable title="Audit log" rows={detail.auditLogs || []} columns={[
                                    ["Action", row => <><strong>{row.action}</strong><small>{row.comments || row.entityType}</small></>],
                                    ["By", row => row.performedBy || "Unknown"],
                                    ["Role", row => row.role || "-"],
                                    ["When", row => dateTime(row.timestamp)]
                                ]} />
                            </section>
                        </>
                    )}
                </section>
            </div>

            <footer className="executive-footer">
                Updates automatically every minute. Last refreshed {dateTime(data.generatedAt)}
            </footer>
        </main>
    );
};

const ProjectHeader = ({ project }) => (
    <section className="project-record-header">
        <div>
            <p>{project.reference}</p>
            <h2>{project.name}</h2>
            <span>{project.customer || "No customer recorded"} - {project.salesRep || "No sales rep recorded"}</span>
        </div>
        <dl>
            <div><dt>Created</dt><dd>{dateTime(project.createdAt)}</dd></div>
            <div><dt>Created by</dt><dd>{project.createdBy || "Unknown"}</dd></div>
            <div><dt>Due</dt><dd>{dateTime(project.dueDate)}</dd></div>
            <div><dt>Value</dt><dd>{money(project.value)}</dd></div>
        </dl>
    </section>
);

const ProjectDetailLoading = () => (
    <div className="project-detail-loading" role="status" aria-live="polite">
        <div className="detail-loading-banner">
            <div>
                <span className="detail-skeleton line short" />
                <span className="detail-skeleton line title" />
                <span className="detail-skeleton line medium" />
            </div>
            <div className="detail-loading-meta">
                {[1, 2, 3, 4].map(item => <span className="detail-skeleton pill" key={item} />)}
            </div>
        </div>
        <div className="detail-loading-grid">
            <div className="executive-panel">
                <span className="detail-skeleton line medium" />
                <span className="detail-skeleton chart" />
            </div>
            <div className="executive-panel">
                <span className="detail-skeleton line medium" />
                <div className="detail-loading-counts">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(item => <span className="detail-skeleton count" key={item} />)}
                </div>
            </div>
        </div>
        <div className="executive-panel">
            <span className="detail-skeleton line medium" />
            <div className="detail-loading-timeline">
                {[1, 2, 3, 4, 5].map(item => (
                    <div key={item}>
                        <span className="detail-skeleton dot" />
                        <span className="detail-skeleton line full" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const Metric = ({ icon, tone, label: metricLabel, value }) => (
    <div className={`executive-metric ${tone}`}>
        <span className="metric-icon">{icon}</span>
        <div><p>{metricLabel}</p><strong>{value}</strong></div>
    </div>
);

const Panel = ({ title, subtitle, children }) => (
    <article className="executive-panel">
        <div className="panel-heading">
            <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        </div>
        {children}
    </article>
);

const WorkflowPanel = ({ stages }) => (
    <Panel title="Workflow and approvals" subtitle="Stage dates and approver records">
        <div className="workflow-list">
            {stages.length === 0 ? <Empty text="No workflow stages recorded." /> : stages.map(stage => (
                <div className={stage.isCurrent ? "current" : ""} key={stage.id}>
                    <span><GitBranch size={15} /><strong>{label(stage.stage)}</strong><small>{dateTime(stage.updatedAt || stage.createdAt)}</small></span>
                    <div className="approval-chips">
                        {(stage.approvals || []).length === 0 ? <em>No approvals</em> : stage.approvals.map((approval, index) => (
                            <b key={`${stage.id}-${index}`}><ShieldCheck size={13} />{approval.approverName || approval.approverRole || "Approver"} - {label(approval.status)}</b>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </Panel>
);

const Timeline = ({ events }) => (
    <div className="audit-timeline">
        {events.length === 0 ? <Empty text="No timeline events recorded for this project yet." /> : events.map((event, index) => (
            <div className="audit-event" key={`${event.category}-${event.action}-${index}`}>
                <span><FileText size={16} /></span>
                <div>
                    <p><strong>{event.action}</strong><small>{event.category}</small></p>
                    <h4>{String(event.title || "Untitled event")}</h4>
                    <footer><UserRoundCheck size={13} />{event.actor || "System"} - {dateTime(event.at)}</footer>
                    {event.detail !== undefined && event.detail !== null && String(event.detail).trim() !== "" && <small>{String(event.detail)}</small>}
                </div>
            </div>
        ))}
    </div>
);

const DataTable = ({ title, rows = [], columns }) => (
    <article className="executive-panel executive-table-panel">
        <div className="panel-heading">
            <div><h3>{title}</h3><p>{rows.length} record{rows.length === 1 ? "" : "s"}</p></div>
        </div>
        {rows.length === 0 ? <Empty text="No records captured here yet." positive /> : (
            <div className="table-scroll"><table><thead><tr>{columns.map(([heading]) => <th key={heading}>{heading}</th>)}</tr></thead>
                <tbody>{rows.map((row, index) => <tr key={row.id || `${title}-${index}`}>
                    {columns.map(([heading, render]) => <td key={heading}>{render(row)}</td>)}
                </tr>)}</tbody></table></div>
        )}
    </article>
);

const Empty = ({ text, positive = false }) => (
    <div className={`executive-empty ${positive ? "positive" : ""}`}>
        {positive ? <CheckCircle2 size={22} /> : <FileClock size={22} />}
        <span>{text}</span>
    </div>
);

const ChartEmpty = ({ data, children }) => data?.some(item => Number(item.count || 0) > 0)
    ? children : <Empty text="No status data to chart." />;

const ProjectSummarySkeleton = () => (
    <main className="executive-dashboard executive-skeleton">
        <div className="skeleton-block title" />
        <div className="skeleton-row">{[1, 2, 3, 4].map(item => <div className="skeleton-block metric" key={item} />)}</div>
        <div className="skeleton-row panels"><div className="skeleton-block panel" /><div className="skeleton-block panel" /></div>
    </main>
);

export default ProjectSummaryDashboard;
