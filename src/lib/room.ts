export function roomCodeFromUrl(): string {
  const url = new URL(window.location.href);
  const existing = url.searchParams.get("room");
  if (existing) return existing.toUpperCase();
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  url.searchParams.set("room", code);
  window.history.replaceState(null, "", url);
  return code;
}

export function shareLink(room: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("room", room);
  return url.toString();
}
