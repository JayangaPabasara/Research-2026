/**
 * Weather notification service.
 * Uses Open-Meteo free API — no API key needed.
 * Checks weather for farmer's saved district using district center coords.
 * Sends browser notification when rain > 10mm or humidity > 85%.
 * These conditions strongly promote Leaf Blast and Bacterial Blight spread.
 */

// District center coordinates for Sri Lanka
const DISTRICT_COORDS: Record<string, { lat: number; lon: number }> = {
  'Colombo': { lat: 6.927, lon: 79.861 },
  'Kandy': { lat: 7.291, lon: 80.636 },
  'Galle': { lat: 6.053, lon: 80.220 },
  'Polonnaruwa': { lat: 7.940, lon: 81.000 },
  'Anuradhapura': { lat: 8.311, lon: 80.403 },
  'Kurunegala': { lat: 7.486, lon: 80.362 },
  'Ratnapura': { lat: 6.680, lon: 80.399 },
  'Badulla': { lat: 6.989, lon: 81.055 },
  'Matara': { lat: 5.945, lon: 80.535 },
  'Hambantota': { lat: 6.124, lon: 81.118 },
  'Trincomalee': { lat: 8.577, lon: 81.233 },
  'Batticaloa': { lat: 7.717, lon: 81.700 },
  'Ampara': { lat: 7.301, lon: 81.672 },
  'Vavuniya': { lat: 8.751, lon: 80.497 },
  'Jaffna': { lat: 9.661, lon: 80.025 },
  'Puttalam': { lat: 8.031, lon: 79.844 },
  'Matale': { lat: 7.468, lon: 80.624 },
  'Nuwara Eliya': { lat: 6.970, lon: 80.770 },
  'Kegalle': { lat: 7.252, lon: 80.342 },
  'Kalutara': { lat: 6.583, lon: 79.960 },
  'Gampaha': { lat: 7.091, lon: 80.016 },
  'Monaragala': { lat: 6.872, lon: 81.350 },
}

// Default fallback for unknown districts
const DEFAULT_COORDS = { lat: 7.873, lon: 80.772 } // Center of Sri Lanka

interface WeatherAlert {
  type: 'rain' | 'humidity' | 'combined'
  value: number
  message: string
  sinhalaMessage: string
}

function getDistrictCoords(district: string): { lat: number; lon: number } {
  // Try exact match first
  if (DISTRICT_COORDS[district]) return DISTRICT_COORDS[district]
  // Try partial match
  const key = Object.keys(DISTRICT_COORDS).find((k) =>
    district.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(district.toLowerCase())
  )
  return key ? DISTRICT_COORDS[key] : DEFAULT_COORDS
}

async function fetchWeather(lat: number, lon: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toString())
  url.searchParams.set('longitude', lon.toString())
  url.searchParams.set('hourly', 'precipitation,relativehumidity_2m,windspeed_10m')
  url.searchParams.set('forecast_days', '1')
  url.searchParams.set('timezone', 'Asia/Colombo')

  const r = await fetch(url.toString())
  if (!r.ok) throw new Error('Weather fetch failed')
  return r.json()
}

function analyseWeather(data: {
  hourly: {
    precipitation: number[]
    relativehumidity_2m: number[]
    windspeed_10m: number[]
  }
}): WeatherAlert | null {
  const hours = data.hourly
  const totalRain = hours.precipitation.reduce((a, b) => a + b, 0)
  const maxHumidity = Math.max(...hours.relativehumidity_2m)

  if (totalRain > 20 && maxHumidity > 85) {
    return {
      type: 'combined',
      value: totalRain,
      message: `Heavy rain (${totalRain.toFixed(0)}mm) and high humidity (${maxHumidity}%) forecast today. High risk of Leaf Blast and Bacterial Blight spread. Inspect crops early.`,
      sinhalaMessage: `අද දිනයේ අධික වර්ෂාපතනය සහ ආර්ද්‍රතාවය. කොළ පාළු සහ බැක්ටීරියා රෝග ව්‍යාප්ත වීමේ අවදානමක් ඇත. ගොයම් ක්ෂේත්‍රය නිරීක්ෂණය කරන්න.`,
    }
  }
  if (totalRain > 15) {
    return {
      type: 'rain',
      value: totalRain,
      message: `Heavy rain (${totalRain.toFixed(0)}mm) expected today. Monitor your paddy fields for disease symptoms.`,
      sinhalaMessage: `අද දිනයේ අධික වැසි (${totalRain.toFixed(0)}mm) අපේක්ෂා වේ. ගොයම් ක්ෂේත්‍රය රෝග ලක්ෂණ සඳහා නිරීක්ෂණය කරන්න.`,
    }
  }
  if (maxHumidity > 90) {
    return {
      type: 'humidity',
      value: maxHumidity,
      message: `Very high humidity (${maxHumidity}%) today. Conditions favour fungal disease development. Check leaf blast symptoms.`,
      sinhalaMessage: `අද ඉතා ඉහළ ආර්ද්‍රතාවයක් (${maxHumidity}%). දිලීර රෝග ව්‍යාප්ත වීමේ අවදානමක් ඇත.`,
    }
  }
  return null
}

async function sendBrowserNotification(alert: WeatherAlert): Promise<void> {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const icon = '/favicon.svg'
  const title = 'PaddyGuard AI — කාලගුණ අනතුරු ඇඟවීම'
  const body = `${alert.sinhalaMessage}\n\n${alert.message}`

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready.catch(() => null)
    if (reg) {
      reg.showNotification(title, { body, icon, badge: icon, tag: 'weather-alert' })
      return
    }
  }
  // Fallback to basic notification
  new Notification(title, { body, icon })
}

const LAST_CHECK_KEY = 'paddyguard_weather_last_check'

export async function checkWeatherAndNotify(): Promise<void> {
  try {
    // Only check once per 6 hours to avoid spam
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
    if (lastCheck) {
      const diff = Date.now() - parseInt(lastCheck)
      if (diff < 6 * 60 * 60 * 1000) return
    }

    const district = localStorage.getItem('paddyguard_location')
    if (!district) return // User skipped location permission

    if (Notification.permission === 'denied') return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    if (Notification.permission !== 'granted') return

    const coords = getDistrictCoords(district)
    const weatherData = await fetchWeather(coords.lat, coords.lon)
    const alert = analyseWeather(weatherData)

    if (alert) {
      await sendBrowserNotification(alert)
    }

    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
  } catch {
    // Weather check is non-critical — never throw
  }
}

export function scheduleWeatherChecks(): void {
  // Check on app load
  checkWeatherAndNotify()
  // Check every 6 hours while app is open
  setInterval(checkWeatherAndNotify, 6 * 60 * 60 * 1000)
}
