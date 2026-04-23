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
}

export default function MatchCard({ 
  team1, score1, team2, score2, time, half, color1, color2 
}: MatchCardProps) {
  return (
    <div className="min-w-[280px] bg-[#1A1A1D] rounded-2xl p-5 border border-white/5 hover:bg-[#2A2A2E] transition-colors cursor-pointer">
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full ${color1}`}></div>
            <span className="font-medium text-sm text-gray-200">{team1}</span>
          </div>
          <span className="bg-[#2A2A2E] px-2 py-1 rounded text-sm font-bold">{score1}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full ${color2}`}></div>
            <span className="font-medium text-sm text-gray-200">{team2}</span>
          </div>
          <span className="bg-[#2A2A2E] px-2 py-1 rounded text-sm font-bold">{score2}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2 py-1 rounded text-xs font-semibold">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
          {half}
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs bg-[#2A2A2E] px-2 py-1 rounded">
          <span>⌚</span> {time}
        </div>
      </div>
    </div>
  );
}