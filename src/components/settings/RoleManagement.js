import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Table, Spinner } from 'react-bootstrap';
import api from '../../api/api';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function RoleManagement() {
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRole, setNewRole] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const res = await api.get('/roles');
            setRoles(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load roles");
        } finally {
            setLoading(false);
        }
    };

    const handleAddRole = async (e) => {
        e.preventDefault();
        if (!newRole.trim()) return;
        
        try {
            setAdding(true);
            await api.post('/roles', { name: newRole.trim().toUpperCase() });
            toast.success("Role added successfully");
            setNewRole("");
            fetchRoles();
        } catch (err) {
            console.error(err);
            toast.error("Failed to add role");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteRole = async (roleName) => {
        if (!window.confirm(`Are you sure you want to delete the role: ${roleName}?`)) return;
        
        try {
            await api.delete(`/roles/${roleName}`);
            toast.success("Role deleted");
            fetchRoles();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete role");
        }
    };

    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Role Management</h3>
            </div>

            <Card className="mb-4">
                <Card.Header>Add New System Role</Card.Header>
                <Card.Body>
                    <Form onSubmit={handleAddRole} className="d-flex gap-2">
                        <Form.Control 
                            placeholder="e.g. STORE_KEEPER, ACCOUNTANT" 
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            disabled={adding}
                        />
                        <Button type="submit" variant="primary" disabled={adding || !newRole.trim()}>
                            {adding ? <Spinner size="sm" /> : "Add Role"}
                        </Button>
                    </Form>
                    <Form.Text className="text-muted">
                        Roles are used for system access control and employee categorization.
                    </Form.Text>
                </Card.Body>
            </Card>

            <Card shadow="sm">
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>Available System Roles</span>
                    <Button variant="outline-secondary" size="sm" onClick={fetchRoles} disabled={loading}>
                        Refresh
                    </Button>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-4"><Spinner /></div>
                    ) : (
                        <Table responsive hover bordered>
                            <thead className="table-light">
                                <tr>
                                    <th>Role Name</th>
                                    <th style={{ width: 120 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.length === 0 ? (
                                    <tr><td colSpan={2} className="text-center text-muted">No roles defined.</td></tr>
                                ) : (
                                    roles.map((role) => (
                                        <tr key={role}>
                                            <td className="fw-bold">{role}</td>
                                            <td>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm" 
                                                    onClick={() => handleDeleteRole(role)}
                                                    disabled={["ADMIN", "HR", "MANAGER", "EMPLOYEE"].includes(role)}
                                                    title={["ADMIN", "HR", "MANAGER", "EMPLOYEE"].includes(role) ? "System default roles cannot be deleted" : ""}
                                                >
                                                    Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
