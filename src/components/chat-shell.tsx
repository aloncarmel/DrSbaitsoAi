"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InteractiveTerminal } from "@/components/interactive-terminal";

const MAX_NEW_CHATS = 5;
const CHAT_COUNT_KEY = "dr_sbaitso_chat_count";
const CHAT_ACTIVE_KEY = "dr_sbaitso_chat_active";

type GateState =
  | { kind: "loading" }
  | { kind: "ready"; chatNumber: number }
  | { kind: "confirm"; remaining: number; nextChatNumber: number }
  | { kind: "blocked" };

export function ChatShell() {
  const [gate, setGate] = useState<GateState>({ kind: "loading" });
  const [terminalKey, setTerminalKey] = useState(0);

  useEffect(() => {
    let timeoutId = 0;
    const active = window.sessionStorage.getItem(CHAT_ACTIVE_KEY) === "1";
    const currentCount = Number.parseInt(
      window.localStorage.getItem(CHAT_COUNT_KEY) ?? "0",
      10,
    );
    const navigation = window.performance
      .getEntriesByType("navigation")
      .at(0) as PerformanceNavigationTiming | undefined;
    const isReload = navigation?.type === "reload";

    if (!active) {
      if (currentCount >= MAX_NEW_CHATS) {
        timeoutId = window.setTimeout(() => {
          setGate({ kind: "blocked" });
        }, 0);
        return;
      }

      const nextCount = currentCount + 1;
      window.localStorage.setItem(CHAT_COUNT_KEY, String(nextCount));
      window.sessionStorage.setItem(CHAT_ACTIVE_KEY, "1");
      timeoutId = window.setTimeout(() => {
        setTerminalKey(nextCount);
        setGate({ kind: "ready", chatNumber: nextCount });
      }, 0);
      return;
    }

    if (isReload) {
      if (currentCount >= MAX_NEW_CHATS) {
        timeoutId = window.setTimeout(() => {
          setGate({ kind: "blocked" });
        }, 0);
        return;
      }

      timeoutId = window.setTimeout(() => {
        setGate({
          kind: "confirm",
          remaining: MAX_NEW_CHATS - currentCount,
          nextChatNumber: currentCount + 1,
        });
      }, 0);
      return;
    }

    timeoutId = window.setTimeout(() => {
      setTerminalKey(currentCount || 1);
      setGate({ kind: "ready", chatNumber: Math.max(currentCount, 1) });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const modalCopy = useMemo(() => {
    if (gate.kind === "confirm") {
      return {
        title: "WARNING",
        body: `NEW CHATS REMAINING: ${gate.remaining}.`,
        detail:
          "REFRESHING THIS PAGE WILL WIPE YOUR PREVIOUS CONVERSATION AND START A NEW SESSION.",
      };
    }

    return {
      title: "SESSION LIMIT REACHED",
      body: "NO NEW CHATS REMAINING.",
      detail:
        "YOU HAVE REACHED THE CURRENT LIMIT OF FIVE NEW CHAT SESSIONS FOR THIS BROWSER.",
    };
  }, [gate]);

  function handleContinue() {
    if (gate.kind !== "confirm") {
      return;
    }

    window.localStorage.setItem(CHAT_COUNT_KEY, String(gate.nextChatNumber));
    window.sessionStorage.setItem(CHAT_ACTIVE_KEY, "1");
    setTerminalKey(gate.nextChatNumber);
    setGate({ kind: "ready", chatNumber: gate.nextChatNumber });
  }

  return (
    <main className="relative min-h-screen bg-[var(--color-dos-blue)]">
      {gate.kind === "ready" ? <InteractiveTerminal key={terminalKey} /> : null}

      {gate.kind === "loading" ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="border border-white/30 bg-[var(--color-dos-blue)] px-6 py-4 font-['More_Perfect_DOS_VGA'] text-[0.95rem] tracking-[0.08em] text-[#f6f363]">
            INITIALIZING SESSION ...
          </div>
        </div>
      ) : null}

      {gate.kind === "confirm" || gate.kind === "blocked" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0005b7]/80 px-5">
          <div className="w-full max-w-2xl border-2 border-white bg-[var(--color-dos-blue)] p-3 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
            <div className="border-2 border-white p-6 text-center">
              <p className="font-['More_Perfect_DOS_VGA'] text-[1rem] tracking-[0.16em] text-[#f6f363]">
                {modalCopy.title}
              </p>
              <p className="mt-6 font-['More_Perfect_DOS_VGA'] text-[1rem] leading-[1.8] tracking-[0.08em] text-white">
                {modalCopy.body}
              </p>
              <p className="mt-4 font-['More_Perfect_DOS_VGA'] text-[0.92rem] leading-[1.8] tracking-[0.06em] text-white/84">
                {modalCopy.detail}
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {gate.kind === "confirm" ? (
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="cursor-pointer border border-[#f6f363] bg-[#f6f363] px-5 py-3 font-['More_Perfect_DOS_VGA'] text-[0.9rem] tracking-[0.1em] text-[var(--color-dos-blue)] hover:bg-transparent hover:text-[#f6f363]"
                  >
                    START NEW CHAT
                  </button>
                ) : null}
                <Link
                  href="/"
                  className="cursor-pointer border border-white/30 px-5 py-3 font-['More_Perfect_DOS_VGA'] text-[0.9rem] tracking-[0.1em] text-white hover:border-white hover:text-[#f6f363]"
                >
                  RETURN HOME
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
