import React, { useState, useEffect } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { Form, Spinner } from 'react-bootstrap';
import api from '../../../api/api';
import { toast } from 'react-toastify';

const ProjectGantt = ({ projectId, reloadKey }) => {
    const [tasks, setTasks] = useState([]);
    const [ganttTasks, setGanttTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState(ViewMode.Day);

    const loadData = React.useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/tasks/by-project/${projectId}`);
            const rawTasks = res.data;
            setTasks(rawTasks);

            // Transform for Gantt
            const transformed = rawTasks.map(t => {
                const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt || Date.now());
                let end = t.dueDate ? new Date(t.dueDate) : new Date(start);

                // Ensure end > start (Gantt requirement)
                if (end <= start) {
                    end = new Date(start);
                    end.setDate(end.getDate() + 1);
                }

                return {
                    start,
                    end,
                    name: t.name,
                    id: t.id,
                    type: 'task',
                    progress: t.estimatedHours ? Math.min(100, (t.loggedHours || 0) / t.estimatedHours * 100) : 0,
                    isDisabled: false,
                    styles: { progressColor: t.status === 'DONE' ? '#198754' : '#0d6efd', backgroundColor: t.status === 'DONE' ? '#d1e7dd' : '#cfe2ff' }
                };
            });

            // If no tasks, we don't set anything to avoid empty errors if the lib is strict
            setGanttTasks(transformed.length > 0 ? transformed : []);

        } catch (e) {
            console.error(e);
            toast.error("Failed to load tasks for Gantt");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData, reloadKey]);

    const handleTaskChange = async (task) => {
        // Handle drag/drop date changes
        const original = tasks.find(t => t.id === task.id);
        if (!original) return;

        // format to YYYY-MM-DD
        const newStart = task.start.toISOString().split('T')[0];
        const newEnd = task.end.toISOString().split('T')[0];

        // Optimistic update
        setGanttTasks(prev => prev.map(t => (t.id === task.id ? task : t)));

        try {
            await api.put(`/tasks/${task.id}`, {
                ...original,
                startDate: newStart,
                dueDate: newEnd,
                projectId
            });
            // toast.success("Timeline updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update task dates");
            loadData(); // Revert on failure
        }
    };

    if (loading) return <Spinner animation="border" />;
    if (ganttTasks.length === 0) return <div className="text-center text-muted p-5">No tasks with timeline data found. Add tasks to see the chart.</div>;

    return (
        <div className="bg-white p-3 rounded shadow-sm overflow-hidden">
            <div className="d-flex justify-content-end mb-3 gap-2">
                <Form.Select
                    style={{ width: 'auto' }}
                    value={viewMode}
                    onChange={e => setViewMode(e.target.value)}
                    size="sm"
                >
                    <option value={ViewMode.Day}>Day</option>
                    <option value={ViewMode.Week}>Week</option>
                    <option value={ViewMode.Month}>Month</option>
                </Form.Select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <Gantt
                    tasks={ganttTasks}
                    viewMode={viewMode}
                    onDateChange={handleTaskChange}
                    listCellWidth="155px"
                    columnWidth={viewMode === ViewMode.Month ? 300 : 60}
                />
            </div>
        </div>
    );
};

export default ProjectGantt;
