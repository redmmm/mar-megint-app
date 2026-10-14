// YouTube Service using multi-tier strategy: Local dev proxy, rss2json, localStorage cache, and fallback seed data
// Solves rate limiting and intermittent third-party proxy downtime

// Helper function to decode HTML entities in RSS feed titles safely without innerHTML
const decodeHtml = (html: string) => {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
};

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
}

export interface YouTubeChannel {
  id: string;
  name: string;
  thumbnail: string;
}

// rss2json API endpoint
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

// Channel configurations
export const CHANNELS = {
  MARMEGINT_JATSZUNK: 'UC3IL6CkeCRCmMRd6Pv5OSHg', // Már megint játszunk?
  MARMEGINT: 'UCu1XFNdEojohYh1J8iGRaLw'     // Már megint?
} as const;

// Channel profile picture URLs (hardcoded since RSS doesn't provide them)
const CHANNEL_ICONS: Record<string, string> = {
  'UC3IL6CkeCRCmMRd6Pv5OSHg': 'https://yt3.googleusercontent.com/ytc/AIdro_mK_l8Qj5vYt6oW5qF8z9x0=s176-c-k-c0x00ffffff-no-rj', // Már megint játszunk?
  'UCu1XFNdEojohYh1J8iGRaLw': 'https://yt3.googleusercontent.com/ytc/AIdro_n_AIdro_n_AIdro_n=s176-c-k-c0x00ffffff-no-rj'     // Már megint?
};

// Seed fallback data for when both network and localStorage are initially empty
export const FALLBACK_VIDEOS: Record<string, YouTubeVideo[]> = {
  // Már megint játszunk?
  'UC3IL6CkeCRCmMRd6Pv5OSHg': [
    {
      id: 'g02_e7IQXME',
      title: 'Felvittünk egy HULLÁT egy ÉPÍTKEZÉS TETEJÉRE 👷| Shady job',
      description: 'Fejest ugrottunk a Shady Job nevű kaotikus építkezős friendslop játékba. Egy maffiózó megfenyegetett minket...',
      thumbnail: 'https://i.ytimg.com/vi/g02_e7IQXME/hqdefault.jpg',
      publishedAt: '2026-10-13T14:30:24+00:00',
      channelTitle: 'Már megint játszunk?'
    },
    {
      id: 'swpPf8nzt6Q',
      title: 'MEGPRÓBÁLTUNK TÚLÉLNI egy ELÁTKOZOTT KÁRTYAJÁTÉKOT🃏 | The Cabin Game',
      description: 'Fejest ugrottunk a The Cabin Game nevű elátkozott kártyajátékba! Egy sötét erdei faházban próbáltunk túlélni...',
      thumbnail: 'https://i.ytimg.com/vi/swpPf8nzt6Q/hqdefault.jpg',
      publishedAt: '2026-10-06T14:30:27+00:00',
      channelTitle: 'Már megint játszunk?'
    },
    {
      id: '8STG-SrzMfg',
      title: 'KI TUD IJESZTŐBBET DOBNI?! 🎲 | Invokyr',
      description: 'Az Invokyr világa egyáltalán nem kímélt minket. Itt minden egyes kockadobás kemény pénzekbe került...',
      thumbnail: 'https://i.ytimg.com/vi/8STG-SrzMfg/hqdefault.jpg',
      publishedAt: '2026-09-29T14:30:33+00:00',
      channelTitle: 'Már megint játszunk?'
    },
    {
      id: 'dKHgCr-X4Pw',
      title: 'A VILÁG LEGROSSZABB ÉPÍTŐI LETTÜNK 👷| Dumb Ways To Build',
      description: 'Fejest ugrottunk a legkaotikusabb co-op építkezős játékba. Dumb Ways to Build világa semmihez sem fogható...',
      thumbnail: 'https://i.ytimg.com/vi/dKHgCr-X4Pw/hqdefault.jpg',
      publishedAt: '2026-09-22T14:30:07+00:00',
      channelTitle: 'Már megint játszunk?'
    },
    {
      id: 'yjpMNeA1Ox4',
      title: 'ÍGY lettünk CSÖVESEKBŐL PROFI HALÁSZOK 🐟 | How To Fish',
      description: 'Egy békés horgászatnak indult, de brutális túlélőharc lett a vége. Ebben a videóban a How To Fish kaotikus világába csöppentünk...',
      thumbnail: 'https://i.ytimg.com/vi/yjpMNeA1Ox4/hqdefault.jpg',
      publishedAt: '2026-09-15T14:30:32+00:00',
      channelTitle: 'Már megint játszunk?'
    },
    {
      id: '1tVCdYvOf8A',
      title: 'Ez volt a LEGFURCSÁBB LEVEL idáig?! 🟨🦈 | Escape The Backrooms 1.0 #4',
      description: 'Majdnem egy év várakozás után végre megérkezett az új Escape the Backrooms update...',
      thumbnail: 'https://i.ytimg.com/vi/1tVCdYvOf8A/hqdefault.jpg',
      publishedAt: '2026-09-08T14:30:29+00:00',
      channelTitle: 'Már megint játszunk?'
    }
  ],
  // Már megint?
  'UCu1XFNdEojohYh1J8iGRaLw': [
    {
      id: 'iNu4Z5Y-u9w',
      title: 'UTCAZENE fesztiválon voltunk VESZPRÉMBEN',
      description: 'Emberarcufenevad barátunk meghívott minket Veszprémbe az utcazene fesztiválra!',
      thumbnail: 'https://i.ytimg.com/vi/iNu4Z5Y-u9w/hqdefault.jpg',
      publishedAt: '2026-08-20T18:00:06+00:00',
      channelTitle: 'Már megint?'
    },
    {
      id: 'eEobwUHopng',
      title: '2026. augusztus 5.',
      description: '',
      thumbnail: 'https://i.ytimg.com/vi/eEobwUHopng/hqdefault.jpg',
      publishedAt: '2026-08-05T08:45:35+00:00',
      channelTitle: 'Már megint?'
    },
    {
      id: 'gAduyD1MoIc',
      title: 'Thommas b- Baker. #shelby #győr #marmegint #fyp #mixtape',
      description: '',
      thumbnail: 'https://i.ytimg.com/vi/gAduyD1MoIc/hqdefault.jpg',
      publishedAt: '2026-08-05T08:44:54+00:00',
      channelTitle: 'Már megint?'
    },
    {
      id: 'pmlidt6jSOg',
      title: 'Slipped. #győr #marmegint #fyp #mixtape #skate',
      description: '',
      thumbnail: 'https://i.ytimg.com/vi/pmlidt6jSOg/hqdefault.jpg',
      publishedAt: '2026-08-03T14:29:02+00:00',
      channelTitle: 'Már megint?'
    },
    {
      id: 'EGoNuOwEDn0',
      title: 'Truck megsemmisitve. #győr #marmegint #fyp #skate #mixtape',
      description: '',
      thumbnail: 'https://i.ytimg.com/vi/EGoNuOwEDn0/hqdefault.jpg',
      publishedAt: '2026-08-03T09:32:08+00:00',
      channelTitle: 'Már megint?'
    },
    {
      id: '57lK5R_yuSQ',
      title: 'Ráczovics with the steeeez #skate #győr #skateboarding #marmegint #mixtape',
      description: '',
      thumbnail: 'https://i.ytimg.com/vi/57lK5R_yuSQ/hqdefault.jpg',
      publishedAt: '2026-07-31T09:12:57+00:00',
      channelTitle: 'Már megint?'
    }
  ]
};

const CACHE_PREFIX = 'mma_yt_cache_v2_';
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache freshness

interface CachedVideoPayload {
  timestamp: number;
  videos: YouTubeVideo[];
}

/**
 * Retrieve cached videos from localStorage
 * @param maxAgeMs Maximum allowed age of cache in ms (default 5 min). Pass Infinity to accept any cached data.
 */
export const getCachedVideos = (channelId: string, maxAgeMs = CACHE_TTL_MS): YouTubeVideo[] | null => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${channelId}`);
    if (raw) {
      const parsed: CachedVideoPayload = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.videos) && parsed.videos.length > 0) {
        if (typeof parsed.timestamp === 'number') {
          const age = Date.now() - parsed.timestamp;
          if (age <= maxAgeMs) {
            return parsed.videos;
          }
        } else if (maxAgeMs === Infinity) {
          return parsed.videos;
        }
      }
    }

    // Check legacy v1 cache if allowed
    const legacyRaw = localStorage.getItem(`mma_yt_cache_${channelId}`);
    if (legacyRaw && maxAgeMs === Infinity) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        return legacyParsed;
      }
    }

    return null;
  } catch (err) {
    console.warn('Failed to parse cached YouTube videos:', err);
    return null;
  }
};

/**
 * Store fetched videos in localStorage with a timestamp
 */
export const setCachedVideos = (channelId: string, videos: YouTubeVideo[]): void => {
  try {
    if (videos && videos.length > 0) {
      const payload: CachedVideoPayload = {
        timestamp: Date.now(),
        videos,
      };
      localStorage.setItem(`${CACHE_PREFIX}${channelId}`, JSON.stringify(payload));
      // Remove deprecated cache key
      localStorage.removeItem(`mma_yt_cache_${channelId}`);
    }
  } catch (err) {
    console.warn('Failed to save YouTube videos to cache:', err);
  }
};

/**
 * Return initial videos from cache or seed data for instant, non-empty rendering
 */
export const getInitialVideos = (channelId: string): YouTubeVideo[] => {
  const cached = getCachedVideos(channelId, Infinity);
  if (cached && cached.length > 0) {
    return cached;
  }
  return FALLBACK_VIDEOS[channelId] || [];
};

/**
 * Parse YouTube Atom XML feed directly using DOMParser
 */
export const parseYouTubeXml = (xmlText: string): YouTubeVideo[] => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const entries = Array.from(doc.querySelectorAll('entry'));

    return entries.map((entry) => {
      const videoId =
        entry.getElementsByTagNameNS('*', 'videoId')[0]?.textContent ||
        entry.getElementsByTagName('yt:videoId')[0]?.textContent ||
        entry.getElementsByTagName('videoId')[0]?.textContent ||
        entry.getElementsByTagName('id')[0]?.textContent?.replace(/^yt:video:/, '') ||
        '';

      const title =
        entry.getElementsByTagName('title')[0]?.textContent ||
        entry.getElementsByTagNameNS('*', 'title')[0]?.textContent ||
        'Untitled Video';

      const published =
        entry.getElementsByTagName('published')[0]?.textContent ||
        entry.getElementsByTagNameNS('*', 'published')[0]?.textContent ||
        new Date().toISOString();

      const author =
        entry.getElementsByTagName('name')[0]?.textContent ||
        entry.getElementsByTagNameNS('*', 'name')[0]?.textContent ||
        'Unknown Channel';

      const description =
        entry.getElementsByTagNameNS('*', 'description')[0]?.textContent ||
        entry.getElementsByTagName('media:description')[0]?.textContent ||
        entry.getElementsByTagName('description')[0]?.textContent ||
        '';

      const cleanId = videoId.trim();

      return {
        id: cleanId,
        title: decodeHtml(title).trim(),
        description: description.trim(),
        thumbnail: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        publishedAt: published,
        channelTitle: decodeHtml(author).trim(),
      };
    }).filter((v) => Boolean(v.id));
  } catch (error) {
    console.error('Error parsing YouTube XML:', error);
    return [];
  }
};

/**
 * Fetch videos using Vite Dev Server Proxy (for localhost development)
 */
const fetchViaDevProxy = async (channelId: string): Promise<YouTubeVideo[] | null> => {
  try {
    const proxyUrl = `/api/youtube-feed?channel_id=${channelId}`;
    const response = await fetch(proxyUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: 'application/xml, text/xml',
      },
    });

    if (!response.ok) {
      return null;
    }

    const xmlText = await response.text();
    if (!xmlText || !xmlText.includes('<entry>')) {
      return null;
    }

    const parsed = parseYouTubeXml(xmlText);
    if (parsed.length > 0) {
      console.log(`[YouTube] Successfully fetched ${parsed.length} videos via Vite Dev Proxy.`);
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Fetch videos using public CORS proxies for direct official YouTube Atom feeds (for production)
 */
const fetchViaCorsProxy = async (channelId: string): Promise<YouTubeVideo[] | null> => {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const proxyEndpoints = [
    `https://cors-anywhere.fly.dev/${rssUrl}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
  ];

  for (const endpoint of proxyEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(6000),
        headers: {
          Accept: 'application/xml, text/xml, */*',
        },
      });

      if (!response.ok) {
        continue;
      }

      const xmlText = await response.text();
      if (!xmlText || !xmlText.includes('<entry>')) {
        continue;
      }

      const parsed = parseYouTubeXml(xmlText);
      if (parsed.length > 0) {
        console.log(`[YouTube] Successfully fetched ${parsed.length} videos via CORS Proxy.`);
        return parsed;
      }
    } catch {
      // Continue to next proxy candidate
    }
  }

  return null;
};

/**
 * Fetch videos using rss2json API (free online CORS converter)
 */
const fetchViaRss2Json = async (channelId: string): Promise<YouTubeVideo[] | null> => {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const apiUrl = `${RSS2JSON_API}?rss_url=${encodeURIComponent(rssUrl)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[YouTube] rss2json API HTTP status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.status !== 'ok' || !Array.isArray(data.items) || data.items.length === 0) {
      console.warn(`[YouTube] rss2json returned non-ok status or empty items:`, data.message || 'empty');
      return null;
    }

    const videos: YouTubeVideo[] = data.items.map((item: any) => {
      let videoId = '';
      if (item.guid) {
        const guidParts = item.guid.split(':');
        videoId = guidParts[guidParts.length - 1] || '';
      }

      if (!videoId && item.link) {
        const linkMatch = item.link.match(/[?&]v=([^&]+)/);
        if (linkMatch) {
          videoId = linkMatch[1];
        }
      }

      return {
        id: videoId.trim(),
        title: decodeHtml(item.title) || 'Untitled Video',
        description: item.description || '',
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId.trim()}/hqdefault.jpg`,
        publishedAt: item.pubDate || new Date().toISOString(),
        channelTitle: item.author || 'Unknown Channel',
      };
    }).filter((v: YouTubeVideo) => Boolean(v.id));

    if (videos.length > 0) {
      console.log(`[YouTube] Successfully fetched ${videos.length} videos via rss2json.`);
      return videos;
    }

    return null;
  } catch (error) {
    console.warn('[YouTube] Error in fetchViaRss2Json:', error);
    return null;
  }
};

/**
 * Multi-layer fetchVideos:
 * 1. Try local dev proxy (if on localhost / Vite dev server)
 * 2. Try direct CORS proxies (fetches official YouTube Atom XML feed with latest 15 videos)
 * 3. Try rss2json.com API
 * 4. Try local dev proxy fallback
 * 5. Fallback to localStorage cache
 * 6. Fallback to seed data
 *
 * Guarantees that valid videos are NEVER wiped out with an empty state and new videos are fetched immediately.
 */
export const fetchVideos = async (channelId: string): Promise<YouTubeVideo[]> => {
  // 1. Try Vite dev proxy first if in development mode
  if (import.meta.env.DEV) {
    const devVideos = await fetchViaDevProxy(channelId);
    if (devVideos && devVideos.length > 0) {
      setCachedVideos(channelId, devVideos);
      return devVideos;
    }
  }

  // 2. Try direct CORS proxies (fast, reliable Atom XML parsing from YouTube)
  const corsVideos = await fetchViaCorsProxy(channelId);
  if (corsVideos && corsVideos.length > 0) {
    setCachedVideos(channelId, corsVideos);
    return corsVideos;
  }

  // 3. Try rss2json API
  const rss2JsonVideos = await fetchViaRss2Json(channelId);
  if (rss2JsonVideos && rss2JsonVideos.length > 0) {
    setCachedVideos(channelId, rss2JsonVideos);
    return rss2JsonVideos;
  }

  // 4. If running in production but Vite dev proxy wasn't tried, attempt it as secondary fallback (e.g. if served locally or preview)
  if (!import.meta.env.DEV) {
    const devProxyFallback = await fetchViaDevProxy(channelId);
    if (devProxyFallback && devProxyFallback.length > 0) {
      setCachedVideos(channelId, devProxyFallback);
      return devProxyFallback;
    }
  }

  // 5. Network failed or offline: Fallback to persistent localStorage cache
  const cached = getCachedVideos(channelId, Infinity);
  if (cached && cached.length > 0) {
    console.info(`[YouTube] Network unavailable. Serving ${cached.length} videos from persistent cache.`);
    return cached;
  }

  // 6. If fresh visit and no cache exists: Fallback to seed videos
  const fallback = FALLBACK_VIDEOS[channelId] || [];
  console.info(`[YouTube] Network unavailable and no cache found. Serving ${fallback.length} fallback seed videos.`);
  return fallback;
};

/**
 * Fetch channel information with hardcoded profile pictures
 */
export const fetchChannelInfo = async (channelId: string): Promise<YouTubeChannel | null> => {
  const thumbnail = CHANNEL_ICONS[channelId];

  if (!thumbnail) {
    console.warn(`No profile picture available for channel: ${channelId}`);
    return null;
  }

  const channelNames: Record<string, string> = {
    'UC3IL6CkeCRCmMRd6Pv5OSHg': 'Már megint játszunk?',
    'UCu1XFNdEojohYh1J8iGRaLw': 'Már megint?'
  };

  const name = channelNames[channelId] || 'Unknown Channel';

  return {
    id: channelId,
    name: name,
    thumbnail: thumbnail
  };
};

/**
 * Legacy function name for backward compatibility
 * @deprecated Use fetchVideos instead
 */
export const fetchRSSVideos = fetchVideos;

/**
 * Legacy function name for backward compatibility
 * @deprecated Use fetchChannelInfo instead
 */
export const fetchChannelIcon = fetchChannelInfo;
