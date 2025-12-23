import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Spinner } from 'react-bootstrap';
import Select from 'react-select';
import api from '../../../api/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ProjectMaterialReport = () => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch Projects for dropdown
        api.get('/projects?size=1000') // Assume we list all or search
            .then(res => {
                const list = res.data.content || res.data || [];
                setProjects(list.map(p => ({ value: p.id, label: `${p.name} (${p.projectCode || p.id})` })));
            })
            .catch(err => toast.error("Failed to load projects"));
    }, []);

    const fetchReport = async () => {
        if (!selectedProject) {
            toast.warn("Please select a project");
            return;
        }

        setLoading(true);
        try {
            const res = await api.get(`/inventory/reports/project-material-status?projectId=${selectedProject.value}`);
            setReportData(res.data || []);
            toast.success("Report data loaded");
        } catch (e) {
            toast.error("Failed to fetch report data");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        if (!reportData || reportData.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const doc = new jsPDF();

        // Title
        doc.setFontSize(16);
        doc.text("Project Material Status Report", 105, 15, { align: 'center' });

        doc.setFontSize(11);
        doc.text(`Project: ${selectedProject?.label}`, 14, 25);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

        // Table
        const tableColumn = ["Product Name", "SKU", "Unit", "Requested", "Supplied", "Balance"];
        const tableRows = [];

        reportData.forEach(item => {
            const rowData = [
                item.productName,
                item.sku || '-',
                item.unit || '-',
                item.requestedQty,
                item.suppliedQty,
                item.balanceQty
            ];
            tableRows.push(rowData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }, // Blue header
        });

        doc.save(`Project_Material_Status_${selectedProject?.value}.pdf`);
    };

    return (
        <Container className="my-4">
            <Card className="shadow-sm">
                <Card.Header className="bg-white">
                    <h5 className="mb-0">Project Material Status Report</h5>
                </Card.Header>
                <Card.Body>
                    <Row className="mb-3 align-items-end">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Select Project</Form.Label>
                                <Select
                                    options={projects}
                                    value={selectedProject}
                                    onChange={setSelectedProject}
                                    placeholder="Search Project..."
                                    isClearable
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Button variant="primary" onClick={fetchReport} disabled={loading} className="w-100">
                                {loading ? <Spinner animation="border" size="sm" /> : "Generate Report"}
                            </Button>
                        </Col>
                        <Col md={3}>
                            <Button variant="success" onClick={exportPDF} disabled={reportData.length === 0} className="w-100">
                                Export PDF
                            </Button>
                        </Col>
                    </Row>

                    {reportData.length > 0 ? (
                        <div className="table-responsive">
                            <Table striped bordered hover size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>Product Name</th>
                                        <th>SKU</th>
                                        <th>Unit</th>
                                        <th className="text-end">Requested</th>
                                        <th className="text-end">Supplied</th>
                                        <th className="text-end">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.productName}</td>
                                            <td>{item.sku}</td>
                                            <td>{item.unit}</td>
                                            <td className="text-end">{item.requestedQty}</td>
                                            <td className="text-end">{item.suppliedQty}</td>
                                            <td className={`text-end fw-bold ${item.balanceQty > 0 ? 'text-danger' : 'text-success'}`}>
                                                {item.balanceQty}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    ) : (
                        !loading && <div className="text-center text-muted p-4">No data generated yet. Select a project and click Generate.</div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default ProjectMaterialReport;
