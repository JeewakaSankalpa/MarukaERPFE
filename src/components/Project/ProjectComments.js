import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Badge, Card, Form, Button, Spinner, Tab, Tabs } from 'react-bootstrap';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import PartnerConversation from '../Portal/PartnerConversation';

export default function ProjectComments({ projectId }) {
    const { userId, username } = useAuth();
    const [comments, setComments] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [partnerUnread, setPartnerUnread] = useState(0);
    const [supplierThreads, setSupplierThreads] = useState([]);
    const [selectedSupplierPoId, setSelectedSupplierPoId] = useState('');
    const bottomRef = useRef(null);

    const fetchComments = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await api.get(`/projects/${projectId}/comments`);
            // Reverse so oldest is first (top) and newest is last (bottom)
            const sorted = (res.data || []).slice().reverse();
            setComments(sorted);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load comments");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const fetchPartnerUnread = useCallback(async () => {
        if (!projectId) return;
        try {
            const res = await api.get(`/projects/${projectId}/customer-communications/counts`);
            setPartnerUnread(Number(res.data?.unread || 0));
        } catch (e) {
            console.error("Failed to load customer message count", e);
        }
    }, [projectId]);

    const fetchSupplierThreads = useCallback(async () => {
        if (!projectId) return;
        try {
            const res = await api.get(`/projects/${projectId}/supplier-communications/threads`);
            const rows = res.data || [];
            setSupplierThreads(rows);
            setSelectedSupplierPoId((current) => current || rows[0]?.id || '');
        } catch (e) {
            console.error("Failed to load supplier message threads", e);
            setSupplierThreads([]);
        }
    }, [projectId]);

    useEffect(() => {
        fetchComments();
        fetchPartnerUnread();
        fetchSupplierThreads();
    }, [fetchComments, fetchPartnerUnread, fetchSupplierThreads]);

    // Auto-scroll to bottom whenever comments change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const refreshPartnerCounts = useCallback(() => {
        fetchPartnerUnread();
        fetchSupplierThreads();
    }, [fetchPartnerUnread, fetchSupplierThreads]);

    const supplierUnread = supplierThreads.reduce((sum, thread) => sum + Number(thread.unread || 0), 0);
    const customerUnread = partnerUnread;
    const selectedSupplierThread = supplierThreads.find((thread) => thread.id === selectedSupplierPoId) || supplierThreads[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSubmitting(true);
        try {
            const payload = {
                userId: userId,
                username: username || 'User',
                content: content
            };
            const res = await api.post(`/projects/${projectId}/comments`, payload);
            // Append new message to END (bottom)
            setComments(prev => [...prev, res.data]);
            setContent('');
        } catch (e) {
            console.error(e);
            toast.error("Failed to post comment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="h-100 shadow-sm border-0">
            <Card.Body className="d-flex flex-column" style={{ maxHeight: '600px', minHeight: '400px' }}>
                <h5 className="mb-3">Project Communication</h5>
                <Tabs defaultActiveKey="internal" className="mb-3" onSelect={(key) => {
                    if (key === 'customer' || key === 'supplier') refreshPartnerCounts();
                }}>
                    <Tab eventKey="internal" title="Internal">
                        <div
                            className="flex-grow-1 overflow-auto mb-3 pe-2"
                            style={{ display: 'flex', flexDirection: 'column' }}
                        >
                            {loading ? (
                                <div className="text-center p-3 m-auto"><Spinner size="sm" /> Loading messages...</div>
                            ) : comments.length === 0 ? (
                                <div className="text-muted text-center p-3 m-auto">No communication yet. Start the conversation!</div>
                            ) : (
                                <div className="d-flex flex-column gap-2 pt-1">
                                    {comments.map(c => (
                                        <div
                                            key={c.id}
                                            className={`d-flex flex-column ${c.userId === userId ? 'align-items-end' : 'align-items-start'}`}
                                        >
                                            <div
                                                className={`p-3 rounded shadow-sm ${c.userId === userId ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                                                style={{ maxWidth: '80%' }}
                                            >
                                                <div className="d-flex justify-content-between align-items-center mb-1 gap-2">
                                                    <small className={`fw-bold ${c.userId === userId ? 'text-light' : 'text-primary'}`}>
                                                        {c.username}
                                                    </small>
                                                    <small className={c.userId === userId ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.7rem' }}>
                                                        {new Date(c.createdAt).toLocaleString()}
                                                    </small>
                                                </div>
                                                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.content}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={bottomRef} />
                                </div>
                            )}
                        </div>

                        <Form onSubmit={handleSubmit} className="mt-auto">
                            <Form.Group className="mb-2">
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    disabled={submitting}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                />
                            </Form.Group>
                            <div className="d-flex justify-content-end">
                                <Button type="submit" variant="primary" disabled={submitting || !content.trim()}>
                                    {submitting ? <Spinner size="sm" /> : 'Send Message'}
                                </Button>
                            </div>
                        </Form>
                    </Tab>
                    <Tab eventKey="customer" title={<span>Communicate with customer {customerUnread > 0 && <Badge bg="danger" pill>{customerUnread > 99 ? '99+' : customerUnread}</Badge>}</span>}>
                        <PartnerConversation
                            targetType="CUSTOMER_PROJECT"
                            targetId={projectId}
                            title="Communicate with customer"
                            subtitle="Send encrypted progress updates and pictures for this project."
                            listPath={`/projects/${projectId}/partner-communications`}
                            postPath={`/projects/${projectId}/partner-communications`}
                            onUnreadChanged={refreshPartnerCounts}
                        />
                    </Tab>
                    <Tab eventKey="supplier" title={<span>Communicate with supplier {supplierUnread > 0 && <Badge bg="danger" pill>{supplierUnread > 99 ? '99+' : supplierUnread}</Badge>}</span>}>
                        {supplierThreads.length === 0 ? (
                            <div className="text-muted text-center p-4">No supplier purchase orders are linked to this project yet.</div>
                        ) : (
                            <div className="portal-communication-layout">
                                <aside className="portal-thread-list" aria-label="Supplier conversation list">
                                    {supplierThreads.map((thread) => (
                                        <button
                                            key={thread.id}
                                            type="button"
                                            className={thread.id === selectedSupplierThread?.id ? "portal-thread-item portal-thread-active" : "portal-thread-item"}
                                            onClick={() => setSelectedSupplierPoId(thread.id)}
                                        >
                                            <span>{thread.poNumber}</span>
                                            <small>{thread.supplierName || thread.status || 'Supplier order'}</small>
                                            {thread.unread > 0 && <Badge bg="danger" pill>{thread.unread > 99 ? '99+' : thread.unread}</Badge>}
                                        </button>
                                    ))}
                                </aside>
                                {selectedSupplierThread && (
                                    <PartnerConversation
                                        targetType="SUPPLIER_PO"
                                        targetId={selectedSupplierThread.id}
                                        title={`Communicate with supplier: ${selectedSupplierThread.poNumber}`}
                                        subtitle="Send encrypted purchase order updates, delivery photos, and questions."
                                        listPath={`/portal/supplier/pos/${selectedSupplierThread.id}/communications`}
                                        postPath={`/portal/supplier/pos/${selectedSupplierThread.id}/communications`}
                                        onUnreadChanged={refreshPartnerCounts}
                                    />
                                )}
                            </div>
                        )}
                    </Tab>
                </Tabs>
            </Card.Body>
        </Card>
    );
}
