import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { FaDownload, FaSyncAlt, FaProjectDiagram, FaExclamationCircle, FaSearch, FaArrowLeft, FaBuilding, FaUserTie } from 'react-icons/fa';
import ProjectInventoryCard from '../../Project/ProjectInventoryCard';
import api from '../../../api/api';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ProjectMaterialReport = () => {
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedProject, setSelectedProject] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [summaryStats, setSummaryStats] = useState({ totalItems: 0, totalShortages: 0, totalInTransit: 0 });

    useEffect(() => {
        // Fetch Projects for cards
        setLoadingProjects(true);
        api.get('/projects/search') // Using /search to get ProjectSummaryDTO with all fields
            .then(res => {
                const list = res.data || [];
                setProjects(list);
                setFilteredProjects(list);
            })
            .catch(err => toast.error("Failed to load projects"))
            .finally(() => setLoadingProjects(false));
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProjects(projects);
        } else {
            const q = searchQuery.toLowerCase();
            const filtered = projects.filter(p => 
                (p.projectName && p.projectName.toLowerCase().includes(q)) ||
                (p.jobNumber && p.jobNumber.toLowerCase().includes(q)) ||
                (p.customerName && p.customerName.toLowerCase().includes(q))
            );
            setFilteredProjects(filtered);
        }
    }, [searchQuery, projects]);

    const fetchReport = async (project) => {
        setSelectedProject(project);
        setLoading(true);
        try {
            const res = await api.get(`/inventory/reports/project-material-status?projectId=${project.id}`);
            const data = res.data || [];
            setReportData(data);
            
            // Calculate summary
            let shortages = 0;
            let inTransit = 0;
            data.forEach(item => {
                if (item.shortageQty > 0) shortages++;
                if (item.inTransitQty > 0) inTransit++;
            });
            setSummaryStats({
                totalItems: data.length,
                totalShortages: shortages,
                totalInTransit: inTransit
            });

            toast.success("Inventory data loaded successfully");
        } catch (e) {
            toast.error("Failed to fetch report data");
            console.error(e);
            setSelectedProject(null); // Go back on error
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'FULFILLED': return <Badge bg="success">Fulfilled</Badge>;
            case 'PARTIALLY_FULFILLED': return <Badge bg="warning" text="dark">Partially Fulfilled</Badge>;
            case 'SUBMITTED': return <Badge bg="info">Pending Stores</Badge>;
            case 'PENDING_PURCHASE': return <Badge bg="danger">Pending Purchase</Badge>;
            default: return <Badge bg="secondary">{status || 'Unknown'}</Badge>;
        }
    };

    const exportPDF = () => {
        if (!reportData || reportData.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const doc = new jsPDF('landscape');

        // Title
        doc.setFontSize(18);
        doc.text("Project Material Consumption & Status Report", 14, 15);

        doc.setFontSize(11);
        doc.text(`Project: ${selectedProject?.projectName || selectedProject?.name} (${selectedProject?.jobNumber || selectedProject?.id})`, 14, 25);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

        // Table
        const tableColumn = [
            "Product", "SKU", "Req. Qty", "Issued", "In-Transit", "Consumed", "Shortage", "Pending PO", "Balance", "Order Status"
        ];
        const tableRows = [];

        reportData.forEach(item => {
            const rowData = [
                item.productName,
                item.sku || '-',
                item.requestedQty,
                item.suppliedQty,
                item.inTransitQty,
                item.consumedQty,
                item.shortageQty,
                item.pendingPurchaseQty,
                item.balanceQty,
                item.orderStatus || 'N/A'
            ];
            tableRows.push(rowData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            styles: { cellPadding: 2, overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 50 } }
        });

        doc.save(`Project_Material_Status_${selectedProject?.jobNumber || selectedProject?.id}.pdf`);
    };

    // Render Project Grid
    if (!selectedProject) {
        return (
            <Container fluid className="py-4 px-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
                            <FaProjectDiagram className="text-primary" /> Project Inventory Allocation
                        </h2>
                        <p className="text-muted mb-0">Select a project to view its material status, consumption, and shortages.</p>
                    </div>
                </div>

                <Card className="shadow-sm border-0 mb-4">
                    <Card.Body className="p-3 bg-light rounded">
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0">
                                <FaSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search by Project Name, Job Number, or Customer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-start-0 ps-0"
                            />
                        </InputGroup>
                    </Card.Body>
                </Card>

                {loadingProjects ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="text-muted mt-3">Loading projects...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-5">
                        <div className="mb-3">
                            <FaProjectDiagram size={48} className="text-muted opacity-25" />
                        </div>
                        <h5>No Projects Found</h5>
                        <p className="text-muted">Try adjusting your search criteria.</p>
                    </div>
                ) : (
                    <Row className="g-4">
                        {filteredProjects.map((project) => (
                            <Col md={4} lg={3} key={project.id}>
                                <Card 
                                    className="h-100 shadow-sm border-0 project-card-hover" 
                                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => fetchReport(project)}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <Badge bg="primary" className="mb-2">{project.jobNumber || 'N/A'}</Badge>
                                            <Badge bg={project.status === 'COMPLETED' ? 'success' : 'warning'}>{project.status || 'ACTIVE'}</Badge>
                                        </div>
                                        <Card.Title className="fw-bold mb-3" style={{ fontSize: '1.1rem' }}>
                                            {project.projectName || project.name}
                                        </Card.Title>
                                        <div className="text-muted small mb-2 d-flex align-items-center gap-2">
                                            <FaBuilding /> <span className="text-truncate">{project.customerName || 'Unknown Customer'}</span>
                                        </div>
                                        <div className="text-muted small d-flex align-items-center gap-2">
                                            <FaUserTie /> <span className="text-truncate">{project.salesRepName || 'Unknown Rep'}</span>
                                        </div>
                                    </Card.Body>
                                    <Card.Footer className="bg-white border-top-0 text-center text-primary fw-bold py-3" style={{ fontSize: '0.9rem' }}>
                                        View Inventory Details
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </Container>
        );
    }

    // Render Detailed Report
    return (
        <Container fluid className="py-4 px-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <Button variant="link" className="text-decoration-none p-0 mb-2 d-flex align-items-center gap-2" onClick={() => setSelectedProject(null)}>
                        <FaArrowLeft /> Back to Projects
                    </Button>
                    <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
                        {selectedProject.projectName || selectedProject.name} <Badge bg="secondary" className="ms-2 fs-6">{selectedProject.jobNumber || 'N/A'}</Badge>
                    </h2>
                    <p className="text-muted mb-0">Project Inventory Management</p>
                </div>
            </div>

            <ProjectInventoryCard projectId={selectedProject.id} />

        </Container>
    );
};

export default ProjectMaterialReport;
