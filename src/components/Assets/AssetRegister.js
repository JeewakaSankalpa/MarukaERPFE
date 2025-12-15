import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Badge, Container, Row, Col } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";


const AssetRegister = () => {
    const [assets, setAssets] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        category: "PC",
        serialNumber: "",
        purchaseDate: "",
        purchaseCost: "",
        depreciationRate: "20",
        location: ""
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await api.get("/assets");
            setAssets(res.data);
        } catch (e) {
            toast.error("Failed to load assets");
        }
    };

    const runDepreciation = async () => {
        try {
            await api.post("/assets/calculate-depreciation");
            toast.success("Depreciation calculated!");
            fetchAssets();
        } catch (e) {
            toast.error("Failed to run depreciation");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/assets", { ...formData, id: editing ? editing.id : null });
            toast.success("Asset saved");
            setShowModal(false);
            fetchAssets();
        } catch (e) {
            toast.error("Failed to save asset");
        }
    };

    const openEdit = (asset) => {
        setEditing(asset);
        setFormData({
            name: asset.name,
            category: asset.category,
            serialNumber: asset.serialNumber,
            purchaseDate: asset.purchaseDate,
            purchaseCost: asset.purchaseCost,
            depreciationRate: asset.depreciationRate,
            location: asset.location
        });
        setShowModal(true);
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between mb-4">
                <h2>Fixed Assets Register</h2>
                <div className="d-flex gap-2">
                    <Button variant="warning" onClick={runDepreciation}>Update Depreciation</Button>
                    <Button variant="primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Add Asset</Button>
                </div>
            </div>

            <Table striped hover responsive className="bg-white shadow-sm">
                <thead className="table-dark">
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Serial</th>
                        <th>Purchase Date</th>
                        <th className="text-end">Cost</th>
                        <th className="text-end">Rate (%)</th>
                        <th className="text-end">Current Value</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map(a => (
                        <tr key={a.id}>
                            <td>{a.name}</td>
                            <td><Badge bg="secondary">{a.category}</Badge></td>
                            <td>{a.serialNumber}</td>
                            <td>{a.purchaseDate}</td>
                            <td className="text-end">{a.purchaseCost?.toLocaleString()}</td>
                            <td className="text-end">{a.depreciationRate}%</td>
                            <td className="text-end fw-bold">{a.currentValue?.toLocaleString()}</td>
                            <td>{a.location}</td>
                            <td>
                                <Button size="sm" variant="outline-primary" onClick={() => openEdit(a)}>Edit</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton><Modal.Title>{editing ? "Edit Asset" : "New Asset"}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Asset Name</Form.Label>
                            <Form.Control required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </Form.Group>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Category</Form.Label>
                                    <Form.Select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="PC">IT / Computer</option>
                                        <option value="VEHICLE">Vehicle</option>
                                        <option value="MACHINERY">Machinery</option>
                                        <option value="FURNITURE">Furniture</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Serial No</Form.Label>
                                    <Form.Control value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Purchase Date</Form.Label>
                                    <Form.Control type="date" required value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cost</Form.Label>
                                    <Form.Control type="number" required value={formData.purchaseCost} onChange={e => setFormData({ ...formData, purchaseCost: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Depreciation Rate (%)</Form.Label>
                                    <Form.Control type="number" required value={formData.depreciationRate} onChange={e => setFormData({ ...formData, depreciationRate: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Location</Form.Label>
                                    <Form.Control value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Button type="submit" variant="primary" className="w-100">Save Asset</Button>
                    </Form>
                </Modal.Body>
            </Modal>
            <ToastContainer />
        </Container>
    );
};

export default AssetRegister;
