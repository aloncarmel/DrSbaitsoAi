"use client";

import { useRef, useState } from "react";
import SamJs from "sam-js";

const DEFAULT_INSTRUCTIONS = `Speak like an early 1990s PC hardware speech synthesizer — specifically the Creative Labs Sound Blaster "First Byte" text-to-speech engine.

Voice character:
- Male, low-pitched, monotone, nasally
- Sounds like speech is being squeezed through a narrow plastic tube
- Vowels are flat, slightly buzzy, almost humming
- Consonants are hard, clipped, with obvious stop boundaries between words
- No smoothing between words — each word is a distinct mechanical unit
- Zero emotion, zero warmth, zero personality
- Pitch stays almost completely flat — only the tiniest rise on question marks
- Slight metallic resonance, like speaking inside a tin can
- Pacing is deliberate and even — every word gets the same duration and emphasis
- Do not trail off at ends of sentences — stop abruptly

Think of a 1991 DOS program reading text aloud through an 8-bit Sound Blaster card at 11kHz. The voice should sound synthetic, artificial, and unmistakably computer-generated — not like a human trying to sound robotic.`;

const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"] as const;

const TEST_PHRASES = [
  "HELLO, MY NAME IS DOCTOR SBAITSO.",
  "I AM HERE TO HELP YOU.",
  "SAY WHATEVER IS IN YOUR MIND FREELY.",
  "OUR CONVERSATION WILL BE KEPT IN STRICT CONFIDENCE.",
  "WHY DO YOU FEEL THAT WAY?",
  "THAT SOUNDS HEAVY. LET US TAKE ONE PIECE AT A TIME.",
  "SO, TELL ME ABOUT YOUR PROBLEMS.",
  "PARITY ERROR. PLEASE SPEAK CIVILLY.",
];

const SAM_PRESETS: Record<string, { speed: number; pitch: number; mouth: number; throat: number }> = {
  "Dr Sbaitso (main)": { speed: 78, pitch: 55, mouth: 96, throat: 120 },
  "Dr Sbaitso (alt)": { speed: 80, pitch: 58, mouth: 100, throat: 124 },
  "Darker": { speed: 76, pitch: 52, mouth: 90, throat: 120 },
  "More robotic": { speed: 78, pitch: 55, mouth: 96, throat: 132 },
};

export default function TtsTestPage() {
  const [text, setText] = useState("HELLO, MY NAME IS DOCTOR SBAITSO.");
  const [voice, setVoice] = useState("onyx");
  const [speed, setSpeed] = useState(1.04);
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [loading, setLoading] = useState(false);
  const [samPlaying, setSamPlaying] = useState(false);
  const [samPreset, setSamPreset] = useState("Dr Sbaitso (main)");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalRef = useRef<HTMLAudioElement | null>(null);

  async function getToken() {
    try {
      const res = await fetch("/api/token");
      const data = await res.json();
      return data.token ?? "";
    } catch {
      return "";
    }
  }

  async function playOpenAI(phrase?: string) {
    const input = phrase ?? text;
    if (!input.trim()) return;
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch("/api/tts-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": token,
        },
        body: JSON.stringify({ input, voice, speed, instructions }),
      });

      if (!res.ok) {
        alert("TTS failed: " + (await res.text()));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      alert("Error: " + e);
    } finally {
      setLoading(false);
    }
  }

  function playOriginal() {
    if (originalRef.current) {
      originalRef.current.currentTime = 0;
      originalRef.current.play();
    }
  }

  async function playSam(phrase?: string) {
    const input = phrase ?? text;
    if (!input.trim()) return;
    setSamPlaying(true);
    const preset = SAM_PRESETS[samPreset];
    const sam = new SamJs(preset);
    try {
      await sam.speak(input);
    } catch {}
    setSamPlaying(false);
  }

  return (
    <main className="min-h-screen bg-[#05048a] text-white p-6 font-['More_Perfect_DOS_VGA']">
      <h1 className="text-2xl mb-2 tracking-wider">VOICE TUNING LAB</h1>
      <p className="text-white/50 text-xs mb-6">A/B compare: Original WAV vs OpenAI TTS vs SAM</p>

      {/* Original reference */}
      <div className="border border-[#f6f363] p-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[#f6f363] text-sm tracking-widest">ORIGINAL DR. SBAITSO VOICE</h2>
          <button onClick={playOriginal}
            className="border border-[#f6f363] bg-[#f6f363] px-4 py-1.5 text-xs text-[#05048a] hover:bg-transparent hover:text-[#f6f363]">
            PLAY ORIGINAL
          </button>
        </div>
        <p className="text-white/40 text-xs mt-2">Reference: &quot;HELLO, MY NAME IS DOCTOR SBAITSO&quot;</p>
        <audio ref={originalRef} src="/audio/original-sbaitso.wav" preload="auto" />
      </div>

      {/* Custom text */}
      <div className="mb-6">
        <label className="text-xs text-white/60">CUSTOM TEXT</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          className="w-full bg-[#0005b7] border border-white/30 p-3 text-sm text-white h-16 resize-none mt-1" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* OpenAI TTS */}
        <div className="border border-white/20 p-5">
          <h2 className="text-[#f6f363] text-sm tracking-widest mb-4">OPENAI TTS</h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-white/60">VOICE</label>
              <select value={voice} onChange={(e) => setVoice(e.target.value)}
                className="w-full bg-[#0005b7] border border-white/30 p-2 text-xs text-white mt-1">
                {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60">SPEED: {speed.toFixed(2)}</label>
              <input type="range" min={0.25} max={4.0} step={0.01} value={speed}
                onChange={(e) => setSpeed(+e.target.value)} className="w-full mt-3" />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-white/60">VOICE INSTRUCTIONS (editable)</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-[#0005b7] border border-white/30 p-2 text-xs text-white h-40 resize-y mt-1 leading-relaxed" />
          </div>

          <button onClick={() => playOpenAI()} disabled={loading}
            className="w-full border border-[#f6f363] bg-[#f6f363] px-4 py-2 text-xs text-[#05048a] hover:bg-transparent hover:text-[#f6f363] disabled:opacity-50 mb-3">
            {loading ? "GENERATING..." : "SPEAK WITH OPENAI"}
          </button>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {TEST_PHRASES.map((p) => (
              <button key={p} onClick={() => playOpenAI(p)} disabled={loading}
                className="block w-full text-left border border-white/10 p-2 text-xs hover:border-[#f6f363] hover:text-[#f6f363] disabled:opacity-50">
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* SAM */}
        <div className="border border-white/20 p-5">
          <h2 className="text-[#f6f363] text-sm tracking-widest mb-4">SAM (CLIENT-SIDE)</h2>

          <div className="mb-3">
            <label className="text-xs text-white/60">PRESET</label>
            <select value={samPreset} onChange={(e) => setSamPreset(e.target.value)}
              className="w-full bg-[#0005b7] border border-white/30 p-2 text-xs text-white mt-1">
              {Object.keys(SAM_PRESETS).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="text-xs text-white/30 mt-1">{JSON.stringify(SAM_PRESETS[samPreset])}</div>
          </div>

          <button onClick={() => playSam()} disabled={samPlaying}
            className="w-full border border-[#f6f363] bg-[#f6f363] px-4 py-2 text-xs text-[#05048a] hover:bg-transparent hover:text-[#f6f363] disabled:opacity-50 mb-3">
            {samPlaying ? "SPEAKING..." : "SPEAK WITH SAM"}
          </button>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {TEST_PHRASES.map((p) => (
              <button key={p} onClick={() => playSam(p)} disabled={samPlaying}
                className="block w-full text-left border border-white/10 p-2 text-xs hover:border-[#f6f363] hover:text-[#f6f363] disabled:opacity-50">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
