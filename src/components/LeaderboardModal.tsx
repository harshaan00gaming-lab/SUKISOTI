import React from 'react';
import { LeaderboardEntry } from '../types/game';
import { X, Trophy, Medal, Crown } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  playerScore: number;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  playerScore,
  onClose,
}) => {
  // Sort descending by score
  const sorted = [...entries].sort((a, b) => b.score - a.score);

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-5 z-40 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#130d29] border border-[#3e2c69] flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2d1e4f] bg-[#171033]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                GLOBAL LEADERBOARDS
              </h2>
              <span className="text-xs text-slate-400">
                Top Endless Sprinters of SUKISOTI
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playButton();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entries List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2">
          {sorted.map((entry, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                  entry.isPlayer
                    ? 'bg-gradient-to-r from-[#2c1547] to-[#1e1338] border-pink-500 shadow-md'
                    : isTop3
                    ? 'bg-[#1a1138] border-[#3c2a63]'
                    : 'bg-[#150d2e] border-[#291b4a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : rank === 3
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {rank === 1 ? <Crown className="w-4 h-4 fill-current" /> : rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">
                        {entry.name}
                      </span>
                      {entry.isPlayer && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500 text-white font-black">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="capitalize text-pink-300/90 font-medium">
                        Runner: {entry.characterId}
                      </span>
                      <span>•</span>
                      <span>{entry.distance}m</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="font-black text-white text-base tabular-nums">
                    {entry.score.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {entry.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
