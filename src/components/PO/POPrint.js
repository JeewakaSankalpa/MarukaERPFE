import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Table } from "react-bootstrap";
import logo from "../../assets/logo.jpeg"; // Assuming a logo exists, or use a placeholder text if not found

const POPrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [po, setPo] = useState(null);
    const [supplier, setSupplier] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`/pos/${id}`);
                setPo(res.data);
                if (res.data.supplierId) {
                    try {
                        const sup = await api.get(`/suppliers/${res.data.supplierId}`);
                        setSupplier(sup.data);
                    } catch (e) { console.warn("Supplier fetch failed", e); }
                }
            } catch (e) {
                console.error("Failed to load PO", e);
                alert("Failed to load PO details");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handlePrint = () => window.print();

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /> Loading Print View...</div>;
    if (!po) return <div className="text-center p-5">PO not found</div>;

    console.log("Rendering POPrint with PO:", po);

    // Calculations
    const subTotal = (po.items || []).reduce((sum, item) => {
        if (!item) return sum;
        return sum + ((item.orderedQty || 0) * (item.unitPrice || 0));
    }, 0);

    const taxTotal = (po.items || []).reduce((sum, item) => {
        if (!item) return sum;
        const itemTotal = (item.orderedQty || 0) * (item.unitPrice || 0);
        return sum + (itemTotal * ((item.taxPercent || 0) / 100));
    }, 0);

    const grandTotal = subTotal + taxTotal;

    return (
        <div className="bg-white min-vh-100 p-4" style={{ color: "#000", fontFamily: "Arial, sans-serif" }}>
            {/* Action Bar - Hidden in Print */}
            <div className="d-flex justify-content-between mb-4 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <Button variant="primary" onClick={handlePrint}>Print / PDF</Button>
            </div>

            {/* Print Area Container */}
            <div className="print-container" style={{ maxWidth: "210mm", margin: "0 auto" }}>

                {/* Header Section */}
                <div className="d-flex justify-content-between align-items-start mb-5">
                    <div style={{ fontSize: "0.9rem", lineHeight: "1.4" }}>
                        <h4 className="fw-bold mb-1">Maruka Technologies (Pvt) Ltd</h4>
                        <div>558/7, Sethsiri Place,</div>
                        <div>Pannipitiya, Sri Lanka 10230</div>
                        <div>rukjayasinghe@gmail.com</div>
                        <div>Govt. UID VAT Reg: 174038295-7000</div>
                    </div>
                    <div className="text-end">
                        {/* Use logo if available, else styled text */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {/* Placeholder for SVG logo from common or asset */}
                            <div style={{ textAlign: "left" }}>
                                <h2 style={{ color: "#777", fontWeight: "300", letterSpacing: "1px", margin: 0 }}>MARUKA</h2>
                                <h4 style={{ color: "#000", fontWeight: "bold", margin: 0 }}>Technologies</h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-info fw-bold mb-4" style={{ color: "#0dcaf0 !important" }}>Purchase Order</h2>

                {/* Addresses Row */}
                <div className="row mb-4">
                    <div className="col-4">
                        <h6 className="fw-bold text-uppercase mb-2">VENDOR</h6>
                        {supplier ? (
                            <div style={{ fontSize: "0.9rem" }}>
                                <div><strong>{supplier.contactPerson}</strong></div>
                                <div>{supplier.comName}</div>
                                <div style={{ whiteSpace: "pre-wrap" }}>
                                    {[supplier.address.line1, supplier.address.line2, supplier.address.city, supplier.address.state, supplier.address.country]
                                        .filter(Boolean)
                                        .join("\n")}
                                </div>
                            </div>
                        ) : (
                            <div>{po.supplierNameSnapshot}</div>
                        )}
                    </div>
                    <div className="col-4">
                        <h6 className="fw-bold text-uppercase mb-2">SHIP TO</h6>
                        {po.shippingAddress ? (
                            <div style={{ fontSize: "0.9rem" }}>
                                <div><strong>{po.shippingAddress.name || "Maruka Technologies (Pvt) Ltd"}</strong></div>
                                <div>{po.shippingAddress.line1}</div>
                                {po.shippingAddress.line2 && <div>{po.shippingAddress.line2}</div>}
                                <div>
                                    {[po.shippingAddress.city, po.shippingAddress.state, po.shippingAddress.postalCode]
                                        .filter(Boolean).join(", ")}
                                </div>
                                <div>{po.shippingAddress.country}</div>
                            </div>
                        ) : (
                            <div style={{ fontSize: "0.9rem" }}>
                                <div>Maruka Technologies (Pvt) Ltd</div>
                                <div>54/05,</div>
                                <div>Marangahahena Horaketiya,</div>
                                <div>Kuduaduwa Road,</div>
                                <div>Horana</div>
                            </div>
                        )}
                    </div>
                    <div className="col-4 text-end">
                        <div className="mb-2">
                            <span className="fw-bold me-2">P.O. NO.</span>
                            <span>{po.poNumber}</span>
                        </div>
                        <div>
                            <span className="fw-bold me-2">DATE</span>
                            <span>{po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </div>

                <hr className="my-4" style={{ borderTop: "2px solid #0dcaf0", opacity: 1 }} />

                {/* References */}
                <div className="row mb-4">
                    <div className="col-6">
                        <h6 className="fw-bold text-uppercase" style={{ fontSize: "0.85rem" }}>QUOTATION NO</h6>
                        <div>{po.quotationRef || "-"}</div>
                    </div>
                    <div className="col-6">
                        <h6 className="fw-bold text-uppercase" style={{ fontSize: "0.85rem" }}>PROJECT NO</h6>
                        <div>{po.projectRef || (po.prLinks && po.prLinks.length > 0 ? po.prLinks[0].prNumber : "-")}</div>
                    </div>
                </div>

                {/* Items Table */}
                <Table borderless className="mb-4">
                    <thead style={{ backgroundColor: "#d1ecf1", color: "#0c5460" }}>
                        <tr>
                            <th style={{ padding: "8px 12px" }}>DESCRIPTION</th>
                            <th style={{ padding: "8px 12px", textAlign: "center", width: "80px" }}>QTY</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", width: "120px" }}>RATE</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", width: "140px" }}>AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(po.items || []).map((item, idx) => {
                            if (!item) return null;
                            const amount = (item.orderedQty || 0) * (item.unitPrice || 0);
                            return (
                                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                                    <td style={{ padding: "12px" }}>{item.productNameSnapshot || item.productName}</td>
                                    <td style={{ padding: "12px", textAlign: "center" }}>{item.orderedQty}</td>
                                    <td style={{ padding: "12px", textAlign: "right" }}>
                                        {item.unitPrice ? item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "-"}
                                    </td>
                                    <td style={{ padding: "12px", textAlign: "right" }}>
                                        {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>

                {/* Totals */}
                <div className="d-flex justify-content-end mb-5">
                    <div style={{ width: "250px" }}>
                        <div className="d-flex justify-content-between mb-2">
                            <span>SUBTOTAL</span>
                            <span>{subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span>TAX</span>
                            <span>{taxTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="d-flex justify-content-between fw-bold" style={{ fontSize: "1.1rem" }}>
                            <span>TOTAL</span>
                            <span>LKR {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div style={{ marginTop: "100px" }}>
                    <div className="row align-items-end mb-5">
                        <div className="col-2">Approved By</div>
                        <div className="col-10" style={{ borderBottom: "2px solid #000" }}></div>
                    </div>
                    <div className="row align-items-end">
                        <div className="col-2">Date</div>
                        <div className="col-10" style={{ borderBottom: "2px solid #000" }}></div>
                    </div>
                </div>

            </div>

            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-container, .print-container * {
                            visibility: visible;
                        }
                        .print-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print { display: none !important; }
                    }
                `}
            </style>
        </div>
    );
};

export default POPrint;
