import React from "react";
import { Card, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";

const ProjectQuotationCard = ({ project, projectId, isVisible }) => {
    const navigate = useNavigate();

    if (!isVisible) return null;

    const targetId = projectId || project?.id;

    const handleViewQuotation = () => {
        if (!targetId) return;
        // Navigate to the Printable View (QuotationPrint.js)
        navigate(`/projects/${targetId}/quotation`);
    };

    return (
        <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 text-primary">
                        <Printer size={18} className="me-2" />
                        Quotation
                    </h5>
                    <div className="d-flex gap-2">
                        {project?.status === "APPROVED" && <Badge bg="success">Approved</Badge>}
                        <Badge bg="info">Official</Badge>
                    </div>
                </div>
            </Card.Header>
            <Card.Body>
                <p className="text-muted small">
                    View the official quotation for this project. Download the PDF for clients, or preview the estimation details.
                </p>
                <div className="d-flex gap-2">
                    <Button variant="primary" onClick={handleViewQuotation} disabled={!targetId}>
                        Print / View
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ProjectQuotationCard;
