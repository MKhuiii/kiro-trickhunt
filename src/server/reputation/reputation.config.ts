import type { ReputationCategory } from "../../analyzers/reputation-checker";

export const REPUTATION_ENDPOINT =
  "https://safebrowsing.googleapis.com/v5/hashes:search";
export const HASH_PREFIX_BYTES = 4;
export const MAX_PREFIXES_PER_REQUEST = 100; // hard provider limit is 1000
export const MAX_RESPONSE_CHARS = 262_144;
export const MAX_HOST_SUFFIXES = 4; // plus the exact host
export const MAX_PATH_DIRECTORIES = 4; // "/", "/a/", "/a/b/", "/a/b/c/"

export const THREAT_CATEGORY_BY_TYPE: Readonly<
  Record<string, ReputationCategory>
> = {
  SOCIAL_ENGINEERING: "social-engineering",
  MALWARE: "malware",
  UNWANTED_SOFTWARE: "unwanted-software",
  POTENTIALLY_HARMFUL_APPLICATION: "other",
};

export const DISREGARDED_THREAT_TYPES: readonly string[] = [
  "THREAT_TYPE_UNSPECIFIED",
  "",
];

/** Attributes that still allow enforcement. Today none: any attribute disregards the detail. */
export const ENFORCEABLE_ATTRIBUTES: readonly string[] = [];

export const REPUTATION_CONFIG_LIMITS = {
  timeoutMs: { default: 3000, min: 500, max: 6000 },
  callsPerMinute: { default: 10, min: 0, max: 60 },
  callsPerDay: { default: 2000, min: 0, max: 10000 },
} as const;
