import { z } from "zod";
import { REPUTATION_CONFIG_LIMITS } from "./reputation.config";

export type ReputationConfigState = "ready" | "not-configured" | "off";

export interface ReputationConfig {
  readonly state: ReputationConfigState;
  /** Non-enumerable: absent from JSON.stringify, spread and console.log. "" unless state is "ready". */
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly callsPerMinute: number;
  readonly callsPerDay: number;
}

const ENV_KEYS = [
  "LINK_REPUTATION_API_KEY",
  "LINK_REPUTATION_TIMEOUT_MS",
  "LINK_REPUTATION_CALLS_PER_MINUTE",
  "LINK_REPUTATION_CALLS_PER_DAY",
] as const;

const envSchema = z.object({
  LINK_REPUTATION_API_KEY: z.unknown().optional(),
  LINK_REPUTATION_TIMEOUT_MS: z.unknown().optional(),
  LINK_REPUTATION_CALLS_PER_MINUTE: z.unknown().optional(),
  LINK_REPUTATION_CALLS_PER_DAY: z.unknown().optional(),
});

function parseBoundedInt(
  value: unknown,
  limits: { readonly default: number; readonly min: number; readonly max: number },
): number {
  if (typeof value !== "string") return limits.default;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return limits.default;
  const stripped = trimmed.replace(/^0+/, "");
  // More than 15 digits exceeds Number's exact integer range and every max.
  const n = stripped === "" ? 0 : stripped.length > 15 ? limits.max : Number(stripped);
  return Math.min(limits.max, Math.max(limits.min, n));
}

function build(
  state: ReputationConfigState,
  apiKey: string,
  timeoutMs: number,
  callsPerMinute: number,
  callsPerDay: number,
): ReputationConfig {
  const config = { state, apiKey: "", timeoutMs, callsPerMinute, callsPerDay };
  Object.defineProperty(config, "apiKey", {
    value: apiKey,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return config;
}

/**
 * Reads link reputation settings. The only reader of LINK_REPUTATION_*.
 * Never throws (REQ-LREP-60).
 */
export function readReputationConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ReputationConfig {
  const L = REPUTATION_CONFIG_LIMITS;
  try {
    const source: unknown = env;
    if (typeof source !== "object" || source === null) {
      return build("not-configured", "", L.timeoutMs.default, L.callsPerMinute.default, L.callsPerDay.default);
    }
    const picked: Record<string, unknown> = {};
    for (const key of ENV_KEYS) {
      picked[key] = (source as Record<string, unknown>)[key];
    }
    const parsed = envSchema.safeParse(picked);
    if (!parsed.success) {
      return build("not-configured", "", L.timeoutMs.default, L.callsPerMinute.default, L.callsPerDay.default);
    }
    const data = parsed.data;
    const timeoutMs = parseBoundedInt(data.LINK_REPUTATION_TIMEOUT_MS, L.timeoutMs);
    const callsPerMinute = parseBoundedInt(data.LINK_REPUTATION_CALLS_PER_MINUTE, L.callsPerMinute);
    const callsPerDay = parseBoundedInt(data.LINK_REPUTATION_CALLS_PER_DAY, L.callsPerDay);

    const rawKey = data.LINK_REPUTATION_API_KEY;
    const key = typeof rawKey === "string" ? rawKey.trim() : "";
    if (key === "") {
      return build("not-configured", "", timeoutMs, callsPerMinute, callsPerDay);
    }
    if (callsPerMinute === 0 || callsPerDay === 0) {
      return build("off", "", timeoutMs, callsPerMinute, callsPerDay);
    }
    return build("ready", key, timeoutMs, callsPerMinute, callsPerDay);
  } catch {
    return build("not-configured", "", L.timeoutMs.default, L.callsPerMinute.default, L.callsPerDay.default);
  }
}
