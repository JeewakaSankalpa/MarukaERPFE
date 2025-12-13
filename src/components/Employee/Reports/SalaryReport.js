import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Button, Spinner, Table } from "react-bootstrap";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

const SalaryReport = () => {
    const [loading, setLoading] = useState(false);
    const [salaries, setSalaries] = useState([]);
    const [searchParams] = useSearchParams();
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM

    // Fetch Data
    useEffect(() => {
        const fetchSalaries = async () => {
            setLoading(true);
            try {
                // Assuming existing endpoint supports filtering
                const res = await api.get(`/salary/list?month=${month}`);
                setSalaries(res.data || []);
            } catch (error) {
                toast.error("Failed to load salary data");
            } finally {
                setLoading(false);
            }
        };
        fetchSalaries();
    }, [month]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-4 bg-white min-vh-100">
            {/* Controls - Hidden in Print */}
            <div className="d-flex justify-content-between mb-3 no-print">
                <Button variant="secondary" onClick={() => window.history.back()}>Back</Button>
                <div className="d-flex gap-2">
                    <span className="align-self-center fw-bold">Month: {month}</span>
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                <ReportLayout title={`Salary Sheet - ${month}`} orientation="landscape">
                    <Table bordered size="sm" style={{ fontSize: "12px" }}>
                        <thead>
                            <tr className="table-light">
                                <th>Emp ID</th>
                                <th>Name</th>
                                <th className="text-end">Basic</th>
                                <th className="text-end">Allowances</th>
                                <th className="text-end">OT Hours</th>
                                <th className="text-end">OT Pay</th>
                                <th className="text-end">Gross</th>
                                <th className="text-end">EPF (8%)</th>
                                <th className="text-end">Tax</th>
                                <th className="text-end fw-bold">Net Salary</th>
                                <th className="text-end">EPF (12%)</th>
                                <th className="text-end">ETF (3%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salaries.map((sal, idx) => (
                                <tr key={idx}>
                                    <td>{sal.employeeId}</td>
                                    <td>{sal.employeeName || "Unknown"}</td>
                                    <td className="text-end">{sal.basicSalary?.toFixed(2)}</td>
                                    <td className="text-end">{sal.allowances?.toFixed(2)}</td>
                                    <td className="text-end">{sal.overtimeHours}</td>
                                    <td className="text-end">{sal.overtimePay?.toFixed(2)}</td>
                                    <td className="text-end fw-bold">{sal.grossSalary?.toFixed(2)}</td>
                                    <td className="text-end text-danger">{sal.epfEmployee?.toFixed(2)}</td>
                                    <td className="text-end text-danger">{sal.tax?.toFixed(2)}</td>
                                    <td className="text-end fw-bold bg-light">{sal.netSalary?.toFixed(2)}</td>
                                    <td className="text-end text-muted">{sal.epfEmployer?.toFixed(2)}</td>
                                    <td className="text-end text-muted">{sal.etfEmployer?.toFixed(2)}</td>
                                </tr>
                            ))}
                            {/* Totals Row */}
                            {salaries.length > 0 && (
                                <tr className="fw-bold bg-light">
                                    <td colSpan="2">TOTAL</td>
                                    <td className="text-end">{salaries.reduce((sum, s) => sum + (s.basicSalary || 0), 0).toFixed(2)}</td>
                                    <td></td>
                                    <td></td>
                                    <td className="text-end">{salaries.reduce((sum, s) => sum + (s.overtimePay || 0), 0).toFixed(2)}</td>
                                    <td className="text-end">{salaries.reduce((sum, s) => sum + (s.grossSalary || 0), 0).toFixed(2)}</td>
                                    <td className="text-end">{salaries.reduce((sum, s) => sum + (s.epfEmployee || 0), 0).toFixed(2)}</td>
                                    <td className="text-end">{salaries.reduce((sum, s) => sum + (s.tax || 0), 0).toFixed(2)}</td>
                                    <td className="text-end border border-dark">{salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0).toFixed(2)}</td>
                                    <td className="text-end">{salaries.reduce((sum, s) => sum + (s.epfEmployer || 0), 0).toFixed(2)}</td>
                                    <td className="text-end">{salaries.reduce((sum, s) => sum + (s.etfEmployer || 0), 0).toFixed(2)}</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </ReportLayout>
            )}
        </div>
    );
};

export default SalaryReport;
