// src/components/Projects/ProjectEstimationPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Button, Form, Table, Badge } from "react-bootstrap";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ------------ API helpers ------------ */
const getEstimation     = async (projectId) => (await api.get(`/estimations/by-project/${projectId}`)).data;
const saveEstimationAPI = async (projectId, payload) => (await api.post(`/estimations/by-project/${projectId}`, payload)).data;
const listTemplates     = async () => (await api.get(`/component-templates`)).data;
const listProductsAPI   = async () => (await api.get(`/products`, { params: { page: 0, size: 1000, sort: "name,asc" } })).data?.content ?? [];
const listAvailableAPI  = async () => (await api.get(`/inventory/available-quantities`)).data;
const listProjectsAPI   = async () => (await api.get(`/projects`, { params: { page: 0, size: 1000, sort: "projectName,asc" } })).data?.content ?? [];
const getAvailOneAPI    = async (productId) => (await api.get(`/inventory/available-quantities/${productId}`)).data; // optional
// OPTIONAL fallback for cost if your product doesn’t carry it:
const getLastCostAPI    = async (productId) => (await api.get(`/products/${productId}/last-cost`)).data; // {unitCost:number}

export default function ProjectEstimationPage({ projectId: propProjectId }) {
    /* ------------ reference data ------------ */
    const [projects, setProjects]   = useState([]);
    const [products, setProducts]   = useState([]);
    const [available, setAvailable] = useState([]); // [{productId, availableQty}]

    /* ------------ quick indexes ------------ */
    const productById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
    const availMap    = useMemo(() => Object.fromEntries((available || []).map(a => [a.productId, a.availableQty || 0])), [available]);

    /* ------------ page/model state ------------ */
    const [projectOpt, setProjectOpt] = useState(null); // {value:id,label:name}
    const [templates, setTemplates]   = useState([]);

    const [components, setComponents] = useState(["Component A"]);
    // rows: { productId, productOption, estUnitCost:"", suggestedCost:number|undefined, storeAvail:number|undefined, quantities:{[comp]: number} }
    const [rows, setRows] = useState([]);

    // Global include toggles / rates for printing & totals
    const [includeDelivery, setIncludeDelivery] = useState(true);
    const [includeVat, setIncludeVat]           = useState(true);
    const [includeTax, setIncludeTax]           = useState(false);
    const [vatPercent, setVatPercent]           = useState("");   // number-as-string
    const [taxPercent, setTaxPercent]           = useState("");   // number-as-string

    // Per-component controls (keyed by component name)
    const [compMargin, setCompMargin]                 = useState({}); // { [compName]: number|string }
    const [compDelivery, setCompDelivery]             = useState({}); // { [compName]: number|string }
    const [compDeliveryTaxable, setCompDeliveryTaxable] = useState({}); // { [compName]: boolean }

    /* ------------ load reference data ------------ */
    useEffect(() => {
        (async () => {
            try {
                const [projs, prods, avails, tpls] = await Promise.all([
                    listProjectsAPI().catch(() => []),
                    listProductsAPI().catch(() => []),
                    listAvailableAPI().catch(() => []),
                    listTemplates().catch(() => []),
                ]);
                setProjects(projs || []);
                setProducts(prods || []);
                setAvailable(avails || []);
                setTemplates(tpls || []);

                if (propProjectId && projs.length) {
                    const found = projs.find(p => p.id === propProjectId);
                    if (found) setProjectOpt({ value: found.id, label: found.projectName || found.id });
                }
            } catch (e) {
                toast.error(e?.response?.data?.message || "Failed to load reference data");
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
            setVatPercent("");
            setTaxPercent("");
            setCompMargin({});
            setCompDelivery({});
            setCompDeliveryTaxable({});
            return;
        }
        (async () => {
            try {
                const est = await getEstimation(pid).catch(() => null);

                if (!est) {
                    setComponents(["Component A"]);
                    setRows([]);
                    setIncludeDelivery(true);
                    setIncludeVat(true);
                    setIncludeTax(false);
                    setVatPercent("");
                    setTaxPercent("");
                    setCompMargin({});
                    setCompDelivery({});
                    setCompDeliveryTaxable({});
                    return;
                }

                // components
                const compNames = (est.components || []).map(c => c.name?.trim() || "Component");
                const cols = compNames.length ? compNames : ["Component A"];
                setComponents(cols);

                // per-component persisted options (if backend stores them)
                const initialMargin   = {};
                const initialDelivery = {};
                const initialDelTax   = {};
                (est.components || []).forEach(c => {
                    const name = c.name?.trim() || "Component";
                    if (c.marginPercent != null) initialMargin[name] = String(c.marginPercent);
                    if (c.deliveryCost  != null) initialDelivery[name] = String(c.deliveryCost);
                    if (typeof c.deliveryTaxable === "boolean") initialDelTax[name] = !!c.deliveryTaxable;
                });
                setCompMargin(initialMargin);
                setCompDelivery(initialDelivery);
                setCompDeliveryTaxable(initialDelTax);

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
                if (est.vatPercent != null) setVatPercent(String(est.vatPercent));
                if (est.taxPercent != null) setTaxPercent(String(est.taxPercent));
            } catch (e) {
                toast.error(e?.response?.data?.message || "Failed to load estimation");
            }
        })();
    }, [projectOpt, productById, availMap]);

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
        const p   = productById[pid];
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
            const mPct = Number(compMargin[cname] || 0);
            const mAmt = subtotal * (isNaN(mPct) ? 0 : mPct / 100);
            const afterMargin = subtotal + mAmt;

            const del = Number(compDelivery[cname] || 0);
            const delTaxable = !!compDeliveryTaxable[cname];

            const taxableAdd    = includeDelivery && delTaxable ? del : 0;
            const nonTaxableAdd = includeDelivery && !delTaxable ? del : 0;

            return {
                name: cname,
                subtotal,
                marginPct: mPct,
                marginAmount: mAmt,
                afterMargin,
                delivery: del,
                deliveryTaxable: delTaxable,
                taxablePortion: afterMargin + taxableAdd,
                nonTaxablePortion: nonTaxableAdd,
                lineTotalBeforeTax: afterMargin + (includeDelivery ? del : 0),
            };
        });
    }, [components, rows, compMargin, compDelivery, compDeliveryTaxable, includeDelivery]);

    const totals = useMemo(() => {
        const taxableBase  = compCalcs.reduce((a, c) => a + c.taxablePortion, 0);
        const nonTaxable   = compCalcs.reduce((a, c) => a + c.nonTaxablePortion, 0);
        const vatPctNum    = Number(vatPercent || 0);
        const taxPctNum    = Number(taxPercent || 0);

        const vatAmount    = includeVat ? taxableBase * (isNaN(vatPctNum) ? 0 : vatPctNum / 100) : 0;
        const taxAmount    = includeTax ? taxableBase * (isNaN(taxPctNum) ? 0 : taxPctNum / 100) : 0;

        const grand        = taxableBase + nonTaxable + vatAmount + taxAmount;

        const rawSubtotal  = compCalcs.reduce((a,c) => a + c.subtotal, 0);
        const withMargin   = compCalcs.reduce((a,c) => a + c.afterMargin, 0);

        return {
            rawSubtotal,
            withMargin,
            taxableBase,
            nonTaxable,
            vatAmount,
            taxAmount,
            grand,
        };
    }, [compCalcs, includeVat, includeTax, vatPercent, taxPercent]);

    /* ------------ save ------------ */
    const buildPayload = () => {
        const comps = components.map(cname => {
            const items = [];
            rows.forEach(r => {
                const qty = Number((r.quantities || {})[cname] || 0);
                if (r.productId && qty > 0) {
                    items.push({
                        productId: r.productId,
                        productNameSnapshot: productById[r.productId]?.name || r.productOption?.label || r.productId,
                        quantity: qty,
                        estUnitCost: r.estUnitCost !== "" && r.estUnitCost != null ? String(r.estUnitCost) : null,
                    });
                }
            });

            const m  = compMargin[cname];
            const dc = compDelivery[cname];
            const dt = !!compDeliveryTaxable[cname];

            return {
                name: cname,
                note: "",
                marginPercent: (m !== "" && m != null) ? String(m) : null,
                deliveryCost:  (dc !== "" && dc != null) ? String(dc) : null,
                deliveryTaxable: dt,
                items
            };
        });

        return {
            components: comps,
            includeDelivery,
            includeVat,
            includeTax,
            vatPercent:   vatPercent !== "" && vatPercent != null ? String(vatPercent) : null,
            taxPercent:   taxPercent !== "" && taxPercent != null ? String(taxPercent) : null,
        };
    };

    const saveEstimation = async () => {
        const pid = projectOpt?.value;
        if (!pid) { toast.warn("Select a project"); return; }
        try {
            const payload = buildPayload();
            await saveEstimationAPI(pid, payload);
            toast.success("Estimation saved");

            // Generate & download PDF using your toggles and rates
            const pdfResp = await api.post(
                `/estimations/by-project/${pid}/pdf`,
                {
                    includeDelivery,
                    includeVat,
                    includeTax,
                    vatPercentOverride: (vatPercent ?? "") === "" ? null : Number(vatPercent),
                    taxPercentOverride: (taxPercent ?? "") === "" ? null : Number(taxPercent),
                },
                { responseType: "blob" }
            );
            const blob = new Blob([pdfResp.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${pid}-Estimation.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to save estimation / generate PDF");
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

    /* ------------ render ------------ */
    return (
        <Container style={{ width: "95vw", maxWidth: 1400, paddingTop: 24 }}>
            <Row className="g-3">
                <Col>
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
                                    />
                                </div>
                            </div>
                            <div className="d-flex gap-2">
                                <Button variant="outline-success" onClick={addComponent}>+ Column</Button>
                                <Button variant="primary" onClick={saveEstimation}>Save</Button>
                            </div>
                        </div>

                        <Table hover responsive>
                            <thead>
                            <tr>
                                <th style={{ minWidth: 360 }}>Product</th>
                                <th className="text-end" style={{ width: 160 }}>Est. Unit Cost</th>
                                {components.map((c, idx) => (
                                    <th key={c} style={{ width: 140 }}>
                                        <div className="d-flex gap-1 align-items-center">
                                            <Form.Control
                                                value={c}
                                                onChange={(e) => renameComponent(idx, e.target.value)}
                                            />
                                            <Button size="sm" variant="outline-danger" onClick={() => removeComponent(idx)}>✕</Button>
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
                                            />
                                            {typeof r.suggestedCost === "number" && (
                                                <div className="small text-muted d-flex justify-content-between">
                                                    <span>Suggested: {r.suggestedCost.toLocaleString()}</span>
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="p-0"
                                                        onClick={() => setRowField(i, "estUnitCost", String(r.suggestedCost))}
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
                                    <Button variant="outline-secondary" onClick={addRow}>+ Add Product Row</Button>
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
                                    <th className="text-end" style={{width:120}}>Subtotal</th>
                                    <th style={{width:160}}>Margin %</th>
                                    <th className="text-end" style={{width:140}}>After Margin</th>
                                    <th style={{width:180}}>Delivery</th>
                                    <th style={{width:150}}>Delivery Taxable?</th>
                                    <th className="text-end" style={{width:160}}>Line Total (pre-tax)</th>
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
                                                value={compMargin[cc.name] ?? ""}
                                                onChange={(e) => setCompMargin(s => ({...s, [cc.name]: e.target.value}))}
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
                                                onChange={(e) => setCompDelivery(s => ({...s, [cc.name]: e.target.value}))}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <Form.Check
                                                type="switch"
                                                checked={!!compDeliveryTaxable[cc.name]}
                                                onChange={(e) => setCompDeliveryTaxable(s => ({...s, [cc.name]: e.target.checked}))}
                                                disabled={!includeDelivery}
                                                label=""
                                            />
                                        </td>
                                        <td className="text-end align-middle">{cc.lineTotalBeforeTax.toLocaleString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </Table>

                            {/* Global toggles/rates */}
                            <Row className="g-3 mt-2">
                                <Col md={3}>
                                    <Form.Check
                                        type="switch"
                                        label="Include Delivery"
                                        checked={includeDelivery}
                                        onChange={(e)=>setIncludeDelivery(e.target.checked)}
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Check
                                        type="switch"
                                        label="Include VAT"
                                        checked={includeVat}
                                        onChange={(e)=>setIncludeVat(e.target.checked)}
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Check
                                        type="switch"
                                        label="Include Tax"
                                        checked={includeTax}
                                        onChange={(e)=>setIncludeTax(e.target.checked)}
                                    />
                                </Col>
                                <Col md={3} />
                            </Row>

                            <Row className="g-3 mt-2">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>VAT %</Form.Label>
                                        <Form.Control
                                            type="number" min="0" step="0.01"
                                            value={vatPercent}
                                            onChange={(e)=>setVatPercent(e.target.value)}
                                            disabled={!includeVat}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Tax %</Form.Label>
                                        <Form.Control
                                            type="number" min="0" step="0.01"
                                            value={taxPercent}
                                            onChange={(e)=>setTaxPercent(e.target.value)}
                                            disabled={!includeTax}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>

                        {/* Totals footer */}
                        <Row className="g-3 mt-3">
                            <Col md={12} className="d-flex align-items-end justify-content-end">
                                <div className="text-end">
                                    <div>Subtotal (Σ qty × unit): <strong>{totals.rawSubtotal.toLocaleString()}</strong></div>
                                    <div>After Margin: <strong>{totals.withMargin.toLocaleString()}</strong></div>
                                    <div>Taxable Base (incl. taxable delivery): <strong>{totals.taxableBase.toLocaleString()}</strong></div>
                                    {totals.nonTaxable > 0 && (
                                        <div>Non-Taxable (delivery): <strong>{totals.nonTaxable.toLocaleString()}</strong></div>
                                    )}
                                    {includeTax && (
                                        <div>+ Tax ({Number(taxPercent || 0)}%): <strong>{totals.taxAmount.toLocaleString()}</strong></div>
                                    )}
                                    {includeVat && (
                                        <div>+ VAT ({Number(vatPercent || 0)}%): <strong>{totals.vatAmount.toLocaleString()}</strong></div>
                                    )}
                                    <div className="fs-5 mt-1">Grand Total: <strong>{totals.grand.toLocaleString()}</strong></div>
                                </div>
                            </Col>
                        </Row>

                        <div className="mt-3 d-flex justify-content-between">
                            <div className="small text-muted">Tip: Columns are components; rename or add more as needed.</div>
                            <div>
                                <Button variant="primary" onClick={saveEstimation}>Save</Button>
                            </div>
                        </div>
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

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
