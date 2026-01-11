// src/components/projects/ProjectDetails.js
import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Row, Col, Card, Button, Badge, Table, Spinner, ProgressBar, Form, Modal
} from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { getWorkflow, listWorkflows } from '../../services/workflowApi';
import { useAuth } from '../../context/AuthContext';
import { COMPONENT_IDS, ProjectComponentRegistry } from './ComponentRegistry'; // Registry Import

// Lazy load sub-components (Some might be unused if registry handles them, 
// but we keep imports if they are used elsewhere or in registry definition to be safe if moved)
const ProjectFiles = React.lazy(() => import('./ProjectFiles')); // Used in legacy check or registry? Registry handles it.
const ProjectLifecycle = React.lazy(() => import('./ProjectLifecycle'));
// Most others are now rendered via Registry logic, but we might need them if we reference them directly? 
// Actually, Registry imports them. We can remove them here to clean up, 
// BUT for safety (if I missed one in registry) I will comment them out or leave them unused.

/**
 * Main Project Details Page.
 */
export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role, projectRoles } = useAuth();

    // Combine system role and project roles for workflow checks
    const rolesHeader = useMemo(() => {
        const roles = [role];
        if (projectRoles && Array.isArray(projectRoles)) {
            roles.push(...projectRoles);
        }
        return roles.filter(Boolean).join(',');
    }, [role, projectRoles]);

    // Access Check Helper
    const userModules = useMemo(() => JSON.parse(localStorage.getItem("moduleAccess") || "[]"), []);
    const hasAccess = (id) => {
        return userModules.includes(id);
    };

    const [project, setProject] = useState(null);
    const [actions, setActions] = useState(null);
    const [loading, setLoading] = useState(false);

    const [comment, setComment] = useState('');
    const [approving, setApproving] = useState(false);
    const [moving, setMoving] = useState(false);

    const [filesReloadKey] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    // Workflow Definition State
    const [workflowDef, setWorkflowDef] = useState(null);

    const [showDates, setShowDates] = useState(false);
    const [estimatedStart, setEstimatedStart] = useState('');
    const [estimatedEnd, setEstimatedEnd] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Email state
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [projectFiles, setProjectFiles] = useState([]);
    const [selectedAttachments, setSelectedAttachments] = useState(new Set());
    const [sendingEmail, setSendingEmail] = useState(false);

    const openEmailModal = async () => {
        if (!id) return;
        setSendingEmail(false);
        setProjectFiles([]);
        setSelectedAttachments(new Set());
        setEmailTo('');
        setEmailSubject(`Update regarding Project ${project?.projectName || id}`);
        setEmailBody('');
        try {
            const res = await api.get(`/projects/${id}/files`);
            setProjectFiles(res.data || []);
            setShowEmailModal(true);
        } catch (e) {
            toast.error("Failed to load project files");
        }
    };

    const sendEmail = async () => {
        if (!emailTo) { toast.warn("Recipient is required"); return; }
        setSendingEmail(true);
        try {
            await api.post(`/projects/${id}/email`, {
                to: emailTo,
                subject: emailSubject,
                body: emailBody,
                attachmentUrls: Array.from(selectedAttachments)
            });
            toast.success("Email sent successfully");
            setShowEmailModal(false);
        } catch (e) {
            toast.error("Failed to send email");
        } finally {
            setSendingEmail(false);
        }
    };

    const toggleAttachment = (url) => {
        const next = new Set(selectedAttachments);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        setSelectedAttachments(next);
    };

    // Tabs state
    const [activeTab, setActiveTab] = useState(COMPONENT_IDS.DASHBOARD);
    // const [taskSubTab, setTaskSubTab] = useState('list'); // Moved to Tasks Component ideally, or kept if Tasks uses it

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [p, a] = await Promise.all([
                    api.get(`/projects/details/${id}`, { headers: { 'X-Roles': rolesHeader } }),
                    api.get(`/projects/${id}/actions`, { headers: { 'X-Roles': rolesHeader } }),
                ]);
                if (!alive) return;
                setProject(p.data || null);
                setActions(a.data || null);

                // Fetch workflow definition if we have a workflowId
                if (p.data?.workflowId) {
                    try {
                        const w = await getWorkflow(p.data.workflowId);
                        setWorkflowDef(w);
                    } catch (we) {
                        console.warn("Could not fetch workflow definition", we);
                    }
                }
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

    const openDatesModal = () => {
        if (!project || !!viewVersion) return;
        setEstimatedStart(project.estimatedStart ? project.estimatedStart.substring(0, 16) : '');
        setEstimatedEnd(project.estimatedEnd ? project.estimatedEnd.substring(0, 16) : '');
        setDueDate(project.dueDate ? project.dueDate.substring(0, 16) : '');
        setShowDates(true);
    };

    const saveDates = async () => {
        if (!id) return;
        try {
            await api.patch(`/projects/${id}/dates`, {
                estimatedStart: estimatedStart || null,
                estimatedEnd: estimatedEnd || null,
                dueDate: dueDate || null
            });
            toast.success("Dates updated");
            setShowDates(false);
            refresh();
        } catch (e) {
            toast.error("Failed to update dates");
        }
    };

    const refresh = async () => {
        if (!id) return;
        try {
            const t = new Date().getTime(); // Anti-cache
            const [p, a] = await Promise.all([
                api.get(`/projects/details/${id}?t=${t}`, { headers: { 'X-Roles': rolesHeader } }),
                api.get(`/projects/${id}/actions?t=${t}`, { headers: { 'X-Roles': rolesHeader } }),
            ]);
            setProject(p.data || null);
            setActions(a.data || null);
            setRefreshKey(prev => prev + 1); // Trigger sub-components
            if (p.data?.workflowId && !workflowDef) {
                try {
                    const w = await getWorkflow(p.data.workflowId);
                    setWorkflowDef(w);
                } catch (we) { console.warn(we); }
            }
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
                { headers: { 'X-Roles': rolesHeader } }
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
                { headers: { 'X-Roles': rolesHeader } }
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

    // Revision Viewer State
    const [viewVersion, setViewVersion] = useState(null);

    const handleViewSnapshot = async (revNum) => {
        if (!id) return;
        try {
            setLoading(true);
            const res = await api.get(`/projects/${id}/versions/${revNum}`, { headers: { 'X-Roles': rolesHeader } });
            const v = res.data;
            if (v && v.snapshotJson) {
                const snapProject = JSON.parse(v.snapshotJson);
                setViewVersion({
                    project: snapProject,
                    files: v.filesSnapshot,
                    meta: v
                });
                setActiveTab('dashboard');
                toast.info(`Viewing Revision v${v.revisionNumber}`);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load revision snapshot");
        } finally {
            setLoading(false);
        }
    };

    const exitRevisionMode = () => {
        setViewVersion(null);
        toast.info("Returned to live project");
    };

    // Calculate effective project object
    const p = viewVersion ? viewVersion.project : (project || {});
    const stageObj = p.currentStage || {};
    // const stageList = Array.isArray(p.stages) ? p.stages : []; // Used in Approvals Table 

    // Effective actions (disable everything in revision mode)
    const effectiveActions = viewVersion ? {
        visibleComponents: viewVersion.meta?.visibleComponents || ['FILES', 'TIMELINE', 'REVISIONS', 'ESTIMATION', 'DELIVERY', 'INVENTORY', 'PAYMENTS', 'TASKS', 'OVERVIEW', 'STATUS', 'APPROVALS'],
        canApprove: false,
        canReject: false,
        canMove: [],
        missingFiles: []
    } : (actions || {});

    // --- REGISTRY BASED RENDERING HELPERS ---

    // 1. Resolve Effective Visibility
    const isVisible = (id) => {
        // In Revision Mode, strict snapshot visibility
        if (viewVersion) {
            return viewVersion.meta?.visibleComponents?.includes(id);
        }
        // Live Mode
        if (!effectiveActions || !effectiveActions.visibleComponents) return false;
        return effectiveActions.visibleComponents.includes(id);
    };

    // 2. Prepare Context for Renderers
    const renderContext = {
        id,
        project: p,
        stageObj,
        actions: effectiveActions,
        effectiveActions, // alias
        roleHeader: { 'X-Roles': rolesHeader },
        refresh,
        refreshKey,
        filesReloadKey,
        viewVersion,
        onViewSnapshot: handleViewSnapshot,
        openEmailModal, navigate // Passed down for OVERVIEW card
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

            {viewVersion && (
                <div className="alert alert-info d-flex justify-content-between align-items-center mx-2 mt-2 shadow-sm border-info">
                    <div>
                        <strong className="me-2">READ ONLY / REVISION MODE</strong>
                        Viewing Revision <strong>v{viewVersion.meta.revisionNumber}</strong> from {new Date(viewVersion.meta.snapshotDate).toLocaleString()}
                        {viewVersion.meta.reasonForRevision && <span className="ms-2 text-muted">— {viewVersion.meta.reasonForRevision}</span>}
                    </div>
                    <Button variant="info" size="sm" onClick={exitRevisionMode}>Exit Revision Mode</Button>
                </div>
            )}

            {/* Lifecycle Widget */}
            <Suspense fallback={<div>Loading...</div>}>
                <ProjectLifecycle
                    key={refreshKey}
                    stages={project?.workflowSnapshot?.stages || workflowDef?.stages || []}
                    currentStage={project?.currentStage}
                    status={project?.status}
                />
            </Suspense>

            {/* Smart Action Bar */}
            {effectiveActions && (effectiveActions.canApprove || effectiveActions.canReject || (effectiveActions.canMove && effectiveActions.canMove.length > 0)) && (
                <Card className="mb-3 border-primary shadow-sm" style={{ borderLeft: '5px solid #0d6efd' }}>
                    <Card.Body className="d-flex flex-wrap align-items-center justify-content-between p-3">
                        <div>
                            <h5 className="m-0 text-primary">
                                {effectiveActions.canApprove ? "Approval Required" : "Action Required"}
                            </h5>
                            <div className="text-muted small">
                                {effectiveActions.canApprove
                                    ? `Please review the ${stageObj.stageType || 'current stage'} and approve or reject.`
                                    : `Ready to move to ${effectiveActions.canMove?.[0] || 'next stage'}.`
                                }
                            </div>
                        </div>

                        <div className="d-flex gap-2 align-items-center mt-2 mt-md-0">
                            {effectiveActions.missingFiles && effectiveActions.missingFiles.length > 0 && (
                                <div className="text-warning small me-3 fw-bold">
                                    ⚠️ Missing Required Files
                                </div>
                            )}

                            {effectiveActions.canApprove && (
                                <>
                                    <Form.Control
                                        size="sm"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Approval Comment..."
                                        style={{ maxWidth: '200px' }}
                                    />
                                    <Button variant="success" onClick={() => approve('APPROVED')} disabled={approving || !effectiveActions.filesOk}>
                                        Approve
                                    </Button>
                                    <Button variant="outline-danger" onClick={() => approve('REJECTED')} disabled={approving}>
                                        Reject
                                    </Button>
                                </>
                            )}

                            {!effectiveActions.canApprove && effectiveActions.canMove && effectiveActions.canMove.length > 0 && (
                                <>
                                    <Button variant="primary" onClick={() => move()} disabled={moving || !effectiveActions.filesOk}>
                                        Move to Next
                                    </Button>
                                    {effectiveActions.canMove.map(to => (
                                        <Button key={to} variant="outline-secondary" size="sm" onClick={() => move(to)} disabled={moving}>
                                            → {to}
                                        </Button>
                                    ))}
                                </>
                            )}
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* --- TABS NAVIGATION --- */}
            <div className="mb-3">
                <ul className="nav nav-tabs">
                    {/* Dynamic Tabs from Registry */}
                    {ProjectComponentRegistry.getByZone('TAB').map(comp => {
                        if (!isVisible(comp.id)) return null;

                        return (
                            <li className="nav-item" key={comp.id}>
                                <button
                                    className={`nav-link ${activeTab === comp.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(comp.id)}
                                >
                                    {comp.label}
                                    {comp.id === 'REVISIONS' && project?.revisionCount > 0 && (
                                        <Badge bg="secondary" pill className="ms-1">{project.revisionCount}</Badge>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <Suspense fallback={<div className="p-4 text-center"><Spinner animation="border" /> Loading component...</div>}>

                {/* --- DASHBOARD TAB CONTENT --- */}
                {/* Note: 'DASHBOARD' is the ID of the dashboard tab in DEFAULT_COMPONENTS */}
                {activeTab === 'DASHBOARD' && (
                    <Row className="g-3">
                        {/* DYNAMIC DASHBOARD COMPONENTS LOOP */}
                        {ProjectComponentRegistry.getByZone('DASHBOARD').map(comp => {
                            if (!isVisible(comp.id)) return null;

                            // Render
                            return (
                                <Col key={comp.id} md={comp.layout?.md || 12} lg={comp.layout?.lg || 6}>
                                    {comp.render({
                                        ...renderContext,
                                        // Pass extra props for specific legacy components if needed? 
                                        // renderContext contains almost everything
                                    })}
                                </Col>
                            );
                        })}

                    </Row>
                )}

                {/* --- OTHER TABS CONTENT --- */}
                {ProjectComponentRegistry.getByZone('TAB').map(comp => {
                    if (activeTab !== comp.id) return null;
                    if (comp.id === 'DASHBOARD') return null; // Handled above
                    if (!isVisible(comp.id)) return null;

                    return (
                        <div key={comp.id} className="fade-in">
                            {comp.render(renderContext)}
                        </div>
                    );
                })}

            </Suspense >

            {/* Email Modal */}
            < Modal show={showEmailModal} onHide={() => setShowEmailModal(false)} size="lg" centered >
                <Modal.Header closeButton><Modal.Title>Send Project Email</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>To</Form.Label>
                        <Form.Control
                            type="email"
                            placeholder="recipient@example.com"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Subject</Form.Label>
                        <Form.Control
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Message</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={5}
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                        />
                    </Form.Group>
                    <div className="mb-3">
                        <Form.Label>Attachments</Form.Label>
                        <div className="d-flex flex-wrap gap-2">
                            {projectFiles.map(f => (
                                <Button
                                    key={f.url}
                                    size="sm"
                                    variant={selectedAttachments.has(f.url) ? "primary" : "outline-secondary"}
                                    onClick={() => toggleAttachment(f.url)}
                                >
                                    {f.originalName}
                                </Button>
                            ))}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEmailModal(false)}>Close</Button>
                    <Button variant="primary" onClick={sendEmail} disabled={sendingEmail}>
                        {sendingEmail ? <Spinner size="sm" /> : "Send Email"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Dates Edit Modal */}
            <Modal show={showDates} onHide={() => setShowDates(false)}>
                <Modal.Header closeButton><Modal.Title>Edit Timeline Dates</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Estimated Start</Form.Label>
                        <Form.Control type="datetime-local" value={estimatedStart} onChange={e => setEstimatedStart(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Estimated End</Form.Label>
                        <Form.Control type="datetime-local" value={estimatedEnd} onChange={e => setEstimatedEnd(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Due Date</Form.Label>
                        <Form.Control type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDates(false)}>Cancel</Button>
                    <Button variant="primary" onClick={saveDates}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
