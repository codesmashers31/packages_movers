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
    <html lang="en" className={`${inter.variable} font-sans`} suppressHydrationWarning>
      <body
        className="antialiased font-sans text-slate-900 bg-[#F8FAFC] selection:bg-blue-600 selection:text-white min-h-screen"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
