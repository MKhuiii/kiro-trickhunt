// Orchestrates one check: optional image ingest, request building, analyze call.
// Pure of React and browser globals; dependencies are injected. Never throws.

import type {
  AnalyzeClientResult,
  AnalyzeRequest,
  BuildAnalyzeResult,
  IngestResult,
} from "../client/ingest";
import type { Verdict } from "../pipeline";
import { analyzeErrorMessage, ingestErrorMessage } from "./i18n/messages";
import type { MessageRef } from "./i18n/messages";
import type { ResultExtras } from "./view/notices";

export type CheckLocale = "vi" | "en";

export interface NoticeInput {
  readonly kind: string;
}

export interface CheckDeps {
  ingestImage(
    file: File,
    onProgress: (p: { stage: string; progress: number }) => void,
  ): Promise<IngestResult>;
  buildAnalyzeRequest(input: {
    userText: string;
    ocrText?: string;
    qrResults?: IngestResult["qrResults"];
    locale: CheckLocale;
    checkLinks?: boolean;
  }): BuildAnalyzeResult;
  analyzeRequest(request: AnalyzeRequest): Promise<AnalyzeClientResult>;
}

export type CheckStatus = "preparing" | "qr" | "ocr-loading" | "ocr-recognizing" | "sending";

export type CheckOutcome =
  | { kind: "nothing" }
  | { kind: "failed"; message: MessageRef; notices: NoticeInput[] }
  | { kind: "done"; verdict: Verdict; inputText: string; extras: ResultExtras };

export interface CheckInput {
  readonly userText: string;
  readonly file: File | null;
  readonly locale: CheckLocale;
  readonly checkLinks?: boolean;
}

const GENERIC_FAILURE: MessageRef = { key: "error.generic", params: {}, technicalCode: "unknown" };

function stageToStatus(stage: unknown): CheckStatus | null {
  if (typeof stage !== "string") return null;
  const s = stage.toLowerCase();
  if (s.includes("load") || s.includes("init")) return "ocr-loading";
  if (s.includes("recogn")) return "ocr-recognizing";
  return null;
}

export async function runCheck(
  deps: CheckDeps,
  input: CheckInput,
  onStatus: (s: CheckStatus, percent?: number) => void,
): Promise<CheckOutcome> {
  const emit = (s: CheckStatus, percent?: number): void => {
    try {
      onStatus(s, percent);
    } catch {
      // A failing status callback must not break the check.
    }
  };

  try {
    const userText = typeof input.userText === "string" ? input.userText : "";
    const hasText = userText.trim() !== "";
    const file = input.file ?? null;

    // Rule 1
    if (!hasText && file === null) return { kind: "nothing" };

    // Rule 2
    let ocrText: string | undefined;
    let qrResults: IngestResult["qrResults"] = [];
    let ingestNotices: NoticeInput[] = [];
    if (file !== null) {
      emit("preparing");
      const ingest = await deps.ingestImage(file, (p) => {
        const status = stageToStatus(p?.stage);
        if (status !== null) {
          emit(status, typeof p.progress === "number" ? p.progress : undefined);
        }
      });
      ingestNotices = ingest.notices.map((n) => ({ kind: n.kind }));
      if (ingest.errorCode !== undefined) {
        if (!hasText) {
          return {
            kind: "failed",
            message: ingestErrorMessage(ingest.errorCode),
            notices: ingestNotices,
          };
        }
        ingestNotices = [...ingestNotices, { kind: "ocr-failed" }];
      }
      ocrText = ingest.ocrText;
      qrResults = ingest.qrResults;
    }

    // Rule 3
    const built = deps.buildAnalyzeRequest({
      userText,
      ocrText,
      qrResults,
      locale: input.locale,
      checkLinks: input.checkLinks === true,
    });
    if (built.request === null) return { kind: "nothing" };

    // Rule 4 and 6: only the built request is sent.
    emit("sending");
    const result = await deps.analyzeRequest(built.request);
    if (!result.ok) {
      return {
        kind: "failed",
        message: analyzeErrorMessage(result.code, result.retryAfterSec),
        notices: ingestNotices,
      };
    }
    return {
      kind: "done",
      verdict: result.verdict,
      inputText: built.request.text ?? "",
      extras: {
        semanticMode: result.semanticMode,
        reputationMode: result.reputationMode,
        ingestNotices,
        buildNotices: built.notices.map((n) => ({ kind: n.kind })),
        qrResults,
        userText,
      },
    };
  } catch {
    // Rule 5
    return { kind: "failed", message: GENERIC_FAILURE, notices: [] };
  }
}
