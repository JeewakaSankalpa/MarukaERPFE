import React, { useEffect, useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../api/api';

export default function NotificationSettings() {
    const [preferences, setPreferences] = useState({ email: true, in_app: true });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const res = await api.get('/users/me');
            if (res.data && res.data.notificationPreferences) {
                setPreferences(res.data.notificationPreferences);
            }
        } catch (err) {
            console.error("Failed to fetch notification preferences", err);
        }
    };

    const handleToggle = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const savePreferences = async () => {
        setLoading(true);
        try {
            await api.patch('/users/me/preferences', preferences);
            toast.success('Preferences updated successfully!');
        } catch (err) {
            toast.error('Failed to update preferences.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <Card.Body>
                <Card.Title>Notification Preferences</Card.Title>
                <Card.Text>Manage how you receive notifications.</Card.Text>

                <Form>
                    <Form.Check
                        type="switch"
                        id="email-notif-switch"
                        label="Email Notifications"
                        checked={!!preferences.email}
                        onChange={() => handleToggle('email')}
                        className="mb-3"
                    />
                    <Form.Check
                        type="switch"
                        id="inapp-notif-switch"
                        label="In-App Notifications"
                        checked={!!preferences.in_app}
                        onChange={() => handleToggle('in_app')}
                        className="mb-3"
                    />
                    <Button variant="primary" onClick={savePreferences} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </Form>
            </Card.Body>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Card>
    );
}
