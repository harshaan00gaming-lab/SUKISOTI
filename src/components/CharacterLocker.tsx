import React, { useState } from 'react';
import { CharacterId, CharacterInfo, CharacterSkin } from '../types/game';
import { X, Check, Lock, Zap, ArrowUp, Sparkles, Eye, Shield, Feather } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface CharacterLockerProps {
  characters: CharacterInfo[];
  selectedCharacterId: CharacterId;
  totalCoins: number;
  onSelectCharacter: (id: CharacterId) => void;
  onSelectSkin: (skinId: string) => void;
  onUpgradeStat: (charId: CharacterId, stat: 'agility' | 'jump' | 'magnet' | 'multiplier') => void;
  onUnlockCharacter: (charId: CharacterId) => void;
  onUnlockSkin: (charId: CharacterId, skinId: string) => void;
  onClose: () => void;
}

export const CharacterLocker: React.FC<CharacterLockerProps> = ({
  characters,
  selectedCharacterId,
  totalCoins,
  onSelectCharacter,
  onSelectSkin,
  onUpgradeStat,
  onUnlockCharacter,
  onUnlockSkin,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'runners' | 'skins' | 'upgrades'>('runners');
  const currentChar = characters.find((c) => c.id === selectedCharacterId) || characters[0];

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-5 z-40 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] rounded-3xl bg-[#130d29] border border-[#3e2c69] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2d1e4f] bg-[#171033]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                HEROINES LOCKER
              </h2>
              <span className="text-xs text-slate-400">
                Choose your runner, equip skins & upgrade stats
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#201542] border border-[#3c2966]">
              <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center">
                C
              </div>
              <span className="text-xs font-black text-amber-300 tabular-nums">
                {totalCoins.toLocaleString()}
              </span>
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
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#2d1e4f] bg-[#100a22] px-4 pt-2">
          {(['runners', 'skins', 'upgrades'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                soundManager.playButton();
                setActiveTab(tab);
              }}
              className={`flex-1 pb-2.5 text-xs font-black tracking-wider uppercase border-b-2 transition ${
                activeTab === tab
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'runners' && '3 Heroines'}
              {tab === 'skins' && 'Skins & Outfits'}
              {tab === 'upgrades' && 'Ability Upgrades'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* TAB 1: RUNNERS */}
          {activeTab === 'runners' && (
            <div className="space-y-3">
              {characters.map((char) => {
                const isSelected = char.id === selectedCharacterId;
                const canAfford = totalCoins >= char.unlockCost;

                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      if (char.unlocked) {
                        soundManager.playButton();
                        onSelectCharacter(char.id);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition relative flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2c1547] to-[#1e1338] border-pink-500 shadow-[0_0_20px_rgba(255,0,128,0.25)]'
                        : char.unlocked
                        ? 'bg-[#191136] border-[#342459] hover:border-[#4d3680]'
                        : 'bg-[#150d2e]/60 border-[#261845] opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Character Avatar Icon */}
                      <div
                        className="w-13 h-13 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border"
                        style={{
                          backgroundColor: char.skins[0]?.palette.secondary || '#1e1b4b',
                          color: char.skins[0]?.palette.primary || '#ffffff',
                          borderColor: char.skins[0]?.palette.primary || '#ffffff',
                        }}
                      >
                        {char.name[0]}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base">
                            {char.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-300">
                            {char.title}
                          </span>
                        </div>

                        {/* Special Trait Badge */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {char.id === 'ravneet' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                              <Eye className="w-3 h-3" />
                              Green Eyes Trait
                            </span>
                          )}
                          {char.id === 'noor' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-md border border-teal-500/30">
                              <Feather className="w-3 h-3" />
                              Slim Silhouette
                            </span>
                          )}
                          {char.id === 'jass' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                              <Sparkles className="w-3 h-3" />
                              Glowing Skin Aura
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-[260px]">
                          {char.trait}
                        </p>
                      </div>
                    </div>

                    {/* Right Action: Select or Unlock */}
                    <div>
                      {char.unlocked ? (
                        isSelected ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500 text-white font-extrabold text-xs shadow">
                            <Check className="w-3.5 h-3.5" />
                            ACTIVE
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playButton();
                              onSelectCharacter(char.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#281b4f] hover:bg-[#342466] text-xs font-bold text-slate-200 border border-[#443070]"
                          >
                            SELECT
                          </button>
                        )
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canAfford) {
                              soundManager.playPowerup();
                              onUnlockCharacter(char.id);
                            }
                          }}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>{char.unlockCost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: SKINS & OUTFITS */}
          {activeTab === 'skins' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Customizing outfits for <strong className="text-pink-400">{currentChar.name}</strong></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentChar.skins.map((skin) => {
                  const isActive = currentChar.activeSkinId === skin.id;
                  const canAfford = totalCoins >= skin.cost;

                  return (
                    <div
                      key={skin.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between transition ${
                        isActive
                          ? 'bg-[#291745] border-pink-500 shadow-lg'
                          : skin.unlocked
                          ? 'bg-[#181136] border-[#312254]'
                          : 'bg-[#120a26] border-[#22173d] opacity-75'
                      }`}
                    >
                      <div>
                        {/* Swatch palette preview */}
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <div
                            className="w-5 h-5 rounded-full border border-white/20 shadow"
                            style={{ backgroundColor: skin.palette.primary }}
                          />
                          <div
                            className="w-5 h-5 rounded-full border border-white/20 shadow"
                            style={{ backgroundColor: skin.palette.secondary }}
                          />
                          <div
                            className="w-5 h-5 rounded-full border border-white/20 shadow"
                            style={{ backgroundColor: skin.palette.accent }}
                          />
                        </div>

                        <h4 className="font-black text-white text-sm">
                          {skin.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {skin.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-[#291b4a]">
                        {skin.unlocked ? (
                          isActive ? (
                            <span className="text-[11px] font-bold text-pink-400 flex items-center gap-1 justify-center">
                              <Check className="w-3 h-3" /> Equipped
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                soundManager.playButton();
                                onSelectSkin(skin.id);
                              }}
                              className="w-full py-1.5 rounded-xl bg-[#261a47] hover:bg-[#342461] text-xs font-bold text-white transition"
                            >
                              Equip
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              if (canAfford) {
                                soundManager.playPowerup();
                                onUnlockSkin(currentChar.id, skin.id);
                              }
                            }}
                            disabled={!canAfford}
                            className={`w-full py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow ${
                              canAfford
                                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            {skin.cost} Coins
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ABILITY UPGRADES */}
          {activeTab === 'upgrades' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Enhance <strong className="text-pink-400">{currentChar.name}</strong>'s permanent running capabilities on track.
              </div>

              {[
                { key: 'agility' as const, label: 'Agility & Lane Shift', desc: 'Faster lateral lane slide speed' },
                { key: 'jump' as const, label: 'Jump Hang-Time', desc: 'Higher vault height and hang-time' },
                { key: 'magnet' as const, label: 'Magnet Attraction', desc: 'Wider radius for magnetic coin pulls' },
                { key: 'multiplier' as const, label: 'Score Multiplier', desc: 'Boosts score accumulation rate' },
              ].map(({ key, label, desc }) => {
                const currentLevel = currentChar.stats[key];
                const isMax = currentLevel >= 5;
                const cost = currentLevel * 150;
                const canAfford = totalCoins >= cost && !isMax;

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl bg-[#181136] border border-[#312254] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-black text-white text-sm">
                        {label}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>

                      {/* Stat Pips (1 to 5) */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`w-6 h-2 rounded-full transition ${
                              lvl <= currentLevel
                                ? 'bg-gradient-to-r from-pink-500 to-amber-400 shadow'
                                : 'bg-slate-800 border border-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      {isMax ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                          MAXED
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (canAfford) {
                              soundManager.playPowerup();
                              onUpgradeStat(currentChar.id, key);
                            }
                          }}
                          disabled={!canAfford}
                          className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow ${
                            canAfford
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:brightness-110 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                          <span>{cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
