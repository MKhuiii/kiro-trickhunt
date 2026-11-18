/**
 * reputation.config.ts — Texts and priority for the link reputation signal.
 *
 * Pure data apart from a type import. Texts never say a link is safe, and
 * never state a listing as a fact beyond "reported" (REQ-LREP-36, 41).
 */

import type { ReputationCategory } from "../analyzers/reputation-checker";

import type { Locale } from "./verdict";

type ByLocale<T> = Readonly<Record<Locale, T>>;

/** When one host has several categories, the lowest index wins. */
export const CATEGORY_PRIORITY: readonly ReputationCategory[] = [
  "social-engineering",
  "malware",
  "unwanted-software",
  "other",
];

export const CATEGORY_LABELS: ByLocale<Readonly<Record<ReputationCategory, string>>> = {
  en: {
    "social-engineering": "reported as deceptive",
    malware: "reported for harmful software",
    "unwanted-software": "reported for unwanted software",
    other: "reported site",
  },
  vi: {
    "social-engineering": "bị báo cáo là lừa đảo",
    malware: "bị báo cáo có phần mềm có hại",
    "unwanted-software": "bị báo cáo có phần mềm không mong muốn",
    other: "trang bị báo cáo",
  },
};

export const LISTED_WHY: ByLocale<string> = {
  en: "The link appears on a list of reported sites.",
  vi: "Đường dẫn xuất hiện trong danh sách các trang bị báo cáo.",
};
