# Smoke Forecast Accuracy

A static, daily tracker for comparing smoke and AQI forecasts with observed OpenAQ PM2.5 measurements. It measures how accurately FireSmoke, Pirate Weather, and OpenWeather predict the average AQI during each sensor's local 9am-5pm window.

The public dashboard is a static GitHub Pages site. Forecasts, observations, and scores are committed as small JSON files, so the project needs no database or application server.

## How It Works

1. Each run collects hourly forecasts for every configured OpenAQ sensor and converts them into daily local 9am-5pm AQI averages.
2. For each sensor, it finds the newest completed forecast target date that does not yet have an observation and requests that one OpenAQ window.
3. It scores every forecast with an available actual using mean absolute error, signed bias, and the percentage within the tolerance threshold.
4. GitHub Actions commits updated data and publishes the dashboard to GitHub Pages.

The actuals step deliberately makes at most one OpenAQ request per sensor per run. A forecast must exist and its target date must be before the sensor's current local date before an actual is requested.

## Local Setup

Requires Node.js 22 or later.

```powershell
npm ci
Copy-Item .env.example .env
```

Set these values in `.env`:

```dotenv
OPENAQ_API_KEY=
PIRATE_WEATHER_API_KEY=
OPENWEATHER_API_KEY=
```

`.env` is ignored by git. Do not commit API keys.
The local collection commands load this file automatically. In GitHub Actions, the same variables are supplied from repository secrets.

## Commands

```powershell
# Fetch and store each provider's current forecasts.
npm run collect:forecasts

# Fetch one newest missing, completed actual window per sensor.
npm run collect:actuals

# Recompute scores from every stored forecast and actual.
npm run score

# Run the full daily sequence.
npm run run:daily

# Stage the site and data as GitHub Pages does, then serve it at http://localhost:4173.
npm run preview

# Type-check the TypeScript scripts.
npm run check
```

The dashboard gains its first meaningful scores only after forecast target dates have elapsed and OpenAQ observations are available.

## Data

```text
config/sensors.json          Fixed OpenAQ sensor roster and local IANA time zones
data/forecasts/YYYY-MM-DD.json
data/actuals/YYYY-MM-DD.json
data/forecast-history/YYYY-MM-DD/<source>.json
data/scores/summary.json     Dashboard input
site/                        Static GitHub Pages dashboard
```

Each forecast-history file captures one provider's full hourly forecast response for every sensor, including the UTC time it was obtained. Each actuals file covers one local date and now retains every valid hourly OpenAQ observation, its PM2.5 value, coverage, and derived AQI alongside the daily score value.

Forecast and actual AQI values are generated from PM2.5 with the EPA AQI breakpoints. OpenWeather's five-level AQI category is mapped to its EPA AQI midpoint. A score counts as within tolerance when it is within 20 AQI points or falls in the same EPA AQI category as the observation.

## Scheduled Deployment

 [daily.yml](.github/workflows/daily.yml) runs at `03:00 UTC`, which is 8pm Pacific daylight time and 7pm Pacific standard time. GitHub Actions cron schedules use UTC; both times are after the 9am-5pm local observation window.

Add these repository secrets before running the workflow:

- `OPENAQ_API_KEY`
- `PIRATE_WEATHER_API_KEY`
- `OPENWEATHER_API_KEY`

Set the repository's GitHub Pages source to **GitHub Actions**. The workflow has permission to commit updated `data/` files back to the default branch and publishes a staging directory containing both `site/` and `data/`.

## Sensors and Providers

The initial roster contains ten fixed sensors across Washington, British Columbia, and Wyoming. Update [config/sensors.json](config/sensors.json) only after validating the OpenAQ PM2.5 sensor ID, coordinates, reporting history, and IANA time zone.

| Provider | Forecast input |
| --- | --- |
| FireSmoke | PM2.5 smoke forecast |
| Pirate Weather | Hourly `smoke` PM2.5 forecast |
| OpenWeather | Hourly five-level air-pollution AQI category |

## Adding a Sensor

1. Go to https://explore.openaq.org/
2. Click on a circle on the map (ensure a PM2.5 graph shows up)
3. Click "Show Details"
4. Copy the **Location ID** from the URL, ex `https://explore.openaq.org/locations/1398`
5. Open a HTTP request tool like Insomnia, and send a GET request to the location API, like `https://api.openaq.org/v3/locations/1398`, including an `X-API-Key` header with a value of your OpenAQ API key.
6. In the JSON response, identify the PM2.5 sensor, that's the **Sensor ID**. You'll also need the **Coordinates**.

```json
    {
        "id": 13419138,
        "name": "pm25 µg/m³",
        "parameter": {
            "id": 2,
            "name": "pm25",
            "units": "µg/m³",
            "displayName": "PM2.5"
        }
    }
],
"coordinates": {
    "latitude": 43.577603,
    "longitude": -116.178156
},
```

Finally, add this to [config\sensors.json](./config/sensors.json).

```json
{ "id": "openaq-1398", "locationId": 1398, "sensorId": 13419138, "label": "Example, WA", "lat": 43.577603, "lng": -116.178156, "timeZone": "America/Denver" }
```