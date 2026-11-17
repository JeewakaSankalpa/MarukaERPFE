import { ArrowLeft, Building2, CalendarClock, MapPin, Plus, RefreshCw, Search, TrendingDown, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Badge, Row, Col, Alert, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import PaymentAccountPicker from "../ReusableComponents/PaymentAccountPicker";
import SafeSelect from "../ReusableComponents/SafeSelect";
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import './AssetRegister.css';

const AssetRegister = () => {
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [query, setQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        category: "PC",
        serialNumber: "",
        purchaseDate: "",
        purchaseCost: "",
        depreciationRate: "20",
        location: "",
        paymentAccountId: "",
        paymentAccountName: "",
        paymentAccountType: "",
        paymentMethod: ""
    });

    const [maintenance, setMaintenance] = useState([]);
    const [attachments, setAttachments] = useState([]);

    // Maintenance Form
    const [mForm, setMForm] = useState({ date: '', description: '', cost: '', performedBy: '', invoiceUrl: '' });
    // Attachment Form
    const [attachUrl, setAttachUrl] = useState('');

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await api.get("/assets");
            setAssets(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setLoadError('The asset register could not be loaded. Retry when the finance service is available.');
            toast.error("Failed to load assets");
        } finally {
            setLoading(false);
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
            if (formData.paymentAccountId && !formData.paymentMethod) {
                toast.warn("Please explicitly select a Payment Method for the specified account");
                return;
            }
            const currentPayments = formData.paymentAccountId ? [{
                id: null,
                date: formData.purchaseDate,
                amount: formData.purchaseCost,
                method: formData.paymentMethod,
                paymentAccountId: formData.paymentAccountId,
                paymentAccountName: formData.paymentAccountName,
                paymentAccountType: formData.paymentAccountType
            }] : [];
            const payload = { ...formData, payments: currentPayments, id: editing ? editing.id : null, maintenanceHistory: maintenance, attachments: attachments };
            await api.post("/assets", payload);
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
            location: asset.location,
            paymentAccountId: asset.payments?.[0]?.paymentAccountId || "",
            paymentAccountName: asset.payments?.[0]?.paymentAccountName || "",
            paymentAccountType: asset.payments?.[0]?.paymentAccountType || "",
            paymentMethod: asset.payments?.[0]?.method || ""
        });
        setMaintenance(asset.maintenanceHistory || []);
        setAttachments(asset.attachments || []);
        setShowModal(true);
    };

    const addMaintenance = () => {
        if (!mForm.description || !mForm.cost) return toast.warn("Desc and Cost required");
        setMaintenance([...maintenance, { ...mForm }]);
        setMForm({ date: '', description: '', cost: '', performedBy: '', invoiceUrl: '' });
    };

    const addAttachment = () => {
        if (!attachUrl) return;
        setAttachments([...attachments, attachUrl]);
        setAttachUrl('');
    };

    const money = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(Number(value || 0));
    const totalCost = assets.reduce((sum, asset) => sum + Number(asset.purchaseCost || 0), 0);
    const currentValue = assets.reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);
    const accumulatedDepreciation = Math.max(0, totalCost - currentValue);
    const categories = new Set(assets.map(asset => asset.category).filter(Boolean)).size;
    const normalizedQuery = query.trim().toLowerCase();
    const visibleAssets = assets.filter(asset => !normalizedQuery || [asset.name, asset.category, asset.serialNumber, asset.location]
        .some(value => String(value || '').toLowerCase().includes(normalizedQuery)));

    return (
        <main className="asset-register-page">
            <header className="asset-register-header">
                <div className="asset-register-heading">
                    <button type="button" className="asset-register-back" aria-label="Go back" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                    <div><span className="asset-register-eyebrow">Sales &amp; Finance · Asset control</span><h1>Fixed assets register</h1><p>Review acquisition cost, depreciation exposure, and the current carrying value of operational assets.</p></div>
                </div>
                <div className="asset-register-actions">
                    <Button variant="outline-secondary" onClick={fetchAssets} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</Button>
                    <Button variant="warning" onClick={runDepreciation}><CalendarClock size={16} aria-hidden="true" /> Update depreciation</Button>
                    <Button variant="primary" onClick={() => { setEditing(null); setMaintenance([]); setAttachments([]); setShowModal(true); }}><Plus size={16} aria-hidden="true" /> Add asset</Button>
                </div>
            </header>

            {loadError && <Alert variant="danger" className="asset-register-error"><div><strong>Asset data unavailable</strong><span>{loadError}</span></div><Button variant="outline-danger" size="sm" onClick={fetchAssets}>Retry</Button></Alert>}

            <section className="asset-register-summary" aria-label="Asset portfolio summary">
                <article><WalletCards size={18} aria-hidden="true" /><span>Acquisition cost</span><strong>{money(totalCost)}</strong><small>{assets.length} registered assets</small></article>
                <article><Building2 size={18} aria-hidden="true" /><span>Current carrying value</span><strong>{money(currentValue)}</strong><small>After recorded depreciation</small></article>
                <article><TrendingDown size={18} aria-hidden="true" /><span>Accumulated depreciation</span><strong>{money(accumulatedDepreciation)}</strong><small>{totalCost ? `${((accumulatedDepreciation / totalCost) * 100).toFixed(1)}% of acquisition cost` : 'No acquisition value'}</small></article>
                <article><MapPin size={18} aria-hidden="true" /><span>Portfolio coverage</span><strong>{categories} categories</strong><small>{new Set(assets.map(asset => asset.location).filter(Boolean)).size} operating locations</small></article>
            </section>

            <section className="asset-register-panel" aria-labelledby="asset-register-title">
                <div className="asset-register-toolbar">
                    <div><span>Portfolio register</span><h2 id="asset-register-title">Assets and carrying values</h2><small>{visibleAssets.length} of {assets.length} assets shown</small></div>
                    <div className="asset-register-search"><Search size={16} aria-hidden="true" /><Form.Control aria-label="Search assets" placeholder="Search name, serial, category, or location" value={query} onChange={event => setQuery(event.target.value)} /></div>
                </div>
                <div className="asset-register-table" role="region" aria-label="Fixed assets table" tabIndex="0">
            <Table hover className="mb-0">
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
                    {loading ? <tr><td colSpan="9" className="asset-register-state"><Spinner animation="border" size="sm" /> Loading asset register…</td></tr> : visibleAssets.map(a => (
                        <tr key={a.id}>
                            <td><strong>{a.name}</strong><small className="d-block">{a.id}</small></td>
                            <td><Badge bg="secondary">{a.category}</Badge></td>
                            <td>{a.serialNumber}</td>
                            <td>{a.purchaseDate}</td>
                            <td className="text-end">{money(a.purchaseCost)}</td>
                            <td className="text-end">{a.depreciationRate}%</td>
                            <td className="text-end fw-bold">{money(a.currentValue)}</td>
                            <td>{a.location}</td>
                            <td>
                                <Button size="sm" variant="outline-primary" onClick={() => openEdit(a)}>Edit</Button>
                            </td>
                        </tr>
                    ))}
                    {!loading && visibleAssets.length === 0 && <tr><td colSpan="9" className="asset-register-state"><strong>No matching assets</strong><span>Adjust the search to view another part of the portfolio.</span></td></tr>}
                </tbody>
            </Table>
                </div>
            </section>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton><Modal.Title>{editing ? "Edit Asset" : "New Asset"}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Asset Name</Form.Label>
                                    <Form.Control required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Category</Form.Label>
                                    <SafeSelect value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="PC">IT / Computer</option>
                                        <option value="VEHICLE">Vehicle</option>
                                        <option value="MACHINERY">Machinery</option>
                                        <option value="FURNITURE">Furniture</option>
                                    </SafeSelect>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Serial No</Form.Label>
                                    <Form.Control value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Purchase Date</Form.Label>
                                    <SafeDatePicker name="purchaseDate" required value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cost</Form.Label>
                                    <Form.Control type="number" required value={formData.purchaseCost} onChange={e => setFormData({ ...formData, purchaseCost: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3 border p-3 rounded bg-light">
                                    <Form.Label className="fw-bold">Asset Payment Details (Optional)</Form.Label>
                                    <PaymentAccountPicker
                                        value={formData.paymentAccountId}
                                        onChange={(details) => setFormData({ ...formData, ...details })}
                                    />
                                    <small className="text-muted d-block mt-1">If provided, this purchase will be tracked under the selected Payment Method dashboard.</small>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Depreciation Rate (%)</Form.Label>
                                    <Form.Control type="number" required value={formData.depreciationRate} onChange={e => setFormData({ ...formData, depreciationRate: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Location</Form.Label>
                                    <Form.Control value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <hr />
                        <h5>Maintenance History</h5>
                        <div className="bg-light p-2 mb-3 rounded">
                            <Row className="g-2">
                                <Col md={3}><SafeDatePicker name="date" value={mForm.date} onChange={e => setMForm({ ...mForm, date: e.target.value })} /></Col>
                                <Col md={4}><Form.Control placeholder="Description" value={mForm.description} onChange={e => setMForm({ ...mForm, description: e.target.value })} /></Col>
                                <Col md={3}><Form.Control type="number" placeholder="Cost" value={mForm.cost} onChange={e => setMForm({ ...mForm, cost: e.target.value })} /></Col>
                                <Col md={2}><Button variant="secondary" size="sm" onClick={addMaintenance}>Add</Button></Col>
                            </Row>
                        </div>
                        <Table size="sm" bordered>
                            <thead><tr><th>Date</th><th>Desc</th><th>Cost</th></tr></thead>
                            <tbody>
                                {maintenance.map((m, i) => (
                                    <tr key={i}><td>{m.date}</td><td>{m.description}</td><td>{m.cost}</td></tr>
                                ))}
                            </tbody>
                        </Table>

                        <hr />
                        <h5>Documents</h5>
                        <div className="d-flex gap-2 mb-2">
                            <Form.Control placeholder="Document URL / Link" value={attachUrl} onChange={e => setAttachUrl(e.target.value)} />
                            <Button variant="secondary" onClick={addAttachment}>Add Link</Button>
                        </div>
                        <ul>
                            {attachments.map((a, i) => <li key={i}><a href={a} target="_blank" rel="noreferrer">{a}</a></li>)}
                        </ul>

                        <div className="mt-4 text-end">
                            <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button type="submit" variant="primary">Save Asset</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
            <ToastContainer />
        </main>
    );
};

export default AssetRegister;
