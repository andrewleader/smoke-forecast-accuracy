export function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function localHour(date: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(date));
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function localOffset(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(instant);
  return parts.find((part) => part.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
}

export function localWindow(date: string, timeZone: string): { from: string; to: string } {
  const noon = new Date(`${date}T12:00:00Z`);
  const offset = localOffset(noon, timeZone);
  return { from: `${date}T09:00:00${offset}`, to: `${date}T17:00:00${offset}` };
}