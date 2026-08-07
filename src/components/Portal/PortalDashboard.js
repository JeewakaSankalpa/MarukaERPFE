import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Table } from "react-bootstrap";
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
  MessageSquare,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.jpeg";
import PartnerConversation from "./PartnerConversation";

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
  const [activePortalTab, setActivePortalTab] = useState("overview");
  const [communicationUnread, setCommunicationUnread] = useState(0);
  const mountedRef = useRef(false);
  const requestSeqRef = useRef(0);

  const isSupplier = type === "supplier";
  const title = isSupplier ? "Supplier Portal" : "Customer Portal";
  const accountName = isSupplier ? data?.supplierName : data?.customerName;
  const primaryRows = isSupplier ? data?.purchaseOrders : data?.projects;
  const secondaryRows = isSupplier ? data?.grns : data?.invoices;
  const visibility = useMemo(() => data?.config?.visible?.[isSupplier ? "supplier" : "customer"] || {}, [data, isSupplier]);
  const isVisible = useCallback((key) => visibility[key] !== false, [visibility]);

  const loadCommunicationCounts = useCallback(() => {
    return api.get(`/portal/${type}/communications/counts`)
      .then((res) => {
        if (mountedRef.current) setCommunicationUnread(Number(res.data?.unread || 0));
      })
      .catch(() => {
        if (mountedRef.current) setCommunicationUnread(0);
      });
  }, [type]);

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
          loadCommunicationCounts();
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
  }, [loadCommunicationCounts, type]);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard();
    loadCommunicationCounts();
    return () => {
      mountedRef.current = false;
    };
  }, [loadCommunicationCounts, loadDashboard]);

  const metrics = useMemo(() => {
    if (!data) return [];
    if (isSupplier) {
      return [
        { key: "summary.purchaseOrderCount", label: "Purchase Orders", value: data.purchaseOrderCount || 0, icon: <FileText size={20} aria-hidden="true" /> },
        { key: "summary.grnCount", label: "GRNs", value: data.grnCount || 0, icon: <PackageCheck size={20} aria-hidden="true" /> },
        { key: "summary.purchaseOrderBalance", label: "PO Balance", value: currency(data.purchaseOrderBalance), icon: <CreditCard size={20} aria-hidden="true" /> },
        { key: "summary.grnBalance", label: "GRN Balance", value: currency(data.grnBalance), icon: <ReceiptText size={20} aria-hidden="true" /> },
      ].filter((metric) => isVisible(metric.key));
    }
    return [
      { key: "summary.projectCount", label: "Projects", value: data.projectCount || 0, icon: <Briefcase size={20} aria-hidden="true" /> },
      { key: "summary.invoiceCount", label: "Invoices", value: data.invoiceCount || 0, icon: <FileText size={20} aria-hidden="true" /> },
      { key: "summary.projectBalance", label: "Project Balance", value: currency(data.projectBalance), icon: <CreditCard size={20} aria-hidden="true" /> },
      { key: "summary.invoiceBalance", label: "Invoice Balance", value: currency(data.invoiceBalance), icon: <ReceiptText size={20} aria-hidden="true" /> },
    ].filter((metric) => isVisible(metric.key));
  }, [data, isSupplier, isVisible]);

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
            <PortalTabs
              activePortalTab={activePortalTab}
              setActivePortalTab={setActivePortalTab}
              communicationUnread={communicationUnread}
            />

            {activePortalTab === "overview" ? (
              <>
                {metrics.length > 0 && <section className="portal-metrics" aria-label="Portal summary">
                  {metrics.map((metric) => (
                    <div className="portal-metric" key={metric.label}>
                      <span>{metric.icon}</span>
                      <div>
                        <p>{metric.label}</p>
                        <strong>{metric.value}</strong>
                      </div>
                    </div>
                  ))}
                </section>}

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
                    isVisible={isVisible}
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
                    isVisible={isVisible}
                  />
                )}
              </>
            ) : (
              <PortalCommunicationHub
                data={data}
                isSupplier={isSupplier}
                onUnreadChanged={loadCommunicationCounts}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PortalTabs({ activePortalTab, setActivePortalTab, communicationUnread }) {
  return (
    <div className="portal-tabs" role="tablist" aria-label="Portal sections">
      <button
        type="button"
        role="tab"
        aria-selected={activePortalTab === "overview"}
        className={activePortalTab === "overview" ? "portal-tab portal-tab-active" : "portal-tab"}
        onClick={() => setActivePortalTab("overview")}
      >
        <Briefcase size={16} aria-hidden="true" />
        Overview
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activePortalTab === "communications"}
        className={activePortalTab === "communications" ? "portal-tab portal-tab-active" : "portal-tab"}
        onClick={() => setActivePortalTab("communications")}
      >
        <MessageSquare size={16} aria-hidden="true" />
        Chat and notifications
        {communicationUnread > 0 && <Badge bg="danger" pill>{communicationUnread > 99 ? "99+" : communicationUnread}</Badge>}
      </button>
    </div>
  );
}

function PortalCommunicationHub({ data, isSupplier, onUnreadChanged }) {
  const rows = useMemo(
    () => (isSupplier ? (data.purchaseOrders || []) : (data.projects || [])),
    [data, isSupplier]
  );
  const [selectedId, setSelectedId] = useState(rows[0]?.id || "");

  useEffect(() => {
    if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const selected = rows.find((row) => row.id === selectedId) || rows[0];
  if (!rows.length) {
    return (
      <section className="portal-panel">
        <div className="portal-chat-empty">
          <MessageSquare size={22} aria-hidden="true" />
          <div>
            <h2>No conversations yet</h2>
            <p>{isSupplier ? "Purchase orders will appear here once they are assigned to this supplier account." : "Projects will appear here once they are linked to this customer account."}</p>
          </div>
        </div>
      </section>
    );
  }

  const targetType = isSupplier ? "SUPPLIER_PO" : "CUSTOMER_PROJECT";
  const listPath = isSupplier
    ? `/portal/supplier/pos/${selected.id}/communications`
    : `/portal/customer/projects/${selected.id}/communications`;

  return (
    <section className="portal-communication-layout">
      <aside className="portal-thread-list" aria-label="Conversation list">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className={row.id === selected.id ? "portal-thread-item portal-thread-active" : "portal-thread-item"}
            onClick={() => setSelectedId(row.id)}
          >
            <span>{isSupplier ? row.poNumber || row.id : row.projectName || row.jobNumber || row.id}</span>
            <small>{isSupplier ? row.status || row.approvalStatus || "Order" : row.currentStage || row.status || "Project"}</small>
          </button>
        ))}
      </aside>
      <PartnerConversation
        targetType={targetType}
        targetId={selected.id}
        title={isSupplier ? `Chat for ${selected.poNumber || selected.id}` : `Chat for ${selected.projectName || selected.id}`}
        subtitle={isSupplier ? "Send encrypted delivery updates, photos, and order questions." : "Send encrypted progress updates, photos, reactions, and questions."}
        listPath={listPath}
        postPath={listPath}
        onUnreadChanged={onUnreadChanged}
      />
    </section>
  );
}

function CustomerPortalProjects({ data, query, setQuery, statusFilter, setStatusFilter, actionFilter, setActionFilter, sortMode, setSortMode, isVisible }) {
  if (!isVisible("sections.projects")) return null;
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
          isVisible={isVisible}
        />

        {filteredProjects.length ? (
          <div className="portal-record-list">
            {filteredProjects.map((project) => (
              <CustomerProjectCard key={project.id} project={project} isVisible={isVisible} />
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

        {isVisible("sections.unlinkedInvoices") && unlinkedInvoices.length > 0 && (
          <section className="portal-linked-panel">
            <div className="portal-linked-heading">
              <h3>Invoices not linked to a visible project</h3>
              <p>These invoices are available to this account, but the matching project was not included in this dashboard response.</p>
            </div>
            <InvoiceTable invoices={unlinkedInvoices} emptyText="There are no unlinked invoices." isVisible={isVisible} />
          </section>
        )}
      </PortalPanel>
    </div>
  );
}

function SupplierPortalProjects({ data, query, setQuery, statusFilter, setStatusFilter, actionFilter, setActionFilter, sortMode, setSortMode, isVisible }) {
  if (!isVisible("sections.purchaseOrders")) return null;
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
          isVisible={isVisible}
        />

        {filteredPurchaseOrders.length ? (
          <div className="portal-record-list">
            {filteredPurchaseOrders.map((po) => (
              <SupplierOrderCard key={po.id} po={po} isVisible={isVisible} />
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

        {isVisible("sections.unlinkedGrns") && unlinkedGrns.length > 0 && (
          <section className="portal-linked-panel">
            <div className="portal-linked-heading">
              <h3>GRNs not linked to a visible PO</h3>
              <p>These receiving records are visible to this account, but the matching purchase order was not included in this dashboard response.</p>
            </div>
            <GrnTable grns={unlinkedGrns} emptyText="There are no unlinked GRNs." isVisible={isVisible} />
          </section>
        )}
      </PortalPanel>
    </div>
  );
}

function CustomerProjectCard({ project, isVisible }) {
  const [expanded, setExpanded] = useState(false);
  const action = customerNextAction(project);
  const mainStatus = project.status || project.currentStage;
  const stageLabel = displayLabel(project.currentStage || project.status, "Stage not set");
  const progressValue = percent(project.totalReceived, project.totalProjectValue);
  const deadline = project.deliveryDate || project.dueDate || project.estimatedEnd;
  const dateNeedsAttention = action.tone === "danger" || action.tone === "warning";

  return (
    <article className="portal-project-card">
      <div className="portal-card-topline">
        <div className="portal-project-title-block">
          {isVisible("project.kindLabel") && <span className="portal-kind-label">Customer project</span>}
          {isVisible("project.title") && <h3>{project.projectName || project.referenceNumber || project.jobNumber || project.id}</h3>}
          <div className="portal-id-row">
            {isVisible("project.referenceNumber") && <span>Inquiry {project.referenceNumber || "Not set"}</span>}
            {isVisible("project.jobNumber") && <span>Job {project.jobNumber || "Not set"}</span>}
          </div>
        </div>
        {isVisible("project.status") && <StatusBadge value={mainStatus} />}
      </div>

      <div className="portal-project-core">
        {isVisible("project.paymentProgress") && <ProgressSummary label="Payment progress" value={progressValue} fallback={`Current stage: ${stageLabel}`} />}
        {isVisible("project.deliverySignal") && <DateSignal icon={<Truck size={17} aria-hidden="true" />} label="Delivery" date={project.deliveryDate} fallbackDate={deadline} warning={dateNeedsAttention && isPastDate(deadline)} />}
        {isVisible("project.nextAction") && <ActionSignal action={action} />}
      </div>

      <div className="portal-quick-grid">
        {isVisible("project.currentStage") && <DetailItem label="Current stage" value={stageLabel} />}
        {isVisible("project.estimatedStart") && <DetailItem label="Start date" value={dateText(project.estimatedStart)} />}
        {isVisible("project.estimatedEnd") && <DetailItem label="Expected completion" value={dateText(project.estimatedEnd)} />}
        {isVisible("project.dueDate") && <DetailItem label="Due date" value={dateText(project.dueDate)} warning={isPastDate(project.dueDate)} />}
        {isVisible("project.invoiceCount") && <DetailItem label="Invoices" value={project.invoices.length} />}
        {isVisible("project.balance") && <DetailItem label="Outstanding balance" value={currency(project.balance)} strong />}
      </div>

      <div className="portal-card-footer">
        {isVisible("project.documentSummary") && <div className="portal-document-summary">
          <FileText size={16} aria-hidden="true" />
          <span>{project.invoices.length ? `${project.invoices.length} invoice${project.invoices.length === 1 ? "" : "s"} available` : "No invoices available yet"}</span>
        </div>}
        {isVisible("project.detailsToggle") && <Button type="button" variant="link" className="portal-text-action" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? "Hide details" : "View details"}
        </Button>}
      </div>

      {expanded && isVisible("project.detailsToggle") && (
        <div className="portal-detail-sections">
          {isVisible("project.detailDates") && <PortalSection title="Dates and delivery">
            <div className="portal-detail-grid">
              <DetailItem label="Start date" value={dateText(project.estimatedStart)} />
              <DetailItem label="Due date" value={dateText(project.dueDate)} warning={isPastDate(project.dueDate)} />
              <DetailItem label="Expected completion" value={dateText(project.estimatedEnd)} />
              <DetailItem label="Delivery date" value={dateText(project.deliveryDate)} />
              <DetailItem label="Delivery status" value={<StatusBadge value={project.deliveryStatus} fallback="Not scheduled" />} />
            </div>
          </PortalSection>}
          {isVisible("project.detailInvoices") && <PortalSection title="Invoices">
            <InvoiceTable invoices={project.invoices} emptyText="No invoices are linked to this project yet." isVisible={isVisible} />
          </PortalSection>}
        </div>
      )}
    </article>
  );
}

function SupplierOrderCard({ po, isVisible }) {
  const [expanded, setExpanded] = useState(false);
  const action = supplierNextAction(po);
  const mainStatus = po.status || po.approvalStatus;
  const progressValue = percent(po.receivedQty, po.orderedQty);
  const isOverdue = (action.tone === "danger" || action.tone === "warning") && isPastDate(po.etaDate) && numberValue(po.receivedQty) < numberValue(po.orderedQty);

  return (
    <article className="portal-project-card">
      <div className="portal-card-topline">
        <div className="portal-project-title-block">
          {isVisible("po.kindLabel") && <span className="portal-kind-label">Supplier order</span>}
          {isVisible("po.title") && <h3>{po.poNumber || po.id}</h3>}
          <div className="portal-id-row">
            {isVisible("po.quotationRef") && <span>Quotation {po.quotationRef || "Not set"}</span>}
            {isVisible("po.currency") && <span>Currency {po.currency || "LKR"}</span>}
          </div>
        </div>
        {isVisible("po.status") && <StatusBadge value={mainStatus} />}
      </div>

      <div className="portal-project-core">
        {isVisible("po.receivingProgress") && <ProgressSummary label="Receiving progress" value={progressValue} fallback={`${po.receivedQty || 0} of ${po.orderedQty || 0} received`} />}
        {isVisible("po.etaSignal") && <DateSignal icon={<CalendarClock size={17} aria-hidden="true" />} label="ETA" date={po.etaDate} warning={isOverdue} />}
        {isVisible("po.nextAction") && <ActionSignal action={action} />}
      </div>

      <div className="portal-quick-grid">
        {isVisible("po.approvalStatus") && <DetailItem label="Approval" value={<StatusBadge value={po.approvalStatus} fallback="Not set" />} />}
        {isVisible("po.orderedQty") && <DetailItem label="Ordered qty" value={po.orderedQty || 0} />}
        {isVisible("po.receivedQty") && <DetailItem label="Received qty" value={po.receivedQty || 0} />}
        {isVisible("po.grnCount") && <DetailItem label="GRNs" value={po.grns.length} />}
        {isVisible("po.paidAmount") && <DetailItem label="Paid" value={currency(po.paidAmount)} />}
        {isVisible("po.balance") && <DetailItem label="Outstanding balance" value={currency(po.balance)} strong />}
      </div>

      <div className="portal-card-footer">
        {isVisible("po.documentSummary") && <div className="portal-document-summary">
          <PackageCheck size={16} aria-hidden="true" />
          <span>{po.grns.length ? `${po.grns.length} GRN${po.grns.length === 1 ? "" : "s"} posted` : "No GRNs posted yet"}</span>
        </div>}
        {isVisible("po.detailsToggle") && <Button type="button" variant="link" className="portal-text-action" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? "Hide details" : "View details"}
        </Button>}
      </div>

      {expanded && isVisible("po.detailsToggle") && (
        <div className="portal-detail-sections">
          {isVisible("po.detailStatus") && <PortalSection title="Delivery and order status">
            <div className="portal-detail-grid">
              <DetailItem label="ETA" value={dateText(po.etaDate)} warning={isOverdue} />
              <DetailItem label="PO status" value={<StatusBadge value={po.status} fallback="Not set" />} />
              <DetailItem label="Approval status" value={<StatusBadge value={po.approvalStatus} fallback="Not set" />} />
              <DetailItem label="Order total" value={currency(po.grandTotal)} />
            </div>
          </PortalSection>}
          {isVisible("po.detailGrns") && <PortalSection title="GRNs and supplier invoices">
            <GrnTable grns={po.grns} emptyText="No GRNs are posted against this purchase order yet." isVisible={isVisible} />
          </PortalSection>}
        </div>
      )}
    </article>
  );
}

function PortalFilters({ query, setQuery, statusFilter, setStatusFilter, actionFilter, setActionFilter, sortMode, setSortMode, statusOptions, searchLabel, searchPlaceholder, isVisible }) {
  const hasFilters = query || statusFilter !== "all" || actionFilter !== "all" || sortMode !== "deadline";
  const showSearch = isVisible("filters.search");
  const showStatus = isVisible("filters.status");
  const showAction = isVisible("filters.action");
  const showSort = isVisible("filters.sort");
  if (!showSearch && !showStatus && !showAction && !showSort) return null;

  return (
    <div className="portal-filter-bar" aria-label="Project filters">
      {showSearch && <label className="portal-search-field">
        <span>{searchLabel}</span>
        <Search size={17} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
      </label>}
      {showStatus && <label className="portal-select-field">
        <span>Status</span>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {statusOptions.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}
        </select>
      </label>}
      {showAction && <label className="portal-select-field">
        <span>Action</span>
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
          <option value="all">All projects</option>
          <option value="attention">Needs attention</option>
          <option value="clear">No action needed</option>
        </select>
      </label>}
      {showSort && <label className="portal-select-field">
        <span>Sort</span>
        <ArrowDownUp size={16} aria-hidden="true" />
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
          <option value="deadline">Deadline first</option>
          <option value="status">Status</option>
          <option value="progress">Progress</option>
          <option value="name">Name / number</option>
        </select>
      </label>}
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
  const helperText = warning ? dueLabel(actualDate) : actualDate ? "Recorded date" : "No date set";
  return (
    <div className={warning ? "portal-date-signal portal-date-warning" : "portal-date-signal"}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{dateText(actualDate)}</strong>
        <small>{helperText}</small>
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

function InvoiceTable({ invoices, emptyText, isVisible }) {
  const columns = [
    { key: "invoice.documentNumber", label: "Invoice", render: (invoice) => invoice.documentNumber || invoice.id },
    { key: "invoice.issuedDate", label: "Issued", render: (invoice) => dateText(invoice.issuedDate) },
    { key: "invoice.dueDate", label: "Due", render: (invoice) => dateText(invoice.dueDate) },
    { key: "invoice.status", label: "Status", render: (invoice) => <StatusBadge value={invoice.status} /> },
    { key: "invoice.totalAmount", label: "Total", alignEnd: true, render: (invoice) => currency(invoice.totalAmount) },
    { key: "invoice.paidAmount", label: "Paid", alignEnd: true, render: (invoice) => currency(invoice.paidAmount) },
    { key: "invoice.balance", label: "Balance", alignEnd: true, strong: true, render: (invoice) => currency(invoice.balance) },
  ].filter((column) => isVisible(column.key));
  if (!columns.length) return null;

  return (
    <div className="portal-subtable-wrap">
      <Table responsive hover size="sm" className="portal-table portal-subtable">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key} className={column.alignEnd ? "text-end" : undefined}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {invoices.length ? invoices.map((invoice) => (
            <tr key={invoice.id}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.label} className={`${column.alignEnd ? "text-end" : ""}${column.strong ? " portal-amount-strong" : ""}`.trim() || undefined}>
                  {column.render(invoice)}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="portal-muted-row">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

function GrnTable({ grns, emptyText, isVisible }) {
  const columns = [
    { key: "grn.grnNumber", label: "GRN", render: (grn) => grn.grnNumber || grn.id },
    { key: "grn.paymentStatus", label: "Payment", render: (grn) => <StatusBadge value={grn.paymentStatus || grn.status} /> },
    { key: "grn.supplierInvoiceNo", label: "Supplier invoice", render: (grn) => grn.supplierInvoiceNo || "Not set" },
    { key: "grn.supplierInvoiceDate", label: "Invoice date", render: (grn) => dateText(grn.supplierInvoiceDate) },
    { key: "grn.dueDate", label: "Due", render: (grn) => dateText(grn.dueDate) },
    { key: "grn.invoiceAmount", label: "Invoice amount", alignEnd: true, render: (grn) => currency(grn.invoiceAmount) },
    { key: "grn.totalPaid", label: "Paid", alignEnd: true, render: (grn) => currency(grn.totalPaid) },
    { key: "grn.balance", label: "Balance", alignEnd: true, strong: true, render: (grn) => currency(grn.balance) },
  ].filter((column) => isVisible(column.key));
  if (!columns.length) return null;

  return (
    <div className="portal-subtable-wrap">
      <Table responsive hover size="sm" className="portal-table portal-subtable">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key} className={column.alignEnd ? "text-end" : undefined}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {grns.length ? grns.map((grn) => (
            <tr key={grn.id}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.label} className={`${column.alignEnd ? "text-end" : ""}${column.strong ? " portal-amount-strong" : ""}`.trim() || undefined}>
                  {column.render(grn)}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="portal-muted-row">{emptyText}</td>
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
