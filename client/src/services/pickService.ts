import { supabase } from '../lib/supabase';

export const ACTIVE_POOL_ID = '9b893bef-3b5a-4ffa-951d-8ba27f9c9782';

/**
 * Returns a strictly user- and pool-scoped cache key.
 */
export function getUserPickCacheKey(
  userId: string | undefined | null,
  poolId: string = ACTIVE_POOL_ID,
  week: number
): string {
  return `picks_${userId || 'anon'}_${poolId}_w${week}`;
}

/**
 * Loads user picks strictly from Supabase cloud for the active user, pool, and week.
 */
export async function fetchUserPicks(
  poolId: string = ACTIVE_POOL_ID,
  userId: string,
  week: number
): Promise<Record<string, string>> {
  if (!userId) return {};
  try {
    const { data: dbPicks, error } = await supabase
      .from('picks')
      .select('game_id, selected_team')
      .eq('pool_id', poolId)
      .eq('user_id', userId)
      .eq('week', week);

    if (error) {
      console.warn('Error fetching cloud picks:', error);
      return {};
    }

    const picksMap: Record<string, string> = {};
    if (dbPicks && Array.isArray(dbPicks)) {
      dbPicks.forEach((p: any) => {
        const gId = p.game_id || p.matchup_id;
        if (gId && p.selected_team) {
          picksMap[String(gId)] = p.selected_team;
        }
      });
    }
    return picksMap;
  } catch (err) {
    console.warn('Failed to load user picks from Supabase:', err);
    return {};
  }
}
