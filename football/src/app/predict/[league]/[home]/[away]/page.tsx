'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Target, Activity, BarChart3, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PredictionResponse {
  success: boolean;
  data: {
    matchup: string;
    probabilities: {
      home_win: number;
      draw: number;
      away_win: number;
    };
    metrics: {
      home_elo: number;
      away_elo: number;
      adjusted_home_xg: number;
      adjusted_away_xg: number;
      kl_divergence: number;
      ml_blend_alpha: number;
    };
    monte_carlo_simulations: number;
    most_likely_scores: Array<{
      score: string;
      probability: number;
    }>;
    home_logo: string;
    away_logo: string;
  };
  source: string;
}

// Mapping untuk konversi dari display name ke API name
const leagueNameMap: Record<string, string> = {
  'EPL': 'EPL',
  'Serie A': 'Serie_A',
  'La Liga': 'La_Liga',
  'Bundesliga': 'Bundesliga',
  'League 1': 'Ligue_1',
  // Handle URL encoded variations
  'Serie%20A': 'Serie_A',
  'La%20Liga': 'La_Liga',
  'League%201': 'Ligue_1',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
      ease: "easeOut",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 120,
      mass: 0.8,
    },
  },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 150,
      mass: 0.6,
    },
  },
};

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const slideInRightVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 100,
    },
  },
};

const numberCountVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: (custom: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: custom * 0.05,
      duration: 0.6,
      type: "spring",
      damping: 12,
    },
  }),
};

const progressBarVariants = {
  hidden: { width: "0%" },
  visible: (width: string) => ({
    width: width,
    transition: {
      duration: 1,
      delay: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

export default function PredictionPage() {
  const params = useParams();
  const router = useRouter();
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counters, setCounters] = useState({
    homeWin: 0,
    draw: 0,
    awayWin: 0,
  });

  const rawLeague = params.league as string;
  const homeTeam = decodeURIComponent(params.home as string);
  const awayTeam = decodeURIComponent(params.away as string);
  
  // Convert league name to API format (replace space with underscore)
  const league = leagueNameMap[rawLeague] || rawLeague.replace(/ /g, '_');

  useEffect(() => {
    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = `http://localhost:8000/api/v1/${league}/predict/?home=${encodeURIComponent(homeTeam)}&away=${encodeURIComponent(awayTeam)}`;
        console.log('Fetching prediction from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to fetch prediction');
        
        const data = await response.json();
        setPrediction(data);
        
        // Animate counters
        if (data.data) {
          const probs = data.data.probabilities;
          const duration = 1000;
          const steps = 60;
          const stepDuration = duration / steps;
          
          let currentStep = 0;
          const interval = setInterval(() => {
            currentStep++;
            setCounters({
              homeWin: (probs.home_win * currentStep) / steps,
              draw: (probs.draw * currentStep) / steps,
              awayWin: (probs.away_win * currentStep) / steps,
            });
            if (currentStep >= steps) clearInterval(interval);
          }, stepDuration);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [league, homeTeam, awayTeam]);

  // Display league name for UI
  const displayLeagueName = rawLeague.replace(/_/g, ' ').replace('Ligue 1', 'League 1');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F11] via-[#1A1A1D] to-[#0F0F11] pt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="rounded-full h-16 w-16 border-2 border-blue-500/30 border-t-blue-500"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-6 h-6 bg-blue-500 rounded-full" />
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-400 text-sm mt-6"
          >
            Analyzing match data...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (error || !prediction?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F11] via-[#1A1A1D] to-[#0F0F11] pt-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 150 }}
              className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <AlertCircle className="w-10 h-10 text-red-500" />
            </motion.div>
            <p className="text-red-400 mb-6">{error || 'Failed to load prediction'}</p>
            <div className="flex justify-center gap-4">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Go Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors"
              >
                Try Again
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const { data, source } = prediction;
  const { probabilities: probs, metrics } = data;
  const maxScoreProb = Math.max(...data.most_likely_scores.map(s => s.probability));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-gradient-to-br from-[#0F0F11] via-[#1A1A1D] to-[#0F0F11] text-white pt-20 pb-12 selection:bg-blue-500/30"
      >
        <div className="container mx-auto px-4 max-w-5xl">
          
          <motion.div
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-between mb-6"
          >
            <Link 
              href="/" 
              className="group flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all duration-300"
            >
              <motion.div
                whileHover={{ x: -4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ArrowLeft size={18} />
              </motion.div>
              <span>Back to Matches</span>
            </Link>
            <motion.span
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 uppercase tracking-wider backdrop-blur-sm"
            >
              {displayLeagueName}
            </motion.span>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            <div className="lg:col-span-2 flex flex-col gap-5">
              <motion.div
                variants={scaleVariants}
                className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-6 border border-white/5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex flex-col items-center w-1/3 text-center"
                  >
                    <div className="relative">
                      {data.home_logo ? (
                        <motion.img 
                          src={data.home_logo} 
                          alt={homeTeam} 
                          className="w-16 h-16 object-contain mb-3 drop-shadow-lg" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", damping: 15, stiffness: 150, delay: 0.2 }}
                        />
                      ) : <div className="w-16 h-16 bg-white/5 rounded-full mb-3" />}
                    </div>
                    <h2 className="text-lg md:text-xl font-bold leading-tight text-white">{homeTeam}</h2>
                    <span className="text-xs text-gray-500 mt-1">Home</span>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.4 }}
                    className="w-1/3 flex flex-col items-center justify-center"
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-20"
                      />
                      <div className="relative text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 italic">
                        VS
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="flex flex-col items-center w-1/3 text-center"
                  >
                    <div className="relative">
                      {data.away_logo ? (
                        <motion.img 
                          src={data.away_logo} 
                          alt={awayTeam} 
                          className="w-16 h-16 object-contain mb-3 drop-shadow-lg" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          initial={{ scale: 0, rotate: 180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", damping: 15, stiffness: 150, delay: 0.25 }}
                        />
                      ) : <div className="w-16 h-16 bg-white/5 rounded-full mb-3" />}
                    </div>
                    <h2 className="text-lg md:text-xl font-bold leading-tight text-white">{awayTeam}</h2>
                    <span className="text-xs text-gray-500 mt-1">Away</span>
                  </motion.div>
                </div>
              </motion.div>
              
              <motion.div
                variants={itemVariants}
                className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-6 border border-white/5"
              >
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-white" />
                    Match Prediction
                  </h3>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-[10px] text-gray-500"
                  >
                    {data.monte_carlo_simulations.toLocaleString()} Sims
                  </motion.span>
                </div>
                
                <div className="h-5 w-full rounded-full flex overflow-hidden mb-4 bg-gray-800 border border-white/10">
                  <motion.div
                    variants={progressBarVariants}
                    custom={`${probs.home_win}%`}
                    initial="hidden"
                    animate="visible"
                    className="bg-gradient-to-r from-red-600 to-red-500"
                  />
                  <motion.div
                    variants={progressBarVariants}
                    custom={`${probs.draw}%`}
                    initial="hidden"
                    animate="visible"
                    className="bg-gradient-to-r from-gray-400 to-white"
                  />
                  <motion.div
                    variants={progressBarVariants}
                    custom={`${probs.away_win}%`}
                    initial="hidden"
                    animate="visible"
                    className="bg-gradient-to-r from-blue-600 to-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center text-sm px-1">
                  <div className="text-left">
                    <motion.div
                      custom={0}
                      variants={numberCountVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-red-500 font-bold text-xl"
                    >
                      {Math.round(counters.homeWin || probs.home_win)}%
                    </motion.div>
                    <div className="text-gray-400 text-xs">Home Win</div>
                  </div>
                  <div className="text-center">
                    <motion.div
                      custom={1}
                      variants={numberCountVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-white font-bold text-xl"
                    >
                      {Math.round(counters.draw || probs.draw)}%
                    </motion.div>
                    <div className="text-gray-400 text-xs">Draw</div>
                  </div>
                  <div className="text-right">
                    <motion.div
                      custom={2}
                      variants={numberCountVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-blue-500 font-bold text-xl"
                    >
                      {Math.round(counters.awayWin || probs.away_win)}%
                    </motion.div>
                    <div className="text-gray-400 text-xs">Away Win</div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                variants={itemVariants}
                className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-6 border border-white/5"
              >
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-5">
                  <Target size={16} className="text-red-500" />
                  Team Analytics
                </h3>
                
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5"
                  >
                    <span className="w-1/3 text-left font-bold text-red-500 text-lg">{metrics.adjusted_home_xg.toFixed(2)}</span>
                    <span className="w-1/3 text-center text-xs text-gray-400 font-medium">Expected Goals (xG)</span>
                    <span className="w-1/3 text-right font-bold text-blue-500 text-lg">{metrics.adjusted_away_xg.toFixed(2)}</span>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5"
                  >
                    <span className="w-1/3 text-left font-bold text-red-500 text-lg">{Math.round(metrics.home_elo)}</span>
                    <span className="w-1/3 text-center text-xs text-gray-400 font-medium">Team ELO Rating</span>
                    <span className="w-1/3 text-right font-bold text-blue-500 text-lg">{Math.round(metrics.away_elo)}</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
            
            <div className="flex flex-col gap-5">
              <motion.div
                variants={slideInRightVariants}
                className="bg-gradient-to-br from-[#1A1A1D] to-[#151518] rounded-2xl p-6 border border-white/5 flex-1 flex flex-col"
              >
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-white" />
                  Likely Scores
                </h3>
                
                <div className="flex-1 min-h-[200px] flex items-end justify-between gap-1 sm:gap-2 pt-6">
                  {data.most_likely_scores.map((score, idx) => {
                    const barHeight = (score.probability / maxScoreProb) * 100;
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + idx * 0.08, duration: 0.6, type: "spring", damping: 15 }}
                        whileHover={{ y: -6 }}
                        className="flex flex-col items-center flex-1 h-full justify-end group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className={`text-[10px] sm:text-xs mb-2 font-mono transition-colors ${idx === 0 ? 'text-blue-400 font-bold' : 'text-gray-400 group-hover:text-gray-300'}`}
                        >
                          {score.probability.toFixed(1)}%
                        </motion.div>
                        
                        <div className="w-full max-w-[2.5rem] h-[140px] bg-black/40 rounded-t-md overflow-hidden border border-white/5 border-b-0 flex items-end">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(barHeight, 5)}%` }}
                            transition={{ duration: 0.7, delay: 0.5 + idx * 0.08, type: "spring", damping: 20 }}
                            className={`w-full rounded-t-md ${
                              idx === 0 
                                ? 'bg-gradient-to-t from-blue-600 to-blue-400' 
                                : 'bg-white/30 group-hover:bg-white/40'
                            }`}
                          />
                        </div>
                        
                        <div className={`mt-3 text-xs sm:text-sm font-bold transition-colors ${idx === 0 ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                          {score.score}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center mt-8 pt-6 border-t border-white/5"
          >
            <p className="text-[11px] text-gray-600">
              * Predictions are generated using statistical models, xG adjustments, and ELO ratings.<br />
              Data is for informational purposes only.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}