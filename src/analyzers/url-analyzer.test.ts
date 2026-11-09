/**
 * url-analyzer.test.ts — Unit tests for normalizeUrl
 *
 * Covers the 8-step normalization procedure (§1.3):
 *   REQ-URL-01: idempotency
 *   REQ-URL-02: null for non-http/https and unparseable inputs
 *   REQ-URL-03: hostname is lower-cased
 *   REQ-URL-04: default ports are stripped
 */

import { describe, it, expect } from "vitest";
import { normalizeUrl } from "./url-analyzer";

// ---------------------------------------------------------------------------
// 1. Valid https URL returns canonical form
// ---------------------------------------------------------------------------

describe("normalizeUrl — valid https URL", () => {
  it("returns the canonical form for a plain https URL", () => {
    const result = normalizeUrl("https://example.com/path?q=1");
    expect(result).toBe("https://example.com/path?q=1");
  });

  it("removes trailing slash when pathname is exactly '/'", () => {
    const result = normalizeUrl("https://example.com/");
    expect(result).toBe("https://example.com");
  });

  it("preserves a non-root pathname (step 7 does not strip it)", () => {
    const result = normalizeUrl("https://example.com/foo/");
    expect(result).toBe("https://example.com/foo/");
  });

  it("trims leading and trailing whitespace (step 1)", () => {
    const result = normalizeUrl("  https://example.com  ");
    expect(result).toBe("https://example.com");
  });

  it("prepends https:// when no scheme is present (step 2)", () => {
    const result = normalizeUrl("example.com");
    expect(result).toBe("https://example.com");
  });
});

// ---------------------------------------------------------------------------
// 2. Valid http URL — default port 80 is stripped (REQ-URL-04)
// ---------------------------------------------------------------------------

describe("normalizeUrl — http with default port 80", () => {
  it("strips :80 from an http URL", () => {
    const result = normalizeUrl("http://example.com:80/path");
    expect(result).toBe("http://example.com/path");
  });

  it("keeps a non-default port on an http URL", () => {
    const result = normalizeUrl("http://example.com:8080/path");
    expect(result).toBe("http://example.com:8080/path");
  });
});

// ---------------------------------------------------------------------------
// 3. https URL — default port 443 is stripped (REQ-URL-04)
// ---------------------------------------------------------------------------

describe("normalizeUrl — https with default port 443", () => {
  it("strips :443 from an https URL", () => {
    const result = normalizeUrl("https://example.com:443/path");
    expect(result).toBe("https://example.com/path");
  });

  it("keeps a non-default port on an https URL", () => {
    const result = normalizeUrl("https://example.com:8443/path");
    expect(result).toBe("https://example.com:8443/path");
  });
});

// ---------------------------------------------------------------------------
// 4. Mixed-case hostname is lower-cased (REQ-URL-03)
// ---------------------------------------------------------------------------

describe("normalizeUrl — hostname case folding", () => {
  it("lower-cases an all-uppercase hostname", () => {
    const result = normalizeUrl("https://PAYPAL.COM/login");
    expect(result).toBe("https://paypal.com/login");
  });

  it("lower-cases a mixed-case hostname", () => {
    const result = normalizeUrl("https://PayPal.Com");
    expect(result).toBe("https://paypal.com");
  });

  it("does not alter the path casing", () => {
    const result = normalizeUrl("https://EXAMPLE.COM/FooBar");
    expect(result).toBe("https://example.com/FooBar");
  });
});

// ---------------------------------------------------------------------------
// 5. Bare word with no scheme returns null (REQ-URL-02)
// ---------------------------------------------------------------------------

describe("normalizeUrl — bare words that become invalid after https:// prepend", () => {
  it("returns null for a bare word that cannot form a valid URL", () => {
    // Step 2 prepends https://, but "not a url" (with spaces) will fail URL parsing
    const result = normalizeUrl("not a url");
    expect(result).toBeNull();
  });

  it("returns null for a string that is just whitespace", () => {
    const result = normalizeUrl("   ");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. ftp:// scheme returns null (REQ-URL-02)
// ---------------------------------------------------------------------------

describe("normalizeUrl — non-http/https schemes", () => {
  it("returns null for ftp:// scheme", () => {
    const result = normalizeUrl("ftp://example.com/file.txt");
    expect(result).toBeNull();
  });

  it("returns null for javascript: scheme", () => {
    // javascript:// triggers step 2 bypass and step 4 rejection
    const result = normalizeUrl("javascript://example.com/alert(1)");
    expect(result).toBeNull();
  });

  it("returns null for file:// scheme", () => {
    const result = normalizeUrl("file:///home/user/doc.txt");
    expect(result).toBeNull();
  });

  it("returns null for data: scheme", () => {
    const result = normalizeUrl("data:text/plain,hello");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Empty string returns null (REQ-URL-02)
// ---------------------------------------------------------------------------

describe("normalizeUrl — empty string", () => {
  it("returns null for an empty string", () => {
    const result = normalizeUrl("");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. Idempotency spot-checks (REQ-URL-01)
// ---------------------------------------------------------------------------

describe("normalizeUrl — idempotency", () => {
  it("applying twice gives the same result as applying once (https)", () => {
    const once = normalizeUrl("https://EXAMPLE.COM:443/Path?q=1");
    const twice = once !== null ? normalizeUrl(once) : null;
    expect(twice).toBe(once);
  });

  it("applying twice gives the same result as applying once (http with port)", () => {
    const once = normalizeUrl("http://Example.COM:80/");
    const twice = once !== null ? normalizeUrl(once) : null;
    expect(twice).toBe(once);
  });

  it("null input propagates: normalizing null-producing input is still null", () => {
    const once = normalizeUrl("ftp://example.com");
    expect(once).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkPunycodeHost tests (REQ-URL-08, REQ-URL-09, REQ-URL-10)
// ---------------------------------------------------------------------------

import { checkPunycodeHost } from "./url-analyzer";

describe("checkPunycodeHost — xn-- Punycode label (REQ-URL-08)", () => {
  it("emits a signal when the hostname has a single xn-- label", () => {
    const url = new URL("https://xn--pple-43d.com");
    const signals = checkPunycodeHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.punycode-host");
    expect(signals[0].severity).toBe(0.8);
    expect(signals[0].source).toBe("url");
    expect(signals[0].evidence).toBe("xn--pple-43d.com");
  });

  it("emits a signal when only a subdomain label is xn--", () => {
    const url = new URL("https://xn--e1afmapc.example.com");
    const signals = checkPunycodeHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.punycode-host");
  });

  it("emits exactly one signal even when multiple labels start with xn--", () => {
    const url = new URL("https://xn--n3h.xn--p1ai");
    const signals = checkPunycodeHost(url);
    expect(signals).toHaveLength(1);
  });

  it("carries the correct whyItMatters text", () => {
    const url = new URL("https://xn--pple-43d.com");
    const signals = checkPunycodeHost(url);
    expect(signals[0].whyItMatters).toBe(
      "The web address uses special characters that can disguise a fake site as a real one."
    );
  });
});

describe("checkPunycodeHost — non-ASCII Unicode homoglyphs (REQ-URL-09)", () => {
  it("emits a signal when the hostname contains a Cyrillic character", () => {
    // "раypal.com" — first 'р' is Cyrillic U+0440
    // Test via a raw Unicode hostname injected directly
    const fakeUrl = { hostname: "р\u0430ypal.com" } as unknown as URL;
    const signals = checkPunycodeHost(fakeUrl);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.punycode-host");
    expect(signals[0].evidence).toBe("р\u0430ypal.com");
  });

  it("emits a signal for a hostname with a Greek character", () => {
    const fakeUrl = { hostname: "exαmple.com" } as unknown as URL;
    const signals = checkPunycodeHost(fakeUrl);
    expect(signals).toHaveLength(1);
  });
});

describe("checkPunycodeHost — plain ASCII hostname (REQ-URL-10)", () => {
  it("returns no signal for a plain ASCII hostname", () => {
    const url = new URL("https://example.com");
    expect(checkPunycodeHost(url)).toHaveLength(0);
  });

  it("returns no signal for a multi-label ASCII hostname", () => {
    const url = new URL("https://secure.paypal.com/login");
    expect(checkPunycodeHost(url)).toHaveLength(0);
  });

  it("returns no signal for an ASCII hostname with hyphens and digits", () => {
    const url = new URL("https://my-bank-123.co.uk");
    expect(checkPunycodeHost(url)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkIpAddressHost tests (REQ-URL-11, REQ-URL-12, REQ-URL-13)
// ---------------------------------------------------------------------------

import { checkIpAddressHost } from "./url-analyzer";

describe("checkIpAddressHost — IPv4 address (REQ-URL-11)", () => {
  it("emits a signal for a standard private IPv4 address", () => {
    const url = new URL("http://192.168.1.1/");
    const signals = checkIpAddressHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.ip-address-host");
    expect(signals[0].source).toBe("url");
    expect(signals[0].severity).toBe(0.7);
    expect(signals[0].evidence).toBe("192.168.1.1");
    expect(signals[0].whyItMatters).toBe(
      "The web address goes directly to a numbered computer address instead of a recognisable website name."
    );
  });

  it("emits a signal for a public IPv4 address", () => {
    const url = new URL("https://8.8.8.8/dns-query");
    const signals = checkIpAddressHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.ip-address-host");
    expect(signals[0].evidence).toBe("8.8.8.8");
  });

  it("emits a signal for the loopback address 127.0.0.1", () => {
    const url = new URL("http://127.0.0.1:8080/");
    const signals = checkIpAddressHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].evidence).toBe("127.0.0.1");
  });

  it("emits a signal for an address with maximum octet values (255.255.255.255)", () => {
    const url = new URL("http://255.255.255.255/");
    const signals = checkIpAddressHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].evidence).toBe("255.255.255.255");
  });
});

describe("checkIpAddressHost — IPv6 address (REQ-URL-12)", () => {
  it("emits a signal for the IPv6 loopback address [::1]", () => {
    const url = new URL("http://[::1]/");
    const signals = checkIpAddressHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.ip-address-host");
    expect(signals[0].source).toBe("url");
    expect(signals[0].severity).toBe(0.7);
    // The URL constructor stores IPv6 with brackets
    expect(signals[0].evidence).toBe("[::1]");
    expect(signals[0].whyItMatters).toBe(
      "The web address goes directly to a numbered computer address instead of a recognisable website name."
    );
  });

  it("emits a signal for a full-length IPv6 address", () => {
    const url = new URL("https://[2001:db8::1]/path");
    const signals = checkIpAddressHost(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.ip-address-host");
  });
});

describe("checkIpAddressHost — regular hostname (REQ-URL-13)", () => {
  it("returns no signal for a plain domain name", () => {
    const url = new URL("https://example.com");
    expect(checkIpAddressHost(url)).toHaveLength(0);
  });

  it("returns no signal for a multi-label domain", () => {
    const url = new URL("https://secure.paypal.com/login");
    expect(checkIpAddressHost(url)).toHaveLength(0);
  });

  it("returns no signal for a domain that contains digits", () => {
    // "192com" looks numeric-ish but is not an IP address
    const url = new URL("https://192com.example.org");
    expect(checkIpAddressHost(url)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkAtInAuthority tests (REQ-URL-14, REQ-URL-15)
// ---------------------------------------------------------------------------

import { checkAtInAuthority } from "./url-analyzer";

describe("checkAtInAuthority — username only (REQ-URL-14)", () => {
  it("emits a signal when the URL contains user@host", () => {
    const url = new URL("https://user@example.com");
    const signals = checkAtInAuthority(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.at-in-authority");
    expect(signals[0].source).toBe("url");
    expect(signals[0].severity).toBe(0.9);
    expect(signals[0].evidence).toBe("user@example.com");
    expect(signals[0].whyItMatters).toBe(
      "The web address contains an '@' symbol, a trick used to hide the real destination."
    );
  });

  it("emits a signal for a phishing-style URL (trusted brand before @, attacker domain after)", () => {
    const url = new URL("https://paypal.com@attacker.com/login");
    const signals = checkAtInAuthority(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.at-in-authority");
    // evidence should expose the attacker hostname
    expect(signals[0].evidence).toContain("attacker.com");
  });
});

describe("checkAtInAuthority — username and password (REQ-URL-14)", () => {
  it("emits a signal when the URL contains user:pass@host", () => {
    const url = new URL("https://user:pass@example.com/path");
    const signals = checkAtInAuthority(url);
    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe("url.at-in-authority");
    expect(signals[0].evidence).toBe("user:pass@example.com");
  });

  it("emits exactly one signal even when both username and password are set", () => {
    const url = new URL("http://admin:secret@192.168.0.1/");
    const signals = checkAtInAuthority(url);
    expect(signals).toHaveLength(1);
  });
});

describe("checkAtInAuthority — no credentials (REQ-URL-15)", () => {
  it("returns no signal for a plain URL with no credentials", () => {
    const url = new URL("https://example.com/path?q=1");
    expect(checkAtInAuthority(url)).toHaveLength(0);
  });

  it("returns no signal for a URL with a port but no credentials", () => {
    const url = new URL("https://example.com:8443/secure");
    expect(checkAtInAuthority(url)).toHaveLength(0);
  });

  it("returns no signal for a URL with query params but no credentials", () => {
    const url = new URL("https://example.com/search?q=hello@world");
    expect(checkAtInAuthority(url)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkExcessiveSubdomains (REQ-URL-16, REQ-URL-17)
// ---------------------------------------------------------------------------

import { checkExcessiveSubdomains } from "./url-analyzer";

describe("checkExcessiveSubdomains", () => {
  it("emits a signal for a 4-label hostname", () => {
    const result = checkExcessiveSubdomains(new URL("https://a.b.example.com"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("url.excessive-subdomains");
    expect(result[0].source).toBe("url");
    expect(result[0].severity).toBe(0.5);
    expect(result[0].evidence).toContain("a.b.example.com");
  });

  it("emits a signal for a 6-label hostname", () => {
    expect(
      checkExcessiveSubdomains(new URL("https://a.b.c.d.example.com")),
    ).toHaveLength(1);
  });

  it("returns no signal for exactly 3 labels", () => {
    expect(checkExcessiveSubdomains(new URL("https://sub.example.com"))).toEqual([]);
  });

  it("returns no signal for an IPv4 address (REQ-URL-17)", () => {
    expect(checkExcessiveSubdomains(new URL("http://192.168.1.1/"))).toEqual([]);
  });

  it("returns no signal for an IPv6 address (REQ-URL-17)", () => {
    expect(checkExcessiveSubdomains(new URL("http://[::1]/"))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkKnownShortener
// ---------------------------------------------------------------------------

import { checkKnownShortener } from "./url-analyzer";

describe("checkKnownShortener (REQ-URL-18, REQ-URL-19)", () => {
  it("emits a signal for bit.ly", () => {
    const result = checkKnownShortener(new URL("https://bit.ly/abc123"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("url.known-shortener");
    expect(result[0].source).toBe("url");
    expect(result[0].severity).toBe(0.4);
    expect(result[0].evidence).toBe("bit.ly");
  });
  it("emits a signal for tinyurl.com", () => {
    const result = checkKnownShortener(new URL("https://tinyurl.com/xyz"));
    expect(result).toHaveLength(1);
    expect(result[0].evidence).toBe("tinyurl.com");
  });
  it("returns no signal for example.com", () => {
    expect(checkKnownShortener(new URL("https://example.com/"))).toEqual([]);
  });
  it("matches case-insensitively", () => {
    const url = { hostname: "BIT.LY" } as unknown as URL;
    const result = checkKnownShortener(url);
    expect(result).toHaveLength(1);
    expect(result[0].evidence).toBe("bit.ly");
  });
});

// ---------------------------------------------------------------------------
// levenshtein (REQ-URL-23)
// ---------------------------------------------------------------------------

import { levenshtein } from "./url-analyzer";

describe("levenshtein (REQ-URL-23)", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("paypal", "paypal")).toBe(0);
  });

  it("returns 3 for 'kitten' and 'sitting'", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// checkBrandLookalike (REQ-URL-20, REQ-URL-21, REQ-URL-22)
// ---------------------------------------------------------------------------

import { checkBrandLookalike } from "./url-analyzer";

describe("checkBrandLookalike", () => {
  it("emits a signal for paypa1.com (REQ-URL-20)", () => {
    const result = checkBrandLookalike(new URL("https://paypa1.com"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("url.brand-lookalike");
    expect(result[0].source).toBe("url");
    expect(result[0].severity).toBe(0.75);
    expect(result[0].evidence).toContain("paypa1");
    expect(result[0].evidence).toContain("paypal");
  });

  it("emits a signal for amaz0n.com (REQ-URL-20)", () => {
    const result = checkBrandLookalike(new URL("https://amaz0n.com"));
    expect(result).toHaveLength(1);
    expect(result[0].evidence).toContain("amazon");
  });

  it("returns no signal for the real paypal.com (REQ-URL-21)", () => {
    expect(checkBrandLookalike(new URL("https://paypal.com"))).toEqual([]);
  });

  it("returns no signal for a stem far from every brand (REQ-URL-22)", () => {
    expect(checkBrandLookalike(new URL("https://xyz123.com"))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkCredentialKeywords (REQ-URL-24, REQ-URL-25, REQ-URL-26)
// ---------------------------------------------------------------------------

import { checkCredentialKeywords } from "./url-analyzer";

describe("checkCredentialKeywords", () => {
  it("emits a signal with 'login' in evidence for /login (REQ-URL-24)", () => {
    const result = checkCredentialKeywords(new URL("https://example.com/login"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("url.credential-keywords");
    expect(result[0].source).toBe("url");
    expect(result[0].severity).toBe(0.45);
    expect(result[0].evidence).toContain("login");
  });

  it("emits one signal listing all matched keywords (REQ-URL-25)", () => {
    const result = checkCredentialKeywords(
      new URL("https://example.com/secure/account/update"),
    );
    expect(result).toHaveLength(1);
    expect(result[0].evidence).toContain("secure");
    expect(result[0].evidence).toContain("account");
    expect(result[0].evidence).toContain("update");
  });

  it("returns no signal for /products/shoes (REQ-URL-26)", () => {
    expect(
      checkCredentialKeywords(new URL("https://example.com/products/shoes")),
    ).toEqual([]);
  });

  it("matches keywords case-insensitively", () => {
    const result = checkCredentialKeywords(new URL("https://example.com/LOGIN"));
    expect(result).toHaveLength(1);
    expect(result[0].evidence).toContain("login");
  });
});

// ---------------------------------------------------------------------------
// UrlAnalyzer class (REQ-URL-27, 28, 29, 30)
// ---------------------------------------------------------------------------

import { UrlAnalyzer } from "./url-analyzer";
import { createSignal } from "../core/signal";

describe("UrlAnalyzer", () => {
  const analyzer = new UrlAnalyzer();

  it("has sourceType 'url'", () => {
    expect(analyzer.sourceType).toBe("url");
  });

  it("returns [] for an empty string", async () => {
    expect(await analyzer.analyze("")).toEqual([]);
  });

  it("returns [] for an unparseable string", async () => {
    expect(await analyzer.analyze("not a url")).toEqual([]);
  });

  it("returns [] for a non-http scheme", async () => {
    expect(await analyzer.analyze("ftp://example.com")).toEqual([]);
  });

  it("returns [] for a clean URL", async () => {
    expect(await analyzer.analyze("https://example.com")).toEqual([]);
  });

  it("returns one signal per triggered check, in check order", async () => {
    const signals = await analyzer.analyze("https://user@paypa1.com/login");
    expect(signals.map((s) => s.id)).toEqual([
      "url.at-in-authority",
      "url.brand-lookalike",
      "url.credential-keywords",
    ]);
  });

  it("returns only valid signals (re-passes createSignal)", async () => {
    const signals = await analyzer.analyze("http://user@192.168.0.1/login");
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) {
      expect(() => createSignal({ ...s })).not.toThrow();
      expect(s.source).toBe("url");
    }
  });

  it("never rejects for non-string input", async () => {
    await expect(analyzer.analyze(undefined as unknown as string)).resolves.toEqual([]);
  });
});
