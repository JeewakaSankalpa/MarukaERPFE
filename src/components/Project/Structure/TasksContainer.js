import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
// Lazy load passed components or import directly? Import directly for container is cleaner
const ProjectTasks = React.lazy(() => import('../../Projects/Tasks/ProjectTasks'));
const ProjectKanban = React.lazy(() => import('../../Projects/Tasks/ProjectKanban'));
const ProjectGantt = React.lazy(() => import('../../Projects/Tasks/ProjectGantt'));

export const TasksContainer = ({ id, refreshKey }) => {
    const [taskSubTab, setTaskSubTab] = useState('list'); // list, kanban, gantt

    return (
        <div className="mt-3">
            <div className="d-flex gap-2 mb-3">
                <Button variant={taskSubTab === 'list' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setTaskSubTab('list')}>List View</Button>
                <Button variant={taskSubTab === 'kanban' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setTaskSubTab('kanban')}>Kanban Board</Button>
                <Button variant={taskSubTab === 'gantt' ? 'primary' : 'outline-primary'} size="sm" onClick={() => setTaskSubTab('gantt')}>Gantt Chart</Button>
            </div>

            <React.Suspense fallback={<div>Loading tasks...</div>}>
                {taskSubTab === 'list' && (
                    <div className="bg-white shadow-sm rounded">
                        <ProjectTasks projectId={id} reloadKey={refreshKey} />
                    </div>
                )}
                {taskSubTab === 'kanban' && (
                    <div className="">
                        <ProjectKanban projectId={id} reloadKey={refreshKey} />
                    </div>
                )}
                {taskSubTab === 'gantt' && (
                    <div className="">
                        <ProjectGantt projectId={id} reloadKey={refreshKey} />
                    </div>
                )}
            </React.Suspense>
        </div>
    );
};
