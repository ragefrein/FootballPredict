'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Monitor, LayoutGrid, ShoppingBag, Search } from 'lucide-react';

const navItems = [
  { icon: PlayCircle, label: 'Watch', color: 'from-blue-500 to-cyan-500' },
  { icon: Monitor, label: 'Monitor', color: 'from-purple-500 to-pink-500' },
  { icon: LayoutGrid, label: 'Grid', isActive: true, color: 'from-white to-gray-300' },
  { icon: ShoppingBag, label: 'Shop', color: 'from-green-500 to-emerald-500' },
  { icon: Search, label: 'Search', color: 'from-gray-500 to-gray-400' },
];

const containerVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0, rotate: -180 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 260,
    },
  },
  hover: {
    scale: 1.2,
    y: -6,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 12,
    },
  },
  tap: {
    scale: 0.88,
    transition: {
      type: "spring",
      stiffness: 800,
      damping: 10,
    },
  },
};

const activeItemVariants = {
  hover: {
    scale: 1.25,
    y: -6,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 12,
    },
  },
  tap: {
    scale: 0.92,
    transition: {
      type: "spring",
      stiffness: 800,
      damping: 10,
    },
  },
};

const tooltipVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.8 },
  visible: { 
    opacity: 1, 
    y: -32, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 15,
    },
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.8,
    transition: { duration: 0.15 }
  },
};

const pulseVariants = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.4, 1],
    opacity: [0.6, 0, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function BottomNav() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
    >
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-2xl"
        />
        <div className="relative bg-[#1A1A1D]/90 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full flex items-center gap-8 shadow-2xl">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.isActive;
            const isHovered = hoveredIndex === idx;
            
            if (isActive) {
              return (
                <motion.div
                  key={idx}
                  className="relative"
                  variants={activeItemVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onHoverStart={() => setHoveredIndex(idx)}
                  onHoverEnd={() => setHoveredIndex(null)}
                >
                  <motion.div
                    variants={pulseVariants}
                    initial="initial"
                    animate="animate"
                    className="absolute inset-0 rounded-full bg-white/20"
                  />
                  <motion.button
                    className="relative text-white bg-gradient-to-br from-white/20 to-white/5 p-2 rounded-full border border-white/20 shadow-lg"
                  >
                    <Icon size={24} />
                  </motion.button>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                  />

                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        variants={tooltipVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md border border-white/20 whitespace-nowrap"
                      >
                        {item.label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            }
            
            return (
              <motion.div
                key={idx}
                className="relative"
                variants={itemVariants}
                whileHover="hover"
                whileTap="tap"
                onHoverStart={() => setHoveredIndex(idx)}
                onHoverEnd={() => setHoveredIndex(null)}
              >
                <motion.button
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Icon size={24} />
                </motion.button>
                
                {/* Tooltip on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      variants={tooltipVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-md border border-white/10 whitespace-nowrap"
                    >
                      {item.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}