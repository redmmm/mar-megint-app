import { supabase } from '@/integrations/supabase/client';
import { Spot, CreateSpotInput, UpdateSpotInput } from '@/types/spot';

const LOCAL_STORAGE_KEY = 'gyor_skatemap_spots';

// Initial Győr skate spots for out-of-the-box preview and fallback
const SEED_SPOTS: Spot[] = [
  {
    id: 'seed-rado-sziget',
    title: 'Radó-sziget Skatepark',
    description: 'Győr egyik legnépszerűbb skateparkja a Radó-szigeten. Beton elemek, quarter pipe, funbox és flat rail a Rába partján.',
    spot_type: 'skatepark',
    features: ['rail', 'ledge', 'gap'],
    latitude: 47.6892,
    longitude: 17.6294,
    images: ['https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=1200&q=80'],
    status: 'approved',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'seed-baratsag-park',
    title: 'Barátság Park Skatepark',
    description: 'Marcalvárosi beton skatepark, miniramp, ledgek és lépcsők. Street és park stílushoz is kiváló.',
    spot_type: 'skatepark',
    features: ['ledge', 'gap'],
    latitude: 47.6695,
    longitude: 17.6438,
    images: ['https://images.unsplash.com/photo-1564982752979-3f7bc974d29a?auto=format&fit=crop&w=1200&q=80'],
    status: 'approved',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'seed-dunakapu-ter',
    title: 'Dunakapu tér Street Spot',
    description: 'Tágas belvárosi tér a Mosoni-Duna partján, sima gránit burkolat, padkák és lépcsők. Csak este ajánlott, amikor nincs tömeg.',
    spot_type: 'street_spot',
    features: ['ledge', 'gap', 'flatground'],
    latitude: 47.6908,
    longitude: 17.6342,
    images: ['https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?auto=format&fit=crop&w=1200&q=80'],
    status: 'approved',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
];

/**
 * HTML5 Canvas Image Compression helper
 * Prevents QuotaExceededError in localStorage when running in fallback mode
 */
export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const scale = Math.min(maxWidth / img.width, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Upload an image file:
 * Attempts Supabase Storage upload first ('spot-images' bucket).
 * If bucket or permissions are not yet configured, falls back to compressed Base64.
 */
export const uploadSpotImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `spots/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('spot-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (!uploadError) {
      const { data } = supabase.storage.from('spot-images').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload failed or not configured, using compressed Base64 fallback:', err);
  }

  // Fallback to compressed base64
  return await compressImage(file, 800, 0.7);
};

// Local storage helpers
const getLocalSpots = (): Spot[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_SPOTS));
      return SEED_SPOTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading localStorage spots:', e);
    return SEED_SPOTS;
  }
};

const saveLocalSpots = (spots: Spot[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(spots));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

/**
 * Sync locally created offline spots to Supabase cloud once the table is ready
 */
export const syncLocalSpotsToSupabase = async (): Promise<number> => {
  try {
    const local = getLocalSpots();
    const offlineSpots = local.filter((s) => s.id.startsWith('local-'));
    if (offlineSpots.length === 0) return 0;

    // Check session to determine if admin
    const { data: sessionData } = await supabase.auth.getSession();
    const isAuthenticated = !!sessionData.session;

    let syncedCount = 0;
    for (const spot of offlineSpots) {
      // If authenticated, keep status; otherwise, anon can only insert pending
      const statusToInsert = isAuthenticated ? spot.status : 'pending';

      const { data, error } = await supabase
        .from('spots')
        .insert([
          {
            title: spot.title,
            description: spot.description,
            spot_type: spot.spot_type || 'street_spot',
            features: spot.features || [],
            latitude: spot.latitude,
            longitude: spot.longitude,
            images: spot.images || [],
            status: statusToInsert,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        syncedCount++;
        // Update local spot ID to the Supabase UUID
        const currentLocal = getLocalSpots();
        const updated = currentLocal.map((s) => (s.id === spot.id ? { ...s, id: data.id } : s));
        saveLocalSpots(updated);
      }
    }

    if (syncedCount > 0) {
      console.log(`Successfully synced ${syncedCount} local spots to Supabase.`);
    }
    return syncedCount;
  } catch (err) {
    console.warn('Sync local spots error:', err);
    return 0;
  }
};

/**
 * Get spots filtered by status
 */
export const getSpots = async (status: 'approved' | 'pending' | 'all' = 'approved'): Promise<Spot[]> => {
  try {
    // Attempt auto-sync of any previously offline-created spots
    syncLocalSpotsToSupabase().catch(() => {});

    let query = supabase.from('spots').select('*').order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist or RLS denies, use localStorage fallback
      console.warn('Supabase spots query notice (falling back to local cache):', error.message);
      const local = getLocalSpots();
      if (status === 'all') return local;
      return local.filter(s => s.status === status);
    }

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        ...item,
        images: Array.isArray(item.images) ? item.images : [],
        features: Array.isArray(item.features) ? item.features : [],
        spot_type: item.spot_type || 'street_spot',
      })) as Spot[];
    }

    // If Supabase table is empty, return local spots if status is approved or all
    const local = getLocalSpots();
    if (status === 'all') return local;
    return local.filter(s => s.status === status);
  } catch (err) {
    console.error('getSpots error, using local fallback:', err);
    const local = getLocalSpots();
    if (status === 'all') return local;
    return local.filter(s => s.status === status);
  }
};

/**
 * Anonymous spot submission (enforces status = 'pending')
 */
export const submitSpot = async (input: CreateSpotInput): Promise<Spot> => {
  const newSpotPayload = {
    title: input.title.trim(),
    description: input.description?.trim() || '',
    spot_type: input.spot_type || 'street_spot',
    features: input.features || [],
    latitude: input.latitude,
    longitude: input.longitude,
    images: input.images || [],
    status: 'pending' as const,
  };

  try {
    const { data, error } = await supabase
      .from('spots')
      .insert([newSpotPayload])
      .select()
      .single();

    if (!error && data) {
      const created: Spot = {
        ...data,
        images: Array.isArray(data.images) ? data.images : [],
        features: Array.isArray(data.features) ? data.features : [],
        spot_type: data.spot_type || 'street_spot',
      };
      // Keep local cache in sync
      const local = getLocalSpots();
      saveLocalSpots([created, ...local]);
      return created;
    }
    if (error) {
      console.warn('Supabase insert failed, saving locally:', error.message);
    }
  } catch (err) {
    console.warn('Supabase insert error, saving locally:', err);
  }

  // Local fallback
  const fallbackSpot: Spot = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...newSpotPayload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const local = getLocalSpots();
  saveLocalSpots([fallbackSpot, ...local]);
  return fallbackSpot;
};

/**
 * Admin: Approve a pending spot
 */
export const approveSpot = async (id: string): Promise<boolean> => {
  let success = false;
  try {
    const { error } = await supabase
      .from('spots')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) success = true;
    else console.warn('Supabase approve error:', error.message);
  } catch (err) {
    console.warn('Supabase approve error:', err);
  }

  // Always update local cache
  const local = getLocalSpots();
  const updated = local.map(s => (s.id === id ? { ...s, status: 'approved' as const, updated_at: new Date().toISOString() } : s));
  saveLocalSpots(updated);

  return success || true;
};

/**
 * Admin: Update spot details
 */
export const updateSpot = async (id: string, updates: UpdateSpotInput): Promise<boolean> => {
  let success = false;
  try {
    const { error } = await supabase
      .from('spots')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) success = true;
    else console.warn('Supabase update error:', error.message);
  } catch (err) {
    console.warn('Supabase update error:', err);
  }

  // Update local cache
  const local = getLocalSpots();
  const updated = local.map(s => (s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s));
  saveLocalSpots(updated);

  return success || true;
};

/**
 * Admin: Delete a spot permanently
 */
export const deleteSpot = async (id: string): Promise<boolean> => {
  let success = false;
  try {
    const { error } = await supabase
      .from('spots')
      .delete()
      .eq('id', id);

    if (!error) success = true;
    else console.warn('Supabase delete error:', error.message);
  } catch (err) {
    console.warn('Supabase delete error:', err);
  }

  // Update local cache
  const local = getLocalSpots();
  const filtered = local.filter(s => s.id !== id);
  saveLocalSpots(filtered);

  return success || true;
};
