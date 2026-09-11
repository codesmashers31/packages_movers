import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Package Mover Operations & Admin Console",
  description: "Enterprise administration portal for Package Mover logistics platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className="antialiased font-sans text-[#1E293B] bg-[#EEF2F6] selection:bg-[#2563EB] selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
