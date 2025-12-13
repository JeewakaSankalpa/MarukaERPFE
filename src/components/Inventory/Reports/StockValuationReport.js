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
                                <th>Product ID</th>
                                <th>Product Name</th>
                                <th className="text-end">Quantity</th>
                                <th className="text-end">Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.productId}</td>
                                    <td>{item.productName || "Unknown Product"}</td>
                                    <td className="text-end">{item.quantity?.toLocaleString()}</td>
                                    <td className="text-end fw-bold">{item.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {/* Totals */}
                            <tr className="table-light fw-bold">
                                <td colSpan="2" className="text-end">TOTAL ASSETS</td>
                                <td className="text-end">{totals.qty.toLocaleString()}</td>
                                <td className="text-end border border-dark border-2">{totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </Table>
                </ReportLayout>
            )}
        </div>
    );
};

export default StockValuationReport;
