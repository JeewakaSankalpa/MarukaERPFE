import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import { Badge, Spinner } from 'react-bootstrap';
import api from '../../../api/api';
import { toast } from 'react-toastify';

const COLUMNS = [
    { id: 'TODO', title: 'To Do', color: 'secondary' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'primary' },
    { id: 'REVIEW', title: 'Review', color: 'warning' },
    { id: 'DONE', title: 'Done', color: 'success' }
];

// Draggable Task Card
const TaskCard = ({ task, isOverlay }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`p-2 mb-2 bg-white rounded shadow-sm border ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="fw-bold">{task.name}</div>
            <div className="small text-muted">{task.description}</div>
            <div className="d-flex justify-content-between mt-2 align-items-center">
                <Badge bg="light" text="dark" className="border">{task.priority}</Badge>
                {task.estimatedHours && <small className="text-muted">{task.estimatedHours}h</small>}
            </div>
            {task.assigneeName && <div className="small text-primary mt-1">👤 {task.assigneeName}</div>}
        </div>
    );
};

// Droppable Column
const KanbanColumn = ({ id, title, tasks, color }) => {
    const { setNodeRef } = useDroppable({
        id: id
    });

    return (
        <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 250, maxWidth: 350 }}>
            <div className={`p-2 mb-2 bg-${color} bg-opacity-10 rounded border border-${color} text-center fw-bold`}>
                {title} ({tasks.length})
            </div>
            <div ref={setNodeRef} className="flex-grow-1 bg-light rounded p-2" style={{ minHeight: 400 }}>
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                ))}
                {tasks.length === 0 && <div className="text-center text-muted small mt-5">Drop here</div>}
            </div>
        </div>
    );
};

const ProjectKanban = ({ projectId, reloadKey }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [tRes, eRes] = await Promise.all([
                api.get(`/tasks/by-project/${projectId}`),
                api.get("/employee/all")
            ]);

            const emps = eRes.data;
            const mappedTasks = tRes.data.map(t => ({
                ...t,
                assigneeName: emps.find(e => e.id === t.assignedTo)?.firstName || null
            }));

            setTasks(mappedTasks);
            setEmployees(emps);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData, reloadKey]);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const taskId = active.id;
        const newStatus = over.id; // The column ID is the status

        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Optimistic UI Update
        const previousTasks = [...tasks];
        setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)));

        try {
            await api.put(`/tasks/${taskId}`, {
                ...task,
                status: newStatus,
                projectId // Ensure projectId is sent
            });
            toast.success(`Moved to ${COLUMNS.find(c => c.id === newStatus)?.title}`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to update status");
            setTasks(previousTasks); // Revert
        }
    };

    const tasksByStatus = useMemo(() => {
        const groups = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
        tasks.forEach(t => {
            if (groups[t.status]) groups[t.status].push(t);
            else groups.TODO.push(t); // Fallback
        });
        return groups;
    }, [tasks]);

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    if (loading && tasks.length === 0) return <Spinner animation="border" />;

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="d-flex gap-3 overflow-auto pb-3" style={{ minHeight: 500 }}>
                {COLUMNS.map(col => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        color={col.color}
                        tasks={tasksByStatus[col.id] || []}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
};

export default ProjectKanban;
