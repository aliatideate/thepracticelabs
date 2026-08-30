import { Router, type IRouter, type Request, type Response } from "express";
import { submissionsBus, type SubmissionEvent } from "../lib/events";

const router: IRouter = Router();

const HEARTBEAT_INTERVAL_MS = 25_000;

router.get("/events", (req: Request, res: Response) => {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Optional server-side workshop scoping. When provided, the stream only
  // delivers events whose payload either matches the requested workshop or
  // omits a workshop entirely (so legacy/unscoped events still pass through).
  const rawCode = req.query.workshopCode;
  const workshopCode =
    typeof rawCode === "string" && rawCode.trim().length > 0
      ? rawCode.trim().toUpperCase()
      : null;

  res.write(`retry: 3000\n\n`);
  res.write(
    `event: ready\ndata: ${JSON.stringify({ workshopCode })}\n\n`,
  );

  const onEvent = (event: SubmissionEvent) => {
    if (
      workshopCode &&
      event.workshopCode &&
      event.workshopCode !== workshopCode
    ) {
      return;
    }
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  submissionsBus.on("event", onEvent);

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, HEARTBEAT_INTERVAL_MS);

  const cleanup = () => {
    clearInterval(heartbeat);
    submissionsBus.off("event", onEvent);
  };

  req.on("close", cleanup);
  req.on("error", cleanup);
  res.on("close", cleanup);
});

export default router;
