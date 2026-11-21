const API = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
type Send = (url: string, init: RequestInit) => Promise<unknown>;

/** Fire-and-forget: offline or server errors are ignored so the app never waits on logging. */
export function sendLearnerEvent(token: string, eventType: "app_open" | "resume", detail?: { stage: number; completed: number }, send: Send = fetch) {
  try {
    void send(`${API}/learner/me/events`, {
      method: "POST", keepalive: true,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(detail ? { event_type: eventType, detail } : { event_type: eventType }),
    }).catch(() => {});
  } catch { /* Logging is optional. */ }
}

/** Calendar date in Asia/Manila as YYYY-MM-DD; en-CA formats dates in that order. */
export function manilaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// Used when session storage is blocked, so focus re-checks still send at most once per day.
const sentInMemory = new Map<string, string>();

/** Sends app_open once per browser session per learner per Manila day, so a tab left open overnight counts again. */
export function sendAppOpenOnce(token: string, userId: number, storage: Storage = sessionStorage, send: Send = fetch, now = new Date()) {
  const key = `readlr_app_open_${userId}`;
  const today = manilaDate(now);
  let sentOn: string | null;
  try { sentOn = storage.getItem(key); } catch { sentOn = sentInMemory.get(key) ?? null; }
  if (sentOn === today) return false;
  try { storage.setItem(key, today); } catch { sentInMemory.set(key, today); }
  sendLearnerEvent(token, "app_open", undefined, send);
  return true;
}
