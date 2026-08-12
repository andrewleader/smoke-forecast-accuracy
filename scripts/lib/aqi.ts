const BREAKPOINTS = [
  [0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 400],
  [325.5, 500.4, 401, 500]
] as const;

export function pm25ToAqi(pm25: number): number {
  const concentration = Math.max(0, Math.min(500.4, Math.floor(pm25 * 10) / 10));
  const breakpoint = BREAKPOINTS.find(([low, high]) => concentration >= low && concentration <= high) ?? BREAKPOINTS.at(-1)!;
  const [concentrationLow, concentrationHigh, aqiLow, aqiHigh] = breakpoint;
  return Math.round(((aqiHigh - aqiLow) / (concentrationHigh - concentrationLow)) * (concentration - concentrationLow) + aqiLow);
}

export function openWeatherAqiToEpaAqi(category: number): number {
  return ({ 1: 25, 2: 75, 3: 125, 4: 175, 5: 250 } as Record<number, number>)[category] ?? 0;
}

export function sameAqiCategory(first: number, second: number): boolean {
  const category = (aqi: number) => aqi <= 50 ? 0 : aqi <= 100 ? 1 : aqi <= 150 ? 2 : aqi <= 200 ? 3 : aqi <= 300 ? 4 : 5;
  return category(first) === category(second);
}