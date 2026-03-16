"use client"

import React, { useState } from "react"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import TurnTimer from "@/components/TurnTimer"
import DrawingCanvas from "@/components/DrawingCanvas"
import { FAKE_GUESS_DURATION_MS } from "@/lib/game-logic"

const FakeGuessView = () => {
  const { emit } = useSocket()
  const { state } = useGameStore()
  const { room, role, voteResults, fakeGuessPrompt, playerName } = state
  const [guess, setGuess] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (!room) return null

  const myId = room.players.find((p) => p.name === playerName)?.id
  // fakeId is intentionally not in the public room state; use the role assigned to us
  const isFake = role?.role === "fake"
  const fakeName = voteResults?.fakeName ?? "The Fake Artist"

  const handleSubmit = () => {
    if (!guess.trim() || submitted) return
    setSubmitted(true)
    emit("fake:guess", { guess })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-full min-h-0">

      {/* Canvas */}
      <div className="flex-1 min-h-0 canvas-frame overflow-hidden">
        <DrawingCanvas
          strokes={room.strokes}
          isMyTurn={false}
          brushColor="#000"
          brushWidth={4}
          brushOpacity={1}
          pendingStroke={null}
          onStrokeDrawn={() => {}}
        />
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">

        {/* Caught banner */}
        <div className="pixel-box bg-rose-50 border-rose-500 shadow-[3px_3px_0_0_#f43f5e] p-5 text-center">
          <div className="text-4xl mb-2">🎭</div>
          <h2 className="font-pixel text-rose-900 leading-relaxed mb-2" style={{ fontSize: "10px" }}>
            {fakeName} was caught!
          </h2>
          <p className="text-sm text-rose-800">
            {isFake
              ? "Guess the subject to steal the win!"
              : `${fakeName} has one last chance…`}
          </p>
        </div>

        {/* Timer */}
        {fakeGuessPrompt && (
          <div className="pixel-box bg-white p-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Time to guess</p>
            <TurnTimer endsAt={fakeGuessPrompt.endsAt} totalMs={FAKE_GUESS_DURATION_MS} />
          </div>
        )}

        {/* Fake artist input */}
        {isFake && !submitted && (
          <div className="pixel-box bg-white p-4 space-y-3">
            <p className="text-sm font-bold text-zinc-800">What was the subject word?</p>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Your guess…"
              autoFocus
              className="w-full px-3 py-2 pixel-input text-sm"
            />
            <button
              onClick={handleSubmit}
              disabled={!guess.trim()}
              className="pixel-btn w-full py-2.5 bg-rose-500 text-white font-bold text-sm"
            >
              Submit Guess
            </button>
          </div>
        )}

        {isFake && submitted && (
          <div className="pixel-box bg-amber-50 border-amber-400 p-4 text-center">
            <p className="font-bold text-amber-900 text-sm">Guess submitted!</p>
            <p className="text-amber-700 text-xs mt-1">Waiting for result…</p>
          </div>
        )}

        {!isFake && (
          <div className="pixel-box bg-zinc-50 p-4 text-center">
            <p className="text-sm text-zinc-700 font-medium">
              Waiting for {fakeName} to guess…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FakeGuessView
