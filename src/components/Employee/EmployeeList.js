import React, { useEffect, useState } from "react";
import { Table, Container, Button, Badge } from "react-bootstrap";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function EmployeeList() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await api.get("/employee/all");
            setEmployees(response.data || []);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch employees", error);
            toast.error("Failed to fetch employees");
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

    if (loading) return <div>Loading...</div>;

    return (
        <Container className="my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Employee Directory</h2>
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
                            <td>{emp.department?.name || emp.departmentId || "-"}</td>
                            <td>{emp.reportsToEmployeeId ? "Yes" : "-"}</td>
                            <td>
                                {emp.active ? <Badge bg="success">Active</Badge> : <Badge bg="danger">Inactive</Badge>}
                            </td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(emp.id)}>Edit</Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDisable(emp.id)}>Disable</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
}

export default EmployeeList;
