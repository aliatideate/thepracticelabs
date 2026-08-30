import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { contentDir, loadScenario } from "./lib/content";

loadScenario();

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
