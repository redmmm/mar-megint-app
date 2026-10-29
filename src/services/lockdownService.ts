import { supabase } from '@/integrations/supabase/client';

// ─── Lockdown Configuration ─────────────────────────────────────────────────
// If more than MAX_SPOTS_IN_WINDOW spots are submitted within TIME_WINDOW_MS,
// the system auto-triggers lockdown for AUTO_LOCKDOWN_DURATION_MS.
const MAX_SPOTS_IN_WINDOW = 10;        // Threshold: 10 new spots...
const TIME_WINDOW_MS = 2 * 60 * 1000;  // ...within a 2-minute window
const AUTO_LOCKDOWN_DURATION_MS = 15 * 60 * 1000; // Auto-lockdown lasts 15 minutes

// localStorage keys
const LOCKDOWN_KEY = 'gyor_skatemap_lockdown';
const LOCKDOWN_UNTIL_KEY = 'gyor_skatemap_lockdown_until';
const SUBMISSION_LOG_KEY = 'gyor_skatemap_submission_log';

// Supabase "site_settings" table key
const SUPABASE_LOCKDOWN_SETTING = 'spot_submission_lockdown';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LockdownStatus {
  isLocked: boolean;
  isAutoLocked: boolean;
  isManualLocked: boolean;
  lockedUntil: string | null; // ISO string for auto-lockdown expiry
}

// ─── Submission Burst Tracker ───────────────────────────────────────────────

/** Record a new submission timestamp for burst detection */
export const recordSubmission = (): void => {
  try {
    const raw = localStorage.getItem(SUBMISSION_LOG_KEY);
    const log: number[] = raw ? JSON.parse(raw) : [];
    log.push(Date.now());

    // Only keep entries within the detection window
    const cutoff = Date.now() - TIME_WINDOW_MS;
    const trimmed = log.filter((ts) => ts >= cutoff);
    localStorage.setItem(SUBMISSION_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Silent — burst detection is best-effort
  }
};

/** Check if the recent submission rate exceeds the threshold */
export const isSubmissionBurstDetected = (): boolean => {
  try {
    const raw = localStorage.getItem(SUBMISSION_LOG_KEY);
    if (!raw) return false;
    const log: number[] = JSON.parse(raw);

    const cutoff = Date.now() - TIME_WINDOW_MS;
    const recentCount = log.filter((ts) => ts >= cutoff).length;
    return recentCount >= MAX_SPOTS_IN_WINDOW;
  } catch {
    return false;
  }
};

/** Trigger automatic lockdown when burst is detected */
export const triggerAutoLockdown = (): void => {
  const until = new Date(Date.now() + AUTO_LOCKDOWN_DURATION_MS).toISOString();
  localStorage.setItem(LOCKDOWN_KEY, 'auto');
  localStorage.setItem(LOCKDOWN_UNTIL_KEY, until);
  console.warn(`[Lockdown] Auto-lockdown triggered until ${until}`);
};

/**
 * Check if an irregular amount of spots was added in Supabase cloud or locally.
 * Detects multi-client flood / bot attacks across different sessions.
 */
export const checkGlobalBurstDetection = async (): Promise<boolean> => {
  // 1. Check local client burst
  if (isSubmissionBurstDetected()) {
    triggerAutoLockdown();
    return true;
  }

  // 2. Query cloud database for spots created across all clients in the time window
  try {
    const cutoff = new Date(Date.now() - TIME_WINDOW_MS).toISOString();
    const { count, error } = await supabase
      .from('spots')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff);

    if (!error && typeof count === 'number' && count >= MAX_SPOTS_IN_WINDOW) {
      console.warn(`[Lockdown] Global cloud burst detected: ${count} spots in the last ${TIME_WINDOW_MS / 60000} mins!`);
      triggerAutoLockdown();
      return true;
    }
  } catch {
    // Cloud query error or offline fallback - ignore
  }

  return false;
};

// ─── Lockdown Status Queries ────────────────────────────────────────────────

/** Get local lockdown status (localStorage-based, instant) */
const getLocalLockdownStatus = (): { isLocked: boolean; isAuto: boolean; until: string | null } => {
  try {
    const value = localStorage.getItem(LOCKDOWN_KEY);
    if (!value) return { isLocked: false, isAuto: false, until: null };

    if (value === 'manual') {
      return { isLocked: true, isAuto: false, until: null };
    }

    if (value === 'auto') {
      const untilStr = localStorage.getItem(LOCKDOWN_UNTIL_KEY);
      if (untilStr) {
        const untilDate = new Date(untilStr);
        if (Date.now() < untilDate.getTime()) {
          return { isLocked: true, isAuto: true, until: untilStr };
        }
        // Auto-lockdown expired — clear it
        localStorage.removeItem(LOCKDOWN_KEY);
        localStorage.removeItem(LOCKDOWN_UNTIL_KEY);
      }
    }

    return { isLocked: false, isAuto: false, until: null };
  } catch {
    return { isLocked: false, isAuto: false, until: null };
  }
};

/**
 * Check if spot submissions are currently locked.
 * Checks both Supabase (admin manual toggle) and localStorage (auto-detection).
 */
export const getLockdownStatus = async (): Promise<LockdownStatus> => {
  // 1. Check local auto-lockdown first (instant)
  let local = getLocalLockdownStatus();

  // 2. If not locked locally, run burst detection
  if (!local.isLocked) {
    const burst = await checkGlobalBurstDetection();
    if (burst) {
      local = getLocalLockdownStatus();
    }
  }

  // 3. Try Supabase for admin-controlled manual lockdown
  let cloudManualLock = false;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SUPABASE_LOCKDOWN_SETTING)
      .maybeSingle();

    if (!error && data) {
      cloudManualLock = data.value === 'true' || data.value === true;
    }
  } catch {
    // Supabase not available or table doesn't exist — use local only
  }

  // If cloud says manual lock, sync to localStorage
  if (cloudManualLock) {
    localStorage.setItem(LOCKDOWN_KEY, 'manual');
  } else if (local.isLocked && !local.isAuto) {
    // Local says manual, but cloud says not locked — cloud overrides
    localStorage.removeItem(LOCKDOWN_KEY);
  }

  const isManualLocked = cloudManualLock;
  const isAutoLocked = local.isAuto && local.isLocked;

  return {
    isLocked: isManualLocked || isAutoLocked,
    isAutoLocked,
    isManualLocked,
    lockedUntil: isAutoLocked ? local.until : null,
  };
};

/**
 * Quick synchronous check for lockdown (localStorage only).
 * Use this when you need an instant answer without awaiting Supabase.
 */
export const isLockedDownSync = (): boolean => {
  return getLocalLockdownStatus().isLocked;
};

// ─── Admin Controls ─────────────────────────────────────────────────────────

/**
 * Admin: Toggle manual lockdown on/off.
 * Persists to both Supabase (site_settings table) and localStorage.
 */
export const setManualLockdown = async (locked: boolean): Promise<boolean> => {
  // Update localStorage immediately
  if (locked) {
    localStorage.setItem(LOCKDOWN_KEY, 'manual');
    localStorage.removeItem(LOCKDOWN_UNTIL_KEY);
  } else {
    localStorage.removeItem(LOCKDOWN_KEY);
    localStorage.removeItem(LOCKDOWN_UNTIL_KEY);
  }

  // Persist to Supabase
  try {
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key: SUPABASE_LOCKDOWN_SETTING,
          value: locked ? 'true' : 'false',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.warn('Supabase lockdown upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase lockdown save failed (offline?):', err);
    return false;
  }
};

/**
 * Admin: Clear auto-lockdown (reset burst detection and unlock).
 */
export const clearAutoLockdown = (): void => {
  const current = localStorage.getItem(LOCKDOWN_KEY);
  if (current === 'auto') {
    localStorage.removeItem(LOCKDOWN_KEY);
    localStorage.removeItem(LOCKDOWN_UNTIL_KEY);
  }
  localStorage.removeItem(SUBMISSION_LOG_KEY);
};

export const lockdownService = {
  getLockdownStatus,
  isLockedDownSync,
  setManualLockdown,
  clearAutoLockdown,
  recordSubmission,
  isSubmissionBurstDetected,
  checkGlobalBurstDetection,
  triggerAutoLockdown,
};
