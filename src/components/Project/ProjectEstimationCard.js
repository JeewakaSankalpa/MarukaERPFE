import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

/**
 * Component to display project estimation details.
 * Allows viewing, editing, or creating estimations.
 *
 * @component
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Function} props.onOpen - Callback when opening editor
 */
export default function ProjectEstimationCard({ projectId, onOpen, readOnly, currency = 'LKR' }) {
    const navigate = useNavigate();
    const [est, setEst] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const res = await api.get(`/estimations/by-project/${projectId}`).catch(() => ({ data: null }));
            setEst(res?.data || null);
        } catch {
            setEst(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openEditor = () => {
        // If readOnly, append query param
        const url = `/projects/estimation/${projectId}${readOnly ? '?readOnly=true' : ''}`;
        navigate(url);
        onOpen?.();
    };

    const createNew = () => {
        if (readOnly) return; // Should be hidden anyway
        navigate(`/projects/estimation/${projectId}?new=1`);
        onOpen?.();
    };

    const componentsCount = (est?.components || []).length;
    const totalLines = (est?.components || []).reduce((acc, c) => acc + (c.items?.length || 0), 0);

    // Helper to safely get number
    const val = (n) => Number(n || 0);
    const money = (n) => val(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const roundMoney = (n) => Math.round(val(n) * 100) / 100;
    const decimalTotal = (values = []) =>
        values.reduce((sum, value) => roundMoney(sum + roundMoney(value)), 0);
    const components = est?.components || [];
    const componentQuantity = (component) => Math.max(1, val(component?.quantity) || 1);
    const componentTotals = (component) => {
        const qty = componentQuantity(component);
        const itemsSubtotal = (component?.items || []).reduce(
            (sum, item) => decimalTotal([sum, val(item?.estUnitCost) * val(item?.quantity) * qty]),
            0
        );
        if (component?.items?.length) {
            const overheadAmount = roundMoney(itemsSubtotal * (val(component?.overheadPercent) / 100));
            const baseForMargin = decimalTotal([itemsSubtotal, overheadAmount]);
            const marginAmount = roundMoney(baseForMargin * (val(component?.marginPercent) / 100));
            const delivery = est?.includeDelivery !== false ? roundMoney(val(component?.deliveryCost) * qty) : 0;
            const freight = est?.includeFreight !== false ? roundMoney(val(component?.freightCost) * qty) : 0;
            return {
                itemsSubtotal,
                subtotalWithMargin: decimalTotal([baseForMargin, marginAmount]),
                delivery,
                deliveryTaxable: component?.deliveryTaxable === true,
                freight,
                freightTaxable: component?.freightTaxable === true,
                lineTotalBeforeTax: decimalTotal([baseForMargin, marginAmount, delivery, freight]),
            };
        }
        const delivery = est?.includeDelivery !== false ? roundMoney(val(component?.deliveryCost) * qty) : 0;
        const freight = est?.includeFreight !== false ? roundMoney(val(component?.freightCost) * qty) : 0;
        return {
            itemsSubtotal: val(component?.itemsSubtotal),
            subtotalWithMargin: val(component?.subtotalWithMargin ?? component?.itemsSubtotal),
            delivery,
            deliveryTaxable: component?.deliveryTaxable === true,
            freight,
            freightTaxable: component?.freightTaxable === true,
            lineTotalBeforeTax: decimalTotal([component?.lineTotalBeforeTax ?? component?.subtotalWithMargin ?? component?.itemsSubtotal, delivery, freight]),
        };
    };
    const displayTotals = (() => {
        let taxableBaseRaw = 0;
        let nonTaxableRaw = 0;
        let subtotalWithMargin = 0;
        let deliveryTotal = 0;
        let freightTotal = 0;

        components.forEach((component) => {
            const totals = componentTotals(component);
            subtotalWithMargin = decimalTotal([subtotalWithMargin, totals.subtotalWithMargin]);
            deliveryTotal = decimalTotal([deliveryTotal, totals.delivery]);
            freightTotal = decimalTotal([freightTotal, totals.freight]);
            taxableBaseRaw = decimalTotal([
                taxableBaseRaw,
                totals.subtotalWithMargin,
                totals.deliveryTaxable ? totals.delivery : 0,
                totals.freightTaxable ? totals.freight : 0,
            ]);
            nonTaxableRaw = decimalTotal([
                nonTaxableRaw,
                totals.deliveryTaxable ? 0 : totals.delivery,
                totals.freightTaxable ? 0 : totals.freight,
            ]);
        });

        const totalBeforeDiscount = decimalTotal([taxableBaseRaw, nonTaxableRaw]);
        const discountAmount = roundMoney(totalBeforeDiscount * (val(est?.discountPercent) / 100));
        let taxableBase = taxableBaseRaw;
        let nonTaxable = nonTaxableRaw;
        if (totalBeforeDiscount > 0) {
            const taxableRatio = taxableBaseRaw / totalBeforeDiscount;
            taxableBase = roundMoney(taxableBase - roundMoney(discountAmount * taxableRatio));
            nonTaxable = roundMoney(nonTaxable - roundMoney(discountAmount * (1 - taxableRatio)));
        }
        const vatAmount = est?.includeVat !== false ? roundMoney(taxableBase * (val(est?.vatPercent) / 100)) : 0;
        const taxAmount = est?.includeTax === true ? roundMoney(taxableBase * (val(est?.taxPercent) / 100)) : 0;

        return {
            subtotalWithMargin,
            deliveryTotal,
            freightTotal,
            discountAmount,
            vatAmount,
            taxAmount,
            grandTotal: decimalTotal([taxableBase, nonTaxable, vatAmount, taxAmount]),
        };
    })();

    // If computed fields are present (new format), use the authoritative saved total.
    const hasComputed = est?.computedGrandTotal != null;
    const grandTotal = hasComputed ? val(est.computedGrandTotal) : displayTotals.grandTotal;

    const renderRows = () => {
        if (!hasComputed) {
            // Fallback for old data or unsaved estimations
            const subtotal = components.reduce((acc, c) => {
                return acc + (c.items || []).reduce((s, it) => s + (val(it.estUnitCost) * val(it.quantity)), 0);
            }, 0);
            // Old model didn't have root delivery, but if it did:
            const delivery = val(est?.deliveryCost);
            const freight = val(est?.freightCost);
            const taxPct = val(est?.taxPercent); // VAT
            const taxAmt = (subtotal + delivery + freight) * (taxPct / 100);
            const grand = subtotal + delivery + freight + taxAmt;

            return (
                <>
                    <tr><td>Subtotal (Est)</td><td className="text-end">{money(subtotal)}</td></tr>
                    <tr><td>Delivery</td><td className="text-end">{money(delivery)}</td></tr>
                    <tr><td>Freight</td><td className="text-end">{money(freight)}</td></tr>
                    <tr><td>VAT ({taxPct}%)</td><td className="text-end">{money(taxAmt)}</td></tr>
                    <tr><td><strong>Grand Total</strong></td><td className="text-end"><strong>{money(grand)}</strong></td></tr>
                    <tr><td colSpan="2" className="text-center text-warning small">Please Edit & Save to update details</td></tr>
                </>
            );
        }

        // New Format
        const totalDelivery = displayTotals.deliveryTotal;
        const totalFreight = displayTotals.freightTotal;

        return (
            <>
                {components.map((c, idx) => (
                    <tr key={idx}>
                        <td>{c.name || `Component ${idx + 1}`}</td>
                        <td className="text-end">
                            {currency} {money(componentTotals(c).subtotalWithMargin)}
                        </td>
                    </tr>
                ))}

                {totalDelivery > 0 && (
                    <tr>
                        <td>Delivery</td>
                        <td className="text-end">{currency} {money(totalDelivery)}</td>
                    </tr>
                )}
                {totalFreight > 0 && (
                    <tr>
                        <td>Freight</td>
                        <td className="text-end">{currency} {money(totalFreight)}</td>
                    </tr>
                )}

                {displayTotals.discountAmount > 0 && (
                    <tr className="text-danger">
                        <td>Discount</td>
                        <td className="text-end">-{currency} {money(displayTotals.discountAmount)}</td>
                    </tr>
                )}

                {(displayTotals.vatAmount > 0 || displayTotals.taxAmount > 0) && (
                    <tr>
                        <td>Taxes (VAT/Other)</td>
                        <td className="text-end">
                            {currency} {money(displayTotals.vatAmount + displayTotals.taxAmount)}
                        </td>
                    </tr>
                )}

                <tr>
                    <td><strong>Grand Total</strong></td>
                    <td className="text-end">
                        <strong>{currency} {money(grandTotal)}</strong>
                    </td>
                </tr>
            </>
        );
    };

    return (
        <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Quotations & Estimation {readOnly && <small className="text-muted">(Snapshot)</small>}</span>
                <div className="d-flex gap-2">
                    {est ? (
                        <>
                            <Button size="sm" variant="outline-secondary" onClick={load} disabled={loading}>
                                {loading ? 'Loading…' : 'Reload'}
                            </Button>
                            <Button size="sm" variant="primary" onClick={openEditor}>
                                {readOnly ? "View Details" : "View / Edit"}
                            </Button>
                        </>
                    ) : (
                        !readOnly && (
                            <Button size="sm" variant="primary" onClick={createNew} disabled={!projectId}>
                                Create Estimation
                            </Button>
                        )
                    )}
                </div>
            </Card.Header>

            <Card.Body style={{ overflowY: 'auto' }}>
                {!projectId && <div className="text-muted">No project id provided.</div>}
                {projectId && loading && (
                    <div className="small text-muted"><Spinner size="sm" className="me-2" /> Loading estimation…</div>
                )}
                {projectId && !loading && !est && (
                    <div className="text-muted">No estimation yet for this project.</div>
                )}
                {est && !loading && (
                    <>
                        <div className="mb-2">
                            <strong>Components:</strong> {componentsCount} &nbsp;|&nbsp; <strong>Lines:</strong> {totalLines}
                        </div>
                        <Table size="sm" bordered responsive className="mb-3">
                            <tbody>
                                {renderRows()}
                            </tbody>
                        </Table>

                        <div className="small text-muted">
                            Last updated: {est.updatedAt ? new Date(est.updatedAt).toLocaleString() : '-'}
                        </div>
                    </>
                )}
            </Card.Body>
        </Card>
    );
}
