import React from 'react';
import { Card, Badge } from 'react-bootstrap';

// Standard Stages order for visualization (can be dynamic if needed)
const FLOW_STEPS = ["INQUIRY", "DESIGN", "ESTIMATION", "QUOTATION", "NEGOTIATION", "ACTIVE", "COMPLETED"];

export default function ProjectLifecycle({ stages, currentStage, status }) {
    // If stages are passed as objects (ProjectStage history), we need the Full Workflow Definition really.
    // But typically this component visualizes the *Ideal* flow.
    // If the prop `stages` is the Project's history, it might be incomplete.
    // However, if we assume the standard linear flow for now or try to deduce it:

    // Better approach: Use the stages from the Definition if possible.
    // Since we don't have the definition passed here, let's try to trust the 'status' or just use the passed stages if they look like the full set.

    // For now, let's revert to a more generic list if not provided, OR try to display the actual history + future?
    // User complaint: "did not let me add revisions at each stage".

    // Let's stick to the FIXED list but ensure it matches the backend ENUMs exactly if that's what's broken.
    // The strict backend validation requires normalized names.
    // FLOW_STEPS = ["INQUIRY", "ESTIMATION", "QUOTATION", "PRODUCTION", "DELIVERY", "COMPLETION"] matches StageType enum.
    // "DESIGN" & "NEGOTIATION" were removed in the Enum? Let's check StageType.java.
    // I saw StageType.java earlier: INQUIRY, ESTIMATION, QUOTATION, PRODUCTION, DELIVERY, COMPLETION.
    // "DESIGN" and "NEGOTIATION" are NOT in StageType.java. That explains why the UI looks wrong if it expects them!

    const FLOW_STEPS = ["INQUIRY", "ESTIMATION", "QUOTATION", "PRODUCTION", "DELIVERY", "COMPLETION"];

    // Find index of current stage
    const currentType = currentStage?.stageType || status;
    const currentIndex = FLOW_STEPS.indexOf(currentType);

    const steps = FLOW_STEPS;

    return (
        <Card className="mb-3">
            <Card.Body className="py-3">
                <div className="d-flex justify-content-between align-items-center position-relative">
                    {/* Connection Line */}
                    <div
                        className="position-absolute"
                        style={{
                            top: '50%', left: '0', right: '0', height: '2px', backgroundColor: '#e9ecef', zIndex: 0
                        }}
                    />

                    {steps.map((step, idx) => {
                        // Logic: Completed if index < current. Current if match.
                        // If current is unknown (e.g. Cancelled), handle gracefully?
                        const isCompleted = currentIndex !== -1 && idx < currentIndex;
                        const isCurrent = step === currentType;

                        return (
                            <div key={step} className="d-flex flex-column align-items-center" style={{ zIndex: 1, backgroundColor: 'white', padding: '0 10px' }}>
                                <div
                                    className={`rounded-circle d-flex align-items-center justify-content-center border ${isCurrent ? 'border-primary bg-primary text-white' : isCompleted ? 'border-primary bg-white text-primary' : 'border-secondary bg-white text-muted'}`}
                                    style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}
                                >
                                    {isCompleted ? '✓' : idx + 1}
                                </div>
                                <div className="mt-1 text-center small fw-bold" style={{ color: isCurrent ? '#0d6efd' : '#6c757d', fontSize: '0.75rem' }}>
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
