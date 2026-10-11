import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
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

const STALE_TIME = 10 * 60 * 1000; // 10 minutes cache freshness
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes background poll to avoid rate limiting

export const useYouTubeVideos = (channelTag: ChannelTag) => {
  const channel = Object.values(CHANNELS).find(c => c.tag === channelTag);
  const [seenVideoIds, setSeenVideoIds] = useState<Set<string>>(new Set());
  const [hasNewVideos, setHasNewVideos] = useState(false);

  const query = useQuery<YouTubeVideo[]>({
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
    initialData: () => (channel ? getInitialVideos(channel.id) : []),
    staleTime: STALE_TIME,
    refetchInterval: REFRESH_INTERVAL,
    refetchOnWindowFocus: false,
  });

  // Track new videos
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      const currentIds = new Set(query.data.map(v => v.id));
      
      if (seenVideoIds.size > 0) {
        const newVideos = query.data.filter(v => !seenVideoIds.has(v.id));
        if (newVideos.length > 0) {
          setHasNewVideos(true);
        }
      }
      
      // Update seen videos on initial load
      if (seenVideoIds.size === 0) {
        setSeenVideoIds(currentIds);
      }
    }
  }, [query.data, seenVideoIds]);

  const markVideosAsSeen = useCallback(() => {
    if (query.data) {
      setSeenVideoIds(new Set(query.data.map(v => v.id)));
      setHasNewVideos(false);
    }
  }, [query.data]);

  return {
    ...query,
    hasNewVideos,
    markVideosAsSeen,
  };
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
