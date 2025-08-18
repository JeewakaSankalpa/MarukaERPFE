import React, { useEffect, useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import api from "../../api/api";
import { Navigate, useNavigate, useParams } from "react-router-dom";

function EmployerForm({ mode }) {
  const navigate = useNavigate();
  //   const [firstName, setFirstName] = useState("");
  //   const [lastName, setLastName] = useState("");
  //   const [userName, setUserName] = useState("");
  //   const [password, setPassword] = useState("");
  //   const [address, setAddress] = useState("");
  //   const [nic, setNic] = useState("");
  //   const [email, setEmail] = useState("");
  //   const [role, setRole] = useState("");
  // const [active, setActive] = useState(true);
  const [showForm, setShowForm] = useState(true);

  const { id } = useParams();
  const [isEditMode, setIsEditMode] = useState(mode === "create");
  const [EmployerData, setEmployerData] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    userName: "",
    password: "",
    address: "",
    nic: "",
    role: "",
    active: "",
  });

  useEffect(() => {
    if (mode === "edit" || mode === "view") {
      const fetchStore = async () => {
        try {
          const response = await api.get(`/store/${id}`);
          setEmployerData(response.data);
          if (mode === "view") {
            setIsEditMode(false);
          }
        } catch (error) {
          console.error("Failed to fetch Employer Details:", error);
        }
      };
      fetchStore();
    }
  }, [mode, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployerData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await api.post("/store/add", EmployerData);
        alert("Employee created successfully");
      } else if (isEditMode) {
        await api.put(`/store/update/${id}`, EmployerData);
        alert("Employee updated successfully");
      }
      navigate("/store/search");
    } catch (error) {
      console.error("Failed to save Employee:", error);
      alert("Employee save failed. Please try again.");
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <Container className="my-5">
      <h2 className="text-center mb-4">{mode === 'create' ? 'Add New Employee' : isEditMode ? 'Edit EMployee' : 'View Employee'}</h2>
      <Form onSubmit={handleSubmit} className="p-4 border rounded shadow-sm" style={{ backgroundColor: '#e0f7fa', maxHeight: '80vh', overflowY: 'auto' }}>
        <Form.Group controlId="firstName" className="mb-3">
          <Form.Label>First Name</Form.Label>
          <Form.Control
            type="text"
            value={EmployerData.firstName}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          />
        </Form.Group>
        <Form.Group controlId="lastName" className="mb-3">
          <Form.Label>Last Name</Form.Label>
          <Form.Control
            type="text"
            value={EmployerData.lastName}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          />
        </Form.Group>
        <Form.Group controlId="email" className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={EmployerData.email}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          />
        </Form.Group>
        <Form.Group controlId="address" className="mb-3">
          <Form.Label>Address</Form.Label>
          <Form.Control
            type="text"
            value={EmployerData.address}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          />
        </Form.Group>
        <Form.Group controlId="nic" className="mb-3">
          <Form.Label>NIC</Form.Label>
          <Form.Control
            type="text"
            value={EmployerData.nic}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          />
        </Form.Group>
        <Form.Group controlId="role" className="mb-3">
          <Form.Label>Role</Form.Label>
          <Form.Control
            as="select"
            value={EmployerData.role}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          >
            <option value="">Select a role</option>
            <option value="a1">Admin</option>
            <option value="s1">HR</option>
            <option value="c1">Manager</option>
            <option value="s1">Employee</option>
            {/* Add more roles as needed */}
          </Form.Control>
        </Form.Group>

        <Form.Group controlId="userName" className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            value={EmployerData.userName}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          />
        </Form.Group>
        <Form.Group controlId="password" className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="text"
            value={EmployerData.password}
            onChange={handleChange}
            disabled={!isEditMode}
            required
          />
        </Form.Group>
        {/* <Button variant="primary" type="submit" className="me-2">
              Save
            </Button> */}
        {/* <Button variant="secondary" type="cancel" onClick={handleCancel}>
              Cancel
            </Button> */}
        {!isEditMode && (
          <Button
            type="button"
            variant="primary"
            className="w-100 mb-3"
            onClick={toggleEditMode}
          >
            Edit Store
          </Button>
        )}
        {isEditMode && (
          <Button type="submit" variant="success" className="w-100">
            Save Changes
          </Button>
        )}
      </Form>
    </Container>
  );
}

export default EmployerForm;
