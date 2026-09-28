import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  clearSessionCookie,
  createAuthSession,
  destroyAuthSession,
  requireAuth,
  resolveUserFromCookie,
  SESSION_COOKIE,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body" });
  }

  const user = await verifyPassword(parsed.data.email, parsed.data.password);
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const { raw, expiresAt } = await createAuthSession(user.id);
  setSessionCookie(res, raw, expiresAt);
  return res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    orgId: user.orgId,
  });
});

router.post("/auth/logout", async (req, res) => {
  const raw = req.cookies?.[SESSION_COOKIE] as string | undefined;
  await destroyAuthSession(raw);
  clearSessionCookie(res);
  return res.status(204).end();
});

router.get("/auth/me", async (req, res) => {
  const user = await resolveUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    orgId: user.orgId,
  });
});

router.get("/auth/check", requireAuth, (req, res) => {
  return res.json({ ok: true, auth: req.auth });
});

export default router;
