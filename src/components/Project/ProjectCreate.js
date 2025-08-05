import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Button, Container, Row, Col, Table } from "react-bootstrap";

function UserCreate({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(mode === "create");
  const [userData, setUserData] = useState({
    projectId: "",
    projectName: "",
    customerId: "",
    status: "",
    stage: "",
    createdDate: "",
    updatedDate: "",
    active: true,
    // allowedStores: [] // Ensure allowedStores is initialized as an empty array
  });
  const [stages, setStages] = useState([]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await api.get("/store/all");
        setStages(response.data);
      } catch (error) {
        console.error("Failed to fetch stores:", error);
      }
    };
    fetchStores();

    if (mode === "edit" || mode === "view") {
      const fetchUser = async () => {
        try {
          const response = await api.get(`/user/${id}`);
          setUserData({
            ...response.data,
            allowedStores: response.data.allowedStores || [], // Ensure allowedStores is an array
          });
          if (mode === "view") {
            setIsEditMode(false);
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
        }
      };
      fetchUser();
    }
  }, [mode, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleStoreChange = (storeName) => {
    setUserData((prevData) => {
      const allowedStores = prevData.allowedStores.includes(storeName)
        ? prevData.allowedStores.filter((store) => store !== storeName)
        : [...prevData.allowedStores, storeName];
      return { ...prevData, allowedStores };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await api.post("/user/create", userData);
        alert("User created successfully");
      } else if (isEditMode) {
        await api.put(`/user/update/${id}`, userData);
        alert("User updated successfully");
      }
      navigate("/user/search");
    } catch (error) {
      console.error("User save failed:", error);
      alert("User save failed. Please try again.");
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div
        style={{ maxWidth: "600px", width: "100%" }}
        className="p-4 bg-white rounded shadow"
      >
        <h2 className="text-center mb-4">
          {mode === "create"
            ? "Create New Project"
            : isEditMode
            ? "Edit Project"
            : "View Project"}
        </h2>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group controlId="projectId" className="mb-3">
                <Form.Label>Project ID</Form.Label>
                <Form.Control
                  type="text"
                  name="projectId"
                  placeholder="Enter Project ID"
                  value={userData.projectId}
                  onChange={handleChange}
                  required
                  disabled={mode !== "create"}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="projectName" className="mb-3">
                <Form.Label>Project Name</Form.Label>
                <Form.Control
                  type="text"
                  name="projectName"
                  placeholder="Enter Project Name"
                  value={userData.projectName}
                  onChange={handleChange}
                  required
                  disabled={mode !== "create"}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group controlId="customerId" className="mb-3">
                <Form.Label>Customer ID</Form.Label>
                <Form.Control
                  type="text"
                  name="customerId"
                  placeholder="Enter Customer ID"
                  value={userData.customerId}
                  onChange={handleChange}
                  required
                  disabled={!isEditMode}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="accessLevel" className="mb-3">
                <Form.Label>Stage</Form.Label>
                <Form.Control
                  as="select"
                  name="accessLevel"
                  value={userData.accessLevel}
                  onChange={handleChange}
                  required
                  disabled={!isEditMode}
                >
                  <option value="">Select Stage</option>
                  <option value="admin">Stage 1</option>
                  <option value="manager">Stage 2</option>
                  <option value="cashier">Stage 3</option>
                </Form.Control>
              </Form.Group>
            </Col>
          </Row>
          {/* <Row>
                        <Col md={6}>
                            <Form.Group controlId="email" className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    placeholder="Enter email"
                                    value={userData.email}
                                    onChange={handleChange}
                                    required
                                    disabled={!isEditMode}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group controlId="status" className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="status"
                                    placeholder="Enter Project Status"
                                    value={userData.status}
                                    onChange={handleChange}
                                    required
                                    disabled={!isEditMode}
                                />
                            </Form.Group>
                        </Col>
                    </Row> */}
          <Row>
            <Form.Group controlId="status" className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Control
                type="text"
                name="status"
                placeholder="Enter Project Status"
                value={userData.status}
                onChange={handleChange}
                required
                disabled={!isEditMode}
              />
            </Form.Group>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group controlId="firstName" className="mb-3">
                <Form.Label>Created Date</Form.Label>
                <Form.Control
                  type="text"
                  name="firstName"
                  placeholder="Enter first name"
                  value={userData.createdDate}
                  onChange={handleChange}
                  required
                  disabled={mode !== "create"}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="lastName" className="mb-3">
                <Form.Label>Last Updated Date</Form.Label>
                <Form.Control
                  type="text"
                  name="lastName"
                  placeholder="Enter last name"
                  value={userData.updatedDate}
                  onChange={handleChange}
                  required
                  disabled={!isEditMode}
                />
              </Form.Group>
            </Col>
          </Row>
          {/* <Form.Group controlId="allowedStores" className="mb-3">
                        <Form.Label>Allowed Stores</Form.Label>
                        <Table striped bordered hover>
                            <thead>
                            <tr>
                                <th>Select</th>
                                <th>Store Name</th>
                            </tr>
                            </thead>
                            <tbody>
                            {stages.map(store => (
                                <tr key={store.name}>
                                    <td>
                                        <Form.Check
                                            type="checkbox"
                                            checked={userData.allowedStores.includes(store.name)}
                                            onChange={() => handleStoreChange(store.name)}
                                            disabled={!isEditMode}
                                        />
                                    </td>
                                    <td>{store.name}</td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    </Form.Group> */}
          <Form.Group controlId="active" className="mb-3">
            <Form.Check
              type="checkbox"
              label="Active"
              checked={userData.active}
              onChange={() =>
                setUserData((prevData) => ({
                  ...prevData,
                  active: !prevData.active,
                }))
              }
              disabled={!isEditMode}
            />
          </Form.Group>
          {!isEditMode && (
            <Button
              type="button"
              variant="primary"
              className="w-100 mb-3"
              onClick={toggleEditMode}
            >
              Edit User
            </Button>
          )}
          {isEditMode && (
            <Button variant="success" type="submit" className="w-100">
              Save Changes
            </Button>
          )}
        </Form>
      </div>
    </Container>
  );
}

export default UserCreate;
