import { decodeQr } from "./decode-qr";
import type { DecodeQrDeps, QrErrorCode } from "./decode-qr";
import { SKIP_OCR_WHEN_QR_FOUND } from "./ingest.config";
import { assessOcr } from "./ocr-quality";
import { prepareImage } from "./prepare-image";
import type { PrepareErrorCode, PrepareImageDeps, PreparedImage } from "./prepare-image";
import { classifyQrPayload } from "./qr-payload";
import { runOcr } from "./run-ocr";
import type { OcrDeps, OcrErrorCode, OcrProgress } from "./run-ocr";
import type { ImageFileLike, QrClassification } from "./types";

export interface IngestDeps {
  readonly prepare: PrepareImageDeps;
  readonly qr: DecodeQrDeps;
  readonly ocr: OcrDeps;
}

export type IngestNotice = {
  readonly kind: "ocr-skipped" | "ocr-too-poor" | "ocr-failed";
};

export type IngestErrorCode =
  | PrepareErrorCode
  | OcrErrorCode
  | QrErrorCode
  | "unexpected";

export interface IngestOptions {
  readonly skipOcrWhenQrFound?: boolean;
  readonly signal?: AbortSignal;
  readonly onProgress?: (p: OcrProgress) => void;
}

export interface IngestResult {
  readonly ocrText?: string;
  readonly qrResults: QrClassification[];
  readonly notices: IngestNotice[];
  readonly errorCode?: IngestErrorCode;
}

function disposeOnce(image: PreparedImage): void {
  try {
    image.dispose();
  } catch {
    // Disposal failures are ignored.
  }
}

/**
 * Turns one image into OCR text and QR classifications, in the fixed order
 * prepare -> QR -> OCR. Raw QR payloads are classified immediately and never
 * returned. Never rejects.
 */
export async function ingestImage(
  file: ImageFileLike,
  deps: IngestDeps,
  options?: IngestOptions,
): Promise<IngestResult> {
  try {
    const prepared = await prepareImage(file, deps.prepare);
    if (!prepared.ok) {
      return { qrResults: [], notices: [], errorCode: prepared.code };
    }
    const image = prepared.image;
    try {
      const qrResults: QrClassification[] = [];
      const notices: IngestNotice[] = [];
      let ocrText: string | undefined;
      let stageError: IngestErrorCode | undefined;

      const qr = await decodeQr(image.imageData, deps.qr);
      for (const payload of qr.payloads) {
        qrResults.push(classifyQrPayload(payload));
      }
      if (qr.errorCode !== undefined) stageError = qr.errorCode;

      const skip = options?.skipOcrWhenQrFound ?? SKIP_OCR_WHEN_QR_FOUND;
      if (skip === true && qrResults.length > 0) {
        notices.push({ kind: "ocr-skipped" });
      } else {
        const ocr = await runOcr(image, deps.ocr, {
          signal: options?.signal,
          onProgress: options?.onProgress,
        });
        if (ocr.ok) {
          if (assessOcr({ text: ocr.text, confidence: ocr.confidence }) === "usable") {
            ocrText = ocr.text;
          } else {
            notices.push({ kind: "ocr-too-poor" });
          }
        } else {
          notices.push({ kind: "ocr-failed" });
          stageError ??= ocr.code;
        }
      }

      const result: IngestResult =
        ocrText === undefined && qrResults.length === 0 && stageError !== undefined
          ? { qrResults, notices, errorCode: stageError }
          : ocrText !== undefined
            ? { ocrText, qrResults, notices }
            : { qrResults, notices };
      return result;
    } finally {
      disposeOnce(image);
    }
  } catch {
    return { qrResults: [], notices: [], errorCode: "unexpected" };
  }
}
