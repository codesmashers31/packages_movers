import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Movers Marketplace",
  description: "Connect with verified local packers and movers easily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
