import React from 'react';
import { Container } from 'react-bootstrap';
import ProjectTaskReport from './ProjectTaskReport';

const AllTasksReport = () => {
    return (
        <Container fluid className="py-4">
            <h3 className="mb-4 text-primary border-bottom pb-2">Global Task & Time Tracking Report</h3>
            <p className="text-muted mb-4">
                This report aggregates task status and time logs across all projects in the system. 
                Use the date filter to see hours worked on a specific day, or leave it blank to see overall progress.
            </p>
            <div className="bg-white p-3 rounded shadow-sm">
                <ProjectTaskReport />
            </div>
        </Container>
    );
};

export default AllTasksReport;
