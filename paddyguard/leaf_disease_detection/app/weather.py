import datetime as dt
from typing import Dict
import numpy as np
import requests

def geocode_sri_lanka(city: str) -> Dict:
    response = requests.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": city, "count": 10, "countryCode": "LK", "format": "json"},
        timeout=20,
    )
    response.raise_for_status()
    results = response.json().get("results", [])
    if not results:
        raise ValueError(f"Sri Lankan city not found: {city}")
    r = results[0]
    return {
        "city": r.get("name"),
        "district": r.get("admin1"),
        "latitude": float(r["latitude"]),
        "longitude": float(r["longitude"]),
    }

def get_weather(latitude: float, longitude: float) -> Dict:
    end_date = dt.date.today() - dt.timedelta(days=1)
    start_date = end_date - dt.timedelta(days=6)

    history = requests.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "timezone": "Asia/Colombo",
            "daily": [
                "temperature_2m_mean",
                "relative_humidity_2m_mean",
                "precipitation_sum",
                "wind_speed_10m_max",
            ],
        },
        timeout=20,
    )
    history.raise_for_status()

    forecast = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "timezone": "Asia/Colombo",
            "forecast_days": 3,
            "daily": [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "relative_humidity_2m_mean",
            ],
        },
        timeout=20,
    )
    forecast.raise_for_status()

    h = history.json().get("daily", {})
    f = forecast.json().get("daily", {})

    def mean(values, default=None):
        valid = [float(v) for v in (values or []) if v is not None]
        return float(np.mean(valid)) if valid else default

    def total(values):
        valid = [float(v) for v in (values or []) if v is not None]
        return float(np.sum(valid)) if valid else 0.0

    return {
        "history_mean_temperature_c": mean(h.get("temperature_2m_mean"), 28.0),
        "history_mean_humidity_pct": mean(h.get("relative_humidity_2m_mean"), 75.0),
        "history_total_rainfall_mm": total(h.get("precipitation_sum")),
        "history_mean_max_wind_kmh": mean(h.get("wind_speed_10m_max"), 0.0),
        "forecast_mean_max_temperature_c": mean(f.get("temperature_2m_max"), 30.0),
        "forecast_mean_min_temperature_c": mean(f.get("temperature_2m_min"), 24.0),
        "forecast_total_rainfall_mm": total(f.get("precipitation_sum")),
        "forecast_mean_humidity_pct": mean(f.get("relative_humidity_2m_mean"), 75.0),
    }
