/**
 * Date and timezone formatting utilities for NFL matchups.
 * Standardized on America/Phoenix per Arbiter directive (locks remain timestamp-based).
 */

export function formatGameKickoff(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'TBD';
  const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', weekday: 'short' }).format(date);
  const timeStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', hour: 'numeric', minute: '2-digit' }).format(date);
  return `${dayStr} ${timeStr}`;
}

export function formatFullKickoff(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'TBD';
  const dayMonth = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Phoenix',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Phoenix',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${dayMonth} at ${timeStr}`;
}

export function formatTimeOnly(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Phoenix',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
