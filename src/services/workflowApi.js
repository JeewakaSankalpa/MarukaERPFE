// @ts-check
import api from "../api/api";
import "../types/workflow.js"; // <-- gives the typedefs to this file

/**
 * @returns {Promise<ProjectFlowDTO>}
 */
export async function getWorkflow() {
    const { data } = await api.get("/workflow"); // e.g., GET /api/workflow
    return data;
}

/**
 * @param {ProjectFlowDTO} flow
 * @returns {Promise<ProjectFlowDTO>}
 */
export async function saveWorkflow(flow) {
    const { data } = await api.put("/workflow", flow);
    return data;
}
