import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Present Agent",
  description: "A thinking partner for thoughtful gifts",
  openGraph: {
    title: "Present Agent",
    description: "Stop second-guessing every gift. AI-powered gift confidence for ADHD brains.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-[family-name:var(--font-geist-sans)] antialiased bg-gray-50 text-gray-900`}>
        <Suspense fallback={null}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
