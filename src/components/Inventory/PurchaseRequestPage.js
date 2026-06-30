import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Container, Button, Form, Table, Row, Col, Badge, InputGroup, Modal
} from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";
import logo from "../../assets/logo.jpeg";
import SafeSelect from "../ReusableComponents/SafeSelect";
import { SupplierForm } from "../Supplier/SupplierPage";

/* ================== Inline API helpers ================== */
const qp = (o = {}) => {
    const u = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v));
    return u.toString();
};

const listActiveSuppliers = async () =>
    (await api.get(`/suppliers?${qp({ status: "ACTIVE", page: 0, size: 100, sort: "name,asc" })}`)).data?.content || [];

const listProducts = async (q = "", page = 0, size = 40) =>
    (await api.get(`/products?${qp({ q, status: "ACTIVE", page, size, sort: "name,asc" })}`)).data;

const getSupplier = async (id) => (await api.get(`/suppliers/${id}`)).data;
const getProduct = async (id) => (await api.get(`/products/${id}`)).data;
const updateProduct = async (id, payload) => (await api.put(`/products/${id}`, payload)).data;

/** Preferred (faster): batch summary */
const getInventorySummaryBatch = async (productIds) => {
    try {
        const res = await api.post(`/inventory/summary/batch`, { productIds });
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return null; // fall back to per-product
    }
};

/** Fallback: single summary */
const getInventorySummary = async (productId) =>
    (await api.get(`/inventory/summary?${qp({ productId })}`)).data;

/** Create PR */
const createPR = async (payload) => (await api.post(`/prs`, payload)).data;

/** Fetch PR details */
const getPR = async (id) => (await api.get(`/prs/${id}`)).data;

/** Download server PDF */
const fetchPRPdfBlob = async (id) => {
    const res = await api.get(`/prs/${id}/pdf`, { responseType: "blob" });
    return res.data; // Blob
};

/* ================== Lightweight formatters ================== */
const fmtNum = (v) => (v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString());
const safe = (s) => (s ?? "");

/* ================== Create / Edit Form ================== */
function PRForm({ onSaved }) {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState("");
    const [summaries, setSummaries] = useState({}); // {productId: { totalQty, serialTracked, serialCount }}
    const [rows, setRows] = useState([]); // editable lines: {productId, name, sku, unit, qty, note}
    const [comment, setComment] = useState("");
    const [validated, setValidated] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
    const [itemSearch, setItemSearch] = useState("");
    const [productPage, setProductPage] = useState(0);
    const [hasMoreProducts, setHasMoreProducts] = useState(false);
    const [showSupplierAssistModal, setShowSupplierAssistModal] = useState(false);
    const [supplierAssistLoading, setSupplierAssistLoading] = useState(false);
    const [commonSuppliers, setCommonSuppliers] = useState([]);
    const [selectedProductsForSupplier, setSelectedProductsForSupplier] = useState([]);
    const [showQuickSupplierCreate, setShowQuickSupplierCreate] = useState(false);
    const productRequestSeq = useRef(0);
    const hasMountedProductSearch = useRef(false);

    useEffect(() => {
        (async () => {
            try {
                setSuppliers(await listActiveSuppliers());
            } catch {
                toast.error("Failed to load suppliers");
            }
        })();
    }, []);

    const mergeProductRows = (list, append) => {
        setRows(prev => {
            const existing = new Map(prev.map(row => [row.productId, row]));
            const nextRows = list.map(p => ({
                productId: p.id,
                name: p.name,
                sku: p.sku,
                unit: p.unit || "pcs",
                qty: existing.get(p.id)?.qty || "",
                note: existing.get(p.id)?.note || "",
            }));
            if (append) return [...prev, ...nextRows.filter(row => !existing.has(row.productId))];
            const selectedRows = prev.filter(row =>
                Number(row.qty) > 0 && !nextRows.some(next => next.productId === row.productId)
            );
            return [...selectedRows, ...nextRows];
        });
    };

    const loadProductPage = async ({ pageToLoad = 0, append = false, searchText = itemSearch } = {}) => {
        const requestSeq = ++productRequestSeq.current;
        if (append) setLoadingMoreProducts(true);
        else setLoadingProducts(true);
        try {
            const data = await listProducts(searchText, pageToLoad, 40);
            if (requestSeq !== productRequestSeq.current) return;
            const list = data?.content || [];
            mergeProductRows(list, append);
            setProductPage(pageToLoad);
            setHasMoreProducts(pageToLoad + 1 < (data?.totalPages || 1));

            const ids = list.map(p => p.id);
            if (ids.length) {
                const batch = await getInventorySummaryBatch(ids);
                const map = {};
                if (batch) {
                    batch.forEach(su => { map[su.productId] = su; });
                } else {
                    for (const id of ids) {
                        try { map[id] = await getInventorySummary(id); } catch { /* ignore */ }
                    }
                }
                if (requestSeq !== productRequestSeq.current) return;
                setSummaries(prev => ({ ...prev, ...map }));
            }
        } catch {
            if (requestSeq === productRequestSeq.current) {
                toast.error("Failed to load products");
            }
        } finally {
            if (requestSeq === productRequestSeq.current) {
                if (append) setLoadingMoreProducts(false);
                else setLoadingProducts(false);
            }
        }
    };

    // Products are selected first; supplier choice is assisted from those items.
    useEffect(() => {
        loadProductPage({ pageToLoad: 0, append: false, searchText: "" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasMountedProductSearch.current) {
            hasMountedProductSearch.current = true;
            return;
        }

        const timer = setTimeout(() => {
            setSummaries({});
            setProductPage(0);
            setHasMoreProducts(false);
            loadProductPage({ pageToLoad: 0, append: false, searchText: itemSearch });
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemSearch]);

    const totalLines = useMemo(() => rows.filter(r => Number(r.qty) > 0).length, [rows]);
    const visibleRows = useMemo(() => {
        const term = itemSearch.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter(r =>
            String(r.name || "").toLowerCase().includes(term) ||
            String(r.sku || "").toLowerCase().includes(term)
        );
    }, [rows, itemSearch]);

    const setRow = (i, key, value) => {
        setRows(prev => {
            const copy = [...prev];
            copy[i] = { ...copy[i], [key]: value };
            return copy;
        });
    };

    const handleSearchProducts = () => {
        setSummaries({});
        setProductPage(0);
        setHasMoreProducts(false);
        loadProductPage({ pageToLoad: 0, append: false, searchText: itemSearch });
    };

    const loadMoreProducts = () => {
        if (loadingProducts || loadingMoreProducts || !hasMoreProducts) return;
        loadProductPage({ pageToLoad: productPage + 1, append: true, searchText: itemSearch });
    };

    const handleProductsScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 48) {
            loadMoreProducts();
        }
    };

    const getSelectedRows = () => rows.filter(r => Number(r.qty) > 0);

    const activeSupplierLinks = (product) =>
        (product.suppliers || []).filter(link => link?.supplierId && link.active !== false);

    const openSupplierAssist = async (selectedRows = getSelectedRows()) => {
        if (selectedRows.length === 0) {
            toast.warn("Please enter quantities for at least one product");
            return;
        }

        setShowSupplierAssistModal(true);
        setSupplierAssistLoading(true);
        setShowQuickSupplierCreate(false);
        setCommonSuppliers([]);
        setSelectedProductsForSupplier(selectedRows);

        try {
            const products = await Promise.all(selectedRows.map(async row => {
                const product = await getProduct(row.productId);
                return { ...product, requestedQty: row.qty };
            }));
            setSelectedProductsForSupplier(products);

            const supplierIdSets = products.map(product =>
                new Set(activeSupplierLinks(product).map(link => link.supplierId))
            );
            const commonIds = supplierIdSets.length
                ? [...supplierIdSets[0]].filter(id => supplierIdSets.every(set => set.has(id)))
                : [];
            const candidates = await Promise.all(
                commonIds.map(id => getSupplier(id).catch(() => ({ id, name: id })))
            );
            setCommonSuppliers(candidates);
        } catch {
            toast.error("Failed to check suppliers for the selected items");
            setSelectedProductsForSupplier(selectedRows);
        } finally {
            setSupplierAssistLoading(false);
        }
    };

    const selectAssistedSupplier = (supplier) => {
        setSuppliers(prev => prev.some(item => item.id === supplier.id) ? prev : [...prev, supplier]);
        setSupplierId(supplier.id);
        setShowSupplierAssistModal(false);
    };

    const linkSupplierToSelectedProducts = async (savedSupplier) => {
        if (!savedSupplier?.id) return;

        const results = await Promise.allSettled(selectedProductsForSupplier.map(async selectedProduct => {
            const product = selectedProduct.suppliers ? selectedProduct : await getProduct(selectedProduct.productId);
            const links = product.suppliers || [];
            if (links.some(link => link.supplierId === savedSupplier.id)) return;

            await updateProduct(product.id || selectedProduct.productId, {
                barcode: product.barcode || undefined,
                name: product.name,
                categoryId: product.categoryId || undefined,
                unit: product.unit || undefined,
                status: product.status,
                originalCostPrice: product.originalCostPrice || undefined,
                defaultSellingPrice: product.defaultSellingPrice || undefined,
                reorderLevel: product.reorderLevel,
                suppliers: [
                    ...links,
                    { supplierId: savedSupplier.id, active: true }
                ]
            });
        }));

        if (results.some(result => result.status === "rejected")) {
            throw new Error("Some product supplier links could not be updated");
        }
    };

    const handleQuickSupplierSaved = async (savedSupplier) => {
        try {
            await linkSupplierToSelectedProducts(savedSupplier);
            selectAssistedSupplier(savedSupplier);
            toast.success("Supplier created and linked to the selected items");
        } catch {
            selectAssistedSupplier(savedSupplier);
            toast.warn("Supplier selected, but some item links may need to be updated manually");
        }
    };

    const save = async (e) => {
        e.preventDefault();
        setValidated(true);
        const selectedRows = getSelectedRows();
        const items = selectedRows
            .map(r => ({ productId: r.productId, quantity: Number(r.qty), unit: r.unit || "pcs", note: r.note || "" }));
        if (items.length === 0) {
            toast.warn("Please enter quantities for at least one product");
            return;
        }
        if (!supplierId) {
            await openSupplierAssist(selectedRows);
            return;
        }

        try {
            const payload = { supplierId, comment: comment || "", items };
            const created = await createPR(payload);
            toast.success("Purchase Request created");
            onSaved?.(created.id);
        } catch (err) {
            if (err?.response?.status === 400) toast.error(err.response.data?.message || "Validation failed");
            else toast.error("Failed to create PR");
        }
    };

    return (
        <Container style={{ width: "80vw", maxWidth: 980, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex align-items-center mb-4">
                    <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                    <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Create Purchase Request</h2>
                </div>
                <Form noValidate validated={validated} onSubmit={save} className="mt-3">
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Supplier</Form.Label>
                                <SafeSelect
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    required
                                    isInvalid={validated && !supplierId}
                                >
                                    <option value="">Select later from item suggestions</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </SafeSelect>
                                <Form.Text className="text-muted">
                                    Choose items first and we can suggest suppliers linked to all of them.
                                </Form.Text>
                                <Form.Control.Feedback type="invalid">Select a supplier before saving.</Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Comment</Form.Label>
                                <Form.Control as="textarea" rows={1} value={comment} onChange={(e) => setComment(e.target.value)} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Items ({fmtNum(totalLines)})</h5>
                            <div className="d-flex align-items-center gap-2">
                                {!supplierId && totalLines > 0 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline-primary"
                                        onClick={() => openSupplierAssist()}
                                    >
                                        Find suppliers
                                    </Button>
                                )}
                                {loadingProducts && <Badge bg="info">Loading products...</Badge>}
                            </div>
                        </div>
                        <div className="d-flex gap-2 mb-2">
                            <Form.Control
                                placeholder="Search item names or SKU"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSearchProducts();
                                    }
                                }}
                            />
                            <Button variant="outline-secondary" onClick={handleSearchProducts}>
                                Search
                            </Button>
                        </div>

                        <div className="border rounded" style={{ maxHeight: 360, overflowY: "auto" }} onScroll={handleProductsScroll}>
                            <Table hover responsive size="sm" className="mb-0">
                                <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ minWidth: 180 }}>Product</th>
                                    <th>SKU</th>
                                    <th>Stock</th>
                                    <th>Serial</th>
                                    <th style={{ width: 140 }}>Qty</th>
                                    <th style={{ minWidth: 200 }}>Note</th>
                                </tr>
                                </thead>
                                <tbody>
                                {visibleRows.map((r) => {
                                    const i = rows.findIndex(row => row.productId === r.productId);
                                    const sum = summaries[r.productId] || {};
                                    const serialTracked = !!sum.serialTracked;
                                    return (
                                        <tr key={r.productId}>
                                            <td>{r.name}</td>
                                            <td>{r.sku}</td>
                                            <td>
                                                {fmtNum(sum.totalQty || 0)}{" "}
                                                <span className="text-muted">({safe(r.unit)})</span>
                                            </td>
                                            <td>
                                                {serialTracked ? (
                                                    <Badge bg="secondary">Tracked ({fmtNum(sum.serialCount || 0)})</Badge>
                                                ) : (
                                                    <span className="text-muted">No</span>
                                                )}
                                            </td>
                                            <td>
                                                <InputGroup>
                                                    <Form.Control
                                                        type="number"
                                                        min="0"
                                                        inputMode="numeric"
                                                        value={r.qty}
                                                        onChange={(e) => setRow(i, "qty", e.target.value)}
                                                    />
                                                    <InputGroup.Text>{safe(r.unit)}</InputGroup.Text>
                                                </InputGroup>
                                            </td>
                                            <td>
                                                <Form.Control
                                                    value={r.note}
                                                    onChange={(e) => setRow(i, "note", e.target.value)}
                                                    placeholder="optional"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {loadingProducts && (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted py-3">Loading products...</td>
                                    </tr>
                                )}
                                {!loadingProducts && visibleRows.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted py-3">
                                            No items match your search.
                                        </td>
                                    </tr>
                                )}
                                {loadingMoreProducts && (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted py-2">Loading more...</td>
                                    </tr>
                                )}
                                </tbody>
                            </Table>
                        </div>
                        <div className="small text-muted mt-1">
                            {hasMoreProducts ? `Showing ${rows.length} items. Scroll down to load more.` : `Showing ${rows.length} items.`}
                        </div>
                    </div>

                    <Button type="submit" className="w-100 mt-3">Save Purchase Request</Button>
                </Form>
            </div>

            <Modal
                show={showSupplierAssistModal}
                onHide={() => setShowSupplierAssistModal(false)}
                size="xl"
                centered
                scrollable
            >
                <Modal.Header closeButton>
                    <Modal.Title>Select Supplier for Selected Items</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {!showQuickSupplierCreate ? (
                        <>
                            <div className="border rounded p-3 mb-3 bg-light">
                                <div className="fw-semibold mb-2">Selected items</div>
                                <div className="d-flex flex-wrap gap-2">
                                    {selectedProductsForSupplier.map(product => (
                                        <Badge bg="secondary" key={product.id || product.productId}>
                                            {product.name} x {product.requestedQty || product.qty}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {supplierAssistLoading ? (
                                <div className="text-muted py-4 text-center">Checking item suppliers...</div>
                            ) : commonSuppliers.length > 0 ? (
                                <>
                                    <div className="mb-2 text-muted small">
                                        These suppliers are linked to every selected item.
                                    </div>
                                    <Table hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Supplier</th>
                                                <th>Phone</th>
                                                <th>Email</th>
                                                <th className="text-end"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {commonSuppliers.map(candidate => (
                                                <tr key={candidate.id}>
                                                    <td className="fw-semibold">{candidate.name}</td>
                                                    <td>{candidate.phone || "-"}</td>
                                                    <td>{candidate.email || "-"}</td>
                                                    <td className="text-end">
                                                        <Button size="sm" onClick={() => selectAssistedSupplier(candidate)}>
                                                            Use this supplier
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </>
                            ) : (
                                <div className="alert alert-warning mb-3">
                                    No existing supplier is linked to every selected item. Create a supplier here, or close this window and choose an existing supplier manually.
                                </div>
                            )}

                            <div className="d-flex justify-content-end gap-2">
                                <Button variant="outline-secondary" onClick={() => setShowSupplierAssistModal(false)}>
                                    Choose manually
                                </Button>
                                <Button variant="outline-primary" onClick={() => setShowQuickSupplierCreate(true)}>
                                    Create New Supplier
                                </Button>
                            </div>
                        </>
                    ) : (
                        <SupplierForm
                            id={null}
                            compact
                            startEditing
                            onClose={() => setShowQuickSupplierCreate(false)}
                            onSaved={handleQuickSupplierSaved}
                        />
                    )}
                </Modal.Body>
            </Modal>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

/* ================== View / Print ================== */
function PRView({ id, onBack }) {
    const [pr, setPr] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        (async () => {
            try {
                setPr(await getPR(id));
            } catch {
                toast.error("Failed to load PR");
            }
        })();
    }, [id]);

    const downloadData = async () => {
        try {
            const blob = await fetchPRPdfBlob(id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${pr?.prNumber || "PR"}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error("Failed to download data");
            console.error(err);
        }
    };

    const printHtml = () => {
        if (!printRef.current) return;
        const content = printRef.current.innerHTML;

        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);

        const win = iframe.contentWindow;
        win.document.open();
        win.document.write(`
      <html>
        <head>
          <title>${pr?.prNumber || "Purchase Request"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; }
            .logo { height: 48px; }
            h1 { font-size: 20px; margin: 0 0 4px 0; }
            .meta { color:#555; font-size: 12px; }
            table { width:100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border:1px solid #ccc; padding:8px; font-size: 12px; }
            th { background:#f8f8f8; }
            .footer { margin-top:24px; font-size: 12px; color:#666; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
        win.document.close();

        // Give images a moment to load before triggering print
        setTimeout(() => {
            win.focus();
            win.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };

    if (!pr) return (
        <Container style={{ width: "80vw", maxWidth: 980, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">Loading…</div>
        </Container>
    );

    return (
        <Container style={{ width: "80vw", maxWidth: 980, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 no-print">
                    <h2 style={{ fontSize: "1.5rem" }} className="mb-0">Purchase Request</h2>
                    <div className="d-flex gap-2">
                        <Button variant="outline-secondary" onClick={onBack}>Back</Button>
                        <Button variant="outline-primary" onClick={downloadData}>Download TXT Data</Button>
                        <Button variant="success" onClick={printHtml}>Print PR</Button>
                    </div>
                </div>

                {/* Printable content */}
                <div ref={printRef}>
                    <div className="header">
                        <img src={logo} alt="Maruka" style={{ height: "60px", width: "auto" }} />
                        <div style={{ textAlign: "right" }}>
                            <h1>Purchase Request</h1>
                            <div className="meta">
                                <div><strong>No:</strong> {pr.prNumber}</div>
                                <div><strong>Date:</strong> {new Date(pr.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="meta" style={{ marginBottom: 8 }}>
                        <div><strong>Supplier:</strong> {pr.supplierNameSnapshot || pr.supplierName || "-"}</div>
                        <div><strong>Comment:</strong> {pr.comment || "-"}</div>
                    </div>

                    <table>
                        <thead>
                        <tr>
                            <th style={{ width: "40%" }}>Product</th>
                            <th>SKU</th>
                            <th>Unit</th>
                            <th style={{ textAlign: "right" }}>Qty</th>
                            <th>Note</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(pr.items || []).map((it, idx) => (
                            <tr key={idx}>
                                <td>{it.productNameSnapshot || it.productName || "-"}</td>
                                <td>{it.sku || "-"}</td>
                                <td>{it.unit || "pcs"}</td>
                                <td style={{ textAlign: "right" }}>{fmtNum(it.requestedQty ?? it.quantity)}</td>
                                <td>{it.note || "-"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    <div className="footer">
                        <div><strong>Prepared by:</strong> {pr.createdBy || "—"}</div>
                        <div>© Maruka — Generated by MarukaERP</div>
                    </div>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

/* ================== Page Switch ================== */
export default function PurchaseRequestPage() {
    const [mode, setMode] = useState("form"); // "form" | "view"
    const [prId, setPrId] = useState(null);

    return mode === "form"
        ? <PRForm onSaved={(id) => { setPrId(id); setMode("view"); }} />
        : <PRView id={prId} onBack={() => { setMode("form"); setPrId(null); }} />;
}
