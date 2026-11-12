export interface ImageDataLike {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

export interface Context2DLike {
  drawImage(source: unknown, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageDataLike;
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: "2d"): Context2DLike | null;
}

export interface ImageFileLike {
  readonly type: string;
  readonly size: number;
}

export type QrKind = "url" | "payment" | "wifi" | "contact" | "text" | "other";

export interface QrClassification {
  readonly kind: QrKind;
  readonly url?: string;
}

export interface AnalyzeRequest {
  text?: string;
  urls?: string[];
}
