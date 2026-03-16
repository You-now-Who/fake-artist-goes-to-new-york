export type GameState =
  | "lobby"
  | "category_assign"
  | "drawing_turns"
  | "voting"
  | "fake_guess"
  | "reveal"
  | "scores"

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  isConnected: boolean
}

export interface StrokePoint {
  x: number
  y: number
}

export interface Stroke {
  id: string
  playerId: string
  points: StrokePoint[]
  color: string
  width: number
  opacity: number
}

export interface RoomState {
  code: string
  hostId: string
  players: Player[]
  state: GameState
  round: number
  totalRounds: number
  turnDurationMs: number
  turnOrder: string[]
  currentTurnIndex: number
  fakeId: string | null
  category: string | null
  subject: string | null
  turnEndsAt: number | null
  votes: Record<string, string>
  fakeGuess: string | null
  scores: Record<string, number>
  strokes: Stroke[]
  chatMessages: ChatMessage[]
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

export interface RoleAssignment {
  role: "artist" | "fake"
  subject: string | null
  category: string
}

export interface VoteResult {
  votes: Record<string, number>
  accusedName: string
  isFakeCaught: boolean
  fakeId: string
  fakeName: string
}

export interface RoundResult {
  isFakeCaught: boolean
  fakeGuessedCorrectly: boolean
  scores: Record<string, number>
  scoreDelta: Record<string, number>
  subject: string
  fakeId: string
  fakeName: string
}

// Socket event payloads — client → server
export interface C2S_JoinRoom {
  code: string
  name: string
}

export interface C2S_CreateRoom {
  name: string
}

export interface C2S_StartGame {
  category: string
  subject: string
  totalRounds: number
  turnDurationMs: number
}

export interface C2S_StrokeData {
  stroke: Stroke
}

export interface C2S_CastVote {
  accusedId: string
}

export interface C2S_FakeGuess {
  guess: string
}

export interface C2S_ChatMessage {
  text: string
}

export interface C2S_NextRound {}

// Socket event payloads — server → client
export interface S2C_RoomState {
  room: RoomStatePublic
}

export interface S2C_TurnStart {
  playerId: string
  playerName: string
  endsAt: number
}

export interface S2C_TurnEnd {
  nextPlayerId: string
}

export interface S2C_StrokeBroadcast {
  stroke: Stroke
}

export interface S2C_VoteResults {
  votes: Record<string, number>
  isFakeCaught: boolean
  fakeId: string
  fakeName: string
}

export interface S2C_RoundEnd {
  isFakeCaught: boolean
  fakeGuessedCorrectly: boolean
  scores: Record<string, number>
  scoreDelta: Record<string, number>
  subject: string
  fakeId: string
  fakeName: string
}

export interface S2C_Error {
  message: string
}

// Public room state — safe to send to all clients (no fakeId, no subject)
export interface RoomStatePublic {
  code: string
  hostId: string
  players: Player[]
  state: GameState
  round: number
  totalRounds: number
  turnDurationMs: number
  turnOrder: string[]
  currentTurnIndex: number
  category: string | null
  turnEndsAt: number | null
  votes: Record<string, number>
  strokes: Stroke[]
  chatMessages: ChatMessage[]
  scores: Record<string, number>
}
