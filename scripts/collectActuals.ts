import sensors from "../config/sensors.json" with { type: "json" };
import { pm25ToAqi } from "./lib/aqi.js";
import { localDate, localWindow } from "./lib/dates.js";
import { dataPath, readJson, readJsonDirectory, writeJson } from "./lib/storage.js";
import type { ActualRecord, ForecastRecord } from "./lib/types.js";

const apiKey = process.env.OPENAQ_API_KEY;
if (!apiKey) throw new Error("OPENAQ_API_KEY is not set");
const today = new Date();
const forecasts = (await readJsonDirectory<ForecastRecord[]>(dataPath("forecasts"))).flat();
const actuals = (await readJsonDirectory<ActualRecord[]>(dataPath("actuals"))).flat();
const actualKeys = new Set(actuals.map((actual) => `${actual.sensorId}:${actual.date}`));

for (const sensor of sensors) {
  const todayLocal = localDate(today, sensor.timeZone);
  const dates = [...new Set(forecasts
    .filter((forecast) => forecast.sensorId === sensor.id && forecast.targetDate <= todayLocal && !actualKeys.has(`${sensor.id}:${forecast.targetDate}`))
    .map((forecast) => forecast.targetDate))].sort().reverse();
  const date = dates[0];
  if (!date) continue;

  const output = dataPath("actuals", `${date}.json`);
  const records = await readJson<ActualRecord[]>(output, []);
  const window = localWindow(date, sensor.timeZone);
  const url = new URL(`https://api.openaq.org/v3/sensors/${sensor.sensorId}/measurements`);
  url.searchParams.set("datetime_from", window.from);
  url.searchParams.set("datetime_to", window.to);
  url.searchParams.set("limit", "100");
  try {
    const response = await fetch(url, { headers: { "X-API-Key": apiKey } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const body = await response.json() as { results?: Array<{
      value: number;
      datetime?: { from?: string };
      coverage?: { percentComplete?: number };
    }> };
    const hours = (body.results ?? []).flatMap((result) => {
      const coveragePercent = result.coverage?.percentComplete ?? 100;
      return coveragePercent > 0 && result.datetime?.from
        ? [{ observedAt: result.datetime.from, pm25: result.value, aqi: pm25ToAqi(result.value), coveragePercent }]
        : [];
    });
    if (hours.length < 6) { console.warn(`Skipping ${sensor.label} ${date}: only ${hours.length} readings`); continue; }
    const averagePm25 = hours.reduce((sum, hour) => sum + hour.pm25, 0) / hours.length;
    records.push({ sensorId: sensor.id, date, actualAqi: pm25ToAqi(averagePm25), hoursAveraged: hours.length, hours });
    await writeJson(output, records);
  } catch (error) { console.warn(`Skipping ${sensor.label} ${date}: ${String(error)}`); }
  }