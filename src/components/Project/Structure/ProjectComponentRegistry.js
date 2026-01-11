import { COMPONENT_IDS } from '../ComponentRegistry';

/**
 * Registry to manage accessible components in the Project Details view.
 * Supports extending the view without modifying the core layout logic.
 */
class Registry {
    constructor() {
        this.components = new Map();
    }

    /**
     * Register a new component feature.
     * @param {Object} def Definition object
     * @param {string} def.id Unique key (e.g., 'FILES')
     * @param {string} def.label Human-readable label
     * @param {string} def.zone 'DASHBOARD' | 'TAB' | 'HEADER' | 'STATUS_CARD'
     * @param {Function} def.render Render factory: (props) => <Component .../>
     * @param {number} def.order Sort order (default 100)
     * @param {Object} def.layout Optional layout props (e.g. { md: 6, lg: 4 })
     */
    register(def) {
        if (!def.id || !def.render) {
            console.warn("Invalid component definition", def);
            return;
        }
        this.components.set(def.id, {
            order: 100,
            ...def
        });
    }

    get(id) {
        return this.components.get(id);
    }

    getAll() {
        return Array.from(this.components.values()).sort((a, b) => a.order - b.order);
    }

    getByZone(zone) {
        return this.getAll().filter(c => c.zone === zone);
    }

    /**
     * Check if a component is visible based on the "Visible Components" list from backend.
     * @param {string} id Component ID
     * @param {Array<string>} visibleList List of IDs visible to the current user
     */
    isVisible(id, visibleList) {
        // If no list provided (legacy/error), default to true for safety or false? 
        // Existing logic implies explicit list. If list is missing, usually we default to defaults.
        if (!visibleList) return false;
        return visibleList.includes(id);
    }
}

export const ProjectComponentRegistry = new Registry();
