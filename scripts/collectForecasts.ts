import sensors from "../config/sensors.json" with { type: "json" };
import { localDate } from "./lib/dates.js";
import { dailyAverages, fetchSource } from "./lib/providers.js";
import { dataPath, readJson, writeJson } from "./lib/storage.js";
import type { ForecastHistory, ForecastRecord, Source } from "./lib/types.js";

const issuedAt = new Date();
const issuedDate = localDate(issuedAt, "America/Los_Angeles");
const output = dataPath("forecasts", `${issuedDate}.json`);
const existing = await readJson<ForecastRecord[]>(output, []);
const keys = new Set(existing.map((record) => `${record.sensorId}:${record.source}:${record.targetDate}`));
const records = [...existing];
const history = new Map<Source, ForecastHistory>();

for (const source of ["firesmoke", "pirate-weather", "openweather"] as Source[]) {
  history.set(source, { source, obtainedAt: issuedAt.toISOString(), issuedDate, sensors: [] });
}

for (const sensor of sensors) {
  for (const source of ["firesmoke", "pirate-weather", "openweather"] as Source[]) {
    if (existing.some((record) => record.sensorId === sensor.id && record.source === source && record.issuedDate === issuedDate)) {
      console.log(`Skipping ${source} for ${sensor.label}: forecasts already collected for ${issuedDate}`);
      continue;
    }
    try {
      const hours = await fetchSource(source, sensor);
      history.get(source)?.sensors.push({
        sensorId: sensor.id,
        hours: hours.map((hour) => ({ forecastAt: hour.instant.toISOString(), aqi: hour.aqi }))
      });
      const averages = dailyAverages(hours, sensor.timeZone);
      for (const [targetDate, forecastAqi] of averages) {
        const leadDays = Math.round((Date.parse(`${targetDate}T12:00:00Z`) - Date.parse(`${issuedDate}T12:00:00Z`)) / 86_400_000);
        const key = `${sensor.id}:${source}:${targetDate}`;
        if (leadDays > 0 && !keys.has(key)) records.push({ sensorId: sensor.id, source, issuedDate, targetDate, leadDays, forecastAqi });
      }
    } catch (error) { console.warn(`Skipping ${source} for ${sensor.label}: ${String(error)}`); }
  }
}
await writeJson(output, records);
for (const [source, snapshot] of history) {
  if (snapshot.sensors.length > 0) await writeJson(dataPath("forecast-history", issuedDate, `${source}.json`), snapshot);
}
console.log(`Stored ${records.length} forecast records in ${output}`);