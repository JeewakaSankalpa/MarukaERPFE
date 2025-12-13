import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Table, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';

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

/**
 * Component for managing project files and payments.
 * Handles file listing, uploading, and downloading.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id - Project ID
 * @param {Object} props.actions - Available actions and file requirements
 * @param {Object} props.stageObj - Current stage object
 * @param {Object} props.roleHeader - Auth headers
 * @param {Function} props.onAfterChange - Callback after upload
 * @param {string} props.reloadKey - Key to trigger reload
 */
export default function ProjectFiles({ id, actions, stageObj, roleHeader, onAfterChange, reloadKey }) {
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
