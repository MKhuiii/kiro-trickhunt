/**
 * url-expressions.ts — canonical link form, URL expressions and hashing for the
 * link reputation lookup (design B). Pure. The only module that imports
 * `node:crypto`.
 */

import { createHash } from "node:crypto";
import { normalizeUrl } from "../../analyzers/url-analyzer";
import {
  HASH_PREFIX_BYTES,
  MAX_HOST_SUFFIXES,
  MAX_PATH_DIRECTORIES,
} from "./reputation.config";

export interface LookupUrl {
  /** Canonical, lower case, punycode, no port, no userinfo. */
  readonly host: string;
  readonly isIpLiteral: boolean;
  /** Canonical, starts with "/". */
  readonly path: string;
  /** Canonical, without "?"; null when absent or empty. */
  readonly query: string | null;
}

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/u;

/** Parses the compressed IPv6 text the URL parser produces into 8 groups. */
function parseIpv6(text: string): number[] | null {
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const toGroups = (part: string): number[] | null => {
    if (part === "") return [];
    const out: number[] = [];
    for (const piece of part.split(":")) {
      if (!/^[0-9a-f]{1,4}$/iu.test(piece)) return null;
      out.push(parseInt(piece, 16));
    }
    return out;
  };
  const head = toGroups(halves[0] ?? "");
  if (head === null) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const tail = toGroups(halves[1] ?? "");
  if (tail === null) return null;
  const fill = 8 - head.length - tail.length;
  if (fill < 1) return null;
  return [...head, ...new Array<number>(fill).fill(0), ...tail];
}

/** Returns the dotted IPv4 form of an IPv4-mapped or NAT64 address, else null. */
function embeddedIpv4(groups: readonly number[]): string | null {
  const g = groups;
  const zeros = (from: number, to: number): boolean =>
    g.slice(from, to).every((n) => n === 0);
  const mapped = zeros(0, 5) && g[5] === 0xffff;
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6);
  if (!mapped && !nat64) return null;
  const hi = g[6] ?? 0;
  const lo = g[7] ?? 0;
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

function cleanHost(rawHost: string): { host: string; isIpLiteral: boolean } | null {
  const lower = rawHost.toLowerCase();
  if (lower.startsWith("[") && lower.endsWith("]")) {
    const groups = parseIpv6(lower.slice(1, -1));
    const v4 = groups === null ? null : embeddedIpv4(groups);
    if (v4 !== null) return { host: v4, isIpLiteral: true };
    return { host: lower, isIpLiteral: true };
  }
  const host = lower.replace(/\.{2,}/gu, ".").replace(/^\.+|\.+$/gu, "");
  if (host === "") return null;
  return { host, isIpLiteral: IPV4_PATTERN.test(host) };
}

/** Repeats percent-unescaping until no `%XX` remains (the string shrinks each round). */
function unescapeFully(text: string): string {
  let current = text;
  while (/%[0-9a-fA-F]{2}/u.test(current)) {
    current = current.replace(/%([0-9a-fA-F]{2})/gu, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  }
  return current;
}

function escapeBytes(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code <= 0x20 || code >= 0x7f || code === 0x23 || code === 0x25) {
      out += `%${(code & 0xff).toString(16).toUpperCase().padStart(2, "0")}`;
    } else {
      out += text[i];
    }
  }
  return out;
}

function resolveDotSegments(path: string): string {
  const segments = path.split("/");
  const stack: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  const last = segments[segments.length - 1];
  const trailing = last === "" || last === "." || last === "..";
  if (stack.length === 0) return "/";
  return `/${stack.join("/")}${trailing ? "/" : ""}`;
}

export function toLookupUrl(input: string): LookupUrl | null {
  try {
    const normalized = normalizeUrl(input);
    if (normalized === null) return null;
    const url = new URL(normalized);
    const host = cleanHost(url.hostname);
    if (host === null) return null;

    const unescaped = unescapeFully(url.pathname + url.search);
    const questionMark = unescaped.indexOf("?");
    const rawPath = questionMark === -1 ? unescaped : unescaped.slice(0, questionMark);
    const rawQuery = questionMark === -1 ? "" : unescaped.slice(questionMark + 1);

    const path = escapeBytes(resolveDotSegments(rawPath.startsWith("/") ? rawPath : `/${rawPath}`));
    const query = rawQuery === "" ? null : escapeBytes(rawQuery);
    return { host: host.host, isIpLiteral: host.isIpLiteral, path, query };
  } catch {
    return null;
  }
}

function hostsOf(url: LookupUrl): string[] {
  if (url.isIpLiteral) return [url.host];
  const labels = url.host.split(".");
  const hosts = [url.host];
  const suffixes: string[] = [];
  for (let size = 2; size < labels.length && suffixes.length < MAX_HOST_SUFFIXES; size += 1) {
    suffixes.push(labels.slice(labels.length - size).join("."));
  }
  return [...hosts, ...suffixes];
}

function pathsOf(url: LookupUrl): string[] {
  const paths: string[] = [];
  if (url.query !== null) paths.push(`${url.path}?${url.query}`);
  paths.push(url.path);
  paths.push("/");
  const components = url.path.split("/").filter((c) => c !== "");
  const endsWithSlash = url.path.endsWith("/");
  const directories = endsWithSlash ? components : components.slice(0, -1);
  let prefix = "/";
  for (const dir of directories.slice(0, MAX_PATH_DIRECTORIES - 1)) {
    prefix += `${dir}/`;
    paths.push(prefix);
  }
  return paths;
}

export function expressionsOf(url: LookupUrl): readonly string[] {
  const seen = new Set<string>();
  const paths = pathsOf(url);
  for (const host of hostsOf(url)) {
    for (const path of paths) seen.add(host + path);
  }
  return [...seen];
}

export function sha256(text: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(text, "utf8").digest());
}

export function prefixOf(hash: Uint8Array): Uint8Array {
  return hash.slice(0, HASH_PREFIX_BYTES);
}

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

export function fromBase64Any(text: string): Uint8Array | null {
  if (typeof text !== "string") return null;
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/u.test(text)) return null;
  const bare = text.replace(/=+$/u, "");
  if (bare.length % 4 === 1) return null;
  const standard = bare.replace(/-/gu, "+").replace(/_/gu, "/");
  return new Uint8Array(Buffer.from(standard, "base64"));
}
