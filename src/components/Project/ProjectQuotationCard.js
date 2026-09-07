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
    const [cargillsStatuses, setCargillsStatuses] = useState({ materials: "", panels: "" });
    const [quotationStatusLoading, setQuotationStatusLoading] = useState(false);

    const targetId = projectId || project?.id;
    const isCargillsInquiry = Boolean(project?.cargillsInquiry);
    const canOpenQuotation = ["APPROVED", "FINALIZED"].includes(String(quotationApprovalStatus || "").toUpperCase());
    const cargillsReady = Object.values(cargillsStatuses).every(status => ["APPROVED", "FINALIZED"].includes(String(status).toUpperCase()));

    useEffect(() => {
        let active = true;
        if (!isVisible || !targetId) {
            setQuotationApprovalStatus("");
            return () => {
                active = false;
            };
        }

        setQuotationStatusLoading(true);
        const request = isCargillsInquiry
            ? Promise.all([
                api.get(`/estimations/by-project/${targetId}`, { params: { estimationType: "CARGILLS_MATERIALS" } }).catch(() => ({ data: null })),
                api.get(`/estimations/by-project/${targetId}`, { params: { estimationType: "CARGILLS_PANELS" } }).catch(() => ({ data: null })),
            ])
            : api.get(`/estimations/by-project/${targetId}`);
        request
            .then((res) => {
                if (!active) return;
                if (isCargillsInquiry) {
                    setCargillsStatuses({
                        materials: res[0].data?.approvalStatus || res[0].data?.status || "",
                        panels: res[1].data?.approvalStatus || res[1].data?.status || "",
                    });
                } else {
                    const est = res.data || {};
                    setQuotationApprovalStatus(est.approvalStatus || est.status || "");
                }
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
    }, [isVisible, targetId, reloadKey, isCargillsInquiry]);

    if (!isVisible) return null;

    const handleViewQuotation = (estimationType = null) => {
        if (!targetId) return;
        const trackStatus = estimationType === "CARGILLS_MATERIALS" ? cargillsStatuses.materials
            : estimationType === "CARGILLS_PANELS" ? cargillsStatuses.panels : quotationApprovalStatus;
        if (!["APPROVED", "FINALIZED"].includes(String(trackStatus || "").toUpperCase())) {
            toast.warn("Estimation must be fully approved before opening the quotation.");
            return;
        }
        // Navigate to the Printable View (QuotationPrint.js)
        navigate(`/projects/${targetId}/quotation${estimationType ? `?estimationType=${estimationType}` : ""}`);
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
                <div className="d-flex gap-2 flex-wrap">
                    {isCargillsInquiry ? (
                        <>
                            <Button
                                variant="primary"
                                onClick={() => handleViewQuotation("CARGILLS_MATERIALS")}
                                disabled={quotationStatusLoading || !["APPROVED", "FINALIZED"].includes(String(cargillsStatuses.materials).toUpperCase())}
                            >
                                Open Materials Quotation
                            </Button>
                            <Button
                                variant="outline-primary"
                                onClick={() => handleViewQuotation("CARGILLS_PANELS")}
                                disabled={quotationStatusLoading || !["APPROVED", "FINALIZED"].includes(String(cargillsStatuses.panels).toUpperCase())}
                            >
                                Open Panels Quotation
                            </Button>
                        </>
                    ) : (
                    <Button
                        variant="primary"
                        onClick={handleViewQuotation}
                        disabled={!targetId || quotationStatusLoading || !canOpenQuotation}
                        title={!canOpenQuotation ? "Approve the estimation before opening the quotation" : ""}
                    >
                        {quotationStatusLoading ? <Spinner size="sm" className="me-1" /> : null}
                        Open Quotation
                    </Button>
                    )}
                    {(!project?.jobNumber) && actions?.canAcceptQuotation && (
                        <Button
                            variant="success"
                            onClick={() => setShowModal(true)}
                            disabled={!targetId || quotationStatusLoading || (isCargillsInquiry ? !cargillsReady : !canOpenQuotation)}
                            title={(isCargillsInquiry ? !cargillsReady : !canOpenQuotation) ? "Approve all required estimations before recording the customer PO" : ""}
                        >
                            <CheckCircle size={16} className="me-1" /> Record Customer PO
                        </Button>
                    )}
                </div>
                {!quotationStatusLoading && !(isCargillsInquiry ? cargillsReady : canOpenQuotation) && (
                    <div className="small text-muted mt-2">
                        {isCargillsInquiry
                            ? "Both Cargills estimations must be approved. Each approved track then opens as its own quotation."
                            : "Estimation approval is required before the quotation can be opened or printed."}
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
