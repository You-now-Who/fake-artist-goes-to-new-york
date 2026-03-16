"use client"

import React from "react"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import DrawingCanvas from "@/components/DrawingCanvas"

const RANK_LABEL = ["🥇", "🥈", "🥉"]

const ScoresView = () => {
  const { emit } = useSocket()
  const { state } = useGameStore()
  const { room, roundResult, playerName } = state

  if (!room || !roundResult) return null

  const myId = room.players.find((p) => p.name === playerName)?.id
  const isHost = room.hostId === myId

  const sortedPlayers = [...room.players].sort(
    (a, b) => (roundResult.scores[b.id] ?? 0) - (roundResult.scores[a.id] ?? 0)
  )

  const fakeWon = !roundResult.isFakeCaught || roundResult.fakeGuessedCorrectly

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

      {/* Results panel */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">

        {/* Outcome */}
        <div className={`pixel-box p-5 text-center ${
          fakeWon
            ? "bg-rose-50 border-rose-500 shadow-[3px_3px_0_0_#f43f5e]"
            : "bg-emerald-50 border-emerald-500 shadow-[3px_3px_0_0_#10b981]"
        }`}>
          <div className="text-4xl mb-2">{fakeWon ? "🎭" : "🎨"}</div>
          <h2 className="font-pixel leading-relaxed mb-2" style={{ fontSize: "9px" }}>
            {!roundResult.isFakeCaught
              ? `${roundResult.fakeName} fooled everyone!`
              : roundResult.fakeGuessedCorrectly
              ? `${roundResult.fakeName} guessed it!`
              : "Real Artists win!"}
          </h2>
          <div className="pixel-box-sm bg-white px-3 py-2 inline-block">
            <span className="text-xs font-bold text-zinc-500">The subject was </span>
            <span className="font-bold text-zinc-900">"{roundResult.subject}"</span>
          </div>
        </div>

        {/* Score deltas */}
        {Object.keys(roundResult.scoreDelta).length > 0 && (
          <div className="pixel-box bg-white p-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-pixel" style={{ fontSize: "8px" }}>
              Points this round
            </p>
            <ul className="space-y-1.5">
              {Object.entries(roundResult.scoreDelta).map(([id, pts]) => {
                const player = room.players.find((p) => p.id === id)
                if (!player) return null
                return (
                  <li key={id} className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                    <span className="text-sm font-bold text-zinc-800">{player.name}</span>
                    <span className="text-sm font-black text-emerald-700 bg-emerald-100 border-2 border-emerald-400 px-1.5 py-0.5">
                      +{pts}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Leaderboard */}
        <div className="pixel-box bg-white p-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-pixel" style={{ fontSize: "8px" }}>
            Leaderboard
          </p>
          <ul className="space-y-1.5">
            {sortedPlayers.map((player, idx) => (
              <li
                key={player.id}
                className={`flex items-center gap-2 px-2 py-1.5 border-2 ${
                  player.id === myId
                    ? "border-amber-500 bg-amber-50"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <span className="text-base w-7 text-center">{RANK_LABEL[idx] ?? `${idx + 1}.`}</span>
                <span className="flex-1 font-bold text-sm text-zinc-900 truncate">
                  {player.name}
                  {player.id === myId && <span className="font-normal text-zinc-400"> (you)</span>}
                </span>
                <span className="font-black text-zinc-900 tabular-nums">
                  {roundResult.scores[player.id] ?? 0}
                  {(roundResult.scoreDelta[player.id] ?? 0) > 0 && (
                    <span className="text-emerald-600 text-xs ml-0.5">+{roundResult.scoreDelta[player.id]}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <button
            onClick={() => emit("game:next_round")}
            className="pixel-btn w-full py-3 bg-amber-400 text-amber-950 font-bold text-sm"
          >
            ▶ Play Another Round
          </button>
        ) : (
          <div className="pixel-box bg-zinc-50 p-3 text-center">
            <p className="text-sm text-zinc-600">Waiting for host to start next round…</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScoresView
