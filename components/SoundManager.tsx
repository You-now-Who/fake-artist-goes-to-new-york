"use client"

import { useEffect, useRef } from "react"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import { playSound, SOUNDS } from "@/lib/sounds"

const INTERACTIVE_SELECTOR = "button, a, [role='button'], [data-sound-click]"
const HOVER_SELECTOR = "button, a, [role='button'], [data-sound-hover]"

/**
 * Invisible component that wires sound effects to UI events and game events.
 * Mount once at the room layout level (alongside GameEventBridge).
 */
const SoundManager = () => {
  const { on } = useSocket()
  const { state } = useGameStore()
  const prevGameState = useRef<string | null>(null)
  const isFirstTurnStart = useRef(true)

  // ── Global click / hover sounds ─────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest(INTERACTIVE_SELECTOR)) {
        playSound(SOUNDS.click, 0.5)
      }
    }

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.matches(HOVER_SELECTOR)) {
        playSound(SOUNDS.hover, 0.3)
      }
    }

    document.addEventListener("click", handleClick)
    document.addEventListener("mouseenter", handleMouseEnter, true)
    return () => {
      document.removeEventListener("click", handleClick)
      document.removeEventListener("mouseenter", handleMouseEnter, true)
    }
  }, [])

  // ── finish_round — fires when state transitions to "voting" ──────────────
  useEffect(() => {
    const current = state.room?.state ?? null
    if (prevGameState.current !== null && prevGameState.current !== "voting" && current === "voting") {
      playSound(SOUNDS.finishRound, 0.7)
    }
    prevGameState.current = current
  }, [state.room?.state])

  // ── endDraw — fires when a turn:start event arrives (prev person finished) ─
  useEffect(() => {
    const off = on("turn:start", () => {
      // Skip the very first turn:start (game just began, nobody drew yet)
      if (isFirstTurnStart.current) {
        isFirstTurnStart.current = false
        return
      }
      if (state.room?.state === "drawing_turns") {
        playSound(SOUNDS.endDraw, 0.6)
      }
    })
    return off
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on])

  // Reset first-turn flag whenever a new game starts (state → drawing_turns)
  useEffect(() => {
    if (state.room?.state === "drawing_turns" && prevGameState.current !== "drawing_turns") {
      isFirstTurnStart.current = true
    }
  }, [state.room?.state])

  return null
}

export default SoundManager
