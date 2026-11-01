/**
 * signal.ts — Signal type and validated constructor
 *
 * Pure TypeScript module. No framework, browser, or Node.js imports.
 */

export type SignalSource = "url" | "text" | "image" | "qr";

/**
 * A plain, immutable value object describing one detected indicator of
 * potential harm (REQ-SIG-03: all fields are readonly).
 *
 * Constraints (enforced by createSignal):
 *   - severity ∈ [0, 1]          (REQ-SIG-01)
 *   - id / evidence / whyItMatters are non-empty strings (REQ-SIG-02)
 */
export interface Signal {
  readonly id: string;
  readonly source: SignalSource;
  readonly severity: number; // closed interval [0, 1]
  readonly evidence: string;
  readonly whyItMatters: string;
}

/**
 * Validated constructor for Signal objects.
 *
 * Throws a TypeError when:
 *   - severity is outside [0, 1]             (REQ-SIG-01)
 *   - id, evidence, or whyItMatters is empty  (REQ-SIG-02)
 *
 * Returns a frozen (immutable) Signal on success (REQ-SIG-03).
 */
export function createSignal(input: Signal): Signal {
  if (input.id.trim() === "") {
    throw new TypeError("Signal.id must be a non-empty string");
  }
  if (input.evidence.trim() === "") {
    throw new TypeError("Signal.evidence must be a non-empty string");
  }
  if (input.whyItMatters.trim() === "") {
    throw new TypeError("Signal.whyItMatters must be a non-empty string");
  }
  if (!Number.isFinite(input.severity) || input.severity < 0 || input.severity > 1) {
    throw new TypeError(
      `Signal.severity must be a finite number in [0, 1]; received ${input.severity}`
    );
  }

  return Object.freeze({ ...input });
}
