import { sendClaimRequest } from './archive-claims.js';

export const SESSION_IDLE_MS = 6 * 60 * 60 * 1000;
export const SESSION_STORAGE_KEY = 'pkp_session';
const HEARTBEAT_MS = 60000;
const identity = user => user?.sessionToken || user?.adminSessionToken || '';
export function readStoredSession(storage = localStorage, now = Date.now()) {
  try {
    const data = JSON.parse(storage.getItem(SESSION_STORAGE_KEY) || 'null');
    if (data && identity(data.user) && Number.isFinite(data.timestamp) && data.timestamp <= now && now - data.timestamp < SESSION_IDLE_MS) return data;
  } catch { /* Missing/malformed storage is not a valid session. */ }
  try { storage.removeItem(SESSION_STORAGE_KEY); } catch { /* Storage may be disabled by the browser. */ }
  return null;
}
export function sessionCredentials(user) {
  return user?.sessionToken ? { sessionToken: user.sessionToken } : { adminSessionToken: user?.adminSessionToken };
}
export function revokeSession(endpoint, user, request = sendClaimRequest) {
  if (!identity(user)) return Promise.resolve();
  return request(endpoint, { action: 'keluar_sesi', ...sessionCredentials(user) }).catch(() => {});
}

// Real input renews the inactivity clock. Merely displaying a tab, polling data,
// re-rendering React, or a timer/heartbeat never counts as new user activity.
export function startActivitySession({ user, endpoint, onExpire, storage = localStorage,
  win = window, doc = document, now = Date.now, request = sendClaimRequest,
  every = setInterval, clearEvery = clearInterval }) {
  const token = identity(user);
  let stopped = false, pending = false, lastSent = 0, lastAttempt = -Infinity;
  const initial = readStoredSession(storage, now());
  let lastActivity = initial?.timestamp || 0, lastStored = lastActivity;
  const stopSession = (reason, revoke = false) => {
    if (stopped) return;
    stopped = true;
    const saved = readStoredSession(storage, now());
    if (!saved || identity(saved.user) === token) storage.removeItem(SESSION_STORAGE_KEY);
    if (revoke) void revokeSession(endpoint, user, request);
    onExpire(reason);
  };
  const current = () => {
    if (stopped) return null;
    // Read without deleting: another tab may have logged into a different profile.
    let saved;
    try { saved = JSON.parse(storage.getItem(SESSION_STORAGE_KEY) || 'null'); } catch { return stopSession('invalid'); }
    if (!saved || identity(saved.user) !== token) return stopSession('changed');
    if (Number.isFinite(saved.timestamp) && saved.timestamp <= now()) lastActivity = Math.max(lastActivity, saved.timestamp);
    if (!token || !Number.isFinite(lastActivity) || now() < lastActivity || now() - lastActivity >= SESSION_IDLE_MS) return stopSession('idle', true);
    return saved;
  };
  const persist = () => {
    const saved = current();
    if (saved && lastActivity > lastStored) {
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...saved, timestamp: lastActivity }));
      lastStored = lastActivity;
    }
  };
  const sync = async (force = false) => {
    if (!current() || pending || lastActivity <= lastSent || (!force && now() - lastAttempt < HEARTBEAT_MS)) return;
    const activity = lastActivity;
    pending = true; lastAttempt = now();
    try {
      const response = await request(endpoint, { action: 'aktivitas_sesi', ...sessionCredentials(user), activityAgeMs: Math.max(0, now() - activity) });
      if (!stopped && response.sessionVersion === 2) lastSent = activity;
    } catch (error) {
      if (!stopped && error.code === 'SESSION_EXPIRED') stopSession('server');
      // A network failure must not log out a still-active user; retry on next tick.
    } finally { pending = false; }
  };
  const activity = event => {
    if (!event.isTrusted || doc.visibilityState === 'hidden' || !current()) return;
    lastActivity = now();
    if (lastActivity - lastStored >= 1000) persist();
    void sync();
  };
  const tick = () => { if (current()) { persist(); void sync(); } };
  const visibility = () => { if (current()) { persist(); void sync(true); } };
  const expired = event => { if (identity(event.detail) === token) stopSession('server'); };
  const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
  events.forEach(name => win.addEventListener(name, activity, { passive: true, capture: true }));
  win.addEventListener('storage', tick);
  win.addEventListener('pageshow', tick);
  win.addEventListener('pagehide', visibility);
  win.addEventListener('pkp-session-expired', expired);
  doc.addEventListener('visibilitychange', visibility);
  const timer = every(tick, 15000);
  // A restored local session is checked without extending beyond its last input.
  tick();
  return () => {
    stopped = true;
    clearEvery(timer);
    events.forEach(name => win.removeEventListener(name, activity, true));
    win.removeEventListener('storage', tick); win.removeEventListener('pageshow', tick);
    win.removeEventListener('pagehide', visibility); win.removeEventListener('pkp-session-expired', expired);
    doc.removeEventListener('visibilitychange', visibility);
  };
}
