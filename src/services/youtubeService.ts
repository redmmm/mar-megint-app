// YouTube Service using rss2json for RSS feed parsing
// Converts YouTube RSS feeds to JSON without CORS issues

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

// Channel profile picture URLs (hardcoded since RSS doesn't provide them)
const CHANNEL_ICONS: Record<string, string> = {
  'UC3IL6CkeCRCmMRd6Pv5OSHg': 'https://yt3.googleusercontent.com/ytc/AIdro_mK_l8Qj5vYt6oW5qF8z9x0=s176-c-k-c0x00ffffff-no-rj', // Már megint játszunk?
  'UCu1XFNdEojohYh1J8iGRaLw': 'https://yt3.googleusercontent.com/ytc/AIdro_n_AIdro_n_AIdro_n=s176-c-k-c0x00ffffff-no-rj'     // Már megint?
};

// Channel configurations
export const CHANNELS = {
  MARMEGINT_JATSZUNK: 'UC3IL6CkeCRCmMRd6Pv5OSHg', // Már megint játszunk?
  MARMEGINT: 'UCu1XFNdEojohYh1J8iGRaLw'     // Már megint?
} as const;

/**
 * Fetch videos for a specific channel using rss2json API
 * Converts YouTube RSS feeds to JSON without CORS issues
 */
export const fetchVideos = async (channelId: string): Promise<YouTubeVideo[]> => {
  try {
    // Build YouTube RSS URL and rss2json API URL
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const apiUrl = `${RSS2JSON_API}?rss_url=${encodeURIComponent(rssUrl)}`;

    console.log(`Fetching videos via rss2json: ${rssUrl}`);

    // Fetch from rss2json API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`rss2json API failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    // Check API response status
    if (data.status !== 'ok') {
      console.error('rss2json API error:', data.message || 'Unknown error');
      return [];
    }

    // Map rss2json items to our Video interface
    const videos: YouTubeVideo[] = data.items.map((item: any) => {
      // Extract video ID from guid (format: yt:video:VIDEO_ID)
      let videoId = '';
      if (item.guid) {
        const guidParts = item.guid.split(':');
        videoId = guidParts[guidParts.length - 1] || '';
      }

      // Fallback: try to extract from link URL
      if (!videoId && item.link) {
        const linkMatch = item.link.match(/[?&]v=([^&]+)/);
        if (linkMatch) {
          videoId = linkMatch[1];
        }
      }

      return {
        id: videoId,
        title: decodeHtml(item.title) || 'Untitled Video',
        description: item.description || '',
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: item.pubDate || new Date().toISOString(),
        channelTitle: item.author || 'Unknown Channel'
      };
    });

    console.log(`Successfully fetched ${videos.length} videos for channel ${channelId} via rss2json`);
    return videos;

  } catch (error) {
    console.error('Error fetching videos via rss2json:', error);
    return [];
  }
};

/**
 * Fetch channel information with hardcoded profile pictures
 * RSS feeds don't provide profile pictures, so we use known URLs
 */
export const fetchChannelInfo = async (channelId: string): Promise<YouTubeChannel | null> => {
  // Get the hardcoded channel icon
  const thumbnail = CHANNEL_ICONS[channelId];

  if (!thumbnail) {
    console.warn(`No profile picture available for channel: ${channelId}`);
    return null;
  }

  // Return channel info with hardcoded data
  const channelNames: Record<string, string> = {
    'UC3IL6CkeCRCmMRd6Pv5OSHg': 'Már megint játszunk?',
    'UCu1XFNdEojohYh1J8iGRaLw': 'Már megint?'
  };

  const name = channelNames[channelId] || 'Unknown Channel';

  console.log(`Returning hardcoded channel info for ${channelId}: ${name}`);
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
