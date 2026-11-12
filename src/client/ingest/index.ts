export * from "./ingest.config";
export type {
  AnalyzeRequest,
  CanvasLike,
  Context2DLike,
  ImageDataLike,
  ImageFileLike,
  QrClassification,
  QrKind,
} from "./types";

export { validateImageFile } from "./validate-image-file";
export type { ImageFileErrorCode, ImageFileValidation } from "./validate-image-file";
export { fitWithin } from "./fit-within";
export type { FittedSize } from "./fit-within";
export { classifyQrPayload, isHttpUrl } from "./qr-payload";
export { buildAnalyzeRequest } from "./analyze-input";
export type {
  BuildAnalyzeInput,
  BuildAnalyzeResult,
  BuildNotice,
  BuildNoticeKind,
} from "./analyze-input";
export { assessOcr } from "./ocr-quality";
export type { OcrQualityThresholds } from "./ocr-quality";

export { prepareImage } from "./prepare-image";
export type {
  DecodedImage,
  PrepareErrorCode,
  PrepareImageDeps,
  PrepareImageOptions,
  PrepareImageResult,
  PreparedImage,
} from "./prepare-image";
export { decodeQr } from "./decode-qr";
export type { DecodeQrDeps, DecodeQrOptions, DecodeQrResult, QrErrorCode } from "./decode-qr";
export { createZxingReader } from "./zxing-reader";
export type { QrReader, ZxingLibLike } from "./zxing-reader";
export { runOcr } from "./run-ocr";
export type {
  OcrDeps,
  OcrEngine,
  OcrErrorCode,
  OcrProgress,
  OcrWorkerLike,
  OcrWorkerOptions,
  RunOcrOptions,
  RunOcrResult,
} from "./run-ocr";
export { ingestImage } from "./ingest-image";
export type {
  IngestDeps,
  IngestErrorCode,
  IngestNotice,
  IngestOptions,
  IngestResult,
} from "./ingest-image";
export { analyzeRequest } from "./analyze-client";
export type {
  AnalyzeClientCode,
  AnalyzeClientDeps,
  AnalyzeClientResult,
  ResponseLike,
  SemanticMode,
} from "./analyze-client";
export { createBrowserIngestDeps } from "./browser-deps";
