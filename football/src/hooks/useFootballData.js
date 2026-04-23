// hooks/useFootballData.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPremierLeagueFixtures, getTeamLogo, getLiveMatches } from '../services/footballApi';

export function usePremierLeagueFixtures(season = 2024) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFixtures = async () => {
      try {
        setLoading(true);
        const data = await getPremierLeagueFixtures(season);
        setFixtures(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadFixtures();
  }, [season]);

  return { fixtures, loading, error };
}

export function useLiveMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLiveMatches = async () => {
      const data = await getLiveMatches();
      setMatches(data);
      setLoading(false);
    };
    loadLiveMatches();

    // Refresh every 30 seconds for live matches
    const interval = setInterval(loadLiveMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  return { matches, loading };
}

export function useTeamLogo(teamId) {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    
    const loadLogo = async () => {
      const logoUrl = await getTeamLogo(teamId);
      setLogo(logoUrl);
      setLoading(false);
    };
    
    loadLogo();
  }, [teamId]);

  return { logo, loading };
}