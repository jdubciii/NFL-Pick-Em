/**
 * Scoped Express API Client & Fetch Interceptor
 * 
 * Compliant with:
 * - P41-CLIENT-BOOTSTRAP-AND-HTTPS-DISPOSITION-2026-10-16-02
 * - Decision #54 (No Writes on GET)
 * - Decision #55 (Fail-Closed Security)
 * - Decision #61 (Modular Client Boundary Isolation)
 */

declare const process: any;

export const LEGACY_BOOTSTRAP_USER_ID = '4cbde3a9-6f8f-44cf-80fa-3c16c03810db';
export const LEGACY_BOOTSTRAP_POOL_ID = '0f497f1b-9002-49bd-ad2a-68ae34cb8afd';

/**
 * Validates and normalizes the Express API base origin.
 * In production:
 * - Strictly requires a valid HTTPS origin (e.g., https://nfl-pick-em-api.onrender.com).
 * - Forbids HTTP, LAN IP (192.168.*), loopback (localhost/127.0.0.1), or storage-based fallback.
 */
export function normalizeApiOrigin(rawUrl?: string, isProd?: boolean): string {
  const prod = isProd ?? (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV === 'production' : false));
  const target = rawUrl !== undefined 
    ? rawUrl 
    : (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : (typeof process !== 'undefined' && process.env ? process.env.VITE_API_URL : undefined));

  if (prod) {
    if (!target || typeof target !== 'string' || !target.trim()) {
      throw new Error('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION: VITE_API_URL is missing');
    }
    const trimmed = target.trim();
    if (!trimmed.startsWith('https://')) {
      throw new Error(`APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION: Non-HTTPS origin rejected (${trimmed})`);
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') {
        throw new Error('APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION');
      }
      return parsed.origin;
    } catch {
      throw new Error(`APPROVED_HTTPS_API_REQUIRED_IN_PRODUCTION: Malformed origin (${trimmed})`);
    }
  }

  // Non-production (development/test) fallback
  if (target && typeof target === 'string' && target.trim()) {
    try {
      const parsed = new URL(target.trim());
      return parsed.origin;
    } catch {
      return target.trim().replace(/\/+$/, '');
    }
  }

  return '';
}

/**
 * Determines whether a given request URL belongs to the scoped Express API boundary.
 * Excludes:
 * - Supabase Auth & Storage (supabase.co)
 * - External feeds (ESPN, CDN, external APIs)
 * - Static frontend assets (.js, .css, .html, .png, /assets/*)
 */
export function isScopedExpressApi(url: string, apiOrigin: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Supabase or external domains are never scoped Express API calls
  if (url.includes('.supabase.co') || url.includes('api.espn.com') || url.startsWith('blob:') || url.startsWith('data:')) {
    return false;
  }

  // Relative API routes
  if (url.startsWith('/api/') || url === '/api' || url.startsWith('api/')) {
    return true;
  }

  // Absolute URLs matching the configured API origin
  if (apiOrigin) {
    try {
      const parsed = new URL(url);
      const parsedOrigin = new URL(apiOrigin).origin;
      if (parsed.origin === parsedOrigin && (parsed.pathname.startsWith('/api') || parsed.pathname === '/api')) {
        return true;
      }
    } catch {
      // Relative or non-standard URL
      if (url.startsWith(`${apiOrigin}/api`) || url.startsWith(`${apiOrigin}api`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves an Express API route to the approved base origin.
 */
export function resolveExpressUrl(inputUrl: string, apiOrigin: string): string {
  if (!isScopedExpressApi(inputUrl, apiOrigin)) {
    return inputUrl;
  }

  if (inputUrl.startsWith('http://') || inputUrl.startsWith('https://')) {
    return inputUrl;
  }

  const cleanOrigin = apiOrigin.replace(/\/+$/, '');
  const cleanPath = inputUrl.startsWith('/') ? inputUrl : `/${inputUrl}`;
  return cleanOrigin ? `${cleanOrigin}${cleanPath}` : cleanPath;
}

/**
 * Resolves the active authenticated session token strictly from legitimate storage.
 * Does NOT return any hardcoded or synthetic fallback.
 */
export function getMemberSessionToken(storage?: Storage): string | null {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return null;
  return store.getItem('nfl_pickem_jwt_token') || store.getItem('token') || null;
}

/**
 * Cleans legacy hardcoded bootstrap entries from localStorage without clearing legitimate sessions.
 */
export function cleanLegacyBootstrapStorage(storage?: Storage): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  try {
    const rawUser = store.getItem('auth_user') || store.getItem('nfl_pickem_user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed?.id === LEGACY_BOOTSTRAP_USER_ID) {
          store.removeItem('auth_user');
          store.removeItem('nfl_pickem_user');
        }
      } catch {
        // Ignored
      }
    }

    const currentPool = store.getItem('pool_id') || store.getItem('nfl_pickem_pool_id');
    if (currentPool === LEGACY_BOOTSTRAP_POOL_ID) {
      store.removeItem('pool_id');
      store.removeItem('nfl_pickem_pool_id');
    }
  } catch {
    // Non-blocking cleanup
  }
}

export interface InterceptorOptions {
  originalFetch?: typeof fetch;
  storage?: Storage;
  apiOrigin?: string;
  isProd?: boolean;
}

/**
 * Creates an intercepted fetch implementation that strictly enforces:
 * - Scoped Express API URL resolution to approved HTTPS origin in production.
 * - Dynamic resolution of legitimate member Bearer authentication.
 * - Complete removal of automatic x-user-email, x-user-role, and x-pool-id header injections.
 * - Non-interference with Supabase Auth/Storage and external APIs.
 * - Full preservation of request semantics (method, body, headers, signal, credentials).
 */
export function createInterceptedFetch(options?: InterceptorOptions): typeof fetch {
  const baseFetch = options?.originalFetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  const store = options?.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  const isProd = options?.isProd;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    const apiOrigin = normalizeApiOrigin(options?.apiOrigin, isProd);

    // If request is OUTSIDE the Express API boundary, pass directly to baseFetch untouched
    if (!isScopedExpressApi(url, apiOrigin)) {
      return baseFetch(input, init);
    }

    // Resolve URL to approved API origin
    const resolvedUrl = resolveExpressUrl(url, apiOrigin);

    // Extract headers preserving existing caller-provided values
    let headers: Headers;
    if (init?.headers) {
      headers = new Headers(init.headers);
    } else if (input instanceof Request) {
      headers = new Headers(input.headers);
    } else {
      headers = new Headers();
    }

    // Resolve Express authentication from legitimate active member session
    const activeToken = getMemberSessionToken(store);
    const existingAuth = headers.get('Authorization');

    if (activeToken) {
      // If caller provided an Authorization that conflicts with the active session, enforce the active session
      if (existingAuth && !existingAuth.includes(activeToken)) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      } else if (!existingAuth) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
    } else {
      // No active session: if caller did not supply Authorization, do NOT attach anything
      // (ensures clean unauthenticated requests fail closed honestly)
    }

    // Explicitly guarantee NO development header injection
    // (Never set x-user-email, x-user-role, or x-pool-id automatically)

    // Construct request options preserving all caller semantics
    const modifiedInit: RequestInit = {
      ...(init || {}),
      headers,
    };

    if (input instanceof Request) {
      if (!modifiedInit.method) modifiedInit.method = input.method;
      if (!modifiedInit.signal && input.signal) modifiedInit.signal = input.signal;
      if (!modifiedInit.credentials && input.credentials) modifiedInit.credentials = input.credentials;
      if (!modifiedInit.mode && input.mode) modifiedInit.mode = input.mode;
      if (!modifiedInit.body && input.body) {
        modifiedInit.body = input.body;
        (modifiedInit as any).duplex = 'half';
      }

      return baseFetch(new Request(resolvedUrl, modifiedInit));
    }

    return baseFetch(resolvedUrl, modifiedInit);
  };
}

/**
 * Installs the global fetch interceptor onto window.fetch.
 */
export function installFetchInterceptor(options?: InterceptorOptions): void {
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch.bind(window);
    window.fetch = createInterceptedFetch({ originalFetch, ...options });
  }
}
