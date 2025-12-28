import React, { useEffect, useState } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { FaTruck, FaFilePdf, FaSave } from 'react-icons/fa';

export default function DeliveryScheduleCard({ projectId, reloadKey }) {
    const [data, setData] = useState({
        scheduledDate: '',
        location: '',
        vehicleDetails: '',
        responsibleEmployeeId: '',
        responsibleEmployeeName: '',
        status: 'PENDING'
    });
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, reloadKey]);

    const fetchInitialData = async () => {
        try {
            // Fetch Employees for dropdown
            const empRes = await api.get('/employee/all');
            setEmployees(empRes.data || []);

            // Fetch Delivery Data
            const res = await api.get(`/projects/${projectId}/delivery`);
            if (res.status === 200 && res.data) {
                setData(res.data);
            }
        } catch (e) {
            console.error("Failed to load delivery data", e);
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));

        // If employee changes, update name for convenience (though backend could do it)
        if (name === 'responsibleEmployeeId') {
            const emp = employees.find(e => e.id === value);
            if (emp) {
                setData(prev => ({ ...prev, responsibleEmployeeName: `${emp.firstName} ${emp.lastName}` }));
            }
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.post(`/projects/${projectId}/delivery`, data);
            toast.success("Delivery Schedule Saved");
        } catch (e) {
            toast.error("Failed to save schedule");
        } finally {
            setLoading(false);
        }
    };

    const downloadPdf = async (type) => { // 'gatepass' or 'confirmation'
        try {
            const res = await api.get(`/projects/${projectId}/delivery/${type}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_${projectId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            toast.error(`Failed to download ${type}`);
        }
    };

    if (fetching) return <div>Loading Delivery Info...</div>;

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-primary">
                    <FaTruck className="me-2" /> Delivery Schedule
                </h5>
                <div className="d-flex gap-2">
                    <Button variant="outline-danger" size="sm" onClick={() => downloadPdf('gatepass')} disabled={!data.id}>
                        <FaFilePdf /> Gate Pass
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={() => downloadPdf('confirmation')} disabled={!data.id}>
                        <FaFilePdf /> Delivery Note
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                <Form>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Scheduled Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="scheduledDate"
                                    value={data.scheduledDate || ''}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Target Location</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="location"
                                    placeholder="Enter Delivery Address"
                                    value={data.location || ''}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Vehicle Details</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="vehicleDetails"
                                    placeholder="Vehicle No / Type"
                                    value={data.vehicleDetails || ''}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Responsible Person</Form.Label>
                                <Form.Select
                                    name="responsibleEmployeeId"
                                    value={data.responsibleEmployeeId || ''}
                                    onChange={handleChange}
                                >
                                    <option value="">-- Select Employee --</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.firstName} {e.lastName} ({e.role})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <div className="d-flex justify-content-end">
                        <Button variant="primary" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : <><FaSave className="me-1" /> Save Schedule</>}
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
}
