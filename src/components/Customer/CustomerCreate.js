import React, { useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import api from "../../api/api";
import { Navigate, useNavigate } from "react-router-dom";

function CustomerCreate() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
//   const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [showForm, setShowForm] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customerData = { name, mobileNumber, email, address };

    try {
      await api.post("/customer/create", customerData);
      alert("Customer saved successfully!");
      setShowForm(false); // Hide the form after saving
    } catch (error) {
      console.error("Failed to save customer:", error);
    }
    navigate("/customer/search");
  };

  const handleCancel = async () => {
    navigate("/customer/search");
  };

  return (
    <>
      {showForm ? (
        <Container className="my-5">
          <h2 className="text-center mb-4">Add Customer</h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="id" className="mb-3">
              <Form.Label>Customer ID</Form.Label>
              <Form.Control
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="name" className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="address" className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="mobileNumber" className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control
                type="text"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="email" className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="taxId" className="mb-3">
              <Form.Label>Tax ID</Form.Label>
              <Form.Control
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                required
              />
            </Form.Group>
            {/* <Form.Group controlId="dateOfBirth" className="mb-3">
              <Form.Label>Date of Birth</Form.Label>
              <Form.Control
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </Form.Group> */}
            <Button variant="primary" type="submit" className="me-2">
              Save
            </Button>
            <Button variant="secondary" type="cancel" onClick={handleCancel}>
              Cancel
            </Button>
          </Form>
        </Container>
      ) : (
        <p>Customer saved. You may proceed with other actions.</p>
      )}
    </>
  );
}

export default CustomerCreate;
