"use client"

import React, { useState, useCallback, useEffect, useRef } from "react"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import DrawingCanvas from "@/components/DrawingCanvas"
import BrushToolbar from "@/components/BrushToolbar"
import TurnTimer from "@/components/TurnTimer"
import PlayerList from "@/components/PlayerList"
import type { Stroke } from "@/types/game"

const DrawingView = () => {
  const { emit } = useSocket()
  const { state } = useGameStore()
  const { room, role, currentTurn, playerName } = state

  const [brushColor, setBrushColor] = useState("#1a1a1a")
  const [brushWidth, setBrushWidth] = useState(4)
  const [brushOpacity, setBrushOpacity] = useState(1)
  const [pendingStroke, setPendingStroke] = useState<Stroke | null>(null)

  // Ref keeps auto-submit timeout from capturing stale pendingStroke
  const pendingStrokeRef = useRef<Stroke | null>(null)
  pendingStrokeRef.current = pendingStroke

  // Derive turn info.
  // IMPORTANT: room.turnEndsAt is the primary source — it's updated on every
  // room:state broadcast and is always current. currentTurn.endsAt can be stale
  // if a turn:start event is missed, causing the timer to show an expired time.
  const myId = room?.players.find((p) => p.name === playerName)?.id
  const currentTurnPlayerId =
    currentTurn?.playerId ?? room?.turnOrder[room?.currentTurnIndex ?? 0]
  const turnEndsAt = room?.turnEndsAt ?? currentTurn?.endsAt ?? null
  const isMyTurn = !!myId && currentTurnPlayerId === myId
  const currentPlayer = room?.players.find((p) => p.id === currentTurnPlayerId)

  // ── Auto-submit when timer expires ────────────────────────────────────────
  // Runs whenever it becomes our turn or the endsAt timestamp changes.
  useEffect(() => {
    if (!isMyTurn || !turnEndsAt) return

    const remaining = turnEndsAt - Date.now()
    if (remaining <= 0) {
      // Timer already past — submit or skip immediately
      if (pendingStrokeRef.current) {
        emit("stroke:data", { stroke: pendingStrokeRef.current })
        setPendingStroke(null)
      } else {
        emit("turn:skip")
      }
      return
    }

    const timer = setTimeout(() => {
      if (pendingStrokeRef.current) {
        emit("stroke:data", { stroke: pendingStrokeRef.current })
        setPendingStroke(null)
      } else {
        emit("turn:skip")
      }
    }, remaining)

    return () => clearTimeout(timer)
  // Only re-run when it's our turn or the deadline changes — not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, turnEndsAt, emit])

  // Reset pending stroke when our turn ends (room state moves on)
  useEffect(() => {
    if (!isMyTurn) setPendingStroke(null)
  }, [isMyTurn])

  const handleStrokeDrawn = useCallback(
    (stroke: Omit<Stroke, "id" | "playerId">) => {
      setPendingStroke({ id: "pending", playerId: myId ?? "", ...stroke })
    },
    [myId]
  )

  const handleSubmit = useCallback(() => {
    if (!pendingStrokeRef.current) return
    emit("stroke:data", { stroke: pendingStrokeRef.current })
    setPendingStroke(null)
  }, [emit])

  const handleCancelStroke = () => setPendingStroke(null)

  const handleSkip = () => {
    setPendingStroke(null)
    emit("turn:skip")
  }

  if (!room) return null

  return (
    <div className="flex flex-col h-full gap-2 min-h-0">

      {/* ── Top info bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap pixel-box bg-white px-3 py-2 shrink-0">
        {role && (
          <div className={`px-2 py-1 text-xs font-bold border-2 border-zinc-900 ${
            role.role === "fake" ? "bg-rose-200 text-rose-900" : "bg-emerald-100 text-emerald-900"
          }`}>
            {role.role === "fake" ? "🎭 FAKE" : "🎨 ARTIST"}
            {role.role === "artist" && <span className="ml-1 font-normal">· {role.subject}</span>}
          </div>
        )}

        <div className="text-xs font-bold text-zinc-700 border-2 border-zinc-300 px-2 py-1 bg-zinc-50">
          Round {room.round}/{room.totalRounds}
        </div>

        {room.category && (
          <div className="text-xs text-zinc-600 border-2 border-zinc-300 px-2 py-1 bg-zinc-50">
            Category: <strong className="text-zinc-900">{room.category}</strong>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2 min-w-0">
          {isMyTurn ? (
            <span className="text-xs font-bold text-amber-800 bg-amber-100 border-2 border-amber-500 px-2 py-1 animate-pulse">
              ✏️ YOUR TURN
            </span>
          ) : (
            <span className="text-xs text-zinc-700 font-bold bg-zinc-100 border-2 border-zinc-300 px-2 py-1">
              {currentPlayer?.name ?? "…"} drawing
            </span>
          )}
          <div className="w-36">
            <TurnTimer
              key={turnEndsAt ?? 0}
              endsAt={turnEndsAt}
              totalMs={room.turnDurationMs || undefined}
            />
          </div>
        </div>

      </div>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-3 min-h-0">

        {/* Left sidebar — player list */}
        <div className="hidden lg:flex flex-col gap-2 shrink-0 w-36 min-h-0">
          <div className="pixel-box bg-white p-2 overflow-y-auto flex-1">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-pixel" style={{ fontSize: "8px" }}>
              Players
            </p>
            <PlayerList
              players={room.players}
              currentTurnId={currentTurnPlayerId}
              myId={myId}
            />
          </div>
        </div>

        {/* Canvas column */}
        <div className="flex flex-col flex-1 gap-2 min-w-0 min-h-0">

          {/* Submit / action banner — only when it's your turn */}
          {isMyTurn && (
            <div className={`shrink-0 flex items-center gap-2 px-3 py-2 border-2 ${
              pendingStroke ? "border-emerald-600 bg-emerald-50" : "border-amber-500 bg-amber-50"
            }`}>
              {pendingStroke ? (
                <>
                  <span className="text-sm font-bold text-emerald-900 flex-1">
                    Stroke ready — submit or redraw
                  </span>
                  <button
                    onClick={handleCancelStroke}
                    className="pixel-btn bg-white px-3 py-1.5 text-xs font-bold text-zinc-800"
                  >
                    Redraw
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="pixel-btn bg-emerald-400 px-4 py-1.5 text-sm font-bold text-emerald-950"
                  >
                    ✓ Submit
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-amber-900 flex-1">
                    Draw one stroke, then Submit
                  </span>
                  <button
                    onClick={handleSkip}
                    className="pixel-btn bg-white px-3 py-1.5 text-xs text-zinc-700 font-bold"
                  >
                    Skip
                  </button>
                </>
              )}
            </div>
          )}

          {/* Canvas */}
          <div className={`flex-1 min-h-0 overflow-hidden ${isMyTurn ? "canvas-frame-active" : "canvas-frame"}`}>
            <DrawingCanvas
              strokes={room.strokes}
              isMyTurn={isMyTurn && !pendingStroke}
              brushColor={brushColor}
              brushWidth={brushWidth}
              brushOpacity={brushOpacity}
              pendingStroke={pendingStroke}
              onStrokeDrawn={handleStrokeDrawn}
            />
          </div>

          {/* Brush toolbar */}
          <div className="shrink-0">
            <BrushToolbar
              color={brushColor}
              width={brushWidth}
              opacity={brushOpacity}
              onColorChange={setBrushColor}
              onWidthChange={setBrushWidth}
              onOpacityChange={setBrushOpacity}
              disabled={!isMyTurn || !!pendingStroke}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

export default DrawingView
