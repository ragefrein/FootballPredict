'use client';

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import LeagueNav from '@/components/ui/LeagueNav';
import Link from 'next/link';

interface HeaderProps {
  activeLeague: string;
  onLeagueChange: (league: string) => void;
}

const headerVariants = {
  hidden: { opacity: 0, y: -50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 200,
      staggerChildren: 0.1,
    },
  },
};

const logoVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", damping: 15 },
  },
  hover: {
    scale: 1.05,
    transition: { type: "spring", stiffness: 400 },
  },
  tap: { scale: 0.95 },
};

const navVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", damping: 15 },
  },
};

export default function Header({ activeLeague, onLeagueChange }: HeaderProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const headerBackground = useTransform(
    scrollY,
    [0, 100],
    ['rgba(15, 15, 17, 0)', 'rgba(15, 15, 17, 0.95)']
  );
  
  const headerBlur = useTransform(
    scrollY,
    [0, 100],
    ['blur(0px)', 'blur(20px)']
  );
  
  useEffect(() => {
    const unsubscribe = scrollY.onChange((latest) => {
      setScrolled(latest > 50);
    });
    return () => unsubscribe();
  }, [scrollY]);
  
  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: headerBackground,
        backdropFilter: headerBlur,
      }}
      className="fixed top-0 left-0 right-0 z-50 transition-shadow duration-300"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: scrolled ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <motion.div
            variants={logoVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Link 
              href="/" 
              className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
            >
              Nanti Baru Dinamain
            </Link>
          </motion.div>
          <motion.div variants={navVariants}>
            <LeagueNav 
              activeLeague={activeLeague} 
              onLeagueChange={onLeagueChange} 
            />
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}