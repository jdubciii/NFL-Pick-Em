/**
 * Date and timezone formatting utilities for NFL matchups.
 * Formats game kickoffs in the user's local timezone (e.g. Arizona MST / America/Phoenix).
 */

export function formatGameKickoff(isoString: string): string {
  const date = new Date(isoString);
  const dayStr = date.toLocaleDateString(undefined, { weekday: 'short' });
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${dayStr} ${timeStr}`;
}

export function formatFullKickoff(isoString: string): string {
  const date = new Date(isoString);
  const dayMonth = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${dayMonth} at ${timeStr}`;
}

export function formatTimeOnly(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
