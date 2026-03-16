"use client"

import React, { useState } from "react"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import DrawingCanvas from "@/components/DrawingCanvas"
import PlayerList from "@/components/PlayerList"

const VotingView = () => {
  const { emit } = useSocket()
  const { state } = useGameStore()
  const { room, playerName } = state
  const [votedFor, setVotedFor] = useState<string | null>(null)

  if (!room) return null

  const myId = room.players.find((p) => p.name === playerName)?.id
  const hasVoted = !!votedFor

  const handleVote = (playerId: string) => {
    if (hasVoted) return
    setVotedFor(playerId)
    emit("vote:cast", { accusedId: playerId })
  }

  const votedPlayer = room.players.find((p) => p.id === votedFor)
  const totalVotes = Object.values(room.votes).reduce((a, b) => a + b, 0)
  const connectedCount = room.players.filter((p) => p.isConnected).length

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-full min-h-0">

      {/* Canvas (read-only) */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
        <div className="pixel-box bg-amber-50 border-amber-500 px-4 py-2 shrink-0">
          <h2 className="font-pixel text-amber-900" style={{ fontSize: "10px" }}>🗳 VOTE PHASE</h2>
          <p className="text-xs text-amber-800 mt-1">
            {hasVoted ? `You voted for ${votedPlayer?.name}.` : "Tap a player — who is the Fake Artist?"}
          </p>
        </div>
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
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">

        {/* Vote progress */}
        <div className="pixel-box bg-white p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Votes cast</p>
            <span className="text-xs font-bold text-zinc-900 bg-zinc-100 border-2 border-zinc-400 px-1.5 py-0.5">
              {totalVotes}/{connectedCount}
            </span>
          </div>
          <div className="pixel-progress-track overflow-hidden">
            <div
              className="pixel-progress-fill bg-amber-400"
              style={{ width: `${(totalVotes / Math.max(1, connectedCount)) * 100}%` }}
            />
          </div>
          {hasVoted && (
            <p className="text-xs text-zinc-600 mt-2 font-medium">
              Waiting for other players…
            </p>
          )}
        </div>

        {/* Player list to vote */}
        <div className="flex-1 pixel-box bg-white p-3 overflow-y-auto">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-pixel" style={{ fontSize: "8px" }}>
            {hasVoted ? "Current Votes" : "Click to Vote"}
          </p>
          <PlayerList
            players={room.players}
            myId={myId}
            voteCounts={room.votes}
            showVotes={hasVoted}
            onVote={hasVoted ? undefined : handleVote}
            hasVoted={hasVoted}
          />
        </div>
      </div>
    </div>
  )
}

export default VotingView
