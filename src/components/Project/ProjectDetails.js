// src/components/projects/ProjectDetails.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Row, Col, Card, Button, Badge, Table, Spinner, ProgressBar, Form,
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

/* ---------- Files block (current-stage scoped from backend) ---------- */
function FilesSection({
                          id,
                          actions,
                          stageObj,
                          roleHeader,
                          onAfterChange,
                      }) {
    const fileInputRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);

    const [docType, setDocType] = useState(''); // will be RULE label (or missingFiles label)
    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);

    const stageType = stageObj?.stageType;

    // Build dropdown options from fileRequirements[stage] if present; else from actions.missingFiles
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

        // Fallback: build from missingFiles if no rules are provided
        const missing = Array.isArray(actions?.missingFiles) ? actions.missingFiles : [];
        const uniq = [...new Set(missing.map(normalizeLabel).filter(Boolean))];
        return uniq.map(label => ({ value: label, label, min: 1 }));
    }, [actions?.fileRequirements, actions?.missingFiles, stageType]);

    // Load files from backend (assumed to return current-stage files already)
    const loadFiles = async () => {
        if (!id) {
            toast.info('No project id to load files.');
            return;
        }
        try {
            setFilesLoading(true);

            const res = await api.get(`/projects/${id}/files`, { headers: roleHeader });
            const rawList = Array.isArray(res.data) ? res.data : [];

            const list = rawList.map(x => {
                const name = extractFileName(x.url || x.storedName || x.originalName);
                return {
                    displayName: name,
                    url: x.url,
                    docType: x.docType || '',
                };
            });

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

    // Load files on project or stage change
    useEffect(() => {
        if (id) loadFiles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, stageType]);

    // Default the docType:
    // 1) first missing from actions.missingFiles
    // 2) first option from ruleOptions
    useEffect(() => {
        if (!stageType || !actions) return;
        if (docType) return; // don't clobber user choice

        const firstMissing = Array.isArray(actions.missingFiles) && actions.missingFiles.length
            ? normalizeLabel(actions.missingFiles[0])
            : null;

        if (firstMissing) {
            setDocType(firstMissing);
            return;
        }

        if (ruleOptions.length > 0) {
            setDocType(ruleOptions[0].value);
        } else {
            toast.info('No file rules for this stage.');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stageType, actions, ruleOptions]);

    const chooseFiles = () => {
        if (!docType) {
            toast.warn('Select a file type before uploading.');
            return;
        }
        fileInputRef.current?.click();
    };

    const onFilesChosen = async (e) => {
        const stage = stageObj?.stageType;
        const picked = Array.from(e.target.files || []);
        if (!id || picked.length === 0) return;

        if (!stage) {
            toast.warn('No current stage available for upload.');
            fileInputRef.current && (fileInputRef.current.value = '');
            return;
        }
        if (!docType) {
            toast.warn('Select a file type before uploading.');
            fileInputRef.current && (fileInputRef.current.value = '');
            return;
        }

        try {
            // 1) Preview names using RULE label (or missing label) as docType
            const previewPayload = {
                stage,
                docType, // label string
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
            if (!ok) {
                toast.info('Upload cancelled');
                return;
            }

            // 2) Upload with overlay + progress
            setUploading(true);
            setUploadPct(0);
            const form = new FormData();
            picked.forEach(f => form.append('files', f, f.name));

            const url = `/projects/${id}/files/upload?stage=${encodeURIComponent(stage)}&docType=${encodeURIComponent(docType)}`;
            await api.post(url, form, {
                headers: roleHeader,          // axios sets Content-Type boundary automatically
                transformRequest: v => v,     // bypass axios JSON transform
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
                    {files.map((f) => (
                        <tr key={(f.url || '') + (f.displayName || '')}>
                            <td className="text-break">{f.displayName}</td>
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

export default function ProjectDetails({ id: propId }) {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const id = propId || routeId;

    const { role } = useAuth();

    const [project, setProject] = useState(null);
    const [actions, setActions] = useState(null);
    const [loading, setLoading] = useState(false);

    const [comment, setComment] = useState('');
    const [approving, setApproving] = useState(false);
    const [moving, setMoving] = useState(false);

    // ---------- Initial load ----------
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [p, a] = await Promise.all([
                    api.get(`/projects/details/${id}`),
                    api.get(`/projects/${id}/actions`, {
                        headers: { 'X-Roles': role ?? '' },
                    }),
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
                api.get(`/projects/${id}/actions`, {
                    headers: { 'X-Roles': role ?? '' },
                }),
            ]);
            setProject(p.data || null);
            setActions(a.data || null);
            toast.success('Refreshed');
        } catch (e) {
            console.error(e);
            toast.error('Failed to refresh project/actions');
        }
    };

    // ---------- Approvals / Moves ----------
    const approve = async (status) => {
        const stageId = project?.currentStage?.id;
        if (!id || !stageId) {
            toast.warn('No current stage to approve/reject.');
            return;
        }
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
        if (!id) {
            toast.warn('No project id to move.');
            return;
        }
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

    // ---------- Due progress ----------
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

    // ---------- Derived ----------
    const p = project || {};
    const stageObj = p.currentStage || {};
    const stageList = Array.isArray(p.stages) ? p.stages : [];

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

                {/* Timeline */}
                <Col md={12} lg={4}>
                    <Card className="h-100">
                        <Card.Header>Timeline</Card.Header>
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

            {/* Files */}
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
                            />
                        </Card.Body>
                    </Card>
                </Col>

                {/* Approvals history */}
                <Col lg={6}>
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
        </div>
    );
}
