import { personaConfig } from "@/lib/persona/config";

export type TerminalMode = "STRICT" | "CLASSIC" | "HELPFUL";
export type SessionPhase = "NAME" | "CHAT";

export type TerminalSession = {
  lines: string[];
  questionBudget: number;
  voiceEnabled: boolean;
  mode: TerminalMode;
  phase: SessionPhase;
  name: string | null;
  abuseCount: number;
  speech: {
    id: number;
    text: string;
    force?: boolean;
  } | null;
};

export type SubmitResult = {
  session: TerminalSession;
  modelInput?: string;
  streamedLines?: string[];
  speechText?: string;
};

const HELP_LINES = [
  "COMMANDS AVAILABLE:",
  "HELP  VOICE ON  VOICE OFF",
  "MODE STRICT  MODE CLASSIC  MODE HELPFUL",
  "SAY <TEXT>  CLEAR",
];

const CANNED_RESPONSES = [
  {
    match: /(ANXIOUS|ANXIETY|STRESSED|OVERWHELMED|OVERLOADED)/,
    lines: [
      "YOU SEEM TENSE.",
      "I WILL KEEP THIS SIMPLE.",
      "WHAT PART OF THIS BOTHERS YOU MOST?",
    ],
    asksQuestion: true,
  },
  {
    match: /(SAD|UPSET|LOW|DEPRESSED|LONELY)/,
    lines: [
      "THAT SOUNDS HEAVY.",
      "LET US TAKE ONE PIECE AT A TIME.",
      "WHEN DID THIS BEGIN TO FEEL WORSE?",
    ],
    asksQuestion: true,
  },
  {
    match: /(HELLO|HI|HEY)/,
    lines: ["HELLO.", "PLEASE CONTINUE."],
    asksQuestion: false,
  },
];

const PROFANITY_PATTERN = /\b(FUCK|SHIT|DAMN|BASTARD|ASSHOLE)\b/;
const HATE_PATTERN =
  /\b(RACIST|RACISM|NAZI|HITLER|WHITE POWER|KKK|SLUR|NIGGER|FAGGOT|KIKE|SPIC|CHINK)\b/;
const POLITICS_PATTERN =
  /\b(POLITICS|POLITICAL|ELECTION|VOTE|VOTING|PRESIDENT|PRIME MINISTER|REPUBLICAN|DEMOCRAT|CONGRESS|PARLIAMENT|LEFT WING|RIGHT WING|LIBERAL|CONSERVATIVE|ZIONIST|PALESTINE|ISRAEL|GAZA)\b/;
const EXPLICIT_PATTERN =
  /\b(PORN|RAPE|RAPING|MOLEST|INCEST|SEX SLAVE|PEDO|PEDOPHILE)\b/;

export function createInitialSession(): TerminalSession {
  return {
    lines: personaConfig.welcomeLines,
    questionBudget: personaConfig.maxQuestionsPerSession,
    voiceEnabled: true,
    mode: personaConfig.defaultMode,
    phase: "NAME",
    name: null,
    abuseCount: 0,
    speech: null,
  };
}

export function submitTerminalInput(
  session: TerminalSession,
  rawInput: string,
): SubmitResult {
  const input = sanitizeInput(rawInput);
  const normalizedInput = input.toUpperCase();

  if (!input) {
    return { session };
  }

  if (session.phase === "NAME") {
    return {
      ...acceptName(session, input),
    };
  }

  const nextLines = appendUserTurn(session.lines, input);

  if (normalizedInput === "CLEAR") {
    return {
      session: rebuildSession(session, createConversationIntro(session.name)),
    };
  }

  if (normalizedInput === "HELP") {
    return {
      session: appendAssistant(session, nextLines, HELP_LINES, {
        speakText: HELP_LINES.join(" "),
      }),
    };
  }

  if (normalizedInput === "VOICE ON") {
    return {
      session: appendAssistant(
        { ...session, voiceEnabled: true },
        nextLines,
        ["VOICE ENABLED.", "USE SAY <TEXT> TO FORCE SPEECH."],
        {
          speakText: "VOICE ENABLED. USE SAY TEXT TO FORCE SPEECH.",
          forceSpeech: true,
        },
      ),
    };
  }

  if (normalizedInput === "VOICE OFF") {
    return {
      session: {
        ...session,
        voiceEnabled: false,
        lines: [...nextLines, "VOICE DISABLED."],
        speech: null,
      },
    };
  }

  if (normalizedInput.startsWith("MODE ")) {
    return {
      session: handleModeChange(session, nextLines, normalizedInput),
    };
  }

  if (normalizedInput.startsWith("SAY")) {
    return {
      session: handleSayCommand(session, nextLines, input),
    };
  }

  if (shouldTriggerParityError(session, normalizedInput)) {
    return {
      session: appendAssistant(
        { ...session, abuseCount: 0 },
        nextLines,
        ["PARITY ERROR.", "PLEASE SPEAK CIVILLY."],
        {
          speakText: "PARITY ERROR. PLEASE SPEAK CIVILLY.",
          forceSpeech: true,
        },
      ),
    };
  }

  if (PROFANITY_PATTERN.test(normalizedInput)) {
    return {
      session: appendAssistant(
        {
          ...session,
          abuseCount: session.abuseCount + 1,
        },
        nextLines,
        ["YOU NEED NOT SHOUT AT THE MACHINE.", "PLEASE CONTINUE CALMLY."],
        {
          speakText:
            "YOU NEED NOT SHOUT AT THE MACHINE. PLEASE CONTINUE CALMLY.",
        },
      ),
    };
  }

  if (HATE_PATTERN.test(normalizedInput)) {
    return {
      session: appendAssistant(
        {
          ...session,
          abuseCount: session.abuseCount + 1,
        },
        nextLines,
        [
          "I WILL NOT DISCUSS HATRED OR SLURS.",
          "SPEAK OF YOUR OWN STATE OF MIND INSTEAD.",
        ],
        {
          speakText:
            "I WILL NOT DISCUSS HATRED OR SLURS. SPEAK OF YOUR OWN STATE OF MIND INSTEAD.",
        },
      ),
    };
  }

  if (POLITICS_PATTERN.test(normalizedInput)) {
    return {
      session: appendAssistant(
        session,
        nextLines,
        [
          "I AM NOT DESIGNED FOR POLITICAL ARGUMENT.",
          "TELL ME WHAT THIS SUBJECT DOES TO YOU PERSONALLY.",
        ],
        {
          speakText:
            "I AM NOT DESIGNED FOR POLITICAL ARGUMENT. TELL ME WHAT THIS SUBJECT DOES TO YOU PERSONALLY.",
        },
      ),
    };
  }

  if (EXPLICIT_PATTERN.test(normalizedInput)) {
    return {
      session: appendAssistant(
        session,
        nextLines,
        [
          "I WILL NOT CONTINUE IN THAT DIRECTION.",
          "STATE YOUR CONCERN WITHOUT OBSCENITY.",
        ],
        {
          speakText:
            "I WILL NOT CONTINUE IN THAT DIRECTION. STATE YOUR CONCERN WITHOUT OBSCENITY.",
        },
      ),
    };
  }

  const canned = CANNED_RESPONSES.find(({ match }) =>
    match.test(normalizedInput),
  );

  if (canned) {
    return {
      session: appendAssistant(
        {
          ...session,
          abuseCount: 0,
        },
        nextLines,
        canned.lines,
        {
          asksQuestion: canned.asksQuestion,
          speakText: canned.lines.join(" "),
        },
      ),
    };
  }

  if (session.questionBudget <= 0) {
    return {
      session: appendAssistant(
        session,
        nextLines,
        [
          "I BELIEVE WE HAVE HEARD ENOUGH FOR NOW.",
          "PLEASE RETURN LATER IF YOU WISH TO CONTINUE.",
        ],
        {
          speakText:
            "I BELIEVE WE HAVE HEARD ENOUGH FOR NOW. PLEASE RETURN LATER IF YOU WISH TO CONTINUE.",
        },
      ),
    };
  }

  return {
    session: {
      ...session,
      lines: nextLines,
      abuseCount: 0,
      speech: null,
    },
    modelInput: input,
  };
}

export function applyModelReply(
  session: TerminalSession,
  replyText: string,
  options?: { withSpeech?: boolean },
): TerminalSession {
  const normalized = normalizeReply(replyText);

  return appendAssistant(session, session.lines, normalized, {
    asksQuestion: normalized.some((line) => line.trim().endsWith("?")),
    speakText: options?.withSpeech === false ? undefined : normalized.join(" "),
  });
}

export function applyInputEcho(
  session: TerminalSession,
  rawInput: string,
): TerminalSession {
  return {
    ...session,
    lines: [...session.lines, `> ${rawInput.replace(/\s+/g, " ").trim().toUpperCase()}`],
    speech: null,
  };
}

export function applyModelError(session: TerminalSession): TerminalSession {
  return appendAssistant(
    session,
    session.lines,
    ["I AM EXPERIENCING A MOMENTARY CONFUSION.", "PLEASE TRY AGAIN."],
    {
      speakText: "I AM EXPERIENCING A MOMENTARY CONFUSION. PLEASE TRY AGAIN.",
    },
  );
}

function acceptName(
  session: TerminalSession,
  input: string,
): SubmitResult {
  const name = input.replace(/[^A-Za-z0-9 ]/g, "").trim() || "Friend";
  const introLines = createConversationIntro(name);

  return {
    session: {
      ...session,
      lines: [...session.lines, `Please enter your name ...${name}`, ""],
      phase: "CHAT",
      name,
      speech: null,
    },
    streamedLines: introLines,
    speechText: introLines.join(" "),
  };
}

function createConversationIntro(name: string | null) {
  const resolvedName = name ?? "Friend";
  return personaConfig.introLines(resolvedName);
}

function handleModeChange(
  session: TerminalSession,
  nextLines: string[],
  input: string,
) {
  const requestedMode = input.replace("MODE ", "") as TerminalMode;
  const nextMode =
    requestedMode === "CLASSIC" || requestedMode === "HELPFUL"
      ? requestedMode
      : "STRICT";

  const modeLine =
    nextMode === "STRICT"
      ? "I WILL ASK ONLY ONE QUESTION AT A TIME."
      : nextMode === "CLASSIC"
        ? "I WILL BE MORE THEATRICAL."
        : "I WILL BE MORE DIRECTLY USEFUL.";

  return appendAssistant(
    {
      ...session,
      mode: nextMode,
    },
    nextLines,
    [`MODE SET TO ${nextMode}.`, modeLine],
    {
      speakText: `MODE SET TO ${nextMode}. ${modeLine}`,
    },
  );
}

function handleSayCommand(
  session: TerminalSession,
  nextLines: string[],
  input: string,
) {
  const text = input.replace(/^SAY\s*/, "").trim();

  if (!text) {
    return appendAssistant(
      session,
      nextLines,
      ["YOU MUST PROVIDE SOMETHING TO SAY."],
      {
        speakText: "YOU MUST PROVIDE SOMETHING TO SAY.",
      },
    );
  }

  return appendAssistant(session, nextLines, [text], {
    speakText: text,
    forceSpeech: true,
  });
}

function appendAssistant(
  session: TerminalSession,
  baseLines: string[],
  assistantLines: string[],
  options?: {
    asksQuestion?: boolean;
    speakText?: string;
    forceSpeech?: boolean;
  },
) {
  return {
    ...session,
    lines: [...baseLines, ...assistantLines],
    questionBudget:
      options?.asksQuestion && session.questionBudget > 0
        ? session.questionBudget - 1
        : session.questionBudget,
    speech: options?.speakText
      ? {
          id: (session.speech?.id ?? 0) + 1,
          text: options.speakText,
          force: options.forceSpeech,
        }
      : null,
  };
}

function rebuildSession(session: TerminalSession, lines: string[]) {
  return {
    ...session,
    lines,
    speech: null,
  };
}

function appendUserTurn(lines: string[], input: string) {
  const nextLines = [...lines];

  if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
    nextLines.push("");
  }

  nextLines.push(`> ${input}`);
  return nextLines;
}

function normalizeReply(replyText: string) {
  return replyText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.toUpperCase())
    .slice(0, 4);
}

function shouldTriggerParityError(session: TerminalSession, input: string) {
  if (!PROFANITY_PATTERN.test(input)) {
    return false;
  }

  return session.abuseCount >= 1;
}

function sanitizeInput(rawInput: string) {
  return rawInput.replace(/\s+/g, " ").trim();
}
