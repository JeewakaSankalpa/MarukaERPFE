import React from "react";
import { Card, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";

const ProjectQuotationCard = ({ project, isVisible }) => {
    const navigate = useNavigate();

    if (!isVisible) return null;

    const handleViewQuotation = () => {
        if (!project?.id) return;
        // Navigate to estimation page in READ-ONLY mode just for generating PDF/viewing
        // Or directly call the PDF print if we had logic here. 
        // For now, let's point to the Estimation Page in Read-Only mode as a "Quotation View".
        navigate(`/projects/estimation/${project.id}?readOnly=true`);
    };

    return (
        <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 text-primary">
                        <Printer size={18} className="me-2" />
                        Quotation
                    </h5>
                    <Badge bg="info">View Only</Badge>
                </div>
            </Card.Header>
            <Card.Body>
                <p className="text-muted small">
                    View the official quotation for this project. This card allows you to print or view the current estimation as a formal quotation.
                </p>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={handleViewQuotation}>
                        View / Print Quotation
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ProjectQuotationCard;
