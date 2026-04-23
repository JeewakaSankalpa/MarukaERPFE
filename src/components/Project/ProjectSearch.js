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

    // Sort and Display
    const [sortField, setSortField] = useState('id');
    const [sortDirection, setSortDirection] = useState('desc');
    const [columnMode, setColumnMode] = useState(0); // 0: Both, 1: Inquiry Only, 2: Job Only
    const [availableStatuses, setAvailableStatuses] = useState([]);

    useEffect(() => {
        api.get('/workflow/stages').then(res => setAvailableStatuses(res.data || [])).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchRows();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, customerName, salesRepName, status, mjnStatus]);

    const cycleColumnMode = () => setColumnMode((prev) => (prev + 1) % 3);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedRows = React.useMemo(() => {
        return [...rows].sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            if (sortDirection === 'asc') {
                return valA.localeCompare(valB, undefined, { numeric: true });
            } else {
                return valB.localeCompare(valA, undefined, { numeric: true });
            }
        });
    }, [rows, sortField, sortDirection]);

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
        setSortField('id');
        setSortDirection('desc');
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
                            {availableStatuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
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
                        <Button variant="outline-secondary" onClick={clearFilters} className="w-100">Reset Filters</Button>
                    </Col>
                </Row>
            </Form>

            <div className="d-flex justify-content-end mb-2">
                <Button variant="outline-secondary" size="sm" onClick={cycleColumnMode}>
                    Toggle ID Columns: {columnMode === 0 ? "Both" : columnMode === 1 ? "Inquiry Only" : "Job Only"}
                </Button>
            </div>

            <div>
                <Table bordered hover responsive className="text-center align-middle">
                    <thead className="table-primary">
                        <tr>
                            {columnMode !== 2 && (
                                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('id')}>
                                    Inquiry # {sortField === 'id' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                </th>
                            )}
                            {columnMode !== 1 && (
                                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('jobNumber')}>
                                    Job Number {sortField === 'jobNumber' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                                </th>
                            )}
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
                        ) : sortedRows.length === 0 ? (
                            <tr><td colSpan={7}>No projects found</td></tr>
                        ) : sortedRows.map(r => (
                            <tr key={r.id}>
                                {columnMode !== 2 && <td><small className="text-muted">{r.id}</small></td>}
                                {columnMode !== 1 && (
                                    <td>
                                        {r.jobNumber ? (
                                            <Badge bg="success" style={{ fontSize: '0.9rem' }}>{r.jobNumber}</Badge>
                                        ) : (
                                            <Badge bg="secondary">MIN Only</Badge>
                                        )}
                                    </td>
                                )}
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
