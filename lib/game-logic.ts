import type { RoomState, Player, RoundResult } from "@/types/game"

export const DEFAULT_TURN_DURATION_MS = 30_000
export const MIN_TURN_DURATION_MS = 5_000
export const MAX_TURN_DURATION_MS = 60_000
export const FAKE_GUESS_DURATION_MS = 15_000
export const MIN_PLAYERS = 3

export const buildTurnOrder = (players: Player[]): string[] =>
  [...players.map((p) => p.id)].sort(() => Math.random() - 0.5)

export const getCurrentPlayer = (room: RoomState): Player | undefined =>
  room.players.find((p) => p.id === room.turnOrder[room.currentTurnIndex])

export const isDrawingComplete = (room: RoomState): boolean => {
  const { currentTurnIndex, turnOrder, round, totalRounds } = room
  // We've gone through every player in the current round
  return round >= totalRounds && currentTurnIndex >= turnOrder.length
}

export const advanceTurn = (
  room: RoomState
): { room: RoomState; roundEnded: boolean } => {
  const nextIndex = room.currentTurnIndex + 1

  if (nextIndex >= room.turnOrder.length) {
    const nextRound = room.round + 1
    if (nextRound > room.totalRounds) {
      return {
        room: { ...room, currentTurnIndex: nextIndex, state: "voting" },
        roundEnded: true,
      }
    }
    const dur = room.turnDurationMs || DEFAULT_TURN_DURATION_MS
    return {
      room: {
        ...room,
        round: nextRound,
        currentTurnIndex: 0,
        turnEndsAt: Date.now() + dur,
      },
      roundEnded: false,
    }
  }

  const dur = room.turnDurationMs || DEFAULT_TURN_DURATION_MS
  return {
    room: {
      ...room,
      currentTurnIndex: nextIndex,
      turnEndsAt: Date.now() + dur,
    },
    roundEnded: false,
  }
}

export const tallyVotes = (
  votes: Record<string, string>
): Record<string, number> => {
  const tally: Record<string, number> = {}
  for (const accused of Object.values(votes)) {
    tally[accused] = (tally[accused] ?? 0) + 1
  }
  return tally
}

export const findMostVoted = (tally: Record<string, number>): string | null => {
  let max = 0
  let winner: string | null = null
  for (const [id, count] of Object.entries(tally)) {
    if (count > max) {
      max = count
      winner = id
    }
  }
  return winner
}

export const calcScores = ({
  room,
  isFakeCaught,
  fakeGuessedCorrectly,
  votes,
}: {
  room: RoomState
  isFakeCaught: boolean
  fakeGuessedCorrectly: boolean
  votes: Record<string, string>
}): Record<string, number> => {
  const delta: Record<string, number> = {}
  const fakeId = room.fakeId!

  if (!isFakeCaught) {
    // Fake survives undetected: fake gets 3pts + 1pt per wrong vote
    delta[fakeId] = 3
    for (const [_voter, accused] of Object.entries(votes)) {
      if (accused !== fakeId) {
        delta[fakeId] = (delta[fakeId] ?? 0) + 1
      }
    }
  } else if (fakeGuessedCorrectly) {
    // Fake caught but guesses word: fake gets 2pts
    delta[fakeId] = 2
  } else {
    // Fake caught and doesn't guess: real artists each get 2pts
    for (const player of room.players) {
      if (player.id !== fakeId) {
        delta[player.id] = 2
      }
    }
  }

  return delta
}

export const applyScoreDelta = (
  existing: Record<string, number>,
  delta: Record<string, number>
): Record<string, number> => {
  const updated = { ...existing }
  for (const [id, pts] of Object.entries(delta)) {
    updated[id] = (updated[id] ?? 0) + pts
  }
  return updated
}

export const buildRoundResult = ({
  room,
  isFakeCaught,
  fakeGuessedCorrectly,
  votes,
}: {
  room: RoomState
  isFakeCaught: boolean
  fakeGuessedCorrectly: boolean
  votes: Record<string, string>
}): RoundResult => {
  const scoreDelta = calcScores({ room, isFakeCaught, fakeGuessedCorrectly, votes })
  const scores = applyScoreDelta(room.scores, scoreDelta)
  const fake = room.players.find((p) => p.id === room.fakeId)
  return {
    isFakeCaught,
    fakeGuessedCorrectly,
    scores,
    scoreDelta,
    subject: room.subject ?? "",
    fakeId: room.fakeId ?? "",
    fakeName: fake?.name ?? "Unknown",
  }
}
