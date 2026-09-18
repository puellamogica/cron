import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentWeather } from "../src/openweathermap/onecall4";

const REQUEST = {
  lat: "43.3302",
  lon: "145.5834",
  units: "metric",
  lang: "ja",
  apiKey: "api-key",
};

const currentResponse = (data: unknown[]) =>
  new Response(
    JSON.stringify({
      lat: 43.3302,
      lon: 145.5834,
      timezone: "Asia/Tokyo",
      timezone_offset: 32_400,
      data,
    }),
    { headers: { "content-type": "application/json" } },
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCurrentWeather", () => {
  it("flattens the first reading into the fields the widget renders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        currentResponse([
          {
            dt: 1_700_000_000,
            temp: 21.4,
            feels_like: 20.1,
            pressure: 1012,
            humidity: 63,
            dew_point: 14.2,
            uvi: 3.1,
            clouds: 40,
            visibility: 10_000,
            wind_speed: 4.6,
            wind_gust: 7.2,
            wind_deg: 210,
            rain: { "1h": 0.5 },
            snow: { "1h": 0.2 },
            weather: [{ id: 801, description: "晴れ時々曇り", icon: "02d" }],
            alerts: ["19ba863d0c2b7d6f5c1e2a4b8d3f9012"],
          },
        ]),
      ),
    );

    await expect(fetchCurrentWeather(REQUEST)).resolves.toEqual({
      dt: 1_700_000_000,
      temp: 21.4,
      feels_like: 20.1,
      pressure: 1012,
      humidity: 63,
      dew_point: 14.2,
      uvi: 3.1,
      clouds: 40,
      visibility: 10_000,
      wind_speed: 4.6,
      wind_gust: 7.2,
      wind_deg: 210,
      rain: 0.5,
      snow: 0.2,
      weather: [{ description: "晴れ時々曇り", icon: "02d" }],
    });
  });

  it("omits precipitation the reading does not carry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        currentResponse([
          {
            dt: 1_700_000_000,
            temp: 20,
            feels_like: 20,
            pressure: 1010,
            humidity: 50,
            dew_point: 10,
            uvi: 0,
            clouds: 0,
            wind_speed: 1,
            wind_deg: 90,
            weather: [{ id: 800, description: "快晴", icon: "01d" }],
          },
        ]),
      ),
    );

    const weather = await fetchCurrentWeather(REQUEST);

    expect(weather).not.toHaveProperty("rain");
    expect(weather).not.toHaveProperty("snow");
    expect(weather).not.toHaveProperty("alerts");
  });

  it("throws when the response carries no reading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => currentResponse([])),
    );

    await expect(fetchCurrentWeather(REQUEST)).rejects.toThrow(
      "OpenWeatherMap One Call 4.0 current weather returned no data",
    );
  });

  it("throws with the response body when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("quota exceeded", { status: 429 })),
    );

    await expect(fetchCurrentWeather(REQUEST)).rejects.toThrow(
      "OpenWeatherMap One Call 4.0 current weather failed with 429: quota exceeded",
    );
  });
});
