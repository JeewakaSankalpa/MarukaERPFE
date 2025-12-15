import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Table, Badge } from "react-bootstrap";
import ReportLayout from "../ReusableComponents/ReportLayout";

const InvoiceView = () => {
    const { id } = useParams(); // invoiceId
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const invRes = await api.get(`/invoices/${id}`);
                setInvoice(invRes.data);

                if (invRes.data.projectId) {
                    const projRes = await api.get(`/projects/${invRes.data.projectId}`);
                    setProject(projRes.data);

                    if (projRes.data.customerId) {
                        const custRes = await api.get(`/customer/${projRes.data.customerId}`);
                        setCustomer(custRes.data);
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

    return (
        <div className="bg-white min-vh-100 p-4">
            <div className="d-flex justify-content-between mb-4 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div className="d-flex gap-2">
                    {/* Add Payment Button could go here later */}
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            <ReportLayout
                title="TAX INVOICE"
                orientation="portrait"
                subtitle={`Invoice #: ${invoice.invoiceNumber}`}
            >
                {/* Header Meta */}
                <div className="d-flex justify-content-between mb-4">
                    <div>
                        <strong>Bill To:</strong><br />
                        {customer ? (
                            <>
                                {customer.comName}<br />
                                {customer.pAddr}<br />
                                {customer.pContact}
                            </>
                        ) : "N/A"}
                    </div>
                    <div className="text-end">
                        <strong>Date:</strong> {invoice.issuedDate}<br />
                        <strong>Due Date:</strong> {invoice.dueDate}<br />
                        <strong>Status:</strong> <Badge bg={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                    </div>
                </div>

                {/* Items */}
                <Table bordered size="sm">
                    <thead className="table-light">
                        <tr>
                            <th>Description</th>
                            <th className="text-end" style={{ width: 80 }}>Qty</th>
                            <th className="text-end" style={{ width: 120 }}>Unit Price</th>
                            <th className="text-end" style={{ width: 120 }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items?.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.description}</td>
                                <td className="text-end">{item.quantity}</td>
                                <td className="text-end">{item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="text-end">{item.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="3" className="text-end fw-bold">Subtotal</td>
                            <td className="text-end">{invoice.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {invoice.vatAmount > 0 && (
                            <tr>
                                <td colSpan="3" className="text-end">VAT</td>
                                <td className="text-end">{invoice.vatAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        {invoice.taxAmount > 0 && (
                            <tr>
                                <td colSpan="3" className="text-end">Other Tax</td>
                                <td className="text-end">{invoice.taxAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        <tr className="table-active fw-bold fs-5">
                            <td colSpan="3" className="text-end">TOTAL PAYABLE</td>
                            <td className="text-end">{invoice.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </Table>

                <div className="mt-5">
                    <strong>Payment Terms:</strong>
                    <p className="small text-muted">
                        Please make checks payable to "Maruka Engineering".<br />
                        Bank Transfer: Account #123456789, Bank Name
                    </p>
                </div>
            </ReportLayout>
        </div>
    );
};

export default InvoiceView;
