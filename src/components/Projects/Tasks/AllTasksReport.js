import React, { useState } from 'react';
import { Container, Button } from 'react-bootstrap';
import ProjectTaskReport from './ProjectTaskReport';
import WorkerSummaryReport from './WorkerSummaryReport';

const AllTasksReport = () => {
    const [activeTab, setActiveTab] = useState('tasks');

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                <div>
                    <h3 className="mb-0 text-primary">Global Task &amp; Time Tracking Report</h3>
                    <p className="text-muted small mb-0 mt-1">
                        Aggregated task status and time logs across all projects in the system.
                    </p>
                </div>
            </div>

            {/* Tab Buttons */}
            <div className="d-flex gap-2 mb-4">
                <Button
                    variant={activeTab === 'tasks' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('tasks')}
                >
                    📋 Task Report
                </Button>
                <Button
                    variant={activeTab === 'workers' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('workers')}
                >
                    👷 Worker Summary
                </Button>
            </div>

            {/* Tab Content */}
            {activeTab === 'tasks' && (
                <div className="bg-white p-3 rounded shadow-sm">
                    <p className="text-muted small mb-3">
                        All tasks across all projects — with assignee, status, hours logged per day, and notes.
                        Use the date filter to narrow results to a specific day.
                    </p>
                    <ProjectTaskReport />
                </div>
            )}

            {activeTab === 'workers' && (
                <div className="bg-white p-3 rounded shadow-sm">
                    <p className="text-muted small mb-3">
                        Worker-level summary — total tasks assigned, tasks completed, total hours logged, and recent activity.
                        Use the date range filter to see hours for a specific period.
                    </p>
                    <WorkerSummaryReport />
                </div>
            )}
        </Container>
    );
};

export default AllTasksReport;
