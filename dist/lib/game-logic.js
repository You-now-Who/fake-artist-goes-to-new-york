"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRoundResult = exports.applyScoreDelta = exports.calcScores = exports.findMostVoted = exports.tallyVotes = exports.advanceTurn = exports.isDrawingComplete = exports.getCurrentPlayer = exports.buildTurnOrder = exports.MIN_PLAYERS = exports.FAKE_GUESS_DURATION_MS = exports.MAX_TURN_DURATION_MS = exports.MIN_TURN_DURATION_MS = exports.DEFAULT_TURN_DURATION_MS = void 0;
exports.DEFAULT_TURN_DURATION_MS = 30000;
exports.MIN_TURN_DURATION_MS = 5000;
exports.MAX_TURN_DURATION_MS = 60000;
exports.FAKE_GUESS_DURATION_MS = 15000;
exports.MIN_PLAYERS = 3;
const buildTurnOrder = (players) => [...players.map((p) => p.id)].sort(() => Math.random() - 0.5);
exports.buildTurnOrder = buildTurnOrder;
const getCurrentPlayer = (room) => room.players.find((p) => p.id === room.turnOrder[room.currentTurnIndex]);
exports.getCurrentPlayer = getCurrentPlayer;
const isDrawingComplete = (room) => {
    const { currentTurnIndex, turnOrder, round, totalRounds } = room;
    // We've gone through every player in the current round
    return round >= totalRounds && currentTurnIndex >= turnOrder.length;
};
exports.isDrawingComplete = isDrawingComplete;
const advanceTurn = (room) => {
    const nextIndex = room.currentTurnIndex + 1;
    if (nextIndex >= room.turnOrder.length) {
        const nextRound = room.round + 1;
        if (nextRound > room.totalRounds) {
            return {
                room: Object.assign(Object.assign({}, room), { currentTurnIndex: nextIndex, state: "voting" }),
                roundEnded: true,
            };
        }
        const dur = room.turnDurationMs || exports.DEFAULT_TURN_DURATION_MS;
        return {
            room: Object.assign(Object.assign({}, room), { round: nextRound, currentTurnIndex: 0, turnEndsAt: Date.now() + dur }),
            roundEnded: false,
        };
    }
    const dur = room.turnDurationMs || exports.DEFAULT_TURN_DURATION_MS;
    return {
        room: Object.assign(Object.assign({}, room), { currentTurnIndex: nextIndex, turnEndsAt: Date.now() + dur }),
        roundEnded: false,
    };
};
exports.advanceTurn = advanceTurn;
const tallyVotes = (votes) => {
    var _a;
    const tally = {};
    for (const accused of Object.values(votes)) {
        tally[accused] = ((_a = tally[accused]) !== null && _a !== void 0 ? _a : 0) + 1;
    }
    return tally;
};
exports.tallyVotes = tallyVotes;
const findMostVoted = (tally) => {
    let max = 0;
    let winner = null;
    for (const [id, count] of Object.entries(tally)) {
        if (count > max) {
            max = count;
            winner = id;
        }
    }
    return winner;
};
exports.findMostVoted = findMostVoted;
const calcScores = ({ room, isFakeCaught, fakeGuessedCorrectly, votes, }) => {
    var _a;
    const delta = {};
    const fakeId = room.fakeId;
    if (!isFakeCaught) {
        // Fake survives undetected: fake gets 3pts + 1pt per wrong vote
        delta[fakeId] = 3;
        for (const [_voter, accused] of Object.entries(votes)) {
            if (accused !== fakeId) {
                delta[fakeId] = ((_a = delta[fakeId]) !== null && _a !== void 0 ? _a : 0) + 1;
            }
        }
    }
    else if (fakeGuessedCorrectly) {
        // Fake caught but guesses word: fake gets 2pts
        delta[fakeId] = 2;
    }
    else {
        // Fake caught and doesn't guess: real artists each get 2pts
        for (const player of room.players) {
            if (player.id !== fakeId) {
                delta[player.id] = 2;
            }
        }
    }
    return delta;
};
exports.calcScores = calcScores;
const applyScoreDelta = (existing, delta) => {
    var _a;
    const updated = Object.assign({}, existing);
    for (const [id, pts] of Object.entries(delta)) {
        updated[id] = ((_a = updated[id]) !== null && _a !== void 0 ? _a : 0) + pts;
    }
    return updated;
};
exports.applyScoreDelta = applyScoreDelta;
const buildRoundResult = ({ room, isFakeCaught, fakeGuessedCorrectly, votes, }) => {
    var _a, _b, _c;
    const scoreDelta = (0, exports.calcScores)({ room, isFakeCaught, fakeGuessedCorrectly, votes });
    const scores = (0, exports.applyScoreDelta)(room.scores, scoreDelta);
    const fake = room.players.find((p) => p.id === room.fakeId);
    return {
        isFakeCaught,
        fakeGuessedCorrectly,
        scores,
        scoreDelta,
        subject: (_a = room.subject) !== null && _a !== void 0 ? _a : "",
        fakeId: (_b = room.fakeId) !== null && _b !== void 0 ? _b : "",
        fakeName: (_c = fake === null || fake === void 0 ? void 0 : fake.name) !== null && _c !== void 0 ? _c : "Unknown",
    };
};
exports.buildRoundResult = buildRoundResult;
