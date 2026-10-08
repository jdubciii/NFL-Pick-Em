import { describe, it, expect } from 'vitest';
import { getTeamLogoUrl, NFL_TEAMS } from '../client/src/utils/teamAssets';

describe('NFL Team Assets & Logo CDN Registry', () => {
  it('correctly maps 32 standard NFL teams with valid CDN endpoints', () => {
    expect(Object.keys(NFL_TEAMS).length).toBe(32);
    expect(getTeamLogoUrl('KC')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/kc.png');
    expect(getTeamLogoUrl('BUF')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/buf.png');
    expect(getTeamLogoUrl('WAS')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png');
  });

  it('gracefully handles lowercase and unmapped fallback codes', () => {
    expect(getTeamLogoUrl('phi')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/phi.png');
    expect(getTeamLogoUrl('XYZ')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/xyz.png');
  });
});
