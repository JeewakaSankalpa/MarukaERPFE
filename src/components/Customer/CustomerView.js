// src/components/customer/CustomerList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Container, Form } from 'react-bootstrap';
import api from '../../services/api';

function CustomerView({ onEditCustomer }) {
    const [customers, setCustomers] = useState([]);
    const [searchMobile, setSearchMobile] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customer/all');
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
                <Button variant="primary" onClick={handleSearch}>Search</Button>
            </Form>
            <div
                style={{  height: `${0.6*windowSize.height}px`,dispay: "flex", flexDirection: "column", overflowY: "scroll"}}
            >
            <Table bordered hover responsive className="text-center">
                <thead className="table-primary">
                <tr>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Mobile Number</th>
                    <th>Address</th>
                    <th>Email</th>
                    <th>Date of Birth</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {customers.map((customer) => (
                    <tr key={customer.customerId}>
                        <td>{customer.customerId}</td>
                        <td>{customer.name}</td>
                        <td>{customer.mobileNumber}</td>
                        <td>{customer.mobileNumber}</td>
                        <td>{customer.email}</td>
                        <td>{new Date(customer.dateOfBirth).toLocaleDateString()}</td>
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
