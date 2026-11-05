import "server-only";
import { env } from "@/server/config/env";

export interface PublisherNames {
  /** "Inkwell Publishing" */
  name: string;
  /** "Inkwell" */
  short: string;
  /** "Inkwell Store" (matches the platform names stored on books) */
  store: string;
}

/** Brand strings are configuration, not code: the same AI layer serves any publisher name. */
/** Trailing words dropped to get the short brand ("Inkwell Publishing" → "Inkwell"). */
const corporateSuffix = /\s+(Publishing|Publishers|Publications|Press|Books|House)$/i;

/** Third-party marketplaces every published book can be listed on (besides our own store). */
const marketplacePlatforms = ["Amazon India", "Flipkart", "Amazon US", "Amazon UK"] as const;

export function publisherNames(name: string = env().PUBLISHER_NAME): PublisherNames {
  const short = name.replace(corporateSuffix, "").trim() || name;
  return { name, short, store: `${short} Store` };
}

/** Every platform a published book can be listed on (KB: Distribution & Availability). */
export function allPlatforms(publisher: PublisherNames): string[] {
  return [...marketplacePlatforms, publisher.store];
}

export const payoutThresholdInr = 1000;
