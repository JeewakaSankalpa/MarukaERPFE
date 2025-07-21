import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Table, Form, Button, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function UserSearch() {
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    // Fetch users from the API
    const fetchUsers = async (query = '') => {
        try {
            const response = await api.get('/user/search', { params: { searchQuery: query } });
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchClick = () => {
        fetchUsers(searchQuery);
    };

    const handleRowClick = (userId) => {
        navigate(`/user/edit/${userId}`);
    };

    return (
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
            <div className="p-4 rounded shadow" style={{ width: '100%', maxWidth: '700px', backgroundColor: '#f9f9f9' }}>
                <h2 className="text-center mb-4">User Search</h2>
                <Form className="d-flex mb-3">
                    <Form.Control
                        type="text"
                        placeholder="Search by Name, NIC, or Phone Number"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="me-2"
                    />
                    <Button variant="primary" onClick={handleSearchClick} className="me-2">Search</Button>
                    {/*<Button variant="success" onClick={() => alert('Filter options would go here')}>Filter</Button>*/}
                </Form>
                <Table hover responsive bordered className="text-center">
                    <thead className="table-primary">
                    <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>NIC</th>
                        <th>Phone Number</th>
                        <th>Email</th>
                        <th>Access Level</th>
                    </tr>
                    </thead>
                    <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="text-center">No users found</td>
                        </tr>
                    ) : (
                        users.map((user) => (
                            <tr key={user.id} onClick={() => handleRowClick(user.id)} className="clickable-row" style={{ cursor: 'pointer' }}>
                                <td>{user.firstName}</td>
                                <td>{user.lastName}</td>
                                <td>{user.nic}</td>
                                <td>{user.contactNumber}</td>
                                <td>{user.email}</td>
                                <td>{user.accessLevel}</td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
}

export default UserSearch;
