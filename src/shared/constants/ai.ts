/** Kinds of LLM call we make and log (one AiUsageLog row per attempt). */
export const aiOperations = ["CLASSIFY", "DRAFT"] as const;
export type AiOperation = (typeof aiOperations)[number];
