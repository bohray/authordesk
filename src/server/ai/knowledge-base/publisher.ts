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
export function publisherNames(name: string = env().PUBLISHER_NAME): PublisherNames {
  const short = name.replace(/\s+(Publishing|Publishers|Publications|Press|Books|House)$/i, "").trim() || name;
  return { name, short, store: `${short} Store` };
}

/** Every platform a published book can be listed on (KB: Distribution & Availability). */
export function allPlatforms(p: PublisherNames): string[] {
  return ["Amazon India", "Flipkart", "Amazon US", "Amazon UK", p.store];
}

export const payoutThresholdInr = 1000;
