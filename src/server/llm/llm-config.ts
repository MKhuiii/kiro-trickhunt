import { z } from "zod";

/**
 * Defaults and bounds for numeric settings. Single source of truth (REQ-LLM-04).
 */
export const LLM_CONFIG_LIMITS = {
  maxOutputTokens: { default: 400, min: 1, max: 2000 },
  timeoutMs: { default: 7000, min: 500, max: 30000 },
  providerLabelMaxLength: 64,
} as const;

export interface LlmConfig {
  /** Label only (e.g. for smoke output). Never changes behaviour. */
  readonly provider?: string;
  /** Non-enumerable: absent from JSON.stringify, spread and console.log. */
  readonly apiKey: string;
  readonly model: string;
  /** Normalised, no trailing slash. */
  readonly baseUrl: string;
  readonly maxOutputTokens: number;
  readonly timeoutMs: number;
}

const LOCAL_HTTP_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

const nonBlank = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1));

const envSchema = z.object({
  LLM_PROVIDER: z.unknown().optional(),
  LLM_API_KEY: nonBlank,
  LLM_MODEL: nonBlank,
  LLM_BASE_URL: nonBlank,
  LLM_MAX_OUTPUT_TOKENS: z.unknown().optional(),
  LLM_TIMEOUT_MS: z.unknown().optional(),
});

const ENV_KEYS = [
  "LLM_PROVIDER",
  "LLM_API_KEY",
  "LLM_MODEL",
  "LLM_BASE_URL",
  "LLM_MAX_OUTPUT_TOKENS",
  "LLM_TIMEOUT_MS",
] as const;

function normaliseBaseUrl(raw: string): string | null {
  // Reject query/fragment markers even when empty (e.g. "https://x/?").
  if (raw.includes("?") || raw.includes("#")) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username !== "" || url.password !== "") return null;
  if (url.search !== "" || url.hash !== "") return null;
  const isHttps = url.protocol === "https:";
  const isLocalHttp =
    url.protocol === "http:" && LOCAL_HTTP_HOSTS.has(url.hostname);
  if (!isHttps && !isLocalHttp) return null;
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

function parseBoundedInt(
  value: unknown,
  limits: { readonly default: number; readonly min: number; readonly max: number },
): number {
  if (typeof value !== "string") return limits.default;
  const trimmed = value.trim();
  if (!/^\d{1,9}$/.test(trimmed)) return limits.default;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return limits.default;
  return Math.min(limits.max, Math.max(limits.min, n));
}

function parseProviderLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const label = value
    .trim()
    .slice(0, LLM_CONFIG_LIMITS.providerLabelMaxLength)
    .trim();
  return label === "" ? undefined : label;
}

/**
 * Reads LLM settings from `env`. Never throws; returns null when the
 * configuration is missing or invalid (rules-only mode).
 */
export function readLlmConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): LlmConfig | null {
  try {
    const source: unknown = env;
    if (typeof source !== "object" || source === null) return null;

    const picked: Record<string, unknown> = {};
    for (const key of ENV_KEYS) {
      picked[key] = (source as Record<string, unknown>)[key];
    }

    const parsed = envSchema.safeParse(picked);
    if (!parsed.success) return null;
    const data = parsed.data;

    const baseUrl = normaliseBaseUrl(data.LLM_BASE_URL);
    if (baseUrl === null) return null;

    const provider = parseProviderLabel(data.LLM_PROVIDER);

    const config: {
      provider?: string;
      apiKey: string;
      model: string;
      baseUrl: string;
      maxOutputTokens: number;
      timeoutMs: number;
    } = {
      ...(provider !== undefined ? { provider } : {}),
      apiKey: "",
      model: data.LLM_MODEL,
      baseUrl,
      maxOutputTokens: parseBoundedInt(
        data.LLM_MAX_OUTPUT_TOKENS,
        LLM_CONFIG_LIMITS.maxOutputTokens,
      ),
      timeoutMs: parseBoundedInt(
        data.LLM_TIMEOUT_MS,
        LLM_CONFIG_LIMITS.timeoutMs,
      ),
    };
    // Non-enumerable so serialization / logging can never leak the key (REQ-LLM-05).
    Object.defineProperty(config, "apiKey", {
      value: data.LLM_API_KEY,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    return config;
  } catch {
    return null;
  }
}
