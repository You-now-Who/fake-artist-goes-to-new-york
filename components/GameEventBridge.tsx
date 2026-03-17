"use client"

import { useEffect } from "react"
import { useSocket } from "@/lib/use-socket"
import { useGameStore } from "@/lib/game-store"
import type {
  RoomStatePublic, RoleAssignment, VoteResult, RoundResult, ChatMessage,
} from "@/types/game"

/**
 * Invisible component that wires Socket.io events into the global game store.
 * Mount once at the room layout level.
 */
const GameEventBridge = () => {
  const { on } = useSocket()
  const { dispatch } = useGameStore()

  useEffect(() => {
    const off1 = on("room:state", (data: unknown) => {
      const { room } = data as { room: RoomStatePublic }
      dispatch({ type: "SET_ROOM", payload: { room, code: room.code } })
    })

    const off2 = on("room:joined", (data: unknown) => {
      const { room, code } = data as { room: RoomStatePublic; code: string }
      dispatch({ type: "SET_ROOM", payload: { room, code } })
    })

    const off3 = on("role:assign", (data: unknown) => {
      dispatch({ type: "SET_ROLE", payload: data as RoleAssignment })
    })

    const off4 = on("turn:start", (data: unknown) => {
      dispatch({ type: "SET_TURN", payload: data as { playerId: string; playerName: string; endsAt: number } })
    })

    const off5 = on("vote:results", (data: unknown) => {
      dispatch({ type: "SET_VOTE_RESULTS", payload: data as VoteResult })
    })

    const off6 = on("round:end", (data: unknown) => {
      dispatch({ type: "SET_ROUND_RESULT", payload: data as RoundResult })
    })

    const off7 = on("fake:guess_prompt", (data: unknown) => {
      dispatch({ type: "SET_FAKE_GUESS_PROMPT", payload: data as { endsAt: number } })
    })

    const off8 = on("error", (data: unknown) => {
      dispatch({ type: "SET_ERROR", payload: (data as { message: string }).message })
    })

    const off9 = on("chat:message", (data: unknown) => {
      dispatch({ type: "APPEND_CHAT_MESSAGE", payload: data as ChatMessage })
    })

    return () => {
      off1(); off2(); off3(); off4(); off5(); off6(); off7(); off8(); off9()
    }
  }, [on, dispatch])

  return null
}

export default GameEventBridge
