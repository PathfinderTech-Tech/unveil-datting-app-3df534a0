/**
 * Tracks the most recently-opened conversation id in sessionStorage so
 * cross-tab navigations (e.g. Insights) can offer a one-tap return to it.
 * Falls back to /messages when no recent conversation exists.
 */
const KEY = "unveil:lastConversationId";

export function rememberConversation(id: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (id) sessionStorage.setItem(KEY, id);
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function getLastConversation(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
