import { supabase } from '@/integrations/supabase/client';
import { SkatemapEvent, CreateEventInput, UpdateEventInput } from '@/types/event';

const LOCAL_STORAGE_EVENTS_KEY = 'gyor_skatemap_events';

// Initial seed event for Győr skaters
const SEED_EVENTS: SkatemapEvent[] = [
  {
    id: 'seed-event-spring-jam',
    title: 'Győri Tavaszi Skate Jam',
    message: 'Találkozzunk a Radó-szigeten szombat délután 15:00-tól! Best trick contest, jó zene és hangulat vár mindenkire.',
    icon: '🏆',
    link_url: 'https://www.instagram.com',
    link_text: 'Részletek Instagramon',
    start_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    end_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const getLocalEvents = (): SkatemapEvent[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(SEED_EVENTS));
      return SEED_EVENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading localStorage events:', e);
    return SEED_EVENTS;
  }
};

const saveLocalEvents = (events: SkatemapEvent[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
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

    if (!error && data && data.length > 0) {
      return data as SkatemapEvent[];
    }
  } catch (err) {
    console.warn('Supabase getActiveEvents notice (using local cache):', err);
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
      // Merge with any local events that might not be in Supabase
      const local = getLocalEvents();
      const cloudIds = new Set(data.map((d) => d.id));
      const localOnly = local.filter((l) => !cloudIds.has(l.id));
      return [...(data as SkatemapEvent[]), ...localOnly];
    }
  } catch (err) {
    console.warn('Supabase getAllEvents notice (using local cache):', err);
  }

  return getLocalEvents();
};

/**
 * Admin: Create a new event
 */
export const createEvent = async (input: CreateEventInput): Promise<SkatemapEvent> => {
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

  try {
    const { error } = await supabase.from('skatemap_events').insert([newEvent]);
    if (error) {
      console.warn('Supabase createEvent notice, saving locally:', error.message);
    }
  } catch (err) {
    console.warn('Supabase createEvent error, saving locally:', err);
  }

  // Always update local cache
  const local = getLocalEvents();
  saveLocalEvents([newEvent, ...local]);

  return newEvent;
};

/**
 * Admin: Update an existing event
 */
export const updateEvent = async (id: string, updates: UpdateEventInput): Promise<boolean> => {
  let success = false;

  try {
    const { error } = await supabase
      .from('skatemap_events')
      .update(updates)
      .eq('id', id);

    if (!error) {
      success = true;
    } else {
      console.warn('Supabase updateEvent notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase updateEvent error:', err);
  }

  // Always update local cache
  const local = getLocalEvents();
  const updated = local.map((evt) => (evt.id === id ? { ...evt, ...updates } : evt));
  saveLocalEvents(updated);

  return success;
};

/**
 * Admin: Toggle is_active status of an event
 */
export const toggleEventActive = async (id: string, isActive: boolean): Promise<boolean> => {
  return updateEvent(id, { is_active: isActive });
};

/**
 * Admin: Delete an event permanently
 */
export const deleteEvent = async (id: string): Promise<boolean> => {
  let success = false;

  try {
    const { error } = await supabase.from('skatemap_events').delete().eq('id', id);
    if (!error) {
      success = true;
    } else {
      console.warn('Supabase deleteEvent notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase deleteEvent error:', err);
  }

  // Always update local cache
  const local = getLocalEvents();
  const filtered = local.filter((evt) => evt.id !== id);
  saveLocalEvents(filtered);

  return success;
};
