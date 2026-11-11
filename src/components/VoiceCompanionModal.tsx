import React, { useState, useRef, useEffect } from 'react';
import { CharacterId, CharacterInfo } from '../types/game';
import { X, Mic, Send, Volume2, Sparkles, MessageCircle, Bot } from 'lucide-react';
import { soundManager } from '../audio/synth';

interface VoiceCompanionModalProps {
  characters: CharacterInfo[];
  selectedCharacterId: CharacterId;
  onClose: () => void;
}

interface Message {
  sender: 'player' | 'character';
  text: string;
}

export const VoiceCompanionModal: React.FC<VoiceCompanionModalProps> = ({
  characters,
  selectedCharacterId,
  onClose,
}) => {
  const activeChar = characters.find((c) => c.id === selectedCharacterId) || characters[0];
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'character',
      text: `Hey! I'm ${activeChar.name}. Ready to sprint through the tracks together? Ask me for run tips, obstacle timing, or how to master my abilities!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = activeChar.id === 'noor' ? 1.2 : activeChar.id === 'ravneet' ? 1.05 : 1.15;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    soundManager.playButton();
    const newMessages: Message[] = [...messages, { sender: 'player', text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          characterId: activeChar.id,
          characterName: activeChar.name,
          characterTrait: activeChar.trait,
        }),
      });

      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const reply = data.reply || `${activeChar.name}: Let's keep running at full speed!`;

      setMessages([...newMessages, { sender: 'character', text: reply }]);
      speakText(reply);
    } catch {
      // Graceful offline fallback response
      let fallback = `Keep your eyes on the rails! As ${activeChar.name}, timing your jump over hurdles and sliding under high barriers will keep your score soaring.`;
      if (activeChar.id === 'ravneet') {
        fallback = "With my green eyes and vertical leap, remember you can jump right onto the train roofs to escape crowded lanes!";
      } else if (activeChar.id === 'jass') {
        fallback = "My glowing skin gives us extra shield protection, so don't fear tight speed sections!";
      }

      setMessages([...newMessages, { sender: 'character', text: fallback }]);
      speakText(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice speech-to-text is not supported in this browser. Please type your message.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-5 z-40 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#130d29] border border-[#3e2c69] flex flex-col shadow-2xl overflow-hidden h-[85vh] max-h-[640px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d1e4f] bg-[#171033]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Chat with {activeChar.name}
                </h2>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                  Voice Companion
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {activeChar.voiceStyle}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playButton();
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.sender === 'player' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  m.sender === 'player'
                    ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white rounded-tr-none'
                    : 'bg-[#1b1238] border border-[#38265e] text-slate-200 rounded-tl-none'
                }`}
              >
                {m.text}
              </div>

              {m.sender === 'character' && (
                <button
                  onClick={() => speakText(m.text)}
                  className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 hover:text-pink-400 px-1 transition"
                >
                  <Volume2 className="w-3 h-3" /> Replay Voice
                </button>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
              <span>{activeChar.name} is thinking...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-[#251745] bg-[#100924] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            'Best jump timing?',
            'How to get more coins?',
            'What is your special ability?',
            'How to survive fast trains?',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[10px] px-2.5 py-1 rounded-full bg-[#1e133d] border border-[#382463] text-slate-300 hover:text-white hover:border-pink-500/50 whitespace-nowrap shrink-0 transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#2d1e4f] bg-[#150d30] flex items-center gap-2">
          <button
            onClick={startVoiceInput}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-[#221642] text-slate-300 hover:text-white border border-[#3a2761]'
            }`}
            title="Speak into Microphone"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Talk with ${activeChar.name}...`}
            className="flex-1 bg-[#0f0921] border border-[#2d1e4f] focus:border-pink-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-amber-500 disabled:opacity-50 flex items-center justify-center text-white transition active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
