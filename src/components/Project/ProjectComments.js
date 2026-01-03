import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup, Spinner } from 'react-bootstrap';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function ProjectComments({ projectId }) {
    const { userId, username } = useAuth();
    const [comments, setComments] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [projectId]);

    const fetchComments = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await api.get(`/projects/${projectId}/comments`);
            setComments(res.data || []);
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
            setComments(prev => [res.data, ...prev]);
            setContent('');
            toast.success("Comment added");
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

                <div className="flex-grow-1 overflow-auto mb-3 pe-2" style={{ flexDirection: 'column-reverse', display: 'flex' }}>
                    {/* Using flex-direction column-reverse to stick properly if we want, but standard map is fine if we scroll to bottom. 
                         Actually simplest is standard map and map order desc. 
                         Repo returns OrderByCreatedAtDesc, so newest on top. 
                         So standard map is fine.
                     */}
                    {loading ? (
                        <div className="text-center p-3"><Spinner size="sm" /> Loading comments...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-muted text-center p-3">No communication yet. Start the conversation!</div>
                    ) : (
                        <ListGroup variant="flush">
                            {comments.map(c => (
                                <ListGroup.Item key={c.id} className="px-0 py-2 border-0">
                                    <div className={`d-flex flex-column ${c.userId === userId ? 'align-items-end' : 'align-items-start'}`}>
                                        <div className={`p-3 rounded shadow-sm ${c.userId === userId ? 'bg-primary text-white' : 'bg-light text-dark'}`} style={{ maxWidth: '80%' }}>
                                            <div className="d-flex justify-content-between align-items-center mb-1 gap-2">
                                                <small className={`fw-bold ${c.userId === userId ? 'text-light' : 'text-primary'}`}>{c.username}</small>
                                                <small className={c.userId === userId ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.7rem' }}>
                                                    {new Date(c.createdAt).toLocaleString()}
                                                </small>
                                            </div>
                                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.content}</div>
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </div>

                <Form onSubmit={handleSubmit} className="mt-auto">
                    <Form.Group className="mb-2">
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Type a message..."
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
