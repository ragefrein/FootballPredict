// services/footballApi.js
const API_BASE_URL = 'http://localhost:8000/api/v1';

// ============================================
// CONSTANTS
// ============================================
const CACHE_KEYS = {
  FIXTURES: 'fixtures_cache_',
  LIVE_FIXTURES: 'live_fixtures_cache_',
  UPCOMING_FIXTURES: 'upcoming_fixtures_cache_',
  STANDINGS: 'standings_cache_',
  TEAM_STATS: 'team_stats_cache_',
  PLAYERS: 'players_cache_',
  CACHE_META: 'cache_meta_'
};

const CACHE_CONFIG = {
  EXPIRY: 5 * 60 * 1000,       
  LIVE_EXPIRY: 30 * 1000,       
  STANDINGS_EXPIRY: 10 * 60 * 1000, 
  MATCH_APPROACHING: 60 * 60 * 1000 
};

// ============================================
// LEAGUE CONFIGURATION
// ============================================
export const LEAGUES_CONFIG = {
  'EPL': { name: 'EPL', displayName: 'Premier League', logo: '/images/epl.png' },
  'La Liga': { name: 'La_Liga', displayName: 'La Liga', logo: '/images/laliga.png' },
  'Serie A': { name: 'Serie_A', displayName: 'Serie A', logo: '/images/seriea.png' },
  'Bundesliga': { name: 'Bundesliga', displayName: 'Bundesliga', logo: '/images/bundesliga.png' },
  'League 1': { name: 'Ligue_1', displayName: 'Ligue 1', logo: '/images/ligue1.png' }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
export function getCurrentTime() {
  return new Date();
}

export function formatWIBDateTime(datetimeWibString) {
  if (!datetimeWibString) return 'Tanggal belum ditentukan';
  
  try {
    const [datePart, timePart] = datetimeWibString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');
    
    const matchDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    const now = new Date();
    const isToday = matchDate.toDateString() === now.toDateString();
    const isTomorrow = matchDate.toDateString() === new Date(now.setDate(now.getDate() + 1)).toDateString();
    
    const formattedTime = `${hour}:${minute}`;
    
    if (isToday) return `Hari ini, ${formattedTime} WIB`;
    if (isTomorrow) return `Besok, ${formattedTime} WIB`;
    
    const formattedDate = matchDate.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
    return `${formattedDate} pukul ${formattedTime} WIB`;
  } catch {
    return datetimeWibString;
  }
}

export function getTimeOnly(datetimeWibString) {
  if (!datetimeWibString) return null;
  
  try {
    const [, timePart] = datetimeWibString.split(' ');
    return `${timePart} WIB`;
  } catch {
    return null;
  }
}

function isMatchApproaching(datetimeWibString) {
  if (!datetimeWibString) return false;
  
  try {
    const [datePart, timePart] = datetimeWibString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');
    
    const matchTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    const timeDiff = matchTime.getTime() - Date.now();
    
    return timeDiff > 0 && timeDiff <= CACHE_CONFIG.MATCH_APPROACHING;
  } catch {
    return false;
  }
}

// ============================================
// CACHE MANAGEMENT
// ============================================
export function clearAllCache() {
  Object.keys(localStorage).forEach(key => {
    const isCacheKey = CACHE_KEYS.FIXTURES.startsWith(key.substring(0, 15)) ||
                       CACHE_KEYS.LIVE_FIXTURES.startsWith(key.substring(0, 15)) ||
                       CACHE_KEYS.UPCOMING_FIXTURES.startsWith(key.substring(0, 15)) ||
                       CACHE_KEYS.STANDINGS.startsWith(key.substring(0, 15)) ||
                       CACHE_KEYS.CACHE_META.startsWith(key);
    
    if (isCacheKey) {
      localStorage.removeItem(key);
    }
  });
}

async function shouldInvalidateCache(leagueName, fixtures) {
  if (!fixtures?.length) return true;
  
  const hasApproachingMatch = fixtures.some(fixture => 
    fixture.datetime_wib && isMatchApproaching(fixture.datetime_wib)
  );
  
  const cacheKey = `${CACHE_KEYS.CACHE_META}${leagueName}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const { timestamp } = JSON.parse(cached);
    const cacheAge = Date.now() - timestamp;
    
    if (hasApproachingMatch || cacheAge > 30000) {
      return true;
    }
  }
  
  return false;
}

function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}


function getCache(key, maxAge = CACHE_CONFIG.EXPIRY) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  try {
    const { data, timestamp } = JSON.parse(cached);
    // Langsung return data tanpa cek expiry untuk speed
    // Expiry akan dihandle oleh shouldInvalidateCache
    return data;
  } catch {
    return null;
  }
}

// Optimasi fetchAPI - timeout lebih pendek
async function fetchAPI(endpoint, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    return data.success ? data : { data: [] };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Fetch error for ${endpoint}:`, error);
    return { data: [] };
  }
}

// ============================================
// DATA FORMATTERS
// ============================================
function formatUpcomingFixture(fixture) {
  if (!fixture) return null;
  
  return {
    matchId: fixture.match_id,
    team1: fixture.home?.title || 'Unknown',
    team2: fixture.away?.title || 'Unknown',
    date: fixture.datetime_wib ? formatWIBDateTime(fixture.datetime_wib) : 'Tanggal belum ditentukan',
    status: fixture.status || 'Upcoming',
    color1: 'bg-blue-600',
    color2: 'bg-red-600',
    homeLogo: fixture.home?.logo,
    awayLogo: fixture.away?.logo,
    datetime_wib: fixture.datetime_wib
  };
}

function formatLiveFixture(fixture) {
  const homeTeam = fixture.home?.title || 'Unknown';
  const awayTeam = fixture.away?.title || 'Unknown';
  const homeScore = fixture.home?.goals?.toString() || '0';
  const awayScore = fixture.away?.goals?.toString() || '0';
  
  let timeDisplay = 'LIVE';
  let halfDisplay = '1H';
  
  if (fixture.datetime_wib && fixture.status === 'upcoming') {
    const timeOnly = getTimeOnly(fixture.datetime_wib);
    if (timeOnly) {
      timeDisplay = timeOnly;
      halfDisplay = 'VS';
    }
  }
  
  return {
    matchId: fixture.match_id,
    team1: homeTeam,
    team2: awayTeam,
    score1: homeScore,
    score2: awayScore,
    time: timeDisplay,
    half: halfDisplay,
    color1: 'bg-blue-600',
    color2: 'bg-red-600',
    homeLogo: fixture.home?.logo,
    awayLogo: fixture.away?.logo,
    datetime_wib: fixture.datetime_wib
  };
}

function formatResultFixture(fixture) {
  return {
    matchId: fixture.match_id,
    team1: fixture.home?.title || 'Unknown',
    team2: fixture.away?.title || 'Unknown',
    score1: fixture.home?.goals?.toString() || '0',
    score2: fixture.away?.goals?.toString() || '0',
    time: 'FT',
    half: 'FT',
    color1: 'bg-blue-600',
    color2: 'bg-red-600',
    homeLogo: fixture.home?.logo,
    awayLogo: fixture.away?.logo
  };
}

// ============================================
// PUBLIC API FUNCTIONS
// ============================================
export async function getUpcomingFixtures(leagueName, limit = 5, forceRefresh = false) {
  const league = LEAGUES_CONFIG[leagueName];
  if (!league) return [];

  const cacheKey = `${CACHE_KEYS.UPCOMING_FIXTURES}${league.name}`;
  
  if (!forceRefresh) {
    const cached = getCache(cacheKey, CACHE_CONFIG.EXPIRY);
    if (cached) {
      const needsRefresh = await shouldInvalidateCache(leagueName, cached);
      if (!needsRefresh) {
        return cached.slice(0, limit);
      }
    }
  }

  try {
    const response = await fetchAPI(`/${league.name}/fixtures/upcoming/`);
    const fixtures = response.data || [];
    
    const formatted = fixtures.map(formatUpcomingFixture).filter(Boolean);
    
    setCache(cacheKey, formatted);
    setCache(`${CACHE_KEYS.CACHE_META}${leagueName}`, {
      fixtureCount: formatted.length,
      lastFetch: new Date().toISOString()
    });
    
    return formatted.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getLiveFixtures(leagueName, forceRefresh = false) {
  const league = LEAGUES_CONFIG[leagueName];
  if (!league) return [];

  const cacheKey = `${CACHE_KEYS.LIVE_FIXTURES}${league.name}`;
  
  if (!forceRefresh) {
    const cached = getCache(cacheKey, CACHE_CONFIG.LIVE_EXPIRY);
    if (cached) return cached;
  }

  try {
    const response = await fetchAPI(`/${league.name}/fixtures/live/`);
    const matches = response.data || [];
    const formatted = matches.map(formatLiveFixture);
    
    setCache(cacheKey, formatted);
    return formatted;
  } catch {
    return [];
  }
}

export async function getRecentResults(leagueName, limit = 5, forceRefresh = false) {
  const league = LEAGUES_CONFIG[leagueName];
  if (!league) return [];

  const cacheKey = `${CACHE_KEYS.FIXTURES}recent_${league.name}`;
  
  if (!forceRefresh) {
    const cached = getCache(cacheKey, CACHE_CONFIG.EXPIRY);
    if (cached) return cached.slice(0, limit);
  }

  try {
    const response = await fetchAPI(`/${league.name}/fixtures/results/?n=${limit}`);
    const results = response.data || [];
    const formatted = results.map(formatResultFixture);
    
    setCache(cacheKey, formatted);
    return formatted;
  } catch {
    return [];
  }
}

export async function getTeamStats(leagueName, teamName) {
  const league = LEAGUES_CONFIG[leagueName];
  if (!league) return null;

  const cacheKey = `${CACHE_KEYS.TEAM_STATS}${league.name}_${teamName}`;
  const cached = getCache(cacheKey, CACHE_CONFIG.EXPIRY);
  if (cached) return cached;

  try {
    const response = await fetchAPI(`/${league.name}/teams/${encodeURIComponent(teamName)}/stats/`);
    const stats = response.data;
    
    if (stats) setCache(cacheKey, stats);
    return stats;
  } catch {
    return null;
  }
}

export async function getAllPlayers(leagueName, options = {}) {
  const { sortBy = 'xg', order = 'desc', teamFilter = null, positionFilter = null } = options;
  const league = LEAGUES_CONFIG[leagueName];
  if (!league) return [];

  const cacheKey = `${CACHE_KEYS.PLAYERS}${league.name}`;
  const cached = getCache(cacheKey, CACHE_CONFIG.EXPIRY);
  
  if (cached) {
    let filtered = cached;
    if (teamFilter) filtered = filtered.filter(p => p.team === teamFilter);
    if (positionFilter) filtered = filtered.filter(p => p.position?.toUpperCase().startsWith(positionFilter.toUpperCase()));
    return filtered;
  }

  try {
    const response = await fetchAPI(`/${league.name}/players/?sort=${sortBy}&order=${order}`);
    const players = response.data || [];
    
    setCache(cacheKey, players);
    
    let filtered = players;
    if (teamFilter) filtered = filtered.filter(p => p.team === teamFilter);
    if (positionFilter) filtered = filtered.filter(p => p.position?.toUpperCase().startsWith(positionFilter.toUpperCase()));
    
    return filtered;
  } catch {
    return [];
  }
}

export async function getPlayerDetail(playerId) {
  try {
    const response = await fetchAPI(`/players/${playerId}/`);
    return response.data;
  } catch {
    return null;
  }
}

export async function getHeadToHead(leagueName, teamA, teamB, limit = 10) {
  const league = LEAGUES_CONFIG[leagueName];
  if (!league) return null;

  try {
    const response = await fetchAPI(`/${league.name}/h2h/?team_a=${encodeURIComponent(teamA)}&team_b=${encodeURIComponent(teamB)}&n=${limit}`);
    return response.data;
  } catch {
    return null;
  }
}