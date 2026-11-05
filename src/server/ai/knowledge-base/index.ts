import type { TicketCategory } from "@/shared/constants/ticket";
import { responseGuidance, type ResponseGuidance } from "./examples";
import { categoryDefinitions, categoryKbSections, kbSections } from "./policies";
import type { PublisherNames } from "./publisher";
import { toneGuidelines } from "./tone";

export { categoryDefinitions, categoryKbSections, kbSections, toneGuidelines, responseGuidance };
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
export function knowledgeForCategory(category: TicketCategory, publisher: PublisherNames): CategoryKnowledge {
  const all = kbSections(publisher);
  return {
    overview: all.OVERVIEW_BRIEF,
    sections: categoryKbSections[category].map((key) => all[key]),
    guidance: responseGuidance[category].slice(0, 2),
  };
}
