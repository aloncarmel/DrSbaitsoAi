import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://www.doctorsbaitso.com";
const title = "Doctor Sbaitso AI — The Digital Therapist Returns";
const description =
  "A modern homage to the early Creative Labs talking therapist: terse prompts, synthetic speech, strict confidence, and one question at a time.";

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | Doctor Sbaitso AI",
  },
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Doctor Sbaitso AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Doctor Sbaitso AI — The Digital Therapist Returns",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
    creator: "@aloncarmel",
  },
  robots: {
    index: true,
    follow: true,
  },
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
