"use client"

import React, { useEffect, useState } from "react"
import { DEFAULT_TURN_DURATION_MS } from "@/lib/game-logic"

interface TurnTimerProps {
  endsAt: number | null
  totalMs?: number
}

const TurnTimer = ({ endsAt, totalMs = DEFAULT_TURN_DURATION_MS }: TurnTimerProps) => {
  // Initialise from the real deadline immediately (not from totalMs) so the
  // display is accurate on the very first render before the interval fires.
  const [remaining, setRemaining] = useState<number>(() => {
    if (!endsAt || !isFinite(endsAt)) return totalMs
    return Math.max(0, endsAt - Date.now())
  })

  useEffect(() => {
    if (!endsAt || !isFinite(endsAt)) return

    const tick = () => setRemaining(Math.max(0, endsAt - Date.now()))
    tick() // sync immediately on mount / whenever endsAt changes
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [endsAt])

  const safeTotalMs = totalMs > 0 ? totalMs : DEFAULT_TURN_DURATION_MS
  const pct = endsAt ? Math.max(0, Math.min(1, remaining / safeTotalMs)) : 1
  const seconds = Math.ceil(remaining / 1000)
  const isUrgent = seconds <= 3

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 pixel-progress-track overflow-hidden">
        <div
          className={`pixel-progress-fill ${isUrgent ? "bg-red-500" : "bg-amber-400"}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums w-6 text-right font-mono ${
        isUrgent ? "text-red-600 animate-pulse" : "text-zinc-800"
      }`}>
        {seconds}
      </span>
    </div>
  )
}

export default TurnTimer
