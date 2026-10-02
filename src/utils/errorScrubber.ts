/**
 * Error scrubber utility for background jobs and outbox events.
 * Strips URLs, tokens, passwords, and sensitive credentials.
 * Preserves key names (e.g. password=[REDACTED]).
 * Scrubs connection failures (e.g. ECONNREFUSED host:port).
 * Enforces a maximum length of 200 characters.
 */
export function scrubErrorMessage(error: unknown): string {
  if (!error) {
    return 'UNKNOWN_ERROR';
  }

  let message = typeof error === 'string' ? error : (error as any)?.message || String(error);

  // Strip database / connection URLs: postgresql://..., postgres://..., mongodb://..., etc.
  message = message.replace(/(?:postgresql|postgres|mysql|mongodb|redis|smtp|smtps|https?):\/\/[^\s"'<>]+/gi, '[REDACTED_URL]');

  // Strip credentials in query strings / key-value patterns while preserving key names: password=..., token=...
  message = message.replace(/(password|passwd|pwd|token|secret|api_?key|auth_?token|authorization)=[^&\s]+/gi, '$1=[REDACTED]');

  // Strip ECONNREFUSED host:port or IP:port patterns
  message = message.replace(/ECONNREFUSED\s+[^\s:]+:\d+/gi, 'ECONNREFUSED [REDACTED_HOST]:[REDACTED_PORT]');

  // Strip Bearer tokens and Basic auth headers
  message = message.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]');
  message = message.replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]');

  // Strip JWT tokens (eyJ...)
  message = message.replace(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[REDACTED_JWT]');

  // Clean excessive whitespace
  message = message.trim().replace(/\s+/g, ' ');

  // Truncate to maximum 200 characters
  if (message.length > 200) {
    message = message.substring(0, 197) + '...';
  }

  return message;
}
