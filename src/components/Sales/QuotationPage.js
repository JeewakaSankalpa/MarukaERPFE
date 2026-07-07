import { ArrowLeft } from 'lucide-react';
import React, { useEffect, useState, useRef } from "react";
import { Container, Row, Col, Form, Button, Card, Badge, Table, Spinner } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/api";
import BoqEditor from "../ReusableComponents/BoqEditor";
import TermsSelector from "./TermsSelector"; // New
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';


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
    const [invoices, setInvoices] = useState([]);
    const [invoiceType, setInvoiceType] = useState("proforma");
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [generatingInvoice, setGeneratingInvoice] = useState(false);

    const invoiceTypeLabels = {
        proforma: "Proforma Invoice",
        normal: "Cash Invoice",
        tax: "Tax Invoice",
    };

    const formatMoney = (value) => Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
    });

    const formatDateTime = (value) => {
        if (!value) return "-";
        return new Date(value).toLocaleString("en-GB", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const invoiceNumberFor = (invoice) =>
        invoice.proformaInvoiceNumber || invoice.normalInvoiceNumber || invoice.taxInvoiceNumber || invoice.invoiceNumber || "-";

    const invoiceTypeFor = (invoice) => {
        const type = invoice.downloadDocumentType || (invoice.taxInvoiceNumber ? "tax" : invoice.normalInvoiceNumber ? "normal" : "proforma");
        return invoiceTypeLabels[type] || type || "-";
    };

    const invoiceTypeVariant = (invoice) => {
        const type = invoice.downloadDocumentType || (invoice.taxInvoiceNumber ? "tax" : invoice.normalInvoiceNumber ? "normal" : "proforma");
        if (type === "tax") return "success";
        if (type === "normal") return "primary";
        return "info";
    };

    const loadInvoices = async (quotationId = quote.id || id) => {
        if (!quotationId || quotationId === "new") return;
        setLoadingInvoices(true);
        try {
            const res = await api.get(`/invoices/by-quotation/${quotationId}`);
            setInvoices(res.data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load invoice history");
        } finally {
            setLoadingInvoices(false);
        }
    };

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
            loadInvoices(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                return res.data;
            } else {
                res = await api.put(`/quotations/${quote.id || id}`, payload);
                if (!silent) toast.success("Quotation Updated");
                // Update local state to reflect potentially new server-side fields (like updated timestamps)
                setQuote(res.data);
                return res.data;
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
            throw e;
        }
    };

    const handleGenerateInvoice = async () => {
        const quoteId = quote.id || id;
        if (!quoteId || isNew) {
            toast.info("Save the quotation before generating invoices");
            return;
        }

        setGeneratingInvoice(true);
        try {
            await handleSave(true);
            const res = await api.post(`/invoices/generate-from-quotation/${quoteId}?type=${invoiceType}`);
            toast.success(`${invoiceTypeLabels[invoiceType]} generated`);
            await loadInvoices(quoteId);
            navigate(`/invoices/${res.data.id}?type=${invoiceType}`);
        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.message || "Failed to generate invoice");
        } finally {
            setGeneratingInvoice(false);
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
                    <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">{isNew ? "New Quotation" : `Quotation: ${quote.quotationNumber || '...'}`}</h3>
                        </div>
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
                                        <SafeDatePicker
                                            name="expiryDate"
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

                {!isNew && (
                    <Col md={12}>
                        <Card className="shadow-sm">
                            <Card.Header className="bg-white d-flex justify-content-between align-items-center gap-3 flex-wrap">
                                <div>
                                    <div className="fw-bold">Invoices</div>
                                    <div className="text-muted small">Generate invoice documents and keep a versioned history for this quotation.</div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <Form.Select
                                        size="sm"
                                        value={invoiceType}
                                        onChange={e => setInvoiceType(e.target.value)}
                                        style={{ width: 190 }}
                                        disabled={generatingInvoice}
                                    >
                                        <option value="proforma">Proforma Invoice</option>
                                        <option value="normal">Cash Invoice</option>
                                        <option value="tax">Tax Invoice</option>
                                    </Form.Select>
                                    <Button size="sm" variant="primary" onClick={handleGenerateInvoice} disabled={generatingInvoice}>
                                        {generatingInvoice ? "Generating..." : "Generate invoice"}
                                    </Button>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                {loadingInvoices ? (
                                    <div className="py-4 text-center text-muted">
                                        <Spinner size="sm" animation="border" className="me-2" />
                                        Loading invoice history...
                                    </div>
                                ) : invoices.length === 0 ? (
                                    <div className="py-4 text-center text-muted">
                                        No invoices generated for this quotation yet.
                                    </div>
                                ) : (
                                    <Table responsive hover size="sm" className="align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Invoice no</th>
                                                <th>Type</th>
                                                <th>Version</th>
                                                <th>Generated by</th>
                                                <th>Generated at</th>
                                                <th className="text-end">Total</th>
                                                <th className="text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...invoices]
                                                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                                                .map(invoice => (
                                                    <tr key={invoice.id}>
                                                        <td className="fw-semibold">{invoiceNumberFor(invoice)}</td>
                                                        <td><Badge bg={invoiceTypeVariant(invoice)}>{invoiceTypeFor(invoice)}</Badge></td>
                                                        <td>{invoice.documentVersion || 1}</td>
                                                        <td>{invoice.createdBy || "system"}</td>
                                                        <td>{formatDateTime(invoice.createdAt)}</td>
                                                        <td className="text-end">LKR {formatMoney(invoice.totalAmount)}</td>
                                                        <td className="text-end">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() => navigate(`/invoices/${invoice.id}?type=${invoice.downloadDocumentType || "proforma"}`)}
                                                            >
                                                                View
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>
        </Container>
    );
}
