"use client"

import React, { useState } from "react"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import { DEFAULT_WORD_PACKS } from "@/lib/word-packs"
import PlayerList from "@/components/PlayerList"
import { MIN_PLAYERS, DEFAULT_TURN_DURATION_MS } from "@/lib/game-logic"

const LobbyView = () => {
  const { emit } = useSocket()
  const { state } = useGameStore()
  const { room } = state

  const [category, setCategory] = useState(DEFAULT_WORD_PACKS[0].category)
  const [subject, setSubject] = useState("")
  const [useRandom, setUseRandom] = useState(true)
  const [totalRounds, setTotalRounds] = useState(2)
  const [turnDurationMs, setTurnDurationMs] = useState(DEFAULT_TURN_DURATION_MS)

  if (!room) return null

  const myId = room.players.find((p) => p.name === state.playerName)?.id
  const isHost = room.hostId === myId
  const connectedPlayers = room.players.filter((p) => p.isConnected)
  const canStart = connectedPlayers.length >= MIN_PLAYERS

  const selectedPack = DEFAULT_WORD_PACKS.find((p) => p.category === category)

  const handleStart = () => {
    const finalSubject = useRandom
      ? selectedPack?.subjects[Math.floor(Math.random() * (selectedPack?.subjects.length ?? 1))] ?? ""
      : subject.trim()
    if (!finalSubject) return
    emit("game:start", { category, subject: finalSubject, totalRounds, turnDurationMs })
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined")
      navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`)
  }

  const turnSeconds = Math.round(turnDurationMs / 1000)

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full overflow-y-auto">

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="flex-1 space-y-4 min-w-0">

        {/* Room code card */}
        <div className="pixel-box bg-white p-5">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-pixel" style={{ fontSize: "8px" }}>
            Room Code
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="font-pixel text-amber-600 text-xl sm:text-2xl tracking-tight">
              {room.code}
            </code>
            <button
              onClick={handleCopyLink}
              className="pixel-btn bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-800"
            >
              Copy Link
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Share this code with your friends</p>
        </div>

        {/* Host config */}
        {isHost ? (
          <div className="pixel-box bg-white p-5 space-y-5">
            <h2 className="font-pixel text-zinc-900" style={{ fontSize: "11px" }}>Game Settings</h2>

            {/* Category */}
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wide">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 pixel-select text-sm font-bold"
              >
                {DEFAULT_WORD_PACKS.map((p) => (
                  <option key={p.category} value={p.category}>{p.category}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wide">
                Subject Word
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={useRandom}
                  onChange={(e) => setUseRandom(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="font-medium">Pick random from pack</span>
              </label>
              {!useRandom && (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Flamingo"
                  className="w-full px-3 py-2 pixel-input text-sm"
                />
              )}
              {useRandom && selectedPack && (
                <p className="text-xs text-zinc-500 mt-1">
                  From: {selectedPack.subjects.slice(0, 5).join(" · ")}…
                </p>
              )}
            </div>

            {/* Rounds */}
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wide">
                Drawing Rounds: <span className="text-amber-600">{totalRounds}</span>
              </label>
              <input
                type="range"
                min={1}
                max={4}
                value={totalRounds}
                onChange={(e) => setTotalRounds(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
                <span>1 (quick)</span><span>4 (long)</span>
              </div>
            </div>

            {/* Turn duration */}
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wide">
                Time per turn: <span className="text-amber-600">{turnSeconds}s</span>
              </label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={turnSeconds}
                onChange={(e) => setTurnDurationMs(Number(e.target.value) * 1000)}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
                <span>5s (fast)</span><span>60s (relaxed)</span>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!canStart}
              className="pixel-btn w-full py-3 bg-amber-400 text-amber-950 font-bold text-sm disabled:opacity-40"
            >
              {canStart
                ? "▶ Start Game"
                : `Need ${MIN_PLAYERS - connectedPlayers.length} more player(s)`}
            </button>
          </div>
        ) : (
          <div className="pixel-box bg-amber-50 border-amber-400 p-6 text-center">
            <div className="font-pixel text-amber-700 text-xs mb-2" style={{ fontSize: "9px" }}>WAITING</div>
            <p className="text-amber-900 font-bold text-sm">Host is setting up the game…</p>
          </div>
        )}
      </div>

      {/* ── Right panel — players ─────────────────────────────────── */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="pixel-box bg-white p-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 font-pixel" style={{ fontSize: "8px" }}>
            Players ({connectedPlayers.length}/{room.players.length})
          </p>
          <PlayerList players={room.players} myId={myId} />
        </div>
      </div>
    </div>
  )
}

export default LobbyView
