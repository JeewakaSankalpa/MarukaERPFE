import React from 'react';
import { Spinner } from 'react-bootstrap';

/**
 * Loading State Component
 * @param {string} message - Loading message
 * @param {boolean} fullScreen - Center in viewport
 */
const LoadingState = ({ message = "Loading...", fullScreen = false }) => {
    const style = fullScreen
        ? { height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
        : { padding: '2rem', textAlign: 'center' };

    return (
        <div style={style}>
            <Spinner animation="border" variant="primary" role="status" className="mb-2">
                <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="text-muted small fw-medium animate-pulse">{message}</div>
        </div>
    );
};

export default LoadingState;
