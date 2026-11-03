import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { scopedExpressFetch } from '../lib/apiClient';

export interface PresentationFlags {
  f_sweat_radar: boolean;
  f_league_press_box: boolean;
  configured: boolean;
}

export const DEFAULT_PRESENTATION_FLAGS: PresentationFlags = Object.freeze({
  f_sweat_radar: false,
  f_league_press_box: false,
  configured: false,
});

let testFlagsOverride: PresentationFlags | null = null;

export function setTestPresentationFlagsOverride(override: PresentationFlags | null): void {
  testFlagsOverride = override;
}

/**
 * Fetches presentation flags from the membership-guarded projection.
 * Governed strictly by Architect Ruling HAG57-OWNER-2026-11-03-02:
 * Missing, failed, or unconfigured settings default closed to disabled/unavailable.
 */
export async function fetchPresentationFlags(poolId: string, authToken?: string | null): Promise<PresentationFlags> {
  if (testFlagsOverride) {
    return testFlagsOverride;
  }

  try {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    }

    const res = await scopedExpressFetch(`/api/pools/${poolId}/presentation-flags`, {
      method: 'GET',
      headers,
      sessionToken: authToken,
    });

    if (!res.ok) {
      return DEFAULT_PRESENTATION_FLAGS;
    }

    const data = await res.json();
    return {
      f_sweat_radar: Boolean(data.f_sweat_radar),
      f_league_press_box: Boolean(data.f_league_press_box),
      configured: Boolean(data.configured),
    };
  } catch (err) {
    console.warn('[presentationFlagsService] Failed to load presentation flags, failing closed:', err);
    return DEFAULT_PRESENTATION_FLAGS;
  }
}

/**
 * React hook for consuming presentation flags with fail-closed defaults
 * and live update event support.
 */
export function usePresentationFlags(poolId: string, authToken?: string | null): {
  flags: PresentationFlags;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [flags, setFlags] = useState<PresentationFlags>(testFlagsOverride || DEFAULT_PRESENTATION_FLAGS);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchPresentationFlags(poolId, authToken);
    setFlags(result);
    setLoading(false);
  }, [poolId, authToken]);

  useEffect(() => {
    load();

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<PresentationFlags>;
      if (custom.detail) {
        setFlags(custom.detail);
      } else {
        load();
      }
    };

    window.addEventListener('presentation-flags-changed', handleUpdate);
    return () => window.removeEventListener('presentation-flags-changed', handleUpdate);
  }, [load]);

  return { flags, loading, refresh: load };
}
