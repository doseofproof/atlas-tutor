/**
 * Server-side AI gateway client (website-ai skill template).
 * Contract unchanged: listModels() + classifyAiError().
 * The gateway credential is server-side only.
 */
export {
  listModels,
  classifyAiError,
  isRetryableAiError,
  AiUnavailable,
  ContentRejected,
  AiMisconfigured,
  AiInvalidRequest,
  AiTransient,
  type ModelInfo,
  type ModelList,
} from "./templates/ai-client";
