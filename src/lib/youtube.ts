import {
  fetchVideos,
  fetchChannelInfo,
  getInitialVideos,
  CHANNELS as SERVICE_CHANNELS,
  YouTubeVideo,
  YouTubeChannel
} from '@/services/youtubeService';

export { getInitialVideos };

// Channel IDs
export const CHANNELS = {
  marmegint_jatszunk: {
    id: SERVICE_CHANNELS.MARMEGINT_JATSZUNK,
    name: 'Már megint játszunk?',
    tag: 'marmegint_jatszunk',
    slug: 'jatszunk',
  },
  marmegint: {
    id: SERVICE_CHANNELS.MARMEGINT,
    name: 'Már megint?',
    tag: 'marmegint',
    slug: 'marmegint',
  },
} as const;

// Manually configured playlist IDs (RSS can't discover playlists)
export const CONFIGURED_PLAYLISTS: Record<ChannelTag, string[]> = {
  marmegint_jatszunk: [
    // Add playlist IDs here, e.g.: 'PLxxxxxxxxxxxxxxxx'
  ],
  marmegint: [
    // Add playlist IDs here
  ],
};

export type ChannelKey = keyof typeof CHANNELS;
export type ChannelTag = typeof CHANNELS[ChannelKey]['tag'];

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
}

// Fetch videos using Invidious API with CORS proxy
export const fetchRSSVideos = async (channelId: string): Promise<YouTubeVideo[]> => {
  return await fetchVideos(channelId);
};

// Fetch channel information
export const fetchChannelIcon = async (channelId: string): Promise<YouTubeChannel | null> => {
  return await fetchChannelInfo(channelId);
};

// Fetch playlist videos (placeholder - Invidious doesn't have direct playlist support)
export const fetchRSSPlaylistVideos = async (playlistId: string): Promise<YouTubeVideo[]> => {
  console.warn('Playlist fetching not implemented - Invidious API has limited playlist support');
  return [];
};
