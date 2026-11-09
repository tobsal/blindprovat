import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Typsnitten (OFL) ligger i repot så att bygget inte hämtar något från nätet.
const roboto = localFont({
  src: "./fonts/Roboto-latin.woff2",
  variable: "--font-roboto",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Blindprovat",
  description: "Arrangera blindprovningar av vin i grupp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sv"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
