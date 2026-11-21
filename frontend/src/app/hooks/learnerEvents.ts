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

/** Sends app_open once per browser session per learner, not on every render or poll. */
export function sendAppOpenOnce(token: string, userId: number, storage: Storage = sessionStorage, send: Send = fetch) {
  const key = `readlr_app_open_${userId}`;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
  } catch { /* Without session storage it still sends; the caller reruns only when the learner or token changes. */ }
  sendLearnerEvent(token, "app_open", undefined, send);
  return true;
}
