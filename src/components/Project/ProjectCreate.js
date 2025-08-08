import React, { useEffect, useState } from "react";
import { Form, Button, Row, Col, Container } from "react-bootstrap";
import api from '../../services/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProjectForm = () => {
  const [projectData, setProjectData] = useState({
    id: "",
    projectName: "",
    customerId: "",
    salesRep: "",
    comment: "",
    documentURL: "",
  });

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [validated, setValidated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    api.get("/customer/all")
        .then(res => setCustomers(res.data))
        .catch(() => toast.error("Failed to load customers"));

    api.get("/employee/all")
        .then(res => setEmployees(res.data))
        .catch(() => toast.error("Failed to load employees"));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidated(true);

    const { projectName, customerId, salesRep, comment } = projectData;
    if (!projectName || !customerId || !salesRep || !comment) return;

    try {
      const formData = new FormData();
      const projectBlob = new Blob([JSON.stringify({ projectName, customerId, salesRep, comment })], {
        type: "application/json"
      });
      formData.append("project", projectBlob);

      files.forEach(file => {
        formData.append("file", file);
      });

      const response = await api.post("/projects/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setProjectData(response.data);
      setIsEditMode(false);
      toast.success("Project created successfully!");
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Endpoint not found (404)");
      } else if (error.response?.status === 500) {
        toast.error("Server error (500)");
      } else if (error.response?.status === 413) {
        toast.error("Uploaded files are too large (413)");
      } else {
        toast.error("Failed to create project");
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
            <h2 className="text-center mb-4" style={{ fontSize: "1.5rem" }}>
              {projectData.id ? "View Project" : "Create New Project"}
            </h2>

            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              {projectData.id && (
                  <Form.Group controlId="projectId" className="mb-3">
                    <Form.Label>Project ID</Form.Label>
                    <Form.Control type="text" value={projectData.id} readOnly />
                  </Form.Group>
              )}

              <Form.Group controlId="projectName" className="mb-3">
                <Form.Label>Project Name</Form.Label>
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
                            {cust.name || cust.companyName || "Unnamed Customer"}
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

              {isEditMode && (
                  <Form.Group controlId="document" className="mb-3">
                    <Form.Label>Upload Documents (optional)</Form.Label>
                    <Form.Control
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        multiple
                    />
                  </Form.Group>
              )}

              {projectData.documentURL && (
                  <div className="mb-3">
                    <Form.Label>Project Document</Form.Label>
                    <div>
                      <a href={projectData.documentURL} target="_blank" rel="noopener noreferrer">
                        View Document
                      </a>
                    </div>
                  </div>
              )}

              {!projectData.id && (
                  <Button variant="success" type="submit" className="w-100 mt-3">
                    Save Project
                  </Button>
              )}
            </Form>
          </div>
        </Container>
        <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
      </div>
  );
};

export default ProjectForm;
