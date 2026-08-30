import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workshopsRouter from "./workshops";
import sessionsRouter from "./sessions";
import eventsRouter from "./events";
import moderatorRouter from "./moderator";
import scenarioRouter from "./scenario";
import sessionConfigRouter from "./session-config";
import exportRouter from "./export";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workshopsRouter);
router.use(sessionsRouter);
router.use(eventsRouter);
router.use(moderatorRouter);
router.use(scenarioRouter);
router.use(sessionConfigRouter);
router.use(exportRouter);

export default router;
