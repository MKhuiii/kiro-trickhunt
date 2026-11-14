const MAX_SHORT_CODE_POINTS = 80;

/** Needles to search in the user's text for one signal (REQ-UI-27). */
export function evidenceNeedles(signal: { id: string; evidence: string }): string[] {
  const id: unknown = signal?.id;
  const evidence: unknown = signal?.evidence;
  if (typeof evidence !== "string") return [];

  const out: string[] = [evidence];

  if (typeof id === "string") {
    if (id.startsWith("text.")) {
      out.push(...evidence.split(", "));
    } else if (id === "url.credential-keywords") {
      const marker = " in path ";
      const at = evidence.indexOf(marker);
      if (at >= 0) out.push(evidence.slice(at + marker.length));
    } else if (id === "url.brand-lookalike") {
      const at = evidence.indexOf(" looks like ");
      if (at >= 0) out.push(evidence.slice(0, at));
    } else if (id === "url.excessive-subdomains") {
      out.push(evidence.replace(/ \(\d+ parts\)$/, ""));
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of out) {
    const n = raw.trim();
    if (n === "" || seen.has(n)) continue;
    seen.add(n);
    result.push(n);
  }
  return result;
}

/** Whitespace collapsed, trimmed, at most 80 code points, "…" when cut. */
export function shortEvidence(s: string): string {
  if (typeof s !== "string") return "";
  const cps = Array.from(s.replace(/\s+/g, " ").trim());
  if (cps.length <= MAX_SHORT_CODE_POINTS) return cps.join("");
  return cps.slice(0, MAX_SHORT_CODE_POINTS).join("") + "…";
}
