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

export interface ForecastHistory {
  source: Source;
  obtainedAt: string;
  issuedDate: string;
  sensors: Array<{
    sensorId: string;
    hours: Array<{ forecastAt: string; aqi: number }>;
  }>;
}

export interface ActualRecord {
  sensorId: string;
  date: string;
  actualAqi: number;
  hoursAveraged: number;
  hours: Array<{
    observedAt: string;
    pm25: number;
    aqi: number;
    coveragePercent: number;
  }>;
}

export interface ScoreBucket {
  count: number;
  mae: number;
  withinTolerancePct: number;
  biasAqi: number;
}

export interface LocationScore {
  label: string;
  leadDays: Record<string, ScoreBucket>;
}

export interface SourceScores {
  overall: Record<string, ScoreBucket>;
  locations: Record<string, LocationScore>;
}

export interface ScoreSummary {
  generatedAt: string;
  sources: Partial<Record<Source, SourceScores>>;
}

export interface ForecastDayDetail {
  issuedDate: string;
  actualDate: string;
  rows: Array<{
    sensorId: string;
    label: string;
    actualAqi: number;
    hoursAveraged: number;
    forecasts: Partial<Record<Source, number>>;
  }>;
}

export interface ForecastDaySummary {
  generatedAt: string;
  days: ForecastDayDetail[];
}