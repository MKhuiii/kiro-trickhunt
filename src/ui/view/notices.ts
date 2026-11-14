import type { Verdict } from "../../pipeline";
import type { MessageKey } from "../i18n/en";
import { noticeMessage } from "../i18n/messages";
import type { SemanticMode } from "./semantic-note";

export interface ResultExtras {
  semanticMode?: SemanticMode;
  ingestNotices?: readonly { kind: string }[];
  buildNotices?: readonly { kind: string }[];
  /** Only the count is used. */
  qrResults?: readonly { kind: string }[];
  /** Text the user typed or pasted. */
  userText?: string;
}

export interface NoticeView {
  readonly kind: string;
  readonly key: MessageKey;
  readonly params: Readonly<Record<string, string | number>>;
  readonly tone: "info" | "warning";
}

const WARNING_KINDS: ReadonlySet<string> = new Set([
  "ocr-too-poor",
  "ocr-failed",
  "payment-qr",
  "text-truncated",
  "urls-skipped",
]);

function kindsOf(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    const kind =
      typeof item === "object" && item !== null ? (item as { kind?: unknown }).kind : undefined;
    out.push(typeof kind === "string" ? kind : "");
  }
  return out;
}

/** Builds the notice list (REQ-UI-21). Total, never throws. */
export function buildNotices(
  verdict: Partial<Pick<Verdict, "inputTruncated" | "urlsSkipped">> | null | undefined,
  extras?: ResultExtras | null,
): NoticeView[] {
  try {
    const hasQr = Array.isArray(extras?.qrResults) && extras.qrResults.length > 0;
    const hasText = typeof extras?.userText === "string" && extras.userText.trim() !== "";
    const urlsSkipped =
      typeof verdict?.urlsSkipped === "number" && Number.isFinite(verdict.urlsSkipped)
        ? verdict.urlsSkipped
        : 0;

    const items: { kind: string; count?: number }[] = [
      ...kindsOf(extras?.ingestNotices).map((kind) => ({ kind })),
      ...kindsOf(extras?.buildNotices).map((kind) => ({ kind })),
    ];
    if (verdict?.inputTruncated === true) items.push({ kind: "text-truncated" });
    if (urlsSkipped > 0) items.push({ kind: "urls-skipped", count: urlsSkipped });

    const seen = new Set<string>();
    const out: NoticeView[] = [];
    for (const item of items) {
      if (seen.has(item.kind)) continue;
      seen.add(item.kind);
      if (item.kind === "ocr-too-poor" && (hasQr || hasText)) continue;
      const ref = noticeMessage(item.kind, item.count === undefined ? undefined : { count: item.count });
      out.push({
        kind: item.kind,
        key: ref.key,
        params: ref.params,
        tone: WARNING_KINDS.has(item.kind) ? "warning" : "info",
      });
    }
    return out;
  } catch {
    return [];
  }
}
