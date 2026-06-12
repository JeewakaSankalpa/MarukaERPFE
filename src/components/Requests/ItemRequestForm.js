import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FilePenLine, PackagePlus } from "lucide-react";
import {
    Alert, Badge, Button, Col, Container, Form, InputGroup, Nav, Row, Spinner, Table
} from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import SafeSelect from "../ReusableComponents/SafeSelect";
import "react-toastify/dist/ReactToastify.css";

const GENERAL_COMPONENT = "General";
const qp = (values = {}) => {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
        if ((value || value === 0) && value !== "") params.set(key, value);
    });
    return params.toString();
};

const searchProducts = async (q, page = 0, size = 40) =>
    (await api.get(`/products?${qp({ q, status: "ACTIVE", page, size, sort: "name,asc" })}`)).data;
const getIR = async (id) => (await api.get(`/item-requests/${id}`)).data;
const getEstimation = async (projectId) => (await api.get(`/estimations/by-project/${projectId}`)).data;

const listDepartments = async () => {
    try {
        const res = await api.get(`/departments?${qp({ status: "ACTIVE", page: 0, size: 1000, sort: "name,asc" })}`);
        return res.data?.content || [];
    } catch (error) {
        if ([403, 404].includes(error.response?.status)) return [];
        throw error;
    }
};

const listActiveProjects = async () => {
    try {
        const res = await api.get(`/projects?${qp({ status: "ACTIVE", page: 0, size: 1000, sort: "projectName,asc" })}`);
        return res.data?.content || [];
    } catch {
        const res = await api.get(`/projects?${qp({ page: 0, size: 1000, sort: "projectName,asc" })}`);
        const closed = new Set(["COMPLETED", "CLOSED", "ARCHIVED", "DONE"]);
        return (res.data?.content || []).filter(project => !closed.has(String(project.status || "").toUpperCase()));
    }
};

const emptyProductRow = (product) => ({
    productId: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit || "pcs",
    note: "",
    fulfilledQty: 0,
    quantities: {},
    selectedComponents: {}
});

export default function ItemRequestForm({ irId, defaultDepartmentId, defaultProjectId }) {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const urlProjectId = new URLSearchParams(location.search).get("projectId");
    const initialRequestId = irId || params.id || null;

    const [routeId, setRouteId] = useState(initialRequestId);
    const [status, setStatus] = useState(initialRequestId ? "" : "DRAFT");
    const [validated, setValidated] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingRequest, setLoadingRequest] = useState(Boolean(initialRequestId));
    const [loadingEstimation, setLoadingEstimation] = useState(false);

    const [departments, setDepartments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [departmentId, setDepartmentId] = useState(defaultDepartmentId || "");
    const [projectId, setProjectId] = useState(urlProjectId || defaultProjectId || "");
    const [sourceEstimationId, setSourceEstimationId] = useState(null);
    const [comment, setComment] = useState("");

    const [components, setComponents] = useState([GENERAL_COMPONENT]);
    const [activeComponent, setActiveComponent] = useState(GENERAL_COMPONENT);
    const [rows, setRows] = useState([]);

    const [q, setQ] = useState("");
    const [searchData, setSearchData] = useState({ content: [], totalPages: 0 });
    const [productPage, setProductPage] = useState(0);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);

    const isEditable = !routeId || status === "DRAFT";

    useEffect(() => {
        (async () => {
            try {
                const [deps, projs] = await Promise.all([listDepartments(), listActiveProjects()]);
                setDepartments(deps);
                setProjects(projs);
                if (urlProjectId) {
                    setProjectId(urlProjectId);
                    const engineering = deps.find(dep => dep.name === "Engineering");
                    if (engineering) setDepartmentId(engineering.id);
                }
            } catch {
                toast.error("Failed to load departments or projects");
            }
        })();
    }, [urlProjectId]);

    useEffect(() => {
        if (!initialRequestId) return;
        (async () => {
            setLoadingRequest(true);
            try {
                const ir = await getIR(initialRequestId);
                setRouteId(ir.id);
                setStatus(ir.status);
                setDepartmentId(ir.departmentId || "");
                setProjectId(ir.projectId || "");
                setSourceEstimationId(ir.sourceEstimationId || null);
                setComment(ir.comment || "");

                const componentNames = [];
                const mappedRows = (ir.items || []).map(item => {
                    const allocations = item.componentAllocations?.length
                        ? item.componentAllocations
                        : [{ componentName: GENERAL_COMPONENT, quantity: item.requestedQty }];
                    const quantities = {};
                    const selectedComponents = {};
                    allocations.forEach(allocation => {
                        const name = allocation.componentName || GENERAL_COMPONENT;
                        if (!componentNames.includes(name)) componentNames.push(name);
                        quantities[name] = allocation.quantity;
                        selectedComponents[name] = true;
                    });
                    return {
                        productId: item.productId,
                        name: item.productNameSnapshot,
                        sku: item.sku,
                        unit: item.unit || "pcs",
                        note: item.note || "",
                        fulfilledQty: item.fulfilledQty || 0,
                        quantities,
                        selectedComponents
                    };
                });
                const nextComponents = componentNames.length ? componentNames : [GENERAL_COMPONENT];
                setComponents(nextComponents);
                setActiveComponent(nextComponents[0]);
                setRows(mappedRows);
            } catch {
                toast.error("Failed to load item request");
            } finally {
                setLoadingRequest(false);
            }
        })();
    }, [initialRequestId]);

    useEffect(() => {
        if (!projectId || routeId) return;
        (async () => {
            setLoadingEstimation(true);
            try {
                const estimation = await getEstimation(projectId);
                const estimationComponents = (estimation?.components || []).filter(component => component.items?.length);
                if (!estimationComponents.length) {
                    setSourceEstimationId(null);
                    setComponents([GENERAL_COMPONENT]);
                    setActiveComponent(GENERAL_COMPONENT);
                    setRows([]);
                    return;
                }

                const names = estimationComponents.map((component, index) =>
                    component.name?.trim() || `Component ${index + 1}`);
                const rowMap = new Map();
                estimationComponents.forEach((component, componentIndex) => {
                    const componentName = names[componentIndex];
                    (component.items || []).forEach(item => {
                        if (!item.productId || Number(item.quantity || 0) <= 0) return;
                        const current = rowMap.get(item.productId) || {
                            productId: item.productId,
                            name: item.productNameSnapshot || item.productId,
                            sku: item.sku || "",
                            unit: item.unit || "pcs",
                            note: "",
                            fulfilledQty: 0,
                            quantities: {},
                            selectedComponents: {}
                        };
                        current.quantities[componentName] = Number(item.quantity);
                        current.selectedComponents[componentName] = true;
                        rowMap.set(item.productId, current);
                    });
                });
                setSourceEstimationId(estimation.id || null);
                setComponents(names);
                setActiveComponent(names[0]);
                setRows([...rowMap.values()]);
                toast.info(`Loaded ${rowMap.size} products from the estimation`);
            } catch (error) {
                if (error.response?.status !== 404) toast.error("Could not load the project estimation");
                setSourceEstimationId(null);
                setComponents([GENERAL_COMPONENT]);
                setActiveComponent(GENERAL_COMPONENT);
                setRows([]);
            } finally {
                setLoadingEstimation(false);
            }
        })();
    }, [projectId, routeId]);

    const loadProductPage = async ({ pageToLoad = 0, append = false, searchText = q } = {}) => {
        append ? setLoadingMoreProducts(true) : setLoadingProducts(true);
        try {
            const result = await searchProducts(searchText, pageToLoad);
            const content = result.content || [];
            setSearchData(previous => ({
                ...result,
                content: append ? [...(previous.content || []), ...content] : content
            }));
            setProductPage(pageToLoad);
            setHasMoreProducts(pageToLoad + 1 < (result.totalPages || 1));
        } catch {
            toast.error("Failed to search products");
        } finally {
            append ? setLoadingMoreProducts(false) : setLoadingProducts(false);
        }
    };

    useEffect(() => {
        loadProductPage({ pageToLoad: 0, append: false, searchText: "" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeRows = useMemo(
        () => rows.filter(row => Object.prototype.hasOwnProperty.call(row.quantities, activeComponent)),
        [rows, activeComponent]
    );
    const selectedLineCount = useMemo(
        () => rows.reduce((total, row) => total + components.filter(component =>
            row.selectedComponents[component] && Number(row.quantities[component] || 0) > 0).length, 0),
        [rows, components]
    );
    const selectedProductCount = useMemo(
        () => rows.filter(row => components.some(component =>
            row.selectedComponents[component] && Number(row.quantities[component] || 0) > 0)).length,
        [rows, components]
    );

    const componentSelectedCount = (componentName) => rows.filter(row =>
        row.selectedComponents[componentName] && Number(row.quantities[componentName] || 0) > 0).length;

    const addProduct = (product) => {
        setRows(previous => {
            const existingIndex = previous.findIndex(row => row.productId === product.id);
            if (existingIndex >= 0) {
                const next = [...previous];
                next[existingIndex] = {
                    ...next[existingIndex],
                    quantities: { ...next[existingIndex].quantities, [activeComponent]: next[existingIndex].quantities[activeComponent] || 1 },
                    selectedComponents: { ...next[existingIndex].selectedComponents, [activeComponent]: true }
                };
                return next;
            }
            return [...previous, {
                ...emptyProductRow(product),
                quantities: { [activeComponent]: 1 },
                selectedComponents: { [activeComponent]: true }
            }];
        });
    };

    const updateRow = (productId, update) =>
        setRows(previous => previous.map(row => row.productId === productId ? update(row) : row));

    const setComponentQuantity = (productId, value) => updateRow(productId, row => ({
        ...row,
        quantities: { ...row.quantities, [activeComponent]: value }
    }));

    const toggleComponentSelection = (productId, checked) => updateRow(productId, row => ({
        ...row,
        selectedComponents: { ...row.selectedComponents, [activeComponent]: checked }
    }));

    const removeFromComponent = (productId) => setRows(previous => previous.flatMap(row => {
        if (row.productId !== productId) return [row];
        const quantities = { ...row.quantities };
        const selectedComponents = { ...row.selectedComponents };
        delete quantities[activeComponent];
        delete selectedComponents[activeComponent];
        return Object.keys(quantities).length ? [{ ...row, quantities, selectedComponents }] : [];
    }));

    const buildItems = () => rows.flatMap(row => {
        const componentAllocations = components
            .filter(component => row.selectedComponents[component] && Number(row.quantities[component] || 0) > 0)
            .map(component => ({ componentName: component, quantity: Number(row.quantities[component]) }));
        if (!componentAllocations.length) return [];
        return [{
            productId: row.productId,
            unit: row.unit,
            note: row.note || "",
            componentAllocations
        }];
    });

    const buildPayload = () => ({
        departmentId: departmentId || null,
        projectId: projectId || null,
        sourceEstimationId,
        comment,
        items: buildItems(),
        status: "DRAFT"
    });

    const validateTarget = () => {
        setValidated(true);
        if (!departmentId && !projectId) {
            toast.warn("Please select a department or project");
            return false;
        }
        return true;
    };

    const saveDraft = async ({ quiet = false } = {}) => {
        if (!validateTarget()) return null;
        setIsSaving(true);
        try {
            const response = routeId
                ? await api.put(`/item-requests/${routeId}`, buildPayload())
                : await api.post("/item-requests", buildPayload());
            setRouteId(response.data.id);
            setStatus(response.data.status);
            if (!quiet) toast.success(`Draft saved (${response.data.irNumber})`);
            return response.data;
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to save draft");
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const submitRequest = async () => {
        if (!validateTarget()) return;
        if (!buildItems().length) {
            toast.warn("Select at least one product with a quantity");
            return;
        }
        setIsSubmitting(true);
        try {
            const draft = await saveDraft({ quiet: true });
            if (!draft) return;
            const response = await api.post(`/item-requests/${draft.id}/submit`);
            setStatus(response.data.status);
            toast.success(`Item Request submitted (${response.data.irNumber})`);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to submit request");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingRequest) {
        return <div className="d-flex justify-content-center py-5"><Spinner animation="border" /></div>;
    }

    return (
        <Container fluid style={{ width: "100%", maxWidth: 1180, paddingTop: 24, paddingBottom: 40 }}>
            <div className="bg-white shadow-sm rounded border p-4">
                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                        <Button variant="light" onClick={() => navigate(-1)} title="Go back">
                            <ArrowLeft size={20} />
                        </Button>
                        <div>
                            <div className="d-flex align-items-center gap-2">
                                <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>
                                    {status === "DRAFT" ? "Prepare Item Request" : "Item Request"}
                                </h2>
                                {status && <Badge bg={status === "DRAFT" ? "secondary" : "primary"}>{status}</Badge>}
                            </div>
                            <div className="text-muted small mt-1">
                                Select products component by component, save the draft, then submit when ready.
                            </div>
                        </div>
                    </div>
                    <div className="text-end">
                        <div className="fw-semibold">{selectedProductCount} products selected</div>
                        <div className="small text-muted">{selectedLineCount} component allocations</div>
                    </div>
                </div>

                <Form noValidate validated={validated} className="mt-4">
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Department</Form.Label>
                                <SafeSelect value={departmentId} onChange={event => setDepartmentId(event.target.value)}
                                    disabled={!isEditable || Boolean(urlProjectId)}>
                                    <option value="">Select Department</option>
                                    {departments.map(department => (
                                        <option key={department.id} value={department.id}>{department.name}</option>
                                    ))}
                                </SafeSelect>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Project</Form.Label>
                                <SafeSelect value={projectId} onChange={event => setProjectId(event.target.value)}
                                    disabled={!isEditable || Boolean(urlProjectId)}>
                                    <option value="">Select Project</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.projectName || project.name || project.id}
                                        </option>
                                    ))}
                                </SafeSelect>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mt-3">
                        <Form.Label>Comment</Form.Label>
                        <Form.Control as="textarea" rows={2} value={comment}
                            onChange={event => setComment(event.target.value)} disabled={!isEditable} />
                    </Form.Group>

                    {loadingEstimation && (
                        <Alert variant="light" className="border mt-4 mb-0">
                            <Spinner animation="border" size="sm" className="me-2" />
                            Loading products from the project estimation...
                        </Alert>
                    )}
                    {sourceEstimationId && (
                        <Alert variant="success" className="d-flex align-items-center gap-2 mt-4 mb-0 py-2">
                            <CheckCircle2 size={18} />
                            Estimation components are ready. Uncheck anything that should not be requested yet.
                        </Alert>
                    )}

                    <div className="mt-4 border rounded overflow-hidden">
                        <div className="bg-light border-bottom px-3 pt-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h5 className="mb-0">Components</h5>
                                    <div className="small text-muted">Each tab keeps its own product selection and quantity.</div>
                                </div>
                            </div>
                            <Nav variant="tabs" activeKey={activeComponent}>
                                {components.map(component => (
                                    <Nav.Item key={component}>
                                        <Nav.Link eventKey={component} onClick={() => setActiveComponent(component)}>
                                            {component} <Badge bg="light" text="dark">{componentSelectedCount(component)}</Badge>
                                        </Nav.Link>
                                    </Nav.Item>
                                ))}
                            </Nav>
                        </div>

                        <div className="p-3">
                            {isEditable && (
                                <>
                                    <div className="d-flex gap-2 mb-2">
                                        <Form.Control placeholder={`Search products for ${activeComponent}`}
                                            value={q} onChange={event => setQ(event.target.value)}
                                            onKeyDown={event => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    loadProductPage({ pageToLoad: 0, searchText: q });
                                                }
                                            }} />
                                        <Button variant="outline-secondary"
                                            onClick={() => loadProductPage({ pageToLoad: 0, searchText: q })}
                                            disabled={loadingProducts}>
                                            {loadingProducts && <Spinner animation="border" size="sm" className="me-2" />}
                                            Search
                                        </Button>
                                    </div>
                                    <div className="border rounded mb-4" style={{ maxHeight: 210, overflowY: "auto" }}
                                        onScroll={event => {
                                            const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
                                            if (scrollHeight - scrollTop - clientHeight < 48 && hasMoreProducts && !loadingMoreProducts) {
                                                loadProductPage({ pageToLoad: productPage + 1, append: true, searchText: q });
                                            }
                                        }}>
                                        <Table size="sm" hover className="mb-0 align-middle">
                                            <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                                                <tr><th>Product</th><th>SKU</th><th>Unit</th><th></th></tr>
                                            </thead>
                                            <tbody>
                                                {(searchData.content || []).map(product => (
                                                    <tr key={product.id}>
                                                        <td>{product.name}</td>
                                                        <td>{product.sku}</td>
                                                        <td>{product.unit || "pcs"}</td>
                                                        <td className="text-end">
                                                            <Button size="sm" variant="outline-primary" onClick={() => addProduct(product)}>
                                                                <PackagePlus size={15} className="me-1" /> Add
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {loadingMoreProducts && <tr><td colSpan="4" className="text-center py-2"><Spinner size="sm" /></td></tr>}
                                            </tbody>
                                        </Table>
                                    </div>
                                </>
                            )}

                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5 className="mb-0">{activeComponent} Items</h5>
                                <Badge bg="light" text="dark">{componentSelectedCount(activeComponent)} selected</Badge>
                            </div>
                            <Table hover responsive className="align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: 54 }}>Use</th>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th>Unit</th>
                                        <th style={{ width: 170 }}>Quantity</th>
                                        <th>Note</th>
                                        {status !== "DRAFT" && <th>Fulfilled</th>}
                                        <th style={{ width: 80 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeRows.map(row => (
                                        <tr key={`${activeComponent}-${row.productId}`}
                                            className={!row.selectedComponents[activeComponent] ? "opacity-50" : ""}>
                                            <td>
                                                <Form.Check checked={Boolean(row.selectedComponents[activeComponent])}
                                                    onChange={event => toggleComponentSelection(row.productId, event.target.checked)}
                                                    disabled={!isEditable} aria-label={`Select ${row.name}`} />
                                            </td>
                                            <td className="fw-semibold">{row.name}</td>
                                            <td>{row.sku || "-"}</td>
                                            <td>{row.unit}</td>
                                            <td>
                                                <InputGroup>
                                                    <Form.Control type="number" min="0"
                                                        value={row.quantities[activeComponent] ?? ""}
                                                        onChange={event => setComponentQuantity(row.productId, event.target.value)}
                                                        disabled={!isEditable || !row.selectedComponents[activeComponent]} />
                                                    <InputGroup.Text>{row.unit}</InputGroup.Text>
                                                </InputGroup>
                                            </td>
                                            <td>
                                                <Form.Control value={row.note}
                                                    onChange={event => updateRow(row.productId, current => ({ ...current, note: event.target.value }))}
                                                    disabled={!isEditable} />
                                            </td>
                                            {status !== "DRAFT" && <td>{row.fulfilledQty}</td>}
                                            <td>
                                                {isEditable && (
                                                    <Button size="sm" variant="link" className="text-danger px-0"
                                                        onClick={() => removeFromComponent(row.productId)}>Remove</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {!activeRows.length && (
                                        <tr>
                                            <td colSpan={status !== "DRAFT" ? 8 : 7} className="text-center text-muted py-4">
                                                No products in this component yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </div>

                    {isEditable && (
                        <div className="d-flex justify-content-between align-items-center gap-2 mt-4 flex-wrap">
                            <div className="small text-muted">
                                Saving keeps every component as a draft. Submitting sends only checked products.
                            </div>
                            <div className="d-flex gap-2">
                                <Button variant="outline-primary" onClick={() => saveDraft()} disabled={isSaving || isSubmitting}>
                                    {isSaving ? <Spinner size="sm" animation="border" className="me-2" /> : <FilePenLine size={17} className="me-2" />}
                                    Save Draft
                                </Button>
                                <Button onClick={submitRequest} disabled={isSaving || isSubmitting || selectedProductCount === 0}>
                                    {isSubmitting && <Spinner size="sm" animation="border" className="me-2" />}
                                    Submit Item Request
                                </Button>
                            </div>
                        </div>
                    )}
                </Form>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
