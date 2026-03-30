import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Spinner } from 'react-bootstrap';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function ProjectComments({ projectId }) {
    const { userId, username } = useAuth();
    const [comments, setComments] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        fetchComments();
    }, [projectId]);

    // Auto-scroll to bottom whenever comments change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const fetchComments = async () => {
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
    };

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

                {/* Chat messages area — scrollable, oldest at top, newest at bottom */}
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
                            {/* Invisible anchor to scroll to */}
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
            </Card.Body>
        </Card>
    );
}
