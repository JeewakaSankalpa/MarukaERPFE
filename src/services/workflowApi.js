// @ts-check
import api from "../api/api";
/**
 * @typedef {Object} ProjectFlowDTO
 * @property {string} id
 * @property {string[]} stages
 */

/**
 * @returns {Promise<ProjectFlowDTO>}
 */
export async function getWorkflow(id) {
    const url = id ? `/workflow/${id}` : "/workflow";
    const { data } = await api.get(url);
    return data;
}

/**
 * @returns {Promise<WorkflowSummaryDTO[]>}
 */
export async function listWorkflows() {
    const { data } = await api.get("/workflow/list");
    return data;
}

/**
 * @param {ProjectFlowDTO} flow
 * @param {string} [id] - Optional ID to save as (if creating or updating specific)
 * @returns {Promise<ProjectFlowDTO>}
 */
export async function saveWorkflow(flow, id) {
    // If flow has an ID and we want to enforce it, or if 'active'
    const targetId = id || flow.id || "active";
    const { data } = await api.put(`/workflow/${targetId}`, flow);
    return data;
}

export async function activateWorkflow(id) {
    await api.post(`/workflow/${id}/activate`);
}

