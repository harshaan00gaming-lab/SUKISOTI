import React from 'react';
import { RunSummary } from '../types/game';
import { Play, RotateCcw, Home, Trophy, Sparkles, Footprints, ArrowUpRight } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface GameOverModalProps {
  summary: RunSummary;
  highScore: number;
  onPlayAgain: () => void;
  onHome: () => void;
  onOpenLocker: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  highScore,
  onPlayAgain,
  onHome,
  onOpenLocker,
}) => {
  const isNewBest = summary.score >= highScore && summary.score > 0;

  return (
    <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-40 select-none animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-3xl bg-[#140e2b] border border-[#432d70] p-6 shadow-2xl flex flex-col items-center gap-4">
        {/* Header Banner */}
        <div className="text-center">
          {isNewBest ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs tracking-wider uppercase mb-1 shadow-lg animate-bounce">
              <Trophy className="w-3.5 h-3.5" />
              NEW BEST RUN!
            </div>
          ) : (
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-pink-400">
              Run Complete
            </span>
          )}
          <h2 className="text-3xl font-black text-white tracking-tight">
            NICE RUN!
          </h2>
        </div>

        {/* Primary Hero Score Tile */}
        <div className="w-full rounded-2xl bg-gradient-to-b from-[#211642] to-[#170e30] border border-[#3b2763] p-4 flex flex-col items-center shadow-inner">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Score
          </span>
          <span className="text-4xl font-black text-white tabular-nums tracking-tight mt-1">
            {summary.score.toLocaleString()}
          </span>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2e1d52] w-full justify-around text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Trophy className="w-3.5 h-3.5 text-pink-400" />
              <span>Best:</span>
              <span className="font-bold text-white tabular-nums">
                {Math.max(highScore, summary.score).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black flex items-center justify-center">
                C
              </div>
              <span>Earned:</span>
              <span className="font-bold text-amber-300 tabular-nums">
                +{summary.coins}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 w-full text-center">
          <div className="p-2.5 rounded-xl bg-[#1b1238] border border-[#2e204d]">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Distance</span>
            <div className="text-sm font-black text-emerald-300 tabular-nums mt-0.5">
              {summary.distance}m
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#1b1238] border border-[#2e204d]">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Jumps</span>
            <div className="text-sm font-black text-teal-300 tabular-nums mt-0.5">
              {summary.jumps}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#1b1238] border border-[#2e204d]">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Rolls</span>
            <div className="text-sm font-black text-purple-300 tabular-nums mt-0.5">
              {summary.slides}
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5 w-full mt-1">
          <button
            data-start="true"
            onClick={() => {
              soundManager.playButton();
              onPlayAgain();
            }}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black text-lg tracking-wider uppercase shadow-[0_6px_24px_rgba(255,0,128,0.4)] active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundManager.playButton();
                onOpenLocker();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#1d143b] hover:bg-[#271b4f] border border-[#39295e] text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Upgrades & Skins
            </button>

            <button
              onClick={() => {
                soundManager.playButton();
                onHome();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#1d143b] hover:bg-[#271b4f] border border-[#39295e] text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              Home Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
