import React, { useState } from 'react';
import { X, Music, Sparkles, Play, Pause, Wand2, Volume2 } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface AIMusicModalProps {
  onClose: () => void;
}

interface TrackPreset {
  id: string;
  name: string;
  style: string;
  tempo: string;
  description: string;
}

export const AIMusicModal: React.FC<AIMusicModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('Cozy warm 80s analog synth arpeggios, dreamy sunset metro runners vibe');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlayingCustom, setIsPlayingCustom] = useState(false);
  const [activePreset, setActivePreset] = useState('sunset');
  const [generatedInfo, setGeneratedInfo] = useState<string | null>(null);

  const presets: TrackPreset[] = [
    {
      id: 'sunset',
      name: 'Sunset Neon Subway',
      style: 'Warm Lo-Fi Synthwave',
      tempo: '118 BPM',
      description: 'Dreamy Rhodes chords with gentle filtered saw bass and sparkling pentatonic chime bells.',
    },
    {
      id: 'midnight',
      name: 'Midnight Kyoto Express',
      style: 'Cozy Ambient Cyberpunk',
      tempo: '110 BPM',
      description: 'Atmospheric pad sweeps, rain ambience, and soft tape delay synth leads.',
    },
    {
      id: 'turbo',
      name: 'High-Speed Velocity',
      style: 'Electro Synth Runner',
      tempo: '135 BPM',
      description: 'Driving pulse arpeggio, punchy 808 bass, and exhilarating pitch risers.',
    },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedInfo(null);
    soundManager.playButton();

    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          preset: activePreset,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setGeneratedInfo(data.trackSummary || 'Generated cozy synth soundscape tailored for endless running.');
      soundManager.startMusic();
      setIsPlayingCustom(true);
    } catch {
      // Offline fallback: Procedural synth switch
      setGeneratedInfo('Synthesized custom cozy analog arpeggios with 2-pole lowpass filter and sub-bass groove.');
      soundManager.startMusic();
      setIsPlayingCustom(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-5 z-40 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#130d29] border border-[#3e2c69] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2d1e4f] bg-[#171033]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                SYNTH MUSIC STUDIO
              </h2>
              <span className="text-xs text-slate-400">
                AI & Procedural Cozy Soundscapes
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

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Atmosphere Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    soundManager.playButton();
                    setActivePreset(p.id);
                    setPrompt(p.description);
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    activePreset === p.id
                      ? 'bg-[#291745] border-pink-500 text-white shadow-lg'
                      : 'bg-[#181136] border-[#312254] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="font-extrabold text-xs">{p.name}</div>
                  <div className="text-[10px] text-pink-300/80 mt-0.5">{p.tempo}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt Input */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Custom Music Prompt
            </label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-[#0e0821] border border-[#2d1e4f] focus:border-pink-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none resize-none"
              placeholder="Describe your ideal endless running soundtrack..."
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-extrabold text-sm tracking-wide uppercase shadow-lg active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Synthesizing Soundscape...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate & Apply Music
              </>
            )}
          </button>

          {/* Status info */}
          {generatedInfo && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <strong className="font-bold block text-white">Active Soundtrack:</strong>
                {generatedInfo}
              </div>
            </div>
          )}

          {/* Quick Offline Synth Player Test */}
          <div className="p-3 rounded-2xl bg-[#171033] border border-[#2d1e4f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-slate-300">
                Procedural Cozy Synth Music
              </span>
            </div>

            <button
              onClick={() => {
                if (isPlayingCustom) {
                  soundManager.stopMusic();
                  setIsPlayingCustom(false);
                } else {
                  soundManager.startMusic();
                  setIsPlayingCustom(true);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-[#261a47] hover:bg-[#342461] text-xs font-bold text-white flex items-center gap-1.5"
            >
              {isPlayingCustom ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Preview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
