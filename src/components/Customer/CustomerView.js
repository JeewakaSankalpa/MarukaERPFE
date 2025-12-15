// src/components/customer/CustomerList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Container, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

function CustomerView({ onEditCustomer }) {
    const [customers, setCustomers] = useState([]);
    const [searchMobile, setSearchMobile] = useState('');
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

        // Add resize event listener
        window.addEventListener("resize", handleResize);

        // Clean up the event listener on component unmount
        return () => {
            window.removeEventListener("resize", handleResize);
        };
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
                            <th>Customer ID</th>
                            <th>Company Name</th>
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
                                <td>{customer.id}</td>
                                <td>{customer.comName}</td>
                                <td>{customer.comContactNumber}</td>
                                <td>{customer.comAddress}</td>
                                <td>{customer.comEmail}</td>
                                <td>{customer.businessRegNumber}</td>
                                <td>
                                    <Button variant="warning" onClick={() => onEditCustomer(customer)}>Edit</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
}

export default CustomerView;
