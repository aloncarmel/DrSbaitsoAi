import { terminalTheme } from "@/lib/terminal/theme";

type DosTerminalShellProps = {
  lines: string[];
  inputValue?: string;
  compact?: boolean;
  focused?: boolean;
  questionsRemaining?: number;
};

export function DosTerminalShell({
  lines,
  inputValue = "",
  compact = false,
  focused = true,
  questionsRemaining,
}: DosTerminalShellProps) {
  return (
    <section
      className={`flex flex-col border-2 border-white bg-[var(--color-dos-blue)] text-white ${compact ? "min-h-[420px]" : "min-h-screen"}`}
      style={{ backgroundColor: terminalTheme.background }}
    >
      <div className="border-b-2 border-white p-1 sm:p-2">
        <div className="flex items-center justify-between border border-white px-2 py-1 font-mono text-[0.6rem] leading-5 tracking-[0.18em] text-white sm:px-4 sm:text-[0.72rem]">
          <span>SOUND BLASTER</span>
          <span>D R&nbsp;&nbsp;S B A I T S O</span>
          <span>VERSION 2.20</span>
        </div>
        <div className="mt-1 border border-white px-2 py-1 text-center font-mono text-[0.58rem] leading-5 tracking-[0.16em] text-[#6fffb0] sm:px-4 sm:text-[0.72rem]">
          (C) CREATIVE LABS, INC. 1992. ALL RIGHTS RESERVED
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-2 py-3 font-mono text-white sm:px-4 sm:py-5 ${compact ? "text-[0.86rem] leading-6 sm:text-[0.95rem]" : "text-[0.86rem] leading-6 sm:text-[1.02rem] sm:leading-7"}`}
      >
        {typeof questionsRemaining === "number" ? (
          <p className="mb-3 text-[0.62rem] tracking-[0.18em] text-[#8bb7ff] sm:text-[0.7rem]">
            QUESTIONS REMAINING: {questionsRemaining}
          </p>
        ) : null}

        {lines.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className="whitespace-pre-wrap break-words animate-[terminalFade_180ms_ease-out_both]"
          >
            {line || "\u00A0"}
          </p>
        ))}

        <div className="mt-2 flex items-start whitespace-pre-wrap break-words">
          <span className="shrink-0">{">"}</span>
          <span className="ml-1 min-w-0 flex-1">
            {inputValue}
            <span
              className={`ml-[1px] inline-block h-[1em] w-[0.7ch] align-[-0.1em] ${
                focused
                  ? "animate-[cursorPulse_1s_steps(1,end)_infinite] bg-white"
                  : "bg-white/50"
              }`}
            />
          </span>
        </div>
      </div>
    </section>
  );
}
