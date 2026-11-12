// Copies self-hosted browser assets (OCR + QR) from node_modules to public/.
// Reads src/client/ingest/assets.manifest.json. No dependencies.
// Never prints file contents.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "src/client/ingest/assets.manifest.json");

const MSG_MISSING = "prepare:assets failed: a source file is missing. Run npm install.";
const MSG_HASH = "prepare:assets failed: a source file does not match the manifest hash.";
const MSG_MANIFEST = "prepare:assets failed: the manifest could not be read.";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function matches(path, entry) {
  return existsSync(path) && statSync(path).size === entry.bytes && sha256(path) === entry.sha256;
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest)) throw new Error("not an array");
} catch {
  fail(MSG_MANIFEST);
}

let copied = 0;
let skipped = 0;
for (const entry of manifest) {
  const from = resolve(root, entry.from);
  const to = resolve(root, entry.to);
  if (!existsSync(from)) fail(MSG_MISSING);
  if (!matches(from, entry)) fail(MSG_HASH);
  if (matches(to, entry)) {
    skipped += 1;
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  if (!matches(to, entry)) fail(MSG_HASH);
  copied += 1;
}

console.log(`prepare:assets: copied ${copied}, skipped ${skipped}`);
