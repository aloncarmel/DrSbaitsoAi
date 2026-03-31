export function transformToSbaitsoSpeech(input: string) {
  const normalized = input
    .replace(/\r/g, "")
    .replace(/!/g, "")
    .replace(/[,:;()]+/g, " ")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const sentences = normalized
    .split(/(?<=[.?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => sentence.replace(/[.]+$/g, "").trim())
    .map((sentence) => sentence.replace(/\s+/g, " "));

  return sentences
    .map((sentence) => {
      const isQuestion = sentence.endsWith("?");
      const bareSentence = isQuestion ? sentence.slice(0, -1).trim() : sentence;
      const words = bareSentence.split(" ").filter(Boolean);
      const withSpacing = words
        .map((word, wordIndex) => {
          const compactWord = word.replace(/[^\w?/-]/g, "");
          const isBoundary = wordIndex > 0 && wordIndex % 2 === 0;
          return isBoundary ? `${compactWord} /` : compactWord;
        })
        .join(" ")
        .replace(/\s+\/,/g, " /");
      return isQuestion ? `${withSpacing}?` : `${withSpacing}.`;
    })
    .join("\n");
}
