import { ArrowLeft } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { Table, Container, Button, Badge } from "react-bootstrap";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function EmployeeList() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const [empRes, depRes] = await Promise.all([
                api.get("/employee/all"),
                api.get("/departments?size=1000") // Fetch all for lookup
            ]);
            setEmployees(empRes.data || []);
            setDepartments(depRes.data?.content || []);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to fetch employees/departments");
            setLoading(false);
        }
    };

    const handleEdit = (id) => {
        navigate(`/employee/edit/${id}`);
    };

    const handleDisable = async (id) => {
        if (!window.confirm("Are you sure you want to disable this employee?")) return;
        try {
            await api.delete(`/employee/${id}`); // Assumes endpoint is DELETE /employee/{id} for disable
            toast.success("Employee disabled");
            fetchEmployees();
        } catch (e) {
            toast.error("Failed to disable employee");
        }
    };

    const handleEnable = async (id) => {
        if (!window.confirm("Are you sure you want to enable this employee?")) return;
        try {
            await api.put(`/employee/${id}/enable`); 
            toast.success("Employee enabled");
            fetchEmployees();
        } catch (e) {
            toast.error("Failed to enable employee");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <Container className="my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0">Employee Directory</h2>
                        </div>
<Button variant="primary" onClick={() => navigate("/employee/create")}>+ Add Employee</Button>
            </div>

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Dept</th>
                        <th>Manager</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map((emp) => (
                        <tr key={emp.id}>
                            <td>
                                <div>{emp.firstName} {emp.lastName}</div>
                                <small className="text-muted">{emp.designation}</small>
                            </td>
                            <td>{emp.role}</td>
                            <td>{departments.find(d => d.id === emp.departmentId)?.name || emp.departmentId || "-"}</td>
                            <td>{emp.reportsToEmployeeId ? "Yes" : "-"}</td>
                            <td>
                                {emp.active ? <Badge bg="success">Active</Badge> : <Badge bg="danger">Inactive</Badge>}
                            </td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(emp.id)}>Edit</Button>
                                {emp.active ? (
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDisable(emp.id)}>Disable</Button>
                                ) : (
                                    <Button variant="outline-success" size="sm" onClick={() => handleEnable(emp.id)}>Enable</Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
}

export default EmployeeList;
