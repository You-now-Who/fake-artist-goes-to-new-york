import type { Metadata } from "next"
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google"
import "./globals.css"
import { GameStoreProvider } from "@/lib/game-store"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const pressStart2P = Press_Start_2P({
  variable: "--font-pixel-display",
  subsets: ["latin"],
  weight: "400",
})

export const metadata: Metadata = {
  title: "Fake Artist Goes to New York",
  description: "Real-time multiplayer drawing deduction game",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased`}>
        <GameStoreProvider>
          {children}
        </GameStoreProvider>
      </body>
    </html>
  )
}
