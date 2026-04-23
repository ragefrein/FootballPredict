'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Share2, Loader2, Sparkles, Play } from 'lucide-react';
import { useFootballData } from '@/contexts/FootballDataContext';
import { LEAGUES_CONFIG } from '@/services/footballApi';

interface HeroSectionProps {
  activeLeague?: string;
}

const HERO_IMAGES = [
  { url: "/images/2.png", alt: "Stadium action", position: "bg-top" },
  { url: "/images/5.png", alt: "Football match", position: "bg-center" },
  { url: "/images/6.png", alt: "Fans celebrating", position: "bg-top" }
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.8,
    transition: { duration: 0.2 },
  },
};

const teamVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 150,
    },
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: { duration: 0.2 },
  },
};

const descriptionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.95,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 },
  },
};

const buttonIconVariants = {
  hover: {
    rotate: [0, 15, -15, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};
const imageFadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

const dotVariants = {
  inactive: { width: 8, height: 8, opacity: 0.5 },
  active: { 
    width: 32, 
    height: 8, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 20 
    },
  },
  hover: { 
    scale: 1.2,
    transition: { duration: 0.2 },
  },
};
const contentWrapperVariants = {
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
const loadingContainerVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: 0.3 }
  },
};

const loadingTextVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { delay: 0.2, duration: 0.4 }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  },
};

const loadingDotVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: (i: number) => ({
    scale: [0, 1, 0],
    opacity: [0, 1, 0],
    transition: {
      delay: i * 0.2,
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  }),
};

const shimmerVariants = {
  initial: { x: "-100%" },
  animate: {
    x: "100%",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const pulseRingVariants = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0.6, 0, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function HeroSection({ activeLeague = 'Serie A' }: HeroSectionProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { getFeaturedMatch, loading } = useFootballData();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const featuredMatch = getFeaturedMatch(activeLeague);
  const leagueConfig = LEAGUES_CONFIG[activeLeague];

  const formatMatchTime = (datetime_wib: string) => {
    if (!datetime_wib) return null;
    
    try {
      const matchDate = new Date(datetime_wib.replace(' ', 'T'));
      const now = new Date();
      const isToday = matchDate.toDateString() === now.toDateString();
      const isTomorrow = new Date(now.setDate(now.getDate() + 1)).toDateString() === matchDate.toDateString();
      
      const timeStr = matchDate.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
      
      if (isToday) {
        return `Hari ini pukul ${timeStr} WIB`;
      } else if (isTomorrow) {
        return `Besok pukul ${timeStr} WIB`;
      } else {
        const dateStr = matchDate.toLocaleDateString('id-ID', { 
          day: 'numeric', 
          month: 'long',
          hour: '2-digit', 
          minute: '2-digit'
        });
        return `${dateStr} WIB`;
      }
    } catch (error) {
      return null;
    }
  };

  const matchTimeInfo = featuredMatch?.datetime_wib ? formatMatchTime(featuredMatch.datetime_wib) : null;
  const isUpcoming = featuredMatch?.half === 'Upcoming' || featuredMatch?.half === '';

  if (loading && !featuredMatch) {
    return (
      <motion.section 
        variants={loadingContainerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative w-full h-[600px] overflow-hidden -mt-24 bg-gradient-to-br from-[#0F0F11] via-[#1A1A1D] to-[#0F0F11]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
        
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative">
            <motion.div
              variants={pulseRingVariants}
              initial="initial"
              animate="animate"
              className="absolute inset-0 rounded-full bg-blue-500/20"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="relative rounded-full h-16 w-16 border-2 border-blue-500/30 border-t-blue-500"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sparkles size={24} className="text-blue-400" />
            </motion.div>
          </div>
          <motion.div
            variants={loadingTextVariants}
            initial="initial"
            animate="animate"
            className="mt-8 flex items-center gap-1"
          >
            <span className="text-gray-400 text-sm font-medium">Loading match data</span>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                custom={i}
                variants={loadingDotVariants}
                initial="initial"
                animate="animate"
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
              />
            ))}
          </motion.div>
          
          <motion.p
            variants={loadingTextVariants}
            initial="initial"
            animate="animate"
            className="text-gray-500 text-xs mt-2"
          >
            Fetching the latest match information...
          </motion.p>
        </div>
      </motion.section>
    );
  }

  return (
    <section className="relative w-full h-[600px] overflow-hidden -mt-24">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            variants={imageFadeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className={`absolute inset-0 bg-cover ${HERO_IMAGES[currentImageIndex].position}`}
            style={{ backgroundImage: `url('${HERO_IMAGES[currentImageIndex].url}')` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F11] via-[#0F0F11]/70 to-transparent" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2"
      >
        {HERO_IMAGES.map((_, index) => (
          <motion.button
            key={index}
            variants={dotVariants}
            initial="inactive"
            animate={index === currentImageIndex ? "active" : "inactive"}
            whileHover="hover"
            onClick={() => setCurrentImageIndex(index)}
            className="rounded-full bg-white transition-all duration-300"
          />
        ))}
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLeague}
          variants={contentWrapperVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative z-10 flex flex-col justify-center h-full max-w-lg p-12 pt-32"
        >
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Badge */}
            <motion.span
              variants={badgeVariants}
              className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider text-gray-300 mb-6 w-max"
            >
              {leagueConfig?.displayName || activeLeague} • {featuredMatch?.half === 'Upcoming' ? 'Upcoming Match' : 'Live Match'}
            </motion.span>
            
            {featuredMatch && (
              <>
                <motion.div variants={teamVariants} className="space-y-4 mb-6">
                  <motion.div 
                    className="flex items-center gap-4"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {featuredMatch.homeLogo && (
                      <motion.img 
                        src={featuredMatch.homeLogo} 
                        alt={featuredMatch.team1} 
                        className="w-8 h-8 object-contain"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      />
                    )}
                    <h1 className="text-3xl font-bold">{featuredMatch.team1}</h1>
                    <motion.span 
                      className="text-2xl font-bold text-white"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {featuredMatch.score1}
                    </motion.span>
                  </motion.div>

    
                  <motion.div 
                    className="flex items-center gap-4"
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {featuredMatch.awayLogo && (
                      <motion.img 
                        src={featuredMatch.awayLogo} 
                        alt={featuredMatch.team2} 
                        className="w-8 h-8 object-contain"
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      />
                    )}
                    <h1 className="text-3xl font-bold">{featuredMatch.team2}</h1>
                    <motion.span 
                      className="text-2xl font-bold text-white"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    >
                      {featuredMatch.score2}
                    </motion.span>
                  </motion.div>
                </motion.div>

                <motion.p
                  variants={descriptionVariants}
                  className="text-sm text-gray-200 leading-relaxed mb-8 max-w-md"
                >
                  {featuredMatch.half === 'Upcoming' ? (
                    <>Pertandingan akan dimulai pada {matchTimeInfo || featuredMatch.time}</>
                  ) : featuredMatch.half !== '' ? (
                    <>Match sedang berlangsung! {featuredMatch.half} - {featuredMatch.time}</>
                  ) : (
                    <>Pertandingan akan segera dimulai</>
                  )}
                </motion.p>
              </>
            )}
            <motion.div 
              variants={buttonVariants}
              className="flex items-center gap-4"
            >
              <div
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                <motion.div variants={buttonIconVariants}>
                  <Play size={20} fill="currentColor" className="text-white" />
                </motion.div>
                Watch Live
              </div>
              
              <div
                className="bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                Add to Watchlist
              </div>
              
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="w-12 h-12 flex items-center justify-center bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-lg transition-all"
              >
                <Share2 size={20} />
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}