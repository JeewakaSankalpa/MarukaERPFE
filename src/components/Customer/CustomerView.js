// src/components/customer/CustomerList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Container, Form, Modal, Row, Col, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

function CustomerView({ onEditCustomer }) {
    const [customers, setCustomers] = useState([]);
    const [searchMobile, setSearchMobile] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customer/all');
            console.log("Customer Data:", response.data);
            setCustomers(response.data);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        }
    };

    const handleSearch = async () => {
        if (searchMobile) {
            try {
                const response = await api.get(`/customer/search?mobileNumber=${searchMobile}`);
                setCustomers(response.data);
            } catch (error) {
                console.error('Failed to search customers:', error);
            }
        } else {
            fetchCustomers();
        }
    };

    const handleShowDetails = async (customer) => {
        // Fetch fresh details to ensure valid signed URLs
        try {
            const response = await api.get(`/customer/${customer.id}`);
            setSelectedCustomer(response.data);
            setShowModal(true);
        } catch (error) {
            console.error("Failed to refresh customer details", error);
            // Fallback to existing data if fetch fails
            setSelectedCustomer(customer);
            setShowModal(true);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCustomer(null);
    };

    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <Container className="my-5">
            <h2 className="text-center mb-4">Customer List</h2>
            <Form className="d-flex mb-3">
                <Form.Control
                    type="text"
                    placeholder="Search by Mobile Number"
                    value={searchMobile}
                    onChange={(e) => setSearchMobile(e.target.value)}
                />
                <Button variant="primary" onClick={handleSearch} className="me-2">Search</Button>
                <Button variant="success" onClick={() => navigate('/customer/create')}>+ Create Customer</Button>
            </Form>
            <div
                style={{ height: `${0.6 * windowSize.height}px`, display: "flex", flexDirection: "column", overflowY: "scroll" }}
            >
                <Table bordered hover responsive className="text-center">
                    <thead className="table-primary">
                        <tr>
                            <th>Company Name</th>
                            <th>Contact Person</th>
                            <th>Contact Number</th>
                            <th>Address</th>
                            <th>Email</th>
                            <th>BR Number</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map((customer) => (
                            <tr key={customer.id}>
                                <td>{customer.comName}</td>
                                <td>{customer.contactPersonData?.name || '-'}</td>
                                <td>{customer.comContactNumber}</td>
                                <td>{customer.comAddress}</td>
                                <td>{customer.comEmail}</td>
                                <td>{customer.businessRegNumber}</td>
                                <td>
                                    <div className="d-flex gap-2 justify-content-center">
                                        <Button variant="info" size="sm" onClick={() => handleShowDetails(customer)}>View</Button>
                                        <Button variant="warning" size="sm" onClick={() => onEditCustomer(customer)}>Edit</Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* View Modal */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Customer Details: {selectedCustomer?.comName}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedCustomer && (
                        <Container fluid>
                            <h5 className="mb-3 text-primary">Company Information</h5>
                            <Row className="mb-2">
                                <Col sm={6}><strong>Company Name:</strong> {selectedCustomer.comName}</Col>
                                <Col sm={6}><strong>BR Number:</strong> {selectedCustomer.businessRegNumber || 'N/A'}</Col>
                            </Row>
                            <Row className="mb-2">
                                <Col sm={6}><strong>Address:</strong> {selectedCustomer.comAddress}</Col>
                                <Col sm={6}><strong>Email:</strong> {selectedCustomer.comEmail}</Col>
                            </Row>
                            <Row className="mb-2">
                                <Col sm={6}><strong>Contact Number:</strong> {selectedCustomer.comContactNumber}</Col>
                            </Row>

                            <hr />
                            <h5 className="mb-3 text-primary">Contact Person</h5>
                            <Row className="mb-2">
                                <Col sm={4}><strong>Name:</strong> {selectedCustomer.contactPersonData?.name}</Col>
                                <Col sm={4}><strong>Mobile:</strong> {selectedCustomer.contactPersonData?.contactNumber}</Col>
                                <Col sm={4}><strong>Email:</strong> {selectedCustomer.contactPersonData?.email}</Col>
                            </Row>

                            <hr />
                            <h5 className="mb-3 text-primary">Tax & Financial</h5>
                            <Row className="mb-2">
                                <Col sm={4}><strong>Currency:</strong> {selectedCustomer.currency}</Col>
                                <Col sm={4}><strong>Credit Period:</strong> {selectedCustomer.creditPeriod} Days</Col>
                            </Row>
                            <Row className="mb-2">
                                <Col sm={6}>
                                    <strong>VAT Type:</strong> <Badge bg="secondary">{selectedCustomer.vatType}</Badge>
                                </Col>
                                <Col sm={6}>
                                    <strong>VAT Number:</strong> {selectedCustomer.vatNumber || 'N/A'}
                                </Col>
                            </Row>

                            <hr />
                            <h5 className="mb-3 text-primary">Documents</h5>
                            <Row>
                                <Col sm={6} className="d-grid">
                                    <Button
                                        variant={selectedCustomer.vatDocument ? "outline-primary" : "outline-secondary"}
                                        disabled={!!(!selectedCustomer.vatDocument)}
                                        href={selectedCustomer.vatDocument}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {selectedCustomer.vatDocument ? "View VAT Certificate" : "No VAT Document"}
                                    </Button>
                                </Col>
                                <Col sm={6} className="d-grid">
                                    <Button
                                        variant={selectedCustomer.businessRegDocument ? "outline-primary" : "outline-secondary"}
                                        disabled={!!(!selectedCustomer.businessRegDocument)}
                                        href={selectedCustomer.businessRegDocument}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {selectedCustomer.businessRegDocument ? "View BR Certificate" : "No BR Document"}
                                    </Button>
                                </Col>
                            </Row>
                        </Container>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default CustomerView;
