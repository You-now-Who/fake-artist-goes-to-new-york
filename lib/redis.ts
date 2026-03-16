import { Redis } from "@upstash/redis"
import type { RoomState, Stroke } from "@/types/game"

// console.log(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ROOM_TTL = 60 * 60 * 4 // 4 hours

export const roomKey = (code: string) => `room:${code}`
export const strokesKey = (code: string) => `room:${code}:strokes`
export const rolesKey = (code: string) => `room:${code}:roles`
export const votesKey = (code: string) => `room:${code}:votes`

export async function getRoom(code: string): Promise<RoomState | null> {
  const data = await redis.get<RoomState>(roomKey(code))
  return data ?? null
}

export async function saveRoom(room: RoomState): Promise<void> {
  await redis.set(roomKey(room.code), room, { ex: ROOM_TTL })
}

export async function deleteRoom(code: string): Promise<void> {
  await Promise.all([
    redis.del(roomKey(code)),
    redis.del(strokesKey(code)),
    redis.del(rolesKey(code)),
    redis.del(votesKey(code)),
  ])
}

export async function pushStroke(code: string, stroke: Stroke): Promise<void> {
  await redis.rpush(strokesKey(code), JSON.stringify(stroke))
  await redis.expire(strokesKey(code), ROOM_TTL)
}

export async function getStrokes(code: string): Promise<Stroke[]> {
  const raw = await redis.lrange<string>(strokesKey(code), 0, -1)
  return raw.map((s) => (typeof s === "string" ? JSON.parse(s) : s) as Stroke)
}

export async function clearStrokes(code: string): Promise<void> {
  await redis.del(strokesKey(code))
}

export async function setRole(
  code: string,
  socketId: string,
  role: { role: "artist" | "fake"; subject: string | null; category: string }
): Promise<void> {
  await redis.hset(rolesKey(code), { [socketId]: JSON.stringify(role) })
  await redis.expire(rolesKey(code), ROOM_TTL)
}

export async function getRole(
  code: string,
  socketId: string
): Promise<{ role: "artist" | "fake"; subject: string | null; category: string } | null> {
  const raw = await redis.hget<string>(rolesKey(code), socketId)
  if (!raw) return null
  return typeof raw === "string" ? JSON.parse(raw) : raw
}

export async function setVote(
  code: string,
  voterSocketId: string,
  accusedSocketId: string
): Promise<void> {
  await redis.hset(votesKey(code), { [voterSocketId]: accusedSocketId })
  await redis.expire(votesKey(code), ROOM_TTL)
}

export async function getVotes(code: string): Promise<Record<string, string>> {
  const raw = await redis.hgetall<Record<string, string>>(votesKey(code))
  return raw ?? {}
}

export async function clearVotes(code: string): Promise<void> {
  await redis.del(votesKey(code))
}
