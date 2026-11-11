import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface PauseModalProps {
  score: number;
  distance: number;
  coins: number;
  isMuted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  score,
  distance,
  coins,
  isMuted,
  onResume,
  onRestart,
  onHome,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-40 select-none">
      <div className="w-full max-w-sm rounded-3xl bg-[#140e2b] border border-[#3f2e66] p-6 shadow-2xl flex flex-col items-center gap-5">
        {/* Title */}
        <div className="text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-pink-400">
            Game Paused
          </span>
          <h2 className="text-2xl font-black text-white mt-0.5">
            TAKE A BREATHER
          </h2>
        </div>

        {/* Current Run Metrics */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <div className="flex flex-col items-center p-3 rounded-2xl bg-[#1a1236] border border-[#2e204d]">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Score</span>
            <span className="text-base font-black text-white tabular-nums mt-0.5">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-2xl bg-[#1a1236] border border-[#2e204d]">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Distance</span>
            <span className="text-base font-black text-emerald-300 tabular-nums mt-0.5">
              {distance}m
            </span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-2xl bg-[#1a1236] border border-[#2e204d]">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Coins</span>
            <span className="text-base font-black text-amber-300 tabular-nums mt-0.5">
              {coins}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={() => {
              soundManager.playButton();
              onResume();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-extrabold text-base tracking-wide uppercase shadow-lg active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            RESUME RUN
          </button>

          <button
            onClick={() => {
              soundManager.playButton();
              onRestart();
            }}
            className="w-full py-3 px-6 rounded-2xl bg-[#1f173d] hover:bg-[#281e4f] border border-[#3a2c61] text-slate-200 hover:text-white font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            Restart Run
          </button>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => {
                soundManager.playButton();
                onToggleMute();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#191133] border border-[#30234f] text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              {isMuted ? 'Muted' : 'Sound On'}
            </button>

            <button
              onClick={() => {
                soundManager.playButton();
                onHome();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#191133] border border-[#30234f] text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition"
            >
              <Home className="w-4 h-4 text-teal-400" />
              Main Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
