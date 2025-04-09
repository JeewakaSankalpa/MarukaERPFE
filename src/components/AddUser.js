import React, { useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../services/api";

const AddUser = () => {
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        fullName: "",
        dateOfBirth: "",
        nic: "",
        image: "",
        address: "",
        contactNumber: "",
        email: "",
        accessLevel: "",
        createdAt: "",
        createdBy: "",
        lastAccessDate: "",
        active: true,
        inactivatedAt: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post("/user/add", formData);
            toast.success("User added successfully!");
            setFormData({
                username: "",
                password: "",
                firstName: "",
                lastName: "",
                fullName: "",
                dateOfBirth: "",
                nic: "",
                image: "",
                address: "",
                contactNumber: "",
                email: "",
                accessLevel: "",
                createdAt: "",
                createdBy: "",
                lastAccessDate: "",
                active: true,
                inactivatedAt: ""
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add user");
        }
    };

    return (
        <Container>
            <h2>Add New User</h2>
            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="username">
                    <Form.Label>Username</Form.Label>
                    <Form.Control type="text" name="username" value={formData.username} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="password">
                    <Form.Label>Password</Form.Label>
                    <Form.Control type="password" name="password" value={formData.password} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="firstName">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="lastName">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="fullName">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
                </Form.Group>
                <Form.Group controlId="dateOfBirth">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="nic">
                    <Form.Label>NIC</Form.Label>
                    <Form.Control type="text" name="nic" value={formData.nic} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="image">
                    <Form.Label>Profile Image URL</Form.Label>
                    <Form.Control type="text" name="image" value={formData.image} onChange={handleChange} />
                </Form.Group>
                <Form.Group controlId="address">
                    <Form.Label>Address</Form.Label>
                    <Form.Control type="text" name="address" value={formData.address} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="contactNumber">
                    <Form.Label>Contact Number</Form.Label>
                    <Form.Control type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="email">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                </Form.Group>
                <Form.Group controlId="accessLevel">
                    <Form.Label>Access Level</Form.Label>
                    <Form.Control as="select" name="accessLevel" value={formData.accessLevel} onChange={handleChange} required>
                        <option value="">Select</option>
                        <option value="c1">Customer</option>
                        <option value="a1">Admin</option>
                    </Form.Control>
                </Form.Group>
                <Form.Group controlId="createdBy">
                    <Form.Label>Created By</Form.Label>
                    <Form.Control type="text" name="createdBy" value={formData.createdBy} onChange={handleChange} required />
                </Form.Group>
                <Button variant="primary" type="submit" className="mt-3">Add User</Button>
            </Form>
            <ToastContainer />
        </Container>
    );
};

export default AddUser;
