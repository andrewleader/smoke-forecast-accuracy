import sensors from "../config/sensors.json" with { type: "json" };
import { sameAqiCategory } from "./lib/aqi.js";
import { dataPath, readJsonDirectory, writeJson } from "./lib/storage.js";
import type { ActualRecord, ForecastRecord, ScoreBucket, ScoreSummary, Source } from "./lib/types.js";

const forecastFiles = await readJsonDirectory<ForecastRecord[]>(dataPath("forecasts"));
const actualFiles = await readJsonDirectory<ActualRecord[]>(dataPath("actuals"));
const actuals = new Map(actualFiles.flat().map((actual) => [`${actual.sensorId}:${actual.date}`, actual]));
const sensorLabels = new Map(sensors.map((sensor) => [sensor.id, sensor.label]));
const groups = new Map<string, Array<{ forecast: number; actual: number }>>();
const locationGroups = new Map<string, Array<{ forecast: number; actual: number }>>();
for (const forecast of forecastFiles.flat()) {
  const actual = actuals.get(`${forecast.sensorId}:${forecast.targetDate}`);
  if (!actual) continue;
  const key = `${forecast.source}:${forecast.leadDays}`;
  const comparison = { forecast: forecast.forecastAqi, actual: actual.actualAqi };
  groups.set(key, [...(groups.get(key) ?? []), comparison]);
  const locationKey = `${forecast.source}:${forecast.sensorId}:${forecast.leadDays}`;
  locationGroups.set(locationKey, [...(locationGroups.get(locationKey) ?? []), comparison]);
}
const sources: ScoreSummary["sources"] = {};
for (const [key, comparisons] of groups) {
  const [source, lead] = key.split(":") as [Source, string];
  (sources[source] ??= { overall: {}, locations: {} }).overall[lead] = score(comparisons);
}
for (const [key, comparisons] of locationGroups) {
  const [source, sensorId, lead] = key.split(":") as [Source, string, string];
  const sourceScores = (sources[source] ??= { overall: {}, locations: {} });
  const location = (sourceScores.locations[sensorId] ??= { label: sensorLabels.get(sensorId) ?? sensorId, leadDays: {} });
  location.leadDays[lead] = score(comparisons);
}
await writeJson(dataPath("scores", "summary.json"), { generatedAt: new Date().toISOString(), sources } satisfies ScoreSummary);

function score(comparisons: Array<{ forecast: number; actual: number }>): ScoreBucket {
  const errors = comparisons.map(({ forecast, actual }) => forecast - actual);
  return {
    count: comparisons.length,
    mae: round(errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length),
    biasAqi: round(errors.reduce((sum, error) => sum + error, 0) / errors.length),
    withinTolerancePct: round(comparisons.filter(({ forecast, actual }) => Math.abs(forecast - actual) <= 20 || sameAqiCategory(forecast, actual)).length / comparisons.length * 100)
  };
}

function round(value: number): number { return Math.round(value * 10) / 10; }