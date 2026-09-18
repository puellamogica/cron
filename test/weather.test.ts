import { afterEach, describe, expect, it, vi } from "vitest";
import { syncWeather, WEATHER_OBJECT_KEY } from "../src/crons/weather";

type Put = { key: string; body: string; options?: R2PutOptions };

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });

const CURRENT_OK = () =>
  jsonResponse({
    lat: 43.3302,
    lon: 145.5834,
    timezone: "Asia/Tokyo",
    timezone_offset: 32_400,
    data: [
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
        weather: [{ id: 801, description: "晴れ時々曇り", icon: "02d" }],
      },
    ],
  });

const ALERTS_OK = () =>
  jsonResponse({
    alerts: [
      {
        event: "大雨警報",
        start: 1_700_000_000,
        end: 1_700_003_600,
        description: "土砂災害に注意してください。",
      },
    ],
  });

const stubFetch = (current: () => Response, alerts: () => Response): void => {
  vi.stubGlobal("fetch", async (url: URL) =>
    String(url).includes("/3.0/") ? alerts() : current(),
  );
};

const createFakeBucket = () => {
  const puts: Put[] = [];

  const bucket = {
    put: async (key: string, body: string, options?: R2PutOptions) => {
      puts.push({ key, body, options });
    },
  } as unknown as R2Bucket;

  return { bucket, puts };
};

const createEnv = (bucket: R2Bucket) =>
  ({
    OPENWEATHERMAP_API_KEY: { get: async () => "api-key" },
    OPENWEATHERMAP_LAT: "43.3302",
    OPENWEATHERMAP_LON: "145.5834",
    WEATHER_BUCKET: bucket,
  }) as unknown as CloudflareBindings;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("syncWeather", () => {
  it("writes the reading and alerts under the configured cache policy", async () => {
    stubFetch(CURRENT_OK, ALERTS_OK);
    const { bucket, puts } = createFakeBucket();

    await syncWeather(createEnv(bucket));

    expect(puts).toHaveLength(1);
    expect(puts[0].key).toBe(WEATHER_OBJECT_KEY);
    expect(puts[0].options?.httpMetadata).toEqual({
      contentType: "application/json",
      cacheControl: "public, max-age=14400, s-maxage=3600",
    });
    expect(JSON.parse(puts[0].body)).toMatchObject({
      temp: 21.4,
      alerts: [{ event: "大雨警報" }],
    });
  });

  it("publishes without alerts when the alerts request fails", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(CURRENT_OK, () => new Response("upstream down", { status: 503 }));
    const { bucket, puts } = createFakeBucket();

    await syncWeather(createEnv(bucket));

    expect(puts).toHaveLength(1);
    expect(JSON.parse(puts[0].body)).toMatchObject({ temp: 21.4, alerts: [] });
    expect(logged).toHaveBeenCalled();
  });

  it("keeps the previous snapshot when the current reading fails", async () => {
    stubFetch(() => new Response("upstream down", { status: 503 }), ALERTS_OK);
    const { bucket, puts } = createFakeBucket();

    await expect(syncWeather(createEnv(bucket))).rejects.toThrow(
      "OpenWeatherMap One Call 4.0 current weather failed with 503",
    );
    expect(puts).toHaveLength(0);
  });
});
