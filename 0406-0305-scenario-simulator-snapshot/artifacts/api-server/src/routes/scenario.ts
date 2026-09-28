import { Router, type IRouter } from "express";
import { scenarioForCode } from "../lib/workshop-session";

const router: IRouter = Router();

router.get("/scenario", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  res.json(await scenarioForCode(code));
});

export default router;
