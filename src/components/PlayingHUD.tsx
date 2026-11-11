import React from 'react';
import { ActivePowerup } from '../types/game';
import { Pause, Zap, Magnet, Sparkles, Shield, Rocket } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface PlayingHUDProps {
  score: number;
  distance: number;
  coins: number;
  multiplier: number;
  activePowerups: ActivePowerup[];
  onPause: () => void;
}

export const PlayingHUD: React.FC<PlayingHUDProps> = ({
  score,
  distance,
  coins,
  multiplier,
  activePowerups,
  onPause,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-4 sm:p-6 flex flex-col justify-between select-none">
      {/* Top Status Clusters (Keeps > 85% playfield unobstructed) */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left Cluster: Score, Multiplier & Distance */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-baseline gap-2 bg-[#120c24]/80 border border-[#3b2a5c] px-3.5 py-1.5 rounded-xl shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-wider text-pink-400">
              SCORE
            </span>
            <span className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
              {score.toLocaleString()}
            </span>
            {multiplier > 1 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shadow">
                {multiplier}X
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-slate-300 font-medium">
            <span className="text-emerald-400 font-bold tabular-nums">
              {distance.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">METERS</span>
          </div>
        </div>

        {/* Top-Center: Active Power-up Status Bars */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-none max-w-xs">
          {activePowerups.map((p) => {
            const percent = Math.max(0, Math.min(100, (p.remainingTime / p.totalTime) * 100));
            return (
              <div
                key={p.type}
                className="flex items-center gap-2 bg-[#160f2e]/85 border border-[#4a3673] px-2.5 py-1 rounded-full shadow-lg"
              >
                {p.type === 'jetpack' && <Rocket className="w-3.5 h-3.5 text-pink-400 animate-pulse" />}
                {p.type === 'magnet' && <Magnet className="w-3.5 h-3.5 text-rose-400" />}
                {p.type === 'sneakers' && <Zap className="w-3.5 h-3.5 text-teal-300" />}
                {p.type === 'multiplier' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                {p.type === 'shield' && <Shield className="w-3.5 h-3.5 text-blue-400" />}

                <div className="w-16 sm:w-24 h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-100"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-200 tabular-nums">
                  {p.remainingTime.toFixed(1)}s
                </span>
              </div>
            );
          })}
        </div>

        {/* Top-Right Cluster: Coins & Pause Button */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#120c24]/80 border border-[#3b2a5c] px-3 py-1.5 rounded-xl shadow-lg">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border border-yellow-100 flex items-center justify-center text-[9px] font-black text-amber-950 shadow">
              C
            </div>
            <span className="text-base sm:text-lg font-black text-amber-300 tabular-nums">
              {coins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => {
              soundManager.playButton();
              onPause();
            }}
            className="w-10 h-10 rounded-xl bg-[#120c24]/80 border border-[#3b2a5c] hover:border-pink-500/50 flex items-center justify-center text-slate-200 hover:text-white transition shadow-lg active:scale-95 cursor-pointer"
            aria-label="Pause Game"
          >
            <Pause className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Subtle bottom gesture prompt (fades out so screen is distraction-free) */}
      <div className="self-center pb-2 pointer-events-none opacity-40 hover:opacity-80 transition text-center">
        <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
          Swipe anywhere to Move, Jump & Roll
        </span>
      </div>
    </div>
  );
};
