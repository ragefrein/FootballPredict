'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeagueNavProps {
  activeLeague: string;
  onLeagueChange: (league: string) => void;
}

const leagues = ['EPL', 'Serie A', 'La Liga', 'League 1', 'Bundesliga'];
const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 200,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};
const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
    },
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.95,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 600,
      damping: 15,
    },
  },
};
const activeButtonVariants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  hover: {
    scale: 1.08,
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.96,
    y: 0,
  },
};
const indicatorVariants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: { 
    scaleX: 1, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 25,
      delay: 0.1,
    },
  },
  exit: { 
    scaleX: 0, 
    opacity: 0,
    transition: { duration: 0.2 },
  },
};
const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: [0, 0.3, 0],
    scale: [0.8, 1.2, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function LeagueNav({ activeLeague, onLeagueChange }: LeagueNavProps) {
  return (
    <motion.nav
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="hidden md:flex bg-black/30 backdrop-blur-sm rounded-full px-1 py-1 relative"
    >
      <motion.div
        variants={glowVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl -z-10"
      />
      
      {leagues.map((league) => {
        const isActive = activeLeague === league;
        
        return (
          <motion.div key={league} className="relative">
            <motion.button
              variants={isActive ? activeButtonVariants : buttonVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              whileTap="tap"
              onClick={() => onLeagueChange(league)}
              className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors z-10 ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {league}
              {isActive && (
                <motion.div
                  variants={indicatorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                />
              )}
            </motion.button>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white/10 rounded-full -z-0"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
          </motion.div>
        );
      })}
    </motion.nav>
  );
}