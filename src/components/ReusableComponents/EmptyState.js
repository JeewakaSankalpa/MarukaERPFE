import React from 'react';
import { Button } from 'react-bootstrap';
import { FaBoxOpen } from 'react-icons/fa';

/**
 * Empty State Component
 * @param {string} title - Title (e.g., "No Items Found")
 * @param {string} message - Description (e.g., "Try adjusting your filters")
 * @param {function} onAction - Callback for action button
 * @param {string} actionLabel - Label for action button
 * @param {React.ReactNode} icon - Custom icon (defaults to FaBoxOpen)
 */
const EmptyState = ({
    title = "No Data Available",
    message = "There are no records to display at the moment.",
    onAction,
    actionLabel = "Create New",
    icon
}) => {
    return (
        <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center text-muted">
            <div className="mb-3 text-secondary" style={{ opacity: 0.5 }}>
                {icon || <FaBoxOpen size={48} />}
            </div>
            <h5 className="fw-bold text-dark">{title}</h5>
            <p className="mb-4" style={{ maxWidth: '400px' }}>{message}</p>

            {onAction && (
                <Button variant="primary" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;
