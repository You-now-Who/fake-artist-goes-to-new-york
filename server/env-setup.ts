/**
 * This module must be imported FIRST in server/index.ts.
 *
 * In ESM, module bodies execute depth-first in the order imports appear.
 * By placing this as the first import, dotenv populates process.env before
 * any other module (e.g. lib/redis.ts) reads from it.
 */
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })
