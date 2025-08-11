// src/components/projects/ProjectSearch.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Container, Form, Row, Col, Modal, Spinner } from 'react-bootstrap';
import api from '../../services/api';
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

    // Details modal
    const [showModal, setShowModal] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [project, setProject] = useState(null);
    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);

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

            const res = await api.get('/projects/search', { params });
            setRows(res.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const openDetails = async (id) => {
        try {
            setSelectedId(id);
            setShowModal(true);
            setProject(null);
            setFiles([]);
            setFilesLoading(true);

            // Load project details
            const [pRes, fRes] = await Promise.all([
                api.get(`/projects/${id}`),
                api.get(`/projects/${id}/files`)
            ]);

            setProject(pRes.data);
            setFiles(fRes.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load project details');
        } finally {
            setFilesLoading(false);
        }
    };

    const clearFilters = () => {
        setProjectId('');
        setCustomerName('');
        setSalesRepName('');
        setStatus('');
        fetchRows();
    };

    return (
        <Container className="my-5">
            <h2 className="text-center mb-4">Projects</h2>

            <Form className="mb-3">
                <Row className="g-2">
                    <Col md={3}>
                        <Form.Control
                            placeholder="Project ID"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                        />
                    </Col>
                    <Col md={3}>
                        <Form.Control
                            placeholder="Client name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </Col>
                    <Col md={3}>
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
                    <Col md={1} className="d-flex gap-2">
                        <Button variant="primary" onClick={fetchRows}>Go</Button>
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col className="d-flex justify-content-end">
                        <Button variant="outline-secondary" size="sm" onClick={clearFilters}>Clear</Button>
                    </Col>
                </Row>
            </Form>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <Table bordered hover responsive className="text-center">
                    <thead className="table-primary">
                    <tr>
                        <th>Project ID</th>
                        <th>Client</th>
                        <th>Sales Rep</th>
                        <th>Status</th>
                        <th style={{ width: 120 }}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={5}><Spinner animation="border" size="sm" /> Loading...</td></tr>
                    ) : rows.length === 0 ? (
                        <tr><td colSpan={5}>No projects found</td></tr>
                    ) : rows.map(r => (
                        <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{r.customerName || '-'}</td>
                            <td>{r.salesRepName || '-'}</td>
                            <td>{r.status || '-'}</td>

                            <td className="d-flex gap-2 justify-content-center">
                                <Button size="sm" variant="warning" onClick={() => openDetails(r.id)}>
                                    Edit
                                </Button>
                                <Button size="sm" variant="info" onClick={() => navigate(`/projects/manage/${r.id}`)}>
                                    Manage
                                </Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </div>

            {/* Details / Edit modal (read-only for now; you can add editing fields) */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Project Details {selectedId ? `– ${selectedId}` : ''}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {filesLoading ? (
                        <div className="d-flex align-items-center gap-2">
                            <Spinner animation="border" size="sm" /> Loading...
                        </div>
                    ) : !project ? (
                        <div>Not found.</div>
                    ) : (
                        <>
                            <div className="mb-3">
                                <strong>Name:</strong> {project.projectName}<br/>
                                <strong>Status:</strong> {project.status}<br/>
                                <strong>Comment:</strong> {project.comment || '-'}
                            </div>

                            <h6>Files</h6>
                            {(!files || files.length === 0) ? (
                                <div>No files uploaded.</div>
                            ) : (
                                <Table size="sm" bordered>
                                    <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th style={{ width: 140 }}>Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {files.map(f => (
                                        <tr key={f.url}>
                                            <td className="text-break">{f.name}</td>
                                            <td className="d-flex gap-2 justify-content-center">
                                                {/* View in new tab */}
                                                <a className="btn btn-sm btn-outline-primary" href={f.url} target="_blank" rel="noreferrer">
                                                    View
                                                </a>
                                                {/* Download (works with signed URLs too) */}
                                                <a className="btn btn-sm btn-success" href={f.url} download>
                                                    Download
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default ProjectSearch;
