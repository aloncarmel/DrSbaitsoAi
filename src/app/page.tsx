import Image from "next/image";
import Link from "next/link";

const historyNotes = [
  {
    title: "BUNDLED WITH SOUND BLASTER",
    body: "Released in late 1991 for MS-DOS and distributed with Creative sound cards through the early 1990s.",
  },
  {
    title: "BUILT TO SHOW OFF SPEECH",
    body: "It was never a deep therapist. It was a strange little program designed to prove that a home computer could talk back.",
  },
  {
    title: "THE BREAKDOWN WAS PART OF THE CHARM",
    body: "Repeated abuse could trigger the famous PARITY ERROR reset, turning the machine itself into part of the performance.",
  },
];

const detailRows = [
  {
    label: "NAME",
    value: "SOUND BLASTER ACTING INTELLIGENT TEXT-TO-SPEECH OPERATOR",
  },
  {
    label: "ORIGINAL PLATFORM",
    value: "MS-DOS, FREEWARE, LATE 1991",
  },
  {
    label: "THIS VERSION",
    value: "WEB TERMINAL + SHARED CORE + MODERN OPENAI VOICE",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-homepage-blue)] text-white">
      <section className="relative border-b border-white/20">
        <div className="mx-auto flex min-h-[100svh] max-w-7xl flex-col px-6 pb-12 pt-8 sm:px-10 sm:pb-16 lg:px-12">
          <header className="flex items-center justify-center text-center text-[0.9rem] tracking-[0.18em] text-white/80">
            <p className="font-['More_Perfect_DOS_VGA']">DOCTOR SBAITSO AI</p>
          </header>

          <div className="relative flex flex-1 flex-col items-center pt-10 text-center sm:pt-14">
            <p className="font-['More_Perfect_DOS_VGA'] text-[0.85rem] tracking-[0.2em] text-[#f6f363]">
              THE DIGITAL THERAPIST RETURNS
            </p>
            <h1 className="mt-6 max-w-5xl font-['More_Perfect_DOS_VGA'] text-4xl leading-[1.2] tracking-[0.08em] text-white sm:text-5xl lg:text-6xl">
              DOCTOR SBAITSO IS BACK.
            </h1>
            <p className="mt-8 max-w-3xl font-['More_Perfect_DOS_VGA'] text-base leading-[1.9] tracking-[0.04em] text-white/82 sm:text-lg">
              A modern homage to the early Creative Labs talking therapist:
              terse prompts, synthetic speech, strict confidence, and one
              question at a time.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center border border-[#f6f363] bg-[#f6f363] px-7 py-3 font-['More_Perfect_DOS_VGA'] text-[0.9rem] tracking-[0.12em] text-[var(--color-homepage-blue)] hover:bg-transparent hover:text-[#f6f363]"
              >
                RUN IN BROWSER
              </Link>
              <a
                href="#history"
                className="inline-flex items-center justify-center border border-white/30 px-7 py-3 font-['More_Perfect_DOS_VGA'] text-[0.9rem] tracking-[0.12em] text-white/88 hover:border-white hover:text-white"
              >
                READ THE STORY
              </a>
            </div>

            <div className="mt-10 w-full max-w-[min(100%,1440px)] sm:mt-12">
              <div className="mx-auto">
                <Image
                  src="/landing-terminal-v2.png"
                  alt="Dr. Sbaitso terminal screenshot"
                  width={2128}
                  height={930}
                  priority
                  className="h-auto w-full rounded-[2px] border border-white/35 shadow-[0_18px_60px_rgba(0,0,0,0.32)]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="history"
        className="mx-auto grid max-w-7xl gap-14 px-6 py-20 sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-12"
      >
        <div>
          <p className="font-['More_Perfect_DOS_VGA'] text-[0.82rem] tracking-[0.18em] text-[#f6f363]">
            WHY PEOPLE REMEMBER IT
          </p>
          <h2 className="mt-5 max-w-2xl font-['More_Perfect_DOS_VGA'] text-3xl leading-[1.35] tracking-[0.05em] text-white sm:text-4xl">
            IT WAS PART DEMO, PART CHARACTER, AND PART SOFTWARE MALFUNCTION.
          </h2>
        </div>

        <div className="grid gap-8">
          {historyNotes.map((item) => (
            <div key={item.title} className="border-t border-white/20 pt-5">
              <h3 className="font-['More_Perfect_DOS_VGA'] text-[0.92rem] tracking-[0.14em] text-white">
                {item.title}
              </h3>
              <p className="mt-3 max-w-2xl font-['More_Perfect_DOS_VGA'] text-[0.95rem] leading-[1.9] tracking-[0.03em] text-white/78">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/18 bg-[var(--color-homepage-blue)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
          <div>
            <p className="font-['More_Perfect_DOS_VGA'] text-[0.82rem] tracking-[0.18em] text-[#f6f363]">
              SYSTEM NOTES
            </p>
            <h2 className="mt-5 font-['More_Perfect_DOS_VGA'] text-3xl leading-[1.35] tracking-[0.05em] text-white sm:text-4xl">
              THE ORIGINAL MOOD, REBUILT FOR 2026.
            </h2>
          </div>

          <div className="grid gap-5">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-2 border-t border-white/20 pt-4 sm:grid-cols-[220px_1fr]"
              >
                <p className="font-['More_Perfect_DOS_VGA'] text-[0.82rem] tracking-[0.14em] text-[#f6f363]">
                  {row.label}
                </p>
                <p className="font-['More_Perfect_DOS_VGA'] text-[0.95rem] leading-[1.8] tracking-[0.03em] text-white/82">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
        <div className="grid gap-10 border-t border-white/20 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="font-['More_Perfect_DOS_VGA'] text-[0.82rem] tracking-[0.18em] text-[#f6f363]">
              ABOUT ME
            </p>
            <h2 className="mt-5 max-w-xl font-['More_Perfect_DOS_VGA'] text-3xl leading-[1.35] tracking-[0.05em] text-white sm:text-4xl">
              BUILT BY AN 80S KID WHO STILL MISSES THE SOUND OF OLD MACHINES.
            </h2>
          </div>

          <div className="max-w-3xl">
            <p className="font-['More_Perfect_DOS_VGA'] text-[0.95rem] leading-[1.95] tracking-[0.03em] text-white/80">
              I GREW UP EXPERIMENTING WITH SOUND BLASTER CARDS, OLD PCS,
              MS-DOS, EARLY WINDOWS, MODEMS, AND THE STRANGE LITTLE SOFTWARE
              MOMENTS THAT MADE COMPUTERS FEEL ALIVE. THIS PROJECT COMES FROM
              THAT FEELING: BEFORE EVERYTHING GOT FLATTENED INTO APPS, BEFORE
              THE INTERNET BECAME THE INTERNET WE HAVE NOW, WHEN EARLY KIDS OF
              THAT ERA WERE STILL DISCOVERING WHAT THESE MACHINES COULD DO.
            </p>
            <p className="mt-5 font-['More_Perfect_DOS_VGA'] text-[0.95rem] leading-[1.95] tracking-[0.03em] text-white/80">
              THIS IS PART HOMAGE, PART EXPERIMENT, AND PART ATTEMPT TO HOLD ON
              TO A VERY SPECIFIC KIND OF COMPUTER MAGIC.
            </p>
            <div className="mt-8">
              <a
                href="https://x.com/aloncarmel"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center border border-white/30 px-5 py-3 font-['More_Perfect_DOS_VGA'] text-[0.9rem] tracking-[0.1em] text-[#f6f363] hover:border-[#f6f363] hover:text-white"
              >
                X.COM/ALONCARMEL
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center sm:px-10 lg:px-12">
        <p className="font-['More_Perfect_DOS_VGA'] text-[0.82rem] tracking-[0.18em] text-[#f6f363]">
          FINAL PROMPT
        </p>
        <h2 className="mx-auto mt-5 max-w-4xl font-['More_Perfect_DOS_VGA'] text-3xl leading-[1.35] tracking-[0.05em] text-white sm:text-4xl">
          HELLO. MY NAME IS DOCTOR SBAITSO.
          <br />
          SO, TELL ME ABOUT YOUR PROBLEMS.
        </h2>
        <p className="mx-auto mt-6 max-w-3xl font-['More_Perfect_DOS_VGA'] text-[0.95rem] leading-[1.9] tracking-[0.03em] text-white/76">
          Entertainment and experimentation only. Not therapy. Just a blue
          screen, a synthetic voice, and a terminal that still knows how to ask
          one careful question.
        </p>
        <div className="mt-10">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center border border-[#f6f363] bg-[#f6f363] px-7 py-3 font-['More_Perfect_DOS_VGA'] text-[0.9rem] tracking-[0.12em] text-[var(--color-homepage-blue)] hover:bg-transparent hover:text-[#f6f363]"
          >
            OPEN THE TERMINAL
          </Link>
        </div>
      </section>
    </main>
  );
}
