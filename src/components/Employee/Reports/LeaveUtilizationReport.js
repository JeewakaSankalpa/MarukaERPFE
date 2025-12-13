import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Button, Spinner, Table, Form } from "react-bootstrap";
import ReportLayout from "../../ReusableComponents/ReportLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

const LeaveUtilizationReport = () => {
    const [loading, setLoading] = useState(false);
    const [quotas, setQuotas] = useState([]);
    const [searchParams] = useSearchParams();
    const [year, setYear] = useState(searchParams.get("year") || new Date().getFullYear());
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, [year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/leave/reports/utilization?year=${year}`);
            setQuotas(res.data || []);
        } catch (error) {
            toast.error("Failed to load leave data");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-4 bg-white min-vh-100">
            {/* Controls */}
            <div className="d-flex justify-content-between mb-3 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div className="d-flex gap-2 align-items-center">
                    <Form.Label className="mb-0 me-2">Year:</Form.Label>
                    <Form.Control
                        type="number"
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        style={{ width: "100px" }}
                    />
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            {loading ? <div className="text-center p-5"><Spinner animation="border" /></div> : (
                <ReportLayout title={`Leave Utilization Report - ${year}`} orientation="portrait">
                    <Table bordered size="sm" style={{ fontSize: "12px" }}>
                        <thead>
                            <tr className="table-light">
                                <th rowSpan="2" className="align-middle">Employee</th>
                                <th colSpan="3" className="text-center">Annual</th>
                                <th colSpan="3" className="text-center">Casual</th>
                                <th colSpan="3" className="text-center">Sick</th>
                            </tr>
                            <tr className="table-light text-center">
                                <th>Total</th>
                                <th>Used</th>
                                <th>Bal</th>
                                <th>Total</th>
                                <th>Used</th>
                                <th>Bal</th>
                                <th>Total</th>
                                <th>Used</th>
                                <th>Bal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotas.map((q, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <div className="fw-bold">{q.employeeName || "Unknown"}</div>
                                        <small className="text-muted">{q.employeeId}</small>
                                    </td>

                                    <td className="text-center text-muted">{q.annualLeaveTotal}</td>
                                    <td className="text-center">{q.annualLeaveUsed}</td>
                                    <td className="text-center fw-bold">{q.annualLeaveTotal - q.annualLeaveUsed}</td>

                                    <td className="text-center text-muted">{q.casualLeaveTotal}</td>
                                    <td className="text-center">{q.casualLeaveUsed}</td>
                                    <td className="text-center fw-bold">{q.casualLeaveTotal - q.casualLeaveUsed}</td>

                                    <td className="text-center text-muted">{q.sickLeaveTotal}</td>
                                    <td className="text-center">{q.sickLeaveUsed}</td>
                                    <td className="text-center fw-bold">{q.sickLeaveTotal - q.sickLeaveUsed}</td>
                                </tr>
                            ))}
                            {quotas.length === 0 && (
                                <tr>
                                    <td colSpan="10" className="text-center p-3">No data found for {year}</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </ReportLayout>
            )}
        </div>
    );
};

export default LeaveUtilizationReport;
