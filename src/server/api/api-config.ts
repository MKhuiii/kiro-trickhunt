import { z } from "zod";

/**
 * Defaults and bounds for the API settings. Single source of truth (REQ-API-35).
 * A zero LLM limit disables the LLM (always "budget-exhausted").
 */
export const API_CONFIG_LIMITS = {
  ratePerMinute: { default: 10, min: 1, max: 600 },
  llmCallsPerMinute: { default: 4, min: 0, max: 60 },
  llmCallsPerDay: { default: 200, min: 0, max: 10000 },
} as const;

export interface ApiConfig {
  readonly ratePerMinute: number;
  readonly llmCallsPerMinute: number;
  readonly llmCallsPerDay: number;
}

const ENV_KEYS = [
  "RATE_LIMIT_PER_MINUTE",
  "LLM_CALLS_PER_MINUTE",
  "LLM_CALLS_PER_DAY",
] as const;

const envSchema = z.object({
  RATE_LIMIT_PER_MINUTE: z.unknown().optional(),
  LLM_CALLS_PER_MINUTE: z.unknown().optional(),
  LLM_CALLS_PER_DAY: z.unknown().optional(),
});

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

function defaults(): ApiConfig {
  return {
    ratePerMinute: API_CONFIG_LIMITS.ratePerMinute.default,
    llmCallsPerMinute: API_CONFIG_LIMITS.llmCallsPerMinute.default,
    llmCallsPerDay: API_CONFIG_LIMITS.llmCallsPerDay.default,
  };
}

/**
 * Reads API settings from `env`. Never throws; missing, blank, non-decimal or
 * non-string values give the default, and numbers are clamped to bounds.
 * The only code that reads these three keys (REQ-API-33).
 */
export function readApiConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ApiConfig {
  try {
    const source: unknown = env;
    if (typeof source !== "object" || source === null) return defaults();

    const picked: Record<string, unknown> = {};
    for (const key of ENV_KEYS) {
      picked[key] = (source as Record<string, unknown>)[key];
    }

    const parsed = envSchema.safeParse(picked);
    if (!parsed.success) return defaults();
    const data = parsed.data;

    return {
      ratePerMinute: parseBoundedInt(
        data.RATE_LIMIT_PER_MINUTE,
        API_CONFIG_LIMITS.ratePerMinute,
      ),
      llmCallsPerMinute: parseBoundedInt(
        data.LLM_CALLS_PER_MINUTE,
        API_CONFIG_LIMITS.llmCallsPerMinute,
      ),
      llmCallsPerDay: parseBoundedInt(
        data.LLM_CALLS_PER_DAY,
        API_CONFIG_LIMITS.llmCallsPerDay,
      ),
    };
  } catch {
    return defaults();
  }
}
