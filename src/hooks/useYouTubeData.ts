import { useQuery } from '@tanstack/react-query';
import {
  CHANNELS,
  CONFIGURED_PLAYLISTS,
  ChannelTag,
  YouTubeVideo,
  YouTubePlaylist,
  fetchRSSVideos,
  fetchRSSPlaylistVideos,
  getInitialVideos,
} from '@/lib/youtube';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes background poll to keep updated

export const useYouTubeVideos = (channelTag: ChannelTag) => {
  const channel = Object.values(CHANNELS).find(c => c.tag === channelTag);

  return useQuery<YouTubeVideo[]>({
    queryKey: ['youtube-videos', channelTag],
    queryFn: async () => {
      if (!channel) {
        console.warn(`Channel not found for tag: ${channelTag}`);
        return [];
      }

      try {
        const videos = await fetchRSSVideos(channel.id);
        if (videos && videos.length > 0) {
          return videos;
        }
        return getInitialVideos(channel.id);
      } catch (error) {
        console.error('Error fetching YouTube videos, using fallback:', error);
        return getInitialVideos(channel.id);
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });
};

export const useYouTubePlaylists = (channelTag: ChannelTag) => {
  const playlistIds = CONFIGURED_PLAYLISTS[channelTag] || [];

  return useQuery<YouTubePlaylist[]>({
    queryKey: ['youtube-playlists', channelTag],
    queryFn: async () => {
      // If no playlists configured, return empty array
      if (playlistIds.length === 0) {
        return [];
      }

      try {
        // Fetch all configured playlists
        const playlistPromises = playlistIds.map(async (id) => {
          try {
            const videos = await fetchRSSPlaylistVideos(id);
            if (videos.length > 0) {
              return {
                id,
                title: videos[0].channelTitle || 'Playlist',
                description: '',
                thumbnail: videos[0].thumbnail,
                itemCount: videos.length,
              };
            }
            return null;
          } catch {
            return null;
          }
        });

        const results = await Promise.all(playlistPromises);
        const validPlaylists = results.filter((p): p is YouTubePlaylist => p !== null);

        return validPlaylists;
      } catch (error) {
        console.error('Error fetching YouTube playlists:', error);
        return [];
      }
    },
    staleTime: REFRESH_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
  });
};
