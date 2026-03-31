import type { Metadata } from "next";
import { ChatShell } from "@/components/chat-shell";

export const metadata: Metadata = {
  title: "Terminal",
  description:
    "Talk to Doctor Sbaitso in a retro DOS terminal. Synthetic speech, strict confidence, one question at a time.",
  openGraph: {
    title: "Doctor Sbaitso AI — Terminal",
    description:
      "Talk to Doctor Sbaitso in a retro DOS terminal. Synthetic speech, strict confidence, one question at a time.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Doctor Sbaitso AI — Terminal",
    description:
      "Talk to Doctor Sbaitso in a retro DOS terminal. Synthetic speech, strict confidence, one question at a time.",
    images: ["/og-image.png"],
  },
};

export default function ChatPage() {
  return <ChatShell />;
}
