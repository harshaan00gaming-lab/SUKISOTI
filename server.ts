import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize GoogleGenAI client with server-side API key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Character Voice Chat endpoint
app.post('/api/voice-chat', async (req, res) => {
  try {
    const { message, characterId, characterName, characterTrait } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      // Fallback response if API key is not present
      let reply = `Keep your eyes on the rails! Timing your jump over hurdles and sliding under high barriers will keep your score soaring.`;
      if (characterId === 'ravneet') {
        reply = `With my piercing green eyes and high vault leap, remember you can jump right onto the roofs of oncoming trains to bypass crowded tracks!`;
      } else if (characterId === 'noor') {
        reply = `My slim silhouette lets us switch lanes in the blink of an eye. Always swipe early before tight corners!`;
      } else if (characterId === 'jass') {
        reply = `My skin naturally glows to guide your path in the shadows, and our energy shield will protect you through the toughest speed bursts.`;
      }
      return res.json({ reply });
    }

    const systemPrompt = `You are ${characterName}, a charismatic and athletic playable character in the cozy 3D endless runner game SUKISOTI.
Your traits:
- Character ID: ${characterId}
- Identity: ${characterTrait}
${characterId === 'ravneet' ? '- You have striking emerald green eyes and unmatched vertical jump power.' : ''}
${characterId === 'noor' ? '- You are slim, lightning-agile, and an urban street artist.' : ''}
${characterId === 'jass' ? '- Your skin has a luminous natural glow that lights up dark tracks, and you specialize in speed shields.' : ''}

Give a direct, energetic, warm, and concise response (max 2-3 sentences) to the player's message or question about Subway Surfers style running, jumping hurdles, sliding under high clearance barriers, or dodging trains. Speak in character!`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message || 'Give me a run tip!',
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const reply = response.text?.trim() || `Keep up the pace! Together we'll break every high score on the tracks!`;
    res.json({ reply });
  } catch (error: any) {
    console.error('Voice chat error:', error?.message);
    res.status(500).json({ error: 'Failed to generate voice response' });
  }
});

// Generate Music endpoint
app.post('/api/generate-music', async (req, res) => {
  try {
    const { prompt, preset } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        trackSummary: `Procedural cozy ${preset || 'synth'} soundtrack tuned to 118 BPM with warm analog filters and pentatonic chime arpeggios.`,
        mode: 'offline_procedural',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Describe a vibrant, cozy retro-futuristic synth music theme for an endless runner track based on: "${prompt}". Provide a brief 1-2 sentence atmospheric summary of the instruments, chords, and groove.`,
    });

    const trackSummary = response.text?.trim() || 'Cozy analog synth chords with dreamy filtered basslines and sparkling arpeggios.';
    res.json({ trackSummary, mode: 'gemini_generated' });
  } catch (error: any) {
    console.error('Music generation error:', error?.message);
    res.json({
      trackSummary: 'Cozy analog synth chords with warm tape saturation and melodic arpeggios.',
      mode: 'procedural_fallback',
    });
  }
});

async function startServer() {
  if (!isProduction) {
    // Mount Vite middlewares in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SUKISOTI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
