import type { TicketCategory } from "@/shared/constants/ticket";
import { RESPONSE_GUIDANCE, type ResponseGuidance } from "./examples";
import { CATEGORY_DEFINITIONS, CATEGORY_KB_SECTIONS, kbSections } from "./policies";
import type { PublisherNames } from "./publisher";
import { toneGuidelines } from "./tone";

export { CATEGORY_DEFINITIONS, CATEGORY_KB_SECTIONS, kbSections, toneGuidelines, RESPONSE_GUIDANCE };
export type { ResponseGuidance };

export interface CategoryKnowledge {
  overview: string;
  sections: string[];
  guidance: ResponseGuidance[];
}

/**
 * "Retrieval" for a 1-page KB: a deterministic category → section lookup. With a KB this
 * small, embeddings/vector search would add cost, latency and failure modes for no recall
 * gain; the category (already computed) is the best possible retrieval key.
 */
export function knowledgeForCategory(category: TicketCategory, p: PublisherNames): CategoryKnowledge {
  const all = kbSections(p);
  return {
    overview: all.OVERVIEW_BRIEF,
    sections: CATEGORY_KB_SECTIONS[category].map((k) => all[k]),
    guidance: RESPONSE_GUIDANCE[category].slice(0, 2),
  };
}
