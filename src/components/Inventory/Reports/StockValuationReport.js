import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Button, Spinner, Table } from "react-bootstrap";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const StockValuationReport = () => {
    const [loading, setLoading] = useState(false);
    const [stock, setStock] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await api.get("/reports/stock");
            setStock(res.data || []);
        } catch (error) {
            toast.error("Failed to load stock data");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const calculateTotals = () => {
        return stock.reduce((acc, item) => ({
            qty: acc.qty + (item.quantity || 0),
            value: acc.value + (item.totalValue || 0)
        }), { qty: 0, value: 0 });
    };

    const totals = calculateTotals();

    return (
        <div className="p-4 bg-white min-vh-100">
            {/* Controls */}
            <div className="d-flex justify-content-between mb-3 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
            </div>

            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                <ReportLayout title="Stock Valuation Report" orientation="portrait">
                    <Table bordered size="sm" style={{ fontSize: "12px" }}>
                        <thead>
                            <tr className="table-light">
                                <th style={{ width: 50 }}></th>
                                <th>Product Name</th>
                                <th className="text-end">Total Quantity</th>
                                <th className="text-end">Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.map((item, idx) => (
                                <ExpandableStockRow key={idx} item={item} />
                            ))}
                            {/* Grand Total Footer */}
                            <tr className="table-light fw-bold border-top border-dark">
                                <td colSpan="2" className="text-end">GRAND TOTAL ASSETS (ALL STOCK)</td>
                                <td className="text-end">{totals.qty.toLocaleString()}</td>
                                <td className="text-end text-primary" style={{ fontSize: "1.1em" }}>
                                    {totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </ReportLayout>
            )}
        </div>
    );
};

const ExpandableStockRow = ({ item }) => {
    const [expanded, setExpanded] = useState(false);
    const batches = item.batches || [];

    return (
        <>
            <tr className={expanded ? "table-active" : ""} style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
                <td className="text-center">{batches.length > 0 ? (expanded ? "▼" : "►") : "-"}</td>
                <td className="fw-bold">{item.productName || "Unknown Product"}</td>
                <td className="text-end fw-bold">{item.quantity?.toLocaleString()}</td>
                <td className="text-end fw-bold">{item.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            {expanded && batches.length > 0 && (
                <tr>
                    <td colSpan="4" className="p-0">
                        <div className="p-2 bg-light">
                            <Table size="sm" className="mb-0 bg-white" bordered>
                                <thead className="text-muted small">
                                    <tr>
                                        <th>Batch No</th>
                                        <th>Expiry</th>
                                        <th className="text-end">Qty</th>
                                        <th className="text-end">Unit Cost</th>
                                        <th className="text-end">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map((b, i) => (
                                        <tr key={i}>
                                            <td className="small">{b.batchNo}</td>
                                            <td className="small">{b.expiryDate || "-"}</td>
                                            <td className="text-end small">{b.quantity}</td>
                                            <td className="text-end small">{b.unitCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end small">{b.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};


export default StockValuationReport;
