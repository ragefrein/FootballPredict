// contexts/FootballDataContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { 
  getLiveFixtures, 
  getUpcomingFixtures,
  getRecentResults,
  LEAGUES_CONFIG 
} from '@/services/footballApi';

// ============================================
// TYPES
// ============================================
interface FootballDataContextType {
  liveMatchesData: Record<string, any[]>;
  upcomingMatchesData: Record<string, any[]>;
  recentResultsData: Record<string, any[]>;
  standingsData: Record<string, any[]>;
  featuredMatchesData: Record<string, any>;
  loadingLeagues: Record<string, boolean>;
  loadingStandings: Record<string, boolean>;
  loadLeagueUpcoming: (leagueName: string, forceRefresh?: boolean) => Promise<void>;
  loadLeagueStandings: (leagueName: string, forceRefresh?: boolean) => Promise<void>;
  refreshLeague: (leagueName: string) => Promise<void>;
  getLiveMatches: (leagueName: string) => any[];
  getUpcomingMatches: (leagueName: string) => any[];
  getRecentResults: (leagueName: string) => any[];
  getStandings: (leagueName: string) => any[];
  getFeaturedMatch: (leagueName: string) => any | null;
  isLoading: (leagueName: string) => boolean;
  isStandingsLoading: (leagueName: string) => boolean;
}

// ============================================
// CONSTANTS
// ============================================
const API_BASE_URL = 'http://localhost:8000/api/v1';

// ============================================
// CONTEXT
// ============================================
const FootballDataContext = createContext<FootballDataContextType | undefined>(undefined);

// ============================================
// PROVIDER COMPONENT
// ============================================
export function FootballDataProvider({ children }: { children: React.ReactNode }) {
  // ============================================
  // STATE
  // ============================================
  const [liveMatchesData, setLiveMatchesData] = useState<Record<string, any[]>>({});
  const [upcomingMatchesData, setUpcomingMatchesData] = useState<Record<string, any[]>>({});
  const [recentResultsData, setRecentResultsData] = useState<Record<string, any[]>>({});
  const [standingsData, setStandingsData] = useState<Record<string, any[]>>({});
  const [featuredMatchesData, setFeaturedMatchesData] = useState<Record<string, any>>({});
  const [loadingLeagues, setLoadingLeagues] = useState<Record<string, boolean>>({});
  const [loadingStandings, setLoadingStandings] = useState<Record<string, boolean>>({});
  
  // ============================================
  // REFS
  // ============================================
  const fetchingUpcomingRef = useRef<Record<string, boolean>>({});
  const fetchingStandingsRef = useRef<Record<string, boolean>>({});
  const upcomingLoadedRef = useRef<Record<string, boolean>>({});
  const standingsLoadedRef = useRef<Record<string, boolean>>({});
  const initialLoadStartedRef = useRef<boolean>(false);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const updateState = <T,>(
    setter: React.Dispatch<React.SetStateAction<Record<string, T>>>,
    key: string,
    value: T
  ) => {
    setter(prev => ({ ...prev, [key]: value }));
  };

  // ============================================
  // LOAD UPCOMING ONLY (Cepat, priority untuk active league)
  // ============================================
  const loadLeagueUpcoming = useCallback(async (leagueName: string, forceRefresh = false) => {
    if (upcomingLoadedRef.current[leagueName] && !forceRefresh) {
      return;
    }

    if (fetchingUpcomingRef.current[leagueName] && !forceRefresh) {
      return;
    }

    fetchingUpcomingRef.current[leagueName] = true;
    updateState(setLoadingLeagues, leagueName, true);

    try {
      // Parallel fetch untuk data utama
      const [upcomingMatches, liveMatches, recentResults] = await Promise.all([
        getUpcomingFixtures(leagueName, 5),
        getLiveFixtures(leagueName),
        getRecentResults(leagueName, 5)
      ]);
      
      updateState(setUpcomingMatchesData, leagueName, upcomingMatches);
      updateState(setLiveMatchesData, leagueName, liveMatches);
      updateState(setRecentResultsData, leagueName, recentResults);
      
      const featuredMatch = liveMatches.length > 0 
        ? liveMatches[0]
        : upcomingMatches.length > 0
          ? { ...upcomingMatches[0], score1: "", score2: "", half: "Upcoming" }
          : null;
      
      updateState(setFeaturedMatchesData, leagueName, featuredMatch);
      upcomingLoadedRef.current[leagueName] = true;
      
    } catch (error) {
      console.error(`Failed to load upcoming for ${leagueName}:`, error);
    } finally {
      fetchingUpcomingRef.current[leagueName] = false;
      updateState(setLoadingLeagues, leagueName, false);
    }
  }, []);

  // ============================================
  // LOAD STANDINGS ONLY (Background)
  // ============================================
  const loadLeagueStandings = useCallback(async (leagueName: string, forceRefresh = false) => {
    if (standingsLoadedRef.current[leagueName] && !forceRefresh) {
      return;
    }

    if (fetchingStandingsRef.current[leagueName] && !forceRefresh) {
      return;
    }

    fetchingStandingsRef.current[leagueName] = true;
    updateState(setLoadingStandings, leagueName, true);

    try {
      const leagueCode = LEAGUES_CONFIG[leagueName].name;
      const response = await fetch(`${API_BASE_URL}/${leagueCode}/standings/`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
      
      const result = await response.json();
      const standings = result.data || [];
      
      updateState(setStandingsData, leagueName, standings);
      standingsLoadedRef.current[leagueName] = true;
      
    } catch (error) {
      console.error(`Failed to fetch standings for ${leagueName}:`, error);
    } finally {
      fetchingStandingsRef.current[leagueName] = false;
      updateState(setLoadingStandings, leagueName, false);
    }
  }, []);

  // ============================================
  // OPTIMIZED: Load hanya active league terlebih dahulu, sisanya background
  // ============================================
  const [activeLeague, setActiveLeague] = useState<string>('EPL');
  
  const updateActiveLeague = useCallback((leagueName: string) => {
    setActiveLeague(leagueName);
  }, []);

  useEffect(() => {
    if (!initialLoadStartedRef.current) {
      initialLoadStartedRef.current = true;
      
      // Load active league FIRST (priority)
      const loadInitialData = async () => {
        console.log('🚀 Loading active league first:', activeLeague);
        await loadLeagueUpcoming(activeLeague);
        
        // Then load other leagues in background (non-blocking)
        const otherLeagues = Object.keys(LEAGUES_CONFIG).filter(l => l !== activeLeague);
        console.log('📦 Loading other leagues in background:', otherLeagues);
        
        // Load other leagues without awaiting (background)
        Promise.all(otherLeagues.map(league => loadLeagueUpcoming(league)));
      };
      
      loadInitialData();
    }
  }, [activeLeague, loadLeagueUpcoming]);

  // Load standings untuk active league setelah data utama selesai
  useEffect(() => {
    if (activeLeague && upcomingLoadedRef.current[activeLeague] && !standingsLoadedRef.current[activeLeague]) {
      // Load standings immediately after upcoming data is ready
      loadLeagueStandings(activeLeague);
    }
  }, [activeLeague, loadLeagueStandings]);

  // ============================================
  // PUBLIC METHODS
  // ============================================
  const refreshLeague = useCallback(async (leagueName: string) => {
    upcomingLoadedRef.current[leagueName] = false;
    standingsLoadedRef.current[leagueName] = false;
    
    await loadLeagueUpcoming(leagueName, true);
    await loadLeagueStandings(leagueName, true);
  }, [loadLeagueUpcoming, loadLeagueStandings]);

  // ============================================
  // GETTERS
  // ============================================
  const getLiveMatches = useCallback((leagueName: string) => 
    liveMatchesData[leagueName] || [], [liveMatchesData]);

  const getUpcomingMatches = useCallback((leagueName: string) => 
    upcomingMatchesData[leagueName] || [], [upcomingMatchesData]);

  const getRecentResults = useCallback((leagueName: string) => 
    recentResultsData[leagueName] || [], [recentResultsData]);

  const getStandings = useCallback((leagueName: string) => 
    standingsData[leagueName] || [], [standingsData]);

  const getFeaturedMatch = useCallback((leagueName: string) => 
    featuredMatchesData[leagueName] || null, [featuredMatchesData]);

  const isLoading = useCallback((leagueName: string) => 
    loadingLeagues[leagueName] || false, [loadingLeagues]);

  const isStandingsLoading = useCallback((leagueName: string) => 
    loadingStandings[leagueName] || false, [loadingStandings]);

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value: FootballDataContextType = {
    liveMatchesData,
    upcomingMatchesData,
    recentResultsData,
    standingsData,
    featuredMatchesData,
    loadingLeagues,
    loadingStandings,
    loadLeagueUpcoming,
    loadLeagueStandings,
    refreshLeague,
    getLiveMatches,
    getUpcomingMatches,
    getRecentResults,
    getStandings,
    getFeaturedMatch,
    isLoading,
    isStandingsLoading,
  };

  return (
    <FootballDataContext.Provider value={value}>
      {children}
    </FootballDataContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================
export function useFootballData() {
  const context = useContext(FootballDataContext);
  
  if (context === undefined) {
    throw new Error('useFootballData must be used within a FootballDataProvider');
  }
  
  return context;
}