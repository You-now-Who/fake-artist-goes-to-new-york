"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
// env-setup MUST be the first import — its module body runs before lib/redis.ts
// reads process.env, which is exactly what we need in ESM.
require("./env-setup");
const http_1 = require("http");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const redis_1 = require("../lib/redis");
const game_logic_1 = require("../lib/game-logic");
const room_codes_1 = require("../lib/room-codes");
const dev = process.env.NODE_ENV !== "production";
const port = parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : "3000", 10);
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
// turn timers keyed by room code
const turnTimers = new Map();
const fakeGuessTimers = new Map();
const toPublicRoom = (room) => ({
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
    votes: (0, game_logic_1.tallyVotes)(room.votes),
    strokes: room.strokes,
    chatMessages: room.chatMessages,
    scores: room.scores,
});
const broadcastRoom = (io, room) => {
    io.to(room.code).emit("room:state", { room: toPublicRoom(room) });
};
const startTurnTimer = (io, code, durationMs) => {
    clearTurnTimer(code);
    const timer = setTimeout(async () => {
        const room = await (0, redis_1.getRoom)(code);
        if (!room || room.state !== "drawing_turns")
            return;
        await handleTurnEnd(io, room);
    }, durationMs + 500);
    turnTimers.set(code, timer);
};
const clearTurnTimer = (code) => {
    const t = turnTimers.get(code);
    if (t) {
        clearTimeout(t);
        turnTimers.delete(code);
    }
};
const handleTurnEnd = async (io, room) => {
    var _a;
    const { room: next, roundEnded } = (0, game_logic_1.advanceTurn)(room);
    if (roundEnded) {
        next.state = "voting";
        await (0, redis_1.saveRoom)(next);
        broadcastRoom(io, next);
        return;
    }
    const currentPlayer = next.players.find((p) => p.id === next.turnOrder[next.currentTurnIndex]);
    await (0, redis_1.saveRoom)(next);
    broadcastRoom(io, next);
    io.to(next.code).emit("turn:start", {
        playerId: next.turnOrder[next.currentTurnIndex],
        playerName: (_a = currentPlayer === null || currentPlayer === void 0 ? void 0 : currentPlayer.name) !== null && _a !== void 0 ? _a : "",
        endsAt: next.turnEndsAt,
    });
    startTurnTimer(io, next.code, next.turnDurationMs);
};
app.prepare().then(() => {
    const httpServer = (0, http_1.createServer)((req, res) => handle(req, res));
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", (socket) => {
        // ─── Room Management ─────────────────────────────────────────────────
        socket.on("room:create", async ({ name }) => {
            if (!(name === null || name === void 0 ? void 0 : name.trim()))
                return socket.emit("error", { message: "Name required" });
            const code = (0, room_codes_1.generateRoomCode)();
            const player = {
                id: socket.id,
                name: name.trim(),
                score: 0,
                isHost: true,
                isConnected: true,
            };
            const room = {
                code,
                hostId: socket.id,
                players: [player],
                state: "lobby",
                round: 0,
                totalRounds: 2,
                turnDurationMs: game_logic_1.DEFAULT_TURN_DURATION_MS,
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
            };
            await (0, redis_1.saveRoom)(room);
            await socket.join(code);
            socket.data.roomCode = code;
            socket.data.playerName = name.trim();
            socket.emit("room:joined", { room: toPublicRoom(room), code });
        });
        socket.on("room:join", async ({ code, name }) => {
            if (!(name === null || name === void 0 ? void 0 : name.trim()))
                return socket.emit("error", { message: "Name required" });
            if (!(code === null || code === void 0 ? void 0 : code.trim()))
                return socket.emit("error", { message: "Room code required" });
            const room = await (0, redis_1.getRoom)(code);
            if (!room)
                return socket.emit("error", { message: "Room not found" });
            if (room.state !== "lobby")
                return socket.emit("error", { message: "Game already in progress" });
            if (room.players.length >= 8)
                return socket.emit("error", { message: "Room is full (max 8)" });
            const nameTaken = room.players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());
            if (nameTaken)
                return socket.emit("error", { message: "Name already taken in this room" });
            const player = {
                id: socket.id,
                name: name.trim(),
                score: 0,
                isHost: false,
                isConnected: true,
            };
            room.players.push(player);
            room.scores[socket.id] = 0;
            await (0, redis_1.saveRoom)(room);
            await socket.join(code);
            socket.data.roomCode = code;
            socket.data.playerName = name.trim();
            socket.emit("room:joined", { room: toPublicRoom(room), code });
            broadcastRoom(io, room);
        });
        socket.on("room:rejoin", async ({ code, name }) => {
            var _a;
            const room = await (0, redis_1.getRoom)(code);
            if (!room)
                return socket.emit("error", { message: "Room not found" });
            const existing = room.players.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
            if (!existing)
                return socket.emit("error", { message: "Player not found in room" });
            // Update socket id for player
            const oldId = existing.id;
            existing.id = socket.id;
            existing.isConnected = true;
            // Update references
            room.scores[socket.id] = (_a = room.scores[oldId]) !== null && _a !== void 0 ? _a : 0;
            delete room.scores[oldId];
            room.turnOrder = room.turnOrder.map((id) => (id === oldId ? socket.id : id));
            if (room.hostId === oldId)
                room.hostId = socket.id;
            if (room.fakeId === oldId)
                room.fakeId = socket.id;
            for (const [voter, accused] of Object.entries(room.votes)) {
                if (accused === oldId)
                    room.votes[voter] = socket.id;
                if (voter === oldId) {
                    room.votes[socket.id] = room.votes[voter];
                    delete room.votes[voter];
                }
            }
            const strokes = await (0, redis_1.getStrokes)(code);
            room.strokes = strokes;
            await (0, redis_1.saveRoom)(room);
            await socket.join(code);
            socket.data.roomCode = code;
            socket.data.playerName = name.trim();
            // Re-emit role
            const role = await (0, redis_1.getRole)(code, socket.id);
            if (role)
                socket.emit("role:assign", role);
            socket.emit("room:joined", { room: toPublicRoom(room), code });
            broadcastRoom(io, room);
        });
        // ─── Game Start ──────────────────────────────────────────────────────
        socket.on("game:start", async ({ category, subject, totalRounds, turnDurationMs }) => {
            var _a;
            const code = socket.data.roomCode;
            if (!code)
                return socket.emit("error", { message: "Not in a room" });
            const room = await (0, redis_1.getRoom)(code);
            if (!room)
                return socket.emit("error", { message: "Room not found" });
            if (room.hostId !== socket.id)
                return socket.emit("error", { message: "Only the host can start" });
            if (room.players.length < game_logic_1.MIN_PLAYERS)
                return socket.emit("error", { message: `Need at least ${game_logic_1.MIN_PLAYERS} players` });
            if (room.state !== "lobby")
                return socket.emit("error", { message: "Game already started" });
            // Assign fake artist
            const fakeIndex = Math.floor(Math.random() * room.players.length);
            const fakeId = room.players[fakeIndex].id;
            const turnOrder = (0, game_logic_1.buildTurnOrder)(room.players);
            const safeDuration = Math.min(game_logic_1.MAX_TURN_DURATION_MS, Math.max(game_logic_1.MIN_TURN_DURATION_MS, turnDurationMs !== null && turnDurationMs !== void 0 ? turnDurationMs : game_logic_1.DEFAULT_TURN_DURATION_MS));
            room.state = "category_assign";
            room.fakeId = fakeId;
            room.category = category;
            room.subject = subject;
            room.round = 1;
            room.totalRounds = totalRounds !== null && totalRounds !== void 0 ? totalRounds : 2;
            room.turnDurationMs = safeDuration;
            room.turnOrder = turnOrder;
            room.currentTurnIndex = 0;
            room.votes = {};
            room.fakeGuess = null;
            room.strokes = [];
            await (0, redis_1.clearStrokes)(code);
            await (0, redis_1.clearVotes)(code);
            await (0, redis_1.saveRoom)(room);
            // Emit roles individually
            for (const player of room.players) {
                const isFake = player.id === fakeId;
                const rolePayload = {
                    role: isFake ? "fake" : "artist",
                    subject: isFake ? null : subject,
                    category,
                };
                await (0, redis_1.setRole)(code, player.id, rolePayload);
                io.to(player.id).emit("role:assign", rolePayload);
            }
            broadcastRoom(io, room);
            // Short delay to let players read their roles, then start drawing
            await new Promise((r) => setTimeout(r, 3000));
            room.state = "drawing_turns";
            room.turnEndsAt = Date.now() + safeDuration;
            await (0, redis_1.saveRoom)(room);
            const firstPlayer = room.players.find((p) => p.id === room.turnOrder[0]);
            broadcastRoom(io, room);
            io.to(code).emit("turn:start", {
                playerId: room.turnOrder[0],
                playerName: (_a = firstPlayer === null || firstPlayer === void 0 ? void 0 : firstPlayer.name) !== null && _a !== void 0 ? _a : "",
                endsAt: room.turnEndsAt,
            });
            startTurnTimer(io, code, safeDuration);
        });
        // ─── Stroke Data ─────────────────────────────────────────────────────
        socket.on("stroke:data", async ({ stroke }) => {
            var _a, _b, _c, _d;
            const code = socket.data.roomCode;
            if (!code)
                return;
            const room = await (0, redis_1.getRoom)(code);
            if (!room || room.state !== "drawing_turns")
                return;
            const currentPlayerId = room.turnOrder[room.currentTurnIndex];
            if (currentPlayerId !== socket.id)
                return; // turn enforcement
            if (!((_a = stroke === null || stroke === void 0 ? void 0 : stroke.points) === null || _a === void 0 ? void 0 : _a.length))
                return;
            const validatedStroke = {
                id: (0, uuid_1.v4)(),
                playerId: socket.id,
                points: stroke.points.map((p) => ({
                    x: Math.min(1, Math.max(0, p.x)),
                    y: Math.min(1, Math.max(0, p.y)),
                })),
                color: (_b = stroke.color) !== null && _b !== void 0 ? _b : "#1a1a1a",
                width: Math.min(40, Math.max(1, (_c = stroke.width) !== null && _c !== void 0 ? _c : 4)),
                opacity: Math.min(1, Math.max(0.1, (_d = stroke.opacity) !== null && _d !== void 0 ? _d : 1)),
            };
            room.strokes.push(validatedStroke);
            await (0, redis_1.saveRoom)(room);
            await (0, redis_1.pushStroke)(code, validatedStroke);
            // Broadcast to all (including sender for confirmation)
            io.to(code).emit("stroke:broadcast", { stroke: validatedStroke });
            // End turn immediately after stroke committed
            clearTurnTimer(code);
            await handleTurnEnd(io, room);
        });
        socket.on("turn:skip", async () => {
            const code = socket.data.roomCode;
            if (!code)
                return;
            const room = await (0, redis_1.getRoom)(code);
            if (!room || room.state !== "drawing_turns")
                return;
            if (room.turnOrder[room.currentTurnIndex] !== socket.id)
                return;
            clearTurnTimer(code);
            await handleTurnEnd(io, room);
        });
        // ─── Voting ──────────────────────────────────────────────────────────
        socket.on("vote:cast", async ({ accusedId }) => {
            const code = socket.data.roomCode;
            if (!code)
                return;
            const room = await (0, redis_1.getRoom)(code);
            if (!room || room.state !== "voting")
                return;
            const isPlayer = room.players.some((p) => p.id === socket.id);
            if (!isPlayer)
                return;
            if (socket.id === accusedId)
                return; // can't vote yourself
            room.votes[socket.id] = accusedId;
            await (0, redis_1.setVote)(code, socket.id, accusedId);
            await (0, redis_1.saveRoom)(room);
            broadcastRoom(io, room);
            // Auto-resolve if all players have voted
            const connectedPlayers = room.players.filter((p) => p.isConnected);
            if (Object.keys(room.votes).length >= connectedPlayers.length) {
                await resolveVoting(io, room);
            }
        });
        // ─── Fake Guess ──────────────────────────────────────────────────────
        socket.on("fake:guess", async ({ guess }) => {
            const code = socket.data.roomCode;
            if (!code)
                return;
            const room = await (0, redis_1.getRoom)(code);
            if (!room || room.state !== "fake_guess")
                return;
            if (socket.id !== room.fakeId)
                return;
            clearTimeout(fakeGuessTimers.get(code));
            fakeGuessTimers.delete(code);
            room.fakeGuess = guess.trim();
            await resolveRound(io, room);
        });
        // ─── Chat ────────────────────────────────────────────────────────────
        socket.on("chat:message", async ({ text }) => {
            var _a;
            const code = socket.data.roomCode;
            if (!code)
                return;
            const room = await (0, redis_1.getRoom)(code);
            if (!room)
                return;
            const player = room.players.find((p) => p.id === socket.id);
            if (!player)
                return;
            const msg = {
                id: (0, uuid_1.v4)(),
                playerId: socket.id,
                playerName: player.name,
                text: text.trim().slice(0, 200),
                timestamp: Date.now(),
            };
            room.chatMessages = [...((_a = room.chatMessages) !== null && _a !== void 0 ? _a : []).slice(-49), msg];
            await (0, redis_1.saveRoom)(room);
            io.to(code).emit("chat:message", msg);
        });
        // ─── Next Round ──────────────────────────────────────────────────────
        socket.on("game:next_round", async () => {
            const code = socket.data.roomCode;
            if (!code)
                return;
            const room = await (0, redis_1.getRoom)(code);
            if (!room)
                return;
            if (room.hostId !== socket.id)
                return;
            if (room.state !== "scores")
                return;
            room.state = "lobby";
            room.round = 0;
            room.turnOrder = [];
            room.currentTurnIndex = 0;
            room.fakeId = null;
            room.category = null;
            room.subject = null;
            room.turnEndsAt = null;
            room.votes = {};
            room.fakeGuess = null;
            room.strokes = [];
            room.chatMessages = [];
            await (0, redis_1.clearStrokes)(code);
            await (0, redis_1.clearVotes)(code);
            await (0, redis_1.saveRoom)(room);
            broadcastRoom(io, room);
        });
        // ─── Disconnect ──────────────────────────────────────────────────────
        socket.on("disconnect", async () => {
            const code = socket.data.roomCode;
            if (!code)
                return;
            const room = await (0, redis_1.getRoom)(code);
            if (!room)
                return;
            const player = room.players.find((p) => p.id === socket.id);
            if (player)
                player.isConnected = false;
            // If it was their turn, auto-skip after grace period
            if (room.state === "drawing_turns" &&
                room.turnOrder[room.currentTurnIndex] === socket.id) {
                clearTurnTimer(code);
                setTimeout(async () => {
                    const fresh = await (0, redis_1.getRoom)(code);
                    if (!fresh)
                        return;
                    if (fresh.turnOrder[fresh.currentTurnIndex] !== socket.id)
                        return;
                    await handleTurnEnd(io, fresh);
                }, 3000);
            }
            // If everyone left, clean up
            const anyConnected = room.players.some((p) => p.isConnected);
            if (!anyConnected) {
                clearTurnTimer(code);
                setTimeout(async () => {
                    const fresh = await (0, redis_1.getRoom)(code);
                    if (!fresh)
                        return;
                    const stillConnected = fresh.players.some((p) => p.isConnected);
                    if (!stillConnected)
                        await (0, redis_1.deleteRoom)(code);
                }, 30000);
            }
            await (0, redis_1.saveRoom)(room);
            broadcastRoom(io, room);
        });
    });
    // ─── Resolve helpers ─────────────────────────────────────────────────────
    async function resolveVoting(io, room) {
        var _a;
        const tally = (0, game_logic_1.tallyVotes)(room.votes);
        const mostVotedId = (0, game_logic_1.findMostVoted)(tally);
        const isFakeCaught = mostVotedId === room.fakeId;
        const fake = room.players.find((p) => p.id === room.fakeId);
        io.to(room.code).emit("vote:results", {
            votes: tally,
            isFakeCaught,
            fakeId: room.fakeId,
            fakeName: (_a = fake === null || fake === void 0 ? void 0 : fake.name) !== null && _a !== void 0 ? _a : "Unknown",
        });
        if (isFakeCaught) {
            room.state = "fake_guess";
            await (0, redis_1.saveRoom)(room);
            broadcastRoom(io, room);
            // Notify fake artist specifically
            if (room.fakeId) {
                io.to(room.fakeId).emit("fake:guess_prompt", {
                    endsAt: Date.now() + game_logic_1.FAKE_GUESS_DURATION_MS,
                });
            }
            const timer = setTimeout(async () => {
                const fresh = await (0, redis_1.getRoom)(room.code);
                if (!fresh || fresh.state !== "fake_guess")
                    return;
                fresh.fakeGuess = null;
                await resolveRound(io, fresh);
            }, game_logic_1.FAKE_GUESS_DURATION_MS);
            fakeGuessTimers.set(room.code, timer);
        }
        else {
            await resolveRound(io, room);
        }
    }
    async function resolveRound(io, room) {
        const votes = await (0, redis_1.getVotes)(room.code);
        const tally = (0, game_logic_1.tallyVotes)(votes);
        const mostVotedId = (0, game_logic_1.findMostVoted)(tally);
        const isFakeCaught = mostVotedId === room.fakeId;
        const fakeGuessedCorrectly = isFakeCaught &&
            room.fakeGuess != null &&
            room.subject != null &&
            room.fakeGuess.trim().toLowerCase() === room.subject.trim().toLowerCase();
        const result = (0, game_logic_1.buildRoundResult)({
            room,
            isFakeCaught,
            fakeGuessedCorrectly,
            votes,
        });
        room.state = "scores";
        room.scores = result.scores;
        await (0, redis_1.saveRoom)(room);
        io.to(room.code).emit("round:end", result);
        broadcastRoom(io, room);
    }
    httpServer.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    });
});
