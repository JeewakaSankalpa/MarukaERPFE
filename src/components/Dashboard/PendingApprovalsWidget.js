import React, { useEffect, useMemo, useState } from "react";
import { Card, Badge, Button, Tabs, Tab, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import {
    FaBoxes,
    FaCheckCircle,
    FaClipboardCheck,
    FaFileInvoiceDollar,
    FaProjectDiagram,
    FaTruckLoading
} from "react-icons/fa";

const TYPE_META = {
    all: { label: "All", icon: FaCheckCircle },
    project: { label: "Projects", icon: FaProjectDiagram },
    po: { label: "Purchase Orders", icon: FaFileInvoiceDollar },
    grn: { label: "GRNs", icon: FaTruckLoading },
    stock: { label: "Stock Audits", icon: FaClipboardCheck },
    returns: { label: "Returns", icon: FaBoxes }
};

const badgeVariant = {
    project: "info",
    po: "primary",
    grn: "warning",
    stock: "secondary",
    returns: "success"
};

const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
};

const money = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const pageItems = (response) => {
    const data = response?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    return [];
};

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

export default function PendingApprovalsWidget() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("all");
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(false);

    const userRole = normalizeRole(localStorage.getItem("role"));
    const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");
    const projectRoles = JSON.parse(localStorage.getItem("projectRoles") || "[]");
    const employeeId = localStorage.getItem("employeeId");

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
    const hasModule = (moduleId) => userModules.includes(moduleId);
    const hasWorkflowRole = (allowedRoles = []) => {
        const allowed = new Set((allowedRoles || []).map(normalizeRole));
        return projectRoles.some((role) => allowed.has(normalizeRole(role)));
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const workflow = await api.get("/workflow").then((res) => res.data || {}).catch(() => ({}));

            const canAcceptGRN = isAdmin || hasModule("procurement.grn_accept") || hasWorkflowRole(workflow.grnAcceptanceRoles);
            const canVerifyGRNPayment = isAdmin || hasModule("procurement.grn_payment_verify") || hasWorkflowRole(workflow.grnPaymentVerifierRoles);
            const canApproveGRNPrint = isAdmin || hasModule("procurement.grn_print_approve") || hasWorkflowRole(workflow.grnPrintApproverRoles);
            const canSeeStockAudits = isAdmin || hasModule("inventory.audit_approvals");
            const canSeeInternalReturns = isAdmin || hasModule("inventory.approvals");
            const canSeeSupplierReturns = isAdmin || hasModule("inventory.supplier_approvals") || hasModule("inventory.approvals");

            const requests = [];
            const allRoles = [...new Set([...projectRoles, userRole])].filter(Boolean);

            if (allRoles.length > 0) {
                requests.push(
                    api.get("/projects/pending-approvals", { params: { roles: allRoles } })
                        .then((res) => (res.data || []).map((p) => ({
                            id: `project-${p.approvalType || "STAGE"}-${p.projectId}-${p.stageId || p.revisionId || ""}`,
                            typeKey: "project",
                            typeLabel: p.approvalType === "REVISION" ? "Project Revision" : "Project Approval",
                            title: p.projectName || "Unnamed project",
                            subtitle: p.customerName || "No customer",
                            detail: p.approvalType === "REVISION"
                                ? `${p.stageType || "-"} -> ${p.targetStage || "-"}`
                                : p.stageType || "Stage approval",
                            date: p.pendingSince || p.stageCreatedAt,
                            route: p.approvalType === "REVISION"
                                ? `/projects/manage/${p.projectId}?tab=REVISIONS`
                                : `/projects/manage/${p.projectId}`
                        })))
                );
            }

            if (employeeId) {
                requests.push(
                    api.get("/pos/pending-approvals", { params: { employeeId } })
                        .then((res) => (res.data || []).map((po) => ({
                            id: `po-${po.id}`,
                            typeKey: "po",
                            typeLabel: "Purchase Order",
                            title: po.supplierName || po.supplierNameSnapshot || "Supplier",
                            subtitle: po.poNumber || "PO pending approval",
                            detail: po.totalAmount ? `LKR ${money(po.totalAmount)}` : "Awaiting approval",
                            date: po.createdAt || po.updatedAt,
                            route: `/pos/${po.id}`
                        })))
                );
            }

            if (canAcceptGRN || canVerifyGRNPayment || canApproveGRNPrint) {
                requests.push(
                    api.get("/grns", { params: { size: 1000, sort: "createdAt,desc" } })
                        .then((res) => pageItems(res).flatMap((grn) => {
                            const rows = [];
                            const grossTotal = Number(grn.invoiceAmount || 0) + Number(grn.vatAmount || 0) + Number(grn.deliveryCharge || 0);

                            if (canAcceptGRN && grn.status === "POSTED") {
                                rows.push({
                                    id: `grn-accept-${grn.id}`,
                                    typeKey: "grn",
                                    typeLabel: "GRN Approval",
                                    title: grn.grnNumber || "GRN",
                                    subtitle: grn.supplierNameSnapshot || grn.poNumber || "Supplier GRN",
                                    detail: `Accept for payment${grossTotal ? ` - LKR ${money(grossTotal)}` : ""}`,
                                    date: grn.createdAt || grn.updatedAt,
                                    route: "/grns"
                                });
                            }

                            if (canVerifyGRNPayment) {
                                (grn.paymentHistory || []).forEach((payment, idx) => {
                                    if (!payment.verified) {
                                        rows.push({
                                            id: `grn-payment-${grn.id}-${payment.id || idx}`,
                                            typeKey: "grn",
                                            typeLabel: "GRN Payment Approval",
                                            title: grn.grnNumber || "GRN payment",
                                            subtitle: payment.reference || grn.supplierNameSnapshot || "Payment verification",
                                            detail: `Verify payment - LKR ${money(payment.amount)}`,
                                            date: payment.addedAt || payment.paymentDate || grn.updatedAt,
                                            route: "/grns"
                                        });
                                    }
                                });
                            }

                            if (canApproveGRNPrint && grn.status === "ACCEPTED" && !grn.printApprovedAt) {
                                rows.push({
                                    id: `grn-print-${grn.id}`,
                                    typeKey: "grn",
                                    typeLabel: "GRN Print Approval",
                                    title: grn.grnNumber || "GRN report",
                                    subtitle: grn.supplierNameSnapshot || grn.poNumber || "Report approval",
                                    detail: "Approve GRN report printing",
                                    date: grn.acceptedAt || grn.updatedAt || grn.createdAt,
                                    route: "/grns"
                                });
                            }

                            return rows;
                        }))
                );
            }

            if (canSeeStockAudits) {
                requests.push(
                    api.get("/inventory/adjustments/audit")
                        .then((res) => (res.data || [])
                            .filter((audit) => audit.status === "PENDING_APPROVAL")
                            .map((audit) => ({
                                id: `stock-audit-${audit.id}`,
                                typeKey: "stock",
                                typeLabel: audit.sourceType === "IMPORT_SYNC" ? "Inventory Import Approval" : "Stock Audit Approval",
                                title: audit.title || "Stock adjustment audit",
                                subtitle: audit.uploadedBy || audit.createdBy || "Inventory",
                                detail: audit.sourceType === "IMPORT_SYNC" ? "Review import differences" : "Approve stock adjustment",
                                date: audit.uploadedAt || audit.createdAt,
                                route: "/inventory/audit-approvals"
                            })))
                );
            }

            if (canSeeInternalReturns) {
                requests.push(
                    api.get("/inventory/returns/internal", { params: { status: "PENDING", size: 100 } })
                        .then((res) => pageItems(res).map((ret) => ({
                            id: `internal-return-${ret.id}`,
                            typeKey: "returns",
                            typeLabel: "Internal Return Approval",
                            title: ret.returnNumber || "Internal return",
                            subtitle: ret.projectId || "Project return",
                            detail: `${ret.items?.length || 0} item${ret.items?.length === 1 ? "" : "s"} waiting`,
                            date: ret.createdAt || ret.updatedAt,
                            route: "/inventory/returns/approvals"
                        })))
                );
            }

            if (canSeeSupplierReturns) {
                requests.push(
                    api.get("/inventory/returns/supplier", { params: { status: "PENDING", size: 100 } })
                        .then((res) => pageItems(res).map((ret) => ({
                            id: `supplier-return-${ret.id}`,
                            typeKey: "returns",
                            typeLabel: "Supplier Return Approval",
                            title: ret.returnNumber || "Supplier return",
                            subtitle: ret.supplierNameSnapshot || ret.supplierName || ret.supplierId || "Supplier",
                            detail: `${ret.productName || ret.productId || "Item"} - Qty ${ret.quantity || 0}`,
                            date: ret.createdAt || ret.updatedAt,
                            route: "/inventory/supplier-returns/approvals"
                        })))
                );
            }

            const settled = await Promise.allSettled(requests);
            const nextApprovals = settled
                .filter((result) => result.status === "fulfilled")
                .flatMap((result) => result.value || [])
                .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            setApprovals(nextApprovals);
        } catch (error) {
            console.error("Failed to load approvals", error);
            setApprovals([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const counts = useMemo(() => {
        return approvals.reduce((acc, item) => {
            acc[item.typeKey] = (acc[item.typeKey] || 0) + 1;
            acc.all += 1;
            return acc;
        }, { all: 0, project: 0, po: 0, grn: 0, stock: 0, returns: 0 });
    }, [approvals]);

    const visibleApprovals = activeTab === "all"
        ? approvals
        : approvals.filter((item) => item.typeKey === activeTab);

    const renderTitle = (typeKey) => {
        const meta = TYPE_META[typeKey];
        const Icon = meta.icon;
        return (
            <span className="d-inline-flex align-items-center gap-1">
                <Icon size={13} />
                {meta.label}
                <Badge bg={counts[typeKey] > 0 ? "primary" : "secondary"} pill>{counts[typeKey]}</Badge>
            </span>
        );
    };

    return (
        <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white border-bottom-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-dark">
                    <FaCheckCircle className="me-2 text-warning" />Pending Approvals
                </h5>
                <Button variant="link" size="sm" onClick={fetchData} disabled={loading}>
                    {loading ? "Refreshing..." : "Refresh"}
                </Button>
            </Card.Header>
            <Card.Body className="p-0">
                <Tabs
                    activeKey={activeTab}
                    onSelect={(key) => setActiveTab(key || "all")}
                    className="mb-0 border-bottom px-3"
                    variant="underline"
                >
                    {Object.keys(TYPE_META).map((typeKey) => (
                        <Tab eventKey={typeKey} title={renderTitle(typeKey)} key={typeKey}>
                            <div className="pending-approval-list">
                                {loading ? (
                                    <div className="pending-approval-empty">
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Loading approvals...
                                    </div>
                                ) : visibleApprovals.length === 0 ? (
                                    <div className="pending-approval-empty">
                                        No pending approvals in this view
                                    </div>
                                ) : (
                                    visibleApprovals.map((item) => (
                                        <div className="pending-approval-row" key={item.id}>
                                            <div className="pending-approval-main">
                                                <div className="fw-semibold text-break">{item.title}</div>
                                                <div className="small text-muted text-break">{item.subtitle}</div>
                                                <div className="small text-secondary text-break">{item.detail}</div>
                                            </div>
                                            <div className="pending-approval-meta">
                                                <Badge
                                                    bg={badgeVariant[item.typeKey] || "secondary"}
                                                    text={item.typeKey === "grn" ? "dark" : undefined}
                                                    className="text-wrap"
                                                >
                                                    {item.typeLabel}
                                                </Badge>
                                                <span className="small text-muted">{formatDate(item.date)}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                className="pending-approval-action"
                                                onClick={() => navigate(item.route)}
                                            >
                                                Review
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Tab>
                    ))}
                </Tabs>
            </Card.Body>
            <style>{`
                .pending-approval-list {
                    max-height: 310px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    width: 100%;
                }

                .pending-approval-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(120px, 170px) auto;
                    gap: 12px;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid #edf2f7;
                }

                .pending-approval-row:hover {
                    background: #f8fafc;
                }

                .pending-approval-main,
                .pending-approval-meta {
                    min-width: 0;
                }

                .pending-approval-meta {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 6px;
                }

                .pending-approval-action {
                    white-space: nowrap;
                }

                .pending-approval-empty {
                    padding: 24px 16px;
                    text-align: center;
                    color: #6c757d;
                }

                .card .nav-tabs,
                .card .nav-underline {
                    flex-wrap: wrap;
                    row-gap: 4px;
                }

                .card .nav-link {
                    white-space: normal;
                }

                @media (max-width: 768px) {
                    .pending-approval-row {
                        grid-template-columns: minmax(0, 1fr);
                    }

                    .pending-approval-meta {
                        flex-direction: row;
                        flex-wrap: wrap;
                        align-items: center;
                    }

                    .pending-approval-action {
                        width: fit-content;
                    }
                }
            `}</style>
        </Card>
    );
}
