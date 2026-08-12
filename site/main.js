const labels = { firesmoke: "FireSmoke", "pirate-weather": "Pirate Weather", openweather: "OpenWeather" };
const format = (value, suffix = "") => `${value}${suffix}`;

async function render() {
  const response = await fetch("data/scores/summary.json", { cache: "no-store" });
  const summary = await response.json();
  document.querySelector("#updated").textContent = summary.generatedAt ? `Last updated ${new Date(summary.generatedAt).toLocaleString()}` : "No scored forecasts yet.";
  const target = document.querySelector("#results");
  for (const [source, buckets] of Object.entries(summary.sources)) {
    const card = document.querySelector("#source-template").content.cloneNode(true);
    card.querySelector("h2").textContent = labels[source] || source;
    const rows = Object.entries(buckets).sort(([a], [b]) => Number(a) - Number(b));
    card.querySelector("tbody").innerHTML = rows.map(([lead, score]) => `<tr><th>${lead} day${lead === "1" ? "" : "s"}</th><td>${format(score.mae)}</td><td>${format(score.biasAqi)}</td><td>${format(score.withinTolerancePct, "%")}</td><td>${score.count}</td></tr>`).join("");
    target.append(card);
  }
}
render().catch(() => { document.querySelector("#updated").textContent = "Results could not be loaded."; });