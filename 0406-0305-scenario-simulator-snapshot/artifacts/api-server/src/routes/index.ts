import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workshopsRouter from "./workshops";
import sessionsRouter from "./sessions";
import eventsRouter from "./events";
import moderatorRouter from "./moderator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workshopsRouter);
router.use(sessionsRouter);
router.use(eventsRouter);
router.use(moderatorRouter);

export default router;
