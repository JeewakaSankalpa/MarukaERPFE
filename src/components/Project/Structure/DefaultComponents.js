import React from 'react';
import { ProjectComponentRegistry } from './ProjectComponentRegistry';
import { COMPONENT_IDS } from '../ComponentRegistry';

import { OverviewCard, StatusCard } from './StandardCards';
import { TasksContainer } from './TasksContainer';

// Lazy Load Components
const ProjectFiles = React.lazy(() => import('../ProjectFiles'));
const ProjectEstimationCard = React.lazy(() => import('../ProjectEstimationCard'));
const ProjectQuotationCard = React.lazy(() => import('../ProjectQuotationCard'));
const DeliveryScheduleCard = React.lazy(() => import('../DeliveryScheduleCard'));
const ProjectInventoryCard = React.lazy(() => import('../ProjectInventoryCard'));
const TimelineCard = React.lazy(() => import('../TimelineCard'));
const ProjectPaymentsCard = React.lazy(() => import('../ProjectPaymentsCard'));
const ProjectRevisions = React.lazy(() => import('../ProjectRevisions'));
const ProjectComments = React.lazy(() => import('../ProjectComments'));
const ProjectWorkflowTab = React.lazy(() => import('../ProjectWorkflowTab'));
const ProjectFinanceTab = React.lazy(() => import('../ProjectFinanceTab'));


export const registerDefaultComponents = () => {

    // --- DASHBOARD ZONE ---

    ProjectComponentRegistry.register({
        id: 'OVERVIEW',
        label: 'Project Overview',
        zone: 'DASHBOARD',
        order: 10,
        layout: { md: 6, lg: 4 },
        render: (props) => <OverviewCard {...props} />
    });

    ProjectComponentRegistry.register({
        id: 'STATUS',
        label: 'Current Status & Actions',
        zone: 'DASHBOARD',
        order: 20,
        layout: { md: 6, lg: 4 },
        render: (props) => <StatusCard {...props} />
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.TIMELINE,
        label: 'Timeline',
        zone: 'DASHBOARD',
        order: 30,
        layout: { md: 12, lg: 4 },
        render: (props) => (
            <TimelineCard
                projectId={props.id}
                project={props.project}
                readOnly={!!props.readOnly || !!props.viewVersion}
                onRefresh={props.refresh}
            />
        )
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.FILES,
        label: 'Files',
        zone: 'DASHBOARD',
        order: 40,
        layout: { lg: 6 },
        render: (props) => (
            <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <span>Files</span>
                    {props.stageObj?.stageType && <span className="badge bg-secondary">{props.stageObj.stageType}</span>}
                </div>
                <div className="card-body" style={{ overflowY: 'auto' }}>
                    <ProjectFiles
                        id={props.id}
                        actions={props.effectiveActions}
                        stageObj={props.stageObj}
                        roleHeader={props.roleHeader}
                        onAfterChange={props.refresh}
                        reloadKey={props.filesReloadKey}
                        filesOverride={props.viewVersion?.files}
                        readOnly={!!props.viewVersion}
                    />
                </div>
            </div>
        )
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.ESTIMATION,
        label: 'Estimation',
        zone: 'DASHBOARD',
        order: 50,
        layout: { lg: 6 },
        render: (props) => (
            <>
                <div className="mb-3">
                    <ProjectEstimationCard
                        projectId={props.id}
                        currency={props.project?.currency}
                        readOnly={!!props.viewVersion}
                        reloadKey={props.refreshKey}
                    />
                </div>
                <ProjectQuotationCard
                    project={props.project}
                    projectId={props.id}
                    currency={props.project?.currency}
                    isVisible={true}
                    reloadKey={props.refreshKey}
                />
            </>
        )
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.DELIVERY,
        label: 'Delivery Schedule',
        zone: 'DASHBOARD',
        order: 60,
        layout: { lg: 12 },
        render: (props) => <DeliveryScheduleCard projectId={props.id} reloadKey={props.refreshKey} />
    });

    // --- TABS ZONE ---

    ProjectComponentRegistry.register({
        id: 'DASHBOARD',
        label: 'Dashboard',
        zone: 'TAB',
        order: 0,
        render: () => null // Placeholder as content is handled explicitly in ProjectDetails
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.REVISIONS,
        label: 'Revisions',
        zone: 'TAB',
        order: 10,
        render: (props) => (
            <ProjectRevisions
                projectId={props.id}
                versions={props.project?.versions}
                stages={props.project?.stages}
                currentStageType={props.stageObj?.stageType}
                roleHeader={props.roleHeader}
                onRevise={props.refresh}
                onViewSnapshot={props.onViewSnapshot}
            />
        )
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.INVENTORY,
        label: 'Inventory',
        zone: 'TAB',
        order: 20,
        render: (props) => <ProjectInventoryCard projectId={props.id} reloadKey={props.refreshKey} />
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.PAYMENTS,
        label: 'Payments',
        zone: 'TAB',
        order: 30,
        render: (props) => (
            <div className="mt-3">
                <ProjectPaymentsCard
                    projectId={props.id}
                    project={props.project}
                    currency={props.project?.currency}
                    onRefresh={props.refresh}
                    reloadKey={props.refreshKey}
                />
            </div>
        )
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.TASKS,
        label: 'Tasks',
        zone: 'TAB',
        order: 40,
        render: (props) => <TasksContainer id={props.id} refreshKey={props.refreshKey} />
    });

    ProjectComponentRegistry.register({
        id: 'COMMUNICATION',
        label: 'Communication',
        zone: 'TAB',
        order: 50,
        render: (props) => (
            <div className="mt-3">
                <ProjectComments projectId={props.id} />
            </div>
        )
    });

    ProjectComponentRegistry.register({
        id: COMPONENT_IDS.WORKFLOW,
        label: 'Workflow',
        zone: 'TAB',
        order: 60,
        render: (props) => (
            <ProjectWorkflowTab
                projectId={props.id}
                currentWorkflow={props.project?.workflowSnapshot}
                currentStageId={props.project?.currentStageId}
                onUpdate={props.refresh}
            />
        )
    });

    ProjectComponentRegistry.register({
        id: 'FINANCE',
        label: 'Finance',
        zone: 'TAB',
        order: 70,
        render: (props) => <ProjectFinanceTab projectId={props.id} currency={props.project?.currency} />
    });

};
