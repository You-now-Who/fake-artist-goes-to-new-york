"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import GameEventBridge from "@/components/GameEventBridge"
import ChatPanel from "@/components/ChatPanel"
import LobbyView from "@/components/views/LobbyView"
import CategoryAssignView from "@/components/views/CategoryAssignView"
import DrawingView from "@/components/views/DrawingView"
import VotingView from "@/components/views/VotingView"
import FakeGuessView from "@/components/views/FakeGuessView"
import ScoresView from "@/components/views/ScoresView"
import type { RoomStatePublic } from "@/types/game"

type JoinMode = "idle" | "name_prompt" | "joining" | "joined"

const RoomPage = () => {
  const params = useParams()
  const router = useRouter()
  const code = typeof params.code === "string" ? params.code : params.code?.[0] ?? ""

  const { emit, on } = useSocket()
  const { state, dispatch } = useGameStore()
  const { room, error, playerName } = state

  const [joinMode, setJoinMode] = useState<JoinMode>("idle")
  const [nameInput, setNameInput] = useState("")
  const [showChat, setShowChat] = useState(false)

  const myId = room?.players.find((p) => p.name === playerName)?.id ?? null
  const handleChatSend = (text: string) => emit("chat:message", { text })

  // On mount, decide if we need to prompt for name or auto-rejoin
  useEffect(() => {
    const savedName = sessionStorage.getItem(`player-name-${code}`)
    if (savedName) {
      setNameInput(savedName)
      setJoinMode("joining")
      emit("room:rejoin", { code, name: savedName })
    } else {
      setJoinMode("name_prompt")
    }
  }, [code, emit])

  // Listen for room:joined — set both the room state and identity so the
  // page has everything it needs before trying to render the game UI
  useEffect(() => {
    const off = on("room:joined", (data: unknown) => {
      const { code: c, room } = data as { code: string; room: RoomStatePublic }
      const name = nameInput || sessionStorage.getItem(`player-name-${c}`) || ""
      sessionStorage.setItem(`player-name-${c}`, name)
      dispatch({ type: "SET_ROOM", payload: { room, code: c } })
      dispatch({ type: "SET_IDENTITY", payload: { name, code: c } })
      setJoinMode("joined")
    })
    return off
  }, [on, dispatch, nameInput])

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    setJoinMode("joining")
    emit("room:join", { code, name: nameInput.trim() })
  }

  // Always mount GameEventBridge so room:state events are never missed,
  // even before the main game UI renders
  const eventBridge = <GameEventBridge />

  // Show name prompt
  if (joinMode === "idle" || joinMode === "name_prompt") {
    return (
      <div className="min-h-screen bg-[#fffef7] flex items-center justify-center p-4">
        {eventBridge}
        <div className="w-full max-w-sm pixel-box bg-white p-8 space-y-5">
          <div>
            <h1 className="font-pixel text-zinc-900 leading-relaxed mb-1" style={{ fontSize: "12px" }}>Join Room</h1>
            <p className="text-zinc-600 text-sm">
              Room: <code className="bg-zinc-100 px-1.5 py-0.5 text-amber-700 font-mono font-bold">{code}</code>
            </p>
          </div>
          {error && (
            <div className="border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-800">
              {error}
            </div>
          )}
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your display name"
              maxLength={20}
              autoFocus
              className="w-full px-3 py-2.5 pixel-input text-sm"
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="pixel-btn w-full py-3 bg-amber-400 text-amber-950 font-bold text-sm"
            >
              Join Game
            </button>
          </form>
          <button
            onClick={() => router.push("/")}
            className="w-full text-center text-sm text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
          >
            ← Back to home
          </button>
        </div>
      </div>
    )
  }

  if (joinMode === "joining" && !room) {
    return (
      <div className="min-h-screen bg-[#fffef7] flex items-center justify-center">
        {eventBridge}
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-600 text-sm font-bold">Connecting…</p>
        </div>
      </div>
    )
  }

  if (!room) return eventBridge

  const gameState = room.state

  return (
    <div className="min-h-screen bg-[#fffef7] flex flex-col" style={{ height: "100dvh" }}>
      {eventBridge}

      {/* Header */}
      <header className="bg-white border-b-2 border-zinc-900 px-3 py-2 flex items-center gap-3 shrink-0 shadow-[0_2px_0_0_#18181b]">
        <h1 className="font-pixel text-zinc-900" style={{ fontSize: "10px" }}>
          🎨 Fake Artist
        </h1>
        <code className="bg-amber-100 border-2 border-amber-500 px-2 py-0.5 text-amber-800 font-mono text-xs font-bold">
          {room.code}
        </code>
        <div className="flex-1" />
        {error && (
          <div className="text-xs font-bold text-red-800 bg-red-50 border-2 border-red-500 px-2 py-1 flex items-center gap-1">
            <span>{error}</span>
            <button
              onClick={() => dispatch({ type: "SET_ERROR", payload: null })}
              className="text-red-500 hover:text-red-800 font-black"
              aria-label="Dismiss error"
            >×</button>
          </div>
        )}
        <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 border-2 ${
          gameState === "drawing_turns" ? "border-emerald-600 bg-emerald-100 text-emerald-900" :
          gameState === "voting" || gameState === "fake_guess" ? "border-amber-500 bg-amber-100 text-amber-900" :
          gameState === "scores" ? "border-violet-500 bg-violet-100 text-violet-900" :
          "border-zinc-400 bg-zinc-100 text-zinc-700"
        }`}>
          <div className={`w-2 h-2 border border-current ${
            gameState === "drawing_turns" ? "bg-emerald-500 animate-pulse" :
            gameState === "voting" || gameState === "fake_guess" ? "bg-amber-500 animate-pulse" :
            "bg-current"
          }`} />
          {gameState === "lobby" && "LOBBY"}
          {gameState === "category_assign" && "STARTING"}
          {gameState === "drawing_turns" && `DRAW R${room.round}/${room.totalRounds}`}
          {gameState === "voting" && "VOTE"}
          {gameState === "fake_guess" && "GUESSING"}
          {gameState === "scores" && "RESULTS"}
        </div>
        {/* Mobile chat toggle */}
        <button
          onClick={() => setShowChat((v) => !v)}
          className="lg:hidden pixel-btn bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700 relative"
          aria-label="Toggle chat"
        >
          💬{(room.chatMessages?.length ?? 0) > 0 && showChat === false && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 border border-zinc-900" />
          )}
        </button>
      </header>

      {/* Body: game content + persistent chat sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Main game content */}
        <main className="flex-1 p-3 overflow-hidden min-w-0" style={{ minHeight: 0 }}>
          <div className="h-full">
            {gameState === "lobby" && <LobbyView />}
            {gameState === "category_assign" && <CategoryAssignView />}
            {gameState === "drawing_turns" && <DrawingView />}
            {gameState === "voting" && <VotingView />}
            {gameState === "fake_guess" && <FakeGuessView />}
            {gameState === "scores" && <ScoresView />}
          </div>
        </main>

        {/* Persistent chat panel — sidebar on lg, slide-in on mobile */}
        <aside className={`
          shrink-0 border-l-2 border-zinc-900 flex flex-col
          w-56
          lg:flex
          ${showChat ? "flex" : "hidden"}
        `} style={{ minHeight: 0 }}>
          <ChatPanel
            messages={room.chatMessages ?? []}
            myId={myId}
            onSend={handleChatSend}
          />
        </aside>
      </div>
    </div>
  )
}

export default RoomPage
