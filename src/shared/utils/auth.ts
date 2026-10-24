// Access tokens live only in this module's memory. Refresh cookies are HttpOnly.
let accessToken: string | null = null;
let sessionId: string | null = null;
let generation = 0;
let legacyRemoved = false;
const listeners = new Set<() => void>();

export function removeLegacyAuthToken() {
  if (legacyRemoved) return;
  legacyRemoved = true;
  try { localStorage.removeItem("SMARTOFFER_AUTH_TOKEN"); } catch { /* Storage may be disabled. */ }
}

export function getAuthToken(): string | null { return accessToken; }
export function getAuthContextKey(): number { return generation; }

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setAuthToken(token: string, replacement = true) {
  // Used only to separate client work after another tab replaces the cookie.
  // Authorization always remains a backend decision.
  let nextSessionId: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.sid === "string") nextSessionId = payload.sid;
  } catch { /* An opaque/invalid token will be rejected by the backend. */ }
  const changedSession = sessionId !== null && nextSessionId !== sessionId;
  accessToken = token;
  sessionId = nextSessionId;
  if (replacement || changedSession) generation += 1;
  listeners.forEach(listener => listener());
}

export function clearAuthToken() {
  accessToken = null;
  sessionId = null;
  generation += 1;
  listeners.forEach(listener => listener());
}
