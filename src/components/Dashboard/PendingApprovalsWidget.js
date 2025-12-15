import React, { useEffect, useState } from "react";
import { Card, Table, Badge, Button, Tabs, Tab } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../api/api"; // Adjust path
import { FaCheckCircle, FaFileInvoiceDollar, FaProjectDiagram } from "react-icons/fa";

export default function PendingApprovalsWidget() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('projects');
    const [projectApprovals, setProjectApprovals] = useState([]);
    const [poApprovals, setPoApprovals] = useState([]);
    const [loading, setLoading] = useState(false);

    const userRole = localStorage.getItem("role") || "";

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'projects') {
                // Fetch Project Approvals
                // Endpoint expects 'roles' param. We send current user role.
                const res = await api.get("/projects/pending-approvals", {
                    params: { roles: userRole }
                });
                setProjectApprovals(res.data || []);
            } else {
                // Fetch PO Approvals
                // POStatus enum: DRAFT, CREATED, SENT_TO_SUPPLIER...
                // CREATED means ready for review/sending.
                const res = await api.get("/pos", {
                    params: { status: "CREATED", page: 0, size: 5 }
                });
                setPoApprovals(res.data?.content || []);
            }
        } catch (error) {
            console.error("Failed to load approvals", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="h-100 shadow-sm">
            <Card.Header className="bg-white border-bottom-0 py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-dark"><FaCheckCircle className="me-2 text-warning" />Pending Approvals</h5>
                <Button variant="link" size="sm" onClick={fetchData}>Refresh</Button>
            </Card.Header>
            <Card.Body className="p-0">
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="mb-0 border-bottom px-3"
                    variant="underline" // Newer Bootstrap? Or just standard
                >
                    <Tab eventKey="projects" title="Projects">
                        <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <Table hover className="mb-0 custom-table">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Project</th>
                                        <th>Current Stage</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectApprovals.length === 0 ? (
                                        <tr><td colSpan="3" className="text-center py-3 text-muted">No pending project approvals</td></tr>
                                    ) : (
                                        projectApprovals.map((p, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="fw-semibold">{p.projectName}</div>
                                                    <div className="small text-muted">{p.customerName}</div>
                                                </td>
                                                <td><Badge bg="info">{p.stageType}</Badge></td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/projects/details/${p.projectId}`)}>
                                                        Review
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Tab>
                    <Tab eventKey="pos" title="Purchase Orders">
                        <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <Table hover className="mb-0 custom-table">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Supplier</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {poApprovals.length === 0 ? (
                                        <tr><td colSpan="3" className="text-center py-3 text-muted">No pending POs</td></tr>
                                    ) : (
                                        poApprovals.map((po, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="fw-semibold">{po.supplierName}</div>
                                                    <div className="small text-muted">{po.poNumber}</div>
                                                </td>
                                                <td>{po.createdAt ? new Date(po.createdAt).toLocaleDateString() : '-'}</td>
                                                <td>
                                                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/pos/view/${po.id}`)}>
                                                        Review
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Tab>
                </Tabs>
            </Card.Body>
        </Card>
    );
}
