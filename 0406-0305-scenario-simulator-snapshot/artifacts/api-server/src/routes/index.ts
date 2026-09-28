import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workshopsRouter from "./workshops";
import sessionsRouter from "./sessions";
import eventsRouter from "./events";
import moderatorRouter from "./moderator";
import scenarioRouter from "./scenario";
import sessionConfigRouter from "./session-config";
import exportRouter from "./export";
import archivesRouter from "./archives";
import martRouter from "./mart";
import authRouter from "./auth";
import workshopSessionsRouter from "./workshop-sessions";
import createRouter from "./create";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(workshopSessionsRouter);
router.use(createRouter);
router.use(workshopsRouter);
router.use(sessionsRouter);
router.use(eventsRouter);
router.use(moderatorRouter);
router.use(scenarioRouter);
router.use(sessionConfigRouter);
router.use(exportRouter);
router.use(archivesRouter);
router.use(martRouter);

export default router;
