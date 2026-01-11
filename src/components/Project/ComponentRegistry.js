import { ProjectComponentRegistry } from './Structure/ProjectComponentRegistry';
import { registerDefaultComponents } from './Structure/DefaultComponents';
import { COMPONENT_IDS } from './Structure/ProjectConstants';

// Initialize defaults once
registerDefaultComponents();

// Re-export constants for backward compatibility
export { COMPONENT_IDS };

// Legacy array for Workflow Builder - Dynamic Proxy
export const PROJECT_COMPONENTS = ProjectComponentRegistry.getAll().map(c => ({
    id: c.id,
    label: c.label,
    description: c.description || c.label
}));

export const DEFAULT_VISIBLE_COMPONENTS = PROJECT_COMPONENTS.map(c => c.id);

// Export Registry for new consumers
export { ProjectComponentRegistry };
