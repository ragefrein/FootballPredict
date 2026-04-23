'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MatchCard from '@/components/ui/MatchCard';
import UpcomingMatchCard from '@/components/ui/UpcomingMatchCard';
import StandingsTable from '@/components/ui/StandingsTable';
import { useFootballData } from '@/contexts/FootballDataContext';
import { Calendar, Radio, Trophy, History, Loader2 } from 'lucide-react';

interface LiveMatchesProps {
  activeLeague?: string;
}

type TabType = 'live' | 'upcoming' | 'results' | 'standings';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 200,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const tabVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 15, stiffness: 300, delay: 0.1 },
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  },
  tap: { scale: 0.95 },
};

const activeTabVariants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.02, 1],
    transition: { duration: 0.3, ease: "easeInOut" },
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: { type: "spring", stiffness: 400 },
  },
  tap: { scale: 0.96 },
};

const contentVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.3 }
  },
};

const emptyStateVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 15, stiffness: 200 },
  },
};

// Skeleton card variants
const skeletonVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

const shimmerVariants = {
  initial: { x: "-100%" },
  animate: {
    x: "100%",
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const TabSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <motion.div
        key={i}
        custom={i}
        variants={skeletonVariants}
        initial="hidden"
        animate="visible"
        className="relative min-w-[280px] bg-[#1A1A1D] rounded-2xl p-5 border border-white/5 overflow-hidden"
      >
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-700 rounded-full" />
              <div className="h-4 w-24 bg-gray-700 rounded" />
            </div>
            <div className="h-5 w-8 bg-gray-700 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-700 rounded-full" />
              <div className="h-4 w-24 bg-gray-700 rounded" />
            </div>
            <div className="h-5 w-8 bg-gray-700 rounded" />
          </div>
          <div className="flex gap-2 mt-4">
            <div className="h-6 w-16 bg-gray-700 rounded" />
            <div className="h-6 w-16 bg-gray-700 rounded" />
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

export default function LiveMatches({ activeLeague = 'Serie A' }: LiveMatchesProps) {
  const { 
    getLiveMatches, 
    getUpcomingMatches, 
    getRecentResults,
    getStandings,
    loadLeagueUpcoming,
    loadLeagueStandings,
    isLoading,
    isStandingsLoading
  } = useFootballData();
  
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [upcomingLoaded, setUpcomingLoaded] = useState<Set<string>>(new Set());
  
  const liveMatches = getLiveMatches(activeLeague);
  const upcomingMatches = getUpcomingMatches(activeLeague);
  const recentResults = getRecentResults(activeLeague);
  const standings = getStandings(activeLeague);
  const leagueLoading = isLoading(activeLeague);
  const standingsLoading = isStandingsLoading(activeLeague);

  useEffect(() => {
    if (!upcomingLoaded.has(activeLeague)) {
      loadLeagueUpcoming(activeLeague);
      setUpcomingLoaded(prev => new Set(prev).add(activeLeague));
    }
  }, [activeLeague, loadLeagueUpcoming, upcomingLoaded]);

  useEffect(() => {
    if (!leagueLoading && upcomingMatches.length > 0 && standings.length === 0 && !standingsLoading) {
      const timer = setTimeout(() => {
        loadLeagueStandings(activeLeague);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [leagueLoading, upcomingMatches.length, standings.length, standingsLoading, activeLeague, loadLeagueStandings]);

  const tabs = [
    { id: 'live' as TabType, label: 'Live', icon: Radio, count: liveMatches.length, color: 'red', gradient: 'from-red-500 to-rose-500' },
    { id: 'upcoming' as TabType, label: 'Upcoming', icon: Calendar, count: upcomingMatches.length, color: 'blue', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'results' as TabType, label: 'Results', icon: History, count: recentResults.length, color: 'green', gradient: 'from-green-500 to-emerald-500' },
    { id: 'standings' as TabType, label: 'Standings', icon: Trophy, count: standings.length, color: 'yellow', gradient: 'from-yellow-500 to-amber-500' },
  ];

  const renderContent = () => {
    if (leagueLoading && upcomingMatches.length === 0 && liveMatches.length === 0) {
      return <TabSkeleton />;
    }

    switch (activeTab) {
      case 'live':
        if (liveMatches.length > 0) {
          return (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            >
              {liveMatches.map((match, idx) => (
                <motion.div key={match.matchId || idx} variants={cardVariants} className="min-w-[280px]">
                  <MatchCard {...match} leagueName={activeLeague} />
                </motion.div>
              ))}
            </motion.div>
          );
        }
        return (
          <motion.div
            variants={emptyStateVariants}
            initial="hidden"
            animate="visible"
            className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-12 text-center border border-white/5"
          >
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400">Tidak ada pertandingan live saat ini di {activeLeague}</p>
            <p className="text-xs text-gray-500 mt-2">Cek kembali nanti untuk update pertandingan</p>
          </motion.div>
        );

      case 'upcoming':
        if (upcomingMatches.length > 0) {
          return (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            >
              {upcomingMatches.map((match, idx) => (
                <motion.div key={match.matchId || idx} variants={cardVariants} className="min-w-[280px]">
                  <UpcomingMatchCard 
                    team1={match.team1}
                    team2={match.team2}
                    date={match.date}
                    status={match.status}
                    color1={match.color1}
                    color2={match.color2}
                    homeLogo={match.homeLogo}
                    awayLogo={match.awayLogo}
                    leagueName={activeLeague}
                  />
                </motion.div>
              ))}
            </motion.div>
          );
        }
        return (
          <motion.div
            variants={emptyStateVariants}
            initial="hidden"
            animate="visible"
            className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-12 text-center border border-white/5"
          >
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400">Tidak ada jadwal pertandingan mendatang di {activeLeague}</p>
            <p className="text-xs text-gray-500 mt-2">Jadwal akan ditambahkan segera</p>
          </motion.div>
        );

      case 'results':
        if (recentResults.length > 0) {
          return (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            >
              {recentResults.map((match, idx) => (
                <motion.div key={match.matchId || idx} variants={cardVariants} className="min-w-[280px]">
                  <MatchCard {...match} leagueName={activeLeague} />
                </motion.div>
              ))}
            </motion.div>
          );
        }
        return (
          <motion.div
            variants={emptyStateVariants}
            initial="hidden"
            animate="visible"
            className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-12 text-center border border-white/5"
          >
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <History size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400">Tidak ada hasil pertandingan terbaru di {activeLeague}</p>
            <p className="text-xs text-gray-500 mt-2">Hasil akan muncul setelah pertandingan selesai</p>
          </motion.div>
        );

      case 'standings':
        if (standings.length > 0) {
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <StandingsTable standings={standings} leagueName={activeLeague} />
            </motion.div>
          );
        }
        if (standingsLoading) {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-12 text-center border border-white/5"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
              />
              <p className="text-gray-400">Memuat data klasemen...</p>
            </motion.div>
          );
        }
        return (
          <motion.div
            variants={emptyStateVariants}
            initial="hidden"
            animate="visible"
            className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-12 text-center border border-white/5"
          >
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400">Tidak ada data klasemen untuk {activeLeague}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => loadLeagueStandings(activeLeague, true)}
              className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Muat Ulang
            </motion.button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-12"
    >
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="flex justify-between items-center mb-6"
      >
        <motion.h2 
          key={activeLeague}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
        >
          Football Center - {activeLeague}
        </motion.h2>
        
        <div className="flex gap-2 bg-black/30 backdrop-blur-sm rounded-full p-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isLoading = leagueLoading && upcomingMatches.length === 0 && liveMatches.length === 0;
            
            return (
              <motion.button
                key={tab.id}
                variants={isActive ? activeTabVariants : tabVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                onClick={() => setActiveTab(tab.id)}
                disabled={isLoading}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                    : 'text-gray-400 hover:text-white'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <motion.div
                  whileHover={{ rotate: isActive ? 0 : [0, -10, 10, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  {isActive && tab.id === 'live' ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-1.5 h-1.5 bg-white rounded-full"
                    />
                  ) : (
                    <Icon size={14} />
                  )}
                </motion.div>
                
                <span className="relative">
                  {tab.label}
                  {isActive && (
                    <motion.span
                      layoutId="tabUnderline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </span>
                
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  key={tab.count}
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 text-gray-400 group-hover:text-white'
                  }`}
                >
                  {tab.count}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeLeague}-${activeTab}`}
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}