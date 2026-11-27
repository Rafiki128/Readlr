export const CLASSROOM_POLICY_GRACE_MS = 90_000;
export const PRESENCE_INTERVAL_MS = 60_000;

export function pollDelay(base: number, failures: number, random = Math.random()) {
  const interval = Math.min(60_000, base * 2 ** Math.min(failures, 3));
  return Math.round(interval * (0.85 + random * 0.3));
}

export function canUseLastPolicy(lastConfirmed: number | null, now: number, denied: boolean) {
  return !denied && lastConfirmed !== null && now - lastConfirmed < CLASSROOM_POLICY_GRACE_MS;
}
