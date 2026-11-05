import type { PublisherNames } from "./publisher";

/** Communication tone guidelines (verbatim from the KB, publisher name templated). */
export function toneGuidelines(publisher: PublisherNames): string {
  return `Communication Tone Guidelines:
- Always empathetic and professional. Authors are partners, not customers to be managed.
- Acknowledge the author's concern before jumping to solutions.
- Be specific: include actual numbers, dates, and statuses wherever possible rather than vague reassurances.
- If something is ${publisher.name}'s fault (delayed royalties, ISBN error), own it directly. No corporate deflection.
- If the issue requires escalation or investigation, give a clear timeline ("Our team will look into this and get back to you within 48 hours") rather than open-ended promises.
- Always end with a clear next step for the author and/or the team.`;
}
