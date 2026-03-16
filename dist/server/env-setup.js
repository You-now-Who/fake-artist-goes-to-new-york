"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This module must be imported FIRST in server/index.ts.
 *
 * In ESM, module bodies execute depth-first in the order imports appear.
 * By placing this as the first import, dotenv populates process.env before
 * any other module (e.g. lib/redis.ts) reads from it.
 */
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: ".env.local" });
(0, dotenv_1.config)({ path: ".env" });
