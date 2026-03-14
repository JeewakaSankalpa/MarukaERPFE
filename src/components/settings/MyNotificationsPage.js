import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import React from 'react';
import { Container, Card } from 'react-bootstrap';
import NotificationSettings from './NotificationSettings';

export default function MyNotificationsPage() {
    const navigate = useNavigate();
    return (
        <Container className="py-3">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">My Notification Preferences</h3>
                        </div>
<Card>
                <Card.Body>
                    <NotificationSettings />
                </Card.Body>
            </Card>
        </Container>
    );
}
