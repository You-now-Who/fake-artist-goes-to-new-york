"use client"

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react"
import type {
  RoomStatePublic, RoleAssignment, ChatMessage, VoteResult, RoundResult,
} from "@/types/game"

interface TurnInfo {
  playerId: string
  playerName: string
  endsAt: number
}

interface GameStoreState {
  roomCode: string | null
  playerName: string | null
  room: RoomStatePublic | null
  role: RoleAssignment | null
  currentTurn: TurnInfo | null
  voteResults: VoteResult | null
  roundResult: RoundResult | null
  fakeGuessPrompt: { endsAt: number } | null
  error: string | null
}

type Action =
  | { type: "SET_ROOM"; payload: { room: RoomStatePublic; code: string } }
  | { type: "SET_IDENTITY"; payload: { name: string; code: string } }
  | { type: "SET_ROLE"; payload: RoleAssignment }
  | { type: "SET_TURN"; payload: TurnInfo }
  | { type: "SET_VOTE_RESULTS"; payload: VoteResult }
  | { type: "SET_ROUND_RESULT"; payload: RoundResult }
  | { type: "SET_FAKE_GUESS_PROMPT"; payload: { endsAt: number } }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" }

const initialState: GameStoreState = {
  roomCode: null,
  playerName: null,
  room: null,
  role: null,
  currentTurn: null,
  voteResults: null,
  roundResult: null,
  fakeGuessPrompt: null,
  error: null,
}

const reducer = (state: GameStoreState, action: Action): GameStoreState => {
  switch (action.type) {
    case "SET_ROOM":
      return {
        ...state,
        room: action.payload.room,
        roomCode: action.payload.code,
        // Clear transient state when going back to lobby
        ...(action.payload.room.state === "lobby"
          ? { role: null, currentTurn: null, voteResults: null, roundResult: null, fakeGuessPrompt: null }
          : {}),
      }
    case "SET_IDENTITY":
      return { ...state, playerName: action.payload.name, roomCode: action.payload.code }
    case "SET_ROLE":
      return { ...state, role: action.payload }
    case "SET_TURN":
      return { ...state, currentTurn: action.payload }
    case "SET_VOTE_RESULTS":
      return { ...state, voteResults: action.payload }
    case "SET_ROUND_RESULT":
      return { ...state, roundResult: action.payload }
    case "SET_FAKE_GUESS_PROMPT":
      return { ...state, fakeGuessPrompt: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "RESET":
      return initialState
    default:
      return state
  }
}

interface GameStoreContextType {
  state: GameStoreState
  dispatch: React.Dispatch<Action>
}

const GameStoreContext = createContext<GameStoreContextType | null>(null)

export const GameStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <GameStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </GameStoreContext.Provider>
  )
}

export const useGameStore = () => {
  const ctx = useContext(GameStoreContext)
  if (!ctx) throw new Error("useGameStore must be used within GameStoreProvider")
  return ctx
}
