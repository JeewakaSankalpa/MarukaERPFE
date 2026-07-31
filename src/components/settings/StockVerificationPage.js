import React, { useEffect, useMemo, useState } from "react";
import {
    Badge,
    Button,
    ButtonGroup,
    Col,
    Container,
    Form,
    Modal,
    Pagination,
    Row,
    Spinner,
    Tab,
    Table,
    Tabs
} from "react-bootstrap";
import { ArrowLeft, CheckCircle2, Printer, RefreshCw, Send, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

const PAGE_SIZE = 50;
const RECONCILIATION_TIMEOUT_MS = 300000;

const parseSkus = (text = "") => text
    .split(/[\r\n,;\t]+/)
    .map(value => value.trim())
    .filter(Boolean);

const splitCsvLine = (line) => {
    const result = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
            quoted = !quoted;
        } else if (char === "," && !quoted) {
            result.push(current.trim().replace(/^"|"$/g, ""));
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ""));
    return result;
};

const parsePhysicalUpload = (text = "") => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) return { rows: [], report: emptyUploadReport() };
    const header = splitCsvLine(lines[0]).map(value => value.trim().toLowerCase());
    const hasHeader = header.some(value => ["sku", "quantity", "qty", "unitcost", "unit cost", "price", "cost", "rate", "reorderlevel", "reorder level", "reorder", "supplier"].includes(value));
    const start = hasHeader ? 1 : 0;
    const columns = hasHeader ? header : ["sku", "quantity", "unitcost", "productname", "reorderlevel", "supplier", "minorderqty"];
    const find = (...names) => names.map(name => columns.indexOf(name)).find(index => index >= 0);
    const skuIndex = find("sku", "item code", "itemcode", "code");
    const qtyIndex = find("quantity", "qty", "stock", "physical qty", "physical quantity");
    const costIndex = find("unitcost", "unit cost", "item rate", "rate", "price", "cost", "unit price");
    const nameIndex = find("productname", "product name", "name", "item", "description", "item description");
    const reorderIndex = find("reorderlevel", "reorder level", "reorder", "reorder qty", "reorder quantity", "minimum stock", "min stock", "minimum order level", "min order level");
    const supplierIndex = find("supplier", "supplier name", "vendor");
    const minOrderQtyIndex = find("minorderqty", "min order qty", "minimum order qty", "minimum order quantity", "moq");
    const report = emptyUploadReport();

    const rows = lines.slice(start).map((line, index) => {
        const rowNumber = start + index + 1;
        const cells = splitCsvLine(line);
        const sku = cells[skuIndex ?? 0]?.trim();
        if (!sku) {
            report.ignoredNoSku.push({ rowNumber, productName: nameIndex == null ? "" : cells[nameIndex] || "" });
            return null;
        }
        const productName = nameIndex == null ? "" : String(cells[nameIndex] || "").trim();
        const quantityRaw = qtyIndex == null ? "" : String(cells[qtyIndex] ?? "").trim();
        const unitCostRaw = costIndex == null ? "" : String(cells[costIndex] ?? "").trim();
        const reorderRaw = reorderIndex == null ? "" : String(cells[reorderIndex] ?? "").trim();
        const supplierName = supplierIndex == null ? "" : String(cells[supplierIndex] || "").trim();
        const minOrderQtyRaw = minOrderQtyIndex == null ? "" : String(cells[minOrderQtyIndex] ?? "").trim();
        const quantity = Number(quantityRaw.replace(/,/g, ""));
        const unitCost = Number(unitCostRaw.replace(/,/g, ""));
        const reorderLevel = Number(reorderRaw.replace(/,/g, ""));
        const minOrderQty = Number(minOrderQtyRaw.replace(/,/g, ""));
        const item = { rowNumber, sku, productName };

        if (!productName) report.missingDescription.push(item);
        if (!quantityRaw) report.missingQuantity.push(item);
        if (!unitCostRaw) report.missingRate.push(item);
        if (!supplierName) report.missingSupplier.push(item);
        if (!reorderRaw) report.missingMinimumOrderLevel.push(item);
        if (!minOrderQtyRaw) report.missingMinimumOrderQty.push(item);

        return {
            sku,
            productName,
            quantity: Number.isFinite(quantity) ? quantity : 0,
            unitCost: Number.isFinite(unitCost) ? unitCost : 0,
            reorderLevel: Number.isFinite(reorderLevel) ? reorderLevel : 0,
            supplierName,
            minOrderQty: Number.isFinite(minOrderQty) ? minOrderQty : 0,
        };
    }).filter(Boolean);

    report.uploadedRowCount = rows.length;
    report.uniqueSkuCount = new Set(rows.map(row => String(row.sku).toUpperCase())).size;
    return { rows, report };
};

const emptyUploadReport = () => ({
    uploadedRowCount: 0,
    uniqueSkuCount: 0,
    ignoredNoSku: [],
    missingDescription: [],
    missingQuantity: [],
    missingRate: [],
    missingSupplier: [],
    missingMinimumOrderLevel: [],
    missingMinimumOrderQty: [],
});

const formatDate = (value) => {
    if (!value) return "-";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
};

const formatNumber = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num.toLocaleString() : "0";
};

const formatMoney = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num)
        ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "0.00";
};

const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    return fallback;
};

const statusBadge = (status) => {
    const variant = {
        ACTIVE: "success",
        MATCHED: "success",
        QUANTITY_MISMATCH: "warning",
        COST_MISMATCH: "info",
        QTY_AND_COST_MISMATCH: "danger",
        REORDER_MISMATCH: "warning",
        MISSING_FROM_UPLOAD: "secondary",
        UPLOADED_ONLY: "dark",
        DUPLICATE_UPLOADED_SKU: "danger",
        UNRESOLVED: "warning",
        SENT_TO_APPROVAL: "primary",
        RESOLVED: "success",
    }[status] || "secondary";
    return <Badge bg={variant} text={variant === "warning" || variant === "info" ? "dark" : "white"}>{status || "-"}</Badge>;
};

const sourceLabel = (source) => ({
    UPLOADED: "Use uploaded",
    SYSTEM: "Use system",
    IGNORE: "Ignore",
    MANUAL: "Manual",
}[source] || source || "-");

const latestResolution = (row) => {
    const history = row?.resolutionHistory || [];
    return history.length ? history[history.length - 1] : null;
};

function SummaryBox({ label, value, tone }) {
    return (
        <div className="summary-box">
            <div className="label">{label}</div>
            <div className={`value ${tone || ""}`}>{value}</div>
        </div>
    );
}

function UploadIssueTable({ title, rows, note }) {
    return (
        <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <div className="fw-semibold">{title}</div>
                <Badge bg={rows?.length ? "warning" : "success"} text={rows?.length ? "dark" : "white"}>{rows?.length || 0}</Badge>
            </div>
            {note && <div className="text-muted small mb-2">{note}</div>}
            {rows?.length ? (
                <div className="border rounded" style={{ maxHeight: 180, overflow: "auto" }}>
                    <Table size="sm" hover className="mb-0">
                        <thead className="table-light sticky-top" style={{ top: 0 }}>
                            <tr><th>CSV Row</th><th>SKU</th><th>Uploaded Description</th></tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={`${title}-${row.rowNumber}-${row.sku || "no-sku"}`}>
                                    <td>{row.rowNumber}</td>
                                    <td><code>{row.sku || "-"}</code></td>
                                    <td>{row.productName || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            ) : <div className="text-muted small">No rows in this section.</div>}
        </div>
    );
}

function DifferenceTable({ title, rows, columns }) {
    return (
        <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <div className="fw-semibold">{title}</div>
                <Badge bg={rows?.length ? "info" : "success"} text={rows?.length ? "dark" : "white"}>{rows?.length || 0}</Badge>
            </div>
            {rows?.length ? (
                <div className="border rounded" style={{ maxHeight: 220, overflow: "auto" }}>
                    <Table size="sm" hover className="mb-0">
                        <thead className="table-light sticky-top" style={{ top: 0 }}>
                            <tr>
                                <th>SKU</th>
                                <th>Product</th>
                                {columns.map(col => <th key={col.label} className="text-end">{col.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={`${title}-${row.rowId || row.sku}`}>
                                    <td><code>{row.sku || "-"}</code></td>
                                    <td>{row.productName || "Unknown product"}</td>
                                    {columns.map(col => <td key={col.label} className="text-end">{col.render(row)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            ) : <div className="text-muted small">No rows in this section.</div>}
        </div>
    );
}

function ProductRows({ rows, onToggleStatus, actionBusy, showStockValues = false }) {
    return (
        <Table responsive hover size="sm" className="align-middle">
            <thead className="table-light">
                <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Unit</th>
                    {showStockValues && <th className="text-end">Stock Qty</th>}
                    {showStockValues && <th className="text-end">Unit Cost</th>}
                    {showStockValues && <th className="text-end">Total Value</th>}
                    <th>Status</th>
                    <th className="text-end print-hidden">Action</th>
                </tr>
            </thead>
            <tbody>
                {(rows || []).map(row => {
                    const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                    return (
                        <tr key={row.productId || row.sku}>
                            <td><code>{row.sku || "-"}</code></td>
                            <td>{row.name || "-"}</td>
                            <td>{row.unit || "-"}</td>
                            {showStockValues && <td className="text-end fw-semibold">{formatNumber(row.stockQty)}</td>}
                            {showStockValues && <td className="text-end">{formatMoney(row.unitCost)}</td>}
                            {showStockValues && <td className="text-end fw-semibold">{formatMoney(row.stockValue)}</td>}
                            <td>{statusBadge(row.status)}</td>
                            <td className="text-end print-hidden">
                                <Button
                                    size="sm"
                                    variant={row.status === "ACTIVE" ? "outline-danger" : "outline-success"}
                                    disabled={actionBusy === row.productId}
                                    onClick={() => onToggleStatus(row, nextStatus)}
                                >
                                    {actionBusy === row.productId ? <Spinner size="sm" className="me-1" /> : null}
                                    {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                </Button>
                            </td>
                        </tr>
                    );
                })}
                {(!rows || rows.length === 0) && (
                    <tr><td colSpan={showStockValues ? "8" : "5"} className="text-center text-muted py-4">No products in this section.</td></tr>
                )}
            </tbody>
        </Table>
    );
}

function SkuVerificationTab() {
    const [title, setTitle] = useState("");
    const [skuText, setSkuText] = useState("");
    const [creating, setCreating] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedRun, setSelectedRun] = useState(null);
    const [selectedLoading, setSelectedLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("missing");
    const [actionBusy, setActionBusy] = useState(null);

    const parsedSkus = useMemo(() => parseSkus(skuText), [skuText]);
    const uniqueSkuCount = useMemo(() => new Set(parsedSkus.map(s => s.toUpperCase())).size, [parsedSkus]);
    const missingProductsWithStock = useMemo(() => (
        (selectedRun?.missingFromUploadedProducts || []).filter(row => Number(row.stockQty || 0) > 0).length
    ), [selectedRun]);

    const loadRun = async (id) => {
        if (!id) return;
        setSelectedLoading(true);
        try {
            const res = await api.get(`/stock-verifications/${id}`);
            setSelectedRun(res.data);
            setActiveTab("missing");
        } catch {
            toast.error("Failed to load verification report");
        } finally {
            setSelectedLoading(false);
        }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get("/stock-verifications", { params: { page: 0, size: 12 } });
            const rows = res.data?.content || [];
            setHistory(rows);
            if (!selectedRun && rows.length) {
                await loadRun(rows[0].id);
            }
        } catch {
            toast.error("Failed to load verification history");
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        setSkuText(text);
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
        event.target.value = "";
    };

    const createRun = async () => {
        if (!parsedSkus.length) {
            toast.warn("Paste or upload at least one SKU first");
            return;
        }
        setCreating(true);
        try {
            const res = await api.post("/stock-verifications", { title: title || undefined, skus: parsedSkus });
            setSelectedRun(res.data);
            setSkuText("");
            setTitle("");
            toast.success("Stock verification completed");
            await loadHistory();
        } catch (err) {
            toast.error(getErrorMessage(err, "Stock verification failed"));
        } finally {
            setCreating(false);
        }
    };

    const updateSnapshotStatus = (productId, status) => {
        const updateRows = rows => (rows || []).map(row => row.productId === productId ? { ...row, status } : row);
        setSelectedRun(run => run ? {
            ...run,
            matchedProducts: updateRows(run.matchedProducts),
            missingFromUploadedProducts: updateRows(run.missingFromUploadedProducts),
        } : run);
    };

    const toggleProductStatus = async (row, status) => {
        if (!row.productId) return;
        setActionBusy(row.productId);
        try {
            await api.patch(`/products/${row.productId}/status`, { status });
            updateSnapshotStatus(row.productId, status);
            toast.success(`Product ${status === "ACTIVE" ? "activated" : "deactivated"}`);
        } catch {
            toast.error("Failed to update product status");
        } finally {
            setActionBusy(null);
        }
    };

    return (
        <Row className="g-3">
            <Col lg={4} className="print-hidden">
                <div className="bg-white border rounded p-3 mb-3">
                    <h5 className="mb-3">New SKU check</h5>
                    <Form.Group className="mb-3">
                        <Form.Label>Report title</Form.Label>
                        <Form.Control value={title} onChange={e => setTitle(e.target.value)} placeholder="Example: July SKU check" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Upload SKU file</Form.Label>
                        <Form.Control type="file" accept=".csv,.txt" onChange={handleFile} />
                    </Form.Group>
                    <div className="text-center text-muted small mb-2">or paste SKUs</div>
                    <Form.Control as="textarea" rows={9} value={skuText} onChange={e => setSkuText(e.target.value)} placeholder={"SKU001\nSKU002\nSKU003"} />
                    <div className="d-flex justify-content-between text-muted small my-3">
                        <span>{parsedSkus.length} uploaded rows</span>
                        <span>{uniqueSkuCount} unique SKUs</span>
                    </div>
                    <Button className="w-100" onClick={createRun} disabled={creating || !parsedSkus.length}>
                        {creating ? <Spinner size="sm" className="me-1" /> : <Upload size={16} className="me-1" />}
                        Run Verification
                    </Button>
                </div>

                <div className="bg-white border rounded p-3">
                    <h5 className="mb-3">History</h5>
                    {historyLoading ? <div className="text-center py-4"><Spinner /></div> : (
                        <div className="d-grid gap-2">
                            {history.map(item => (
                                <Button key={item.id} variant={selectedRun?.id === item.id ? "primary" : "outline-secondary"} className="text-start" onClick={() => loadRun(item.id)}>
                                    <div className="fw-semibold text-truncate">{item.title || item.id}</div>
                                    <div className={selectedRun?.id === item.id ? "small text-white-50" : "small text-muted"}>
                                        {formatDate(item.createdAt)} | Missing {item.missingFromUploadedCount}
                                    </div>
                                </Button>
                            ))}
                            {!history.length && <div className="text-muted small">No checks completed yet.</div>}
                        </div>
                    )}
                </div>
            </Col>

            <Col lg={8}>
                <div className="print-area bg-white border rounded p-3">
                    {selectedLoading ? <div className="text-center py-5"><Spinner /></div> : selectedRun ? (
                        <>
                            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                <div>
                                    <h4 className="mb-1">{selectedRun.title || "Stock verification report"}</h4>
                                    <div className="text-muted small">Completed {formatDate(selectedRun.createdAt)} by {selectedRun.createdBy || "system"}</div>
                                </div>
                                <Button variant="outline-primary" className="print-hidden" onClick={() => window.print()}>
                                    <Printer size={16} className="me-1" /> Print
                                </Button>
                            </div>
                            <Row className="g-2 mb-3">
                                <Col sm={6} xl={3}><SummaryBox label="System products" value={selectedRun.systemProductCount || 0} /></Col>
                                <Col sm={6} xl={3}><SummaryBox label="Matched SKUs" value={selectedRun.matchedCount || 0} tone="text-success" /></Col>
                                <Col sm={6} xl={3}><SummaryBox label="In system, not uploaded" value={selectedRun.missingFromUploadedCount || 0} tone="text-danger" /></Col>
                                <Col sm={6} xl={3}><SummaryBox label="Uploaded, not in system" value={selectedRun.unknownUploadedSkuCount || 0} tone="text-warning" /></Col>
                            </Row>
                            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3 print-hidden">
                                <Tab eventKey="missing" title={`Not uploaded (${missingProductsWithStock} with stock)`} />
                                <Tab eventKey="matched" title={`Matched (${selectedRun.matchedCount || 0})`} />
                                <Tab eventKey="unknown" title={`Unknown uploaded SKUs (${selectedRun.unknownUploadedSkuCount || 0})`} />
                            </Tabs>
                            {activeTab === "missing" && <ProductRows rows={selectedRun.missingFromUploadedProducts || []} onToggleStatus={toggleProductStatus} actionBusy={actionBusy} showStockValues />}
                            {activeTab === "matched" && <ProductRows rows={selectedRun.matchedProducts || []} onToggleStatus={toggleProductStatus} actionBusy={actionBusy} />}
                            {activeTab === "unknown" && (
                                <Table responsive hover size="sm">
                                    <thead className="table-light"><tr><th>Uploaded SKU not found in system</th></tr></thead>
                                    <tbody>
                                        {(selectedRun.unknownUploadedSkus || []).map(sku => <tr key={sku}><td><code>{sku}</code></td></tr>)}
                                        {(!selectedRun.unknownUploadedSkus || selectedRun.unknownUploadedSkus.length === 0) && <tr><td className="text-center text-muted py-4">No unknown uploaded SKUs.</td></tr>}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    ) : <div className="text-center text-muted py-5">Run a stock verification check to see the report.</div>}
                </div>
            </Col>
        </Row>
    );
}

function ReconciliationTab() {
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [uploadText, setUploadText] = useState("");
    const [creating, setCreating] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedRun, setSelectedRun] = useState(null);
    const [rows, setRows] = useState([]);
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [rowsLoading, setRowsLoading] = useState(false);
    const [filter, setFilter] = useState("UNRESOLVED");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const [selected, setSelected] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [uploadReportsByRun, setUploadReportsByRun] = useState({});
    const [reportOpen, setReportOpen] = useState(false);
    const [reportRows, setReportRows] = useState([]);
    const [reportDuplicateGroups, setReportDuplicateGroups] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);

    const parsedUpload = useMemo(() => parsePhysicalUpload(uploadText), [uploadText]);
    const parsedRows = parsedUpload.rows;
    const uploadReport = parsedUpload.report;
    const selectedUploadReport = selectedRun?.id ? uploadReportsByRun[selectedRun.id] : null;

    const quickCreateProduct = (row) => {
        const params = new URLSearchParams();
        if (row.sku) params.set("sku", row.sku);
        if (row.productName) params.set("name", row.productName);
        if (row.uploadedUnitCost != null) params.set("costPrice", row.uploadedUnitCost);
        if (row.uploadedReorderLevel != null) params.set("reorderLevel", row.uploadedReorderLevel);
        navigate(`/product/create?${params.toString()}`);
    };

    const openFullReport = async () => {
        if (!selectedRun?.id) {
            if (parsedRows.length) {
                setReportRows([]);
                setReportDuplicateGroups([]);
                setReportOpen(true);
            }
            return;
        }
        setReportOpen(true);
        setReportLoading(true);
        try {
            const [allRowsRes, duplicateRowsRes] = await Promise.all([
                api.get(`/stock-reconciliations/${selectedRun.id}/rows`, {
                    params: { filter: "ALL", page: 0, size: 10000 },
                    timeout: RECONCILIATION_TIMEOUT_MS,
                }),
                api.get(`/stock-reconciliations/${selectedRun.id}/rows`, {
                    params: { filter: "DUPLICATES", page: 0, size: 10000 },
                    timeout: RECONCILIATION_TIMEOUT_MS,
                }),
            ]);
            setReportRows(allRowsRes.data?.rows || []);
            setReportDuplicateGroups(duplicateRowsRes.data?.duplicateSkuGroups || []);
        } catch (err) {
            toast.error(getErrorMessage(err, "Failed to load full reconciliation report"));
        } finally {
            setReportLoading(false);
        }
    };

    const loadRows = async (runId, nextFilter = filter, nextPage = page) => {
        if (!runId) return;
        setRowsLoading(true);
        try {
            const res = await api.get(`/stock-reconciliations/${runId}/rows`, {
                params: { filter: nextFilter, page: nextPage, size: PAGE_SIZE },
                timeout: RECONCILIATION_TIMEOUT_MS,
            });
            setSelectedRun(res.data.summary);
            setRows(res.data.rows || []);
            setDuplicateGroups(res.data.duplicateSkuGroups || []);
            setTotalPages(res.data.totalPages || 0);
            setTotalRows(res.data.totalElements || 0);
            setSelected({});
        } catch (err) {
            toast.error(getErrorMessage(err, "Failed to load reconciliation rows"));
        } finally {
            setRowsLoading(false);
        }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get("/stock-reconciliations", { params: { page: 0, size: 12 } });
            const items = res.data?.content || [];
            setHistory(items);
            if (!selectedRun && items.length) {
                await loadRows(items[0].id, "UNRESOLVED", 0);
            }
        } catch (err) {
            toast.error(getErrorMessage(err, "Failed to load reconciliation history"));
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        setUploadText(text);
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
        event.target.value = "";
    };

    const createRun = async () => {
        if (!parsedRows.length) {
            toast.warn("Upload or paste rows with at least SKU and quantity");
            return;
        }
        setCreating(true);
        try {
            const res = await api.post("/stock-reconciliations", {
                title: title || undefined,
                rows: parsedRows,
            }, { timeout: RECONCILIATION_TIMEOUT_MS });
            setSelectedRun(res.data);
            setUploadReportsByRun(current => ({ ...current, [res.data.id]: uploadReport }));
            setUploadText("");
            setTitle("");
            setFilter("UNRESOLVED");
            setPage(0);
            toast.success("Physical stock reconciliation created");
            await loadHistory();
            await loadRows(res.data.id, "UNRESOLVED", 0);
        } catch (err) {
            toast.error(getErrorMessage(err, "Failed to create reconciliation"));
        } finally {
            setCreating(false);
        }
    };

    const chooseRun = async (run) => {
        setSelectedRun(run);
        setFilter("UNRESOLVED");
        setPage(0);
        await loadRows(run.id, "UNRESOLVED", 0);
    };

    const updateFilter = async (value) => {
        setFilter(value);
        setPage(0);
        await loadRows(selectedRun?.id, value, 0);
    };

    const updatePage = async (value) => {
        setPage(value);
        await loadRows(selectedRun?.id, filter, value);
    };

    const refreshSelectedRun = async () => {
        await loadHistory();
        if (selectedRun?.id) {
            await loadRows(selectedRun.id, filter, page);
        }
    };

    const toggleRow = (row, checked) => {
        setSelected(current => {
            const next = { ...current };
            if (checked) {
                next[row.rowId] = { rowId: row.rowId, selectedSource: row.matchStatus === "MISSING_FROM_UPLOAD" ? "SYSTEM" : "UPLOADED" };
            } else {
                delete next[row.rowId];
            }
            return next;
        });
    };

    const setSource = (rowId, selectedSource) => {
        setSelected(current => current[rowId] ? {
            ...current,
            [rowId]: { ...current[rowId], selectedSource },
        } : current);
    };

    const selectVisible = () => {
        const next = {};
        rows.filter(row => row.resolutionStatus === "UNRESOLVED").forEach(row => {
            next[row.rowId] = { rowId: row.rowId, selectedSource: row.matchStatus === "MISSING_FROM_UPLOAD" ? "SYSTEM" : "UPLOADED" };
        });
        setSelected(next);
    };

    const applyBulkSource = (selectedSource) => {
        setSelected(current => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, { ...value, selectedSource }])));
    };

    const submitSelected = async () => {
        const resolutions = Object.values(selected);
        if (!resolutions.length) {
            toast.warn("Select at least one unresolved row");
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post(`/stock-reconciliations/${selectedRun.id}/submit`, { resolutions }, { timeout: RECONCILIATION_TIMEOUT_MS });
            toast.success(res.data?.id ? "Selected rows sent to stock audit approval" : "Selected rows resolved");
            await loadHistory();
            await loadRows(selectedRun.id, filter, page);
        } catch (err) {
            toast.error(getErrorMessage(err, "Failed to submit selected rows"));
        } finally {
            setSubmitting(false);
        }
    };

    const submitCurrentFilter = async () => {
        if (!selectedRun?.id) return;
        setSubmitting(true);
        try {
            await api.post(`/stock-reconciliations/${selectedRun.id}/submit-filter`, {
                filter,
                selectedSource: "UPLOADED",
            }, { timeout: RECONCILIATION_TIMEOUT_MS });
            toast.success("Eligible rows in this filter were sent to stock audit approval");
            await loadHistory();
            await loadRows(selectedRun.id, filter, 0);
            setPage(0);
        } catch (err) {
            toast.error(getErrorMessage(err, "Failed to submit current filter"));
        } finally {
            setSubmitting(false);
        }
    };

    const activeUploadReport = selectedUploadReport || uploadReport || emptyUploadReport();
    const quantityDifferences = reportRows.filter(row => row.qtyDifference != null && row.qtyDifference !== 0);
    const costDifferences = reportRows.filter(row => row.uploadedUnitCost != null && Number(row.uploadedUnitCost) !== Number(row.systemUnitCost));
    const reorderDifferences = reportRows.filter(row => row.uploadedReorderLevel != null && row.uploadedReorderLevel !== row.systemReorderLevel);
    const uploadedOnlyRows = reportRows.filter(row => row.matchStatus === "UPLOADED_ONLY");
    const missingFromUploadRows = reportRows.filter(row => row.matchStatus === "MISSING_FROM_UPLOAD");

    return (
        <>
        <Row className="g-3">
            <Col lg={3}>
                <div className="bg-white border rounded p-3 mb-3">
                    <h5 className="mb-3">Physical count upload</h5>
                    <Form.Group className="mb-3">
                        <Form.Label>Report title</Form.Label>
                        <Form.Control value={title} onChange={e => setTitle(e.target.value)} placeholder="Example: July physical count" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Upload CSV</Form.Label>
                        <Form.Control type="file" accept=".csv,.txt" onChange={handleFile} />
                        <Form.Text>Columns: sku, quantity, unitCost/rate, productName, reorderLevel, supplier, minOrderQty</Form.Text>
                    </Form.Group>
                    <Form.Control
                        as="textarea"
                        rows={8}
                        value={uploadText}
                        onChange={e => setUploadText(e.target.value)}
                        placeholder={"sku,quantity,unitCost,productName,reorderLevel,supplier,minOrderQty\nABC001,10,2500,Product A,5,Main Supplier,1"}
                    />
                    <div className="d-flex justify-content-between text-muted small my-3">
                        <span>{parsedRows.length} parsed rows</span>
                        <span>{new Set(parsedRows.map(row => String(row.sku).toUpperCase())).size} unique SKUs</span>
                    </div>
                    {uploadText && (
                        <div className="small border rounded p-2 mb-3 bg-light">
                            <div className="d-flex justify-content-between"><span>Ignored no-SKU rows</span><strong>{uploadReport.ignoredNoSku.length}</strong></div>
                            <div className="d-flex justify-content-between"><span>Missing descriptions</span><strong>{uploadReport.missingDescription.length}</strong></div>
                            <div className="d-flex justify-content-between"><span>Missing quantities set to 0</span><strong>{uploadReport.missingQuantity.length}</strong></div>
                            <div className="d-flex justify-content-between"><span>Missing rates set to 0</span><strong>{uploadReport.missingRate.length}</strong></div>
                            <div className="d-flex justify-content-between"><span>Missing suppliers</span><strong>{uploadReport.missingSupplier.length}</strong></div>
                            <div className="d-flex justify-content-between"><span>Missing minimum levels set to 0</span><strong>{uploadReport.missingMinimumOrderLevel.length}</strong></div>
                            <div className="d-flex justify-content-between"><span>Missing MOQ set to 0</span><strong>{uploadReport.missingMinimumOrderQty.length}</strong></div>
                            <Button size="sm" variant="outline-secondary" className="w-100 mt-2" onClick={openFullReport}>
                                View Upload Report
                            </Button>
                        </div>
                    )}
                    <Button className="w-100" onClick={createRun} disabled={creating || !parsedRows.length}>
                        {creating ? <Spinner size="sm" className="me-1" /> : <Upload size={16} className="me-1" />}
                        Compare Physical Stock
                    </Button>
                </div>

                <div className="bg-white border rounded p-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">History</h5>
                        <Button size="sm" variant="light" onClick={refreshSelectedRun} disabled={historyLoading || rowsLoading}><RefreshCw size={14} /></Button>
                    </div>
                    {historyLoading ? <div className="text-center py-4"><Spinner /></div> : (
                        <div className="d-grid gap-2">
                            {history.map(item => (
                                <Button key={item.id} variant={selectedRun?.id === item.id ? "primary" : "outline-secondary"} className="text-start" onClick={() => chooseRun(item)}>
                                    <div className="fw-semibold text-truncate">{item.title || item.id}</div>
                                    <div className={selectedRun?.id === item.id ? "small text-white-50" : "small text-muted"}>
                                        {formatDate(item.createdAt)} | {item.mismatchCount || 0} differences
                                    </div>
                                </Button>
                            ))}
                            {!history.length && <div className="text-muted small">No reconciliation runs yet.</div>}
                        </div>
                    )}
                </div>
            </Col>

            <Col lg={9}>
                <div className="bg-white border rounded p-3">
                    {selectedRun ? (
                        <>
                            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                <div>
                                    <h4 className="mb-1">{selectedRun.title || "Physical stock reconciliation"}</h4>
                                    <div className="text-muted small">
                                        Created {formatDate(selectedRun.createdAt)} by {selectedRun.createdBy || "system"} | {statusBadge(selectedRun.status)}
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <Button variant="outline-secondary" onClick={openFullReport} disabled={reportLoading}>
                                        {reportLoading ? <Spinner size="sm" className="me-1" /> : null}
                                        Full Report
                                    </Button>
                                    <Button
                                        variant="outline-primary"
                                        disabled={submitting || filter === "DUPLICATES" || filter === "UPLOADED_ONLY" || filter === "MISSING" || filter === "RESOLVED" || filter === "SENT"}
                                        onClick={submitCurrentFilter}
                                    >
                                        {submitting ? <Spinner size="sm" className="me-1" /> : <Send size={16} className="me-1" />}
                                        Send All Eligible in Filter
                                    </Button>
                                    <Button variant="primary" disabled={submitting || !Object.keys(selected).length} onClick={submitSelected}>
                                        {submitting ? <Spinner size="sm" className="me-1" /> : <Send size={16} className="me-1" />}
                                        Send Selected to Approval
                                    </Button>
                                </div>
                            </div>

                            <Row className="g-2 mb-3">
                                <Col md={4} xl={2}><SummaryBox label="System value" value={formatMoney(selectedRun.systemValue)} /></Col>
                                <Col md={4} xl={2}><SummaryBox label="Uploaded value" value={formatMoney(selectedRun.uploadedValue)} tone="text-primary" /></Col>
                                <Col md={4} xl={2}><SummaryBox label="Upload + missing" value={formatMoney(selectedRun.uploadedPlusSystemMissingValue)} /></Col>
                                <Col md={4} xl={2}><SummaryBox label="Difference" value={formatMoney(selectedRun.valueDifference)} tone={Number(selectedRun.valueDifference || 0) < 0 ? "text-danger" : "text-success"} /></Col>
                                <Col md={4} xl={2}><SummaryBox label="System-only" value={formatMoney(selectedRun.systemOnlyValue)} tone="text-danger" /></Col>
                                <Col md={4} xl={2}><SummaryBox label="Duplicate SKUs" value={selectedRun.duplicateUploadedSkuCount || 0} tone="text-danger" /></Col>
                            </Row>

                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                <ButtonGroup size="sm">
                                    {[
                                        ["UNRESOLVED", "Unresolved"],
                                        ["QTY", "Qty"],
                                        ["COST", "Cost"],
                                        ["REORDER", "Reorder"],
                                        ["MISSING", "Missing upload"],
                                        ["UPLOADED_ONLY", "Uploaded only"],
                                        ["DUPLICATES", "Duplicate SKUs"],
                                        ["SENT", "Sent"],
                                        ["RESOLVED", "Resolved"],
                                        ["ALL", "All"],
                                    ].map(([key, label]) => (
                                        <Button key={key} variant={filter === key ? "primary" : "outline-secondary"} onClick={() => updateFilter(key)}>{label}</Button>
                                    ))}
                                </ButtonGroup>
                                <div className="d-flex gap-2">
                                    <Button size="sm" variant="outline-secondary" onClick={selectVisible}>Select visible</Button>
                                    <Button size="sm" variant="outline-primary" onClick={() => applyBulkSource("UPLOADED")}>Use uploaded</Button>
                                    <Button size="sm" variant="outline-dark" onClick={() => applyBulkSource("SYSTEM")}>Use system</Button>
                                </div>
                            </div>

                            {filter === "DUPLICATES" ? (
                                <div className="border rounded" style={{ maxHeight: "62vh", overflow: "auto" }}>
                                    <Table responsive hover size="sm" className="align-middle mb-0 reconciliation-table duplicate-table">
                                        <colgroup>
                                            <col className="duplicate-sku-col" />
                                            <col className="duplicate-system-item-col" />
                                            <col className="duplicate-number-col" />
                                            <col className="duplicate-number-col" />
                                            <col className="duplicate-number-col" />
                                            <col className="duplicate-uploaded-col" />
                                        </colgroup>
                                        <thead className="table-light sticky-top" style={{ top: 0, zIndex: 1 }}>
                                            <tr>
                                                <th>SKU</th>
                                                <th>System item</th>
                                                <th className="text-end">System Qty</th>
                                                <th className="text-end">System Cost</th>
                                                <th className="text-end">System Value</th>
                                                <th>Uploaded rows</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rowsLoading ? (
                                                <tr><td colSpan="6" className="text-center py-5"><Spinner /></td></tr>
                                            ) : duplicateGroups.length ? duplicateGroups.map(group => (
                                                <tr key={group.sku}>
                                                    <td>
                                                        <code>{group.sku}</code>
                                                        <div className="mt-1">{statusBadge("DUPLICATE_UPLOADED_SKU")}</div>
                                                    </td>
                                                    <td className="duplicate-system-item">
                                                        <div className="fw-semibold">{group.productName || "No matching ERP product"}</div>
                                                        <div className="text-muted small">{group.productId || "Fix the SKU or create/map the product first"}</div>
                                                    </td>
                                                    <td className="text-end">{formatNumber(group.systemQty)}</td>
                                                    <td className="text-end">{formatMoney(group.systemUnitCost)}</td>
                                                    <td className="text-end">{formatMoney(group.systemValue)}</td>
                                                    <td>
                                                        <Table size="sm" borderless className="mb-0 nested-reconciliation-table">
                                                            <colgroup>
                                                                <col className="nested-row-col" />
                                                                <col className="nested-product-col" />
                                                                <col className="nested-number-col" />
                                                                <col className="nested-number-col" />
                                                                <col className="nested-number-col" />
                                                            </colgroup>
                                                            <thead>
                                                                <tr className="text-muted">
                                                                    <th>CSV Row</th>
                                                                    <th>Uploaded product</th>
                                                                    <th className="text-end">Qty</th>
                                                                    <th className="text-end">Cost</th>
                                                                    <th className="text-end">Value</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(group.uploadedRows || []).map(row => (
                                                                    <tr key={`${group.sku}-${row.rowNumber}`}>
                                                                        <td>{row.rowNumber}</td>
                                                                        <td className="duplicate-uploaded-product">{row.productName || "-"}</td>
                                                                        <td className="text-end fw-semibold">{formatNumber(row.quantity)}</td>
                                                                        <td className="text-end">{formatMoney(row.unitCost)}</td>
                                                                        <td className="text-end">{formatMoney(row.value)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                        <div className="text-muted small mt-2">
                                                            These rows are not combined or sent to approval. Fix the duplicate SKU in the upload, then run reconciliation again.
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="6" className="text-center text-muted py-5">No duplicate uploaded SKUs.</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            ) : (
                            <div className="border rounded" style={{ maxHeight: "62vh", overflow: "auto" }}>
                                <Table responsive hover size="sm" className="align-middle mb-0 reconciliation-table">
                                    <thead className="table-light sticky-top" style={{ top: 0, zIndex: 1 }}>
                                        <tr>
                                            <th style={{ width: 36 }}></th>
                                            <th>SKU / Product</th>
                                            <th>Status</th>
                                            <th className="text-end">System Qty</th>
                                            <th className="text-end">Uploaded Qty</th>
                                            <th className="text-end">Qty Diff</th>
                                            <th className="text-end">System Cost</th>
                                            <th className="text-end">Uploaded Cost</th>
                                            <th className="text-end">System Value</th>
                                            <th className="text-end">Uploaded Value</th>
                                            <th className="text-end">Reorder</th>
                                            <th>Decision</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rowsLoading ? (
                                            <tr><td colSpan="12" className="text-center py-5"><Spinner /></td></tr>
                                        ) : rows.length ? rows.map(row => {
                                            const rowSelected = selected[row.rowId];
                                            const disabled = row.resolutionStatus !== "UNRESOLVED" || row.matchStatus === "UPLOADED_ONLY";
                                            const lastDecision = latestResolution(row);
                                            return (
                                                <tr key={row.rowId}>
                                                    <td>
                                                        <Form.Check
                                                            checked={!!rowSelected}
                                                            disabled={disabled}
                                                            onChange={e => toggleRow(row, e.target.checked)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div><code>{row.sku || "-"}</code></div>
                                                        <div className="fw-semibold">{row.productName || "Unknown product"}</div>
                                                        {row.matchStatus === "UPLOADED_ONLY" && (
                                                            <div className="mt-2">
                                                                <div className="text-muted small mb-1">Create this product before stock can be adjusted.</div>
                                                                <Button size="sm" variant="outline-primary" onClick={() => quickCreateProduct(row)}>
                                                                    Quick create
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="mb-1">{statusBadge(row.matchStatus)}</div>
                                                        {statusBadge(row.resolutionStatus)}
                                                    </td>
                                                    <td className="text-end">{formatNumber(row.systemQty)}</td>
                                                    <td className="text-end fw-semibold">{row.uploadedQty == null ? "-" : formatNumber(row.uploadedQty)}</td>
                                                    <td className={`text-end ${(row.qtyDifference || 0) < 0 ? "text-danger" : "text-success"}`}>
                                                        {row.qtyDifference == null ? "-" : formatNumber(row.qtyDifference)}
                                                    </td>
                                                    <td className="text-end">{formatMoney(row.systemUnitCost)}</td>
                                                    <td className="text-end fw-semibold">{row.uploadedUnitCost == null ? "-" : formatMoney(row.uploadedUnitCost)}</td>
                                                    <td className="text-end">{formatMoney(row.systemValue)}</td>
                                                    <td className="text-end fw-semibold">{row.uploadedValue == null ? "-" : formatMoney(row.uploadedValue)}</td>
                                                    <td className="text-end">
                                                        <div>{row.systemReorderLevel ?? "-"}</div>
                                                        <div className={row.uploadedReorderLevel != null && row.uploadedReorderLevel !== row.systemReorderLevel ? "fw-semibold text-warning" : "text-muted"}>
                                                            {row.uploadedReorderLevel ?? "-"}
                                                        </div>
                                                    </td>
                                                    <td style={{ minWidth: 142 }}>
                                                        {rowSelected ? (
                                                            <Form.Select size="sm" value={rowSelected.selectedSource} onChange={e => setSource(row.rowId, e.target.value)}>
                                                                <option value="UPLOADED">Use uploaded</option>
                                                                <option value="SYSTEM">Use system</option>
                                                                <option value="IGNORE">Ignore</option>
                                                            </Form.Select>
                                                        ) : disabled ? (
                                                            row.resolutionStatus === "RESOLVED" ? <CheckCircle2 size={18} className="text-success" /> : <span className="text-muted small">Not editable</span>
                                                        ) : <span className="text-muted small">Select row</span>}
                                                        {lastDecision && (
                                                            <div className="decision-history mt-2">
                                                                <div>{sourceLabel(lastDecision.selectedSource)} by {lastDecision.resolvedBy || "system"}</div>
                                                                <div>{formatDate(lastDecision.resolvedAt)}</div>
                                                                {lastDecision.auditId && <div>Audit {lastDecision.auditId}</div>}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="12" className="text-center text-muted py-5">No rows in this filter.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div className="text-muted small">Showing {rows.length} of {totalRows} rows | {Object.keys(selected).length} selected</div>
                                <Pagination size="sm" className="mb-0">
                                    <Pagination.Prev disabled={page <= 0} onClick={() => updatePage(page - 1)} />
                                    <Pagination.Item active>{page + 1} / {Math.max(totalPages, 1)}</Pagination.Item>
                                    <Pagination.Next disabled={page + 1 >= totalPages} onClick={() => updatePage(page + 1)} />
                                </Pagination>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted py-5">Upload a physical count to start reconciliation.</div>
                    )}
                </div>
            </Col>
        </Row>
        <Modal show={reportOpen} onHide={() => setReportOpen(false)} size="xl" centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title>Physical Count Full Report</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row className="g-2 mb-3">
                    <Col md={3}><SummaryBox label="Uploaded rows" value={activeUploadReport.uploadedRowCount || selectedRun?.uploadedRowCount || 0} /></Col>
                    <Col md={3}><SummaryBox label="Unique SKUs" value={activeUploadReport.uniqueSkuCount || selectedRun?.uniqueUploadedSkuCount || 0} /></Col>
                    <Col md={3}><SummaryBox label="Ignored no SKU" value={activeUploadReport.ignoredNoSku?.length || 0} tone="text-danger" /></Col>
                    <Col md={3}><SummaryBox label="Duplicate SKUs" value={reportDuplicateGroups.length || selectedRun?.duplicateUploadedSkuCount || 0} tone="text-danger" /></Col>
                </Row>

                {reportLoading ? (
                    <div className="text-center py-5"><Spinner /></div>
                ) : (
                    <>
                        <h5 className="mb-3">Uploaded File Checks</h5>
                        {!selectedUploadReport && selectedRun?.id && (
                            <div className="text-muted small mb-3">
                                Upload field checks are available for the current upload before this page is refreshed. System differences are loaded from the saved reconciliation.
                            </div>
                        )}
                        <Row className="g-3">
                            <Col lg={6}>
                                <UploadIssueTable title="Missing Item Description" rows={activeUploadReport.missingDescription} note="Allowed. Existing SKUs use the ERP product name; new SKUs need the name filled during quick create." />
                            </Col>
                            <Col lg={6}>
                                <UploadIssueTable title="Missing Quantity" rows={activeUploadReport.missingQuantity} note="Allowed. Quantity is treated as 0." />
                            </Col>
                            <Col lg={6}>
                                <UploadIssueTable title="Missing Item Rate" rows={activeUploadReport.missingRate} note="Allowed. Rate/cost is treated as 0." />
                            </Col>
                            <Col lg={6}>
                                <UploadIssueTable title="Missing Supplier" rows={activeUploadReport.missingSupplier} note="Allowed. Existing product suppliers are kept." />
                            </Col>
                            <Col lg={6}>
                                <UploadIssueTable title="Missing Minimum Order Level" rows={activeUploadReport.missingMinimumOrderLevel} note="Allowed. Reorder level is treated as 0." />
                            </Col>
                            <Col lg={6}>
                                <UploadIssueTable title="Missing Minimum Order Quantity" rows={activeUploadReport.missingMinimumOrderQty} note="Allowed. MOQ is treated as 0 for reporting." />
                            </Col>
                        </Row>

                        <h5 className="mt-3 mb-3">System vs Uploaded Differences</h5>
                        {!selectedRun?.id && (
                            <div className="text-muted small mb-3">Create the reconciliation to see system quantity, cost, reorder, new SKU, missing upload, and duplicate SKU differences.</div>
                        )}
                        <DifferenceTable
                            title="Quantity Differences"
                            rows={quantityDifferences}
                            columns={[
                                { label: "System", render: row => formatNumber(row.systemQty) },
                                { label: "Uploaded", render: row => formatNumber(row.uploadedQty) },
                                { label: "Diff", render: row => formatNumber(row.qtyDifference) },
                            ]}
                        />
                        <DifferenceTable
                            title="Rate / Cost Differences"
                            rows={costDifferences}
                            columns={[
                                { label: "System", render: row => formatMoney(row.systemUnitCost) },
                                { label: "Uploaded", render: row => formatMoney(row.uploadedUnitCost) },
                            ]}
                        />
                        <DifferenceTable
                            title="Minimum Order Level Differences"
                            rows={reorderDifferences}
                            columns={[
                                { label: "System", render: row => row.systemReorderLevel ?? "-" },
                                { label: "Uploaded", render: row => row.uploadedReorderLevel ?? "-" },
                                { label: "Diff", render: row => row.reorderLevelDifference ?? "-" },
                            ]}
                        />
                        <DifferenceTable
                            title="Uploaded Only / New SKUs"
                            rows={uploadedOnlyRows}
                            columns={[
                                { label: "Qty", render: row => formatNumber(row.uploadedQty) },
                                { label: "Rate", render: row => formatMoney(row.uploadedUnitCost) },
                                { label: "Min Level", render: row => row.uploadedReorderLevel ?? "-" },
                            ]}
                        />
                        <DifferenceTable
                            title="System Items Missing From Upload"
                            rows={missingFromUploadRows}
                            columns={[
                                { label: "System Qty", render: row => formatNumber(row.systemQty) },
                                { label: "System Rate", render: row => formatMoney(row.systemUnitCost) },
                                { label: "Value", render: row => formatMoney(row.systemValue) },
                            ]}
                        />

                        <div className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <div className="fw-semibold">Duplicate SKUs</div>
                                <Badge bg={reportDuplicateGroups.length ? "danger" : "success"}>{reportDuplicateGroups.length}</Badge>
                            </div>
                            {reportDuplicateGroups.length ? (
                                <div className="border rounded" style={{ maxHeight: 260, overflow: "auto" }}>
                                    <Table size="sm" hover className="mb-0">
                                        <thead className="table-light sticky-top" style={{ top: 0 }}>
                                            <tr><th>SKU</th><th>System Product</th><th>Uploaded Rows</th></tr>
                                        </thead>
                                        <tbody>
                                            {reportDuplicateGroups.map(group => (
                                                <tr key={group.sku}>
                                                    <td><code>{group.sku}</code></td>
                                                    <td>{group.productName || "No matching ERP product"}</td>
                                                    <td>{(group.uploadedRows || []).map(row => `Row ${row.rowNumber}: qty ${row.quantity ?? 0}, rate ${formatMoney(row.unitCost)}`).join("; ")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            ) : <div className="text-muted small">No duplicate uploaded SKUs.</div>}
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setReportOpen(false)}>Close</Button>
            </Modal.Footer>
        </Modal>
        </>
    );
}

export default function StockVerificationPage() {
    const navigate = useNavigate();

    return (
        <Container fluid className="py-4 stock-verification-page">
            <style>{`
                .stock-verification-page .summary-box {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 12px;
                    background: #fff;
                    min-height: 74px;
                }
                .stock-verification-page .summary-box .label {
                    color: #6b7280;
                    font-size: 12px;
                }
                .stock-verification-page .summary-box .value {
                    font-size: 20px;
                    font-weight: 700;
                    line-height: 1.1;
                    overflow-wrap: anywhere;
                }
                .stock-verification-page .reconciliation-table {
                    table-layout: fixed;
                    min-width: 1280px;
                }
                .stock-verification-page .duplicate-table {
                    min-width: 1520px;
                    table-layout: fixed;
                }
                .stock-verification-page .nested-reconciliation-table {
                    table-layout: fixed;
                    min-width: 560px;
                }
                .stock-verification-page .duplicate-sku-col {
                    width: 170px;
                }
                .stock-verification-page .duplicate-system-item-col {
                    width: 360px;
                }
                .stock-verification-page .duplicate-number-col {
                    width: 130px;
                }
                .stock-verification-page .duplicate-uploaded-col {
                    width: 600px;
                }
                .stock-verification-page .nested-row-col {
                    width: 80px;
                }
                .stock-verification-page .nested-product-col {
                    width: 250px;
                }
                .stock-verification-page .nested-number-col {
                    width: 76px;
                }
                .stock-verification-page .decision-history {
                    color: #6b7280;
                    font-size: 11px;
                    line-height: 1.35;
                    white-space: nowrap;
                }
                .stock-verification-page .reconciliation-table th,
                .stock-verification-page .reconciliation-table td,
                .stock-verification-page .nested-reconciliation-table th,
                .stock-verification-page .nested-reconciliation-table td {
                    vertical-align: middle;
                    overflow-wrap: anywhere;
                    word-break: normal;
                }
                .stock-verification-page .duplicate-table th,
                .stock-verification-page .nested-reconciliation-table th {
                    white-space: nowrap;
                    overflow-wrap: normal;
                }
                .stock-verification-page .duplicate-table td,
                .stock-verification-page .nested-reconciliation-table td {
                    overflow-wrap: normal;
                    word-break: normal;
                }
                .stock-verification-page .duplicate-system-item,
                .stock-verification-page .duplicate-uploaded-product {
                    white-space: normal;
                    overflow-wrap: anywhere;
                }
                .stock-verification-page .reconciliation-table code {
                    white-space: normal;
                    overflow-wrap: anywhere;
                }
                .stock-verification-page .btn-group {
                    flex-wrap: wrap;
                }
                .stock-verification-page .btn {
                    white-space: normal;
                }
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
                    .print-hidden { display: none !important; }
                    .page-content { padding: 0 !important; }
                    table { font-size: 11px; }
                }
            `}</style>
            <div className="d-flex justify-content-between align-items-center mb-3 print-hidden">
                <div className="d-flex align-items-center gap-3">
                    <Button variant="light" onClick={() => navigate(-1)}><ArrowLeft size={18} /></Button>
                    <div>
                        <h3 className="mb-0">Stock Verification</h3>
                        <div className="text-muted small">Verify SKUs, compare physical stock, and send differences to audit approval.</div>
                    </div>
                </div>
            </div>

            <Tabs defaultActiveKey="reconciliation" className="mb-3 print-hidden">
                <Tab eventKey="reconciliation" title="Physical Count Reconciliation">
                    <ReconciliationTab />
                </Tab>
                <Tab eventKey="sku" title="SKU Verification">
                    <SkuVerificationTab />
                </Tab>
            </Tabs>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
