// components/ui/StandingsTable.tsx
import React from 'react';

interface StandingsRow {
  position: number;
  team: string;
  team_id?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  xg_for?: number;
  xg_against?: number;
  xg_diff?: number;
  logo?: string;
}

interface StandingsTableProps {
  standings: StandingsRow[];
  leagueName: string;
}

export default function StandingsTable({ standings, leagueName }: StandingsTableProps) {
  if (!standings || standings.length === 0) {
    return (
      <div className="bg-[#1A1A1D] rounded-2xl p-8 text-center text-gray-400">
        <p>Tidak ada data klasemen untuk {leagueName}</p>
      </div>
    );
  }

  const sortedStandings = [...standings].sort((a, b) => a.position - b.position);

  return (
    <div className="bg-[#1A1A1D] rounded-2xl overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-[#2A2A2E] border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-16">Pos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Team</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">P</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">W</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">D</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">L</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">GF</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">GA</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">GD</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 w-12">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedStandings.map((team) => {
              let positionColor = 'text-gray-300';
              if (team.position <= 4) {
                positionColor = 'text-green-500';
              } else if (team.position <= 6) {
                positionColor = 'text-blue-500';
              } else if (team.position >= 18) {
                positionColor = 'text-red-500';
              }
              
              return (
                <tr 
                  key={team.team_id || team.position} 
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className={`px-4 py-3 text-sm font-semibold ${positionColor}`}>
                    {team.position}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {team.logo && (
                        <img 
                          src={team.logo} 
                          alt={team.team} 
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-sm font-medium text-gray-200">{team.team}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">
                    {team.played}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-green-500 font-medium">
                    {team.won}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-yellow-500 font-medium">
                    {team.drawn}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-red-500 font-medium">
                    {team.lost}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">
                    {team.gf}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">
                    {team.ga}
                  </td>
                  <td className={`px-4 py-3 text-center text-sm font-semibold ${
                    team.gd > 0 ? 'text-green-500' : team.gd < 0 ? 'text-red-500' : 'text-gray-300'
                  }`}>
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-blue-500">
                    {team.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="px-4 py-3 bg-[#2A2A2E]/50 border-t border-white/5 text-xs text-gray-400 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Champions League</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Europa League</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Relegation</span>
        </div>
      </div>
    </div>
  );
}