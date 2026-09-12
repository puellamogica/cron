import { fetchAlerts } from "../openweathermap/onecall3";
import { fetchCurrentWeather } from "../openweathermap/onecall4";

export const WEATHER_OBJECT_KEY = "weather.json";

const UNITS = "metric";
const LANG = "ja";

export async function syncWeather(env: CloudflareBindings): Promise<void> {
  const apiKey = await env.OPENWEATHERMAP_API_KEY.get();

  const [current, alerts] = await Promise.all([
    fetchCurrentWeather({
      lat: env.OPENWEATHERMAP_LAT,
      lon: env.OPENWEATHERMAP_LON,
      units: UNITS,
      lang: LANG,
      apiKey,
    }),
    fetchAlerts({
      lat: env.OPENWEATHERMAP_LAT,
      lon: env.OPENWEATHERMAP_LON,
      units: UNITS,
      lang: LANG,
      apiKey,
    }),
  ]);

  await env.WEATHER_BUCKET.put(
    WEATHER_OBJECT_KEY,
    JSON.stringify({ ...current, alerts }),
    { httpMetadata: { contentType: "application/json" } },
  );
}
