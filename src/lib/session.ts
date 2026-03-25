import crypto from "node:crypto";
import { kv } from "@vercel/kv";
import { env } from "@/lib/env";
import type { SessionRecord } from "@/lib/types";

const SESSION_KEY_PREFIX = "kernel:session:";
const CONNECT_REQUEST_KEY_PREFIX = "kernel:connect-request:";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const CONNECT_REQUEST_TTL_SECONDS = 60 * 5;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

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

function getSessionKey(sessionToken: string): string {
  return SESSION_KEY_PREFIX + sessionToken;
}

function getConnectRequestKey(requestId: string): string {
  return CONNECT_REQUEST_KEY_PREFIX + requestId;
}

export function createOAuthState(requestId: string): string {
  const payload = JSON.stringify({
    nonce: randomToken(12),
    requestId,
    createdAt: now()
  });

  const encodedPayload = base64url(payload);
  const signature = sign(encodedPayload);

  return encodedPayload + "." + signature;
}

export function consumeOAuthState(state: string): string | null {
  const parts = state.split(".");
  const encodedPayload = parts[0];
  const signature = parts[1];

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(unbase64url(encodedPayload)) as {
      nonce: string;
      requestId: string;
      createdAt: number;
    };

    if (!payload.requestId) {
      return null;
    }

    if (now() - payload.createdAt >= OAUTH_STATE_TTL_MS) {
      return null;
    }

    return payload.requestId;
  } catch (error) {
    return null;
  }
}

export async function createSession(
  input: Omit<SessionRecord, "sessionToken" | "createdAt" | "updatedAt">
): Promise<SessionRecord> {
  const timestamp = now();
  const sessionToken = randomToken(32);

  const record: SessionRecord = {
    ...input,
    sessionToken,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await kv.set(getSessionKey(sessionToken), record, {
    ex: SESSION_TTL_SECONDS
  });

  return record;
}

export async function getSession(sessionToken: string): Promise<SessionRecord | null> {
  const record = await kv.get<SessionRecord>(getSessionKey(sessionToken));
  return record || null;
}

export async function updateSession(
  sessionToken: string,
  patch: Partial<SessionRecord>
): Promise<SessionRecord | null> {
  const current = await getSession(sessionToken);

  if (!current) {
    return null;
  }

  const next: SessionRecord = {
    ...current,
    ...patch,
    sessionToken: current.sessionToken,
    createdAt: current.createdAt,
    updatedAt: now()
  };

  await kv.set(getSessionKey(sessionToken), next, {
    ex: SESSION_TTL_SECONDS
  });

  return next;
}

export async function saveConnectRequestResult(
  requestId: string,
  sessionToken: string,
  figmaUserId: string
): Promise<void> {
  await kv.set(
    getConnectRequestKey(requestId),
    {
      sessionToken,
      figmaUserId
    },
    {
      ex: CONNECT_REQUEST_TTL_SECONDS
    }
  );
}