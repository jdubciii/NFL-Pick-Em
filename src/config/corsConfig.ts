import { CorsOptions, CorsOptionsDelegate } from 'cors';

/**
 * Confirmed native Capacitor origins:
 * - http://localhost: Android WebView scheme (from client/capacitor.config.ts androidScheme: 'http')
 * iOS schemes (capacitor://localhost) are omitted as iOS is out of current deployment scope.
 */
export const CONFIRMED_CAPACITOR_ORIGINS: ReadonlySet<string> = new Set([
  'http://localhost',
]);

/**
 * Parses and strictly validates comma-separated allowed browser origins from configuration.
 * Principles enforced:
 * - No wildcard "*"
 * - No "null"
 * - Rejects malformed URLs
 * - Rejects entries containing URL paths, query strings, or fragments (violating origin contract)
 * - Normalizes valid origins (protocol + host/port)
 */
export function parseAllowedOrigins(raw?: string): Set<string> {
  const allowed = new Set<string>();
  if (!raw || typeof raw !== 'string') {
    return allowed;
  }

  const entries = raw.split(',');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed || trimmed === '*' || trimmed.toLowerCase() === 'null') {
      continue;
    }

    try {
      const parsed = new URL(trimmed);
      // Only permit standard web protocols http and https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        continue;
      }
      // Reject entries containing paths beyond root, query parameters, or hash fragments
      if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
        continue;
      }
      allowed.add(parsed.origin);
    } catch {
      // Malformed entry rejected; fail-closed
      continue;
    }
  }

  return allowed;
}

/**
 * Authoritative evaluation of a request Origin against approved allowlists.
 * - origin === undefined: Non-browser request or same-origin request without Origin header -> allowed
 * - origin === 'null': Disallowed (rejects sandboxed iframes or local file origins)
 * - non-production: Permits local dev origins
 * - production: Exact match against confirmed Capacitor origins OR configured browser allowlist
 */
export function isOriginAllowed(
  origin: string | undefined,
  isProduction: boolean,
  customAllowedOrigins: Set<string>
): boolean {
  if (!origin) {
    // Non-browser request or server-to-server health probe without Origin header
    return true;
  }

  if (origin === 'null') {
    return false;
  }

  if (!isProduction) {
    // In local development, accept localhost, 127.0.0.1, local LAN (192.168.*), or Capacitor schemes
    if (
      CONFIRMED_CAPACITOR_ORIGINS.has(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://192.168.') ||
      customAllowedOrigins.has(origin)
    ) {
      return true;
    }
    return false;
  }

  // Strict production: exact allowlist match only
  if (CONFIRMED_CAPACITOR_ORIGINS.has(origin)) {
    return true;
  }

  return customAllowedOrigins.has(origin);
}

/**
 * Creates Express CORS delegate enforcing strict production origin controls.
 * Per-request evaluation ensures changes in configuration or environment apply dynamically.
 */
export function createCorsOptions(): CorsOptionsDelegate {
  return (req, callback) => {
    const isProd = process.env.NODE_ENV === 'production';
    const customAllowed = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
    const requestOrigin = req.headers.origin as string | undefined;

    const allowed = isOriginAllowed(requestOrigin, isProd, customAllowed);

    const options: CorsOptions = {
      origin: allowed ? true : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: isProd
        ? ['Content-Type', 'Authorization']
        : ['Content-Type', 'Authorization', 'x-user-email', 'x-user-role', 'x-dev-user-email'],
    };

    callback(null, options);
  };
}
