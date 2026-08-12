import sensors from "../config/sensors.json" with { type: "json" };
import { addDays, localDate } from "./lib/dates.js";
import { dailyAverages, fetchSource } from "./lib/providers.js";
import { dataPath, readJson, writeJson } from "./lib/storage.js";
import type { ForecastRecord, Source } from "./lib/types.js";

const issuedAt = new Date();
const issuedDate = localDate(issuedAt, "America/Los_Angeles");
const output = dataPath("forecasts", `${issuedDate}.json`);
const existing = await readJson<ForecastRecord[]>(output, []);
const keys = new Set(existing.map((record) => `${record.sensorId}:${record.source}:${record.targetDate}`));
const records = [...existing];

for (const sensor of sensors) {
  for (const source of ["firesmoke", "pirate-weather", "openweather"] as Source[]) {
    try {
      const averages = dailyAverages(await fetchSource(source, sensor), sensor.timeZone);
      for (const [targetDate, forecastAqi] of averages) {
        const leadDays = Math.round((Date.parse(`${targetDate}T12:00:00Z`) - Date.parse(`${issuedDate}T12:00:00Z`)) / 86_400_000);
        const key = `${sensor.id}:${source}:${targetDate}`;
        if (leadDays > 0 && !keys.has(key)) records.push({ sensorId: sensor.id, source, issuedDate, targetDate, leadDays, forecastAqi });
      }
    } catch (error) { console.warn(`Skipping ${source} for ${sensor.label}: ${String(error)}`); }
  }
}
await writeJson(output, records);
console.log(`Stored ${records.length} forecast records in ${output}`);