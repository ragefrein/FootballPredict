// components/ui/MatchCard.tsx
import React from 'react';

interface MatchCardProps {
  team1: string;
  score1: string;
  team2: string;
  score2: string;
  time: string;
  half: string;
  color1: string;
  color2: string;
  homeLogo?: string;
  awayLogo?: string;
}

export default function MatchCard({ 
  team1, 
  score1, 
  team2, 
  score2, 
  time, 
  half, 
  color1, 
  color2,
  homeLogo,
  awayLogo
}: MatchCardProps) {
  const isLive = half === '1H' || half === '2H';
  const isUpcoming = half === '';
  
  return (
    <div className="min-w-[280px] bg-[#1A1A1D] rounded-2xl p-5 border border-white/5 hover:bg-[#2A2A2E] transition-colors cursor-pointer hover:scale-105 transition-transform duration-200">
      <div className="space-y-3 mb-5">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {homeLogo ? (
              <img 
                src={homeLogo} 
                alt={team1} 
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-6 h-6 rounded-full ${color1}`}></div>
            )}
            <span className="font-medium text-sm text-gray-200 truncate">{team1}</span>
          </div>
          <span className="bg-[#2A2A2E] px-2 py-1 rounded text-sm font-bold min-w-[40px] text-center">
            {score1}
          </span>
        </div>
        
        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {awayLogo ? (
              <img 
                src={awayLogo} 
                alt={team2} 
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-6 h-6 rounded-full ${color2}`}></div>
            )}
            <span className="font-medium text-sm text-gray-200 truncate">{team2}</span>
          </div>
          <span className="bg-[#2A2A2E] px-2 py-1 rounded text-sm font-bold min-w-[40px] text-center">
            {score2}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isLive ? (
          <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2 py-1 rounded text-xs font-semibold">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            {half}
          </div>
        ) : isUpcoming ? (
          <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-xs font-semibold">
            <span>📅</span>
            {half}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-semibold">
            <span>✓</span>
            {half}
          </div>
        )}
        <div className="flex items-center gap-1 text-gray-400 text-xs bg-[#2A2A2E] px-2 py-1 rounded">
          <span>⌚</span> {time}
        </div>
      </div>
    </div>
  );
}