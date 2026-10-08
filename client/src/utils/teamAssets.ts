export interface TeamMeta {
  city: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  espnCode: string;
}

export const NFL_TEAMS: Record<string, TeamMeta> = {
  ARI: { city: 'Arizona', name: 'Cardinals', primaryColor: '#97233F', secondaryColor: '#000000', espnCode: 'ari' },
  ATL: { city: 'Atlanta', name: 'Falcons', primaryColor: '#A71930', secondaryColor: '#000000', espnCode: 'atl' },
  BAL: { city: 'Baltimore', name: 'Ravens', primaryColor: '#241773', secondaryColor: '#000000', espnCode: 'bal' },
  BUF: { city: 'Buffalo', name: 'Bills', primaryColor: '#00338D', secondaryColor: '#C60C30', espnCode: 'buf' },
  CAR: { city: 'Carolina', name: 'Panthers', primaryColor: '#0085CA', secondaryColor: '#101820', espnCode: 'car' },
  CHI: { city: 'Chicago', name: 'Bears', primaryColor: '#0B162A', secondaryColor: '#C83803', espnCode: 'chi' },
  CIN: { city: 'Cincinnati', name: 'Bengals', primaryColor: '#FB4F14', secondaryColor: '#000000', espnCode: 'cin' },
  CLE: { city: 'Cleveland', name: 'Browns', primaryColor: '#311D00', secondaryColor: '#FF3C00', espnCode: 'cle' },
  DAL: { city: 'Dallas', name: 'Cowboys', primaryColor: '#003594', secondaryColor: '#041E42', espnCode: 'dal' },
  DEN: { city: 'Denver', name: 'Broncos', primaryColor: '#FB4F14', secondaryColor: '#002244', espnCode: 'den' },
  DET: { city: 'Detroit', name: 'Lions', primaryColor: '#0076B6', secondaryColor: '#B0B7BC', espnCode: 'det' },
  GB:  { city: 'Green Bay', name: 'Packers', primaryColor: '#203731', secondaryColor: '#FFB612', espnCode: 'gb' },
  HOU: { city: 'Houston', name: 'Texans', primaryColor: '#03202F', secondaryColor: '#A71930', espnCode: 'hou' },
  IND: { city: 'Indianapolis', name: 'Colts', primaryColor: '#002C5F', secondaryColor: '#A2AAAD', espnCode: 'ind' },
  JAX: { city: 'Jacksonville', name: 'Jaguars', primaryColor: '#006778', secondaryColor: '#D7A22A', espnCode: 'jax' },
  KC:  { city: 'Kansas City', name: 'Chiefs', primaryColor: '#E31837', secondaryColor: '#FFB81C', espnCode: 'kc' },
  LV:  { city: 'Las Vegas', name: 'Raiders', primaryColor: '#000000', secondaryColor: '#A5ACAF', espnCode: 'lv' },
  LAC: { city: 'Los Angeles', name: 'Chargers', primaryColor: '#0080C6', secondaryColor: '#FFC20E', espnCode: 'lac' },
  LAR: { city: 'Los Angeles', name: 'Rams', primaryColor: '#003594', secondaryColor: '#FFA300', espnCode: 'lar' },
  MIA: { city: 'Miami', name: 'Dolphins', primaryColor: '#008E97', secondaryColor: '#FC4C02', espnCode: 'mia' },
  MIN: { city: 'Minnesota', name: 'Vikings', primaryColor: '#4F2683', secondaryColor: '#FFC62F', espnCode: 'min' },
  NE:  { city: 'New England', name: 'Patriots', primaryColor: '#002244', secondaryColor: '#C60C30', espnCode: 'ne' },
  NO:  { city: 'New Orleans', name: 'Saints', primaryColor: '#D3BC8D', secondaryColor: '#101820', espnCode: 'no' },
  NYG: { city: 'New York', name: 'Giants', primaryColor: '#0B2265', secondaryColor: '#A71930', espnCode: 'nyg' },
  NYJ: { city: 'New York', name: 'Jets', primaryColor: '#125740', secondaryColor: '#000000', espnCode: 'nyj' },
  PHI: { city: 'Philadelphia', name: 'Eagles', primaryColor: '#004C54', secondaryColor: '#A5ACAF', espnCode: 'phi' },
  PIT: { city: 'Pittsburgh', name: 'Steelers', primaryColor: '#FFB612', secondaryColor: '#101820', espnCode: 'pit' },
  SF:  { city: 'San Francisco', name: '49ers', primaryColor: '#AA0000', secondaryColor: '#B3995D', espnCode: 'sf' },
  SEA: { city: 'Seattle', name: 'Seahawks', primaryColor: '#002244', secondaryColor: '#69BE28', espnCode: 'sea' },
  TB:  { city: 'Tampa Bay', name: 'Buccaneers', primaryColor: '#D50A0A', secondaryColor: '#0A0A08', espnCode: 'tb' },
  TEN: { city: 'Tennessee', name: 'Titans', primaryColor: '#0C2340', secondaryColor: '#4B92DB', espnCode: 'ten' },
  WAS: { city: 'Washington', name: 'Commanders', primaryColor: '#5A1414', secondaryColor: '#FFB612', espnCode: 'wsh' },
};

export function getTeamLogoUrl(abbr: string): string {
  const cleanAbbr = (abbr || '').toUpperCase().trim();
  const espnCode = NFL_TEAMS[cleanAbbr]?.espnCode || cleanAbbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${espnCode}.png`;
}
