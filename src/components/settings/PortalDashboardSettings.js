import React, { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Tab, Tabs } from "react-bootstrap";
import { ArrowLeft, Eye, EyeOff, RotateCcw, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

const GROUPS = {
  customer: [
    {
      title: "Summary cards",
      items: [
        ["summary.projectCount", "Project count"],
        ["summary.invoiceCount", "Invoice count"],
        ["summary.projectBalance", "Project value and balance"],
        ["summary.invoiceBalance", "Invoice value and balance"],
      ],
    },
    {
      title: "Projects area",
      items: [
        ["sections.projects", "Projects section"],
        ["sections.unlinkedInvoices", "Unlinked invoice section"],
        ["filters.search", "Search filter"],
        ["filters.status", "Status filter"],
        ["filters.action", "Action filter"],
        ["filters.sort", "Sort control"],
      ],
    },
    {
      title: "Project card fields",
      items: [
        ["project.kindLabel", "Customer project label"],
        ["project.title", "Project title"],
        ["project.referenceNumber", "Inquiry number"],
        ["project.jobNumber", "Job number"],
        ["project.status", "Status badge"],
        ["project.paymentProgress", "Payment progress"],
        ["project.deliverySignal", "Delivery signal"],
        ["project.nextAction", "Next action"],
        ["project.currentStage", "Current stage"],
        ["project.estimatedStart", "Start date"],
        ["project.estimatedEnd", "Expected completion"],
        ["project.dueDate", "Due date"],
        ["project.invoiceCount", "Invoice count"],
        ["project.balance", "Outstanding balance"],
        ["project.documentSummary", "Document summary"],
        ["project.detailsToggle", "Details button"],
        ["project.detailDates", "Expanded dates and delivery"],
        ["project.detailInvoices", "Expanded invoice table"],
        ["invoice.documentNumber", "Invoice number"],
        ["invoice.issuedDate", "Invoice issued date"],
        ["invoice.dueDate", "Invoice due date"],
        ["invoice.status", "Invoice status"],
        ["invoice.totalAmount", "Invoice total"],
        ["invoice.paidAmount", "Invoice paid amount"],
        ["invoice.balance", "Invoice balance"],
      ],
    },
  ],
  supplier: [
    {
      title: "Summary cards",
      items: [
        ["summary.purchaseOrderCount", "Purchase order count"],
        ["summary.grnCount", "GRN count"],
        ["summary.purchaseOrderBalance", "PO value and balance"],
        ["summary.grnBalance", "GRN invoice balance"],
      ],
    },
    {
      title: "Purchase order area",
      items: [
        ["sections.purchaseOrders", "Purchase orders section"],
        ["sections.unlinkedGrns", "Unlinked GRN section"],
        ["filters.search", "Search filter"],
        ["filters.status", "Status filter"],
        ["filters.action", "Action filter"],
        ["filters.sort", "Sort control"],
      ],
    },
    {
      title: "Purchase order card fields",
      items: [
        ["po.kindLabel", "Supplier order label"],
        ["po.title", "PO number"],
        ["po.quotationRef", "Quotation reference"],
        ["po.currency", "Currency"],
        ["po.status", "Status badge"],
        ["po.receivingProgress", "Receiving progress"],
        ["po.etaSignal", "ETA signal"],
        ["po.nextAction", "Next action"],
        ["po.approvalStatus", "Approval status"],
        ["po.orderedQty", "Ordered quantity"],
        ["po.receivedQty", "Received quantity"],
        ["po.grnCount", "GRN count"],
        ["po.paidAmount", "Paid amount"],
        ["po.balance", "Outstanding balance"],
        ["po.documentSummary", "Document summary"],
        ["po.detailsToggle", "Details button"],
        ["po.detailStatus", "Expanded delivery and status"],
        ["po.detailGrns", "Expanded GRN table"],
        ["grn.grnNumber", "GRN number"],
        ["grn.paymentStatus", "GRN payment status"],
        ["grn.supplierInvoiceNo", "Supplier invoice number"],
        ["grn.supplierInvoiceDate", "Supplier invoice date"],
        ["grn.dueDate", "GRN due date"],
        ["grn.invoiceAmount", "GRN invoice amount"],
        ["grn.totalPaid", "GRN paid amount"],
        ["grn.balance", "GRN balance"],
      ],
    },
  ],
};

const buildDefaults = () => ({
  visible: Object.fromEntries(
    Object.entries(GROUPS).map(([audience, groups]) => [
      audience,
      Object.fromEntries(groups.flatMap((group) => group.items).map(([key]) => [key, true])),
    ])
  ),
});

export default function PortalDashboardSettings() {
  const navigate = useNavigate();
  const defaults = useMemo(buildDefaults, []);
  const [config, setConfig] = useState(defaults);
  const [activeTab, setActiveTab] = useState("customer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get("/admin/portal-dashboard-config")
      .then((res) => {
        if (!mounted) return;
        setConfig(mergeConfig(res.data));
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Could not load portal dashboard settings.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [defaults]);

  const toggle = (audience, key) => {
    setConfig((prev) => ({
      visible: {
        ...prev.visible,
        [audience]: {
          ...prev.visible[audience],
          [key]: prev.visible[audience]?.[key] === false,
        },
      },
    }));
  };

  const setAudience = (audience, value) => {
    setConfig((prev) => ({
      visible: {
        ...prev.visible,
        [audience]: Object.fromEntries(Object.keys(prev.visible[audience] || {}).map((key) => [key, value])),
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post("/admin/portal-dashboard-config", config);
      setConfig(mergeConfig(res.data));
      toast.success("Portal dashboard settings saved.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save portal dashboard settings.");
    } finally {
      setSaving(false);
    }
  };

  const activeValues = config.visible?.[activeTab] || {};
  const hiddenCount = Object.values(activeValues).filter((value) => value === false).length;

  if (loading) {
    return <div className="text-center p-5"><Spinner animation="border" /></div>;
  }

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center">
          <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h3 className="mb-1">Portal Dashboard Settings</h3>
            <p className="text-muted mb-0">Choose exactly what customer and supplier portal users can see.</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="d-flex align-items-center gap-2">
          {saving ? <Spinner size="sm" /> : <Save size={16} />}
          Save
        </Button>
      </div>

      <Alert variant="info" className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <span>These settings are applied by the backend before dashboard data is returned to portal accounts.</span>
        <Badge bg={hiddenCount ? "warning" : "success"} text={hiddenCount ? "dark" : undefined}>
          {hiddenCount} hidden in this tab
        </Badge>
      </Alert>

      <Tabs activeKey={activeTab} onSelect={(key) => setActiveTab(key || "customer")} className="mb-3">
        <Tab eventKey="customer" title="Customer dashboard">
          <DashboardToggleGrid audience="customer" config={config} onToggle={toggle} onSetAudience={setAudience} />
        </Tab>
        <Tab eventKey="supplier" title="Supplier dashboard">
          <DashboardToggleGrid audience="supplier" config={config} onToggle={toggle} onSetAudience={setAudience} />
        </Tab>
      </Tabs>

      <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
    </Container>
  );
}

function DashboardToggleGrid({ audience, config, onToggle, onSetAudience }) {
  return (
    <div>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button variant="outline-secondary" size="sm" onClick={() => onSetAudience(audience, true)} className="d-flex align-items-center gap-1">
          <RotateCcw size={14} /> Show all
        </Button>
        <Button variant="outline-secondary" size="sm" onClick={() => onSetAudience(audience, false)} className="d-flex align-items-center gap-1">
          <EyeOff size={14} /> Hide all
        </Button>
      </div>
      <Row className="g-3">
        {GROUPS[audience].map((group) => (
          <Col lg={4} md={6} key={group.title}>
            <Card className="h-100 shadow-sm">
              <Card.Header className="bg-white">
                <h6 className="mb-0">{group.title}</h6>
              </Card.Header>
              <Card.Body>
                {group.items.map(([key, label]) => {
                  const checked = config.visible?.[audience]?.[key] !== false;
                  return (
                    <Form.Check
                      key={key}
                      type="switch"
                      id={`${audience}-${key}`}
                      label={<span className="d-inline-flex align-items-center gap-2">{checked ? <Eye size={14} /> : <EyeOff size={14} />} {label}</span>}
                      checked={checked}
                      onChange={() => onToggle(audience, key)}
                      className="mb-2"
                    />
                  );
                })}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

function mergeConfig(incoming) {
  const merged = buildDefaults();
  Object.entries(incoming?.visible || {}).forEach(([audience, values]) => {
    if (!merged.visible[audience]) return;
    Object.entries(values || {}).forEach(([key, value]) => {
      if (key in merged.visible[audience]) {
        merged.visible[audience][key] = value !== false;
      }
    });
  });
  return merged;
}
