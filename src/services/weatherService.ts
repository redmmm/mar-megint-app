export interface WeatherData {
  temp: number;
  conditionText: string;
  canSkate: boolean;
  city: string;
  permissionDenied?: boolean;
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

    // Add city to result
    skateCheck.city = city;

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
  // WMO Weather Codes 51+ indicate precipitation (rain, snow, etc.)
  const hasPrecipitation = weatherCode >= 51;
  const isSnow = weatherCode >= 71 && weatherCode <= 86; // Snow codes

  // Precipitation is the #1 dealbreaker
  if (hasPrecipitation) {
    const precipitationType = isSnow ? 'havazik' : 'esik';
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

    return data.results.map((result: any) => ({
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
  } catch (error) {
    console.error('Error searching Hungarian cities:', error);
    return [];
  }
};
