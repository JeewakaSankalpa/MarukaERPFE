import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, InputGroup } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';

const CATEGORIES = ["Validity", "Warranty", "Payment", "Transport"];

export default function TermsSelector({ value = [], onChange }) {
    // value is array of { category, description }

    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        api.get('/terms').then(res => setTemplates(res.data)).catch(console.error);
    }, []);

    // Helper to get current text for a category
    const getText = (cat) => value.find(v => v.category === cat)?.description || "";

    const handleChange = (cat, text) => {
        const other = value.filter(v => v.category !== cat);
        if (text) {
            onChange([...other, { category: cat, description: text }]);
        } else {
            onChange(other);
        }
    };

    const saveTemplate = async (cat, text) => {
        if (!text) return;
        try {
            const res = await api.post('/terms', { category: cat, content: text });
            setTemplates([...templates, res.data]);
            toast.success("Saved to Library");
        } catch (e) {
            toast.error("Failed to save template");
        }
    };

    return (
        <Card className="mt-3">
            <Card.Header>Terms & Conditions</Card.Header>
            <Card.Body>
                {CATEGORIES.map(cat => {
                    const catTemplates = templates.filter(t => t.category === cat);
                    const currentText = getText(cat);

                    return (
                        <div key={cat} className="mb-3 border-bottom pb-3">
                            <Form.Label className="fw-bold">{cat}</Form.Label>
                            <Row>
                                <Col md={4}>
                                    <Form.Select
                                        size="sm"
                                        className="mb-2"
                                        onChange={(e) => {
                                            if (e.target.value) handleChange(cat, e.target.value);
                                        }}
                                        value=""
                                    >
                                        <option value="">-- Load from Library --</option>
                                        {catTemplates.map(t => (
                                            <option key={t.id} value={t.content}>
                                                {t.content.substring(0, 40)}...
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={8}>
                                    <InputGroup>
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            value={currentText}
                                            onChange={e => handleChange(cat, e.target.value)}
                                            placeholder={`Enter ${cat} terms...`}
                                        />
                                        <Button variant="outline-secondary" onClick={() => saveTemplate(cat, currentText)}>
                                            💾
                                        </Button>
                                    </InputGroup>
                                </Col>
                            </Row>
                        </div>
                    );
                })}
            </Card.Body>
        </Card>
    );
}
