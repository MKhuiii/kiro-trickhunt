import { describe, expect, it } from "vitest";
import {
  expressionsOf,
  fromBase64Any,
  prefixOf,
  sha256,
  toBase64Url,
  toLookupUrl,
} from "./url-expressions";

function exprs(input: string): readonly string[] {
  const url = toLookupUrl(input);
  if (url === null) throw new Error(`not a lookup url: ${input}`);
  return expressionsOf(url);
}

const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

describe("expressionsOf: Google vectors", () => {
  it("a.b.com with path and query", () => {
    expect([...exprs("http://a.b.com/1/2.html?param=1")].sort()).toEqual(
      [
        "a.b.com/1/2.html?param=1",
        "a.b.com/1/2.html",
        "a.b.com/",
        "a.b.com/1/",
        "b.com/1/2.html?param=1",
        "b.com/1/2.html",
        "b.com/",
        "b.com/1/",
      ].sort(),
    );
  });

  it("IP literal uses the host only", () => {
    expect(exprs("http://1.2.3.4/1/")).toEqual(["1.2.3.4/1/", "1.2.3.4/"]);
  });

  it("two-label suffix host adds co.uk forms", () => {
    expect([...exprs("http://example.co.uk/1")].sort()).toEqual(
      ["example.co.uk/1", "example.co.uk/", "co.uk/1", "co.uk/"].sort(),
    );
  });
});

describe("toLookupUrl canonicalization", () => {
  it("unescapes and re-escapes special bytes", () => {
    expect(toLookupUrl("http://a.com/a%20b%23c")?.path).toBe("/a%20b%23c");
  });

  it("unescapes more than once", () => {
    expect(toLookupUrl("http://a.com/%2561")?.path).toBe("/a");
  });

  it("resolves dot segments and collapses slashes in the path only", () => {
    expect(toLookupUrl("http://a.com/a/%2e/b/%2e%2e/c")?.path).toBe("/a/c");
    expect(toLookupUrl("http://a.com//a///b")?.path).toBe("/a/b");
    expect(toLookupUrl("http://a.com/p?x=%2561//")?.query).toBe("x=a//");
  });

  it("converts IDN hosts to punycode", () => {
    expect(toLookupUrl("http://bücher.de/")?.host).toBe("xn--bcher-kva.de");
  });

  it("canonicalizes IPv4 spellings", () => {
    for (const spelling of ["http://0x7f.1/", "http://2130706433/", "http://017700000001/"]) {
      const url = toLookupUrl(spelling);
      expect(url?.host).toBe("127.0.0.1");
      expect(url?.isIpLiteral).toBe(true);
    }
  });

  it("converts IPv4-mapped IPv6 to dotted form", () => {
    const url = toLookupUrl("http://[::ffff:1.2.3.4]/x");
    expect(url?.host).toBe("1.2.3.4");
    expect(url?.isIpLiteral).toBe(true);
    expect(toLookupUrl("http://[2001:db8::1]/")?.host).toBe("[2001:db8::1]");
  });

  it("drops userinfo, port, fragment and scheme", () => {
    expect(exprs("https://user:pw@a.com:8080/p#frag")).toEqual(["a.com/p", "a.com/"]);
  });

  it("returns null for unusable input", () => {
    expect(toLookupUrl("ftp://a.com/")).toBeNull();
    expect(toLookupUrl("http://")).toBeNull();
  });

  it("empty query counts as no query", () => {
    expect(toLookupUrl("http://a.com/p?")?.query).toBeNull();
  });
});

describe("expressionsOf limits", () => {
  it("gives at most 30 distinct expressions", () => {
    const list = exprs("http://a.b.c.d.e.f.g.com/1/2/3/4/5/6?q=1");
    expect(list.length).toBe(30);
    expect(new Set(list).size).toBe(30);
  });
});

describe("hashing helpers", () => {
  it("sha256 of abc", () => {
    expect(hex(sha256("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("prefix is 4 bytes", () => {
    expect(prefixOf(sha256("abc")).length).toBe(4);
    expect(hex(prefixOf(sha256("abc")))).toBe("ba7816bf");
  });

  it("base64url is unpadded and web-safe, and decodes both alphabets", () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe, 0x01]);
    const text = toBase64Url(bytes);
    expect(text).toBe("-__-AQ");
    expect(fromBase64Any(text)).toEqual(bytes);
    expect(fromBase64Any("+//+AQ==")).toEqual(bytes);
    expect(fromBase64Any("a")).toBeNull();
    expect(fromBase64Any("a$b")).toBeNull();
  });
});
