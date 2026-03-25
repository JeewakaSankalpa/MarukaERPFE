import { ArrowLeft } from 'lucide-react';
// src/components/projects/ProjectSearch.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Container, Form, Row, Col, Spinner, Badge } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';


function ProjectSearch() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    // Filters
    const [projectId, setProjectId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [salesRepName, setSalesRepName] = useState('');
    const [status, setStatus] = useState(''); // optional
    const [mjnStatus, setMjnStatus] = useState(''); // '', 'WITH_MJN', 'WITHOUT_MJN'

    useEffect(() => {
        fetchRows(); // initial load with no filters
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRows = async () => {
        try {
            setLoading(true);
            const params = {};
            if (projectId.trim()) params.projectId = projectId.trim();
            if (customerName.trim()) params.customerName = customerName.trim();
            if (salesRepName.trim()) params.salesRepName = salesRepName.trim();
            if (status) params.status = status;
            
            if (mjnStatus === 'WITH_MJN') params.hasJobNumber = true;
            if (mjnStatus === 'WITHOUT_MJN') params.hasJobNumber = false;

            const res = await api.get('/projects/search', { params });
            setRows(res.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setProjectId('');
        setCustomerName('');
        setSalesRepName('');
        setStatus('');
        setMjnStatus('');
        // We'll call fetchRows after state updates (or use a useEffect if desired, but here we just call manually)
        // Actually, setStates are async, so let's call fetchRows with empty params
        setLoading(true);
        api.get('/projects/search').then(res => {
            setRows(res.data || []);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
            toast.error('Failed to load projects');
        });
    };

    return (
        <Container className="my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0">Projects</h2>
                        </div>
                <Button variant="primary" onClick={() => navigate('/projects/create')}>
                    Create New Inquiry
                </Button>
            </div>

            <Form className="mb-3">
                <Row className="g-2">
                    <Col md={2}>
                        <Form.Control
                            placeholder="Project ID"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                        />
                    </Col>
                    <Col md={2}>
                        <Form.Control
                            placeholder="Client name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </Col>
                    <Col md={2}>
                        <Form.Control
                            placeholder="Sales rep name"
                            value={salesRepName}
                            onChange={(e) => setSalesRepName(e.target.value)}
                        />
                    </Col>
                    <Col md={2}>
                        <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">Status (any)</option>
                            <option value="INQUIRY">INQUIRY</option>
                            <option value="APPROVAL">APPROVAL</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                        </Form.Select>
                    </Col>
                    <Col md={2}>
                        <Form.Select value={mjnStatus} onChange={(e) => setMjnStatus(e.target.value)}>
                            <option value="">Job Status (any)</option>
                            <option value="WITH_MJN">With MJN</option>
                            <option value="WITHOUT_MJN">Inquiries Only</option>
                        </Form.Select>
                    </Col>
                    <Col md={2} className="d-flex gap-2">
                        <Button variant="primary" onClick={fetchRows} className="w-100">Go</Button>
                        <Button variant="outline-secondary" onClick={clearFilters}>Reset</Button>
                    </Col>
                </Row>
            </Form>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <Table bordered hover responsive className="text-center align-middle">
                    <thead className="table-primary">
                        <tr>
                            <th>Inquiry #</th>
                            <th>Job Number</th>
                            <th>Project Name</th>
                            <th>Client</th>
                            <th>Sales Rep</th>
                            <th>Status</th>
                            <th style={{ width: 120 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7}><Spinner animation="border" size="sm" /> Loading...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={7}>No projects found</td></tr>
                        ) : rows.map(r => (
                            <tr key={r.id}>
                                <td><small className="text-muted">{r.id}</small></td>
                                <td>
                                    {r.jobNumber ? (
                                        <Badge bg="success" style={{ fontSize: '0.9rem' }}>{r.jobNumber}</Badge>
                                    ) : (
                                        <Badge bg="secondary">MIN Only</Badge>
                                    )}
                                </td>
                                <td>{r.projectName || '-'}</td>
                                <td>{r.customerName || '-'}</td>
                                <td>{r.salesRepName || '-'}</td>
                                <td>
                                    <Badge bg={r.status === 'COMPLETED' ? 'success' : 'info'} pill>
                                        {r.status}
                                    </Badge>
                                </td>

                                <td>
                                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/projects/manage/${r.id}`)}>
                                        Manage
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
}

export default ProjectSearch;
