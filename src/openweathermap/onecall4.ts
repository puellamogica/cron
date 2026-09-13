const ONECALL_4_CURRENT_URL =
  "https://api.openweathermap.org/data/4.0/onecall/current";

export interface WeatherCondition {
  description: string;
  icon: string;
}

export interface CurrentWeather {
  dt: number;
  sunrise?: number;
  sunset?: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility?: number;
  wind_speed: number;
  wind_gust?: number;
  wind_deg: number;
  rain?: number;
  snow?: number;
  weather: WeatherCondition[];
}

interface RawWeatherCondition extends WeatherCondition {
  id: number;
}

interface RawCurrentWeatherRecord {
  dt: number;
  sunrise?: number;
  sunset?: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility?: number;
  wind_speed: number;
  wind_gust?: number;
  wind_deg: number;
  rain?: { "1h"?: number };
  snow?: { "1h"?: number };
  weather: RawWeatherCondition[];
  alerts?: string[];
}

interface CurrentWeatherResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  data: RawCurrentWeatherRecord[];
}

export interface CurrentWeatherRequest {
  lat: string;
  lon: string;
  units: string;
  lang: string;
  apiKey: string;
}

function toCurrentWeather(record: RawCurrentWeatherRecord): CurrentWeather {
  const { rain, snow, weather, ...current } = record;
  delete current.alerts;

  return {
    ...current,
    ...(rain && rain["1h"] !== undefined ? { rain: rain["1h"] } : {}),
    ...(snow && snow["1h"] !== undefined ? { snow: snow["1h"] } : {}),
    weather: weather.map(({ description, icon }) => ({
      description,
      icon,
    })),
  };
}

export async function fetchCurrentWeather(
  request: CurrentWeatherRequest,
): Promise<CurrentWeather> {
  const url = new URL(ONECALL_4_CURRENT_URL);
  url.searchParams.set("lat", request.lat);
  url.searchParams.set("lon", request.lon);
  url.searchParams.set("units", request.units);
  url.searchParams.set("lang", request.lang);
  url.searchParams.set("appid", request.apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `OpenWeatherMap One Call 4.0 current weather failed with ${response.status}: ${await response.text()}`,
    );
  }

  const body = await response.json<CurrentWeatherResponse>();
  const [record] = body.data;

  if (!record) {
    throw new Error(
      "OpenWeatherMap One Call 4.0 current weather returned no data",
    );
  }

  return toCurrentWeather(record);
}
