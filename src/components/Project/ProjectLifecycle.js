import React from 'react';
import { Card } from 'react-bootstrap';
import { CheckCircle, Circle } from 'lucide-react';

export default function ProjectLifecycle({ stages = [], currentStage, status }) {
    // stages: Array of strings (e.g. ["INQUIRY", "ESTIMATION", ...]) defining the workflow
    // currentStage: string (the current active stage ID/Name)

    // Fallback if no stages provided (e.g. loading or legacy)
    const activeStages = (stages && stages.length > 0)
        ? stages
        : ["INQUIRY", "ESTIMATION", "QUOTATION", "PRODUCTION", "DELIVERY", "COMPLETION"];

    // Find index of current stage
    // If currentStage is an object (from history), use .stageType, else use string
    const currentName = (typeof currentStage === 'object' ? currentStage?.stageType : currentStage) || status;

    let currentIndex = activeStages.indexOf(currentName);

    // Handle "COMPLETED" status if not an explicit stage
    if (currentIndex === -1 && status === 'COMPLETED') {
        currentIndex = activeStages.length; // Treat as past the last stage
    }

    return (
        <Card className="mb-3 border-0 shadow-sm" style={{ background: 'linear-gradient(to right, #f8f9fa, #ffffff)' }}>
            <Card.Body className="py-4">
                <div className="d-flex justify-content-between align-items-center position-relative px-2">
                    {/* Connection Line */}
                    <div
                        className="position-absolute"
                        style={{
                            top: '20px', left: '30px', right: '30px', height: '3px', backgroundColor: '#e9ecef', zIndex: 0
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${(currentIndex / (activeStages.length - 1)) * 100}%`,
                                backgroundColor: '#0d6efd',
                                transition: 'width 0.5s ease-in-out'
                            }}
                        />
                    </div>

                    {activeStages.map((step, idx) => {
                        const isCompleted = currentIndex !== -1 && idx < currentIndex;
                        const isCurrent = step === currentName;
                        const isFuture = idx > currentIndex;

                        return (
                            <div key={step} className="d-flex flex-column align-items-center" style={{ zIndex: 1, position: 'relative' }}>
                                <div
                                    className={`rounded-circle d-flex align-items-center justify-content-center transition-all`}
                                    style={{
                                        width: isCurrent ? '42px' : '36px',
                                        height: isCurrent ? '42px' : '36px',
                                        backgroundColor: isCompleted || isCurrent ? '#0d6efd' : '#fff',
                                        border: isFuture ? '2px solid #dee2e6' : 'none',
                                        color: isFuture ? '#adb5bd' : '#fff',
                                        boxShadow: isCurrent ? '0 0 0 4px rgba(13, 110, 253, 0.2)' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {isCompleted ? <CheckCircle size={20} /> : (idx + 1)}
                                </div>
                                <div
                                    className={`mt-2 text-center small fw-bold text-uppercase`}
                                    style={{
                                        color: isCurrent ? '#0d6efd' : (isCompleted ? '#495057' : '#adb5bd'),
                                        fontSize: '0.7rem',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    {step}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card.Body>
        </Card>
    );
}
