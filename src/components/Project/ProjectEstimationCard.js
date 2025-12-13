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
export default function ProjectEstimationCard({ projectId, onOpen }) {
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

    useEffect(() => { load(); }, [projectId]);

    const openEditor = () => {
        navigate(`/projects/estimation/${projectId}`);
        onOpen?.();
    };

    const createNew = () => {
        navigate(`/projects/estimation/${projectId}?new=1`);
        onOpen?.();
    };

    const componentsCount = (est?.components || []).length;
    const totalLines = (est?.components || []).reduce((acc, c) => acc + (c.items?.length || 0), 0);

    // Helper to safely get number
    const val = (n) => Number(n || 0);

    // Calculate display values
    const components = est?.components || [];

    // If computed fields are present (new format), use them. Otherwise fallback to simple calc.
    const hasComputed = est?.computedGrandTotal != null;

    const renderRows = () => {
        if (!hasComputed) {
            // Fallback for old data or unsaved estimations
            const subtotal = components.reduce((acc, c) => {
                return acc + (c.items || []).reduce((s, it) => s + (val(it.estUnitCost) * val(it.quantity)), 0);
            }, 0);
            // Old model didn't have root delivery, but if it did:
            const delivery = val(est?.deliveryCost);
            const taxPct = val(est?.taxPercent); // VAT
            const taxAmt = (subtotal + delivery) * (taxPct / 100);
            const grand = subtotal + delivery + taxAmt;

            return (
                <>
                    <tr><td>Subtotal (Est)</td><td className="text-end">{subtotal.toLocaleString()}</td></tr>
                    <tr><td>Delivery</td><td className="text-end">{delivery.toLocaleString()}</td></tr>
                    <tr><td>VAT ({taxPct}%)</td><td className="text-end">{taxAmt.toLocaleString()}</td></tr>
                    <tr><td><strong>Grand Total</strong></td><td className="text-end"><strong>{grand.toLocaleString()}</strong></td></tr>
                    <tr><td colSpan="2" className="text-center text-warning small">Please Edit & Save to update details</td></tr>
                </>
            );
        }

        // New Format
        const totalDelivery = components.reduce((acc, c) => acc + val(c.deliveryCost), 0);

        return (
            <>
                {components.map((c, idx) => (
                    <tr key={idx}>
                        <td>{c.name || `Component ${idx + 1}`}</td>
                        <td className="text-end">
                            {val(c.subtotalWithMargin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                ))}

                {totalDelivery > 0 && (
                    <tr>
                        <td>Delivery</td>
                        <td className="text-end">{totalDelivery.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                )}

                {(val(est.computedVatAmount) > 0 || val(est.computedTaxAmount) > 0) && (
                    <tr>
                        <td>Taxes (VAT/Other)</td>
                        <td className="text-end">
                            {(val(est.computedVatAmount) + val(est.computedTaxAmount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                )}

                <tr>
                    <td><strong>Grand Total</strong></td>
                    <td className="text-end">
                        <strong>{val(est.computedGrandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </td>
                </tr>
            </>
        );
    };

    return (
        <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Estimation</span>
                <div className="d-flex gap-2">
                    {est ? (
                        <>
                            <Button size="sm" variant="outline-secondary" onClick={load} disabled={loading}>
                                {loading ? 'Loading…' : 'Reload'}
                            </Button>
                            <Button size="sm" variant="primary" onClick={openEditor}>View / Edit</Button>
                        </>
                    ) : (
                        <Button size="sm" variant="primary" onClick={createNew} disabled={!projectId}>
                            Create Estimation
                        </Button>
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
