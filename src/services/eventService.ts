import { supabase } from '@/integrations/supabase/client';
import { SkatemapEvent, CreateEventInput, UpdateEventInput } from '@/types/event';

const LOCAL_STORAGE_EVENTS_KEY = 'gyor_skatemap_events';

// No mock seed events: only genuine events created by admins should appear
const SEED_EVENTS: SkatemapEvent[] = [];

const getLocalEvents = (): SkatemapEvent[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    // Filter out any legacy 'seed-event-spring-jam' that might already be cached in localStorage
    return Array.isArray(parsed)
      ? (parsed.filter((e: any) => e.id !== 'seed-event-spring-jam') as SkatemapEvent[])
      : [];
  } catch (e) {
    console.error('Error reading localStorage events:', e);
    return [];
  }
};

const saveLocalEvents = (events: SkatemapEvent[]) => {
  try {
    // Ensure legacy seed is never persisted
    const filtered = events.filter((e) => e.id !== 'seed-event-spring-jam');
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error saving to localStorage events:', e);
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
 * Public: Fetch currently active scheduled events
 * (now BETWEEN start_at AND end_at, is_active = true)
 */
export const getActiveEvents = async (): Promise<SkatemapEvent[]> => {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('skatemap_events')
      .select('*')
      .eq('is_active', true)
      .lte('start_at', now)
      .gte('end_at', now)
      .order('start_at', { ascending: true });

    if (!error && data) {
      return data as SkatemapEvent[];
    }
    if (error) {
      console.warn('Supabase getActiveEvents notice (using local cache):', error.message);
    }
  } catch (err) {
    console.warn('Supabase getActiveEvents error (using local cache):', err);
  }

  // Local fallback: filter local events by timeframe and is_active
  const local = getLocalEvents();
  const nowDate = new Date();
  return local.filter((evt) => {
    if (!evt.is_active) return false;
    const start = new Date(evt.start_at);
    const end = new Date(evt.end_at);
    return nowDate >= start && nowDate <= end;
  });
};

/**
 * Admin: Fetch all events regardless of schedule/status
 */
export const getAllEvents = async (): Promise<SkatemapEvent[]> => {
  try {
    const { data, error } = await supabase
      .from('skatemap_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as SkatemapEvent[];
    }
    if (error) {
      console.warn('Supabase getAllEvents notice (using local cache):', error.message);
    }
  } catch (err) {
    console.warn('Supabase getAllEvents error (using local cache):', err);
  }

  return getLocalEvents();
};

/**
 * Admin: Create a new event
 */
export const createEvent = async (
  input: CreateEventInput
): Promise<{ event: SkatemapEvent; isCloud: boolean; error?: string }> => {
  const id = generateUUID();
  const now = new Date().toISOString();

  const newEvent: SkatemapEvent = {
    id,
    title: input.title.trim(),
    message: input.message.trim(),
    icon: input.icon?.trim() || '🏆',
    link_url: input.link_url?.trim() || undefined,
    link_text: input.link_text?.trim() || undefined,
    start_at: input.start_at,
    end_at: input.end_at,
    is_active: input.is_active ?? true,
    created_at: now,
  };

  let isCloud = false;
  let cloudError: string | undefined = undefined;

  try {
    const { error } = await supabase.from('skatemap_events').insert([newEvent]);
    if (error) {
      console.warn('Supabase createEvent notice, saving locally:', error.message);
      cloudError = error.message;
    } else {
      isCloud = true;
    }
  } catch (err: any) {
    console.warn('Supabase createEvent error, saving locally:', err);
    cloudError = err?.message;
  }

  // Always update local cache
  const local = getLocalEvents();
  saveLocalEvents([newEvent, ...local]);

  return { event: newEvent, isCloud, error: cloudError };
};

/**
 * Admin: Update an existing event
 */
export const updateEvent = async (
  id: string,
  updates: UpdateEventInput
): Promise<{ success: boolean; isCloud: boolean; error?: string }> => {
  let isCloud = false;
  let cloudError: string | undefined = undefined;

  try {
    const { error } = await supabase
      .from('skatemap_events')
      .update(updates)
      .eq('id', id);

    if (!error) {
      isCloud = true;
    } else {
      console.warn('Supabase updateEvent notice:', error.message);
      cloudError = error.message;
    }
  } catch (err: any) {
    console.warn('Supabase updateEvent error:', err);
    cloudError = err?.message;
  }

  // Always update local cache
  const local = getLocalEvents();
  const updated = local.map((evt) => (evt.id === id ? { ...evt, ...updates } : evt));
  saveLocalEvents(updated);

  return { success: true, isCloud, error: cloudError };
};

/**
 * Admin: Toggle is_active status of an event
 */
export const toggleEventActive = async (
  id: string,
  isActive: boolean
): Promise<{ success: boolean; isCloud: boolean; error?: string }> => {
  return updateEvent(id, { is_active: isActive });
};

/**
 * Admin: Delete an event permanently
 */
export const deleteEvent = async (
  id: string
): Promise<{ success: boolean; isCloud: boolean; error?: string }> => {
  let isCloud = false;
  let cloudError: string | undefined = undefined;

  try {
    const { error } = await supabase.from('skatemap_events').delete().eq('id', id);
    if (!error) {
      isCloud = true;
    } else {
      console.warn('Supabase deleteEvent notice:', error.message);
      cloudError = error.message;
    }
  } catch (err: any) {
    console.warn('Supabase deleteEvent error:', err);
    cloudError = err?.message;
  }

  // Always update local cache
  const local = getLocalEvents();
  const filtered = local.filter((evt) => evt.id !== id);
  saveLocalEvents(filtered);

  return { success: true, isCloud, error: cloudError };
};

/**
 * Check if the skatemap_events table exists in Supabase
 */
export const checkEventTableStatus = async (): Promise<{ exists: boolean; message?: string }> => {
  try {
    const { error } = await supabase.from('skatemap_events').select('id').limit(1);
    if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
      return { exists: false, message: 'A skatemap_events tábla még nem létezik a Supabase-ben.' };
    }
    if (error) {
      return { exists: false, message: error.message };
    }
    return { exists: true };
  } catch (e: any) {
    return { exists: false, message: e?.message };
  }
};
