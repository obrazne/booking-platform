import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
const { verifyTurnstile } = await import("./turnstile");
const { ipFromHeaders, hashIp } = await import("./guard");

const reply = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response);

describe("turnstile", () => {
  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("is skipped without the secret key (local development, CI)", async () => {
    const fetchImpl = reply({ success: false });
    expect(await verifyTurnstile("", null, fetchImpl)).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("asks Cloudflare with the token and the client IP", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const fetchImpl = reply({ success: true });
    expect(await verifyTurnstile("token", "203.0.113.5", fetchImpl)).toBe(true);
    const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as URLSearchParams;
    expect(body.get("response")).toBe("token");
    expect(body.get("remoteip")).toBe("203.0.113.5");
  });

  it("fails closed: missing token, refusal, HTTP error, network error", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    expect(await verifyTurnstile("", null, reply({ success: true }))).toBe(false);
    expect(await verifyTurnstile("t", null, reply({ success: false }))).toBe(false);
    expect(await verifyTurnstile("t", null, reply({ success: true }, false))).toBe(false);
    const broken = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await verifyTurnstile("t", null, broken)).toBe(false);
  });
});

describe("client IP", () => {
  it("takes the first address of x-forwarded-for, then x-real-ip", () => {
    expect(ipFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe(
      "203.0.113.5",
    );
    expect(ipFromHeaders(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(ipFromHeaders(new Headers())).toBeNull();
  });

  it("is stored only as a keyed hash", () => {
    process.env.FORM_SECRET = "test-secret";
    expect(hashIp("203.0.113.5")).not.toContain("203");
    expect(hashIp("203.0.113.5")).toBe(hashIp("203.0.113.5"));
    expect(hashIp("203.0.113.5")).not.toBe(hashIp("203.0.113.6"));
  });
});
