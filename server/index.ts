// env-setup MUST be the first import — its module body runs before lib/redis.ts
// reads process.env, which is exactly what we need in ESM.
import "./env-setup"

import { createServer } from "http"
import next from "next"
import { Server, Socket } from "socket.io"
import { v4 as uuidv4 } from "uuid"
import {
  getRoom, saveRoom, deleteRoom,
  pushStroke, getStrokes, clearStrokes,
  setRole, getRole,
  setVote, getVotes, clearVotes,
} from "../lib/redis"
import {
  buildTurnOrder, advanceTurn, tallyVotes, findMostVoted,
  buildRoundResult, applyScoreDelta,
  DEFAULT_TURN_DURATION_MS, MIN_TURN_DURATION_MS, MAX_TURN_DURATION_MS,
  FAKE_GUESS_DURATION_MS, MIN_PLAYERS,
} from "../lib/game-logic"
import { generateRoomCode } from "../lib/room-codes"
import type {
  RoomState, Player, Stroke, RoomStatePublic,
  C2S_CreateRoom, C2S_JoinRoom, C2S_StartGame,
  C2S_StrokeData, C2S_CastVote, C2S_FakeGuess, C2S_ChatMessage,
} from "../types/game"

const dev = process.env.NODE_ENV !== "production"
const port = parseInt(process.env.PORT ?? "3000", 10)

const app = next({ dev })
const handle = app.getRequestHandler()

// turn timers keyed by room code
const turnTimers = new Map<string, NodeJS.Timeout>()
const fakeGuessTimers = new Map<string, NodeJS.Timeout>()

const toPublicRoom = (room: RoomState): RoomStatePublic => ({
  code: room.code,
  hostId: room.hostId,
  players: room.players,
  state: room.state,
  round: room.round,
  totalRounds: room.totalRounds,
  turnDurationMs: room.turnDurationMs,
  turnOrder: room.turnOrder,
  currentTurnIndex: room.currentTurnIndex,
  category: room.category,
  turnEndsAt: room.turnEndsAt,
  votes: tallyVotes(room.votes),
  strokes: room.strokes,
  chatMessages: room.chatMessages,
  scores: room.scores,
})

const broadcastRoom = (io: Server, room: RoomState) => {
  io.to(room.code).emit("room:state", { room: toPublicRoom(room) })
}

const startTurnTimer = (io: Server, code: string, durationMs: number) => {
  clearTurnTimer(code)
  const timer = setTimeout(async () => {
    const room = await getRoom(code)
    if (!room || room.state !== "drawing_turns") return
    await handleTurnEnd(io, room)
  }, durationMs + 500)
  turnTimers.set(code, timer)
}

const clearTurnTimer = (code: string) => {
  const t = turnTimers.get(code)
  if (t) { clearTimeout(t); turnTimers.delete(code) }
}

const handleTurnEnd = async (io: Server, room: RoomState) => {
  const { room: next, roundEnded } = advanceTurn(room)
  if (roundEnded) {
    next.state = "voting"
    await saveRoom(next)
    broadcastRoom(io, next)
    return
  }

  const currentPlayer = next.players.find(
    (p) => p.id === next.turnOrder[next.currentTurnIndex]
  )
  await saveRoom(next)
  broadcastRoom(io, next)
  io.to(next.code).emit("turn:start", {
    playerId: next.turnOrder[next.currentTurnIndex],
    playerName: currentPlayer?.name ?? "",
    endsAt: next.turnEndsAt,
  })
  startTurnTimer(io, next.code, next.turnDurationMs)
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res))

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  io.on("connection", (socket: Socket) => {
    // ─── Room Management ─────────────────────────────────────────────────

    socket.on("room:create", async ({ name }: C2S_CreateRoom) => {
      if (!name?.trim()) return socket.emit("error", { message: "Name required" })

      const code = generateRoomCode()
      const player: Player = {
        id: socket.id,
        name: name.trim(),
        score: 0,
        isHost: true,
        isConnected: true,
      }
      const room: RoomState = {
        code,
        hostId: socket.id,
        players: [player],
        state: "lobby",
        round: 0,
        totalRounds: 2,
        turnDurationMs: DEFAULT_TURN_DURATION_MS,
        turnOrder: [],
        currentTurnIndex: 0,
        fakeId: null,
        category: null,
        subject: null,
        turnEndsAt: null,
        votes: {},
        fakeGuess: null,
        scores: { [socket.id]: 0 },
        strokes: [],
        chatMessages: [],
      }

      await saveRoom(room)
      await socket.join(code)
      socket.data.roomCode = code
      socket.data.playerName = name.trim()
      socket.emit("room:joined", { room: toPublicRoom(room), code })
    })

    socket.on("room:join", async ({ code, name }: C2S_JoinRoom) => {
      if (!name?.trim()) return socket.emit("error", { message: "Name required" })
      if (!code?.trim()) return socket.emit("error", { message: "Room code required" })

      const room = await getRoom(code)
      if (!room) return socket.emit("error", { message: "Room not found" })
      if (room.state !== "lobby")
        return socket.emit("error", { message: "Game already in progress" })
      if (room.players.length >= 8)
        return socket.emit("error", { message: "Room is full (max 8)" })

      const nameTaken = room.players.some(
        (p) => p.name.toLowerCase() === name.trim().toLowerCase()
      )
      if (nameTaken)
        return socket.emit("error", { message: "Name already taken in this room" })

      const player: Player = {
        id: socket.id,
        name: name.trim(),
        score: 0,
        isHost: false,
        isConnected: true,
      }
      room.players.push(player)
      room.scores[socket.id] = 0

      await saveRoom(room)
      await socket.join(code)
      socket.data.roomCode = code
      socket.data.playerName = name.trim()

      socket.emit("room:joined", { room: toPublicRoom(room), code })
      broadcastRoom(io, room)
    })

    socket.on("room:rejoin", async ({ code, name }: C2S_JoinRoom) => {
      const room = await getRoom(code)
      if (!room) return socket.emit("error", { message: "Room not found" })

      const existing = room.players.find(
        (p) => p.name.toLowerCase() === name.trim().toLowerCase()
      )
      if (!existing)
        return socket.emit("error", { message: "Player not found in room" })

      // Update socket id for player
      const oldId = existing.id
      existing.id = socket.id
      existing.isConnected = true

      // Update references
      room.scores[socket.id] = room.scores[oldId] ?? 0
      delete room.scores[oldId]
      room.turnOrder = room.turnOrder.map((id) => (id === oldId ? socket.id : id))
      if (room.hostId === oldId) room.hostId = socket.id
      if (room.fakeId === oldId) room.fakeId = socket.id
      for (const [voter, accused] of Object.entries(room.votes)) {
        if (accused === oldId) room.votes[voter] = socket.id
        if (voter === oldId) {
          room.votes[socket.id] = room.votes[voter]
          delete room.votes[voter]
        }
      }

      const strokes = await getStrokes(code)
      room.strokes = strokes

      await saveRoom(room)
      await socket.join(code)
      socket.data.roomCode = code
      socket.data.playerName = name.trim()

      // Re-emit role
      const role = await getRole(code, socket.id)
      if (role) socket.emit("role:assign", role)

      socket.emit("room:joined", { room: toPublicRoom(room), code })
      broadcastRoom(io, room)
    })

    // ─── Game Start ──────────────────────────────────────────────────────

    socket.on("game:start", async ({ category, subject, totalRounds, turnDurationMs }: C2S_StartGame) => {
      const code = socket.data.roomCode
      if (!code) return socket.emit("error", { message: "Not in a room" })

      const room = await getRoom(code)
      if (!room) return socket.emit("error", { message: "Room not found" })
      if (room.hostId !== socket.id) return socket.emit("error", { message: "Only the host can start" })
      if (room.players.length < MIN_PLAYERS)
        return socket.emit("error", { message: `Need at least ${MIN_PLAYERS} players` })
      if (room.state !== "lobby") return socket.emit("error", { message: "Game already started" })

      // Assign fake artist
      const fakeIndex = Math.floor(Math.random() * room.players.length)
      const fakeId = room.players[fakeIndex].id

      const turnOrder = buildTurnOrder(room.players)

      const safeDuration = Math.min(
        MAX_TURN_DURATION_MS,
        Math.max(MIN_TURN_DURATION_MS, turnDurationMs ?? DEFAULT_TURN_DURATION_MS)
      )

      room.state = "category_assign"
      room.fakeId = fakeId
      room.category = category
      room.subject = subject
      room.round = 1
      room.totalRounds = totalRounds ?? 2
      room.turnDurationMs = safeDuration
      room.turnOrder = turnOrder
      room.currentTurnIndex = 0
      room.votes = {}
      room.fakeGuess = null
      room.strokes = []

      await clearStrokes(code)
      await clearVotes(code)
      await saveRoom(room)

      // Emit roles individually
      for (const player of room.players) {
        const isFake = player.id === fakeId
        const rolePayload = {
          role: isFake ? "fake" as const : "artist" as const,
          subject: isFake ? null : subject,
          category,
        }
        await setRole(code, player.id, rolePayload)
        io.to(player.id).emit("role:assign", rolePayload)
      }

      broadcastRoom(io, room)

      // Short delay to let players read their roles, then start drawing
      await new Promise((r) => setTimeout(r, 3000))

      room.state = "drawing_turns"
      room.turnEndsAt = Date.now() + safeDuration
      await saveRoom(room)

      const firstPlayer = room.players.find(
        (p) => p.id === room.turnOrder[0]
      )
      broadcastRoom(io, room)
      io.to(code).emit("turn:start", {
        playerId: room.turnOrder[0],
        playerName: firstPlayer?.name ?? "",
        endsAt: room.turnEndsAt,
      })
      startTurnTimer(io, code, safeDuration)
    })

    // ─── Stroke Data ─────────────────────────────────────────────────────

    socket.on("stroke:data", async ({ stroke }: C2S_StrokeData) => {
      const code = socket.data.roomCode
      if (!code) return

      const room = await getRoom(code)
      if (!room || room.state !== "drawing_turns") return

      const currentPlayerId = room.turnOrder[room.currentTurnIndex]
      if (currentPlayerId !== socket.id) return // turn enforcement

      if (!stroke?.points?.length) return

      const validatedStroke: Stroke = {
        id: uuidv4(),
        playerId: socket.id,
        points: stroke.points.map((p) => ({
          x: Math.min(1, Math.max(0, p.x)),
          y: Math.min(1, Math.max(0, p.y)),
        })),
        color: stroke.color ?? "#1a1a1a",
        width: Math.min(40, Math.max(1, stroke.width ?? 4)),
        opacity: Math.min(1, Math.max(0.1, stroke.opacity ?? 1)),
      }

      room.strokes.push(validatedStroke)
      await saveRoom(room)
      await pushStroke(code, validatedStroke)

      // Broadcast to all (including sender for confirmation)
      io.to(code).emit("stroke:broadcast", { stroke: validatedStroke })

      // End turn immediately after stroke committed
      clearTurnTimer(code)
      await handleTurnEnd(io, room)
    })

    socket.on("turn:skip", async () => {
      const code = socket.data.roomCode
      if (!code) return

      const room = await getRoom(code)
      if (!room || room.state !== "drawing_turns") return
      if (room.turnOrder[room.currentTurnIndex] !== socket.id) return

      clearTurnTimer(code)
      await handleTurnEnd(io, room)
    })

    // ─── Voting ──────────────────────────────────────────────────────────

    socket.on("vote:cast", async ({ accusedId }: C2S_CastVote) => {
      const code = socket.data.roomCode
      if (!code) return

      const room = await getRoom(code)
      if (!room || room.state !== "voting") return

      const isPlayer = room.players.some((p) => p.id === socket.id)
      if (!isPlayer) return
      if (socket.id === accusedId) return // can't vote yourself

      room.votes[socket.id] = accusedId
      await setVote(code, socket.id, accusedId)
      await saveRoom(room)

      broadcastRoom(io, room)

      // Auto-resolve if all players have voted
      const connectedPlayers = room.players.filter((p) => p.isConnected)
      if (Object.keys(room.votes).length >= connectedPlayers.length) {
        await resolveVoting(io, room)
      }
    })

    // ─── Fake Guess ──────────────────────────────────────────────────────

    socket.on("fake:guess", async ({ guess }: C2S_FakeGuess) => {
      const code = socket.data.roomCode
      if (!code) return

      const room = await getRoom(code)
      if (!room || room.state !== "fake_guess") return
      if (socket.id !== room.fakeId) return

      clearTimeout(fakeGuessTimers.get(code))
      fakeGuessTimers.delete(code)

      room.fakeGuess = guess.trim()
      await resolveRound(io, room)
    })

    // ─── Chat ────────────────────────────────────────────────────────────

    socket.on("chat:message", async ({ text }: C2S_ChatMessage) => {
      const code = socket.data.roomCode
      if (!code) return

      const room = await getRoom(code)
      if (!room) return

      const player = room.players.find((p) => p.id === socket.id)
      if (!player) return

      const msg = {
        id: uuidv4(),
        playerId: socket.id,
        playerName: player.name,
        text: text.trim().slice(0, 200),
        timestamp: Date.now(),
      }

      room.chatMessages = [...(room.chatMessages ?? []).slice(-49), msg]
      await saveRoom(room)
      io.to(code).emit("chat:message", msg)
    })

    // ─── Next Round ──────────────────────────────────────────────────────

    socket.on("game:next_round", async () => {
      const code = socket.data.roomCode
      if (!code) return

      const room = await getRoom(code)
      if (!room) return
      if (room.hostId !== socket.id) return
      if (room.state !== "scores") return

      room.state = "lobby"
      room.round = 0
      room.turnOrder = []
      room.currentTurnIndex = 0
      room.fakeId = null
      room.category = null
      room.subject = null
      room.turnEndsAt = null
      room.votes = {}
      room.fakeGuess = null
      room.strokes = []
      room.chatMessages = []

      await clearStrokes(code)
      await clearVotes(code)
      await saveRoom(room)
      broadcastRoom(io, room)
    })

    // ─── Disconnect ──────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      const code = socket.data.roomCode
      if (!code) return

      const room = await getRoom(code)
      if (!room) return

      const player = room.players.find((p) => p.id === socket.id)
      if (player) player.isConnected = false

      // If it was their turn, auto-skip after grace period
      if (
        room.state === "drawing_turns" &&
        room.turnOrder[room.currentTurnIndex] === socket.id
      ) {
        clearTurnTimer(code)
        setTimeout(async () => {
          const fresh = await getRoom(code)
          if (!fresh) return
          if (fresh.turnOrder[fresh.currentTurnIndex] !== socket.id) return
          await handleTurnEnd(io, fresh)
        }, 3000)
      }

      // If everyone left, clean up
      const anyConnected = room.players.some((p) => p.isConnected)
      if (!anyConnected) {
        clearTurnTimer(code)
        setTimeout(async () => {
          const fresh = await getRoom(code)
          if (!fresh) return
          const stillConnected = fresh.players.some((p) => p.isConnected)
          if (!stillConnected) await deleteRoom(code)
        }, 30_000)
      }

      await saveRoom(room)
      broadcastRoom(io, room)
    })
  })

  // ─── Resolve helpers ─────────────────────────────────────────────────────

  async function resolveVoting(io: Server, room: RoomState) {
    const tally = tallyVotes(room.votes)
    const mostVotedId = findMostVoted(tally)
    const isFakeCaught = mostVotedId === room.fakeId
    const fake = room.players.find((p) => p.id === room.fakeId)

    io.to(room.code).emit("vote:results", {
      votes: tally,
      isFakeCaught,
      fakeId: room.fakeId,
      fakeName: fake?.name ?? "Unknown",
    })

    if (isFakeCaught) {
      room.state = "fake_guess"
      await saveRoom(room)
      broadcastRoom(io, room)

      // Notify fake artist specifically
      if (room.fakeId) {
        io.to(room.fakeId).emit("fake:guess_prompt", {
          endsAt: Date.now() + FAKE_GUESS_DURATION_MS,
        })
      }

      const timer = setTimeout(async () => {
        const fresh = await getRoom(room.code)
        if (!fresh || fresh.state !== "fake_guess") return
        fresh.fakeGuess = null
        await resolveRound(io, fresh)
      }, FAKE_GUESS_DURATION_MS)
      fakeGuessTimers.set(room.code, timer)
    } else {
      await resolveRound(io, room)
    }
  }

  async function resolveRound(io: Server, room: RoomState) {
    const votes = await getVotes(room.code)
    const tally = tallyVotes(votes)
    const mostVotedId = findMostVoted(tally)
    const isFakeCaught = mostVotedId === room.fakeId

    const fakeGuessedCorrectly =
      isFakeCaught &&
      room.fakeGuess != null &&
      room.subject != null &&
      room.fakeGuess.trim().toLowerCase() === room.subject.trim().toLowerCase()

    const result = buildRoundResult({
      room,
      isFakeCaught,
      fakeGuessedCorrectly,
      votes,
    })

    room.state = "scores"
    room.scores = result.scores
    await saveRoom(room)

    io.to(room.code).emit("round:end", result)
    broadcastRoom(io, room)
  }

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
