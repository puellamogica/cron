import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAlerts } from "../src/openweathermap/onecall3";

const REQUEST = {
  lat: "43.3302",
  lon: "145.5834",
  units: "metric",
  lang: "ja",
  apiKey: "api-key",
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAlerts", () => {
  it("keeps only the fields the widget renders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          alerts: [
            {
              sender_name: "気象庁",
              event: "大雨警報",
              start: 1_700_000_000,
              end: 1_700_003_600,
              description: "土砂災害に注意してください。",
              tags: ["Rain"],
            },
          ],
        }),
      ),
    );

    await expect(fetchAlerts(REQUEST)).resolves.toEqual([
      {
        event: "大雨警報",
        start: 1_700_000_000,
        end: 1_700_003_600,
        description: "土砂災害に注意してください。",
      },
    ]);
  });

  it("returns an empty list when the response carries no alerts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({})),
    );

    await expect(fetchAlerts(REQUEST)).resolves.toEqual([]);
  });

  it("asks for alerts only, through a timeout-guarded request", async () => {
    const calls: { url: URL; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: URL, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse({ alerts: [] });
    });

    await fetchAlerts(REQUEST);

    expect(calls).toHaveLength(1);
    expect(calls[0].url.searchParams.get("exclude")).toBe(
      "current,minutely,hourly,daily",
    );
    expect(calls[0].url.searchParams.get("appid")).toBe("api-key");
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws with the response body when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("invalid api key", { status: 401 })),
    );

    await expect(fetchAlerts(REQUEST)).rejects.toThrow(
      "OpenWeatherMap One Call 3.0 alerts failed with 401: invalid api key",
    );
  });
});
