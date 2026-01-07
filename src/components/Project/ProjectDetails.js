// src/components/projects/ProjectDetails.js
import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Row, Col, Card, Button, Badge, Table, Spinner, ProgressBar, Form, Modal
} from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { getWorkflow, listWorkflows } from '../../services/workflowApi'; // NEW
import { useAuth } from '../../context/AuthContext';
import ProjectQuotationCard from "./ProjectQuotationCard"; // New Component
import { COMPONENT_IDS } from './ComponentRegistry';

// Lazy load sub-components
const ProjectFiles = React.lazy(() => import('./ProjectFiles'));
const ProjectEstimationCard = React.lazy(() => import('./ProjectEstimationCard'));
const ProjectPaymentsCard = React.lazy(() => import('./ProjectPaymentsCard'));
const ProjectInventoryCard = React.lazy(() => import('./ProjectInventoryCard'));
const ProjectTasks = React.lazy(() => import('../Projects/Tasks/ProjectTasks'));
const DeliveryScheduleCard = React.lazy(() => import('./DeliveryScheduleCard'));
// New Components
const ProjectLifecycle = React.lazy(() => import('./ProjectLifecycle'));
const ProjectRevisions = React.lazy(() => import('./ProjectRevisions'));
const ProjectComments = React.lazy(() => import('./ProjectComments'));
const ProjectWorkflowTab = React.lazy(() => import('./ProjectWorkflowTab'));
const ProjectKanban = React.lazy(() => import('../Projects/Tasks/ProjectKanban'));
const ProjectGantt = React.lazy(() => import('../Projects/Tasks/ProjectGantt'));

/**
 * Main Project Details Page.
 */
export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role, projectRoles } = useAuth(); // user removed
    // const actor = user?.name || user?.email || 'web'; // W: Unused

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

    const [filesReloadKey] = useState(0); // setFilesReloadKey unused
    const [refreshKey, setRefreshKey] = useState(0);

    // Workflow Definition State
    const [workflowDef, setWorkflowDef] = useState(null); // NEW

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
    const [activeTab, setActiveTab] = useState('dashboard');
    const [taskSubTab, setTaskSubTab] = useState('list'); // list, kanban, gantt

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
                // toast.success('Project & actions loaded');
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
            // Check if workflow needs loading just in case (e.g. if it was missing)
            if (p.data?.workflowId && !workflowDef) {
                try {
                    const w = await getWorkflow(p.data.workflowId);
                    setWorkflowDef(w);
                } catch (we) { console.warn(we); }
            }
            // toast.success('Refreshed');
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
    const stageList = Array.isArray(p.stages) ? p.stages : [];

    // Effective actions (disable everything in revision mode)
    const effectiveActions = viewVersion ? {
        // In read-only mode, we might want to see files and timeline etc.
        // Assuming default visibility or allowing all view-only components
        // Use snapshot visibility if available, else default to all read-only
        visibleComponents: viewVersion.meta?.visibleComponents || ['FILES', 'TIMELINE', 'REVISIONS', 'ESTIMATION', 'DELIVERY', 'INVENTORY', 'PAYMENTS', 'TASKS'],
        canApprove: false,
        canReject: false,
        canMove: [],
        missingFiles: []
    } : (actions || {});

    // Override isComponentVisible to use effectiveActions
    const isComponentVisible = (compName) => {
        if (!effectiveActions) return false;
        if (!effectiveActions.visibleComponents) return false;
        return effectiveActions.visibleComponents.includes(compName);
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

            {/* Smart Action Bar (Replaces old card) */}
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
                            {/* Missing Files Warning in Action Bar */}
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

            <div className="mb-3">
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                            Dashboard
                        </button>
                    </li>
                    {isComponentVisible(COMPONENT_IDS.REVISIONS) && (
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === COMPONENT_IDS.REVISIONS ? 'active' : ''}`} onClick={() => setActiveTab(COMPONENT_IDS.REVISIONS)}>
                                Revisions {project?.revisionCount > 0 && <Badge bg="secondary" pill>{project.revisionCount}</Badge>}
                            </button>
                        </li>
                    )}
                    {/* Inventory is usually always visible if they have module access? */}
                    {isComponentVisible(COMPONENT_IDS.INVENTORY) && (
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === COMPONENT_IDS.INVENTORY ? 'active' : ''}`} onClick={() => setActiveTab(COMPONENT_IDS.INVENTORY)}>
                                Inventory
                            </button>
                        </li>
                    )}
                    {(hasAccess('projects.payments') && isComponentVisible(COMPONENT_IDS.PAYMENTS)) && (
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === COMPONENT_IDS.PAYMENTS ? 'active' : ''}`} onClick={() => setActiveTab(COMPONENT_IDS.PAYMENTS)}>
                                Payments
                            </button>
                        </li>
                    )}
                    {isComponentVisible(COMPONENT_IDS.TASKS) && (
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === COMPONENT_IDS.TASKS ? 'active' : ''}`} onClick={() => setActiveTab(COMPONENT_IDS.TASKS)}>
                                Tasks
                            </button>
                        </li>
                    )}
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>
                            Communication
                        </button>
                    </li>
                    {isComponentVisible(COMPONENT_IDS.WORKFLOW) && (
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === COMPONENT_IDS.WORKFLOW ? 'active' : ''}`} onClick={() => setActiveTab(COMPONENT_IDS.WORKFLOW)}>
                                Workflow
                            </button>
                        </li>
                    )}
                </ul>
            </div>

            <Suspense fallback={<div className="p-4 text-center"><Spinner animation="border" /> Loading component...</div>}>
                {activeTab === 'dashboard' && (
                    <>
                        <Row className="g-3">
                            {/* Project Overview */}
                            <Col md={6} lg={4}>
                                <Card className="h-100">
                                    <Card.Header className="d-flex justify-content-between align-items-center">
                                        <span>Project Overview</span>
                                        <div className="d-flex gap-2">
                                            <Button size="sm" variant="outline-dark" onClick={openEmailModal} disabled={!id || !!viewVersion}>Email</Button>
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                disabled={!id || !!viewVersion}
                                                onClick={() => navigate(`/projects/edit/${id}`)}
                                            >
                                                Edit
                                            </Button>
                                        </div>
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
                                            Currency: {p.currency || 'LKR'}
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

                                        {effectiveActions ? (
                                            <>
                                                {effectiveActions?.missingFiles && effectiveActions.missingFiles.length > 0 ? (
                                                    <div className="alert alert-warning py-2">
                                                        <div className="fw-semibold mb-1">Required files missing for this stage:</div>
                                                        <ul className="mb-0">
                                                            {effectiveActions.missingFiles.map((m) => <li key={m}>{m}</li>)}
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
                                                        disabled={!id || !project || !!viewVersion}
                                                    />
                                                </Form.Group>

                                                <div className="text-muted small mb-2">
                                                    <em>Use the Action Bar above to Approve, Reject, or Move stage.</em>
                                                </div>
                                                {/* Buttons moved to Smart Action Bar */}
                                                {/* <div className="d-flex flex-wrap gap-2 mb-3"> ... </div> */}
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
                            {isComponentVisible(COMPONENT_IDS.TIMELINE) && (
                                <Col md={12} lg={4}>
                                    <Card className="h-100">
                                        <Card.Header className="d-flex justify-content-between align-items-center">
                                            <span>Timeline</span>
                                            <Button size="sm" variant="outline-primary" onClick={openDatesModal} disabled={!id || !!viewVersion}>
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
                            )}
                        </Row>

                        {/* Files & Estimation row */}
                        <Row className="g-3 mt-1">
                            {(hasAccess('projects.files') && isComponentVisible(COMPONENT_IDS.FILES)) && (
                                <Col lg={6}>
                                    <Card className="h-100">
                                        <Card.Header className="d-flex justify-content-between align-items-center">
                                            <span>Files</span>
                                            <Badge bg="secondary">{stageObj?.stageType || '—'}</Badge>
                                        </Card.Header>
                                        <Card.Body style={{ overflowY: 'auto' }}>
                                            <ProjectFiles
                                                id={id}
                                                actions={effectiveActions}
                                                stageObj={stageObj}
                                                roleHeader={{ 'X-Roles': rolesHeader }}
                                                onAfterChange={refresh}
                                                reloadKey={filesReloadKey}
                                                filesOverride={viewVersion?.files}
                                                readOnly={!!viewVersion}
                                            />
                                        </Card.Body>
                                    </Card>
                                </Col>
                            )}

                            {/* Estimation summary / actions */}
                            {(hasAccess('projects.estimation') && isComponentVisible(COMPONENT_IDS.ESTIMATION)) && (
                                <Col lg={6}>
                                    <div className="mb-3">
                                        <ProjectEstimationCard
                                            projectId={id}
                                            currency={p.currency}
                                            readOnly={!!viewVersion}
                                            onOpen={() => { /* optional hook */ }}
                                            reloadKey={refreshKey}
                                        />
                                    </div>
                                    <ProjectQuotationCard
                                        project={project}
                                        projectId={id} // Explicitly pass ID from URL
                                        currency={p.currency}
                                        isVisible={true}
                                        reloadKey={refreshKey}
                                    />
                                </Col>
                            )}


                            {/* Delivery Schedule - Moved to bottom */}
                            {isComponentVisible(COMPONENT_IDS.DELIVERY) && (
                                <Col lg={12}>
                                    <DeliveryScheduleCard projectId={id} reloadKey={refreshKey} />
                                </Col>
                            )}
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
                    </>
                )}

                {activeTab === COMPONENT_IDS.REVISIONS && isComponentVisible(COMPONENT_IDS.REVISIONS) && (
                    <ProjectRevisions
                        projectId={id}
                        versions={project?.versions}
                        stages={project?.stages}
                        currentStageType={stageObj?.stageType}
                        roleHeader={{ 'X-Roles': rolesHeader }} // or however your API expects roles, likely just implicit or in useAuth
                        onRevise={refresh}
                        onViewSnapshot={handleViewSnapshot}
                    />
                )}

                {activeTab === COMPONENT_IDS.INVENTORY && isComponentVisible(COMPONENT_IDS.INVENTORY) && (
                    <ProjectInventoryCard projectId={id} reloadKey={refreshKey} />
                )}

                {activeTab === COMPONENT_IDS.PAYMENTS && isComponentVisible(COMPONENT_IDS.PAYMENTS) && (
                    <div className="mt-3">
                        <ProjectPaymentsCard
                            projectId={id}
                            project={project}
                            currency={p.currency}
                            onRefresh={refresh}
                            reloadKey={refreshKey}
                        />
                    </div>
                )}


                {activeTab === COMPONENT_IDS.TASKS && isComponentVisible(COMPONENT_IDS.TASKS) && (
                    <div className="mt-3">
                        <div className="d-flex gap-2 mb-3">
                            <Button variant={taskSubTab === 'list' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setTaskSubTab('list')}>List View</Button>
                            <Button variant={taskSubTab === 'kanban' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setTaskSubTab('kanban')}>Kanban Board</Button>
                            <Button variant={taskSubTab === 'gantt' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setTaskSubTab('gantt')}>Gantt Chart</Button>
                        </div>

                        {taskSubTab === 'list' && (
                            <div className="bg-white shadow-sm rounded">
                                <ProjectTasks projectId={id} reloadKey={refreshKey} />
                            </div>
                        )}
                        {taskSubTab === 'kanban' && (
                            <div className="">
                                <ProjectKanban projectId={id} reloadKey={refreshKey} />
                            </div>
                        )}
                        {taskSubTab === 'gantt' && (
                            <div className="">
                                <ProjectGantt projectId={id} reloadKey={refreshKey} />
                            </div>
                        )}
                    </div>
                )}

                {
                    activeTab === 'comments' && (
                        <div className="mt-3">
                            <ProjectComments projectId={id} />
                        </div>
                    )
                }

                {activeTab === COMPONENT_IDS.WORKFLOW && isComponentVisible(COMPONENT_IDS.WORKFLOW) && (
                    <ProjectWorkflowTab
                        projectId={id}
                        currentWorkflow={project?.workflowSnapshot}
                        currentStageId={project?.currentStageId}
                        onUpdate={refresh}
                    />
                )}
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
                            onChange={e => setEmailTo(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Subject</Form.Label>
                        <Form.Control
                            type="text"
                            value={emailSubject}
                            onChange={e => setEmailSubject(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Body</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={5}
                            value={emailBody}
                            onChange={e => setEmailBody(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Label>Attachments ({selectedAttachments.size} selected)</Form.Label>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }} className="border rounded p-2">
                        {projectFiles.length === 0 && <div className="text-muted small">No files available.</div>}
                        {projectFiles.map((f, i) => (
                            <Form.Check
                                key={f.url + i}
                                type="checkbox"
                                label={f.originalName || f.storedName}
                                checked={selectedAttachments.has(f.url)}
                                onChange={() => toggleAttachment(f.url)}
                            />
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEmailModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={sendEmail} disabled={sendingEmail}>
                        {sendingEmail ? <Spinner size="sm" /> : "Send Email"}
                    </Button>
                </Modal.Footer>
            </Modal >

            {/* Edit Dates Modal (in Timeline) */}
            < Modal show={showDates} onHide={() => setShowDates(false)} centered >
                <Modal.Header closeButton><Modal.Title>Edit Project Dates</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-2">
                        <Form.Label>Estimated Start</Form.Label>
                        <Form.Control type="datetime-local" value={estimatedStart} onChange={(e) => setEstimatedStart(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                        <Form.Label>Estimated End</Form.Label>
                        <Form.Control type="datetime-local" value={estimatedEnd} onChange={(e) => setEstimatedEnd(e.target.value)} />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Due Date</Form.Label>
                        <Form.Control type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDates(false)}>Cancel</Button>
                    <Button variant="primary" onClick={saveDates}>Save</Button>
                </Modal.Footer>
            </Modal >
        </div >
    );
}
