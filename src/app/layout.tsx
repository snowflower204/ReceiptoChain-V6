import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import AppChrome from "@/components/AppChrome";
import "./globals.css";

import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReceiptoChain",
  description: "Created by Hannah A. Hontiveros",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased scroll-smooth`}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
