// components/ui/UpcomingMatchCard.tsx
import React from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpcomingMatchCardProps {
  matchId?: string;
  team1: string;
  team2: string;
  date: string;
  status: string;
  color1: string;
  color2: string;
  homeLogo?: string;
  awayLogo?: string;
  datetime_utc?: string;
  leagueName?: string;
}

export default function UpcomingMatchCard({ 
  matchId,
  team1, 
  team2, 
  date, 
  status, 
  color1, 
  color2,
  homeLogo,
  awayLogo,
  leagueName
}: UpcomingMatchCardProps) {
  const router = useRouter();

  const handleClick = () => {
    const encodedHome = encodeURIComponent(team1);
    const encodedAway = encodeURIComponent(team2);
    const league = leagueName || 'EPL';
    
    router.push(`/predict/${league}/${encodedHome}/${encodedAway}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="min-w-[280px] bg-[#1A1A1D] rounded-2xl p-5 border border-white/5 hover:bg-[#2A2A2E] transition-all duration-200 hover:scale-105 cursor-pointer group"
    >
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3">
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
          <span className="font-medium text-sm text-gray-200 flex-1 group-hover:text-white transition-colors">
            {team1}
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#1A1A1D] px-2 text-xs text-gray-500 group-hover:bg-[#2A2A2E] transition-colors">
              VS
            </span>
          </div>
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-3">
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
          <span className="font-medium text-sm text-gray-200 flex-1 group-hover:text-white transition-colors">
            {team2}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-400 text-xs bg-[#2A2A2E] px-2 py-1.5 rounded">
          <Calendar size={12} />
          <span className="font-mono">{date}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
      
        
        </div>
      </div>
    </div>
  );
}