import { fetchOpenWeatherMap } from "./request";

const ONECALL_3_URL = "https://api.openweathermap.org/data/3.0/onecall";

const EXCLUDE_ALL_BUT_ALERTS = "current,minutely,hourly,daily";

export interface WeatherAlert {
  event: string;
  start: number;
  end: number;
  description: string;
}

interface RawWeatherAlert {
  sender_name?: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags?: string[];
}

interface AlertsResponse {
  alerts?: RawWeatherAlert[];
}

interface AlertsRequest {
  lat: string;
  lon: string;
  units: string;
  lang: string;
  apiKey: string;
}

function toWeatherAlert(alert: RawWeatherAlert): WeatherAlert {
  return {
    event: alert.event,
    start: alert.start,
    end: alert.end,
    description: alert.description,
  };
}

export async function fetchAlerts(
  request: AlertsRequest,
): Promise<WeatherAlert[]> {
  const url = new URL(ONECALL_3_URL);
  url.searchParams.set("lat", request.lat);
  url.searchParams.set("lon", request.lon);
  url.searchParams.set("exclude", EXCLUDE_ALL_BUT_ALERTS);
  url.searchParams.set("units", request.units);
  url.searchParams.set("lang", request.lang);
  url.searchParams.set("appid", request.apiKey);

  const body = await fetchOpenWeatherMap<AlertsResponse>(
    url,
    "OpenWeatherMap One Call 3.0 alerts",
  );

  return (body.alerts ?? []).map(toWeatherAlert);
}
