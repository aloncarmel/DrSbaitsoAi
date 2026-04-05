"use client";

import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import {
  applyModelError,
  applyModelReply,
  createInitialSession,
  submitTerminalInput,
} from "@/lib/core/session";

const DOS_THEME = {
  background: "#0005B7",
  foreground: "#FFFFFF",
  cursor: "#FFFFFF",
  selectionBackground: "rgba(255,255,255,0.28)",
};

const ANSI = {
  reset: "\x1b[0m",
  white: "\x1b[37m",
  brightWhite: "\x1b[97m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  userYellow: "\x1b[38;2;246;243;99m",
} as const;

function extractHistory(lines: string[]): { role: string; content: string }[] {
  const history: { role: string; content: string }[] = [];
  let assistantBuffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith("> ")) {
      if (assistantBuffer.length > 0) {
        history.push({ role: "assistant", content: assistantBuffer.join("\n") });
        assistantBuffer = [];
      }
      history.push({ role: "user", content: line.slice(2) });
    } else if (line.trim() && !line.startsWith("PLEASE ENTER") && !line.startsWith("Please enter")) {
      assistantBuffer.push(line);
    }
  }
  if (assistantBuffer.length > 0) {
    history.push({ role: "assistant", content: assistantBuffer.join("\n") });
  }
  return history.slice(-20);
}

async function fetchSessionToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/token");
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function InteractiveTerminal() {
  const [session, setSession] = useState(createInitialSession);
  const [pendingAudio, setPendingAudio] = useState<ArrayBuffer | null>(null);
  const isMobileRef = useRef(false);
  const sessionTokenRef = useRef<string | null>(null);
  const tokenExpiresRef = useRef<number>(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const letterBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const letterLoadedRef = useRef(false);
  const [currentInput, setCurrentInput] = useState("");
  const [ephemeralLines, setEphemeralLines] = useState<string[]>([]);
  const [loadingPhase, setLoadingPhase] = useState<"processing" | "synth" | null>(
    null,
  );
  const sessionRef = useRef(session);
  const currentInputRef = useRef(currentInput);
  const ephemeralLinesRef = useRef(ephemeralLines);
  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastSpokenIdRef = useRef<number | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const modelAbortRef = useRef<AbortController | null>(null);
  const handleSubmitRef = useRef<(submittedInput: string) => void>(() => {});
  const playSpeechRef = useRef<(text: string) => Promise<void>>(async () => {});

  async function getToken(): Promise<string> {
    if (sessionTokenRef.current && Date.now() < tokenExpiresRef.current - 30_000) {
      return sessionTokenRef.current;
    }
    const token = await fetchSessionToken();
    if (token) {
      sessionTokenRef.current = token;
      const dotIdx = token.indexOf(".");
      tokenExpiresRef.current = parseInt(token.slice(0, dotIdx), 10);
    }
    return token ?? "";
  }

  async function preloadLetterSounds() {
    if (letterLoadedRef.current) return;
    letterLoadedRef.current = true;

    const ctx = await ensureAudioContext();
    if (!ctx) return;

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    await Promise.all(
      letters.split("").map(async (letter) => {
        try {
          const res = await fetch(`/audio/letters/${letter}.wav`);
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          letterBuffersRef.current.set(letter, decoded);
        } catch {}
      }),
    );
  }

  function playLetterSound(char: string) {
    const letter = char.toUpperCase();
    const buffer = letterBuffersRef.current.get(letter);
    if (!buffer || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.7;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  }

  async function requestModelReply(inputText: string, snapshot: typeof session) {
    const controller = new AbortController();
    modelAbortRef.current = controller;
    setLoadingPhase("processing");
    setEphemeralLines(["PLEASE WAIT", "PROCESSING ."]);

    try {
      const token = await getToken();
      const response = await fetch("/api/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": token,
        },
        body: JSON.stringify({
          input: inputText.slice(0, 1000),
          mode: snapshot.mode,
          name: snapshot.name,
          questionsRemaining: snapshot.questionBudget,
          history: extractHistory(snapshot.lines),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setEphemeralLines([]);
        setSession((current) => applyModelError(current));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const parsed = parseSseChunk(chunk);

          if (!parsed) {
            continue;
          }

          if (parsed.type === "response.output_text.delta") {
            const delta = typeof parsed.delta === "string" ? parsed.delta : "";
            if (delta) {
              finalText += delta;
            }
          }

          if (parsed.type === "response.completed") {
            await finalizeModelReply(finalText.trim(), true);
            return;
          }

          if (parsed.type === "error" || parsed.type === "response.failed") {
            setEphemeralLines([]);
            setSession((current) => applyModelError(current));
            return;
          }
        }
      }

      await finalizeModelReply(finalText.trim(), true);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setLoadingPhase(null);
      setEphemeralLines([]);
      setSession((current) => applyModelError(current));
    } finally {
      if (modelAbortRef.current === controller) {
        modelAbortRef.current = null;
      }
    }
  }

  async function finalizeModelReply(finalText: string, playSpeechAfter = false) {
    if (!finalText) {
      setLoadingPhase(null);
      setEphemeralLines([]);
      setSession((current) => applyModelError(current));
      return;
    }

    let audioData: ArrayBuffer | null = null;

    if (playSpeechAfter && sessionRef.current.voiceEnabled) {
      setLoadingPhase("synth");
      setEphemeralLines(["PLEASE WAIT", "SYNTHESIZER INITIALIZING"]);
      audioData = await fetchSpeechAudio(finalText);
    }

    setLoadingPhase(null);
    setEphemeralLines([]);
    setSession((current) => applyModelReply(current, finalText, { withSpeech: false }));

    if (audioData) {
      await playAudioBuffer(audioData);
    }
  }

  function renderTerminal(lines: string[], input: string, inFlightReply: string[]) {
    const term = terminalRef.current;

    if (!term) {
      return;
    }

    const visibleLines = [...lines, ...inFlightReply];
    const cols = term.cols;
    const rows = term.rows;
    const { screen, cursorRow, cursorCol } = buildDosScreen(
      cols,
      rows,
      visibleLines,
      input,
    );

    term.write("\x1b[?25l");
    term.write("\x1b[2J\x1b[H");
    term.write(screen.join("\r\n"));
    term.write(`\x1b[${cursorRow + 1};${cursorCol + 1}H`);
    term.write("\x1b[?25h");
  }

  function stopAudio() {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {}
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
  }

  async function fetchSpeechAudio(text: string): Promise<ArrayBuffer | null> {
    const controller = new AbortController();
    requestAbortRef.current = controller;

    try {
      const token = await getToken();
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": token,
        },
        body: JSON.stringify({ input: text.slice(0, 500) }),
        signal: controller.signal,
      });

      if (!response.ok) return null;
      return response.arrayBuffer();
    } catch {
      return null;
    }
  }

  function playViaAudioElement(audioData: ArrayBuffer) {
    const blob = new Blob([audioData], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      URL.revokeObjectURL(audioElementRef.current.src);
    }
    const audio = new Audio(url);
    (audio as unknown as Record<string, boolean>).playsInline = true;
    audioElementRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioElementRef.current = null;
    };
    audio.play().catch(() => {});
  }

  async function playAudioBuffer(audioData: ArrayBuffer) {
    // On mobile, queue audio for play button
    if (isMobileRef.current) {
      setPendingAudio(audioData.slice(0));
      return;
    }

    const context = await ensureAudioContext();
    if (!context) return;
    if (context.state === "suspended") await context.resume();

    const decoded = await context.decodeAudioData(audioData.slice(0));
    const source = context.createBufferSource();
    source.buffer = decoded;
    source.connect(context.destination);

    audioSourceRef.current = source;
    source.onended = () => {
      if (audioSourceRef.current === source) {
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
    };
    source.start(0);
  }

  async function playSpeechElevenLabs(text: string) {
    stopAudio();
    setLoadingPhase("synth");
    setEphemeralLines(["PLEASE WAIT", "SYNTHESIZER INITIALIZING"]);

    const audioData = await fetchSpeechAudio(text);

    setLoadingPhase(null);
    setEphemeralLines([]);

    if (audioData) {
      await playAudioBuffer(audioData);
    }
  }

  async function ensureAudioContext() {
    if (!audioContextRef.current) {
      const AudioContextCtor =
        window.AudioContext ||
        // @ts-expect-error Safari
        window.webkitAudioContext;

      if (!AudioContextCtor) {
        return null;
      }

      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  async function playSpeech(text: string) {
    await playSpeechElevenLabs(text);
  }

  function handleSubmit(submittedInput: string) {
    if (!submittedInput.trim()) {
      return;
    }

    // Warm up AudioContext during user gesture (required for mobile)
    void ensureAudioContext();
    setPendingAudio(null);

    stopAudio();
    modelAbortRef.current?.abort();
    setLoadingPhase(null);
    setEphemeralLines([]);

    const next = submitTerminalInput(sessionRef.current, submittedInput);
    setSession(next.session);
    setCurrentInput("");

    if (next.streamedLines?.length) {
      void revealLocalLines(next.streamedLines, next.speechText);
      return;
    }

    if (next.modelInput) {
      void requestModelReply(next.modelInput, next.session);
    }
  }

  async function revealLocalLines(lines: string[], speechText?: string) {
    let audioData: ArrayBuffer | null = null;

    if (speechText && sessionRef.current.voiceEnabled) {
      setLoadingPhase("synth");
      setEphemeralLines(["PLEASE WAIT", "SYNTHESIZER INITIALIZING"]);
      audioData = await fetchSpeechAudio(speechText);
    }

    setLoadingPhase(null);
    setEphemeralLines([]);
    setSession((current) => ({
      ...current,
      lines: [...current.lines, ...lines],
      speech: null,
    }));

    if (audioData) {
      await playAudioBuffer(audioData);
    }
  }

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useEffect(() => {
    playSpeechRef.current = playSpeech;
  });

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    currentInputRef.current = currentInput;
  }, [currentInput]);

  useEffect(() => {
    ephemeralLinesRef.current = ephemeralLines;
  }, [ephemeralLines]);

  useEffect(() => {
    if (!terminalHostRef.current || terminalRef.current) {
      return;
    }

    let frameId = 0;
    let settleTimeoutId = 0;

    const syncTerminalMetrics = () => {
      const hostWidth = terminalHostRef.current?.clientWidth ?? window.innerWidth;
      const nextFontSize =
        hostWidth <= 420 ? 10 : hostWidth <= 640 ? 12 : hostWidth <= 900 ? 14 : 18;

      term.options.fontSize = nextFontSize;
    };

    const fitAndRender = () => {
      syncTerminalMetrics();
      fitAddon.fit();
      renderTerminal(
        sessionRef.current.lines,
        currentInputRef.current,
        ephemeralLinesRef.current,
      );
    };

    const scheduleStableFit = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      if (settleTimeoutId) {
        window.clearTimeout(settleTimeoutId);
      }

      frameId = window.requestAnimationFrame(() => {
        fitAndRender();
        settleTimeoutId = window.setTimeout(() => {
          fitAndRender();
        }, 40);
      });
    };

    const term = new Terminal({
      theme: DOS_THEME,
      fontFamily: '"More Perfect DOS VGA", "Courier New", monospace',
      fontSize: 18,
      fontWeight: "400",
      lineHeight: 1,
      letterSpacing: 0,
      cursorBlink: true,
      allowTransparency: false,
      convertEol: true,
      disableStdin: false,
      scrollback: 0,
      tabStopWidth: 2,
    });
    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.open(terminalHostRef.current);
    scheduleStableFit();
    term.focus();
    isMobileRef.current = isMobileDevice();

    // Unlock AudioContext on first touch (required for iOS/mobile)
    const unlockAudio = () => {
      void ensureAudioContext().then(() => preloadLetterSounds());
    };
    terminalHostRef.current.addEventListener("touchstart", unlockAudio, { once: true });
    terminalHostRef.current.addEventListener("click", unlockAudio, { once: true });

    // Preload letter sounds for desktop
    void ensureAudioContext().then(() => preloadLetterSounds());

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      if (data === "\r") {
        handleSubmitRef.current(currentInputRef.current);
        return;
      }

      if (data === "\u007F") {
        setCurrentInput((value) => value.slice(0, -1));
        return;
      }

      if (data === "\u0003") {
        modelAbortRef.current?.abort();
        stopAudio();
        setLoadingPhase(null);
        setEphemeralLines([]);
        setCurrentInput("");
        return;
      }

      if (data >= " " && data !== "\u007f") {
        void ensureAudioContext();
        // Play letter sound during NAME phase
        if (sessionRef.current.phase === "NAME" && /^[a-zA-Z]$/.test(data)) {
          playLetterSound(data);
        }
        setCurrentInput((value) => `${value}${data}`);
      }
    });

    const observer = new ResizeObserver(() => {
      scheduleStableFit();
    });

    observer.observe(terminalHostRef.current);
    resizeObserverRef.current = observer;

    void document.fonts
      .load('16px "More Perfect DOS VGA"')
      .then(() => {
        scheduleStableFit();
      })
      .catch(() => {});

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (settleTimeoutId) {
        window.clearTimeout(settleTimeoutId);
      }
      observer.disconnect();
      modelAbortRef.current?.abort();
      stopAudio();
      term.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    renderTerminal(session.lines, currentInput, ephemeralLines);
  }, [session.lines, currentInput, ephemeralLines]);

  useEffect(() => {
    if (loadingPhase !== "processing") {
      return;
    }

    const frames = [
      "PROCESSING .  ",
      "PROCESSING .. ",
      "PROCESSING ...",
      "PROCESSING  ..",
    ];
    let index = 0;

    const interval = window.setInterval(() => {
      index = (index + 1) % frames.length;
      setEphemeralLines(["PLEASE WAIT", frames[index]]);
    }, 140);

    return () => window.clearInterval(interval);
  }, [loadingPhase]);

  useEffect(() => {
    if (!session.speech) {
      return;
    }

    if (!session.voiceEnabled && !session.speech.force) {
      return;
    }

    if (lastSpokenIdRef.current === session.speech.id) {
      return;
    }

    lastSpokenIdRef.current = session.speech.id;
    void playSpeechRef.current(session.speech.text);
  }, [session.speech, session.voiceEnabled]);

    return (
    <div className="relative h-[100svh] w-full bg-[var(--color-dos-blue)]">
      <div
        ref={terminalHostRef}
        className="dos-terminal-host h-full w-full"
      />
      {pendingAudio && (
        <button
          type="button"
          onClick={() => {
            playViaAudioElement(pendingAudio);
            setPendingAudio(null);
          }}
          className="absolute bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#f6f363] bg-[#f6f363] shadow-lg active:scale-95"
          aria-label="Play speech"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M8 5v14l11-7L8 5z" fill="#0005B7" />
          </svg>
        </button>
      )}
    </div>
  );
}

function parseSseChunk(chunk: string) {
  const dataLines = chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);

  if (dataLines.length === 0) {
    return null;
  }

  const data = dataLines.join("\n");

  if (data === "[DONE]") {
    return { type: "response.completed" };
  }

  try {
    return JSON.parse(data) as {
      type?: string;
      delta?: string;
    };
  } catch {
    return null;
  }
}

function buildDosScreen(
  cols: number,
  rows: number,
  contentLines: string[],
  input: string,
) {
  const safeCols = cols > 0 ? cols : 40;
  const safeRows = rows > 0 ? rows : 20;
  const outerPadding = safeCols < 56 ? 1 : 2;
  const innerWidth = safeCols - outerPadding * 2 - 2;
  const screen = Array.from({ length: safeRows }, () => " ".repeat(safeCols));
  const leftPad = " ".repeat(outerPadding);
  const contentWidth = Math.max(safeCols - outerPadding * 2, 1);

  screen[0] = blankLine(safeCols);
  screen[1] = `${leftPad}${boxTop(innerWidth)}${leftPad}`;
  screen[2] = `${leftPad}${buildHeaderTitleLine(innerWidth)}${leftPad}`;
  screen[3] = `${leftPad}${buildDividerLine(innerWidth)}${leftPad}`;
  screen[4] = `${leftPad}${buildCopyrightLine(innerWidth)}${leftPad}`;
  screen[5] = `${leftPad}${boxBottom(innerWidth)}${leftPad}`;
  screen[6] = blankLine(safeCols);

  const allWrapped = contentLines.flatMap((line) => wrapTranscriptLine(line, contentWidth));
  const availableRows = safeRows - 7 - 2;
  const visibleLines =
    allWrapped.length > availableRows
      ? allWrapped.slice(allWrapped.length - availableRows)
      : allWrapped;
  let row = 7;
  for (const line of visibleLines) {
    if (row >= safeRows - 2) {
      break;
    }

    const renderedLine = line.startsWith("> ")
      ? `${ANSI.userYellow}${line.padEnd(contentWidth, " ")}${ANSI.reset}`
      : line.padEnd(contentWidth, " ");
    screen[row] = `${leftPad}${renderedLine}${leftPad}`;
    row += 1;
  }

  const shouldSeparatePrompt =
    visibleLines.length > 0 && visibleLines[visibleLines.length - 1] !== "";
  const promptRow = Math.min(row + (shouldSeparatePrompt ? 1 : 0), safeRows - 1);
  const promptText = buildPromptText(input, contentWidth);
  screen[promptRow] =
    `${leftPad}${ANSI.userYellow}${promptText.padEnd(contentWidth, " ")}${ANSI.reset}${leftPad}`;

  return {
    screen,
    cursorRow: promptRow,
    cursorCol: Math.min(outerPadding + promptText.length, safeCols - outerPadding - 1),
  };
}

function boxTop(width: number) {
  return `${ANSI.brightWhite}╔${"═".repeat(Math.max(width - 2, 0))}╗${ANSI.reset}`;
}

function boxBottom(width: number) {
  return `${ANSI.brightWhite}╚${"═".repeat(Math.max(width - 2, 0))}╝${ANSI.reset}`;
}

function buildHeaderTitleLine(width: number) {
  const innerWidth = Math.max(width - 2, 0);
  const left = "Sound Blaster";
  const centerPrimary = "D R   S B A I T S O";
  const centerCompact = "DR SBAITSO";
  const right = "version GPT 5.4 mini";
  const center =
    innerWidth >= left.length + centerPrimary.length + right.length + 8
      ? centerPrimary
      : innerWidth >= left.length + centerCompact.length + right.length + 6
        ? centerCompact
        : "";
  const plain = layoutHeaderLine(left, center, right, innerWidth);

  const leftStart = plain.indexOf(left);
  const centerStart = plain.indexOf(center);
  const rightStart = plain.indexOf(right);

  return (
    ANSI.brightWhite +
    "║" +
    ANSI.reset +
    colorizeSegments(plain, [
      { start: leftStart, text: left, color: ANSI.brightWhite },
      ...(center
        ? [{ start: centerStart, text: center, color: ANSI.yellow as string }]
        : []),
      { start: rightStart, text: right, color: ANSI.brightWhite },
    ]) +
    ANSI.brightWhite +
    "║" +
    ANSI.reset
  );
}

function buildDividerLine(width: number) {
  return `${ANSI.brightWhite}╟${"─".repeat(Math.max(width - 2, 0))}╢${ANSI.reset}`;
}

function buildCopyrightLine(width: number) {
  const innerWidth = Math.max(width - 2, 0);
  const text = centerPlainText(
    "(c) Copyright Creative Labs, Inc. 1996, all rights reserved",
    innerWidth,
  );

  return `${ANSI.brightWhite}║${ANSI.reset}${ANSI.green}${text}${ANSI.reset}${ANSI.brightWhite}║${ANSI.reset}`;
}

function centerPlainText(text: string, width: number) {
  const trimmed = text.slice(0, width);
  const pad = Math.max(Math.floor((width - trimmed.length) / 2), 0);
  return `${" ".repeat(pad)}${trimmed}${" ".repeat(Math.max(width - trimmed.length - pad, 0))}`;
}

function colorizeSegments(
  base: string,
  segments: Array<{ start: number; text: string; color: string }>,
) {
  let result = "";
  let cursor = 0;

  for (const segment of [...segments].sort((a, b) => a.start - b.start)) {
    if (segment.start < 0) {
      continue;
    }

    result += base.slice(cursor, segment.start);
    result += `${segment.color}${segment.text}${ANSI.reset}`;
    cursor = segment.start + segment.text.length;
  }

  result += base.slice(cursor);
  return result;
}

function layoutHeaderLine(left: string, center: string, right: string, width: number) {
  if (!center) {
    const joined = `${left}${" ".repeat(Math.max(width - left.length - right.length, 1))}${right}`;
    return truncate(joined, width);
  }

  const base = Array.from({ length: width }, () => " ");
  const leftStart = 0;
  const rightStart = Math.max(width - right.length, 0);
  let centerStart = Math.max(Math.floor((width - center.length) / 2), 0);

  if (centerStart < left.length + 2) {
    centerStart = left.length + 2;
  }

  if (centerStart + center.length > rightStart - 2) {
    centerStart = Math.max(rightStart - center.length - 2, left.length + 2);
  }

  writeAt(base, leftStart, left);
  writeAt(base, centerStart, center);
  writeAt(base, rightStart, right);

  return base.join("");
}

function writeAt(buffer: string[], start: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    const target = start + index;

    if (target >= 0 && target < buffer.length) {
      buffer[target] = text[index];
    }
  }
}

function blankLine(width: number) {
  return " ".repeat(width);
}

function truncate(text: string, width: number) {
  return text.slice(0, width).padEnd(width, " ");
}

function wrapTranscriptLine(line: string, width: number) {
  if (!line) {
    return [""];
  }

  if (line.length <= width) {
    return [line];
  }

  const segments: string[] = [];
  let start = 0;

  while (start < line.length) {
    segments.push(line.slice(start, start + width));
    start += width;
  }

  return segments;
}

function buildPromptText(input: string, width: number) {
  const prefix = "> ";
  const available = Math.max(width - prefix.length, 0);

  if (input.length <= available) {
    return `${prefix}${input}`;
  }

  return `${prefix}${input.slice(input.length - available)}`;
}
