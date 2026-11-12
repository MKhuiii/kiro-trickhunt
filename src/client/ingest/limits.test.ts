import { describe, expect, it } from "vitest";
import * as server from "../../server/api/api-limits.config";
import * as client from "./ingest.config";

describe("client and server limits match (REQ-CI-56)", () => {
  it("MAX_TEXT_CHARS is equal", () => {
    expect(client.MAX_TEXT_CHARS).toBe(server.MAX_TEXT_CHARS);
  });
  it("MAX_URLS_IN is equal", () => {
    expect(client.MAX_URLS_IN).toBe(server.MAX_URLS_IN);
  });
  it("MAX_URL_CHARS is equal", () => {
    expect(client.MAX_URL_CHARS).toBe(server.MAX_URL_CHARS);
  });
});
