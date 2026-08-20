import React, { useEffect } from "react";
import { Card, Button, Badge, Modal, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Printer, CheckCircle } from "lucide-react";
import api from "../../api/api";
import { toast } from "react-toastify";
import { useState } from "react";

const ProjectQuotationCard = ({ project, projectId, isVisible, reloadKey, actions, roleHeader }) => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [file, setFile] = useState(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const [quotationApprovalStatus, setQuotationApprovalStatus] = useState("");
    const [quotationStatusLoading, setQuotationStatusLoading] = useState(false);

    const targetId = projectId || project?.id;
    const canOpenQuotation = ["APPROVED", "FINALIZED"].includes(String(quotationApprovalStatus || "").toUpperCase());

    useEffect(() => {
        let active = true;
        if (!isVisible || !targetId) {
            setQuotationApprovalStatus("");
            return () => {
                active = false;
            };
        }

        setQuotationStatusLoading(true);
        api.get(`/estimations/by-project/${targetId}`)
            .then((res) => {
                if (!active) return;
                const est = res.data || {};
                setQuotationApprovalStatus(est.approvalStatus || est.status || "");
            })
            .catch(() => {
                if (active) setQuotationApprovalStatus("");
            })
            .finally(() => {
                if (active) setQuotationStatusLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isVisible, targetId, reloadKey]);

    if (!isVisible) return null;

    const handleViewQuotation = () => {
        if (!targetId) return;
        if (!canOpenQuotation) {
            toast.warn("Estimation must be fully approved before opening the quotation.");
            return;
        }
        // Navigate to the Printable View (QuotationPrint.js)
        navigate(`/projects/${targetId}/quotation`);
    };

    const handleAcceptQuotation = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.warn("Please upload the customer Purchase Order.");
            return;
        }

        setIsAccepting(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await api.post(`/projects/${targetId}/accept-quotation`, formData, {
                headers: { 
                    "Content-Type": "multipart/form-data",
                    ...(roleHeader || {})
                }
            });
            toast.success("Customer PO recorded successfully. Project is now a Job.");
            setShowModal(false);
            if (reloadKey && typeof reloadKey === 'function') {
                reloadKey(); // If it's a function
            } else {
                // Best effort map refresh
                window.location.reload();
            }
        } catch (error) {
            toast.error("Failed to record customer PO: " + (error.response?.data?.message || error.message));
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
                        Commercial Documents
                    </h5>
                    <div className="d-flex gap-2">
                        {project?.status === "APPROVED" && <Badge bg="success">Approved</Badge>}
                    <Badge bg="info">Quotation / Customer PO</Badge>
                    </div>
                </div>
            </Card.Header>
            <Card.Body>
                <p className="text-muted small">
                    View the customer-facing quotation and record the customer's Purchase Order when the quotation is accepted.
                </p>
                <div className="d-flex gap-2">
                    <Button
                        variant="primary"
                        onClick={handleViewQuotation}
                        disabled={!targetId || quotationStatusLoading || !canOpenQuotation}
                        title={!canOpenQuotation ? "Approve the estimation before opening the quotation" : ""}
                    >
                        {quotationStatusLoading ? <Spinner size="sm" className="me-1" /> : null}
                        Open Quotation
                    </Button>
                    {(!project?.jobNumber) && actions?.canAcceptQuotation && (
                        <Button
                            variant="success"
                            onClick={() => setShowModal(true)}
                            disabled={!targetId || quotationStatusLoading || !canOpenQuotation}
                            title={!canOpenQuotation ? "Approve the estimation before recording the customer PO" : ""}
                        >
                            <CheckCircle size={16} className="me-1" /> Record Customer PO
                        </Button>
                    )}
                </div>
                {!quotationStatusLoading && !canOpenQuotation && (
                    <div className="small text-muted mt-2">
                        Estimation approval is required before the quotation can be opened or printed.
                    </div>
                )}
            </Card.Body>

            {/* Customer PO Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Record Customer Purchase Order</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAcceptQuotation}>
                    <Modal.Body>
                        <p className="text-muted small mb-3">
                            Uploading the customer Purchase Order will generate an official Maruka Job Number (MJN) and mark this inquiry as a Job.
                        </p>
                        <Form.Group>
                            <Form.Label>Upload Customer Purchase Order <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                onChange={(e) => setFile(e.target.files[0])}
                                required
                            />
                            <Form.Text className="text-muted">
                                Please upload the customer's PO or written purchase order document.
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
