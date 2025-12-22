import React, { useState } from "react";
import { Card, Button, Badge, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";
import api from "../../api/api";
import { toast } from "react-toastify";

const ProjectQuotationCard = ({ project, projectId, isVisible }) => {
    const navigate = useNavigate();
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isVisible) return null;

    const targetId = projectId || project?.id;

    const handleViewQuotation = () => {
        if (!targetId) return;
        // Navigate to estimation page in READ-ONLY mode just for preview
        navigate(`/projects/estimation/${targetId}?readOnly=true`);
    };

    const handleDownloadPdf = async () => {
        if (!targetId) return;
        setIsDownloading(true);
        try {
            // Use stored estimation settings for generation
            const pdfResp = await api.post(
                `/estimations/by-project/${targetId}/pdf`,
                {}, // Empty options to use defaults/stored values
                { responseType: "blob" }
            );
            const blob = new Blob([pdfResp.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${targetId}-Estimation.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("PDF Downloaded");
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate PDF.");
        } finally {
            setIsDownloading(false);
        }
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
                    <Button variant="primary" onClick={handleDownloadPdf} disabled={!targetId || isDownloading}>
                        {isDownloading ? <><Spinner size="sm" animation="border" className="me-1" /> Generating...</> : "Download PDF"}
                    </Button>
                    <Button variant="outline-secondary" onClick={handleViewQuotation} disabled={!targetId}>
                        Preview
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ProjectQuotationCard;
