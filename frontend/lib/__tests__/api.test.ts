import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const baseUrl = "http://localhost:4000";
Object.assign(process.env, { API_INTERNAL_URL: baseUrl });

const server = setupServer();

let request: typeof import("../api").request;
let tokenStorage: typeof import("../api").tokenStorage;

beforeAll(async () => {
  const mod = await import("../api");
  request = mod.request;
  tokenStorage = mod.tokenStorage;
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("api request", () => {
  it("adds Authorization header when token exists", async () => {
    server.use(
      http.get(`${baseUrl}/auth-test`, ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer test-token");
        return HttpResponse.json({ ok: true });
      })
    );

    vi.spyOn(tokenStorage, "get").mockReturnValue("test-token");
    const data = await request<{ ok: boolean }>("/auth-test");
    expect(data).toEqual({ ok: true });
  });

  it("parses JSON responses", async () => {
    server.use(
      http.get(`${baseUrl}/json`, () => HttpResponse.json({ value: 42 }))
    );

    const data = await request<{ value: number }>("/json");
    expect(data.value).toBe(42);
  });

  it("handles 204/empty body", async () => {
    server.use(
      http.get(`${baseUrl}/empty`, () => new HttpResponse(null, { status: 204 }))
    );

    const data = await request<Record<string, never>>("/empty");
    expect(data).toEqual({});
  });

  it("surfaces JSON error payloads", async () => {
    server.use(
      http.get(`${baseUrl}/error`, () =>
        HttpResponse.json({ detail: "Bad request" }, { status: 400 })
      )
    );

    await expect(request("/error")).rejects.toThrow("Bad request");
  });

  it("aborts on timeout with a helpful error", async () => {
    server.use(
      http.get(`${baseUrl}/timeout`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ ok: true });
      })
    );

    await expect(
      request("/timeout", { timeoutMs: 10, retries: 0 })
    ).rejects.toThrow("Request timed out");
  });
});
