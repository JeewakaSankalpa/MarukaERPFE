
import React from 'react';
import { Container, Card } from 'react-bootstrap';
import NotificationSettings from './NotificationSettings';

export default function MyNotificationsPage() {
    return (
        <Container className="py-3">
            <h3>My Notification Preferences</h3>
            <Card>
                <Card.Body>
                    <NotificationSettings />
                </Card.Body>
            </Card>
        </Container>
    );
}
