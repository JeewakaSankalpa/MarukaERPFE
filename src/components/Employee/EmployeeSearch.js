import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

function EmployeeSearch() {
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await api.get('/store/all');
                setEmployees(response.data);
            } catch (error) {
                console.error('Failed to fetch employees:', error);
            }
        };
        fetchEmployees();
    }, []);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.get(`/store/search?name=${searchQuery}`);
            setEmployees(response.data);
        } catch (error) {
            console.error('Failed to search employees:', error);
        }
    };

    const handleRowClick = (storeId) => {
        navigate(`/store/edit/${storeId}`);
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
            <h2 className="text-center mb-4">Employee Search</h2>
            <Form onSubmit={handleSearchSubmit} className="d-flex mb-3">
                <Form.Control
                    type="text"
                    placeholder="Search by Employee Name"
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
                <Button variant="primary" type="submit" className="ms-2">Search</Button>
            </Form>

            <div
                style={{  height: `${0.6*windowSize.height}px`,dispay: "flex", flexDirection: "column", overflowY: "scroll"}}
            >
            <Table striped bordered hover responsive className="mt-3">
                <thead>
                <tr>
                    <th>First Name</th>
                    <th>LAst Name</th>
                    <th>Contact Number</th>
                    <th>Address</th>
                    <th>NIC</th>
                    <th>Role</th>
                    <th>Active Status</th>
                </tr>
                </thead>
                <tbody>
                {employees.map((employee) => (
                    <tr key={employee.id} onClick={() => handleRowClick(employee.id)} style={{cursor: 'pointer'}}>
                        <td>{employee.name}</td>
                        <td>{employee.description}</td>
                        <td>{employee.contactNumber}</td>
                        <td>{employee.address}</td>
                        <td>{employee.city}</td>
                        <td>{employee.description}</td>
                        <td>{employee.description}</td>
                    </tr>
                ))}
                </tbody>
            </Table>
            </div>
        </Container>
    );
}

export default EmployeeSearch;