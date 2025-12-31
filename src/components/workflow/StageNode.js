import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from 'react-bootstrap';
import { Settings, CheckCircle, FileText, Bell } from 'lucide-react';

const StageNode = memo(({ data, isConnectable, selected }) => {
    // data = { label, isInitial, approvals: [], notifications: [], hasFiles: boolean, onEdit: fn }

    return (
        <div
            className={`shadow-sm rounded border bg-white`}
            style={{
                minWidth: '200px',
                border: selected ? '2px solid #0d6efd' : '1px solid #dee2e6',
                transition: 'border 0.2s ease'
            }}
        >
            <div className={`p-2 border-bottom d-flex justify-content-between align-items-center ${data.isInitial ? 'bg-primary-subtle' : 'bg-light'} rounded-top`}>
                <div className="fw-bold text-truncate me-2" style={{ maxWidth: '140px' }} title={data.label}>
                    {data.label}
                </div>
                {data.isInitial ? <Badge bg="primary">Start</Badge> : null}
                <Settings
                    size={14}
                    className="text-muted cursor-pointer hover-dark"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onEdit && data.onEdit();
                    }}
                />
            </div>

            <div className="p-2 small">
                {/* Approvals */}
                {data.approvals && data.approvals.length > 0 && (
                    <div className="d-flex align-items-center text-muted mb-1">
                        <CheckCircle size={12} className="me-1" />
                        <span className="text-truncate" style={{ maxWidth: '160px' }}>
                            {data.approvals.join(', ')}
                        </span>
                    </div>
                )}

                {/* File Reqs */}
                {data.hasFiles && (
                    <div className="d-flex align-items-center text-muted mb-1">
                        <FileText size={12} className="me-1" />
                        <span>Files Required</span>
                    </div>
                )}

                {/* Notifications */}
                {data.notifications && data.notifications.length > 0 && (
                    <div className="d-flex align-items-center text-muted">
                        <Bell size={12} className="me-1" />
                        <span className="text-truncate">{data.notifications.length} notified</span>
                    </div>
                )}

                {(!data.approvals?.length && !data.hasFiles && !data.notifications?.length) && (
                    <div className="text-muted fst-italic text-center" style={{ fontSize: '0.7em' }}>
                        No rules
                    </div>
                )}
            </div>

            <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
        </div>
    );
});

export default StageNode;
