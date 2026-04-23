// app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FootballDataProvider, useFootballData } from '@/contexts/FootballDataContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import HeroSection from '@/components/match/HeroSection';
import LiveMatches from '@/components/match/LiveMatches';

function HomeContent() {
  const [activeLeague, setActiveLeague] = useState('EPL');
  const { loadLeagueUpcoming } = useFootballData();

  useEffect(() => {
    loadLeagueUpcoming(activeLeague);
  }, [activeLeague, loadLeagueUpcoming]);

  return (
    <div className="min-h-screen bg-[#0F0F11] text-white font-sans pb-24 font-inter">
      <Header activeLeague={activeLeague} onLeagueChange={setActiveLeague} />
      <HeroSection activeLeague={activeLeague} />
      <main className="px-8 relative z-10">
        <LiveMatches activeLeague={activeLeague} />
      </main>
      <BottomNav />
    </div>
  );
}

export default function Home() {
  return (
    <FootballDataProvider>
      <HomeContent />
    </FootballDataProvider>
  );
}