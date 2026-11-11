import React from 'react';
import { CharacterId, CharacterInfo } from '../types/game';
import { Volume2, VolumeX, Sparkles, Trophy, Calendar, Shirt, Mic, Music, Play } from 'lucide-react';
import { soundManager } from '../audio/synth';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  characters: CharacterInfo[];
  selectedCharacterId: CharacterId;
  totalCoins: number;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onStartGame: () => void;
  onOpenLocker: () => void;
  onOpenChallenges: () => void;
  onOpenLeaderboard: () => void;
  onOpenVoice: () => void;
  onOpenMusic: () => void;
  hasUnclaimedChallenges: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  characters,
  selectedCharacterId,
  totalCoins,
  highScore,
  isMuted,
  onToggleMute,
  onStartGame,
  onOpenLocker,
  onOpenChallenges,
  onOpenLeaderboard,
  onOpenVoice,
  onOpenMusic,
  hasUnclaimedChallenges,
}) => {
  const activeChar = characters.find((c) => c.id === selectedCharacterId) || characters[0];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Bar: Coin Bank & Utility Controls */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* Left: Total Coins & High Score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#19152e]/85 border border-[#3b335a] px-3.5 py-1.5 rounded-full shadow-lg">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border border-yellow-100 flex items-center justify-center text-[10px] font-black text-amber-900 shadow">
              C
            </div>
            <span className="font-extrabold text-amber-300 text-sm tracking-wide tabular-nums">
              {totalCoins.toLocaleString()}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#19152e]/85 border border-[#3b335a] px-3 py-1.5 rounded-full shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-xs text-slate-300 font-medium">BEST</span>
            <span className="font-bold text-white text-xs tabular-nums">
              {highScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right: Sound & Install */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />
          
          <button
            onClick={() => {
              soundManager.playButton();
              onToggleMute();
            }}
            className="w-10 h-10 rounded-full bg-[#19152e]/85 border border-[#3b335a] hover:border-pink-500/50 flex items-center justify-center text-slate-200 hover:text-white transition shadow-lg active:scale-95"
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Center Left: Bespoke Inline SVG Title Lockup */}
      <div className="my-auto pointer-events-none max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950">
            Cozy 3D Runner
          </span>
          <span className="text-[11px] text-pink-300/80 font-medium tracking-wide">
            v1.0 Offline PWA
          </span>
        </div>

        {/* Bespoke inline SVG Title Emblem */}
        <div className="relative">
          <svg viewBox="0 0 420 110" className="w-full max-w-[340px] sm:max-w-[400px] drop-shadow-[0_10px_20px_rgba(255,0,128,0.35)]">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#ffe600" />
                <stop offset="70%" stopColor="#ff007f" />
                <stop offset="100%" stopColor="#7000ff" />
              </linearGradient>
            </defs>
            <text
              x="10"
              y="75"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="64"
              letterSpacing="4"
              fill="url(#titleGrad)"
              stroke="#0f0721"
              strokeWidth="7"
              paintOrder="stroke fill"
            >
              SUKISOTI
            </text>
          </svg>
        </div>

        {/* Character Card Badge */}
        <div className="mt-2 p-3 rounded-2xl bg-[#140e2b]/85 border border-[#3c2a63] backdrop-blur-none max-w-[280px] shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-extrabold text-pink-400">
              Active Runner
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {activeChar.title}
            </span>
          </div>
          <div className="text-lg font-black text-white mt-0.5 flex items-center gap-1.5">
            {activeChar.name}
            {activeChar.id === 'ravneet' && (
              <span className="text-[10px] font-normal text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded-full">
                Green Eyes
              </span>
            )}
            {activeChar.id === 'noor' && (
              <span className="text-[10px] font-normal text-teal-400 border border-teal-500/40 px-1.5 py-0.2 rounded-full">
                Slim Agility
              </span>
            )}
            {activeChar.id === 'jass' && (
              <span className="text-[10px] font-normal text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full">
                Glowing Skin
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {activeChar.trait}
          </p>
        </div>
      </div>

      {/* Bottom Area: Primary Start CTA + Feature Hub + Control Hint */}
      <div className="w-full flex flex-col items-center gap-4 pointer-events-auto">
        {/* Navigation Dock (Locker, Daily Challenges, Leaderboard, AI Music, Voice) */}
        <div className="flex items-center gap-2 sm:gap-3 bg-[#130d29]/90 border border-[#3b2a5c] px-3 py-2 rounded-2xl shadow-2xl">
          <button
            onClick={() => {
              soundManager.playButton();
              onOpenLocker();
            }}
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition group"
          >
            <Shirt className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold">Characters</span>
          </button>

          <div className="w-px h-6 bg-[#2d2247]" />

          <button
            onClick={() => {
              soundManager.playButton();
              onOpenChallenges();
            }}
            className="relative flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition group"
          >
            <Calendar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold">Daily Tasks</span>
            {hasUnclaimedChallenges && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-pink-500" />
            )}
          </button>

          <div className="w-px h-6 bg-[#2d2247]" />

          <button
            onClick={() => {
              soundManager.playButton();
              onOpenLeaderboard();
            }}
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition group"
          >
            <Trophy className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold">Ranks</span>
          </button>

          <div className="w-px h-6 bg-[#2d2247]" />

          <button
            onClick={() => {
              soundManager.playButton();
              onOpenVoice();
            }}
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition group"
          >
            <Mic className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold">Voice Chat</span>
          </button>

          <div className="w-px h-6 bg-[#2d2247]" />

          <button
            onClick={() => {
              soundManager.playButton();
              onOpenMusic();
            }}
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition group"
          >
            <Music className="w-4 h-4 text-pink-400 group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold">Synth Music</span>
          </button>
        </div>

        {/* Primary Start CTA Button (data-start="true") */}
        <button
          data-start="true"
          onClick={() => {
            soundManager.playButton();
            onStartGame();
          }}
          className="w-full max-w-xs sm:max-w-sm py-4 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-black text-xl tracking-wider uppercase shadow-[0_8px_30px_rgba(255,0,128,0.4)] hover:shadow-[0_12px_40px_rgba(255,0,128,0.6)] active:scale-98 transition transform flex items-center justify-center gap-3 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white" />
          START RUN
        </button>

        {/* Flat non-interactive control hint line */}
        <div className="text-[11px] text-slate-400/90 font-medium tracking-wide pb-1 text-center">
          Swipe / WASD Move · Up / Space Jump · Down Roll · Esc Pause
        </div>
      </div>
    </div>
  );
};
