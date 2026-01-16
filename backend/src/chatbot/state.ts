import { redis } from "../utils/redis";
import { BotState, SessionData } from "./types";

const SESSION_TTL = 60 * 30; // 30 Minutes session timeout
const MESSAGE_TTL = 60 * 60 * 24; // 24 Hours for message deduplication

export const getUserState = async (phoneNumber: string): Promise<BotState> => {
  const state = await redis.get<BotState>(`bot:state:${phoneNumber}`);
  return state || BotState.START;
};

export const setUserState = async (phoneNumber: string, state: BotState) => {
  // ⚠️ FIX: Use an options object for expiry (Upstash/Vercel syntax)
  await redis.set(`bot:state:${phoneNumber}`, state, { ex: SESSION_TTL });
};

// Store temporary data (like which product they are looking at)
export const getSessionData = async (phoneNumber: string): Promise<SessionData> => {
  // ⚠️ FIX: Upstash automatically parses JSON, so we type the return value directly
  const data = await redis.get<SessionData>(`bot:data:${phoneNumber}`);

  // Return the data if it exists, otherwise an empty object
  return data || {};
};

export const updateSessionData = async (phoneNumber: string, data: Partial<SessionData>) => {
  const current = await getSessionData(phoneNumber);
  const updated = { ...current, ...data };

  // ⚠️ FIX: Pass the object directly (Upstash handles stringifying) and use options object for expiry
  await redis.set(`bot:data:${phoneNumber}`, updated, { ex: SESSION_TTL });
};

export const clearSession = async (phoneNumber: string) => {
  await redis.del(`bot:state:${phoneNumber}`);
  await redis.del(`bot:data:${phoneNumber}`);
};

// ==============================
// IDEMPOTENCY HELPERS (Meta Cloud API)
// ==============================

/**
 * Checks if a message has already been processed
 * @param wamid - WhatsApp Message ID from Meta webhook
 * @returns True if message was already processed
 */
export const isMessageProcessed = async (wamid: string): Promise<boolean> => {
  const exists = await redis.get(`bot:msg:${wamid}`);
  return exists !== null;
};

/**
 * Marks a message as processed to prevent duplicate handling
 * @param wamid - WhatsApp Message ID
 */
export const markMessageProcessed = async (wamid: string): Promise<void> => {
  await redis.set(`bot:msg:${wamid}`, "processed", { ex: MESSAGE_TTL });
};
