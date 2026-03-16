"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import type { RoomStatePublic } from "@/types/game"

type Mode = "home" | "creating" | "joining"

const HomePage = () => {
  const router = useRouter()
  const { emit, on } = useSocket()
  const { dispatch } = useGameStore()

  const [mode, setMode] = useState<Mode>("home")
  const [name, setName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const off1 = on("room:joined", (data: unknown) => {
      const { room, code } = data as { room: RoomStatePublic; code: string }
      sessionStorage.setItem(`player-name-${code}`, name)
      dispatch({ type: "SET_ROOM", payload: { room, code } })
      dispatch({ type: "SET_IDENTITY", payload: { name, code } })
      router.push(`/room/${code}`)
    })
    const off2 = on("error", (data: unknown) => {
      setError((data as { message: string }).message)
      setLoading(false)
    })
    return () => { off1(); off2() }
  }, [on, router, dispatch, name])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    emit("room:create", { name: name.trim() })
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !joinCode.trim()) return
    setError(null)
    setLoading(true)
    emit("room:join", { code: joinCode.trim().toLowerCase(), name: name.trim() })
  }

  return (
    <div className="min-h-screen bg-[#fffef7] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Title */}
        <div className="text-center space-y-3">
          <div className="text-5xl">🎨</div>
          <h1 className="font-pixel text-zinc-900 leading-relaxed" style={{ fontSize: "16px" }}>
            Fake Artist
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed max-w-xs mx-auto">
            One stroke each. One fake among you.<br />
            Can you spot the impostor?
          </p>
        </div>

        {/* Main card */}
        <div className="pixel-box bg-white p-6 space-y-4">

          {error && (
            <div className="border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-800 flex gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mode === "home" && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("creating")}
                className="pixel-btn w-full py-4 bg-amber-400 text-amber-950 font-bold text-base"
              >
                Create Room
              </button>
              <button
                onClick={() => setMode("joining")}
                className="pixel-btn w-full py-4 bg-white text-zinc-800 font-bold text-base"
              >
                Join Room
              </button>

              <div className="pt-3 border-t-2 border-zinc-200">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 font-pixel" style={{ fontSize: "7px" }}>
                  How to play
                </p>
                <ul className="space-y-2 text-sm text-zinc-700">
                  <li className="flex gap-2 items-start"><span>①</span> Everyone gets a secret subject — except the Fake Artist</li>
                  <li className="flex gap-2 items-start"><span>②</span> Each player draws one stroke then hits Submit</li>
                  <li className="flex gap-2 items-start"><span>③</span> Vote to expose the fake — they can still win by guessing the word!</li>
                </ul>
              </div>
            </div>
          )}

          {mode === "creating" && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wide">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Picasso"
                  maxLength={20}
                  autoFocus
                  className="w-full px-3 py-2.5 pixel-input text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="pixel-btn w-full py-3 bg-amber-400 text-amber-950 font-bold text-sm"
              >
                {loading ? "Creating…" : "Create Room"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("home"); setError(null) }}
                className="w-full text-sm text-zinc-500 hover:text-zinc-800 py-1 transition-colors font-medium"
              >
                ← Back
              </button>
            </form>
          )}

          {mode === "joining" && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wide">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monet"
                  maxLength={20}
                  autoFocus
                  className="w-full px-3 py-2.5 pixel-input text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wide">
                  Room code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. red-fox-42"
                  className="w-full px-3 py-2.5 pixel-input text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || !joinCode.trim() || loading}
                className="pixel-btn w-full py-3 bg-amber-400 text-amber-950 font-bold text-sm"
              >
                {loading ? "Joining…" : "Join Room"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("home"); setError(null) }}
                className="w-full text-sm text-zinc-500 hover:text-zinc-800 py-1 transition-colors font-medium"
              >
                ← Back
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400">3–8 players · Real-time multiplayer</p>
      </div>
    </div>
  )
}

export default HomePage
