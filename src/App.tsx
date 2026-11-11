import React, { useEffect, useRef, useState } from 'react';
import {
  ActivePowerup,
  CharacterId,
  CharacterInfo,
  DailyChallenge,
  GameState,
  LeaderboardEntry,
  RunSummary,
} from './types/game';
import {
  INITIAL_CHARACTERS,
  INITIAL_DAILY_CHALLENGES,
  INITIAL_LEADERBOARD,
} from './data/characters';
import { GameEngine } from './game/gameEngine';
import { soundManager } from './audio/synth';
import { updateChallengeProgress } from './game/rules';

// UI Components
import { TitleScreen } from './components/TitleScreen';
import { PlayingHUD } from './components/PlayingHUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { CharacterLocker } from './components/CharacterLocker';
import { DailyChallengesModal } from './components/DailyChallengesModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { VoiceCompanionModal } from './components/VoiceCompanionModal';
import { AIMusicModal } from './components/AIMusicModal';
import { WifiOff } from 'lucide-react';

const STORAGE_KEYS = {
  CHARACTERS: 'sukisoti_characters',
  ACTIVE_CHAR: 'sukisoti_active_char',
  COINS: 'sukisoti_coins',
  HIGH_SCORE: 'sukisoti_high_score',
  CHALLENGES: 'sukisoti_challenges',
  CHALLENGES_DATE: 'sukisoti_challenges_date',
  LEADERBOARD: 'sukisoti_leaderboard',
};

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  // Game UI State
  const [gameState, setGameState] = useState<GameState>('title');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Run Realtime Readouts
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [runCoins, setRunCoins] = useState(0);
  const [activePowerups, setActivePowerups] = useState<ActivePowerup[]>([]);
  const [lastSummary, setLastSummary] = useState<RunSummary | null>(null);

  // Persistent Economy & Characters
  const [totalCoins, setTotalCoins] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COINS);
    return saved ? parseInt(saved, 10) : 250; // Starter coins
  });

  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [characters, setCharacters] = useState<CharacterInfo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_CHARACTERS;
  });

  const [selectedCharId, setSelectedCharId] = useState<CharacterId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAR);
    return (saved as CharacterId) || 'noor';
  });

  const [challenges, setChallenges] = useState<DailyChallenge[]>(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(STORAGE_KEYS.CHALLENGES_DATE);
    const saved = localStorage.getItem(STORAGE_KEYS.CHALLENGES);

    if (saved && savedDate === today) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_DAILY_CHALLENGES;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_LEADERBOARD;
  });

  // Modals
  const [showLocker, setShowLocker] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showMusic, setShowMusic] = useState(false);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COINS, totalCoins.toString());
  }, [totalCoins]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, highScore.toString());
  }, [highScore]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAR, selectedCharId);
  }, [selectedCharId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(challenges));
    localStorage.setItem(STORAGE_KEYS.CHALLENGES_DATE, new Date().toDateString());
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
  }, [leaderboard]);

  // Initial Game Engine Mount
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];

    const engine = new GameEngine(canvasContainerRef.current, activeChar, {
      onScoreUpdate: (newScore, newDistance, newCoins) => {
        setScore(newScore);
        setDistance(newDistance);
        setRunCoins(newCoins);
      },
      onPowerupUpdate: (active) => {
        setActivePowerups([...active]);
      },
      onGameOver: (summary) => {
        setGameState('gameover');
        setLastSummary(summary);

        // Update High Score & Coins
        setHighScore((prev) => Math.max(prev, summary.score));
        setTotalCoins((prev) => prev + summary.coins);

        // Update Leaderboard
        setLeaderboard((prev) => {
          const newEntry: LeaderboardEntry = {
            id: 'player-' + Date.now(),
            name: 'You (' + summary.characterId + ')',
            characterId: summary.characterId,
            score: summary.score,
            distance: summary.distance,
            date: 'Just now',
            isPlayer: true,
          };
          return [newEntry, ...prev.filter((e) => !e.isPlayer)].slice(0, 10);
        });
      },
      onEvent: (type, amount) => {
        // Track Daily Challenges
        setChallenges((prev) => {
          let updated = false;
          const next = prev.map((ch) => {
            const clone = { ...ch };
            const didComplete = updateChallengeProgress(clone, {
              type: type as any,
              amount,
              characterId: selectedCharId,
            });
            if (didComplete || clone.current !== ch.current) {
              updated = true;
            }
            return clone;
          });
          return updated ? next : prev;
        });
      },
    });

    gameEngineRef.current = engine;

    // Check ?autostart=1 support for verification tests
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startRun();
      setGameState('playing');
    }

    return () => {
      engine.destroy();
      gameEngineRef.current = null;
    };
  }, []);

  // Update active character on engine
  useEffect(() => {
    if (gameEngineRef.current) {
      const activeChar = characters.find((c) => c.id === selectedCharId);
      if (activeChar) {
        gameEngineRef.current.setCharacter(activeChar);
      }
    }
  }, [selectedCharId, characters]);

  // Game Control Handlers
  const handleStartGame = () => {
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setRunCoins(0);
    setActivePowerups([]);
    gameEngineRef.current?.startRun();
  };

  const handlePause = () => {
    setGameState('paused');
    gameEngineRef.current?.pauseRun();
  };

  const handleResume = () => {
    setGameState('playing');
    gameEngineRef.current?.resumeRun();
  };

  const handleRestart = () => {
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setRunCoins(0);
    setActivePowerups([]);
    gameEngineRef.current?.startRun();
  };

  const handleHome = () => {
    setGameState('title');
    gameEngineRef.current?.returnToTitle();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMute(nextMuted);
  };

  // Character Locker Actions
  const handleSelectCharacter = (id: CharacterId) => {
    setSelectedCharId(id);
  };

  const handleSelectSkin = (skinId: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === selectedCharId ? { ...c, activeSkinId: skinId } : c))
    );
    gameEngineRef.current?.setSkin(skinId);
  };

  const handleUpgradeStat = (
    charId: CharacterId,
    stat: 'agility' | 'jump' | 'magnet' | 'multiplier'
  ) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;

    const currentLvl = char.stats[stat];
    const cost = currentLvl * 150;
    if (totalCoins < cost || currentLvl >= 5) return;

    setTotalCoins((prev) => prev - cost);
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              stats: {
                ...c.stats,
                [stat]: currentLvl + 1,
              },
            }
          : c
      )
    );
  };

  const handleUnlockCharacter = (charId: CharacterId) => {
    const char = characters.find((c) => c.id === charId);
    if (!char || totalCoins < char.unlockCost) return;

    setTotalCoins((prev) => prev - char.unlockCost);
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, unlocked: true } : c))
    );
    setSelectedCharId(charId);
  };

  const handleUnlockSkin = (charId: CharacterId, skinId: string) => {
    const char = characters.find((c) => c.id === charId);
    const skin = char?.skins.find((s) => s.id === skinId);
    if (!char || !skin || totalCoins < skin.cost) return;

    setTotalCoins((prev) => prev - skin.cost);
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              activeSkinId: skinId,
              skins: c.skins.map((s) => (s.id === skinId ? { ...s, unlocked: true } : s)),
            }
          : c
      )
    );
  };

  const handleClaimChallenge = (id: string) => {
    const ch = challenges.find((c) => c.id === id);
    if (!ch || !ch.completed || ch.claimed) return;

    setTotalCoins((prev) => prev + ch.rewardCoins);
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, claimed: true } : c))
    );
  };

  const hasUnclaimedChallenges = challenges.some((c) => c.completed && !c.claimed);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#0a0717]"
      data-state={gameState}
    >
      {/* Three.js Isolated Canvas Mount */}
      <div
        ref={canvasContainerRef}
        data-testid="threejs-canvas"
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Offline Mode Toast Indicator */}
      {!isOnline && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 font-bold text-xs shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Flight / Offline Mode Active</span>
        </div>
      )}

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          characters={characters}
          selectedCharacterId={selectedCharId}
          totalCoins={totalCoins}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onStartGame={handleStartGame}
          onOpenLocker={() => setShowLocker(true)}
          onOpenChallenges={() => setShowChallenges(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenVoice={() => setShowVoice(true)}
          onOpenMusic={() => setShowMusic(true)}
          hasUnclaimedChallenges={hasUnclaimedChallenges}
        />
      )}

      {/* Screen 2: Playing HUD */}
      {gameState === 'playing' && (
        <PlayingHUD
          score={score}
          distance={distance}
          coins={runCoins}
          multiplier={
            (activePowerups.some((p) => p.type === 'multiplier') ? 2 : 1) *
            ((characters.find((c) => c.id === selectedCharId)?.stats.multiplier ?? 1) >= 4 ? 1.5 : 1)
          }
          activePowerups={activePowerups}
          onPause={handlePause}
        />
      )}

      {/* Screen 3: Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          score={score}
          distance={distance}
          coins={runCoins}
          isMuted={isMuted}
          onResume={handleResume}
          onRestart={handleRestart}
          onHome={handleHome}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen 4: Game Over Modal */}
      {gameState === 'gameover' && lastSummary && (
        <GameOverModal
          summary={lastSummary}
          highScore={highScore}
          onPlayAgain={handleRestart}
          onHome={handleHome}
          onOpenLocker={() => setShowLocker(true)}
        />
      )}

      {/* Secondary Feature Modals */}
      {showLocker && (
        <CharacterLocker
          characters={characters}
          selectedCharacterId={selectedCharId}
          totalCoins={totalCoins}
          onSelectCharacter={handleSelectCharacter}
          onSelectSkin={handleSelectSkin}
          onUpgradeStat={handleUpgradeStat}
          onUnlockCharacter={handleUnlockCharacter}
          onUnlockSkin={handleUnlockSkin}
          onClose={() => setShowLocker(false)}
        />
      )}

      {showChallenges && (
        <DailyChallengesModal
          challenges={challenges}
          onClaim={handleClaimChallenge}
          onClose={() => setShowChallenges(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          entries={leaderboard}
          playerScore={highScore}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showVoice && (
        <VoiceCompanionModal
          characters={characters}
          selectedCharacterId={selectedCharId}
          onClose={() => setShowVoice(false)}
        />
      )}

      {showMusic && (
        <AIMusicModal onClose={() => setShowMusic(false)} />
      )}
    </main>
  );
}
