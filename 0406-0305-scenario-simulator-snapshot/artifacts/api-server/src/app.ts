import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { contentDir, loadScenario } from "./lib/content";
import { loadDecisionGame } from "./lib/decision-game";

loadScenario();
loadDecisionGame();

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
// Asset uploads POST base64 JSON (≤500 KB binary ≈ ~700 KB encoded). Default 100kb is too small.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);
app.use("/content", express.static(contentDir()));

const publicDir = path.resolve(
  process.cwd(),
  "artifacts/scenario-simulator/dist/public",
);
app.use(express.static(publicDir));
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/content")) return next();
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  res.sendFile(path.join(publicDir, "index.html"), (err) => {
    if (err) next();
  });
});

export default app;
