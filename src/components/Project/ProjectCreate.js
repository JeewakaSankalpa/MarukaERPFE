import { ArrowLeft } from 'lucide-react';
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
  Spinner,
  Modal,
} from "react-bootstrap";
import api from "../../api/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { listWorkflows } from "../../services/workflowApi";
import Select from "react-select";

const ProjectForm = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [customerSearch, setCustomerSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Quick Customer Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    comName: "",
    contactPersonName: "",
    comContactNumber: ""
  });

  const handleQuickAddChange = (e) => {
    const { name, value } = e.target;
    setQuickCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickCustomer.comName || !quickCustomer.contactPersonName || !quickCustomer.comContactNumber) {
      toast.warn("Please fill all fields for quick add");
      return;
    }
    setAddingCustomer(true);
    try {
      const payload = {
        comName: quickCustomer.comName,
        comContactNumber: quickCustomer.comContactNumber,
        contactPersonData: {
          name: quickCustomer.contactPersonName,
          contactNumber: quickCustomer.comContactNumber,
          email: "temp@example.com"
        },
        comAddress: "To be updated",
        comEmail: "temp@example.com",
        businessRegNumber: "N/A",
        currency: "LKR",
        creditPeriod: "0",
        vatType: "VAT",
        vatNumber: "N/A"
      };

      const formData = new FormData();
      formData.append("customer", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      formData.append("password", "TestP");

      const response = await api.post("/customer/add", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const newCust = response.data;
      setCustomers(prev => [...prev, newCust]);
      setProjectData(prev => ({ ...prev, customerId: newCust.id }));
      setShowQuickAdd(false);
      setQuickCustomer({ comName: "", contactPersonName: "", comContactNumber: "" });
      toast.success("Customer added successfully!");
    } catch (error) {
      toast.error("Failed to quick add customer: " + (error.response?.data?.message || error.message));
    } finally {
      setAddingCustomer(false);
    }
  };

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

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortOptionsBySearch = (options, search) => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return [...options].sort((a, b) => {
      const aLower = a.label.toLowerCase();
      const bLower = b.label.toLowerCase();
      const aStarts = aLower.startsWith(lowerSearch);
      const bStarts = bLower.startsWith(lowerSearch);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.label.localeCompare(b.label);
    });
  };

  const customerOptions = sortOptionsBySearch(
    customers
      .map(cust => ({
        value: cust.id,
        label: cust.comName || cust.name || "Unnamed Customer"
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    customerSearch
  );

  const employeeOptions = sortOptionsBySearch(
    employees
      .map(emp => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName}`
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    employeeSearch
  );

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
            <div className="d-flex align-items-center gap-2 mb-4">
              <button type="button" className="btn btn-light" onClick={() => navigate(-1)} title="Go Back">
                <ArrowLeft size={18} />
              </button>
              <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>
                {routeId
                  ? isEditMode
                    ? "Edit Inquiry"
                    : "View Inquiry"
                  : "Create New Inquiry"}
              </h2>
            </div>

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
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="m-0">Customer</Form.Label>
                    {isEditMode && !routeId && (
                      <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => setShowQuickAdd(true)}>
                        + Quick Add
                      </Button>
                    )}
                  </div>
                  <Select
                    options={customerOptions}
                    value={customerOptions.find(opt => opt.value === projectData.customerId) || null}
                    onChange={(selected) => setProjectData(prev => ({ ...prev, customerId: selected ? selected.value : "" }))}
                    onInputChange={(val, { action }) => {
                      if (action === 'input-change') setCustomerSearch(val);
                      if (action === 'menu-close') setCustomerSearch('');
                    }}
                    isDisabled={!isEditMode}
                    isSearchable
                    placeholder="Select Customer"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: validated && !projectData.customerId ? '#dc3545' : base.borderColor,
                      })
                    }}
                  />
                  {validated && !projectData.customerId && (
                    <div className="invalid-feedback" style={{ display: 'block' }}>
                      Please select a customer.
                    </div>
                  )}
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group controlId="salesRep">
                  <Form.Label>Sales Representative</Form.Label>
                  <Select
                    options={employeeOptions}
                    value={employeeOptions.find(opt => opt.value === projectData.salesRep) || null}
                    onChange={(selected) => setProjectData(prev => ({ ...prev, salesRep: selected ? selected.value : "" }))}
                    onInputChange={(val, { action }) => {
                      if (action === 'input-change') setEmployeeSearch(val);
                      if (action === 'menu-close') setEmployeeSearch('');
                    }}
                    isDisabled={!isEditMode}
                    isSearchable
                    placeholder="Select Employee"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: validated && !projectData.salesRep ? '#dc3545' : base.borderColor,
                      })
                    }}
                  />
                  {validated && !projectData.salesRep && (
                    <div className="invalid-feedback" style={{ display: 'block' }}>
                      Please select a sales representative.
                    </div>
                  )}
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
                    disabled={!isEditMode} // Only editable when in edit mode
                  >
                    <option value="">Default (Active)</option>
                    {workflows.map((wf) => (
                      <option key={wf.id} value={wf.id}>
                        {wf.id} (v{wf.version})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {isEditMode ? "Changing the workflow will re-sync the project on save." : "Select the workflow logic for this inquiry."}
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
                            <a
                              className="btn btn-sm btn-success"
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              download={nameFromUrl}
                            >
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
                <Button variant="success" type="submit" className="w-100 mt-3" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> : null}
                  {routeId ? "Update Inquiry" : "Create New Inquiry"}
                </Button>
              )
            }
          </Form >
        </div >
      </Container >

      {/* Quick Add Customer Modal */}
      <Modal show={showQuickAdd} onHide={() => setShowQuickAdd(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Quick Add Customer</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleQuickAddSubmit}>
          <Modal.Body>
            <p className="text-muted small mb-3">
              Use this to quickly create a customer for an inquiry without needing their full details.
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Company Name <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="comName"
                value={quickCustomer.comName}
                onChange={handleQuickAddChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Person Name <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="contactPersonName"
                value={quickCustomer.contactPersonName}
                onChange={handleQuickAddChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Number <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="text"
                name="comContactNumber"
                value={quickCustomer.comContactNumber}
                onChange={handleQuickAddChange}
                placeholder="e.g. 0712345678"
                required
                pattern="^0\d{9}$"
                title="Must be 10 digits starting with 0"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={addingCustomer}>
              {addingCustomer ? <Spinner size="sm" /> : "Save Customer"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
    </div >
  );
};

export default ProjectForm;
