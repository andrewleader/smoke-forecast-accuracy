import { sameAqiCategory } from "./lib/aqi.js";
import { dataPath, readJsonDirectory, writeJson } from "./lib/storage.js";
import type { ActualRecord, ForecastRecord, ScoreBucket, ScoreSummary, Source } from "./lib/types.js";

const forecastFiles = await readJsonDirectory<ForecastRecord[]>(dataPath("forecasts"));
const actualFiles = await readJsonDirectory<ActualRecord[]>(dataPath("actuals"));
const actuals = new Map(actualFiles.flat().map((actual) => [`${actual.sensorId}:${actual.date}`, actual]));
const groups = new Map<string, Array<{ forecast: number; actual: number }>>();
for (const forecast of forecastFiles.flat()) {
  const actual = actuals.get(`${forecast.sensorId}:${forecast.targetDate}`);
  if (!actual) continue;
  const key = `${forecast.source}:${forecast.leadDays}`;
  groups.set(key, [...(groups.get(key) ?? []), { forecast: forecast.forecastAqi, actual: actual.actualAqi }]);
}
const sources: ScoreSummary["sources"] = {};
for (const [key, comparisons] of groups) {
  const [source, lead] = key.split(":") as [Source, string];
  const errors = comparisons.map(({ forecast, actual }) => forecast - actual);
  const bucket: ScoreBucket = {
    count: comparisons.length,
    mae: round(errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length),
    biasAqi: round(errors.reduce((sum, error) => sum + error, 0) / errors.length),
    withinTolerancePct: round(comparisons.filter(({ forecast, actual }) => Math.abs(forecast - actual) <= 20 || sameAqiCategory(forecast, actual)).length / comparisons.length * 100)
  };
  (sources[source] ??= {})[lead] = bucket;
}
await writeJson(dataPath("scores", "summary.json"), { generatedAt: new Date().toISOString(), sources } satisfies ScoreSummary);
function round(value: number): number { return Math.round(value * 10) / 10; }