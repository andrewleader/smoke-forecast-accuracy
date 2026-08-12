export type Source = "firesmoke" | "pirate-weather" | "openweather";

export interface Sensor {
  id: string;
  locationId: number;
  sensorId: number;
  label: string;
  lat: number;
  lng: number;
  timeZone: string;
}

export interface ForecastRecord {
  sensorId: string;
  source: Source;
  issuedDate: string;
  targetDate: string;
  leadDays: number;
  forecastAqi: number;
}

export interface ActualRecord {
  sensorId: string;
  date: string;
  actualAqi: number;
  hoursAveraged: number;
}

export interface ScoreBucket {
  count: number;
  mae: number;
  withinTolerancePct: number;
  biasAqi: number;
}

export interface ScoreSummary {
  generatedAt: string;
  sources: Partial<Record<Source, Record<string, ScoreBucket>>>;
}