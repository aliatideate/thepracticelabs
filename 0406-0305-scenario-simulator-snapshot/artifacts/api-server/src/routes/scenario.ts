import { Router, type IRouter } from "express";
import { loadScenario, mediaUrl } from "../lib/content";

const router: IRouter = Router();

router.get("/scenario", (_req, res) => {
  const scenario = loadScenario();
  res.json({
    ...scenario,
    company: {
      ...scenario.company,
      logoUrl: mediaUrl(scenario.company.logo),
    },
    stakeholders: scenario.stakeholders.map((s) => ({
      ...s,
      avatarUrl: mediaUrl(s.avatar),
    })),
  });
});

export default router;
