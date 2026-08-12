import { pm25ToAqi, openWeatherAqiToEpaAqi } from "./aqi.js";
import { localDate, localHour } from "./dates.js";
import type { Sensor, Source } from "./types.js";

export interface HourlyAqi { instant: Date; aqi: number; }

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export async function fetchSource(source: Source, sensor: Sensor): Promise<HourlyAqi[]> {
  if (source === "firesmoke") {
    const url = `https://roamsmokeapi-hzbkgecsdzcvdzbw.westus2-01.azurewebsites.net/api/smoke-forecast?lat=${sensor.lat}&lng=${sensor.lng}`;
    const body = await fetchJson(url) as { hourly?: Array<{ validTime?: string; pm25?: number }> };
    return (body.hourly ?? []).flatMap((item) => {
      return item.validTime && typeof item.pm25 === "number" ? [{ instant: new Date(item.validTime), aqi: pm25ToAqi(item.pm25) }] : [];
    });
  }
  if (source === "pirate-weather") {
    const key = process.env.PIRATE_WEATHER_API_KEY;
    if (!key) throw new Error("PIRATE_WEATHER_API_KEY is not set");
    const url = `https://api.pirateweather.net/forecast/${key}/${sensor.lat},${sensor.lng}?units=si&extend=hourly&version=2&exclude=currently,minutely,daily,alerts,flags`;
    const body = await fetchJson(url) as { hourly?: { data?: Array<{ time: number; smoke?: number }> } };
    return (body.hourly?.data ?? []).flatMap((item) => typeof item.smoke === "number" && item.smoke !== -999 ? [{ instant: new Date(item.time * 1000), aqi: pm25ToAqi(item.smoke) }] : []);
  }
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error("OPENWEATHER_API_KEY is not set");
  const url = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${sensor.lat}&lon=${sensor.lng}&appid=${key}`;
  const body = await fetchJson(url) as { list?: Array<{ dt: number; main: { aqi: number } }> };
  return (body.list ?? []).map((item) => ({ instant: new Date(item.dt * 1000), aqi: openWeatherAqiToEpaAqi(item.main.aqi) }));
}

export function dailyAverages(hours: HourlyAqi[], timeZone: string): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const hour of hours) {
    const local = localHour(hour.instant, timeZone);
    if (local < 9 || local > 17) continue;
    const date = localDate(hour.instant, timeZone);
    groups.set(date, [...(groups.get(date) ?? []), hour.aqi]);
  }
  return new Map([...groups].map(([date, values]) => [date, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)]));
}