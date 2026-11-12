import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./ingest.config";

export type ImageFileErrorCode = "unsupported-type" | "invalid-size" | "file-too-large";

export type ImageFileValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: ImageFileErrorCode };

const allowedTypes: readonly string[] = ALLOWED_IMAGE_TYPES;

/**
 * Checks type and size of a file-like value. Never throws: properties are read
 * inside try/catch, so hostile getters and odd inputs yield a failure code.
 * Returns the first failing code in order: unsupported-type, invalid-size,
 * file-too-large.
 */
export function validateImageFile(file: unknown): ImageFileValidation {
  let type: unknown;
  let size: unknown;
  try {
    const source = file as { type?: unknown; size?: unknown };
    type = source.type;
    size = source.size;
  } catch {
    type = undefined;
    size = undefined;
  }

  if (typeof type !== "string" || !allowedTypes.includes(type.toLowerCase())) {
    return { ok: false, code: "unsupported-type" };
  }
  if (typeof size !== "number" || !Number.isInteger(size) || size < 1) {
    return { ok: false, code: "invalid-size" };
  }
  if (size > MAX_IMAGE_BYTES) {
    return { ok: false, code: "file-too-large" };
  }
  return { ok: true };
}
