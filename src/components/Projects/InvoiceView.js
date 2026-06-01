import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Table, Badge, Form } from "react-bootstrap";
import ReportLayout from "../ReusableComponents/ReportLayout";

const money = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
};

const PRINT_FORMATS = {
    ALL: "all",
    COMPONENTS_ONLY: "componentsOnly",
    COMPONENTS_WITH_ITEMS: "componentsWithItems",
    TOTALS_ONLY: "totalsOnly",
};

const getInvoiceGroups = (items = []) => {
    const groups = new Map();

    items.forEach((item, index) => {
        const description = item.description || "Item";
        const [prefix, ...rest] = description.split(":");
        const canGroup = rest.length > 0 && prefix.trim();
        const componentName = canGroup ? prefix.trim() : "Items";
        const itemName = canGroup ? rest.join(":").trim() : description;

        if (!groups.has(componentName)) {
            groups.set(componentName, {
                description: componentName,
                quantity: 1,
                unitPrice: 0,
                total: 0,
                items: [],
            });
        }

        const group = groups.get(componentName);
        group.total += Number(item.total || 0);
        group.unitPrice = group.total;
        group.items.push({
            ...item,
            description: itemName || description,
            key: `${componentName}-${index}`,
        });
    });

    return Array.from(groups.values());
};

const InvoiceView = () => {
    const { id } = useParams(); // invoiceId
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [payments, setPayments] = useState([]);
    const [estimation, setEstimation] = useState(null);
    const [printFormat, setPrintFormat] = useState(PRINT_FORMATS.ALL);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const invRes = await api.get(`/invoices/${id}`);
                setInvoice(invRes.data);

                if (invRes.data.projectId) {
                    try {
                        const estRes = await api.get(`/estimations/by-project/${invRes.data.projectId}`);
                        setEstimation(estRes.data);
                    } catch (estErr) {
                        console.warn("Could not fetch source estimation", estErr);
                    }

                    const projRes = await api.get(`/projects/${invRes.data.projectId}`);
                    setProject(projRes.data);

                    if (projRes.data.customerId) {
                        const custRes = await api.get(`/customer/${projRes.data.customerId}`);
                        setCustomer(custRes.data);
                    }

                    try {
                        const payRes = await api.get(`/project-accounts/${invRes.data.projectId}/payments`);
                        setPayments(payRes.data || []);
                    } catch (payErr) {
                        console.warn("Could not fetch payments for project", payErr);
                    }
                }
            } catch (error) {
                console.error("Failed to load invoice", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handlePrint = () => window.print();

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (!invoice) return <div className="text-center p-5">Invoice not found.</div>;

    const getStatusVariant = (s) => {
        switch (s) {
            case 'PAID': return 'success';
            case 'PENDING': return 'warning';
            case 'CANCELLED': return 'danger';
            default: return 'secondary';
        }
    };

    const totalReceived = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balanceDue = (invoice.totalAmount || 0) - totalReceived;
    const isTaxInvoice = Number(invoice.vatAmount || 0) > 0 && invoice.status !== "PENDING";
    const documentTitle = isTaxInvoice ? "Tax Invoice" : "Proforma Invoice";
    const projectRef = project?.jobNumber || project?.projectNumber || project?.projectCode || project?.id || invoice.projectId;
    const poRef = project?.poNumber || project?.customerPoNo || project?.purchaseOrderNo || "Verbally confirmed";
    const groupedItems = estimation?.components?.length
        ? estimation.components.map((comp) => ({
            description: comp.name,
            quantity: 1,
            unitPrice: Number(comp.lineTotalBeforeTax ?? comp.subtotalWithMargin ?? comp.itemsSubtotal ?? 0),
            total: Number(comp.lineTotalBeforeTax ?? comp.subtotalWithMargin ?? comp.itemsSubtotal ?? 0),
            items: (comp.items || []).map((item, idx) => ({
                key: `${comp.name}-${idx}`,
                description: item.productNameSnapshot || item.productId,
                quantity: item.quantity,
                unitPrice: Number(item.estUnitCost || 0),
                total: Number(item.quantity || 0) * Number(item.estUnitCost || 0),
            })),
        }))
        : getInvoiceGroups(invoice.items);
    const displayItems = invoice.items || [];

    return (
        <div className="bg-white min-vh-100 p-4">
            <div className="d-flex justify-content-between mb-4 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div className="d-flex gap-2 align-items-center">
                    <Form.Select
                        size="sm"
                        className="w-auto"
                        value={printFormat}
                        onChange={(e) => setPrintFormat(e.target.value)}
                        aria-label="Invoice print format"
                    >
                        <option value={PRINT_FORMATS.ALL}>Show everything</option>
                        <option value={PRINT_FORMATS.COMPONENTS_ONLY}>Main components only</option>
                        <option value={PRINT_FORMATS.COMPONENTS_WITH_ITEMS}>Components + subcomponent names</option>
                        <option value={PRINT_FORMATS.TOTALS_ONLY}>Totals only</option>
                    </Form.Select>
                    {/* Add Payment Button could go here later */}
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            <ReportLayout
                title={documentTitle}
                orientation="portrait"
                subtitle={`No: ${invoice.invoiceNumber}`}
            >
                <div className="d-flex justify-content-between mb-4 gap-4">
                    <div style={{ maxWidth: "55%" }}>
                        <div className="fw-bold text-uppercase mb-2">Bill To</div>
                        {customer ? (
                            <>
                                <div className="fw-bold">{customer.comName || customer.name}</div>
                                <div>{customer.pAddr || customer.address}</div>
                                <div>{customer.pContact || customer.contactNo}</div>
                                <div>{customer.email || customer.comEmail}</div>
                                {customer.vatNumber && <div><strong>VAT No:</strong> {customer.vatNumber}</div>}
                            </>
                        ) : "N/A"}
                    </div>
                    <div className="text-end" style={{ minWidth: 250 }}>
                        <div><strong>Date:</strong> {formatDate(invoice.issuedDate)}</div>
                        <div><strong>Due Date:</strong> {formatDate(invoice.dueDate)}</div>
                        <div><strong>PO No:</strong> {poRef}</div>
                        <div><strong>Project No:</strong> {projectRef}</div>
                        <div><strong>Status:</strong> <Badge bg={getStatusVariant(invoice.status)}>{invoice.status}</Badge></div>
                    </div>
                </div>

                {printFormat !== PRINT_FORMATS.TOTALS_ONLY && (
                    <Table bordered size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>Description</th>
                                {printFormat === PRINT_FORMATS.ALL && (
                                    <>
                                        <th className="text-end" style={{ width: 80 }}>Qty</th>
                                        <th className="text-end" style={{ width: 130 }}>Rate</th>
                                    </>
                                )}
                                <th className="text-end" style={{ width: 130 }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printFormat === PRINT_FORMATS.ALL && displayItems.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.description}</td>
                                    <td className="text-end">{item.quantity}</td>
                                    <td className="text-end">{money(item.unitPrice)}</td>
                                    <td className="text-end">{money(item.total)}</td>
                                </tr>
                            ))}
                            {printFormat !== PRINT_FORMATS.ALL && groupedItems.map((group, idx) => (
                                <React.Fragment key={idx}>
                                    <tr className="table-secondary">
                                        <td><strong>{group.description}</strong></td>
                                        <td className="text-end fw-bold">{money(group.total)}</td>
                                    </tr>
                                    {printFormat === PRINT_FORMATS.COMPONENTS_WITH_ITEMS && group.items?.map((item) => (
                                        <tr key={item.key}>
                                            <td className="ps-4">{item.description}</td>
                                            <td />
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </Table>
                )}

                <Table bordered size="sm" className={printFormat === PRINT_FORMATS.TOTALS_ONLY ? "" : "mt-3"}>
                    <tfoot>
                        <tr>
                            <td className="text-end fw-bold">Subtotal</td>
                            <td className="text-end" style={{ width: 130 }}>{money(invoice.subtotal)}</td>
                        </tr>
                        {invoice.vatAmount > 0 && (
                            <tr>
                                <td className="text-end">VAT</td>
                                <td className="text-end">{money(invoice.vatAmount)}</td>
                            </tr>
                        )}
                        {invoice.taxAmount > 0 && (
                            <tr>
                                <td className="text-end">Other Tax</td>
                                <td className="text-end">{money(invoice.taxAmount)}</td>
                            </tr>
                        )}
                        <tr className="table-active fw-bold fs-5">
                            <td className="text-end">TOTAL</td>
                            <td className="text-end">{money(invoice.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </Table>

                {/* Payments Section */}
                {payments.length > 0 && (
                    <div className="mt-4">
                        <h6 className="fw-bold text-uppercase mb-3">Payments Received</h6>
                        <Table bordered size="sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Reference Number</th>
                                    <th>Payment Slip</th>
                                    <th className="text-end">Amount Received</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p, idx) => (
                                    <tr key={idx}>
                                        <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-'}</td>
                                        <td>{p.note || '-'}</td>
                                        <td>
                                            {p.fileUrl ? (
                                                <a href={p.fileUrl} target="_blank" rel="noopener noreferrer">View Slip</a>
                                            ) : '-'}
                                        </td>
                                        <td className="text-end text-success">
                                            {money(p.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="3" className="text-end fw-bold">TOTAL PAYABLE</td>
                                    <td className="text-end fw-bold text-primary">
                                        {money(invoice.totalAmount)}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan="3" className="text-end fw-bold">TOTAL PAID</td>
                                    <td className="text-end fw-bold text-success">
                                        {money(totalReceived)}
                                    </td>
                                </tr>
                                <tr className="table-active">
                                    <td colSpan="3" className="text-end fw-bold">BALANCE DUE</td>
                                    <td className="text-end fw-bold text-danger fs-6">
                                        {money(balanceDue)}
                                    </td>
                                </tr>
                            </tfoot>
                        </Table>
                    </div>
                )}

                <div className="mt-5">
                    <strong>Payment Terms:</strong>
                    <p className="small text-muted mb-2">
                        50% advance and balance prior to delivery, unless otherwise agreed in writing.
                    </p>
                    <strong>Warranty:</strong>
                    <p className="small text-muted mb-2">One year warranty against manufacturing defects.</p>
                    <strong>Bank Details:</strong>
                    <p className="small text-muted mb-0">
                        Please use the official Maruka bank account details issued with the approved commercial document.
                    </p>
                </div>

                {!isTaxInvoice && (
                    <div className="mt-5 d-flex justify-content-between gap-5">
                        <div style={{ width: "45%" }}>
                            <div className="border-top pt-2 small text-muted">Accepted By</div>
                        </div>
                        <div style={{ width: "45%" }}>
                            <div className="border-top pt-2 small text-muted">Date</div>
                        </div>
                    </div>
                )}
                <div className="mt-4 small text-muted">
                    This document was generated from the approved project estimation. Detailed costing remains in the project estimation record.
                </div>
            </ReportLayout>
        </div>
    );
};

export default InvoiceView;
