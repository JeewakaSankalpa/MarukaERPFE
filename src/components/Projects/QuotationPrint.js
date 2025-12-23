import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Table, Alert } from "react-bootstrap";
import ReportLayout from "../ReusableComponents/ReportLayout";

const QuotationPrint = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [estimation, setEstimation] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);

    const fetchData = async () => {
        try {
            const estRes = await api.get(`/estimations/by-project/${projectId}`);
            setEstimation(estRes.data);

            const projRes = await api.get(`/projects/${projectId}`);
            setProject(projRes.data);

            if (projRes.data.customerId) {
                const custRes = await api.get(`/customer/${projRes.data.customerId}`);
                setCustomer(custRes.data);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [projectId]);

    const handleFinalize = async () => {
        if (!window.confirm("Are you sure you want to finalize this quotation? It will be locked.")) return;
        try {
            await api.post(`/estimations/${estimation.id}/finalize`);
            fetchData();
        } catch (error) {
            alert("Failed to finalize quotation");
        }
    };

    const handleGenerateInvoice = async () => {
        if (!window.confirm("Generate a new Invoice from this Quotation?")) return;
        try {
            const res = await api.post(`/invoices/generate-from-estimation/${estimation.id}`);
            navigate(`/invoices/${res.data.id}`);
        } catch (error) {
            console.error(error);
            alert("Failed to generate invoice");
        }
    };

    const handlePrint = () => window.print();

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (!estimation) return <div className="text-center p-5">No estimation found for this project.</div>;

    const isFinalized = estimation.status === "FINALIZED";

    return (
        <div className="bg-white min-vh-100 p-4">
            {/* Controls */}
            <div className="d-flex justify-content-between mb-4 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div className="d-flex gap-2">
                    {!isFinalized && (
                        <Button variant="success" onClick={handleFinalize}>Finalize Quote</Button>
                    )}
                    {isFinalized && (
                        <Button variant="warning" onClick={handleGenerateInvoice}>Generate Invoice</Button>
                    )}
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            {isFinalized && <Alert variant="success" className="no-print">This quotation is finalized and locked.</Alert>}

            <ReportLayout
                title={`QUOTATION: ${project?.projectName || "Project"}`}
                orientation="portrait"
                subtitle={`Ref: ${project?.id || projectId} - v${estimation.version || 1}`}
            >
                {/* Customer Info */}
                <div className="mb-4 d-flex justify-content-between">
                    <div>
                        <strong>Bill To:</strong><br />
                        {customer ? (
                            <>
                                {customer.comName}<br />
                                {customer.pAddr}<br />
                                {customer.pContact}<br />
                                {customer.email}
                            </>
                        ) : "Customer Details Not Available"}
                    </div>
                    <div className="text-end">
                        <strong>Date:</strong> {new Date().toLocaleDateString()}<br />
                        <strong>Valid Until:</strong> {new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}
                    </div>
                </div>

                {/* Items */}
                <Table bordered size="sm">
                    <thead className="table-light">
                        <tr>
                            <th>Description</th>
                            <th className="text-end" style={{ width: "100px" }}>Qty</th>
                            <th className="text-end" style={{ width: "150px" }}>Unit Price</th>
                            <th className="text-end" style={{ width: "150px" }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estimation.components?.map((comp, idx) => (
                            <React.Fragment key={idx}>
                                <tr className="table-secondary">
                                    <td colSpan="4"><strong>{comp.name}</strong></td>
                                </tr>
                                {comp.items?.map((item, i) => (
                                    <tr key={`${idx}-${i}`}>
                                        <td className="ps-4">{item.productNameSnapshot || item.productId}</td>
                                        <td className="text-end">{item.quantity}</td>
                                        <td className="text-end">{(item.estUnitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="text-end">{((item.quantity || 0) * (item.estUnitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="3" className="text-end fw-bold">Subtotal</td>
                            <td className="text-end">{estimation.computedSubtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {estimation.computedVatAmount > 0 && (
                            <tr>
                                <td colSpan="3" className="text-end">VAT ({estimation.vatPercent}%)</td>
                                <td className="text-end">{estimation.computedVatAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        <tr className="table-active fw-bold fs-5">
                            <td colSpan="3" className="text-end">GRAND TOTAL</td>
                            <td className="text-end">{estimation.computedGrandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </Table>

                {(estimation.customNote) && (
                    <div className="mt-4 p-3 bg-light border rounded no-print-bg">
                        <strong>Notes:</strong>
                        <p className="mb-0 small" style={{ whiteSpace: "pre-wrap" }}>{estimation.customNote}</p>
                    </div>
                )}

                <div className="mt-4">
                    <strong>Terms & Conditions:</strong>
                    {estimation.terms && estimation.terms.length > 0 ? (
                        <Table size="sm" className="mt-2" bordered>
                            <tbody>
                                {estimation.terms.map((t, idx) => (
                                    <tr key={idx}>
                                        <td style={{ width: "30%", fontWeight: "bold", fontSize: "0.9rem" }}>{t.label}</td>
                                        <td style={{ fontSize: "0.9rem" }}>{t.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <ul className="small text-muted mt-2">
                            <li>This quotation is valid for 30 days from the date of issue.</li>
                            <li>Payment terms: 50% advance, 50% upon completion.</li>
                            <li>Delivery timeline: Subject to material availability.</li>
                        </ul>
                    )}
                </div>
            </ReportLayout>
        </div>
    );
};

export default QuotationPrint;
