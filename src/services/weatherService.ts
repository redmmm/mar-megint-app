export interface WeatherData {
  temp: number;
  conditionText: string;
  canSkate: boolean;
  city: string;
  permissionDenied?: boolean;
  lat?: number;
  lon?: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
}

// Helper utility to perform fetch requests with a timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Get user's current location with optimized settings and a 6-second timeout
export const getPositionWithTimeout = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    console.log('Checking geolocation support...');

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      reject(new Error('A böngésző nem támogatja a helymeghatározást'));
      return;
    }

    console.log('Requesting geolocation permission...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Geolocation success:', position.coords.latitude, position.coords.longitude);
        resolve(position);
      },
      (error) => {
        console.error('Geolocation error:', error);
        reject(error);
      },
      {
        enableHighAccuracy: false, // Use Wi-Fi/IP location for speed
        timeout: 6000, // Wait 6 seconds for user decision/hardware response
        maximumAge: 1800000, // 30 minutes - use cached location if recent
      }
    );
  });
};

// Get city name from coordinates using Nominatim (OpenStreetMap) with a timeout fallback
export const getCityFromCoordinates = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {},
      3000
    );

    if (!response.ok) {
      throw new Error('Failed to get location data');
    }

    const data = await response.json();

    // Try to get city name from different possible fields
    const city = data.address?.city ||
                 data.address?.town ||
                 data.address?.village ||
                 data.address?.municipality ||
                 data.display_name?.split(',')[0] ||
                 'Unknown Location';

    return city;
  } catch (error) {
    console.error('Error getting city name:', error);
    return 'Unknown Location';
  }
};

// Helper function for city name (alias for backward compatibility)
export const getCityName = getCityFromCoordinates;

// Get location via IP address using a multi-service fallback chain
export const getLocationFromIP = async (): Promise<{ latitude: number; longitude: number; city: string }> => {
  console.log('Fetching location via IP address...');

  // Try GeoJS first
  try {
    const response = await fetchWithTimeout('https://get.geojs.io/v1/ip/geo.json', {}, 3000);
    if (response.ok) {
      const data = await response.json();
      const latitude = parseFloat(data.latitude);
      const longitude = parseFloat(data.longitude);
      const city = data.city || 'Unknown Location';
      if (!isNaN(latitude) && !isNaN(longitude)) {
        console.log('GeoJS IP location success:', { latitude, longitude, city });
        return { latitude, longitude, city };
      }
    }
  } catch (err) {
    console.warn('GeoJS IP location failed, trying secondary...', err);
  }

  // Try FreeIPAPI second
  try {
    const response = await fetchWithTimeout('https://freeipapi.com/api/json', {}, 3000);
    if (response.ok) {
      const data = await response.json();
      const latitude = parseFloat(data.latitude);
      const longitude = parseFloat(data.longitude);
      const city = data.cityName || 'Unknown Location';
      if (!isNaN(latitude) && !isNaN(longitude)) {
        console.log('FreeIPAPI IP location success:', { latitude, longitude, city });
        return { latitude, longitude, city };
      }
    }
  } catch (err) {
    console.warn('FreeIPAPI IP location failed, trying tertiary...', err);
  }

  // Try ipapi.co third
  try {
    const response = await fetchWithTimeout('https://ipapi.co/json/', {}, 3000);
    if (response.ok) {
      const data = await response.json();
      const latitude = parseFloat(data.latitude);
      const longitude = parseFloat(data.longitude);
      const city = data.city || 'Unknown Location';
      if (!isNaN(latitude) && !isNaN(longitude)) {
        console.log('ipapi.co IP location success:', { latitude, longitude, city });
        return { latitude, longitude, city };
      }
    }
  } catch (err) {
    console.warn('ipapi.co IP location failed.', err);
  }

  throw new Error('All IP location services failed');
};

// Format Hungarian city names with proper accents
export const formatHungarianCityName = (rawCity: string): string => {
  if (!rawCity) return rawCity;
  const trimmed = rawCity.trim();

  const cityMap: Record<string, string> = {
    'gyor': 'Győr',
    'győr': 'Győr',
    'pecs': 'Pécs',
    'szeged': 'Szeged',
    'debrecen': 'Debrecen',
    'miskolc': 'Miskolc',
    'szekesfehervar': 'Székesfehérvár',
    'szombathely': 'Szombathely',
    'nyiregyhaza': 'Nyíregyháza',
    'kecskemet': 'Kecskemét',
    'bekescsaba': 'Békéscsaba',
    'veszprem': 'Veszprém',
    'tatabanya': 'Tatabánya',
    'eger': 'Eger',
    'sopron': 'Sopron',
    'kaposvar': 'Kaposvár',
    'zalaegerszeg': 'Zalaegerszeg',
    'szolnok': 'Szolnok',
    'hodmezovasarhely': 'Hódmezővásárhely',
    'erd': 'Érd',
    'budapest': 'Budapest',
  };

  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(cityMap)) {
    if (lower === key || lower.startsWith(key)) {
      if (lower.includes('(alapértelmezett)') || lower.includes('(default)')) {
        return `${val} (Alapértelmezett)`;
      }
      return val;
    }
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

// Fetch weather data and return complete result
export const fetchWeatherFromOpenMeteo = async (lat: number, lon: number, city: string): Promise<WeatherData> => {
  try {
    console.log('Fetching weather data with coordinates:', { lat, lon, city });

    // Get weather data
    const weatherData = await getWeatherData(lat, lon);
    console.log('Weather conditions:', weatherData);

    // Check skate conditions
    const skateCheck = checkSkateConditions(weatherData.temperature, weatherData.weatherCode);
    console.log('Skate conditions result:', skateCheck);

    // Add formatted city and coordinates to result
    skateCheck.city = formatHungarianCityName(city);
    skateCheck.lat = lat;
    skateCheck.lon = lon;

    console.log('Final result:', skateCheck);
    return skateCheck;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ismeretlen hiba';
    console.error('Weather fetch failed:', errorMessage);
    throw new Error(`Időjárás adatok lekérése sikertelen: ${errorMessage}`);
  }
};

// Fetch weather data from Open-Meteo API
export const getWeatherData = async (lat: number, lon: number): Promise<{ temperature: number; weatherCode: number }> => {
  const response = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,
    {},
    4000
  );

  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const data = await response.json();

  return {
    temperature: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
  };
};

// Determine if weather conditions are suitable for skating
export const checkSkateConditions = (temperature: number, weatherCode: number): WeatherData => {
  // WMO Weather Codes 51+ indicate precipitation (rain, snow, thunderstorm, etc.)
  const hasPrecipitation = weatherCode >= 51;

  // Snow codes: 71, 73, 75 (snow fall), 77 (snow grains), 85, 86 (snow showers)
  // Note: 80, 81, 82 are rain showers (záporeső), NOT snow!
  // Also sanity check with temperature: cannot snow if well above freezing
  const isSnow = ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) && temperature <= 3;
  const isThunderstorm = weatherCode === 95 || weatherCode === 96 || weatherCode === 99;

  // Precipitation is the #1 dealbreaker
  if (hasPrecipitation) {
    let precipitationType = 'esik';
    if (isSnow) {
      precipitationType = 'havazik';
    } else if (isThunderstorm) {
      precipitationType = 'vihar van';
    }

    return {
      temp: temperature,
      conditionText: `Nincs deszkás idő, mert ${precipitationType}.`,
      canSkate: false,
      city: '', // Will be filled by caller
    };
  }

  // Temperature-based logic when it's clear/dry
  if (temperature > 33) {
    return {
      temp: temperature,
      conditionText: 'Túl meleg van a deszkázáshoz.',
      canSkate: false,
      city: '',
    };
  }

  if (temperature > 30) {
    return {
      temp: temperature,
      conditionText: 'Meleg van, de tolhatod.',
      canSkate: true,
      city: '',
    };
  }

  if (temperature >= 20 && temperature <= 28) {
    return {
      temp: temperature,
      conditionText: 'Ideális deszkás idő van!',
      canSkate: true,
      city: '',
    };
  }

  if (temperature >= 10 && temperature < 20) {
    return {
      temp: temperature,
      conditionText: 'Deszkás idő van.',
      canSkate: true,
      city: '',
    };
  }

  if (temperature < 5) {
    return {
      temp: temperature,
      conditionText: 'Túl hideg van a deszkázáshoz.',
      canSkate: false,
      city: '',
    };
  }

  if (temperature >= 5 && temperature < 10) {
    return {
      temp: temperature,
      conditionText: 'Deszkás idő, de hideg van.',
      canSkate: true,
      city: '',
    };
  }

  // Default case (shouldn't reach here with current logic)
  return {
    temp: temperature,
    conditionText: 'Deszkás idő van.',
    canSkate: true,
    city: '',
  };
};

// Main function to get complete weather check with smart fallbacks
export const getSkateWeatherCheck = async (): Promise<WeatherData> => {
  // Initialize with Győr fallback by default
  let lat = 47.6875;
  let lon = 17.6504;
  let city = "Győr (Alapértelmezett)";
  let permissionDenied = false;

  try {
    // Layer 1: Try Browser Geolocation
    console.log("Layer 1: Attempting browser geolocation...");
    const pos = await getPositionWithTimeout();
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    
    // Attempt city name reverse geocoding
    try {
      city = await getCityName(lat, lon) || "Ismeretlen helyszín";
    } catch (e) {
      console.warn("City name lookup failed, continuing with coordinates:", e);
      city = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
    console.log("Browser location found:", city);

  } catch (browserError) {
    console.warn("Browser geolocation failed or timed out:", browserError);
    permissionDenied = true;

    // Layer 2: IP fallback for ANY geolocation failure/timeout
    try {
      console.log("Layer 2: Attempting IP geolocation fallback...");
      const ipLocation = await getLocationFromIP();
      lat = ipLocation.latitude;
      lon = ipLocation.longitude;
      city = ipLocation.city;
      permissionDenied = false; // We got their general location via IP!
      console.log("IP Location found:", city);
    } catch (ipError) {
      console.warn("IP geolocation fallback failed, using Győr default.", ipError);
      lat = 47.6875;
      lon = 17.6504;
      city = "Győr (Alapértelmezett)";
    }
  }

  // Layer 3: Fetch Weather
  const weatherResult = await fetchWeatherFromOpenMeteo(lat, lon, city);
  return {
    ...weatherResult,
    permissionDenied: permissionDenied
  };
};

// Search for Hungarian cities using Open-Meteo Geocoding API
export interface HungarianCityResult {
  name: string;
  latitude: number;
  longitude: number;
}

export const searchHungarianCities = async (query: string): Promise<HungarianCityResult[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetchWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=hu&format=json&country=HU`,
      {},
      3000
    );

  if (!response.ok) {
    throw new Error('Failed to fetch city search results');
  }

  const data = await response.json();

  if (!data.results) {
    return [];
  }

  return data.results.map((result: { name: string; latitude: number; longitude: number }) => ({
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
  }));
} catch (error) {
  console.error('Error searching Hungarian cities:', error);
  return [];
}
};

export interface ForecastDay {
  date: string;
  dayLabel: string;
  fullDayName: string;
  formattedDate: string;
  isToday: boolean;
  tempMax: number;
  tempMin: number;
  windMax: number;
  windMin: number;
  precipSum: number;
  precipProbMax: number;
  weatherCode: number;
  conditionEmoji: string;
}

const getWeatherEmoji = (code: number): string => {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code === 85 || code === 86) return '❄️';
  if (code >= 95) return '⛈️';
  return '🌤️';
};

export const fetchForecastFromOpenMeteo = async (lat: number, lon: number): Promise<ForecastDay[]> => {
  // Request 8 forecast days and 1 past day
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,precipitation_probability_max,weather_code&hourly=wind_speed_10m&timezone=auto&forecast_days=8&past_days=1`;

  const response = await fetchWithTimeout(url, {}, 5000);
  if (!response.ok) {
    throw new Error('Nem sikerült lekérni az előrejelzési adatokat');
  }

  const data = await response.json();
  const daily = data.daily;
  const hourly = data.hourly;

  if (!daily || !daily.time) {
    throw new Error('Érvénytelen előrejelzési adatformátum');
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const HU_DAYS: Array<{ label: string; name: string }> = [
    { label: 'V', name: 'Vasárnap' },
    { label: 'H', name: 'Hétfő' },
    { label: 'K', name: 'Kedd' },
    { label: 'SZ', name: 'Szerda' },
    { label: 'CS', name: 'Csütörtök' },
    { label: 'P', name: 'Péntek' },
    { label: 'SZO', name: 'Szombat' },
  ];

  // Dynamically generate 5 consecutive days starting from TODAY
  const forecastDays: ForecastDay[] = Array.from({ length: 5 }, (_, index) => {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() + index);

    const dayOfWeek = dayDate.getDay(); // 0: Vasárnap, 1: Hétfő, ...
    const dayInfo = HU_DAYS[dayOfWeek];

    const year = dayDate.getFullYear();
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const formattedDate = `${month}.${day}.`;

    const dailyIndex = daily.time.indexOf(dateStr);

    if (dailyIndex !== -1) {
      const tempMax = Math.round(daily.temperature_2m_max[dailyIndex] ?? 0);
      const tempMin = Math.round(daily.temperature_2m_min[dailyIndex] ?? 0);
      const windMax = Math.round(daily.wind_speed_10m_max[dailyIndex] ?? 0);
      const precipSum = Number((daily.precipitation_sum[dailyIndex] ?? 0).toFixed(1));
      const precipProbMax = Math.round(daily.precipitation_probability_max?.[dailyIndex] ?? 0);
      const weatherCode = daily.weather_code[dailyIndex] ?? 0;

      let windMin = 0;
      if (hourly && hourly.time && hourly.wind_speed_10m) {
        const dayWindSpeeds: number[] = [];
        for (let h = 0; h < hourly.time.length; h++) {
          if (typeof hourly.time[h] === 'string' && hourly.time[h].startsWith(dateStr)) {
            dayWindSpeeds.push(hourly.wind_speed_10m[h]);
          }
        }
        if (dayWindSpeeds.length > 0) {
          windMin = Math.round(Math.min(...dayWindSpeeds));
        }
      }
      if (windMin === 0 && windMax > 0) {
        windMin = Math.max(1, Math.round(windMax * 0.35));
      }

      return {
        date: dateStr,
        dayLabel: dayInfo.label,
        fullDayName: dayInfo.name,
        formattedDate,
        isToday: dateStr === todayStr,
        tempMax,
        tempMin,
        windMax,
        windMin,
        precipSum,
        precipProbMax,
        weatherCode,
        conditionEmoji: getWeatherEmoji(weatherCode),
      };
    }

    return {
      date: dateStr,
      dayLabel: dayInfo.label,
      fullDayName: dayInfo.name,
      formattedDate,
      isToday: dateStr === todayStr,
      tempMax: 18,
      tempMin: 8,
      windMax: 15,
      windMin: 5,
      precipSum: 0,
      precipProbMax: 0,
      weatherCode: 0,
      conditionEmoji: '🌤️',
    };
  });

  return forecastDays;
};

