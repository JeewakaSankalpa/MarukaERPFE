// src/components/projects/ProjectForm.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Form,
  Button,
  Row,
  Col,
  Container,
  ListGroup,
  Badge,
} from "react-bootstrap";
import api from "../../api/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { listWorkflows } from "../../services/workflowApi";

const ProjectForm = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  // console.log('DEBUG: routeId=', routeId); // Removing debug log

  const [projectData, setProjectData] = useState({
    id: "",
    projectName: "",
    customerId: "",
    salesRep: "",
    workflowId: "", // NEW
    comment: "",
    currency: "LKR",
    documentURL: "",
    fileList: [], // URLs after save or load
  });

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workflows, setWorkflows] = useState([]); // NEW
  const [validated, setValidated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!routeId); // create: editable, edit: view-only
  const [files, setFiles] = useState([]); // selected File[] before submit

  // load dropdown data
  useEffect(() => {
    api
      .get("/customer/all")
      .then((res) => setCustomers(res.data || []))
      .catch(() => toast.error("Failed to load customers"));


    api
      .get("/employee/all")
      .then((res) => setEmployees(res.data || []))
      .catch(() => toast.error("Failed to load employees"));

    listWorkflows()
      .then((data) => setWorkflows(data || []))
      .catch(() => console.error("Failed to load workflows"));
  }, []);


  // load project if route has ID
  useEffect(() => {
    const load = async () => {
      if (!routeId) return;

      try {
        // project details
        const pRes = await api.get(`/projects/${routeId}`);
        const p = pRes.data || {};

        // try files endpoint; fallback to p.fileList
        let fileItems = [];
        try {
          const fRes = await api.get(`/projects/${routeId}/files`);
          const list = fRes.data || [];
          fileItems =
            list.map((f, i) =>
              typeof f === "string"
                ? {
                  name:
                    decodeURIComponent(f.split("/").pop()) ||
                    `file-${i + 1}`,
                  url: f,
                }
                : f
            ) || [];
        } catch {
          // fallback to fileList on project
          const list = p.fileList || [];
          fileItems = list.map((url, i) => ({
            url,
            name:
              decodeURIComponent(url.split("/").pop()) || `file-${i + 1}`,
          }));
        }

        setProjectData((prev) => ({
          ...prev,
          ...p,
          id: p.id,
          fileList: fileItems.map((x) => x.url),
        }));
        setIsEditMode(false); // start read-only on edit route
        setFiles([]);
      } catch (e) {
        toast.error("Failed to load project");
      }
    };

    load();
  }, [routeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    // Merge with existing selections; avoid duplicates by name+size
    const existingKeys = new Set(files.map((f) => `${f.name}-${f.size}`));
    const merged = [
      ...files,
      ...picked.filter((f) => !existingKeys.has(`${f.name}-${f.size}`)),
    ];
    setFiles(merged);
  };

  const removeFileAt = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const fmtSize = (bytes) => {
    if (bytes == null) return "";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
    // (add GB if you want)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidated(true);

    const { projectName, customerId, salesRep, comment } = projectData;
    if (!projectName || !customerId || !salesRep || !comment) return;

    try {
      if (!routeId) {
        // CREATE
        const formData = new FormData();
        const projectBlob = new Blob(
          [JSON.stringify({
            projectName,
            customerId,
            salesRep,
            comment,
            currency: projectData.currency,
            workflowId: projectData.workflowId // NEW
          })],
          { type: "application/json" }
        );
        formData.append("project", projectBlob);
        files.forEach((file) => formData.append("files", file));

        const response = await api.post("/projects/create", formData);

        setProjectData((prev) => ({ ...prev, ...response.data }));
        setIsEditMode(false);
        setFiles([]);
        toast.success("Project created successfully!");

        // Navigate to the newly created project's details page
        setTimeout(() => {
          navigate(`/projects/manage/${response.data.id}`);
        }, 1500);
      } else {
        // UPDATE (optional backend)
        // 1) update basic fields
        try {
          await api.put(`/projects/${routeId}`, {
            projectName,
            customerId,
            salesRep,
            comment,
            currency: projectData.currency,
            status: projectData.status, // keep status if you want to allow change later
          });
          toast.success("Project updated");
        } catch {
          toast.warn("Update endpoint not available (PUT /projects/{id})");
        }

        // 2) upload additional files if any
        if (files.length > 0) {
          try {
            const fd = new FormData();
            files.forEach((f) => fd.append("files", f));
            const upRes = await api.post(
              `/projects/${routeId}/files`,
              fd
            );
            // merge new URLs with existing
            const newUrls = (upRes.data || []).map((x) =>
              typeof x === "string" ? x : x.url
            );
            setProjectData((prev) => ({
              ...prev,
              fileList: [...(prev.fileList || []), ...newUrls],
            }));
            setFiles([]);
          } catch {
            toast.warn("File upload endpoint not available (POST /projects/{id}/files)");
          }
        }

        setIsEditMode(false);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Endpoint not found (404)");
      } else if (error.response?.status === 500) {
        toast.error("Server error (500)");
      } else if (error.response?.status === 413) {
        toast.error("Uploaded files are too large (413)");
      } else {
        toast.error("Request failed");
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2vh 2vw",
        boxSizing: "border-box",
      }}
    >
      <Container style={{ width: "80vw", maxWidth: "900px" }}>
        <div className="bg-white shadow rounded p-4" style={{ fontSize: "1rem" }}>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-4" style={{ fontSize: "1.5rem" }}>
              {routeId
                ? isEditMode
                  ? "Edit Inquiry"
                  : "View Inquiry"
                : "Create New Inquiry"}
            </h2>

            {routeId && (
              <Button
                size="sm"
                variant={isEditMode ? "secondary" : "primary"}
                onClick={() => setIsEditMode((v) => !v)}
              >
                {isEditMode ? "Cancel Edit" : "Edit"}
              </Button>
            )}
          </div>

          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            {projectData.id && (
              <Form.Group controlId="projectId" className="mb-3">
                <Form.Label>Project ID</Form.Label>
                <Form.Control type="text" value={projectData.id} readOnly />
              </Form.Group>
            )}

            <Form.Group controlId="projectName" className="mb-3">
              <Form.Label>Inquiry Name</Form.Label>
              <Form.Control
                type="text"
                name="projectName"
                value={projectData.projectName}
                onChange={handleChange}
                disabled={!isEditMode}
                required
                isInvalid={validated && !projectData.projectName}
              />
              <Form.Control.Feedback type="invalid">
                Project name is required.
              </Form.Control.Feedback>
            </Form.Group>

            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group controlId="customerId">
                  <Form.Label>Customer</Form.Label>
                  <Form.Select
                    name="customerId"
                    value={projectData.customerId}
                    onChange={handleChange}
                    disabled={!isEditMode}
                    required
                    isInvalid={validated && !projectData.customerId}
                  >
                    <option value="">Select Customer</option>
                    {customers.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.comName || cust.name || "Unnamed Customer"}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    Please select a customer.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group controlId="salesRep">
                  <Form.Label>Sales Representative</Form.Label>
                  <Form.Select
                    name="salesRep"
                    value={projectData.salesRep}
                    onChange={handleChange}
                    disabled={!isEditMode}
                    required
                    isInvalid={validated && !projectData.salesRep}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    Please select a sales representative.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>


            <Row className="g-3 mt-1">
              <Col xs={12} md={6}>
                <Form.Group controlId="currency">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select
                    name="currency"
                    value={projectData.currency || "LKR"}
                    onChange={handleChange}
                    disabled={!isEditMode}
                  >
                    <option value="LKR">LKR (Rupees)</option>
                    <option value="USD">USD (Dollars)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="workflowId">
                  <Form.Label>Workflow Template</Form.Label>
                  <Form.Select
                    name="workflowId"
                    value={projectData.workflowId || ""}
                    onChange={handleChange}
                    disabled={!!routeId} // Workflow cannot be changed after creation (snapshot)
                  >
                    <option value="">Default (Active)</option>
                    {workflows.map((wf) => (
                      <option key={wf.id} value={wf.id}>
                        {wf.id} (v{wf.version})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {routeId ? "Workflow is locked for existing projects." : "Select the workflow logic for this inquiry."}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group controlId="comment" className="mb-3 mt-3">
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="comment"
                value={projectData.comment}
                onChange={handleChange}
                required
                disabled={!isEditMode}
                isInvalid={validated && !projectData.comment}
              />
              <Form.Control.Feedback type="invalid">
                Comment is required.
              </Form.Control.Feedback>
            </Form.Group>

            {
              isEditMode && (
                <>
                  <Form.Group controlId="document" className="mb-2">
                    <Form.Label>Upload Documents (optional)</Form.Label>
                    <Form.Control
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      multiple
                    />
                  </Form.Group>

                  {/* Selected files preview list (pre-submit) */}
                  {files.length > 0 && (
                    <ListGroup className="mb-3">
                      {files.map((f, idx) => (
                        <ListGroup.Item
                          key={`${f.name}-${f.size}-${idx}`}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div className="text-truncate" style={{ maxWidth: "75%" }}>
                            {f.name}{" "}
                            <Badge bg="light" text="dark">
                              {fmtSize(f.size)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => removeFileAt(idx)}
                            aria-label={`Remove ${f.name}`}
                          >
                            Remove
                          </Button>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </>
              )
            }

            {/* After save/load: show uploaded file links with short names */}
            {
              !isEditMode &&
              projectData.fileList &&
              projectData.fileList.length > 0 && (
                <div className="mb-3">
                  <Form.Label>Uploaded Files</Form.Label>
                  <ListGroup>
                    {projectData.fileList.map((url, i) => {
                      const nameFromUrl =
                        decodeURIComponent(url.split("/").pop() || "") ||
                        `file-${i + 1}`;
                      return (
                        <ListGroup.Item
                          key={url}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <span className="text-truncate" style={{ maxWidth: "75%" }}>
                            {nameFromUrl}
                          </span>
                          <div className="d-flex gap-2">
                            <a
                              className="btn btn-sm btn-outline-primary"
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                            <a className="btn btn-sm btn-success" href={url} download>
                              Download
                            </a>
                          </div>
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </div>
              )
            }

            {
              (!routeId || isEditMode) && (
                <Button variant="success" type="submit" className="w-100 mt-3">
                  {routeId ? "Update Inquiry" : "Create New Inquiry"}
                </Button>
              )
            }
          </Form >
        </div >
      </Container >
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
    </div >
  );
};

export default ProjectForm;
