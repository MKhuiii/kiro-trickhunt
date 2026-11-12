import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import qrcode from "qrcode-generator";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeQr } from "./decode-qr";
import type { ImageDataLike } from "./types";
import { createZxingReader, type QrReader, type ZxingLibLike } from "./zxing-reader";

const QUIET_ZONE_MODULES = 4;
const SCALE = 4;
const TEST_TIMEOUT_MS = 60_000;

const utf8 = new TextEncoder();
qrcode.stringToBytes = (s: string): number[] => Array.from(utf8.encode(s));

/** Renders a QR code into plain RGBA pixels (black on white). */
function renderQr(text: string): ImageDataLike {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const count = qr.getModuleCount();
  const size = (count + QUIET_ZONE_MODULES * 2) * SCALE;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / SCALE) - QUIET_ZONE_MODULES;
    for (let x = 0; x < size; x++) {
      const col = Math.floor(x / SCALE) - QUIET_ZONE_MODULES;
      if (row < 0 || col < 0 || row >= count || col >= count) continue;
      if (!qr.isDark(row, col)) continue;
      const i = (y * size + x) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }
  return { data, width: size, height: size };
}

let reader: QrReader;

beforeAll(async () => {
  // Local file read only; the wasm is handed to the module, so no fetch happens.
  const wasmBinary = readFileSync(
    resolve(process.cwd(), "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"),
  );
  const lib = await import("zxing-wasm/reader");
  await lib.prepareZXingModule({
    overrides: { wasmBinary: wasmBinary.buffer.slice(
      wasmBinary.byteOffset,
      wasmBinary.byteOffset + wasmBinary.byteLength,
    ) as ArrayBuffer },
    fireImmediately: true,
  });
  reader = createZxingReader(lib as unknown as ZxingLibLike);
}, TEST_TIMEOUT_MS);

async function roundTrip(text: string): Promise<readonly string[]> {
  const result = await decodeQr(renderQr(text), { loadReader: async () => reader });
  expect(result.errorCode).toBeUndefined();
  return result.payloads;
}

describe("QR round trip (PBT-58)", () => {
  /**
   * **Validates: Requirements REQ-CI-27, REQ-CI-28, REQ-CI-29**
   */
  it(
    "decodeQr returns the encoded string for short generated strings",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ unit: "grapheme-ascii", minLength: 1, maxLength: 40 }),
          async (text) => {
            expect(await roundTrip(text)).toEqual([text]);
          },
        ),
        { numRuns: 50 },
      );
    },
    TEST_TIMEOUT_MS * 5,
  );

  const examples: ReadonlyArray<readonly [string, string]> = [
    ["a URL", "https://example.com/path?a=1&b=2"],
    ["a Wi-Fi string", "WIFI:T:WPA;S:HomeNet;P:secret123;;"],
    ["a Vietnamese string", "Tài khoản của bạn đã bị khóa, vui lòng đăng nhập"],
  ];

  it.each(examples)(
    "round-trips %s",
    async (_label, text) => {
      expect(await roundTrip(text)).toEqual([text]);
    },
    TEST_TIMEOUT_MS,
  );
});
