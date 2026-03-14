import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { Container } from 'react-bootstrap';

export default function TaxPage() {
    const navigate = useNavigate();
    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Tax & VAT Management</h3>
                        </div>
<p className="text-muted">Tax configuration and specific VAT reporting coming soon...</p>
        </Container>
    );
}
