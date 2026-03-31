import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dr Sbaitso AI",
  description:
    "A modern-retro digital therapist shell for web and CLI, built around one calm question at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
