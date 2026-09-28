import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import {
  authSessionsTable,
  db,
  usersTable,
  workshopSessionsTable,
  type UserRow,
} from "@workspace/db";

export const SESSION_COOKIE = "tpl_session";

const DEFAULT_TTL_DAYS = 14;

export type AuthUser = Pick<UserRow, "id" | "orgId" | "email" | "displayName">;

export type AuthContext =
  | { kind: "user"; user: AuthUser }
  | { kind: "facilitator_token"; workshopSessionId: string; orgId: string };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("SESSION_SECRET must be set");
  }
  return secret;
}

function ttlDays(): number {
  const raw = Number(process.env.SESSION_TTL_DAYS ?? DEFAULT_TTL_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_DAYS;
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(`${sessionSecret()}:${raw}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "0") return false;
  if (process.env.COOKIE_SECURE === "1") return true;
  return process.env.NODE_ENV === "production";
}

export function setSessionCookie(res: Response, rawToken: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
  });
}

export async function createAuthSession(userId: string): Promise<{ raw: string; expiresAt: Date }> {
  const raw = newOpaqueToken();
  const expiresAt = new Date(Date.now() + ttlDays() * 24 * 60 * 60 * 1000);
  await db.insert(authSessionsTable).values({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });
  return { raw, expiresAt };
}

export async function destroyAuthSession(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await db.delete(authSessionsTable).where(eq(authSessionsTable.tokenHash, hashToken(rawToken)));
}

export async function resolveUserFromCookie(req: Request): Promise<AuthUser | null> {
  const raw = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const rows = await db
    .select({
      userId: usersTable.id,
      orgId: usersTable.orgId,
      email: usersTable.email,
      displayName: usersTable.displayName,
      passwordHash: usersTable.passwordHash,
      expiresAt: authSessionsTable.expiresAt,
    })
    .from(authSessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, authSessionsTable.userId))
    .where(and(eq(authSessionsTable.tokenHash, tokenHash), gt(authSessionsTable.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (!row.passwordHash) {
    // Login refuses null hash; drop any stale session for such users.
    await destroyAuthSession(raw);
    return null;
  }

  return {
    id: row.userId,
    orgId: row.orgId,
    email: row.email,
    displayName: row.displayName,
  };
}

export async function verifyPassword(email: string, password: string): Promise<AuthUser | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email.trim())).limit(1);
  const user = rows[0];
  if (!user) return null;
  if (!user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    orgId: user.orgId,
    email: user.email,
    displayName: user.displayName,
  };
}

async function resolveFacilitatorToken(req: Request): Promise<AuthContext | null> {
  const raw = String(req.headers["x-facilitator-token"] ?? req.query.facilitatorToken ?? "").trim();
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const rows = await db
    .select({
      id: workshopSessionsTable.id,
      orgId: workshopSessionsTable.orgId,
      hash: workshopSessionsTable.facilitatorTokenHash,
    })
    .from(workshopSessionsTable)
    .where(eq(workshopSessionsTable.facilitatorTokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row?.hash || !safeEqualHex(row.hash, tokenHash)) return null;
  return { kind: "facilitator_token", workshopSessionId: row.id, orgId: row.orgId };
}

/** Resolve login cookie or per-session facilitator token. */
export async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const user = await resolveUserFromCookie(req);
  if (user) return { kind: "user", user };
  return resolveFacilitatorToken(req);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    req.auth = auth;
    next();
  } catch (err) {
    next(err);
  }
}

/** Facilitator APIs: logged-in user, or session-scoped facilitator token. */
export async function requireFacilitator(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return requireAuth(req, res, next);
}

/** Inline guard for existing route handlers (replaces x-facilitator-secret checks). */
export async function assertFacilitator(req: Request, res: Response): Promise<boolean> {
  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      res.status(401).json({ error: "unauthorized" });
      return false;
    }
    req.auth = auth;
    return true;
  } catch {
    res.status(500).json({ error: "auth_error" });
    return false;
  }
}

export async function issueWorkshopFacilitatorToken(
  workshopSessionId: string,
): Promise<{ token: string; tokenHash: string }> {
  const token = newOpaqueToken();
  const tokenHash = hashToken(token);
  await db
    .update(workshopSessionsTable)
    .set({ facilitatorTokenHash: tokenHash, updatedAt: new Date() })
    .where(eq(workshopSessionsTable.id, workshopSessionId));
  return { token, tokenHash };
}
