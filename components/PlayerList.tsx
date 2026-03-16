"use client"

import React from "react"
import type { Player } from "@/types/game"

interface PlayerListProps {
  players: Player[]
  currentTurnId?: string | null
  myId?: string | null
  voteCounts?: Record<string, number>
  showVotes?: boolean
  onVote?: (playerId: string) => void
  hasVoted?: boolean
}

const PlayerList = ({
  players,
  currentTurnId,
  myId,
  voteCounts = {},
  showVotes = false,
  onVote,
  hasVoted,
}: PlayerListProps) => (
  <ul className="space-y-1.5">
    {players.map((player) => {
      const isMe = player.id === myId
      const isCurrentTurn = player.id === currentTurnId
      const voteCount = voteCounts[player.id] ?? 0
      const canVote = !!onVote && !hasVoted && !isMe

      return (
        <li key={player.id}>
          <div
            role={canVote ? "button" : undefined}
            tabIndex={canVote ? 0 : undefined}
            aria-label={canVote ? `Vote for ${player.name}` : undefined}
            onClick={canVote ? () => onVote!(player.id) : undefined}
            onKeyDown={canVote ? (e) => e.key === "Enter" && onVote!(player.id) : undefined}
            className={`flex items-center gap-2 px-2 py-2 border-2 transition-all select-none
              ${isCurrentTurn ? "border-amber-500 bg-amber-50" : "border-zinc-300 bg-white"}
              ${canVote ? "cursor-pointer hover:border-red-500 hover:bg-red-50 hover:shadow-[2px_2px_0_0_#ef4444]" : ""}
              ${!player.isConnected ? "opacity-40" : ""}
            `}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 border-2 border-zinc-900 flex items-center justify-center text-xs font-black shrink-0 ${
              isMe ? "bg-amber-300 text-amber-950" : "bg-zinc-100 text-zinc-700"
            }`}>
              {player.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-900 truncate text-xs">
                {player.name}
                {isMe && <span className="ml-1 font-normal text-zinc-400 text-xs">(you)</span>}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {player.isHost && (
                  <span className="text-xs bg-amber-200 text-amber-900 px-1 font-bold border border-amber-500">
                    HOST
                  </span>
                )}
                {isCurrentTurn && (
                  <span className="text-xs bg-emerald-200 text-emerald-900 px-1 font-bold border border-emerald-500 animate-pulse">
                    DRAWING
                  </span>
                )}
                {!player.isConnected && (
                  <span className="text-xs bg-zinc-100 text-zinc-500 px-1 border border-zinc-300">
                    OFFLINE
                  </span>
                )}
              </div>
            </div>

            {/* Vote count */}
            {showVotes && voteCount > 0 && (
              <div className="bg-red-100 border-2 border-red-500 px-1.5 py-0.5 text-xs font-black text-red-800 shrink-0">
                {voteCount}🗳
              </div>
            )}

            {canVote && (
              <span className="text-zinc-400 text-xs shrink-0">▶</span>
            )}
          </div>
        </li>
      )
    })}
  </ul>
)

export default PlayerList
