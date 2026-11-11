import React from 'react';
import { DailyChallenge } from '../types/game';
import { X, Check, Calendar, Gift, Clock, Sparkles } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface DailyChallengesModalProps {
  challenges: DailyChallenge[];
  onClaim: (id: string) => void;
  onClose: () => void;
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  challenges,
  onClaim,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-5 z-40 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#130d29] border border-[#3e2c69] flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2d1e4f] bg-[#171033]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                DAILY CHALLENGES
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3 h-3 text-pink-400" />
                <span>Resets every 24 hours</span>
              </div>
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

        {/* Challenge Cards List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
          {challenges.map((c) => {
            const percent = Math.min(100, Math.floor((c.current / c.target) * 100));

            return (
              <div
                key={c.id}
                className={`p-4 rounded-2xl border transition ${
                  c.claimed
                    ? 'bg-[#150f29]/50 border-[#281c42] opacity-60'
                    : c.completed
                    ? 'bg-gradient-to-r from-[#2a1740] to-[#1c1236] border-amber-500 shadow-lg'
                    : 'bg-[#181136] border-[#312254]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      {c.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.description}
                    </p>
                  </div>

                  {/* Reward Coin Tag */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black flex items-center justify-center">
                      C
                    </div>
                    <span className="text-xs font-black text-amber-300 tabular-nums">
                      +{c.rewardCoins}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Status */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                    <span className="text-slate-400">
                      {c.current.toLocaleString()} / {c.target.toLocaleString()}
                    </span>
                    <span className={c.completed ? 'text-emerald-400' : 'text-slate-400'}>
                      {percent}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-3 pt-2 border-t border-[#291b4a] flex items-center justify-end">
                  {c.claimed ? (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Claimed
                    </span>
                  ) : c.completed ? (
                    <button
                      onClick={() => {
                        soundManager.playPowerup();
                        onClaim(c.id);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer animate-pulse"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      CLAIM REWARD
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
