import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreekGeek — Options Greeks Simplified",
  description:
    "Understand options Greeks for any NASDAQ stock. Plain English breakdowns of Delta, Gamma, Theta, Vega, and Rho.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-gray-950 text-white font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
