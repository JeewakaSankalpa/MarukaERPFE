import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';

function UserCreate({ mode }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isEditMode, setIsEditMode] = useState(mode === 'create');
    const [userData, setUserData] = useState({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        address: '',
        nicNumber: '',
        role: '',
        active: true,
        // allowedStores: []
    });

    useEffect(() => {
        if (mode === 'edit' || mode === 'view') {
            const fetchUser = async () => {
                try {
                    const response = await api.get(`/employee/${id}`);
                    setUserData({
                        ...response.data,
                        allowedStores: response.data.allowedStores || []
                    });
                    if (mode === 'view') {
                        setIsEditMode(false);
                    }
                } catch (error) {
                    console.error('Failed to fetch user:', error);
                }
            };
            fetchUser();
        }
    }, [mode, id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (mode === 'create') {
                await api.post('/user/create', userData);
                alert('User created successfully');
            } else if (isEditMode) {
                await api.put(`/user/update/${id}`, userData);
                alert('User updated successfully');
            }
            navigate('/user/search');
        } catch (error) {
            console.error('User save failed:', error);
            alert('User save failed. Please try again.');
        }
    };

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
    };

    return (
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
            <div style={{ maxWidth: '600px', width: '100%' }} className="p-4 bg-white rounded shadow">
                <h2 className="text-center mb-4">{mode === 'create' ? 'Create User' : isEditMode ? 'Edit User' : 'View User'}</h2>
                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={6}>
                            <Form.Group controlId="username" className="mb-3">
                                <Form.Label>Username</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="username"
                                    placeholder="Enter username"
                                    value={userData.username}
                                    onChange={handleChange}
                                    required
                                    disabled={mode !== 'create'}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group controlId="password" className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    placeholder="Enter password"
                                    value={userData.password}
                                    onChange={handleChange}
                                    required={mode === 'create'}
                                    disabled={mode !== 'create'}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group controlId="firstName" className="mb-3">
                                <Form.Label>First Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="firstName"
                                    placeholder="Enter first name"
                                    value={userData.firstName}
                                    onChange={handleChange}
                                    required
                                    disabled={!isEditMode}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group controlId="lastName" className="mb-3">
                                <Form.Label>Last Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="lastName"
                                    placeholder="Enter last name"
                                    value={userData.lastName}
                                    onChange={handleChange}
                                    required
                                    disabled={!isEditMode}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
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
                            <Form.Group controlId="address" className="mb-3">
                                <Form.Label>Adress</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="address"
                                    placeholder="Enter Adress"
                                    value={userData.address}
                                    onChange={handleChange}
                                    required
                                    disabled={!isEditMode}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group controlId="nicNumber" className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="nicNumber"
                                    placeholder="Enter NIC"
                                    value={userData.nicNumber}
                                    onChange={handleChange}
                                    required
                                    disabled={!isEditMode}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group controlId="role" className="mb-3">
                                <Form.Label>User Role</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="role"
                                    value={userData.role}
                                    onChange={handleChange}
                                    required
                                    disabled={!isEditMode}
                                >
                                    <option value="">Select Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="admin">HR</option>
                                    <option value="manager">Manager</option>
                                    <option value="cashier">Employee</option>
                                </Form.Control>
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
                            {stores.map(store => (
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
                            onChange={() => setUserData((prevData) => ({ ...prevData, active: !prevData.active }))}
                            disabled={!isEditMode}
                        />
                    </Form.Group>
                    {!isEditMode && (
                        <Button type="button" variant="primary" className="w-100 mb-3" onClick={toggleEditMode}>
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