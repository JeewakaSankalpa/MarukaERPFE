import React, { useEffect, useState, useRef } from "react";
import { Container, Row, Col, Form, Button, Card, Badge } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/api";
import BoqEditor from "../ReusableComponents/BoqEditor";
import TermsSelector from "./TermsSelector"; // New


export default function QuotationPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    // BoqEditor Ref
    const boqRef = useRef();

    // Data State
    const [quote, setQuote] = useState({
        customerName: "", customerEmail: "", customerAddress: "",
        subject: "", issuedDate: new Date().toISOString().split('T')[0], expiryDate: "",
        status: "DRAFT", components: [], terms: []
    });

    // Ref Data
    const [products, setProducts] = useState([]);
    const [availMap, setAvailMap] = useState({});
    const productById = useRef({});

    useEffect(() => {
        // Load Ref Data
        Promise.all([
            api.get("/products?size=1000").then(r => r.data.content || []),
            api.get("/inventory/available-quantities").then(r => {
                const map = {};
                (r.data || []).forEach(x => map[x.productId] = x.availableQty);
                return map;
            })
        ]).then(([prods, avails]) => {
            setProducts(prods);
            setAvailMap(avails);
            const pMap = {};
            prods.forEach(p => pMap[p.id] = p);
            productById.current = pMap;
        });

        // Load Quote if editing
        if (!isNew) {
            api.get(`/quotations/${id}`).then(res => setQuote(res.data)).catch(e => {
                toast.error("Failed to load quotation");
                navigate("/sales/quotations");
            });
        }
    }, [id, isNew, navigate]);

    const handleSave = async (silent = false) => {
        try {
            // Get data from BoqEditor
            if (!boqRef.current) return;
            const boqPayload = boqRef.current.getPayload();
            const totals = boqRef.current.getTotals();

            const payload = {
                ...quote,
                ...boqPayload, // components, includeVat, etc
                computedSubtotal: totals.rawSubtotal, // Note: BoqEditor might need to expose mapped names better if they differ
                computedGrandTotal: totals.grand
            };

            let res;
            if (isNew && !quote.id) {
                res = await api.post("/quotations", payload);
                toast.success("Quotation Created");
                navigate(`/sales/quotations/${res.data.id}`);
            } else {
                res = await api.put(`/quotations/${quote.id || id}`, payload);
                if (!silent) toast.success("Quotation Updated");
                // Update local state to reflect potentially new server-side fields (like updated timestamps)
                setQuote(res.data);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        }
    };

    const handleConvert = async () => {
        if (!window.confirm("Convert this Quote to a new Project? This will create a project and estimation.")) return;
        try {
            await handleSave(true); // Ensure saved first
            const res = await api.post(`/quotations/${quote.id || id}/convert`);
            toast.success("Converted to Project!");
            navigate(`/projects/${res.data}`); // res.data is projectId
        } catch (e) {
            toast.error(e.response?.data?.message || "Conversion failed");
        }
    };

    return (
        <Container fluid className="p-4" style={{ maxWidth: 1600 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h3 className="mb-0">{isNew ? "New Quotation" : `Quotation: ${quote.quotationNumber || '...'}`}</h3>
                    {!isNew && <Badge bg="info">{quote.status}</Badge>}
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={() => navigate("/sales/quotations")}>Cancel</Button>
                    <Button variant="primary" onClick={() => handleSave()}>Save</Button>
                    {!isNew && quote.status !== 'CONVERTED' && (
                        <Button variant="success" onClick={handleConvert}>Convert to Project</Button>
                    )}
                </div>
            </div>

            <Row className="g-3">
                {/* Header Info */}
                <Col md={12}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Row className="g-3">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Customer Name</Form.Label>
                                        <Form.Control
                                            value={quote.customerName}
                                            onChange={e => setQuote({ ...quote, customerName: e.target.value })}
                                            placeholder="Enter Client Name"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Email</Form.Label>
                                        <Form.Control
                                            value={quote.customerEmail}
                                            onChange={e => setQuote({ ...quote, customerEmail: e.target.value })}
                                            placeholder="client@example.com"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Subject / Title</Form.Label>
                                        <Form.Control
                                            value={quote.subject}
                                            onChange={e => setQuote({ ...quote, subject: e.target.value })}
                                            placeholder="e.g. Factory Automation Proposal"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>Expiry Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={quote.expiryDate || ""}
                                            onChange={e => setQuote({ ...quote, expiryDate: e.target.value })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>Address</Form.Label>
                                        <Form.Control
                                            value={quote.customerAddress || ""}
                                            onChange={e => setQuote({ ...quote, customerAddress: e.target.value })}
                                            placeholder="Billing Address (Optional)"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>

                {/* BOQ Editor */}
                <Col md={12}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-white fw-bold">Items & Costing</Card.Header>
                        <Card.Body>
                            {products.length > 0 && (
                                <BoqEditor
                                    ref={boqRef}
                                    initialData={quote}
                                    products={products}
                                    availMap={availMap}
                                    productById={productById.current}
                                    readOnly={quote.status === 'CONVERTED'}
                                />
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Terms & Conditions */}
                <Col md={12}>
                    <TermsSelector
                        value={quote.terms}
                        onChange={(newTerms) => setQuote({ ...quote, terms: newTerms })}
                    />
                </Col>
            </Row>
        </Container>
    );
}
