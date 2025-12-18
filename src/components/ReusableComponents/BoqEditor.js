import React, { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { Row, Col, Button, Form, Table, Badge, Modal } from "react-bootstrap";
import Select from "react-select";
import { toast } from "react-toastify";

/**
 * BoqEditor (Bill of Quantities Editor)
 * Shared component for Project Estimations and Sales Quotations.
 * 
 * Props:
 * - initialData: Object (loaded estimation/quote)
 * - products: Array (product master)
 * - availMap: Object (productId -> qty)
 * - productById: Object (productId -> product)
 * - showPriceColumn: Boolean (true for Quote, false/optional for Est) - TODO: Add this later for Sales
 * - readOnly: Boolean
 * - onChange: (payload) => void (Optional, if we want real-time updates)
 */
const BoqEditor = forwardRef(({ initialData, products, availMap, productById, readOnly = false }, ref) => {
    // State
    const [components, setComponents] = useState(["Component A"]);
    const [rows, setRows] = useState([]); // { productId, productOption, estUnitCost, ... quantities }

    // Global Knobs
    const [includeDelivery, setIncludeDelivery] = useState(true);
    const [includeVat, setIncludeVat] = useState(true);
    const [includeTax, setIncludeTax] = useState(false);
    const [vatPercent, setVatPercent] = useState("");
    const [taxPercent, setTaxPercent] = useState("");

    // Per-component Controls
    const [compMargin, setCompMargin] = useState({});
    const [compDelivery, setCompDelivery] = useState({});
    const [compDeliveryTaxable, setCompDeliveryTaxable] = useState({});

    // --- Initialization ---
    useEffect(() => {
        if (!initialData) return;
        const d = initialData;

        // Components
        const compNames = (d.components || []).map(c => c.name?.trim() || "Component");
        const cols = compNames.length ? compNames : ["Component A"];
        setComponents(cols);

        // Global
        if (typeof d.includeDelivery === "boolean") setIncludeDelivery(d.includeDelivery);
        if (typeof d.includeVat === "boolean") setIncludeVat(d.includeVat);
        if (typeof d.includeTax === "boolean") setIncludeTax(d.includeTax);
        if (d.vatPercent != null) setVatPercent(String(d.vatPercent));
        if (d.taxPercent != null) setTaxPercent(String(d.taxPercent));

        // Rows & Component Settings
        const initialMargin = {};
        const initialDelivery = {};
        const initialDelTax = {};
        const rowMap = new Map();

        (d.components || []).forEach(c => {
            const cname = c.name?.trim() || "Component";
            if (c.marginPercent != null) initialMargin[cname] = String(c.marginPercent);
            if (c.deliveryCost != null) initialDelivery[cname] = String(c.deliveryCost);
            if (typeof c.deliveryTaxable === "boolean") initialDelTax[cname] = !!c.deliveryTaxable;

            (c.items || []).forEach(it => {
                if (!it.productId) return;
                if (!rowMap.has(it.productId)) {
                    const p = productById?.[it.productId];
                    rowMap.set(it.productId, {
                        productId: it.productId,
                        productOption: p
                            ? { value: p.id, label: buildProductLabel(p) }
                            : { value: it.productId, label: it.productNameSnapshot || it.productId },
                        estUnitCost: it.estUnitCost ?? "",
                        quantities: {}
                    });
                }
                const r = rowMap.get(it.productId);
                r.quantities[cname] = (r.quantities[cname] || 0) + (it.quantity || 0);
                if (r.estUnitCost === "" && it.estUnitCost != null) r.estUnitCost = it.estUnitCost;
            });
        });
        setCompMargin(initialMargin);
        setCompDelivery(initialDelivery);
        setCompDeliveryTaxable(initialDelTax);
        setRows(Array.from(rowMap.values()));

    }, [initialData, productById]);

    // --- Helpers ---
    const buildProductLabel = (p) => {
        const sku = p?.sku ? ` • ${p.sku}` : "";
        return `${p?.name || p?.id}${sku}`;
    };

    const deriveSuggestedCost = (p) => {
        if (!p) return undefined;
        // prefer last purchase price -> lastCost -> standard -> average -> unit -> cost -> price
        const cands = [p.lastPurchasePrice, p.lastCost, p.standardCost, p.averageCost, p.unitCost, p.cost, p.price];
        const n = cands.find(v => v !== null && v !== undefined && !Number.isNaN(Number(v)));
        return n !== undefined ? Number(n) : undefined;
    };

    const productOptions = useMemo(() =>
        (products || []).map(p => ({ value: p.id, label: buildProductLabel(p) })),
        [products]);

    // --- Matrix Ops ---
    const addComponent = () => {
        const base = "Component";
        let i = components.length + 1;
        let name = `${base} ${i}`;
        while (components.includes(name)) { i++; name = `${base} ${i}`; }
        setComponents([...components, name]);
    };

    const renameComponent = (idx, newNameRaw) => {
        const oldName = components[idx];
        const newName = newNameRaw?.trim() || oldName;
        // Prevent duplicate names? For now just allow it but it might merge data
        setComponents(cols => cols.map((c, i) => i === idx ? newName : c));
        if (oldName !== newName) {
            // Migrate Row Data
            setRows(rs => rs.map(r => {
                const q = { ...r.quantities };
                if (q[oldName]) {
                    q[newName] = (q[newName] || 0) + q[oldName];
                    delete q[oldName];
                }
                return { ...r, quantities: q };
            }));
            // Migrate Settings
            const migrate = (setter) => setter(s => {
                const x = { ...s };
                if (x[oldName]) { x[newName] = x[oldName]; delete x[oldName]; }
                return x;
            });
            migrate(setCompMargin);
            migrate(setCompDelivery);
            migrate(setCompDeliveryTaxable);
        }
    };

    const removeComponent = (idx) => {
        const name = components[idx];
        setComponents(cols => cols.filter((_, i) => i !== idx));
        // Remove from rows
        setRows(rs => rs.map(r => {
            const q = { ...r.quantities };
            delete q[name];
            return { ...r, quantities: q };
        }));
        // Remove settings
        const del = (setter) => setter(s => { const x = { ...s }; delete x[name]; return x; });
        del(setCompMargin); del(setCompDelivery); del(setCompDeliveryTaxable);
    };

    const addRow = () => setRows([...rows, { productId: "", quantities: {} }]);
    const removeRow = (i) => setRows(rs => rs.filter((_, idx) => idx !== i));

    const setRowField = (i, key, val) => setRows(rs => {
        const cp = [...rs]; cp[i] = { ...cp[i], [key]: val }; return cp;
    });

    const setQty = (i, c, val) => setRows(rs => {
        const cp = [...rs];
        const q = { ...(cp[i].quantities || {}) };
        q[c] = Math.max(0, Number(val || 0));
        cp[i] = { ...cp[i], quantities: q };
        return cp;
    });

    const onPickProduct = (rowIndex, option) => {
        if (!option) {
            setRows(rs => {
                const cp = [...rs];
                cp[rowIndex] = { ...cp[rowIndex], productId: "", productOption: null, suggestedCost: undefined, storeAvail: undefined };
                return cp;
            });
            return;
        }
        const pid = option.value;
        const p = productById[pid];
        const suggested = deriveSuggestedCost(p);

        setRows(rs => {
            const cp = [...rs];
            const next = {
                ...cp[rowIndex],
                productId: pid,
                productOption: option,
                suggestedCost: suggested,
                storeAvail: (availMap && typeof availMap[pid] === "number") ? availMap[pid] : undefined
            };
            if (!next.estUnitCost && suggested !== undefined) next.estUnitCost = String(suggested);
            cp[rowIndex] = next;
            return cp;
        });
    };

    // --- Calculations ---
    const compCalcs = useMemo(() => {
        return components.map(cname => {
            const subtotal = rows.reduce((acc, r) => acc + (Number(r.estUnitCost || 0) * (Number((r.quantities || {})[cname] || 0))), 0);
            const mPct = Number(compMargin[cname] || 0);
            const mAmt = subtotal * (isNaN(mPct) ? 0 : mPct / 100);
            const afterMargin = subtotal + mAmt;

            const del = Number(compDelivery[cname] || 0);
            const delTaxable = !!compDeliveryTaxable[cname];

            const taxableAdd = (includeDelivery && delTaxable) ? del : 0;
            const nonTaxableAdd = (includeDelivery && !delTaxable) ? del : 0;

            return {
                name: cname,
                subtotal, marginPct: mPct, marginAmount: mAmt, afterMargin,
                delivery: del, deliveryTaxable: delTaxable,
                taxablePortion: afterMargin + taxableAdd,
                nonTaxablePortion: nonTaxableAdd,
                lineTotalBeforeTax: afterMargin + (includeDelivery ? del : 0)
            };
        });
    }, [components, rows, compMargin, compDelivery, compDeliveryTaxable, includeDelivery]);

    const totals = useMemo(() => {
        const taxableBase = compCalcs.reduce((a, c) => a + c.taxablePortion, 0);
        const nonTaxable = compCalcs.reduce((a, c) => a + c.nonTaxablePortion, 0);
        const vatPctNum = Number(vatPercent || 0);
        const taxPctNum = Number(taxPercent || 0);

        const vatAmount = includeVat ? taxableBase * (isNaN(vatPctNum) ? 0 : vatPctNum / 100) : 0;
        const taxAmount = includeTax ? taxableBase * (isNaN(taxPctNum) ? 0 : taxPctNum / 100) : 0;
        const grand = taxableBase + nonTaxable + vatAmount + taxAmount;

        return { taxableBase, nonTaxable, vatAmount, taxAmount, grand };
    }, [compCalcs, includeVat, includeTax, vatPercent, taxPercent]);

    // --- Expose Data via Ref ---
    useImperativeHandle(ref, () => ({
        getPayload: () => toPayload(),
        getTotals: () => totals
    }));

    const toPayload = () => {
        const toBigDec = (val) => (val === "" || val == null || isNaN(Number(val))) ? null : String(val);

        const comps = components.map(cname => {
            const items = [];
            rows.forEach(r => {
                const qty = Number((r.quantities || {})[cname] || 0);
                if (r.productId && qty > 0) {
                    items.push({
                        productId: r.productId,
                        productNameSnapshot: r.productOption?.label || r.productId,
                        quantity: qty,
                        estUnitCost: toBigDec(r.estUnitCost)
                    });
                }
            });

            return {
                name: cname,
                note: "",
                marginPercent: toBigDec(compMargin[cname]),
                deliveryCost: toBigDec(compDelivery[cname]),
                deliveryTaxable: !!compDeliveryTaxable[cname],
                items
            };
        });

        return {
            components: comps,
            includeDelivery, includeVat, includeTax,
            vatPercent: toBigDec(vatPercent),
            taxPercent: toBigDec(taxPercent)
        };
    };

    // --- Render ---
    return (
        <div>
            <div className="d-flex justify-content-end mb-2">
                <Button variant="outline-success" size="sm" onClick={addComponent} disabled={readOnly}>+ Column</Button>
            </div>
            <Table hover responsive size="sm" bordered>
                <thead className="bg-light">
                    <tr>
                        <th style={{ minWidth: 300 }}>Product / Item</th>
                        <th className="text-end" style={{ width: 120 }}>Unit Cost</th>
                        {components.map((c, idx) => (
                            <th key={idx} style={{ width: 140 }}>
                                <div className="d-flex gap-1 align-items-center">
                                    <Form.Control
                                        size="sm"
                                        value={c}
                                        onChange={(e) => renameComponent(idx, e.target.value)}
                                        disabled={readOnly}
                                    />
                                    {!readOnly && <Button size="sm" variant="outline-danger" className="py-0 px-1" onClick={() => removeComponent(idx)}>×</Button>}
                                </div>
                            </th>
                        ))}
                        <th className="text-end" style={{ width: 100 }}>Total</th>
                        {!readOnly && <th style={{ width: 40 }}></th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => {
                        const unit = Number(r.estUnitCost || 0);
                        const totalQty = Object.values(r.quantities || {}).reduce((a, b) => a + Number(b || 0), 0);
                        const rowTotal = unit * totalQty;
                        return (
                            <tr key={i}>
                                <td>
                                    <Select
                                        options={productOptions}
                                        value={r.productOption}
                                        onChange={opt => onPickProduct(i, opt)}
                                        isDisabled={readOnly}
                                        placeholder="Search..."
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        type="number" size="sm" className="text-end"
                                        value={r.estUnitCost} onChange={e => setRowField(i, 'estUnitCost', e.target.value)}
                                        disabled={readOnly}
                                    />
                                </td>
                                {components.map(c => (
                                    <td key={c}>
                                        <Form.Control
                                            type="number" size="sm" className="text-end"
                                            value={(r.quantities || {})[c] ?? 0}
                                            onChange={e => setQty(i, c, e.target.value)}
                                            disabled={readOnly}
                                            style={{ color: ((r.quantities || {})[c]) > 0 ? 'black' : '#ccc' }}
                                        />
                                    </td>
                                ))}
                                <td className="text-end fw-bold">{rowTotal.toLocaleString()}</td>
                                {!readOnly && <td className="text-center"><Button variant="link" className="text-danger p-0" onClick={() => removeRow(i)}>×</Button></td>}
                            </tr>
                        );
                    })}
                </tbody>
                {!readOnly && <tfoot><tr><td colSpan={100}><Button variant="outline-secondary" size="sm" onClick={addRow}>+ Add Row</Button></td></tr></tfoot>}
            </Table>

            {/* Totals Section */}
            <div className="bg-light rounded p-3 mt-3 border">
                <h6>Component Totals</h6>
                <Table size="sm" responsive bordered className="mb-0 bg-white">
                    <thead>
                        <tr>
                            <th>Component</th>
                            <th className="text-end">Subtotal</th>
                            <th style={{ width: 120 }}>Margin %</th>
                            <th className="text-end">After Margin</th>
                            <th style={{ width: 120 }}>Delivery</th>
                            <th className="text-center" style={{ width: 100 }}>Tax Del?</th>
                            <th className="text-end">Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {compCalcs.map(cc => (
                            <tr key={cc.name}>
                                <td>{cc.name}</td>
                                <td className="text-end">{cc.subtotal.toLocaleString()}</td>
                                <td><Form.Control size="sm" type="number" className="text-end" value={compMargin[cc.name] || ""} onChange={e => setCompMargin(s => ({ ...s, [cc.name]: e.target.value }))} disabled={readOnly} /></td>
                                <td className="text-end bg-light">{cc.afterMargin.toLocaleString()}</td>
                                <td><Form.Control size="sm" type="number" className="text-end" value={compDelivery[cc.name] || ""} onChange={e => setCompDelivery(s => ({ ...s, [cc.name]: e.target.value }))} disabled={readOnly} /></td>
                                <td className="text-center"><Form.Check type="switch" checked={!!compDeliveryTaxable[cc.name]} onChange={e => setCompDeliveryTaxable(s => ({ ...s, [cc.name]: e.target.checked }))} disabled={readOnly || !includeDelivery} /></td>
                                <td className="text-end fw-bold">{cc.lineTotalBeforeTax.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {/* Global Settings */}
                <Row className="mt-3">
                    <Col md={3}>
                        <Form.Check type="switch" label="Include Delivery" checked={includeDelivery} onChange={e => setIncludeDelivery(e.target.checked)} disabled={readOnly} />
                        <Form.Check type="switch" label="Include VAT" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} disabled={readOnly} />
                        <Form.Check type="switch" label="Include Other Tax" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} disabled={readOnly} />
                    </Col>
                    <Col md={3}>
                        <Form.Group className="mb-2">
                            <Form.Label className="small">VAT %</Form.Label>
                            <Form.Control size="sm" type="number" value={vatPercent} onChange={e => setVatPercent(e.target.value)} disabled={readOnly || !includeVat} />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label className="small">Tax %</Form.Label>
                            <Form.Control size="sm" type="number" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} disabled={readOnly || !includeTax} />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Table size="sm" borderless className="text-end mb-0">
                            <tbody>
                                <tr><td>Taxable Amount:</td><td>{totals.taxableBase.toLocaleString()}</td></tr>
                                <tr><td>VAT:</td><td>{totals.vatAmount.toLocaleString()}</td></tr>
                                <tr><td>Other Tax:</td><td>{totals.taxAmount.toLocaleString()}</td></tr>
                                <tr className="fw-bold fs-5 border-top"><td>Grand Total:</td><td>{totals.grand.toLocaleString()}</td></tr>
                            </tbody>
                        </Table>
                    </Col>
                </Row>
            </div>
        </div>
    );
});

export default BoqEditor;
