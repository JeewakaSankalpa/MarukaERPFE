import React from "react";
import { Card, Button, Badge, Modal, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Printer, CheckCircle } from "lucide-react";
import api from "../../api/api";
import { toast } from "react-toastify";
import { useState } from "react";

const ProjectQuotationCard = ({ project, projectId, isVisible, reloadKey }) => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [file, setFile] = useState(null);
    const [isAccepting, setIsAccepting] = useState(false);

    if (!isVisible) return null;

    const targetId = projectId || project?.id;

    const handleViewQuotation = () => {
        if (!targetId) return;
        // Navigate to the Printable View (QuotationPrint.js)
        navigate(`/projects/${targetId}/quotation`);
    };

    const handleAcceptQuotation = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.warn("Please upload the signed quotation document.");
            return;
        }

        setIsAccepting(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await api.post(`/projects/${targetId}/accept-quotation`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast.success("Quotation accepted successfully! Project is now a Job.");
            setShowModal(false);
            if (reloadKey && typeof reloadKey === 'function') {
                reloadKey(); // If it's a function
            } else {
                // Best effort map refresh
                window.location.reload();
            }
        } catch (error) {
            toast.error("Failed to accept quotation: " + (error.response?.data?.message || error.message));
        } finally {
            setIsAccepting(false);
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
                    <Button variant="primary" onClick={handleViewQuotation} disabled={!targetId}>
                        Print / View
                    </Button>
                    {(!project?.jobNumber) && (
                        <Button variant="success" onClick={() => setShowModal(true)} disabled={!targetId}>
                            <CheckCircle size={16} className="me-1" /> Mark as Accepted by Customer
                        </Button>
                    )}
                </div>
            </Card.Body>

            {/* Accept Quotation Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Accept Quotation</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAcceptQuotation}>
                    <Modal.Body>
                        <p className="text-muted small mb-3">
                            Accepting this quotation will generate an official Maruka Job Number (MJN) and mark this inquiry as a Job.
                        </p>
                        <Form.Group>
                            <Form.Label>Upload Signed Quotation Document <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                onChange={(e) => setFile(e.target.files[0])}
                                required
                            />
                            <Form.Text className="text-muted">
                                Please upload the scanned copy of the quotation signed by the customer.
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit" disabled={isAccepting}>
                            {isAccepting ? <Spinner size="sm" /> : "Confirm Acceptance"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Card>
    );
};

export default ProjectQuotationCard;
