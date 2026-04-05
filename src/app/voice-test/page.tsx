"use client";

import { useRef, useState } from "react";
import SamJs from "sam-js";

const PRESETS: Record<string, { pitch: number; speed: number; mouth: number; throat: number }> = {
  "Default SAM": { pitch: 64, speed: 72, mouth: 128, throat: 128 },
  "Sbaitso Attempt 1 (deep slow)": { pitch: 42, speed: 62, mouth: 110, throat: 105 },
  "Sbaitso Attempt 2 (mid robotic)": { pitch: 52, speed: 72, mouth: 115, throat: 115 },
  "Sbaitso Attempt 3 (clinical)": { pitch: 48, speed: 68, mouth: 105, throat: 110 },
  "Sbaitso Attempt 4 (monotone)": { pitch: 55, speed: 75, mouth: 120, throat: 100 },
  "Sbaitso Attempt 5 (nasal)": { pitch: 60, speed: 70, mouth: 100, throat: 130 },
  "Sbaitso Attempt 6 (dark)": { pitch: 38, speed: 65, mouth: 128, throat: 95 },
  "Little Robot": { pitch: 60, speed: 92, mouth: 190, throat: 190 },
  "Stuffy Guy": { pitch: 72, speed: 82, mouth: 105, throat: 110 },
  "Extra Terrestrial": { pitch: 64, speed: 100, mouth: 200, throat: 150 },
};

const TEST_PHRASES = [
  "HELLO, MY NAME IS DOCTOR SBAITSO.",
  "I AM HERE TO HELP YOU.",
  "WHY DO YOU FEEL THAT WAY?",
  "THAT SOUNDS HEAVY. LET US TAKE ONE PIECE AT A TIME.",
  "SO, TELL ME ABOUT YOUR PROBLEMS.",
  "PARITY ERROR. PLEASE SPEAK CIVILLY.",
];

export default function VoiceTestPage() {
  const [pitch, setPitch] = useState(48);
  const [speed, setSpeed] = useState(68);
  const [mouth, setMouth] = useState(110);
  const [throat, setThroat] = useState(110);
  const [playing, setPlaying] = useState(false);
  const [customText, setCustomText] = useState("HELLO, MY NAME IS DOCTOR SBAITSO.");
  const abortRef = useRef<{ abort: (r: string) => void } | null>(null);

  async function speak(text: string) {
    if (abortRef.current) {
      abortRef.current.abort("new");
    }
    const sam = new SamJs({ pitch, speed, mouth, throat });
    setPlaying(true);
    try {
      const promise = sam.speak(text);
      abortRef.current = promise;
      await promise;
    } catch {}
    setPlaying(false);
  }

  function applyPreset(name: string) {
    const p = PRESETS[name];
    setPitch(p.pitch);
    setSpeed(p.speed);
    setMouth(p.mouth);
    setThroat(p.throat);
  }

  return (
    <main className="min-h-screen bg-[#05048a] text-white p-8 font-['More_Perfect_DOS_VGA']">
      <h1 className="text-2xl mb-6 tracking-wider">SAM VOICE TUNER</h1>
      <p className="text-white/60 text-sm mb-8">
        Compare with original: open classicreload.com/dr-sbaitso.html in another tab
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-[#f6f363] text-sm tracking-widest mb-4">PARAMETERS</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm">PITCH: {pitch}</label>
              <input type="range" min={0} max={255} value={pitch}
                onChange={(e) => setPitch(+e.target.value)}
                className="w-full" />
            </div>
            <div>
              <label className="text-sm">SPEED: {speed}</label>
              <input type="range" min={1} max={255} value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
                className="w-full" />
            </div>
            <div>
              <label className="text-sm">MOUTH: {mouth}</label>
              <input type="range" min={0} max={255} value={mouth}
                onChange={(e) => setMouth(+e.target.value)}
                className="w-full" />
            </div>
            <div>
              <label className="text-sm">THROAT: {throat}</label>
              <input type="range" min={0} max={255} value={throat}
                onChange={(e) => setThroat(+e.target.value)}
                className="w-full" />
            </div>
          </div>

          <h2 className="text-[#f6f363] text-sm tracking-widest mt-8 mb-3">PRESETS</h2>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map((name) => (
              <button key={name} onClick={() => applyPreset(name)}
                className="border border-white/30 px-3 py-1.5 text-xs hover:border-[#f6f363] hover:text-[#f6f363]">
                {name.toUpperCase()}
              </button>
            ))}
          </div>

          <h2 className="text-[#f6f363] text-sm tracking-widest mt-8 mb-3">CUSTOM TEXT</h2>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="w-full bg-[#0005b7] border border-white/30 p-3 text-sm text-white h-20 resize-none"
          />
          <button
            onClick={() => speak(customText)}
            disabled={playing}
            className="mt-2 border border-[#f6f363] bg-[#f6f363] px-5 py-2 text-sm text-[#05048a] hover:bg-transparent hover:text-[#f6f363] disabled:opacity-50"
          >
            {playing ? "SPEAKING..." : "SPEAK CUSTOM"}
          </button>
        </div>

        <div>
          <h2 className="text-[#f6f363] text-sm tracking-widest mb-4">TEST PHRASES</h2>
          <div className="space-y-3">
            {TEST_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => speak(phrase)}
                disabled={playing}
                className="block w-full text-left border border-white/20 p-3 text-sm hover:border-[#f6f363] hover:text-[#f6f363] disabled:opacity-50"
              >
                {phrase}
              </button>
            ))}
          </div>

          <div className="mt-8 border border-white/20 p-4">
            <h3 className="text-[#f6f363] text-xs tracking-widest mb-2">CURRENT SETTINGS</h3>
            <pre className="text-xs text-white/70">
{`{
  pitch: ${pitch},
  speed: ${speed},
  mouth: ${mouth},
  throat: ${throat}
}`}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
