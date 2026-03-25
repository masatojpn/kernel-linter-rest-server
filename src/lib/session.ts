import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import type { SessionRecord } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function now(): number {
  return Date.now();
}

function randomToken(size = 32): string {
  return crypto.randomBytes(size).toString("hex");
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function unbase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(value)
    .digest("base64url");
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(SESSIONS_FILE);
  } catch {
    await fs.writeFile(SESSIONS_FILE, "{}", "utf8");
  }
}

async function readSessions(): Promise<Record<string, SessionRecord>> {
  await ensureDataFile();
  const raw = await fs.readFile(SESSIONS_FILE, "utf8");
  return JSON.parse(raw) as Record<string, SessionRecord>;
}

async function writeSessions(data: Record<string, SessionRecord>): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function createOAuthState(): string {
  const payload = JSON.stringify({
    nonce: randomToken(12),
    createdAt: now()
  });

  const encodedPayload = base64url(payload);
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function consumeOAuthState(state: string): boolean {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const payload = JSON.parse(unbase64url(encodedPayload)) as {
      nonce: string;
      createdAt: number;
    };

    return now() - payload.createdAt < 10 * 60 * 1000;
  } catch {
    return false;
  }
}

export async function createSession(
  input: Omit<SessionRecord, "sessionToken" | "createdAt" | "updatedAt">
): Promise<SessionRecord> {
  const sessionToken = randomToken(32);

  const record: SessionRecord = {
    ...input,
    sessionToken,
    createdAt: now(),
    updatedAt: now()
  };

  const sessions = await readSessions();
  sessions[sessionToken] = record;
  await writeSessions(sessions);

  return record;
}

export async function getSession(sessionToken: string): Promise<SessionRecord | null> {
  const sessions = await readSessions();
  return sessions[sessionToken] ?? null;
}

export async function updateSession(
  sessionToken: string,
  patch: Partial<SessionRecord>
): Promise<SessionRecord | null> {
  const sessions = await readSessions();
  const current = sessions[sessionToken];

  if (!current) {
    return null;
  }

  const next: SessionRecord = {
    ...current,
    ...patch,
    sessionToken: current.sessionToken,
    updatedAt: now()
  };

  sessions[sessionToken] = next;
  await writeSessions(sessions);

  return next;
}