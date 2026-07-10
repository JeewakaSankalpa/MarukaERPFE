import React, { useCallback, useEffect, useState } from "react";
import api from "../../../api/api";
import { Button, Spinner, Table } from "react-bootstrap";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Printer, RefreshCw } from "lucide-react";

const StockValuationReport = () => {
    const [loading, setLoading] = useState(false);
    const [stock, setStock] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const navigate = useNavigate();

    const fetchStock = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get("/reports/stock", {
                params: { _: Date.now() }
            });
            setStock(res.data || []);
            setLastUpdated(new Date());
        } catch (error) {
            if (!silent) toast.error("Failed to load stock data");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStock();
        const intervalId = setInterval(() => fetchStock({ silent: true }), 60000);
        return () => clearInterval(intervalId);
    }, [fetchStock]);

    const handlePrint = () => {
        window.print();
    };

    const calculateTotals = () => {
        let qty = 0;
        let value = 0;
        let batchCount = 0;
        stock.forEach(item => {
            qty += (item.quantity || 0);
            value += (item.totalValue || 0);
            batchCount += (item.batches || []).length;
        });
        return { qty, value, batchCount };
    };

    const totals = calculateTotals();
    const averageUnitCost = totals.qty > 0 ? (totals.value / totals.qty) : 0;

    return (
        <div className="p-4 bg-white min-vh-100">
            {/* Controls */}
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div className="d-flex align-items-center gap-2">
                    {lastUpdated && (
                        <small className="text-muted">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </small>
                    )}
                    <Button variant="outline-primary" onClick={() => fetchStock()} disabled={loading}>
                        <RefreshCw size={16} className="me-2" />
                        Refresh
                    </Button>
                    <Button variant="primary" onClick={handlePrint}>
                        <Printer size={16} className="me-2" />
                        Print / Save PDF
                    </Button>
                </div>
            </div>

            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                <ReportLayout title="Stock Valuation Report" orientation="portrait">
                    {/* Confidential Stock Metrics Panel */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <div className="p-3 border rounded bg-light text-center">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Stock Valuation</small>
                                <h5 className="mb-0 fw-bold text-primary">
                                    Rs. {totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h5>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="p-3 border rounded bg-light text-center">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Quantity</small>
                                <h5 className="mb-0 fw-bold text-dark">
                                    {totals.qty.toLocaleString()}
                                </h5>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="p-3 border rounded bg-light text-center">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Average Unit Cost</small>
                                <h5 className="mb-0 fw-bold text-dark">
                                    Rs. {averageUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h5>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="p-3 border rounded bg-light text-center">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Active Batches</small>
                                <h5 className="mb-0 fw-bold text-dark">
                                    {totals.batchCount.toLocaleString()}
                                </h5>
                            </div>
                        </div>
                    </div>

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
                                <td colSpan="2" className="text-end">GRAND TOTAL ASSETS (STORE STOCK)</td>
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
