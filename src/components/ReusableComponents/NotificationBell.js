import React, { useState, useEffect } from 'react';
import { Button, Badge, Popover, OverlayTrigger, ListGroup } from 'react-bootstrap';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Assuming react-router v6
import api from '../../api/api';

export default function NotificationBell() {
    const [count, setCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();

    // Poll for unread count every 30s
    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchCount = async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            setCount(res.data);
        } catch (e) {
            console.error("Failed to fetch notification count", e);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications?page=0&size=5');
            setNotifications(res.data.content || []);
        } catch (e) {
            console.error("Failed to fetch notifications", e);
        }
    };

    const handleToggle = (nextShow) => {
        setVisible(nextShow);
        if (nextShow) {
            fetchNotifications();
        }
    };

    const handleRead = async (n) => {
        if (!n.read) {
            try {
                await api.put(`/notifications/${n.id}/read`);
                setCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
            } catch (e) {
                console.error("Failed to mark read", e);
            }
        }
        if (n.link) {
            navigate(n.link);
            document.body.click(); // Close popover hack
        }
    };

    const popover = (
        <Popover id="notification-popover" style={{ minWidth: '300px', maxWidth: '350px' }}>
            <Popover.Header as="h3" className="d-flex justify-content-between align-items-center">
                Notifications
                <Button variant="link" size="sm" onClick={fetchNotifications}>Refresh</Button>
            </Popover.Header>
            <Popover.Body className="p-0">
                <ListGroup variant="flush">
                    {notifications.length === 0 ? (
                        <ListGroup.Item className="text-muted text-center py-3">No notifications</ListGroup.Item>
                    ) : (
                        notifications.map(n => (
                            <ListGroup.Item
                                key={n.id}
                                action
                                onClick={() => handleRead(n)}
                                className={!n.read ? "bg-light fw-bold" : ""}
                            >
                                <div className="d-flex justify-content-between">
                                    <small className="text-secondary">{new Date(n.createdAt).toLocaleDateString()}</small>
                                    {!n.read && <Badge bg="primary" pill>New</Badge>}
                                </div>
                                <div className="mb-1">{n.title}</div>
                                <small className="text-muted">{n.message}</small>
                            </ListGroup.Item>
                        ))
                    )}
                </ListGroup>
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger trigger="click" placement="bottom" overlay={popover} rootClose onToggle={handleToggle}>
            <Button variant="link" className="position-relative text-white p-0 me-3">
                <Bell size={20} />
                {count > 0 && (
                    <Badge
                        bg="danger"
                        pill
                        className="position-absolute top-0 start-100 translate-middle border border-light rounded-circle"
                        style={{ fontSize: '0.65rem', padding: '0.25em 0.4em' }}
                    >
                        {count > 9 ? '9+' : count}
                    </Badge>
                )}
            </Button>
        </OverlayTrigger>
    );
}
