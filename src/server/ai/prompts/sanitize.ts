/**
 * Prompt-injection guard, part 1: author text is wrapped in delimiter tags and the system
 * prompt declares tag content to be DATA. That only works if an author cannot close the tag
 * themselves, so any of our delimiter tags appearing inside user text are neutralised.
 */
const reservedTags = /<\s*\/?\s*(author_message|support_reply|ticket|facts|knowledge_base|guidance|conversation)\b[^>]*>/gi;

export function neutraliseTags(text: string): string {
  return text.replace(reservedTags, "[tag removed]");
}

/** Truncate on a word boundary and mark it, so the model knows text was cut (cost control). */
export function truncate(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars * 0.8 ? cut.slice(0, lastSpace) : cut).trimEnd()} …[truncated]`;
}

export function wrapAuthorText(text: string, maxChars: number): string {
  return `<author_message>\n${neutraliseTags(truncate(text, maxChars))}\n</author_message>`;
}
