// src/components/Projects/ProjectEstimationPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Button, Form, Table, Badge, Modal, Card, Spinner } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ------------ API helpers ------------ */
const getEstimation = async (projectId) => (await api.get(`/estimations/by-project/${projectId}`)).data;
const listTemplates = async () => (await api.get(`/component-templates`)).data;
const listProductsAPI = async () => (await api.get(`/products`, { params: { page: 0, size: 1000, sort: "name,asc" } })).data?.content ?? [];
const listAvailableAPI = async () => (await api.get(`/inventory/available-quantities`)).data;
const listProjectsAPI = async () => (await api.get(`/projects`, { params: { page: 0, size: 1000, sort: "projectName,asc" } })).data?.content ?? [];
const getAvailOneAPI = async (productId) => (await api.get(`/inventory/available-quantities/${productId}`)).data; // optional
// OPTIONAL fallback for cost if your product doesn’t carry it:
const getLastCostAPI = async (productId) => (await api.get(`/products/${productId}/last-cost`)).data; // {unitCost:number}
// NEW: Fetch employees for approval (Restored for display)
const listEmployeesAPI = async () => (await api.get(`/employee/all`)).data ?? [];

// NEW: Approval Actions
const submitApprovalAPI = async (id, payload) => (await api.post(`/estimations/${id}/submit-approval`, payload)).data;
const approveAPI = async (id, payload) => (await api.post(`/estimations/${id}/approve`, payload)).data;
const rejectAPI = async (id, payload) => (await api.post(`/estimations/${id}/reject`, payload)).data;
const createRevisionAPI = async (id, payload) => (await api.post(`/estimations/${id}/revision`, payload)).data;

export default function ProjectEstimationPage({ projectId: propProjectId }) {
    // const navigate = useNavigate(); // Unused
    const location = useLocation(); // Hook for URL query params
    const searchParams = new URLSearchParams(location.search);
    const forceReadOnly = searchParams.get("readOnly") === "true";

    /* ------------ reference data ------------ */
    const [projects, setProjects] = useState([]);
    const [products, setProducts] = useState([]);
    const [available, setAvailable] = useState([]); // [{productId, availableQty}]
    const [employees, setEmployees] = useState([]); // Restored
    const [loading, setLoading] = useState(false); // Global loading state
    const { employeeId } = useAuth(); // Get real employee ID from context

    /* ------------ quick indexes ------------ */
    const productById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
    const availMap = useMemo(() => Object.fromEntries((available || []).map(a => [a.productId, a.availableQty || 0])), [available]);

    /* ------------ page/model state ------------ */
    const [projectOpt, setProjectOpt] = useState(null); // {value:id,label:name}
    const [templates, setTemplates] = useState([]);

    const [estimationId, setEstimationId] = useState(null); // NEW: to store actual DB ID
    const [components, setComponents] = useState(["Component A"]);
    // rows: { productId, productOption, estUnitCost:"", suggestedCost:number|undefined, storeAvail:number|undefined, quantities:{[comp]: number} }
    const [rows, setRows] = useState([]);

    // Global include toggles / rates for printing & totals
    const [includeDelivery, setIncludeDelivery] = useState(true);
    const [includeVat, setIncludeVat] = useState(true);
    const [includeTax, setIncludeTax] = useState(false);
    const [vatPercent, setVatPercent] = useState("");   // number-as-string
    const [taxPercent, setTaxPercent] = useState("");   // number-as-string

    // Per-component controls (keyed by component name)
    const [compMargin, setCompMargin] = useState({}); // { [compName]: number|string }
    const [compDelivery, setCompDelivery] = useState({}); // { [compName]: number|string }
    const [compDeliveryTaxable, setCompDeliveryTaxable] = useState({}); // { [compName]: boolean }

    // Print Settings
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printOpts, setPrintOpts] = useState({
        showQuantity: true,
        showUnitCost: true,
        showComponentTotals: true,
        showGrandTotal: true,
    });

    /* ------------ file upload state ------------ */
    const [quotationFile, setQuotationFile] = useState(null);
    const [existingFileUrl, setExistingFileUrl] = useState(null);

    /* ------------ new features state ------------ */
    const [globalSettings, setGlobalSettings] = useState({});
    const [libraryItems, setLibraryItems] = useState([]);

    // Per-component
    const [compOverhead, setCompOverhead] = useState({}); // { [compName]: string }

    // Global
    const [discountPercent, setDiscountPercent] = useState("");
    const [customNote, setCustomNote] = useState("");
    const [terms, setTerms] = useState([]); // [{ label, value }]

    const libraryTerms = useMemo(() => libraryItems.filter(i => i.type === 'TERM'), [libraryItems]);
    const libraryNotes = useMemo(() => libraryItems.filter(i => i.type === 'NOTE'), [libraryItems]);

    /* ------------ Workflow State ------------ */
    const [version, setVersion] = useState(1);
    const [versions, setVersions] = useState([]); // History snapshots
    const [approvalStatus, setApprovalStatus] = useState("DRAFT"); // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
    const [approverIds, setApproverIds] = useState([]);
    const [approvalHistory, setApprovalHistory] = useState([]); // Current approval cycle records
    const [approvalPolicy, setApprovalPolicy] = useState("ALL");

    // Derived ReadOnly
    const isLocked = forceReadOnly || (approvalStatus !== "DRAFT");
    const isReadOnly = isLocked;

    // Modals
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);

    const [revisionReason, setRevisionReason] = useState("");
    // const [rejectComment, setRejectComment] = useState("");

    /* ------------ load reference data ------------ */
    useEffect(() => {
        (async () => {
            try {
                const [projs, prods, avails, tpls, settings, libs, sysConfig, emps] = await Promise.all([
                    listProjectsAPI().catch(() => []),
                    listProductsAPI().catch(() => []),
                    listAvailableAPI().catch(() => []),
                    listTemplates().catch(() => []),
                    // Fetch configured settings / libraries
                    api.get('/settings').then(r => r.data).catch(() => []), // settings
                    api.get('/quote-library').then(r => r.data).catch(() => []), // libs
                    api.get('/admin/config').catch(() => ({ data: {} })), // sysConfig
                    listEmployeesAPI().catch(() => []),
                ]);
                setProjects(projs || []);
                setProducts(prods || []);
                setAvailable(avails || []);
                setTemplates(tpls || []);
                setEmployees(emps || []); // Restored
                setEmployees(emps || []); // Restored


                // Process Settings
                const sets = {};
                (settings || []).forEach(s => sets[s.key] = s.value);
                setGlobalSettings(sets);
                setLibraryItems(libs || []);

                // Store config for usage when resetting/initing
                window._sysConfig = sysConfig.data || {};

                if (propProjectId && projs.length) {
                    const found = projs.find(p => p.id === propProjectId);
                    if (found) setProjectOpt({ value: found.id, label: found.projectName || found.id });
                }
            } catch (e) {
                toast.error(e?.response?.data?.message || "Failed to load reference data");
            } finally {
                // Ensure initial load doesn't block if we manage loading here.
                // But mainly we care about the estimation load logic below.
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ------------ load estimation when project changes ------------ */
    useEffect(() => {
        const pid = projectOpt?.value;
        if (!pid) {
            setComponents(["Component A"]);
            setRows([]);
            setIncludeDelivery(true);
            setIncludeVat(true);
            setIncludeTax(false);

            const cfg = window._sysConfig || {};
            setVatPercent(cfg["app.estimation.vat"] || "18");
            setTaxPercent(cfg["app.estimation.tax"] || "0");
            // Margin is component-level, so we can't set it globally here easily unless we default the first component
            // We'll set it when adding components if possible, or just user enters it.
            // Actually, let's pre-set the first component's margin if we have a default.
            const defMargin = cfg["app.estimation.margin"] || "15";
            setCompMargin({ "Component A": defMargin });

            setCompDelivery({});
            setCompDeliveryTaxable({});
            setCompOverhead({});
            setDiscountPercent("");
            setCustomNote("");
            setTerms([]);
            setExistingFileUrl(null);

            // Reset workflow state
            setEstimationId(null);
            setVersion(1);
            setVersions([]);
            setApprovalStatus("DRAFT");
            setApproverIds([]);
            setApprovalPolicy("ALL");
            return;
        }
        (async () => {
            setLoading(true);
            try {
                const est = await getEstimation(pid).catch(() => null);

                if (!est) {
                    setComponents(["Component A"]);
                    setRows([]);
                    setIncludeDelivery(true);
                    setIncludeVat(true);
                    setIncludeTax(false);

                    const cfg = window._sysConfig || {};
                    setVatPercent(cfg["app.estimation.vat"] || "18");
                    setTaxPercent(cfg["app.estimation.tax"] || "0");
                    const defMargin = cfg["app.estimation.margin"] || "15";
                    setCompMargin({ "Component A": defMargin });

                    setCompDelivery({});
                    setCompDeliveryTaxable({});
                    setExistingFileUrl(null);
                    setVatPercent(globalSettings.GLOBAL_VAT_PERCENT || "18");
                    setTaxPercent(globalSettings.GLOBAL_TAX_PERCENT || "0");

                    // Reset workflow state
                    setEstimationId(null);
                    setVersion(1);
                    setVersions([]);
                    setApprovalStatus("DRAFT");
                    setApproverIds([]);
                    setApprovalPolicy("ALL");
                    return;
                }

                setEstimationId(est.id); // Store the estimation ID

                // Existing file?
                setExistingFileUrl(est.quotationFileUrl || null);

                // components
                const compNames = (est.components || []).map(c => c.name?.trim() || "Component");
                const cols = compNames.length ? compNames : ["Component A"];
                setComponents(cols);

                // per-component persisted options (if backend stores them)
                const initialMargin = {};
                const initialDelivery = {};
                const initialDelTax = {};
                const initialOverhead = {};
                (est.components || []).forEach(c => {
                    const name = c.name?.trim() || "Component";
                    if (c.marginPercent != null) initialMargin[name] = String(c.marginPercent);
                    if (c.overheadPercent != null) initialOverhead[name] = String(c.overheadPercent);
                    if (c.deliveryCost != null) initialDelivery[name] = String(c.deliveryCost);
                    if (typeof c.deliveryTaxable === "boolean") initialDelTax[name] = !!c.deliveryTaxable;
                });
                setCompMargin(initialMargin);
                setCompOverhead(initialOverhead);
                setCompDelivery(initialDelivery);
                setCompDeliveryTaxable(initialDelTax);

                setDiscountPercent(est.discountPercent != null ? String(est.discountPercent) : "");
                setCustomNote(est.customNote || "");
                setTerms(est.terms || []);

                // Workflow Fields
                setVersion(est.version || 1);
                setApprovalStatus(est.approvalStatus || "DRAFT");
                setApproverIds(est.approverIds || []);
                setApprovalPolicy(est.approvalPolicy || "ALL");
                setApprovalStatus(est.approvalStatus || "DRAFT");
                setApproverIds(est.approverIds || []);
                setApprovalHistory(est.approvals || []);
                setApprovalPolicy(est.approvalPolicy || "ALL");
                setVersions(est.history || []); // If we stored history in `history` field

                // rows
                const rowMap = new Map();
                for (const c of (est.components || [])) {
                    const cname = c.name?.trim() || "Component";
                    for (const it of (c.items || [])) {
                        if (!it.productId) continue;
                        if (!rowMap.has(it.productId)) {
                            const p = productById[it.productId];
                            const suggested = deriveSuggestedCost(p);
                            rowMap.set(it.productId, {
                                productId: it.productId,
                                productOption: p
                                    ? { value: p.id, label: buildProductLabel(p) }
                                    : { value: it.productId, label: it.productNameSnapshot || it.productId },
                                estUnitCost: it.estUnitCost ?? "",
                                suggestedCost: suggested,
                                storeAvail: availMap[it.productId],
                                quantities: {},
                            });
                        }
                        const r = rowMap.get(it.productId);
                        r.quantities[cname] = (r.quantities[cname] || 0) + (it.quantity || 0);
                        if (r.estUnitCost === "" && it.estUnitCost != null) r.estUnitCost = it.estUnitCost;
                    }
                }
                setRows(Array.from(rowMap.values()));

                // global flags
                if (typeof est.includeDelivery === "boolean") setIncludeDelivery(!!est.includeDelivery);
                if (typeof est.includeVat === "boolean") setIncludeVat(!!est.includeVat);
                if (typeof est.includeTax === "boolean") setIncludeTax(!!est.includeTax);
                setVatPercent(globalSettings.GLOBAL_VAT_PERCENT || "18");
                setTaxPercent(globalSettings.GLOBAL_TAX_PERCENT || "0");
                setTaxPercent(globalSettings.GLOBAL_TAX_PERCENT || "0");
            } catch (e) {
                toast.error(e?.response?.data?.message || "Failed to load estimation. Please try again.");
            } finally {
                setLoading(false);
            }
        })();
    }, [projectOpt, productById, availMap, globalSettings]);

    /* ------------ helpers ------------ */
    const buildProductLabel = (p) => {
        const sku = p?.sku ? ` • ${p.sku}` : "";
        return `${p?.name || p?.id}${sku}`;
    };

    // prefer last purchase price → lastCost → standard → average → unit → cost → price
    const deriveSuggestedCost = (p) => {
        if (!p) return undefined;
        const cands = [
            p.lastPurchasePrice,
            p.lastCost,
            p.standardCost,
            p.averageCost,
            p.unitCost,
            p.cost,
            p.price,
        ];
        const n = cands.find(v => v !== null && v !== undefined && !Number.isNaN(Number(v)));
        return n !== undefined ? Number(n) : undefined;
    };

    const projectOptions = useMemo(
        () => projects.map(p => ({ value: p.id, label: p.projectName || p.id })),
        [projects]
    );

    const productOptions = useMemo(
        () => products.map(p => ({ value: p.id, label: buildProductLabel(p) })),
        [products]
    );

    /* ------------ matrix ops ------------ */
    const addComponent = () => {
        const base = "Component";
        let i = components.length + 1;
        let name = `${base} ${i}`;
        const exists = new Set(components);
        while (exists.has(name)) { i += 1; name = `${base} ${i}`; }
        setComponents(cols => [...cols, name]);

        // Auto-set margin
        const cfg = window._sysConfig || {};
        const defMargin = cfg["app.estimation.margin"] || "15";
        setCompMargin(s => ({ ...s, [name]: defMargin }));
    };

    const renameComponent = (idx, name) => {
        const oldName = components[idx];
        const newName = name?.trim() || oldName;
        setComponents(cols => cols.map((c, i) => (i === idx ? newName : c)));
        if (oldName !== newName) {
            setRows(rs => rs.map(r => {
                const q = { ...(r.quantities || {}) };
                if (q[oldName] != null) {
                    q[newName] = (q[newName] || 0) + q[oldName];
                    delete q[oldName];
                }
                return { ...r, quantities: q };
            }));
            setCompMargin(s => {
                const x = { ...s };
                if (Object.prototype.hasOwnProperty.call(x, oldName)) {
                    x[newName] = x[oldName]; delete x[oldName];
                }
                return x;
            });
            setCompDelivery(s => {
                const x = { ...s };
                if (Object.prototype.hasOwnProperty.call(x, oldName)) {
                    x[newName] = x[oldName]; delete x[oldName];
                }
                return x;
            });
            setCompDeliveryTaxable(s => {
                const x = { ...s };
                if (Object.prototype.hasOwnProperty.call(x, oldName)) {
                    x[newName] = x[oldName]; delete x[oldName];
                }
                return x;
            });
            setCompOverhead(s => {
                const x = { ...s };
                if (Object.prototype.hasOwnProperty.call(x, oldName)) {
                    x[newName] = x[oldName]; delete x[oldName];
                }
                return x;
            });
        }
    };

    const removeComponent = (idx) => {
        const name = components[idx];
        setComponents(cols => cols.filter((_, i) => i !== idx));
        setRows(rs => rs.map(r => {
            const q = { ...(r.quantities || {}) };
            delete q[name];
            return { ...r, quantities: q };
        }));
        setCompMargin(s => { const x = { ...s }; delete x[name]; return x; });
        setCompOverhead(s => { const x = { ...s }; delete x[name]; return x; });
        setCompDelivery(s => { const x = { ...s }; delete x[name]; return x; });
        setCompDeliveryTaxable(s => { const x = { ...s }; delete x[name]; return x; });
    };

    const addRow = () =>
        setRows(rs => [...rs, {
            productId: "",
            productOption: null,
            estUnitCost: "",
            suggestedCost: undefined,
            storeAvail: undefined,
            quantities: Object.fromEntries(components.map(c => [c, 0])),
        }]);

    const removeRow = (i) => setRows(rs => rs.filter((_, idx) => idx !== i));

    const setRowField = (i, key, value) =>
        setRows(rs => {
            const cp = [...rs];
            cp[i] = { ...cp[i], [key]: value };
            return cp;
        });

    const setQty = (i, comp, val) =>
        setRows(rs => {
            const cp = [...rs];
            const r = { ...cp[i] };
            const q = { ...(r.quantities || {}) };
            q[comp] = Math.max(0, Number(val || 0));
            r.quantities = q;
            cp[i] = r;
            return cp;
        });

    const onPickProduct = async (rowIndex, option) => {
        if (!option) {
            setRows(rs => {
                const cp = [...rs];
                cp[rowIndex] = {
                    ...cp[rowIndex],
                    productId: "",
                    productOption: null,
                    storeAvail: undefined,
                    suggestedCost: undefined,
                    estUnitCost: cp[rowIndex].estUnitCost,
                };
                return cp;
            });
            return;
        }
        const pid = option.value;
        const p = productById[pid];
        const suggested = deriveSuggestedCost(p);

        // optimistic set with cached availability & suggested cost
        setRows(rs => {
            const cp = [...rs];
            const base = cp[rowIndex].quantities || {};
            const filled = { ...Object.fromEntries(components.map(c => [c, base[c] || 0])) };

            const next = {
                ...cp[rowIndex],
                productId: pid,
                productOption: option,
                quantities: filled,
                storeAvail: typeof availMap[pid] === "number" ? availMap[pid] : undefined,
                suggestedCost: suggested,
            };
            if ((next.estUnitCost === "" || next.estUnitCost == null) && suggested !== undefined) {
                next.estUnitCost = String(suggested);
            }
            cp[rowIndex] = next;
            return cp;
        });

        // live availability (optional)
        try {
            const fresh = await getAvailOneAPI(pid);
            if (fresh && typeof fresh.availableQty === "number") {
                setRows(rs => {
                    const cp = [...rs];
                    if (cp[rowIndex]?.productId === pid) {
                        cp[rowIndex] = { ...cp[rowIndex], storeAvail: fresh.availableQty };
                    }
                    return cp;
                });
            }
        } catch { /* ignore */ }

        // optional last-cost endpoint (if your product master doesn’t have cost)
        if (suggested === undefined) {
            try {
                const lc = await getLastCostAPI(pid); // {unitCost:number}
                if (lc && typeof lc.unitCost === "number") {
                    setRows(rs => {
                        const cp = [...rs];
                        if (cp[rowIndex]?.productId === pid) {
                            const fill = (cp[rowIndex].estUnitCost === "" || cp[rowIndex].estUnitCost == null)
                                ? String(lc.unitCost)
                                : cp[rowIndex].estUnitCost;
                            cp[rowIndex] = { ...cp[rowIndex], suggestedCost: lc.unitCost, estUnitCost: fill };
                        }
                        return cp;
                    });
                }
            } catch { /* ignore */ }
        }
    };

    // keep rows aligned to columns
    useEffect(() => {
        setRows(rs => rs.map(r => {
            const q = { ...(r.quantities || {}) };
            components.forEach(c => { if (q[c] == null) q[c] = 0; });
            Object.keys(q).forEach(k => { if (!components.includes(k)) delete q[k]; });
            return { ...r, quantities: q };
        }));
    }, [components]);

    /* ------------ per-component + totals ------------ */
    const compCalcs = useMemo(() => {
        return components.map((cname) => {
            const subtotal = rows.reduce(
                (acc, r) => acc + Number(r.estUnitCost || 0) * Number((r.quantities || {})[cname] || 0),
                0
            );

            // 1. Overhead
            const oPct = Number(compOverhead[cname] || 0);
            const oAmt = subtotal * (isNaN(oPct) ? 0 : oPct / 100);
            const baseForMargin = subtotal + oAmt;

            // 2. Margin
            const mPct = Number(compMargin[cname] || 0);
            const mAmt = baseForMargin * (isNaN(mPct) ? 0 : mPct / 100);
            const afterMargin = baseForMargin + mAmt;

            const del = Number(compDelivery[cname] || 0);
            const delTaxable = !!compDeliveryTaxable[cname];

            const taxableAdd = includeDelivery && delTaxable ? del : 0;
            const nonTaxableAdd = includeDelivery && !delTaxable ? del : 0;

            return {
                name: cname,
                subtotal,
                overheadPct: oPct,
                overheadAmt: oAmt,
                marginPct: mPct,
                marginAmount: mAmt,
                afterMargin,
                delivery: del,
                deliveryTaxable: delTaxable,
                taxablePortion: afterMargin + taxableAdd, // Gross taxable base from this component
                nonTaxablePortion: nonTaxableAdd,
                lineTotalBeforeTax: afterMargin + (includeDelivery ? del : 0),
            };
        });
    }, [components, rows, compMargin, compOverhead, compDelivery, compDeliveryTaxable, includeDelivery]);

    const totals = useMemo(() => {
        const taxableBaseRaw = compCalcs.reduce((a, c) => a + c.taxablePortion, 0);
        const nonTaxableRaw = compCalcs.reduce((a, c) => a + c.nonTaxablePortion, 0);

        // 3. Discount
        const discPct = Number(discountPercent || 0);
        const totalBeforeDisc = taxableBaseRaw + nonTaxableRaw;
        const discAmt = totalBeforeDisc * (isNaN(discPct) ? 0 : discPct / 100);

        // Split discount proportionally
        let taxableBase = taxableBaseRaw;
        let nonTaxable = nonTaxableRaw;

        if (totalBeforeDisc > 0) {
            const ratio = taxableBaseRaw / totalBeforeDisc;
            taxableBase = taxableBaseRaw - (discAmt * ratio);
            nonTaxable = nonTaxableRaw - (discAmt * (1 - ratio));
        }

        // Use global settings if toggles on
        const vatPctNum = includeVat
            ? (globalSettings.GLOBAL_VAT_PERCENT ? Number(globalSettings.GLOBAL_VAT_PERCENT) : Number(vatPercent || 0))
            : 0;
        const taxPctNum = includeTax
            ? (globalSettings.GLOBAL_TAX_PERCENT ? Number(globalSettings.GLOBAL_TAX_PERCENT) : Number(taxPercent || 0))
            : 0;

        const vatAmount = taxableBase * (isNaN(vatPctNum) ? 0 : vatPctNum / 100);
        const taxAmount = taxableBase * (isNaN(taxPctNum) ? 0 : taxPctNum / 100);

        const grand = taxableBase + nonTaxable + vatAmount + taxAmount;

        const rawSubtotal = compCalcs.reduce((a, c) => a + c.subtotal, 0);
        const withMargin = compCalcs.reduce((a, c) => a + c.afterMargin, 0);

        return {
            rawSubtotal,
            withMargin,
            discountAmount: discAmt,
            taxableBase,
            nonTaxable,
            vatAmount,
            taxAmount,
            grand,
            vatUsed: vatPctNum,
            taxUsed: taxPctNum
        };
    }, [compCalcs, includeVat, includeTax, vatPercent, taxPercent, discountPercent, globalSettings]);

    /* ------------ save ------------ */
    const toBigDec = (val) => {
        if (val === "" || val == null) return null;
        const n = Number(val);
        return isNaN(n) ? null : String(val);
    };

    const buildPayload = () => {
        const comps = components.map(cname => {
            const items = [];
            rows.forEach(r => {
                const qtyVal = (r.quantities || {})[cname];
                const qty = Number(qtyVal || 0);

                if (r.productId && qty > 0) {
                    items.push({
                        productId: r.productId,
                        productNameSnapshot: productById[r.productId]?.name || r.productOption?.label || r.productId,
                        quantity: qty, // if NaN, becomes null in JSON
                        estUnitCost: toBigDec(r.estUnitCost),
                    });
                }
            });

            const m = compMargin[cname];
            const o = compOverhead[cname];
            const dc = compDelivery[cname];
            const dt = !!compDeliveryTaxable[cname];

            return {
                name: cname,
                note: "",
                marginPercent: toBigDec(m),
                overheadPercent: toBigDec(o),
                deliveryCost: toBigDec(dc),
                deliveryTaxable: dt,
                items
            };
        });

        // Use globals for saving if toggled? Or save specific snapshot?
        // We'll save what was used in calculation (which respects global)
        const vatUsed = totals.vatUsed;
        const taxUsed = totals.taxUsed;

        return {
            components: comps,
            includeDelivery,
            includeVat,
            includeTax,
            vatPercent: toBigDec(vatUsed),
            taxPercent: toBigDec(taxUsed),
            discountPercent: toBigDec(discountPercent),
            customNote,
            terms
        };
    };

    const saveEstimation = async (silent = false) => {
        const pid = projectOpt?.value;
        if (!pid) { toast.warn("Select a project"); return false; }
        try {
            const payload = buildPayload();

            const formData = new FormData();
            formData.append("estimation", new Blob([JSON.stringify(payload)], { type: "application/json" }));
            if (quotationFile) {
                formData.append("file", quotationFile);
            }

            const res = await api.post(`/estimations/by-project/${pid}`, formData);

            // Update existing file URL if response has it
            if (res.data?.quotationFileUrl) {
                setExistingFileUrl(res.data.quotationFileUrl);
            }
            // Update estimationId if it's a new estimation being saved for the first time
            if (!estimationId && res.data?.id) {
                setEstimationId(res.data.id);
            }

            if (!silent) toast.success("Estimation saved");
            return true;
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to save estimation");
            return false;
        }
    };



    /* ------------ Workflow Handlers ------------ */

    const handleSubmitForApproval = async () => {
        if (!projectOpt?.value || !estimationId) { toast.warn("Save estimation first."); return; }
        // No manual validation of approvers needed
        try {
            const res = await submitApprovalAPI(estimationId, {
                approverIds: [], // Backend resolves from Workflow Config
                policy: null     // Backend Defaults
            });
            setApprovalStatus(res.approvalStatus);
            setApproverIds(res.approverIds || []);
            setShowApprovalModal(false);
            toast.success("Submitted for approval!");
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to submit");
        }
    };

    const handleApprove = async () => {
        if (!estimationId) return;
        try {
            const res = await approveAPI(estimationId, { comment: "Approved via Web UI" });
            setApprovalStatus(res.approvalStatus);
            setApproverIds(res.approverIds || []);
            setApprovalHistory(res.approvals || []);
            setApprovalPolicy(res.approvalPolicy || "ALL");
            toast.success("Approved!");
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to approve");
        }
    };

    const handleReject = async () => {
        if (!estimationId) return;
        const comment = prompt("Enter rejection reason:");
        if (!comment) return;
        try {
            const res = await rejectAPI(estimationId, { comment });
            setApprovalStatus(res.approvalStatus);
            setApproverIds(res.approverIds || []);
            setApprovalHistory(res.approvals || []);
            setApprovalPolicy(res.approvalPolicy || "ALL");
            toast.error("Rejected!");
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to reject");
        }
    };

    const handleRequestRevision = async () => {
        if (!estimationId) return;
        if (!revisionReason) { toast.warn("Enter a reason"); return; }
        try {
            const res = await createRevisionAPI(estimationId, { reason: revisionReason });
            // Fully reload to reflect new version/draft state?
            // Actually res is the new state.
            setApprovalStatus(res.approvalStatus);
            setVersion(res.version);
            setVersions(res.history || []);
            setShowRevisionModal(false);
            setRevisionReason("");
            toast.success(`New Revision V${res.version} Created!`);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to create revision");
        }
    };

    /* ------------ derived ------------ */
    const neededMap = useMemo(() => {
        const m = new Map();
        rows.forEach(r => {
            const total = Object.values(r.quantities || {}).reduce((a, b) => a + Number(b || 0), 0);
            m.set(r.productId, total);
        });
        return m;
    }, [rows]);

    // Status Badge Color
    const statusColor = {
        "DRAFT": "secondary",
        "PENDING_APPROVAL": "warning",
        "APPROVED": "success",
        "REJECTED": "danger",
        "FINALIZED": "success"
    }[approvalStatus] || "secondary";

    // Can current user approve?
    const canApprove = approvalStatus === "PENDING_APPROVAL" && (approverIds || []).includes(employeeId);

    /* ------------ render ------------ */
    // Render Loading Overlay
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
                <Spinner animation="border" variant="primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <span className="ms-2">Loading Estimation...</span>
            </div>
        );
    }

    return (
        <Container fluid className="p-3" style={{ maxWidth: 1600 }}>
            <Row className="g-3">
                <Col>
                    {/* Header with Version/Status */}
                    <div className="bg-white shadow rounded p-3 mb-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <h4 className="mb-0">Project Estimation</h4>
                            <Badge bg={statusColor} className="fs-6">{approvalStatus}</Badge>
                            <Badge bg="light" text="dark" className="border">V{version}</Badge>
                        </div>
                        <div className="d-flex gap-2">
                            {/* Action Buttons */}
                            {approvalStatus === "DRAFT" && !isLocked && (
                                <Button variant="outline-primary" onClick={() => setShowApprovalModal(true)}>
                                    Submit for Approval
                                </Button>
                            )}
                            {canApprove && (
                                <>
                                    <Button variant="success" onClick={handleApprove}>Approve</Button>
                                    <Button variant="danger" onClick={handleReject}>Reject</Button>
                                </>
                            )}
                            {(approvalStatus === "APPROVED" || approvalStatus === "REJECTED" || approvalStatus === "FINALIZED") && (
                                <Button variant="outline-dark" onClick={() => setShowRevisionModal(true)}>
                                    Create Revision
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white shadow rounded p-3">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <h5 className="mb-0">Project Estimation (Matrix)</h5>
                                <div style={{ minWidth: 300 }}>
                                    <Select
                                        options={projectOptions}
                                        value={projectOpt}
                                        onChange={setProjectOpt}
                                        placeholder="Select a project…"
                                        isClearable
                                        isDisabled={isLocked || !!propProjectId} // Lock if accessed via Project context
                                    />
                                </div>
                            </div>

                            <div className="d-flex gap-2 align-items-center">
                                {/* File Upload */}
                                <div className="d-flex flex-column align-items-end me-2">
                                    <Form.Control
                                        type="file"
                                        size="sm"
                                        style={{ width: 250 }}
                                        disabled={isLocked}
                                        onChange={(e) => setQuotationFile(e.target.files[0])}
                                    />
                                    {existingFileUrl && (
                                        <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="small">
                                            View Saved Quote
                                        </a>
                                    )}
                                </div>

                                {!isLocked && <Button variant="outline-success" onClick={addComponent}>+ Column</Button>}
                                {!isLocked && <Button variant="primary" onClick={() => saveEstimation(false)}>Save</Button>}
                            </div>
                        </div>

                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 360 }}>Product</th>
                                    <th className="text-end" style={{ width: 160 }}>Est. Unit Cost</th>
                                    {components.map((c, idx) => (
                                        <th key={idx} style={{ width: 140 }}>
                                            <div className="d-flex gap-1 align-items-center">
                                                <Form.Control
                                                    value={c}
                                                    onChange={(e) => renameComponent(idx, e.target.value)}
                                                    disabled={isLocked}
                                                />
                                                {!isLocked && <Button size="sm" variant="outline-danger" onClick={() => removeComponent(idx)}>✕</Button>}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="text-end" style={{ width: 120 }}>Needed</th>
                                    <th className="text-end" style={{ width: 120 }}>Avail</th>
                                    <th className="text-end" style={{ width: 140 }}>Row Total</th>
                                    <th style={{ width: 60 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={components.length + 7} className="text-center text-muted">No rows</td></tr>
                                ) : rows.map((r, i) => {
                                    const need = neededMap.get(r.productId) || 0;
                                    const avail = typeof r.storeAvail === "number" ? r.storeAvail : (r.productId ? (availMap[r.productId] ?? 0) : 0);
                                    const low = need > avail;
                                    const unit = Number(r.estUnitCost || 0);
                                    const rowTotal = unit * need;

                                    return (
                                        <tr key={`${r.productId || "row"}-${i}`}>
                                            <td>
                                                <Select
                                                    options={productOptions}
                                                    value={r.productOption || null}
                                                    isDisabled={isLocked}
                                                    onChange={(opt) => onPickProduct(i, opt)}
                                                    placeholder="Search product by name…"
                                                    isClearable
                                                    filterOption={(option, input) =>
                                                        option.label.toLowerCase().includes(input.toLowerCase())
                                                    }
                                                />
                                                <div className="small text-muted mt-1">
                                                    {r.productId ? <>ID: {r.productId}</> : <>Not selected</>}
                                                    {productById[r.productId]?.sku ? <> &nbsp;•&nbsp; SKU: {productById[r.productId].sku}</> : null}
                                                </div>
                                            </td>

                                            <td>
                                                <Form.Control
                                                    className="text-end"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={r.estUnitCost ?? ""}
                                                    onChange={(e) => setRowField(i, "estUnitCost", e.target.value)}
                                                    disabled={isLocked}
                                                />
                                                {typeof r.suggestedCost === "number" && (
                                                    <div className="small text-muted d-flex justify-content-between">
                                                        <span>Suggested: {r.suggestedCost.toLocaleString()}</span>
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            className="p-0"
                                                            onClick={() => !isReadOnly && setRowField(i, "estUnitCost", String(r.suggestedCost))}
                                                            disabled={isReadOnly}
                                                        >
                                                            Use
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>

                                            {components.map((c) => (
                                                <td key={`${i}-${c}`}>
                                                    <Form.Control
                                                        className="text-end"
                                                        type="number"
                                                        min="0"
                                                        value={(r.quantities || {})[c] ?? 0}
                                                        onChange={(e) => setQty(i, c, e.target.value)}
                                                        disabled={isReadOnly}
                                                    />
                                                </td>
                                            ))}

                                            <td className="text-end">{need}</td>
                                            <td className="text-end">
                                                {low ? <Badge bg="danger">{avail}</Badge> : <span>{avail}</span>}
                                            </td>
                                            <td className="text-end">{Number.isFinite(rowTotal) ? rowTotal.toLocaleString() : 0}</td>
                                            <td className="text-end">
                                                <Button size="sm" variant="outline-danger" onClick={() => removeRow(i)}>✕</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            <tfoot>
                                <tr>
                                    <td colSpan={components.length + 7}>
                                        {!isReadOnly && <Button variant="outline-secondary" onClick={addRow}>+ Add Product Row</Button>}
                                    </td>
                                </tr>
                            </tfoot>
                        </Table>

                        {/* Per-component options & totals */}
                        <div className="bg-light rounded p-3 mt-3">
                            <h6 className="mb-3">Component Options & Totals</h6>
                            <Table size="sm" responsive bordered>
                                <thead>
                                    <tr>
                                        <th>Component</th>
                                        <th className="text-end" style={{ width: 120 }}>Subtotal</th>
                                        <th style={{ width: 120 }}>Overhead %</th>
                                        <th style={{ width: 120 }}>Margin %</th>
                                        <th className="text-end" style={{ width: 140 }}>After Margin</th>
                                        <th style={{ width: 180 }}>Delivery</th>
                                        <th style={{ width: 150 }}>Delivery Taxable?</th>
                                        <th className="text-end" style={{ width: 160 }}>Line Total (pre-tax)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compCalcs.map(cc => (
                                        <tr key={cc.name}>
                                            <td className="align-middle">{cc.name}</td>
                                            <td className="text-end align-middle">{cc.subtotal.toLocaleString()}</td>
                                            <td>
                                                <Form.Control
                                                    className="text-end"
                                                    type="number"
                                                    min="0" step="0.01"
                                                    value={compOverhead[cc.name] ?? ""}
                                                    disabled={isLocked}
                                                    onChange={(e) => setCompOverhead(s => ({ ...s, [cc.name]: e.target.value }))}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td>
                                                <Form.Control
                                                    className="text-end"
                                                    type="number"
                                                    min="0" step="0.01"
                                                    value={compMargin[cc.name] ?? ""}
                                                    disabled={isLocked}
                                                    onChange={(e) => setCompMargin(s => ({ ...s, [cc.name]: e.target.value }))}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="text-end align-middle">{cc.afterMargin.toLocaleString()}</td>
                                            <td>
                                                <Form.Control
                                                    className="text-end"
                                                    type="number"
                                                    min="0" step="0.01"
                                                    value={compDelivery[cc.name] ?? ""}
                                                    disabled={isLocked}
                                                    onChange={(e) => setCompDelivery(s => ({ ...s, [cc.name]: e.target.value }))}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="text-center">
                                                <Form.Check
                                                    type="switch"
                                                    checked={!!compDeliveryTaxable[cc.name]}
                                                    onChange={(e) => setCompDeliveryTaxable(s => ({ ...s, [cc.name]: e.target.checked }))}
                                                    disabled={!includeDelivery || isLocked}
                                                    label=""
                                                />
                                            </td>
                                            <td className="text-end align-middle">{cc.lineTotalBeforeTax.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {/* Global toggles/rates */}
                            <div className="bg-light rounded p-3 mt-3">
                                <h6 className="mb-3">Summary & Settings</h6>
                                <Row className="g-3">
                                    <Col md={3}>
                                        <Form.Check
                                            type="switch"
                                            label="Include Delivery in Total"
                                            checked={includeDelivery}
                                            disabled={isLocked}
                                            onChange={e => setIncludeDelivery(e.target.checked)}
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small mb-1">Discount %</Form.Label>
                                            <Form.Control
                                                size="sm"
                                                type="number"
                                                value={discountPercent}
                                                disabled={isLocked}
                                                onChange={e => setDiscountPercent(e.target.value)}
                                                placeholder="0"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Check
                                            type="switch"
                                            label={`VAT (${vatPercent || 0}%)`}
                                            checked={includeVat}
                                            disabled={isLocked}
                                            onChange={e => {
                                                setIncludeVat(e.target.checked);
                                            }}
                                        />
                                        <div className="small text-muted">Global/Saved Rate Applied</div>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Check
                                            type="switch"
                                            label={`Other Tax (${taxPercent || 0}%)`}
                                            checked={includeTax}
                                            disabled={isLocked}
                                            onChange={e => setIncludeTax(e.target.checked)}
                                        />
                                    </Col>
                                </Row>

                                <hr />

                                <Row>
                                    <Col md={8}>
                                        {/* Terms & Conditions */}
                                        <div className="mb-4">
                                            <strong>Terms & Conditions</strong>
                                            <div className="d-flex gap-2 my-2">
                                                <Select
                                                    options={libraryTerms.map(t => ({ value: t, label: t.title }))}
                                                    isDisabled={isLocked}
                                                    onChange={(opt) => {
                                                        if (opt) setTerms([...terms, { label: opt.value.title, value: opt.value.content }]);
                                                    }}
                                                    placeholder="Load a Term..."
                                                    className="flex-grow-1"
                                                />
                                                {!isLocked && <Button size="sm" variant="outline-primary" onClick={() => setTerms([...terms, { label: "", value: "" }])}>
                                                    + Custom
                                                </Button>}
                                            </div>
                                            <Table bordered size="sm">
                                                <tbody>
                                                    {terms.map((t, i) => (
                                                        <tr key={i}>
                                                            <td style={{ width: '30%' }}>
                                                                <Form.Control
                                                                    size="sm"
                                                                    value={t.label}
                                                                    disabled={isLocked}
                                                                    onChange={e => {
                                                                        const copy = [...terms];
                                                                        copy[i].label = e.target.value;
                                                                        setTerms(copy);
                                                                    }}
                                                                    placeholder="Label (e.g. Validity)"
                                                                />
                                                            </td>
                                                            <td>
                                                                <Form.Control
                                                                    size="sm"
                                                                    value={t.value}
                                                                    disabled={isLocked}
                                                                    onChange={e => {
                                                                        const copy = [...terms];
                                                                        copy[i].value = e.target.value;
                                                                        setTerms(copy);
                                                                    }}
                                                                    placeholder="Value (e.g. 30 Days)"
                                                                />
                                                            </td>
                                                            <td style={{ width: 40 }}>
                                                                {!isLocked && <Button size="sm" variant="link" className="text-danger p-0" onClick={() => setTerms(terms.filter((_, idx) => idx !== i))}>✕</Button>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>

                                        {/* Custom Notes */}
                                        <div>
                                            <strong>Custom Notes</strong>
                                            <div className="d-flex gap-2 my-2 align-items-center">
                                                <Select
                                                    options={libraryNotes.map(n => ({ value: n, label: n.title }))}
                                                    isDisabled={isLocked}
                                                    onChange={(opt) => {
                                                        if (opt) setCustomNote(prev => (prev ? prev + "\n" : "") + opt.value.content);
                                                    }}
                                                    placeholder="Append Note Template..."
                                                    className="flex-grow-1"
                                                />
                                            </div>
                                            <Form.Control
                                                as="textarea"
                                                rows={4}
                                                value={customNote}
                                                disabled={isLocked}
                                                onChange={e => setCustomNote(e.target.value)}
                                                placeholder="Enter any custom notes for this estimation..."
                                            />
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <Card>
                                            <Card.Body>
                                                <h6 className="card-title">Estimated Totals</h6>
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span>Subtotal (Comp):</span>
                                                    <span>{totals.rawSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-1 text-muted small">
                                                    <span>With Margin & Overhead:</span>
                                                    <span>{totals.withMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-1 text-danger">
                                                    <span>Discount ({discountPercent || 0}%):</span>
                                                    <span>-{totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <hr />
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span>Taxable Base:</span>
                                                    <span>{totals.taxableBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                {includeVat && (
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span>VAT ({totals.vatUsed}%):</span>
                                                        <span>{totals.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                                {includeTax && (
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span>Tax ({totals.taxUsed}%):</span>
                                                        <span>{totals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                                <hr />
                                                <div className="d-flex justify-content-between fw-bold">
                                                    <span>Grand Total:</span>
                                                    <span>{totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        </div>

                        <div className="mt-3 d-flex justify-content-between align-items-center">
                            <div className="small text-muted">Tip: Columns are components; rename or add more as needed.</div>
                            <div className="d-flex gap-2">
                                {!isLocked && <span className="text-muted small me-2">Editing enabled</span>}
                                {!isLocked && <Button variant="primary" onClick={() => saveEstimation(false)}>Save</Button>}
                            </div>
                        </div>
                    </div>

                    {/* Print Settings Modal */}
                    {/* Print Settings Modal Moved to ProjectQuotationCard */}

                    {/* Workflow Status Card */}
                    <div className="bg-white shadow rounded p-3 mt-3">
                        <h6 className="mb-2">Workflow Status</h6>
                        <div className="mb-2">
                            <Badge bg={approvalStatus === 'APPROVED' ? 'success' : approvalStatus === 'PENDING_APPROVAL' ? 'warning' : 'secondary'}>
                                {approvalStatus}
                            </Badge>
                        </div>
                        {(approverIds.length > 0) && (
                            <div className="small">
                                <div className="fw-semibold mb-1">Approvers:</div>
                                <ul className="list-unstyled mb-0">
                                    {approverIds.map(uid => {
                                        const emp = employees.find(e => e.id === uid);
                                        const name = emp ? `${emp.firstName} ${emp.lastName}` : uid;
                                        // Check status
                                        const rec = approvalHistory.find(r => r.approverId === uid && r.status !== 'PENDING'); // Assuming backend stores specific status or we infer
                                        // Backend ApprovalRecord: status="APPROVED"|"REJECTED".
                                        // If not found in history, it's PENDING.
                                        const status = rec ? rec.status : "PENDING";
                                        const color = status === 'APPROVED' ? 'text-success' : status === 'REJECTED' ? 'text-danger' : 'text-muted';

                                        return (
                                            <li key={uid} className="mb-1 d-flex justify-content-between align-items-center">
                                                <span>{name}</span>
                                                <span className={`badge bg-light ${color} border`}>{status}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        {(approverIds.length === 0 && approvalStatus !== 'DRAFT') && <div className="text-muted small">No approvers assigned.</div>}
                    </div>

                    <div className="bg-white shadow rounded p-3 mt-3">
                        <h6 className="mb-2">Templates</h6>
                        {templates.length === 0 ? (
                            <div className="text-muted">No templates yet</div>
                        ) : (
                            <Table size="sm" hover responsive>
                                <tbody>
                                    {templates.map(t => (
                                        <tr key={t.id}>
                                            <td>{t.name}</td>
                                            <td className="text-end text-muted">{(t.items || []).length} items</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                        <div className="small text-muted">
                            Template “insert as column” can be added later if you want that workflow.
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Approval Modal */}
            <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)}>
                <Modal.Header closeButton><Modal.Title>Submit for Approval</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to submit this estimation for approval?</p>
                    <p className="text-muted small">
                        Approvers will be automatically assigned based on the <strong>Project Workflow</strong> configuration.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmitForApproval}>Submit</Button>
                </Modal.Footer>
            </Modal>

            {/* Revision Modal */}
            <Modal show={showRevisionModal} onHide={() => setShowRevisionModal(false)}>
                <Modal.Header closeButton><Modal.Title>Create New Revision</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Reason for Revision</Form.Label>
                        <Form.Control as="textarea" rows={3} value={revisionReason} onChange={e => setRevisionReason(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRevisionModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleRequestRevision}>Create Revision</Button>
                </Modal.Footer>
            </Modal>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container >
    );
}

