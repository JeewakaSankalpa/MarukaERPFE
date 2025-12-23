import React, { useEffect, useState } from "react";
import { Container, Card, ListGroup, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await api.get("/notifications");
            setNotifications(res.data || []);
            // Also mark all read on load? Or explicit button?
            // Usually explicit is better or "mark all read" button.
        } catch (e) {
            console.error(e);
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post("/notifications/mark-all-read");
            toast.success("All marked as read");
            loadNotifications();
            // dispatch event or context update if header needs refresh
        } catch (e) {
            toast.error("Failed to mark all read");
        }
    };

    const handleItemClick = async (n) => {
        // Mark as read first
        if (!n.isRead) {
            try {
                await api.put(`/notifications/${n.id}/read`);
            } catch (e) { /* ignore */ }
        }
        // Navigate
        if (n.relatedLink) {
            // Handle relative link vs absolute
            navigate(n.relatedLink);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    return (
        <Container style={{ width: "90vw", maxWidth: 800, paddingTop: 24 }}>
            <Card className="shadow-sm">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Notifications</h5>
                    <Button size="sm" variant="outline-primary" onClick={markAllRead}>Mark All Read</Button>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="p-4 text-center">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted">No notifications</div>
                    ) : (
                        <ListGroup variant="flush">
                            {notifications.map(n => (
                                <ListGroup.Item
                                    key={n.id}
                                    action
                                    onClick={() => handleItemClick(n)}
                                    className={!n.isRead ? "bg-light fw-semibold" : ""}
                                >
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <div className="mb-1">{n.title}</div>
                                            <small className="text-muted d-block">{n.message}</small>
                                            <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                                            </small>
                                        </div>
                                        {!n.isRead && <Badge bg="primary" pill className="ms-2">•</Badge>}
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </Card.Body>
            </Card>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar />
        </Container>
    );
}
