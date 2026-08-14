const sourceColumns = [
  ["firesmoke", "FireSmoke"],
  ["pirate-weather", "Pirate Weather"],
  ["openweather", "OpenWeather"]
];
const aqiColors = [[0, [0, 228, 0]], [100, [255, 255, 0]], [150, [255, 126, 0]], [200, [255, 0, 0]], [300, [143, 63, 151]], [500, [126, 0, 35]]];

const issuedSelect = document.querySelector("#issued-date");
const actualSelect = document.querySelector("#actual-date");
const status = document.querySelector("#detail-status");
const rows = document.querySelector("#detail-rows");
let days = [];

function option(value) { return `<option value="${value}">${value}</option>`; }
function aqiColor(aqi) {
  const value = Math.max(0, Math.min(500, aqi));
  const upperIndex = aqiColors.findIndex(([limit]) => value <= limit);
  const [lowerLimit, lowerColor] = aqiColors[Math.max(0, upperIndex - 1)];
  const [upperLimit, upperColor] = aqiColors[upperIndex];
  const progress = lowerLimit === upperLimit ? 0 : (value - lowerLimit) / (upperLimit - lowerLimit);
  const color = lowerColor.map((channel, index) => Math.round(channel + (upperColor[index] - channel) * progress));
  return `rgb(${color.join(" ")})`;
}
function aqiCell(aqi, content) { return `<td class="aqi-cell" style="--aqi-color: ${aqiColor(aqi)}">${content}</td>`; }
function forecastCells(actualAqi, forecastAqi) {
  if (forecastAqi === undefined) return "<td>Not available</td>";
  const difference = forecastAqi - actualAqi;
  return aqiCell(forecastAqi, `${forecastAqi} (${difference > 0 ? "+" : ""}${difference})`);
}
function render() {
  const selected = days.find((day) => day.issuedDate === issuedSelect.value && day.actualDate === actualSelect.value);
  if (!selected) return;
  rows.innerHTML = selected.rows.map((row) => `<tr><th>${row.label}</th>${aqiCell(row.actualAqi, row.actualAqi)}<td>${row.hoursAveraged}</td>${sourceColumns.map(([source]) => forecastCells(row.actualAqi, row.forecasts[source])).join("")}</tr>`).join("");
  status.textContent = `${selected.rows.length} locations with observed AQI on ${selected.actualDate}. Positive differences mean the forecast was higher than observed.`;
}
function updateActualDates() {
  const matching = days.filter((day) => day.issuedDate === issuedSelect.value);
  actualSelect.innerHTML = matching.map((day) => option(day.actualDate)).join("");
  render();
}

async function load() {
  const response = await fetch("data/details/forecast-days.json", { cache: "no-store" });
  const summary = await response.json();
  days = summary.days;
  if (!days.length) { status.textContent = "No forecast days have matched observations yet."; return; }
  const issuedDates = [...new Set(days.map((day) => day.issuedDate))];
  issuedSelect.innerHTML = issuedDates.map(option).join("");
  issuedSelect.addEventListener("change", updateActualDates);
  actualSelect.addEventListener("change", render);
  updateActualDates();
}
load().catch(() => { status.textContent = "Forecast-day details could not be loaded."; });