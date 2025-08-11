/**
 * @typedef {"INQUIRY"|"ESTIMATION"|"QUOTATION"|"PRODUCTION"|"DELIVERY"|"COMPLETION"} StageType
 */

/**
 * @typedef {Object} TransitionRule
 * @property {StageType} to
 * @property {string[]} roles
 * @property {string[]=} notifyRoles
 */

/**
 * @typedef {Object} ProjectFlowDTO
 * @property {StageType[]} stages
 * @property {Record<StageType, string[]>} requiredApprovals
 * @property {Record<StageType, TransitionRule[]>} transitions
 * @property {StageType} initialStage
 * @property {number} version
 */
