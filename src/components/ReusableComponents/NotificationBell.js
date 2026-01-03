import React, { useState, useEffect } from 'react';
import { Button, Badge, Popover, OverlayTrigger, ListGroup } from 'react-bootstrap';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

export default function NotificationBell() {
    const [count, setCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();
    const { userId, username } = useAuth();

    // Initial fetch
    useEffect(() => {
        if (userId) {
            fetchCount();
        }
    }, [userId]);

    // WebSocket Connection
    useEffect(() => {
        if (!userId) return;

        // Determine Base URL similar to api.js
        const apiBase = process.env.REACT_APP_API_URL ||
            (typeof window !== 'undefined' && window.__API_URL__) ||
            'http://localhost:8080/api';

        // Convert to WebSocket URL
        // 1. Replace http/https with ws/wss
        // 2. Remove trailing /api if present
        // 3. Append /ws/websocket
        let wsUrl = apiBase.replace(/^http/, 'ws');
        if (wsUrl.endsWith('/api')) {
            wsUrl = wsUrl.slice(0, -4);
        }
        // Ensure no trailing slash before appending
        if (wsUrl.endsWith('/')) {
            wsUrl = wsUrl.slice(0, -1);
        }
        wsUrl += '/ws/websocket';

        console.log("Connecting to WebSocket:", wsUrl);

        const client = new Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,
            debug: (str) => {
                console.log('[WS Debug]:', str);
            },
            onConnect: () => {
                console.log('Connected to WebSocket');
                console.log('Subscribing to topic:', `/topic/notifications/${username}`);
                client.subscribe(`/topic/notifications/${username}`, (message) => {
                    console.log('Received WebSocket Message:', message.body);
                    const newNotification = JSON.parse(message.body);
                    setCount(prev => prev + 1);
                    setNotifications(prev => [newNotification, ...prev]);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
            onWebSocketError: (event) => {
                console.error('WebSocket Error:', event);
            }
        });

        client.activate();

        return () => {
            client.deactivate();
        };
    }, [userId]);

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
