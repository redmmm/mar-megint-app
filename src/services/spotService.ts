import { supabase } from '@/integrations/supabase/client';
import { Spot, CreateSpotInput, UpdateSpotInput } from '@/types/spot';
import { compressImage, compressImageToBase64 } from '@/utils/imageCompressor';

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
 * Upload an image file:
 * Automatically compresses to modern .webp format (max 1600px, 0.8 quality).
 * Attempts Supabase Storage upload first ('spot-images' bucket).
 * Falls back to compressed Base64 if storage is unavailable.
 */
export const uploadSpotImage = async (file: File, bucketName = 'spot-images'): Promise<string> => {
  // Validate MIME type / extension
  const isImage = file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(file.name);
  if (!isImage) {
    throw new Error('Csak képfájlok (JPG, PNG, WebP, HEIC) tölthetők fel!');
  }

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB initial buffer before compression
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('A fájl mérete meghaladja a megengedett 15 MB-os határt!');
  }

  // 1. Client-side compression to WebP (<= 1600px, 80% quality)
  const compressedFile = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.8,
    targetFormat: 'image/webp',
  });

  const fileName = `spots/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;

  if (supabase) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, compressedFile, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp',
        });

      if (!uploadError) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      } else {
        console.warn('Supabase storage upload error, using fallback:', uploadError.message);
      }
    } catch (err) {
      console.warn('Supabase storage upload failed or not configured, using compressed Base64 fallback:', err);
    }
  }

  // Fallback to compressed base64
  return await compressImageToBase64(compressedFile);
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

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
      const newId = generateUUID();

      // Note: Do not use .select() here because anonymous users cannot SELECT pending spots under RLS.
      const { error } = await supabase
        .from('spots')
        .insert([
          {
            id: newId,
            title: spot.title,
            description: spot.description,
            spot_type: spot.spot_type || 'street_spot',
            features: spot.features || [],
            latitude: spot.latitude,
            longitude: spot.longitude,
            images: spot.images || [],
            status: statusToInsert,
          },
        ]);

      if (!error) {
        syncedCount++;
        // Update local spot ID to the Supabase UUID
        const currentLocal = getLocalSpots();
        const updated = currentLocal.map((s) => (s.id === spot.id ? { ...s, id: newId } : s));
        saveLocalSpots(updated);
      } else {
        console.warn('Sync offline spot failed:', error.message);
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
      return local.filter((s) => s.status === status);
    }

    if (data) {
      const local = getLocalSpots();
      const localMap = new Map(local.map((s) => [s.id, s]));

      const mapped = data.map((item: any) => {
        const localSpot = localMap.get(item.id);
        const isReported = localSpot?.is_reported !== undefined
          ? Boolean(localSpot.is_reported)
          : Boolean(item.is_reported);
        const reportReason = localSpot?.is_reported !== undefined
          ? localSpot.report_reason
          : item.report_reason;
        const reportedAt = localSpot?.is_reported !== undefined
          ? localSpot.reported_at
          : item.reported_at;

        return {
          ...item,
          images: Array.isArray(item.images) ? item.images : [],
          features: Array.isArray(item.features) ? item.features : [],
          spot_type: item.spot_type || 'street_spot',
          is_reported: isReported,
          report_reason: reportReason,
          reported_at: reportedAt,
        };
      }) as Spot[];

      // If Supabase returned results, or if status is 'pending', use cloud data directly
      if (mapped.length > 0 || status === 'pending') {
        return mapped;
      }
    }

    // If Supabase table is empty for approved spots, return local seed spots
    const local = getLocalSpots();
    if (status === 'all') return local;
    return local.filter((s) => s.status === status);
  } catch (err) {
    console.error('getSpots error, using local fallback:', err);
    const local = getLocalSpots();
    if (status === 'all') return local;
    return local.filter((s) => s.status === status);
  }
};

/**
 * Anonymous spot submission (enforces status = 'pending')
 */
export const submitSpot = async (input: CreateSpotInput): Promise<Spot> => {
  const cleanTitle = input.title.trim();
  const cleanDesc = input.description?.trim() || '';

  if (!cleanTitle || cleanTitle.length > 100) {
    throw new Error('A spot címe kötelező és legfeljebb 100 karakter lehet!');
  }

  if (cleanDesc.length > 1000) {
    throw new Error('A leírás hossza legfeljebb 1000 karakter lehet!');
  }

  // Cap image count to 2
  const sanitizedImages = (input.images || []).slice(0, 2);
  const newSpotId = generateUUID();
  const now = new Date().toISOString();

  const newSpotPayload = {
    id: newSpotId,
    title: cleanTitle,
    description: cleanDesc,
    spot_type: input.spot_type || 'street_spot',
    features: input.features || [],
    latitude: input.latitude,
    longitude: input.longitude,
    images: sanitizedImages,
    status: 'pending' as const,
    created_at: now,
    updated_at: now,
  };

  try {
    // Note: Do not use .select() here because anonymous users cannot SELECT pending spots under RLS.
    const { error } = await supabase
      .from('spots')
      .insert([newSpotPayload]);

    if (!error) {
      const created: Spot = {
        ...newSpotPayload,
      };
      // Keep local cache in sync
      const local = getLocalSpots();
      saveLocalSpots([created, ...local]);
      return created;
    }

    console.warn('Supabase insert failed, saving locally:', error.message);
  } catch (err) {
    console.warn('Supabase insert error, saving locally:', err);
  }

  // Local fallback if cloud insert fails (e.g. offline)
  const fallbackSpot: Spot = {
    ...newSpotPayload,
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

    if (!error) {
      success = true;
    } else {
      console.warn('Supabase approve error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase approve error:', err);
  }

  // Always update local cache
  const local = getLocalSpots();
  const updated = local.map((s) =>
    s.id === id ? { ...s, status: 'approved' as const, updated_at: new Date().toISOString() } : s
  );
  saveLocalSpots(updated);

  return success;
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

    if (!error) {
      success = true;
    } else {
      console.warn('Supabase update error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase update error:', err);
  }

  // Update local cache
  const local = getLocalSpots();
  const updated = local.map((s) => (s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s));
  saveLocalSpots(updated);

  return success;
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

    if (!error) {
      success = true;
    } else {
      console.warn('Supabase delete error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete error:', err);
  }

  // Update local cache
  const local = getLocalSpots();
  const filtered = local.filter((s) => s.id !== id);
  saveLocalSpots(filtered);

  return success;
};

/**
 * Anonymous spot report:
 * Calls the secure RPC 'report_spot' on Supabase if connected.
 * Prevents server overload and duplicate reports: if a spot is already reported,
 * it does NOT duplicate or overwrite the report, and returns alreadyReported = true.
 * Falls back to localStorage if offline/local dev.
 */
export const reportSpot = async (
  id: string,
  reason: string,
  spotData?: Partial<Spot>
): Promise<{ success: boolean; alreadyReported?: boolean; message?: string }> => {
  const trimmedReason = reason?.trim();
  if (!trimmedReason || trimmedReason.length < 5) {
    return { success: false, message: 'Az indoklásnak legalább 5 karakterből kell állnia!' };
  }

  // 1. Check local cache first for instant anti-spam & duplicate prevention
  const localSpots = getLocalSpots();
  const localSpot = localSpots.find((s) => s.id === id);
  if (localSpot && localSpot.is_reported) {
    return { success: true, alreadyReported: true };
  }

  // 2. Try Supabase RPC
  try {
    const { data, error } = await supabase.rpc('report_spot', {
      p_spot_id: id,
      p_reason: trimmedReason,
    });

    if (!error && data) {
      const res = data as { success: boolean; alreadyReported?: boolean; message?: string };
      // Keep local cache in sync
      if (res.success) {
        const now = new Date().toISOString();
        const exists = localSpots.some((s) => s.id === id);
        const updated = exists
          ? localSpots.map((s) =>
              s.id === id
                ? {
                    ...s,
                    is_reported: true,
                    report_reason: trimmedReason,
                    reported_at: s.reported_at || now,
                  }
                : s
            )
          : [
              {
                id,
                title: spotData?.title || 'Spot',
                description: spotData?.description || '',
                spot_type: spotData?.spot_type || 'street_spot',
                features: spotData?.features || [],
                latitude: spotData?.latitude || 47.6875,
                longitude: spotData?.longitude || 17.6504,
                images: spotData?.images || [],
                status: 'approved' as const,
                created_at: now,
                updated_at: now,
                is_reported: true,
                report_reason: trimmedReason,
                reported_at: now,
              },
              ...localSpots,
            ];
        saveLocalSpots(updated);
      }
      return res;
    }

    if (error) {
      console.warn('Supabase RPC report_spot notice (falling back to local):', error.message);
    }
  } catch (err) {
    console.warn('Supabase report_spot error, saving locally:', err);
  }

  // 3. Fallback: Save in localStorage (even if not previously in localStorage)
  const now = new Date().toISOString();
  let updatedSpots: Spot[];

  const exists = localSpots.some((s) => s.id === id);
  if (exists) {
    updatedSpots = localSpots.map((s) =>
      s.id === id
        ? {
            ...s,
            is_reported: true,
            report_reason: trimmedReason,
            reported_at: now,
          }
        : s
    );
  } else {
    // Spot was loaded from cloud, add to localSpots with report
    const newSpot: Spot = {
      id,
      title: spotData?.title || 'Spot',
      description: spotData?.description || '',
      spot_type: spotData?.spot_type || 'street_spot',
      features: spotData?.features || [],
      latitude: spotData?.latitude || 47.6875,
      longitude: spotData?.longitude || 17.6504,
      images: spotData?.images || [],
      status: 'approved',
      created_at: now,
      updated_at: now,
      is_reported: true,
      report_reason: trimmedReason,
      reported_at: now,
    };
    updatedSpots = [newSpot, ...localSpots];
  }

  saveLocalSpots(updatedSpots);

  // Also try direct Supabase update (in case columns exist but RPC doesn't)
  try {
    await supabase
      .from('spots')
      .update({
        is_reported: true,
        report_reason: trimmedReason,
        reported_at: now,
      })
      .eq('id', id);
  } catch (err) {
    // silent catch for local dev
  }

  return { success: true, alreadyReported: false };
};

/**
 * Admin: Dismiss a spot report (resolve or false alarm)
 */
export const dismissSpotReport = async (id: string): Promise<boolean> => {
  let success = false;
  try {
    const { error } = await supabase
      .from('spots')
      .update({
        is_reported: false,
        report_reason: null,
        reported_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      success = true;
    } else {
      console.warn('Supabase dismiss report error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase dismiss report error:', err);
  }

  // Always update local cache
  const local = getLocalSpots();
  const updated = local.map((s) =>
    s.id === id
      ? {
          ...s,
          is_reported: false,
          report_reason: undefined,
          reported_at: undefined,
          updated_at: new Date().toISOString(),
        }
      : s
  );
  saveLocalSpots(updated);

  return success;
};

/**
 * Böngészős kötegelt kép-optimalizáló meglévő régi képekhez (Admin eszköz)
 */
export const optimizeExistingSpotImages = async (
  onProgress?: (current: number, total: number, log: string) => void
): Promise<{ processed: number; total: number; bytesSaved: number }> => {
  if (!supabase) throw new Error('Supabase kliens nem elérhető!');

  const { data: spots, error } = await supabase.from('spots').select('*');
  if (error || !spots) throw new Error('Nem sikerült lekérni a spotokat: ' + (error?.message || 'Ismeretlen hiba'));

  let totalProcessed = 0;
  let totalBytesSaved = 0;
  const imagesToOptimize: { spotId: string; oldUrl: string; index: number; spotTitle: string }[] = [];

  // Kiszűrjük a nem-WebP képeket
  for (const spot of spots) {
    const imgs: string[] = Array.isArray(spot.images) ? spot.images : [];
    imgs.forEach((url, idx) => {
      if (
        typeof url === 'string' &&
        !url.endsWith('.webp') &&
        (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('spot-images'))
      ) {
        imagesToOptimize.push({
          spotId: spot.id,
          oldUrl: url,
          index: idx,
          spotTitle: spot.title || 'Névtelen spot',
        });
      }
    });
  }

  const total = imagesToOptimize.length;
  if (total === 0) {
    if (onProgress) onProgress(0, 0, 'Minden meglévő kép optimális WebP formátumban van!');
    return { processed: 0, total: 0, bytesSaved: 0 };
  }

  for (let i = 0; i < total; i++) {
    const item = imagesToOptimize[i];
    if (onProgress) onProgress(i + 1, total, `Kép letöltése és tömörítése (${i + 1}/${total}): [${item.spotTitle}]...`);

    try {
      const response = await fetch(item.oldUrl);
      if (!response.ok) {
        if (onProgress) onProgress(i + 1, total, `⚠️ Nem sikerült letölteni: ${item.oldUrl}`);
        continue;
      }

      const blob = await response.blob();
      const originalSize = blob.size;
      const file = new File([blob], 'legacy_image.jpg', { type: blob.type || 'image/jpeg' });

      // Tömörítés WebP-re (<= 1600px, 80% minőség)
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8, targetFormat: 'image/webp' });
      const newSize = compressed.size;
      const savedBytes = Math.max(0, originalSize - newSize);
      totalBytesSaved += savedBytes;

      // Új WebP feltöltése
      const newPath = `spots/opt-${Date.now()}-${i}.webp`;
      const { error: uploadErr } = await supabase.storage.from('spot-images').upload(newPath, compressed, {
        contentType: 'image/webp',
        cacheControl: '31536000',
      });

      if (!uploadErr) {
        const { data: publicData } = supabase.storage.from('spot-images').getPublicUrl(newPath);
        const newUrl = publicData.publicUrl;

        // Adatbázis frissítése
        const { data: currentSpot } = await supabase.from('spots').select('images').eq('id', item.spotId).single();
        if (currentSpot && Array.isArray(currentSpot.images)) {
          const updatedImages = [...currentSpot.images];
          updatedImages[item.index] = newUrl;
          await supabase.from('spots').update({ images: updatedImages }).eq('id', item.spotId);

          // Update local cache
          const local = getLocalSpots();
          const updatedLocal = local.map((s) => (s.id === item.spotId ? { ...s, images: updatedImages } : s));
          saveLocalSpots(updatedLocal);
        }

        // Régi fájl törlése a storage-ból ha Supabase storage URL volt
        const oldPathMatch = item.oldUrl.match(/spot-images\/(.+)$/);
        if (oldPathMatch && oldPathMatch[1]) {
          await supabase.storage.from('spot-images').remove([oldPathMatch[1]]);
        }

        totalProcessed++;
        if (onProgress) {
          onProgress(
            i + 1,
            total,
            `✅ Kész (${i + 1}/${total}): ${(originalSize / 1024).toFixed(0)} KB ➔ ${(newSize / 1024).toFixed(0)} KB (-${Math.round((savedBytes / originalSize) * 100)}%)`
          );
        }
      } else {
        console.warn('Feltöltési hiba optimalizáláskor:', uploadErr.message);
        if (onProgress) onProgress(i + 1, total, `❌ Feltöltési hiba: ${uploadErr.message}`);
      }
    } catch (err: unknown) {
      console.error(`Hiba a kép optimalizálásakor (${item.oldUrl}):`, err);
      const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
      if (onProgress) onProgress(i + 1, total, `❌ Hiba: ${message}`);
    }
  }

  const summary = `Kész! ${totalProcessed} kép optimalizálva. Megtakarítás: ${(totalBytesSaved / (1024 * 1024)).toFixed(2)} MB.`;
  if (onProgress) onProgress(total, total, summary);
  return { processed: totalProcessed, total, bytesSaved: totalBytesSaved };
};

export const spotService = {
  uploadSpotImage,
  submitSpot,
  getSpots,
  approveSpot,
  updateSpot,
  deleteSpot,
  reportSpot,
  dismissSpotReport,
  syncLocalSpotsToSupabase,
  optimizeExistingSpotImages,
};

