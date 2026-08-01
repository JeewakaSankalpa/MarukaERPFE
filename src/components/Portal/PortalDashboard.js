import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Table } from "react-bootstrap";
import {
  AlertTriangle,
  ArrowDownUp,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock3,
  CreditCard,
  FileText,
  LockKeyhole,
  LogOut,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.jpeg";

const currency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) => (value ? String(value).slice(0, 10) : "Not set");

const timeText = (value) =>
  value ? new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(value) : "Not updated";

const normalized = (value) => String(value || "").trim().toLowerCase();

const displayLabel = (value, fallback = "Not set") => {
  if (!value) return fallback;
  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const numberValue = (value) => Number(value || 0);

const percent = (part, total) => {
  const totalValue = numberValue(total);
  if (totalValue <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((numberValue(part) / totalValue) * 100)));
};

const isPastDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

const daysUntil = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
};

const statusTone = (value) => {
  const label = normalized(value);
  if (!label || label === "unknown") return "neutral";
  if (/cancel|reject|revision|failed|block|delay|overdue|hold/.test(label)) return "danger";
  if (/await|pending|partial|draft|review|open|created|submitted/.test(label)) return "warning";
  if (/paid|complete|approved|final|received|closed|delivered/.test(label)) return "success";
  if (/progress|processing|active|ready|issued/.test(label)) return "info";
  return "neutral";
};

const statusIcon = (tone) => {
  if (tone === "success") return <CheckCircle2 size={14} aria-hidden="true" />;
  if (tone === "warning") return <Clock3 size={14} aria-hidden="true" />;
  if (tone === "danger") return <AlertTriangle size={14} aria-hidden="true" />;
  if (tone === "info") return <CircleDot size={14} aria-hidden="true" />;
  return <CircleDot size={14} aria-hidden="true" />;
};

const dueLabel = (value) => {
  const days = daysUntil(value);
  if (days === null) return "No deadline set";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days <= 7) return `Due in ${days} day${days === 1 ? "" : "s"}`;
  return `Due ${dateText(value)}`;
};

const customerNextAction = (project) => {
  const status = normalized(`${project.status} ${project.currentStage} ${project.deliveryStatus}`);
  if (/complete|paid|delivered|closed/.test(status)) return { tone: "success", label: "No action needed", detail: "This project is complete or settled." };
  if (/await.*customer|customer.*approval|pending.*approval|review|revision/.test(status)) {
    return { tone: "warning", label: "Response may be needed", detail: "Review the current stage and available documents." };
  }
  if (isPastDate(project.deliveryDate || project.dueDate || project.estimatedEnd)) {
    return { tone: "danger", label: "Date needs attention", detail: "The latest visible date has passed." };
  }
  return { tone: "info", label: "Track progress", detail: "Maruka will update this project as work moves forward." };
};

const supplierNextAction = (po) => {
  const status = normalized(`${po.status} ${po.approvalStatus}`);
  const ordered = numberValue(po.orderedQty);
  const received = numberValue(po.receivedQty);
  if (/cancel|reject|revision|block|hold|delay/.test(status)) return { tone: "danger", label: "Attention required", detail: "Check the order status before proceeding." };
  if (ordered > 0 && received < ordered) return { tone: "warning", label: "Delivery pending", detail: `${ordered - received} item${ordered - received === 1 ? "" : "s"} still expected.` };
  if (/pending|await|review|draft|submitted/.test(status)) return { tone: "warning", label: "Awaiting approval", detail: "Wait for approval before treating this as complete." };
  if (/complete|approved|received|closed/.test(status)) return { tone: "success", label: "No action needed", detail: "Receiving is complete or approved." };
  return { tone: "info", label: "Review order", detail: "Confirm dates, documents, and receiving details." };
};

export default function PortalDashboard({ type }) {
  const { logout, username } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [sortMode, setSortMode] = useState("deadline");
  const mountedRef = useRef(false);
  const requestSeqRef = useRef(0);

  const isSupplier = type === "supplier";
  const title = isSupplier ? "Supplier Portal" : "Customer Portal";
  const accountName = isSupplier ? data?.supplierName : data?.customerName;
  const primaryRows = isSupplier ? data?.purchaseOrders : data?.projects;
  const secondaryRows = isSupplier ? data?.grns : data?.invoices;

  const loadDashboard = useCallback(() => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setLoading(true);
    setError("");
    return api.get(`/portal/${type}/dashboard`)
      .then((res) => {
        if (mountedRef.current && requestSeqRef.current === requestSeq) {
          setData(res.data);
          setLastUpdated(new Date());
        }
      })
      .catch((err) => {
        if (mountedRef.current && requestSeqRef.current === requestSeq) {
          const message = err?.response?.data?.message || err?.response?.data?.error || "We could not load this portal. Check your connection and try again.";
          setError(message);
        }
      })
      .finally(() => {
        if (mountedRef.current && requestSeqRef.current === requestSeq) setLoading(false);
      });
  }, [type]);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard();
    return () => {
      mountedRef.current = false;
    };
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    if (!data) return [];
    if (isSupplier) {
      return [
        { label: "Purchase Orders", value: data.purchaseOrderCount || 0, icon: <FileText size={20} aria-hidden="true" /> },
        { label: "GRNs", value: data.grnCount || 0, icon: <PackageCheck size={20} aria-hidden="true" /> },
        { label: "PO Balance", value: currency(data.purchaseOrderBalance), icon: <CreditCard size={20} aria-hidden="true" /> },
        { label: "GRN Balance", value: currency(data.grnBalance), icon: <ReceiptText size={20} aria-hidden="true" /> },
      ];
    }
    return [
      { label: "Projects", value: data.projectCount || 0, icon: <Briefcase size={20} aria-hidden="true" /> },
      { label: "Invoices", value: data.invoiceCount || 0, icon: <FileText size={20} aria-hidden="true" /> },
      { label: "Project Balance", value: currency(data.projectBalance), icon: <CreditCard size={20} aria-hidden="true" /> },
      { label: "Invoice Balance", value: currency(data.invoiceBalance), icon: <ReceiptText size={20} aria-hidden="true" /> },
    ];
  }, [data, isSupplier]);

  return (
    <div className="portal-shell" aria-busy={loading ? "true" : "false"}>
      <header className="portal-topbar">
        <div className="portal-brand-block">
          <img src={logo} alt="Maruka logo" className="portal-logo" />
          <div>
            <div className="portal-eyebrow">Maruka Technologies</div>
            <h1>{title}</h1>
            <p>{accountName || username}</p>
          </div>
        </div>
        <div className="portal-actions">
          <div className="portal-last-updated" aria-live="polite">
            <span>Updated</span>
            <strong>{timeText(lastUpdated)}</strong>
          </div>
          <Button variant="outline-dark" onClick={loadDashboard} disabled={loading} className="portal-icon-button">
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </Button>
          <Button variant="outline-dark" onClick={logout} className="portal-logout">
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="portal-main">
        <section className="portal-hero">
          <div>
            <span className="portal-security-pill">
              <LockKeyhole size={15} aria-hidden="true" />
              Partner access only
            </span>
            <h2>{isSupplier ? "Orders, delivery status, and documents assigned to you" : "Projects, invoices, and delivery status for your account"}</h2>
            <p>
              {isSupplier
                ? "This view shows only purchase orders, receiving records, supplier invoice details, and payment status linked to this supplier account."
                : "This view shows only projects, invoices, delivery information, and payment status linked to this customer account."}
            </p>
          </div>
          <div className="portal-hero-summary">
            <span>{isSupplier ? "Supplier" : "Customer"}</span>
            <strong>{accountName || username}</strong>
          </div>
        </section>

        {loading && <PortalLoadingState />}

        {!loading && error && (
          <Alert variant="danger" className="portal-alert" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
          </Alert>
        )}

        {!loading && !error && data && (
          <>
            <section className="portal-metrics" aria-label="Portal summary">
              {metrics.map((metric) => (
                <div className="portal-metric" key={metric.label}>
                  <span>{metric.icon}</span>
                  <div>
                    <p>{metric.label}</p>
                    <strong>{metric.value}</strong>
                  </div>
                </div>
              ))}
            </section>

            {(!primaryRows?.length && !secondaryRows?.length) && <PortalEmptyState isSupplier={isSupplier} />}

            {isSupplier ? (
              <SupplierPortalProjects
                data={data}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                actionFilter={actionFilter}
                setActionFilter={setActionFilter}
                sortMode={sortMode}
                setSortMode={setSortMode}
              />
            ) : (
              <CustomerPortalProjects
                data={data}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                actionFilter={actionFilter}
                setActionFilter={setActionFilter}
                sortMode={sortMode}
                setSortMode={setSortMode}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function CustomerPortalProjects({ data, query, setQuery, statusFilter, setStatusFilter, actionFilter, setActionFilter, sortMode, setSortMode }) {
  const projects = data.projects || [];
  const invoices = data.invoices || [];
  const projectIds = new Set(projects.map((project) => project.id));
  const groupedProjects = projects.map((project) => ({
    ...project,
    invoices: invoices.filter((invoice) => invoice.projectId === project.id),
  }));
  const unlinkedInvoices = invoices.filter((invoice) => !projectIds.has(invoice.projectId));
  const statusOptions = buildStatusOptions(groupedProjects, (project) => project.status || project.currentStage);
  const filteredProjects = filterAndSortRecords(groupedProjects, {
    query,
    statusFilter,
    actionFilter,
    sortMode,
    textFor: (project) => `${project.projectName} ${project.jobNumber} ${project.referenceNumber}`,
    statusFor: (project) => project.status || project.currentStage,
    actionFor: customerNextAction,
    dateFor: (project) => project.deliveryDate || project.dueDate || project.estimatedEnd,
  });

  return (
    <div className="portal-stack">
      <PortalPanel title="Projects" count={filteredProjects.length} subtitle="Grouped with invoices and customer-visible dates.">
        <PortalFilters
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          actionFilter={actionFilter}
          setActionFilter={setActionFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          statusOptions={statusOptions}
          searchLabel="Search projects"
          searchPlaceholder="Project name, inquiry no, or job no"
        />

        {filteredProjects.length ? (
          <div className="portal-record-list">
            {filteredProjects.map((project) => (
              <CustomerProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <FilteredEmptyState onReset={() => {
            setQuery("");
            setStatusFilter("all");
            setActionFilter("all");
            setSortMode("deadline");
          }} />
        )}

        {unlinkedInvoices.length > 0 && (
          <section className="portal-linked-panel">
            <div className="portal-linked-heading">
              <h3>Invoices not linked to a visible project</h3>
              <p>These invoices are available to this account, but the matching project was not included in this dashboard response.</p>
            </div>
            <InvoiceTable invoices={unlinkedInvoices} emptyText="There are no unlinked invoices." />
          </section>
        )}
      </PortalPanel>
    </div>
  );
}

function SupplierPortalProjects({ data, query, setQuery, statusFilter, setStatusFilter, actionFilter, setActionFilter, sortMode, setSortMode }) {
  const purchaseOrders = data.purchaseOrders || [];
  const grns = data.grns || [];
  const purchaseOrderKeys = new Set(purchaseOrders.flatMap((po) => [po.id, po.poNumber].filter(Boolean)));
  const groupedPurchaseOrders = purchaseOrders.map((po) => ({
    ...po,
    grns: grns.filter((grn) => grn.poId === po.id || (!!grn.poNumber && grn.poNumber === po.poNumber)),
  }));
  const unlinkedGrns = grns.filter((grn) => !purchaseOrderKeys.has(grn.poId) && !purchaseOrderKeys.has(grn.poNumber));
  const statusOptions = buildStatusOptions(groupedPurchaseOrders, (po) => po.status || po.approvalStatus);
  const filteredPurchaseOrders = filterAndSortRecords(groupedPurchaseOrders, {
    query,
    statusFilter,
    actionFilter,
    sortMode,
    textFor: (po) => `${po.poNumber} ${po.quotationRef}`,
    statusFor: (po) => po.status || po.approvalStatus,
    actionFor: supplierNextAction,
    dateFor: (po) => po.etaDate,
  });

  return (
    <div className="portal-stack">
      <PortalPanel title="Assigned purchase orders" count={filteredPurchaseOrders.length} subtitle="Sorted so urgent deliveries and approvals are easier to spot.">
        <PortalFilters
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          actionFilter={actionFilter}
          setActionFilter={setActionFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
          statusOptions={statusOptions}
          searchLabel="Search orders"
          searchPlaceholder="PO number or quotation reference"
        />

        {filteredPurchaseOrders.length ? (
          <div className="portal-record-list">
            {filteredPurchaseOrders.map((po) => (
              <SupplierOrderCard key={po.id} po={po} />
            ))}
          </div>
        ) : (
          <FilteredEmptyState onReset={() => {
            setQuery("");
            setStatusFilter("all");
            setActionFilter("all");
            setSortMode("deadline");
          }} />
        )}

        {unlinkedGrns.length > 0 && (
          <section className="portal-linked-panel">
            <div className="portal-linked-heading">
              <h3>GRNs not linked to a visible PO</h3>
              <p>These receiving records are visible to this account, but the matching purchase order was not included in this dashboard response.</p>
            </div>
            <GrnTable grns={unlinkedGrns} emptyText="There are no unlinked GRNs." />
          </section>
        )}
      </PortalPanel>
    </div>
  );
}

function CustomerProjectCard({ project }) {
  const [expanded, setExpanded] = useState(false);
  const action = customerNextAction(project);
  const mainStatus = project.status || project.currentStage;
  const stageLabel = displayLabel(project.currentStage || project.status, "Stage not set");
  const progressValue = percent(project.totalReceived, project.totalProjectValue);
  const deadline = project.deliveryDate || project.dueDate || project.estimatedEnd;

  return (
    <article className="portal-project-card">
      <div className="portal-card-topline">
        <div className="portal-project-title-block">
          <span className="portal-kind-label">Customer project</span>
          <h3>{project.projectName || project.referenceNumber || project.jobNumber || project.id}</h3>
          <div className="portal-id-row">
            <span>Inquiry {project.referenceNumber || "Not set"}</span>
            <span>Job {project.jobNumber || "Not set"}</span>
          </div>
        </div>
        <StatusBadge value={mainStatus} />
      </div>

      <div className="portal-project-core">
        <ProgressSummary label="Payment progress" value={progressValue} fallback={`Current stage: ${stageLabel}`} />
        <DateSignal icon={<Truck size={17} aria-hidden="true" />} label="Delivery" date={project.deliveryDate} fallbackDate={deadline} />
        <ActionSignal action={action} />
      </div>

      <div className="portal-quick-grid">
        <DetailItem label="Current stage" value={stageLabel} />
        <DetailItem label="Start date" value={dateText(project.estimatedStart)} />
        <DetailItem label="Expected completion" value={dateText(project.estimatedEnd)} />
        <DetailItem label="Due date" value={dateText(project.dueDate)} warning={isPastDate(project.dueDate)} />
        <DetailItem label="Invoices" value={project.invoices.length} />
        <DetailItem label="Outstanding balance" value={currency(project.balance)} strong />
      </div>

      <div className="portal-card-footer">
        <div className="portal-document-summary">
          <FileText size={16} aria-hidden="true" />
          <span>{project.invoices.length ? `${project.invoices.length} invoice${project.invoices.length === 1 ? "" : "s"} available` : "No invoices available yet"}</span>
        </div>
        <Button type="button" variant="link" className="portal-text-action" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? "Hide details" : "View details"}
        </Button>
      </div>

      {expanded && (
        <div className="portal-detail-sections">
          <PortalSection title="Dates and delivery">
            <div className="portal-detail-grid">
              <DetailItem label="Start date" value={dateText(project.estimatedStart)} />
              <DetailItem label="Due date" value={dateText(project.dueDate)} warning={isPastDate(project.dueDate)} />
              <DetailItem label="Expected completion" value={dateText(project.estimatedEnd)} />
              <DetailItem label="Delivery date" value={dateText(project.deliveryDate)} />
              <DetailItem label="Delivery status" value={<StatusBadge value={project.deliveryStatus} fallback="Not scheduled" />} />
            </div>
          </PortalSection>
          <PortalSection title="Invoices">
            <InvoiceTable invoices={project.invoices} emptyText="No invoices are linked to this project yet." />
          </PortalSection>
        </div>
      )}
    </article>
  );
}

function SupplierOrderCard({ po }) {
  const [expanded, setExpanded] = useState(false);
  const action = supplierNextAction(po);
  const mainStatus = po.status || po.approvalStatus;
  const progressValue = percent(po.receivedQty, po.orderedQty);
  const isOverdue = isPastDate(po.etaDate) && numberValue(po.receivedQty) < numberValue(po.orderedQty);

  return (
    <article className="portal-project-card">
      <div className="portal-card-topline">
        <div className="portal-project-title-block">
          <span className="portal-kind-label">Supplier order</span>
          <h3>{po.poNumber || po.id}</h3>
          <div className="portal-id-row">
            <span>Quotation {po.quotationRef || "Not set"}</span>
            <span>Currency {po.currency || "LKR"}</span>
          </div>
        </div>
        <StatusBadge value={mainStatus} />
      </div>

      <div className="portal-project-core">
        <ProgressSummary label="Receiving progress" value={progressValue} fallback={`${po.receivedQty || 0} of ${po.orderedQty || 0} received`} />
        <DateSignal icon={<CalendarClock size={17} aria-hidden="true" />} label="ETA" date={po.etaDate} warning={isOverdue} />
        <ActionSignal action={action} />
      </div>

      <div className="portal-quick-grid">
        <DetailItem label="Approval" value={<StatusBadge value={po.approvalStatus} fallback="Not set" />} />
        <DetailItem label="Ordered qty" value={po.orderedQty || 0} />
        <DetailItem label="Received qty" value={po.receivedQty || 0} />
        <DetailItem label="GRNs" value={po.grns.length} />
        <DetailItem label="Paid" value={currency(po.paidAmount)} />
        <DetailItem label="Outstanding balance" value={currency(po.balance)} strong />
      </div>

      <div className="portal-card-footer">
        <div className="portal-document-summary">
          <PackageCheck size={16} aria-hidden="true" />
          <span>{po.grns.length ? `${po.grns.length} GRN${po.grns.length === 1 ? "" : "s"} posted` : "No GRNs posted yet"}</span>
        </div>
        <Button type="button" variant="link" className="portal-text-action" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? "Hide details" : "View details"}
        </Button>
      </div>

      {expanded && (
        <div className="portal-detail-sections">
          <PortalSection title="Delivery and order status">
            <div className="portal-detail-grid">
              <DetailItem label="ETA" value={dateText(po.etaDate)} warning={isOverdue} />
              <DetailItem label="PO status" value={<StatusBadge value={po.status} fallback="Not set" />} />
              <DetailItem label="Approval status" value={<StatusBadge value={po.approvalStatus} fallback="Not set" />} />
              <DetailItem label="Order total" value={currency(po.grandTotal)} />
            </div>
          </PortalSection>
          <PortalSection title="GRNs and supplier invoices">
            <GrnTable grns={po.grns} emptyText="No GRNs are posted against this purchase order yet." />
          </PortalSection>
        </div>
      )}
    </article>
  );
}

function PortalFilters({ query, setQuery, statusFilter, setStatusFilter, actionFilter, setActionFilter, sortMode, setSortMode, statusOptions, searchLabel, searchPlaceholder }) {
  const hasFilters = query || statusFilter !== "all" || actionFilter !== "all" || sortMode !== "deadline";

  return (
    <div className="portal-filter-bar" aria-label="Project filters">
      <label className="portal-search-field">
        <span>{searchLabel}</span>
        <Search size={17} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
      </label>
      <label className="portal-select-field">
        <span>Status</span>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {statusOptions.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}
        </select>
      </label>
      <label className="portal-select-field">
        <span>Action</span>
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
          <option value="all">All projects</option>
          <option value="attention">Needs attention</option>
          <option value="clear">No action needed</option>
        </select>
      </label>
      <label className="portal-select-field">
        <span>Sort</span>
        <ArrowDownUp size={16} aria-hidden="true" />
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
          <option value="deadline">Deadline first</option>
          <option value="status">Status</option>
          <option value="progress">Progress</option>
          <option value="name">Name / number</option>
        </select>
      </label>
      {hasFilters && (
        <Button type="button" variant="outline-secondary" className="portal-reset-button" onClick={() => {
          setQuery("");
          setStatusFilter("all");
          setActionFilter("all");
          setSortMode("deadline");
        }}>
          Reset
        </Button>
      )}
    </div>
  );
}

function buildStatusOptions(records, statusFor) {
  return [...new Set(records.map(statusFor).filter(Boolean))].sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)));
}

function filterAndSortRecords(records, config) {
  const queryText = normalized(config.query);
  return [...records]
    .filter((record) => !queryText || normalized(config.textFor(record)).includes(queryText))
    .filter((record) => config.statusFilter === "all" || config.statusFor(record) === config.statusFilter)
    .filter((record) => {
      if (config.actionFilter === "all") return true;
      const action = config.actionFor(record);
      const needsAttention = action.tone === "warning" || action.tone === "danger";
      return config.actionFilter === "attention" ? needsAttention : !needsAttention;
    })
    .sort((a, b) => {
      if (config.sortMode === "name") return config.textFor(a).localeCompare(config.textFor(b));
      if (config.sortMode === "status") return displayLabel(config.statusFor(a)).localeCompare(displayLabel(config.statusFor(b)));
      if (config.sortMode === "progress") return progressFor(b) - progressFor(a);
      return dateSortValue(config.dateFor(a)) - dateSortValue(config.dateFor(b));
    });
}

function progressFor(record) {
  if ("totalReceived" in record || "totalProjectValue" in record) return percent(record.totalReceived, record.totalProjectValue) || 0;
  return percent(record.receivedQty, record.orderedQty) || 0;
}

function dateSortValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function ProgressSummary({ label, value, fallback }) {
  return (
    <div className="portal-progress-box">
      <div className="portal-progress-heading">
        <span>{label}</span>
        <strong>{value === null ? "Stage based" : `${value}%`}</strong>
      </div>
      {value === null ? (
        <p>{fallback}</p>
      ) : (
        <div className="portal-progress-track" role="progressbar" aria-label={`${label}: ${value}%`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
          <span style={{ transform: `scaleX(${value / 100})` }} />
        </div>
      )}
    </div>
  );
}

function DateSignal({ icon, label, date, fallbackDate, warning }) {
  const actualDate = date || fallbackDate;
  return (
    <div className={warning || isPastDate(actualDate) ? "portal-date-signal portal-date-warning" : "portal-date-signal"}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{dateText(actualDate)}</strong>
        <small>{dueLabel(actualDate)}</small>
      </div>
    </div>
  );
}

function ActionSignal({ action }) {
  return (
    <div className={`portal-action-signal portal-action-${action.tone}`}>
      {statusIcon(action.tone)}
      <div>
        <p>{action.label}</p>
        <span>{action.detail}</span>
      </div>
    </div>
  );
}

function InvoiceTable({ invoices, emptyText }) {
  return (
    <div className="portal-subtable-wrap">
      <Table responsive hover size="sm" className="portal-table portal-subtable">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Status</th>
            <th className="text-end">Total</th>
            <th className="text-end">Paid</th>
            <th className="text-end">Balance</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length ? invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td data-label="Invoice">{invoice.documentNumber || invoice.id}</td>
              <td data-label="Issued">{dateText(invoice.issuedDate)}</td>
              <td data-label="Due">{dateText(invoice.dueDate)}</td>
              <td data-label="Status"><StatusBadge value={invoice.status} /></td>
              <td data-label="Total" className="text-end">{currency(invoice.totalAmount)}</td>
              <td data-label="Paid" className="text-end">{currency(invoice.paidAmount)}</td>
              <td data-label="Balance" className="text-end portal-amount-strong">{currency(invoice.balance)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={7} className="portal-muted-row">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

function GrnTable({ grns, emptyText }) {
  return (
    <div className="portal-subtable-wrap">
      <Table responsive hover size="sm" className="portal-table portal-subtable">
        <thead>
          <tr>
            <th>GRN</th>
            <th>Payment</th>
            <th>Supplier invoice</th>
            <th>Invoice date</th>
            <th>Due</th>
            <th className="text-end">Invoice amount</th>
            <th className="text-end">Paid</th>
            <th className="text-end">Balance</th>
          </tr>
        </thead>
        <tbody>
          {grns.length ? grns.map((grn) => (
            <tr key={grn.id}>
              <td data-label="GRN">{grn.grnNumber || grn.id}</td>
              <td data-label="Payment"><StatusBadge value={grn.paymentStatus || grn.status} /></td>
              <td data-label="Supplier invoice">{grn.supplierInvoiceNo || "Not set"}</td>
              <td data-label="Invoice date">{dateText(grn.supplierInvoiceDate)}</td>
              <td data-label="Due">{dateText(grn.dueDate)}</td>
              <td data-label="Invoice amount" className="text-end">{currency(grn.invoiceAmount)}</td>
              <td data-label="Paid" className="text-end">{currency(grn.totalPaid)}</td>
              <td data-label="Balance" className="text-end portal-amount-strong">{currency(grn.balance)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={8} className="portal-muted-row">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

function DetailItem({ label, value, strong, warning }) {
  return (
    <div className={warning ? "portal-detail-item portal-detail-warning" : "portal-detail-item"}>
      <span>{label}</span>
      <strong className={strong ? "portal-value-strong" : undefined}>{value || "Not set"}</strong>
    </div>
  );
}

function PortalPanel({ title, subtitle, count, children }) {
  return (
    <section className="portal-panel">
      <div className="portal-panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {typeof count === "number" ? <span className="portal-count-badge">{count}</span> : null}
      </div>
      {children}
    </section>
  );
}

function PortalSection({ title, children }) {
  return (
    <section className="portal-detail-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function StatusBadge({ value, fallback = "Unknown" }) {
  const label = value || fallback;
  const tone = statusTone(label);
  return (
    <span className={`portal-status-badge portal-status-${tone}`}>
      {statusIcon(tone)}
      {displayLabel(label, fallback)}
    </span>
  );
}

function PortalLoadingState() {
  return (
    <div className="portal-loading-grid" role="status" aria-live="polite">
      <span className="visually-hidden">Fetching portal projects and documents</span>
      {[0, 1, 2].map((item) => (
        <div className="portal-skeleton-card" key={item}>
          <span />
          <strong />
          <p />
          <p />
        </div>
      ))}
    </div>
  );
}

function PortalEmptyState({ isSupplier }) {
  return (
    <section className="portal-empty">
      <LockKeyhole size={22} aria-hidden="true" />
      <div>
        <h2>{isSupplier ? "No assigned orders yet" : "No projects linked yet"}</h2>
        <p>
          {isSupplier
            ? "Purchase orders and receiving records will appear here after Maruka links them to this supplier account."
            : "Projects, invoices, and delivery updates will appear here after Maruka links them to this customer account."}
        </p>
      </div>
    </section>
  );
}

function FilteredEmptyState({ onReset }) {
  return (
    <section className="portal-filter-empty">
      <Search size={22} aria-hidden="true" />
      <div>
        <h3>No matching records</h3>
        <p>Try a different project number, status, or action filter.</p>
      </div>
      <Button type="button" variant="outline-secondary" onClick={onReset}>Clear filters</Button>
    </section>
  );
}
