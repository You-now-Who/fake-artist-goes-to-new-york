"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votesKey = exports.rolesKey = exports.strokesKey = exports.roomKey = exports.redis = void 0;
exports.getRoom = getRoom;
exports.saveRoom = saveRoom;
exports.deleteRoom = deleteRoom;
exports.pushStroke = pushStroke;
exports.getStrokes = getStrokes;
exports.clearStrokes = clearStrokes;
exports.setRole = setRole;
exports.getRole = getRole;
exports.setVote = setVote;
exports.getVotes = getVotes;
exports.clearVotes = clearVotes;
const redis_1 = require("@upstash/redis");
// console.log(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
exports.redis = new redis_1.Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const ROOM_TTL = 60 * 60 * 4; // 4 hours
const roomKey = (code) => `room:${code}`;
exports.roomKey = roomKey;
const strokesKey = (code) => `room:${code}:strokes`;
exports.strokesKey = strokesKey;
const rolesKey = (code) => `room:${code}:roles`;
exports.rolesKey = rolesKey;
const votesKey = (code) => `room:${code}:votes`;
exports.votesKey = votesKey;
async function getRoom(code) {
    const data = await exports.redis.get((0, exports.roomKey)(code));
    return data !== null && data !== void 0 ? data : null;
}
async function saveRoom(room) {
    await exports.redis.set((0, exports.roomKey)(room.code), room, { ex: ROOM_TTL });
}
async function deleteRoom(code) {
    await Promise.all([
        exports.redis.del((0, exports.roomKey)(code)),
        exports.redis.del((0, exports.strokesKey)(code)),
        exports.redis.del((0, exports.rolesKey)(code)),
        exports.redis.del((0, exports.votesKey)(code)),
    ]);
}
async function pushStroke(code, stroke) {
    await exports.redis.rpush((0, exports.strokesKey)(code), JSON.stringify(stroke));
    await exports.redis.expire((0, exports.strokesKey)(code), ROOM_TTL);
}
async function getStrokes(code) {
    const raw = await exports.redis.lrange((0, exports.strokesKey)(code), 0, -1);
    return raw.map((s) => (typeof s === "string" ? JSON.parse(s) : s));
}
async function clearStrokes(code) {
    await exports.redis.del((0, exports.strokesKey)(code));
}
async function setRole(code, socketId, role) {
    await exports.redis.hset((0, exports.rolesKey)(code), { [socketId]: JSON.stringify(role) });
    await exports.redis.expire((0, exports.rolesKey)(code), ROOM_TTL);
}
async function getRole(code, socketId) {
    const raw = await exports.redis.hget((0, exports.rolesKey)(code), socketId);
    if (!raw)
        return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
}
async function setVote(code, voterSocketId, accusedSocketId) {
    await exports.redis.hset((0, exports.votesKey)(code), { [voterSocketId]: accusedSocketId });
    await exports.redis.expire((0, exports.votesKey)(code), ROOM_TTL);
}
async function getVotes(code) {
    const raw = await exports.redis.hgetall((0, exports.votesKey)(code));
    return raw !== null && raw !== void 0 ? raw : {};
}
async function clearVotes(code) {
    await exports.redis.del((0, exports.votesKey)(code));
}
