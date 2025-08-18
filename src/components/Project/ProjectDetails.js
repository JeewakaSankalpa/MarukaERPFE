// src/components/projects/ProjectDetails.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Row, Col, Card, Button, Badge, Table, Spinner, ProgressBar, Form, Modal, InputGroup
} from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

/* ---------- Helpers ---------- */
const extractFileName = (urlOrName) => {
    if (!urlOrName) return '(unnamed)';
    try {
        const withoutQuery = (urlOrName || '').split('?')[0];
        const base = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
        return decodeURIComponent(base);
    } catch {
        return urlOrName;
    }
};

// Normalize labels like "file1 (need 2)" -> "file1"
const normalizeLabel = (s) => (String(s || '').split(' (need')[0].trim());

// helper: convert ISO to local datetime-local input value
function isoLocal(iso) {
    try {
        const d = new Date(iso);
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch { return ''; }
}

/* ---------- Upload overlay ---------- */
function UploadOverlay({ text }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                zIndex: 2050,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div className="bg-white p-4 rounded shadow" style={{ minWidth: 280, textAlign: 'center' }}>
                <div className="spinner-border mb-3" role="status" />
                <div className="fw-semibold">{text || 'Uploading…'}</div>
                <div className="text-muted small">Please keep this tab open</div>
            </div>
        </div>
    );
}

/* ---------- Files block (stage-scoped + payments merged) ---------- */
function FilesSection({ id, actions, stageObj, roleHeader, onAfterChange, reloadKey }) {
    const fileInputRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);

    const [docType, setDocType] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);

    const stageType = stageObj?.stageType;

    const ruleOptions = useMemo(() => {
        const reqs = stageType ? (actions?.fileRequirements?.[stageType] || []) : [];
        if (Array.isArray(reqs) && reqs.length > 0) {
            return reqs
                .map(r => {
                    const label = normalizeLabel(r?.label ?? r?.key ?? '');
                    if (!label) return null;
                    const min = r?.required ? Math.max(1, r?.minCount ?? 1) : Math.max(0, r?.minCount ?? 0);
                    return { value: label, label, min };
                })
                .filter(Boolean);
        }
        const missing = Array.isArray(actions?.missingFiles) ? actions.missingFiles : [];
        const uniq = [...new Set(missing.map(normalizeLabel).filter(Boolean))];
        return uniq.map(label => ({ value: label, label, min: 1 }));
    }, [actions?.fileRequirements, actions?.missingFiles, stageType]);

    const loadFiles = async () => {
        if (!id) {
            toast.info('No project id to load files.');
            return;
        }
        try {
            setFilesLoading(true);

            // Stage-scoped project files
            const res = await api.get(`/projects/${id}/files`, { headers: roleHeader });
            const rawList = Array.isArray(res.data) ? res.data : [];
            const projectFiles = rawList.map(x => {
                const name = extractFileName(x.url || x.storedName || x.originalName);
                return {
                    displayName: name,
                    url: x.url,
                    docType: x.docType || '',
                    _kind: 'file'
                };
            });

            // Payments (no stage)
            let paymentFiles = [];
            try {
                const pres = await api.get(`/project-accounts/${id}/payments`);
                const payments = Array.isArray(pres.data) ? pres.data : [];
                paymentFiles = payments
                    .filter(p => p.fileUrl)
                    .map(p => ({
                        displayName: extractFileName(p.fileName || p.fileUrl) || 'Payment.pdf',
                        url: p.fileUrl,
                        docType: 'Payment',
                        _kind: 'payment',
                        _paidAt: p.paidAt
                    }));
            } catch {
                // ignore if not ready
            }

            const list = [...projectFiles, ...paymentFiles];
            list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
            setFiles(list);
            toast.success('Files loaded');
        } catch (e) {
            console.error(e);
            toast.error('Failed to load files');
        } finally {
            setFilesLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadFiles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, stageType, reloadKey]);

    useEffect(() => {
        if (!stageType || !actions) return;
        if (docType) return;
        const firstMissing = Array.isArray(actions.missingFiles) && actions.missingFiles.length
            ? normalizeLabel(actions.missingFiles[0])
            : null;
        if (firstMissing) { setDocType(firstMissing); return; }
        if (ruleOptions.length > 0) setDocType(ruleOptions[0].value);
        else toast.info('No file rules for this stage.');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stageType, actions, ruleOptions]);

    const chooseFiles = () => {
        if (!docType) { toast.warn('Select a file type before uploading.'); return; }
        fileInputRef.current?.click();
    };

    const onFilesChosen = async (e) => {
        const stage = stageObj?.stageType;
        const picked = Array.from(e.target.files || []);
        if (!id || picked.length === 0) return;

        if (!stage) {
            toast.warn('No current stage available for upload.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        if (!docType) {
            toast.warn('Select a file type before uploading.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            const previewPayload = {
                stage,
                docType,
                files: picked.map(f => ({ originalName: f.name })),
            };
            const previewRes = await api.post(`/projects/${id}/files/preview-names`, previewPayload, {
                headers: roleHeader,
            });
            const previews = previewRes.data || [];
            if (!previews.length) {
                toast.error('Preview failed: no names returned');
                return;
            }
            const previewText = previews.map(p => `• ${p.originalName} → ${p.previewName}`).join('\n');
            const ok = window.confirm(
                `File Type (docType): ${docType}\nStage: ${stage}\n\nThese files will be renamed as:\n\n${previewText}\n\nContinue?`
            );
            if (!ok) { toast.info('Upload cancelled'); return; }

            setUploading(true);
            setUploadPct(0);
            const form = new FormData();
            picked.forEach(f => form.append('files', f, f.name));

            const url = `/projects/${id}/files/upload?stage=${encodeURIComponent(stage)}&docType=${encodeURIComponent(docType)}`;
            await api.post(url, form, {
                headers: roleHeader,
                transformRequest: v => v,
                onUploadProgress: (evt) => {
                    if (!evt || !evt.total) return;
                    const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
                    setUploadPct(pct);
                }
            });

            toast.success('Files uploaded successfully');
            if (fileInputRef.current) fileInputRef.current.value = '';
            await Promise.all([loadFiles(), onAfterChange?.()]);
        } catch (err) {
            console.error(err);
            const msg = err?.response?.data?.message || err?.message || 'Failed to upload files';
            toast.error(msg);
        } finally {
            setUploading(false);
            setUploadPct(0);
        }
    };

    return (
        <>
            {uploading && <UploadOverlay text={`Uploading… ${uploadPct}%`} />}

            <div className="d-flex gap-2 align-items-center mb-2">
                <Form.Select
                    size="sm"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    style={{ width: 320 }}
                    title="Select required file name (from rules or missing list)"
                    disabled={!actions || !stageType}
                >
                    {ruleOptions.length === 0 ? (
                        <option value="">— No file rules or missing items —</option>
                    ) : (
                        ruleOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))
                    )}
                </Form.Select>

                <div className="small text-muted">
                    Selected file type: <strong>{docType || '—'}</strong>
                </div>

                <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={loadFiles}
                    disabled={filesLoading || !id}
                >
                    {filesLoading ? 'Loading…' : (files.length ? 'Reload files' : 'Load files')}
                </Button>

                <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={!id || !stageType || !docType || uploading}
                    onClick={chooseFiles}
                    title={stageType ? 'Upload files for current stage' : 'No current stage'}
                >
                    {uploading ? 'Uploading…' : 'Upload Files'}
                </Button>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={onFilesChosen}
                />
            </div>

            {(!id) && <div className="text-muted">No project id provided.</div>}
            {(id && files.length === 0 && !filesLoading) && (
                <div className="text-muted">Not loaded or no files.</div>
            )}

            {files.length > 0 && (
                <Table size="sm" bordered responsive>
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th style={{ width: 140 }}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {files.map((f, idx) => (
                        <tr key={(f.url || '') + (f.displayName || '') + idx}>
                            <td className="text-break">
                                {f._kind === 'payment' ? <Badge bg="success" className="me-2">Payment</Badge> : null}
                                {f.displayName}
                                {f._paidAt ? <span className="text-muted ms-2 small">({new Date(f._paidAt).toLocaleString()})</span> : null}
                            </td>
                            <td className="d-flex gap-2 justify-content-center">
                                <a className="btn btn-sm btn-outline-primary" href={f.url} target="_blank" rel="noreferrer">
                                    View
                                </a>
                                <a className="btn btn-sm btn-success" href={f.url} download>
                                    Download
                                </a>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </>
    );
}

/* ---------- Estimation Card ---------- */
function EstimationCard({ projectId, onOpen }) {
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
    const subtotal = (() => {
        let sum = 0;
        (est?.components || []).forEach(c => {
            (c.items || []).forEach(it => {
                const unit = Number(it.estUnitCost || 0);
                const qty = Number(it.quantity || 0);
                sum += unit * qty;
            });
        });
        return sum;
    })();
    const delivery = Number(est?.deliveryCost || 0);
    const taxPct = Number(est?.taxPercent || 0);
    const taxAmount = (subtotal + delivery) * (isNaN(taxPct) ? 0 : taxPct / 100);
    const grandTotal = subtotal + delivery + taxAmount;

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
                            <tr>
                                <td>Subtotal</td>
                                <td className="text-end">{subtotal.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td>Delivery</td>
                                <td className="text-end">{delivery.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td>Tax</td>
                                <td className="text-end">
                                    {isNaN(taxPct) ? 0 : taxPct}% = {taxAmount.toLocaleString()}
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Grand Total</strong></td>
                                <td className="text-end"><strong>{grandTotal.toLocaleString()}</strong></td>
                            </tr>
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

/* ---------- Project Accounts Card (payments only) ---------- */
function ProjectAccountsCard({ projectId, onPaymentPosted }) {
    const { user } = useAuth() || {};
    const actor = user?.name || user?.email || 'web';

    const [acct, setAcct] = useState(null);
    const [loading, setLoading] = useState(false);

    const [showPay, setShowPay] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payDate, setPayDate] = useState(''); // yyyy-MM-dd from <input type="date">
    const [payNote, setPayNote] = useState('');
    const [payFile, setPayFile] = useState(null);
    const [posting, setPosting] = useState(false);

    const load = async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const res = await api.get(`/project-accounts/${projectId}`).catch(() => ({ data: null }));
            setAcct(res?.data || null);
        } catch {
            setAcct(null);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, [projectId]);

    const total = Number(acct?.totalAmount || 0);
    const paid = Number(acct?.paidAmount || 0);
    const remaining = Math.max(0, total - paid);

    const openPayModal = () => {
        setPayAmount('');
        setPayDate('');
        setPayNote('');
        setPayFile(null);
        setShowPay(true);
    };

    const submitPayment = async () => {
        if (!payAmount || !payFile) {
            toast.warn('Amount and PDF are required');
            return;
        }
        try {
            setPosting(true);
            const form = new FormData();
            form.append('amount', String(payAmount));

            // Convert date-only to ISO Instant at 00:00:00Z
            if (payDate) {
                const iso = new Date(`${payDate}T00:00:00Z`).toISOString();
                form.append('paidAt', iso);
            }
            if (payNote) form.append('note', payNote);
            form.append('file', payFile, payFile.name); // MUST be 'file' to match controller

            await api.post(`/project-accounts/${projectId}/payments/upload`, form, {
                headers: { 'X-User': actor },      // let Axios set multipart boundary
                transformRequest: v => v
            });
            toast.success('Payment posted');
            setShowPay(false);
            await load();
            onPaymentPosted?.();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to post payment');
        } finally {
            setPosting(false);
        }
    };

    return (
        <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Project Accounts</span>
                <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-secondary" onClick={load} disabled={loading}>
                        {loading ? 'Loading…' : 'Reload'}
                    </Button>
                    <Button size="sm" variant="primary" onClick={openPayModal} disabled={!projectId}>
                        Post Payment (PDF)
                    </Button>
                </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto' }}>
                {!projectId && <div className="text-muted">No project id provided.</div>}
                {projectId && loading && (
                    <div className="small text-muted"><Spinner size="sm" className="me-2" /> Loading…</div>
                )}
                {projectId && !loading && !acct && (
                    <div className="text-muted">No account record yet.</div>
                )}

                {acct && !loading && (
                    <Table size="sm" bordered responsive className="mb-2">
                        <tbody>
                        <tr>
                            <td>Total Project Amount</td>
                            <td className="text-end">{Number(acct.totalAmount || 0).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Paid Amount</td>
                            <td className="text-end">{Number(acct.paidAmount || 0).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td><strong>Remaining Payable</strong></td>
                            <td className="text-end"><strong>{remaining.toLocaleString()}</strong></td>
                        </tr>
                        </tbody>
                    </Table>
                )}

                {acct?.updatedAt && (
                    <div className="small text-muted">
                        Last update: {new Date(acct.updatedAt).toLocaleString()} {acct.updatedBy ? `by ${acct.updatedBy}` : ''}
                    </div>
                )}
            </Card.Body>

            {/* Post Payment Modal */}
            <Modal show={showPay} onHide={() => setShowPay(false)} centered>
                <Modal.Header closeButton><Modal.Title>Post Payment</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-2">
                        <Form.Label>Amount</Form.Label>
                        <InputGroup>
                            <InputGroup.Text>₹</InputGroup.Text>
                            <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                value={payAmount}
                                onChange={(e)=>setPayAmount(e.target.value)}
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label>Paid Date</Form.Label>
                        <Form.Control
                            type="date"
                            value={payDate}
                            onChange={(e)=>setPayDate(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label>Payment Note</Form.Label>
                        <Form.Control
                            placeholder="Reference / narration"
                            value={payNote}
                            onChange={(e)=>setPayNote(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group>
                        <Form.Label>Confirmation (PDF)</Form.Label>
                        <Form.Control
                            type="file"
                            accept="application/pdf"
                            onChange={(e)=>setPayFile(e.target.files?.[0] || null)}
                        />
                        <div className="small text-muted mt-1">Stored under <code>projects/{projectId}/payments/</code> in GCS.</div>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={()=>setShowPay(false)} disabled={posting}>Cancel</Button>
                    <Button variant="primary" onClick={submitPayment} disabled={posting}>
                        {posting ? 'Posting…' : 'Post Payment'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
}

export default function ProjectDetails({ id: propId }) {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const id = propId || routeId;

    const { role, user } = useAuth();
    const actor = user?.name || user?.email || 'web';

    const [project, setProject] = useState(null);
    const [actions, setActions] = useState(null);
    const [loading, setLoading] = useState(false);

    const [comment, setComment] = useState('');
    const [approving, setApproving] = useState(false);
    const [moving, setMoving] = useState(false);

    const [filesReloadKey, setFilesReloadKey] = useState(0);

    const [showDates, setShowDates] = useState(false);
    const [estimatedStart, setEstimatedStart] = useState('');
    const [estimatedEnd, setEstimatedEnd] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [p, a] = await Promise.all([
                    api.get(`/projects/details/${id}`),
                    api.get(`/projects/${id}/actions`, { headers: { 'X-Roles': role ?? '' } }),
                ]);
                if (!alive) return;
                setProject(p.data || null);
                setActions(a.data || null);
                toast.success('Project & actions loaded');
            } catch (e) {
                console.error(e);
                toast.error('Failed to load project/actions');
                setProject(null);
                setActions(null);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, role]);

    const refresh = async () => {
        if (!id) return;
        try {
            const [p, a] = await Promise.all([
                api.get(`/projects/details/${id}`),
                api.get(`/projects/${id}/actions`, { headers: { 'X-Roles': role ?? '' } }),
            ]);
            setProject(p.data || null);
            setActions(a.data || null);
            toast.success('Refreshed');
        } catch (e) {
            console.error(e);
            toast.error('Failed to refresh project/actions');
        }
    };

    const approve = async (status) => {
        const stageId = project?.currentStage?.id;
        if (!id || !stageId) { toast.warn('No current stage to approve/reject.'); return; }
        setApproving(true);
        try {
            await api.post(
                `/projects/${id}/stages/${stageId}/approve`,
                { status, comment },
                { headers: { 'X-Roles': role ?? '' } }
            );
            toast.success(status === 'APPROVED' ? 'Approved' : 'Rejected');
            setComment('');
            await refresh();
        } catch (e) {
            console.error(e);
            toast.error('Failed to submit approval');
        } finally {
            setApproving(false);
        }
    };

    const move = async (to) => {
        if (!id) { toast.warn('No project id to move.'); return; }
        setMoving(true);
        try {
            await api.post(
                `/projects/${id}/move`,
                to ? { to } : {},
                { headers: { 'X-Roles': role ?? '' } }
            );
            toast.success(to ? `Moved to ${to}` : 'Moved to next stage');
            await refresh();
        } catch (e) {
            console.error(e);
            toast.error('Failed to move stage');
        } finally {
            setMoving(false);
        }
    };

    const dueMeta = useMemo(() => {
        if (!project?.dueDate) return null;
        const now = new Date();
        const due = new Date(project.dueDate);
        const start = project?.estimatedStart ? new Date(project.estimatedStart) : now;
        const totalMs = Math.max(1, due - start);
        const usedMs = Math.max(0, now - start);
        const pct = Math.min(100, Math.max(0, Math.round((usedMs / totalMs) * 100)));
        const remainingMs = Math.max(0, due - now);
        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return { pct, label: `${days}d ${hours}h ${mins}m` };
    }, [project]);

    const p = project || {};
    const stageObj = p.currentStage || {};
    const stageList = Array.isArray(p.stages) ? p.stages : [];

    const openDatesModal = () => {
        setEstimatedStart(project?.estimatedStart ? isoLocal(project.estimatedStart) : '');
        setEstimatedEnd(project?.estimatedEnd ? isoLocal(project.estimatedEnd) : '');
        setDueDate(project?.dueDate ? isoLocal(project.dueDate) : '');
        setShowDates(true);
    };
    const saveDates = async () => {
        try {
            const payload = {
                estimatedStart: estimatedStart ? new Date(estimatedStart).toISOString() : null,
                estimatedEnd:   estimatedEnd   ? new Date(estimatedEnd).toISOString()   : null,
                dueDate:        dueDate        ? new Date(dueDate).toISOString()        : null,
            };
            await api.patch(`/projects/${id}/dates`, payload, {
                headers: { 'X-User': actor }
            });
            toast.success('Project dates updated');
            setShowDates(false);
            await refresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to update dates');
        }
    };

    return (
        <div
            className="p-2"
            style={{ width: '100%', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}
        >
            {loading && (
                <div className="p-2 pb-0 small text-muted">
                    <Spinner size="sm" className="me-2" /> Loading…
                </div>
            )}

            <Row className="g-3">
                {/* Project Overview */}
                <Col md={6} lg={4}>
                    <Card className="h-100">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>Project Overview</span>
                            <Button
                                size="sm"
                                variant="outline-primary"
                                disabled={!id}
                                onClick={() => navigate(`/projects/edit/${id}`)}
                            >
                                Edit
                            </Button>
                        </Card.Header>
                        <Card.Body style={{ overflowY: 'auto' }}>
                            <div><strong>ID:</strong> {id || '-'}</div>
                            <div><strong>Name:</strong> {p.projectName || '-'}</div>
                            <div><strong>Client:</strong> {p.customerName || p.customerId || '-'}</div>
                            <div><strong>Sales Rep:</strong> {p.salesRepName || p.salesRep || '-'}</div>

                            <div className="mt-2">
                                <strong>Status:</strong>{' '}
                                <Badge bg="info">{p.status || '-'}</Badge>
                            </div>

                            <div className="mt-2 text-muted small">
                                Stage: {stageObj.stageType || '-'}
                            </div>

                            <div className="mt-2 text-muted small">
                                Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}<br />
                                Updated: {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-'}
                            </div>

                            {p.comment ? <div className="mt-2"><em>{p.comment}</em></div> : null}

                            {!id && <div className="mt-2 text-warning">No project id provided.</div>}
                            {id && !project && !loading && (
                                <div className="mt-2 text-warning">Project not found.</div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Current Status & Actions */}
                <Col md={6} lg={4}>
                    <Card className="h-100">
                        <Card.Header>Current Status & Actions</Card.Header>
                        <Card.Body style={{ overflowY: 'auto' }}>
                            <div className="mb-2">
                                <strong>Stage:</strong> {stageObj.stageType || '-'}
                            </div>

                            {actions ? (
                                <>
                                    {actions?.missingFiles && actions.missingFiles.length > 0 ? (
                                        <div className="alert alert-warning py-2">
                                            <div className="fw-semibold mb-1">Required files missing for this stage:</div>
                                            <ul className="mb-0">
                                                {actions.missingFiles.map((m) => <li key={m}>{m}</li>)}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="small text-success mb-2">All required files are present ✅</div>
                                    )}

                                    <Form.Group className="mb-2">
                                        <Form.Label className="small">Approval comment</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Optional"
                                            disabled={!id || !project}
                                        />
                                    </Form.Group>

                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        <Button
                                            size="sm"
                                            onClick={() => approve('APPROVED')}
                                            disabled={!id || !project || !actions?.canApprove || !actions?.filesOk || approving}
                                        >
                                            Approve
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => approve('REJECTED')}
                                            disabled={!id || !project || !actions?.canReject || approving}
                                        >
                                            Reject
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="warning"
                                            onClick={() => move()}
                                            disabled={!id || !project || !actions?.filesOk || !actions?.canMove?.length || moving}
                                        >
                                            Move to next
                                        </Button>

                                        {(actions?.canMove || []).map((to) => (
                                            <Button
                                                key={to}
                                                size="sm"
                                                variant="outline-warning"
                                                onClick={() => move(to)}
                                                disabled={!id || !project || moving}
                                            >
                                                Move → {to}
                                            </Button>
                                        ))}
                                    </div>

                                    {(!actions.canApprove && !actions.canReject && (!actions.canMove || actions.canMove.length === 0)) && (
                                        <div className="text-muted mt-2">No actions available for your role.</div>
                                    )}
                                </>
                            ) : (
                                <div className="text-muted">
                                    Actions are not loaded yet or unavailable. Make sure the backend endpoint
                                    <code> /api/projects/{id}/actions</code> returns permissions for your role.
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Timeline (with Edit Dates button) */}
                <Col md={12} lg={4}>
                    <Card className="h-100">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>Timeline</span>
                            <Button size="sm" variant="outline-primary" onClick={openDatesModal} disabled={!id}>
                                Edit Dates
                            </Button>
                        </Card.Header>
                        <Card.Body style={{ overflowY: 'auto' }}>
                            <div><strong>Est. Start:</strong> {p.estimatedStart ? new Date(p.estimatedStart).toLocaleDateString() : '-'}</div>
                            <div><strong>Est. End:</strong> {p.estimatedEnd ? new Date(p.estimatedEnd).toLocaleDateString() : '-'}</div>
                            <div><strong>Due Date:</strong> {p.dueDate ? new Date(p.dueDate).toLocaleString() : '-'}</div>

                            {dueMeta ? (
                                <div className="mt-3">
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span>Progress to Due</span>
                                        <span>{dueMeta.pct}%</span>
                                    </div>
                                    <ProgressBar now={dueMeta.pct} />
                                    <div className="small text-muted mt-1">Time left: {dueMeta.label}</div>
                                </div>
                            ) : (
                                <div className="small text-muted mt-3">No due date data.</div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Files & Estimation row */}
            <Row className="g-3 mt-1">
                <Col lg={6}>
                    <Card className="h-100">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>Files</span>
                            <Badge bg="secondary">{stageObj?.stageType || '—'}</Badge>
                        </Card.Header>
                        <Card.Body style={{ overflowY: 'auto' }}>
                            <FilesSection
                                id={id}
                                actions={actions}
                                stageObj={stageObj}
                                roleHeader={{ 'X-Roles': role ?? '' }}
                                onAfterChange={refresh}
                                reloadKey={filesReloadKey}
                            />
                        </Card.Body>
                    </Card>
                </Col>

                {/* Estimation summary / actions */}
                <Col lg={6}>
                    <EstimationCard projectId={id} onOpen={() => { /* optional hook */ }} />
                </Col>
            </Row>

            {/* Project Accounts (payments) */}
            <Row className="g-3 mt-1">
                <Col lg={12}>
                    <ProjectAccountsCard
                        projectId={id}
                        onPaymentPosted={() => setFilesReloadKey(k => k + 1)}
                    />
                </Col>
            </Row>

            {/* Approvals history */}
            <Row className="g-3 mt-1">
                <Col lg={12}>
                    <Card className="h-100">
                        <Card.Header>Approval Stages</Card.Header>
                        <Card.Body style={{ overflowY: 'auto' }}>
                            {!id && <div className="text-muted">No project id provided.</div>}

                            {id && (!stageList.length) && (
                                <div className="text-muted">No stage history.</div>
                            )}

                            {stageList.length > 0 && (
                                <Table size="sm" bordered responsive>
                                    <thead>
                                    <tr>
                                        <th>Stage</th>
                                        <th>Approver (Role)</th>
                                        <th>Status</th>
                                        <th>When</th>
                                        <th>Comment</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {stageList.map((stg) =>
                                        (stg.approvals || []).map((a) => (
                                            <tr key={`${stg.id || stg.stageType}-${a.approverId}-${a.timestamp || Math.random()}`}>
                                                <td>{stg.stageType}</td>
                                                <td>{a.approverName ? `${a.approverName} (${a.approverRole})` : `${a.approverId} (${a.approverRole})`}</td>
                                                <td>{a.status}</td>
                                                <td>{a.timestamp ? new Date(a.timestamp).toLocaleString() : '-'}</td>
                                                <td className="text-break">{a.comments || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Edit Dates Modal (in Timeline) */}
            <Modal show={showDates} onHide={() => setShowDates(false)} centered>
                <Modal.Header closeButton><Modal.Title>Edit Project Dates</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-2">
                        <Form.Label>Estimated Start</Form.Label>
                        <Form.Control type="datetime-local" value={estimatedStart} onChange={(e)=>setEstimatedStart(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                        <Form.Label>Estimated End</Form.Label>
                        <Form.Control type="datetime-local" value={estimatedEnd} onChange={(e)=>setEstimatedEnd(e.target.value)} />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Due Date</Form.Label>
                        <Form.Control type="datetime-local" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={()=>setShowDates(false)}>Cancel</Button>
                    <Button variant="primary" onClick={saveDates}>Save</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
