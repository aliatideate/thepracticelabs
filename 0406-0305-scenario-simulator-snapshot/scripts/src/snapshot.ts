import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const distDir = join(repoRoot, "dist");
const outFile = join(distDir, "scenario-simulator-snapshot.tar.gz");

mkdirSync(distDir, { recursive: true });
if (existsSync(outFile)) rmSync(outFile);

const includes = [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
  ".replit",
  "replit.md",
  "DOCUMENTATION.md",
  "docs",
  "artifacts/api-server",
  "artifacts/scenario-simulator",
  "artifacts/mockup-sandbox",
  "lib",
  "scripts",
  "attached_assets",
];

const excludes = [
  "node_modules",
  "dist",
  ".local",
  ".cache",
  ".turbo",
  ".pnpm-store",
  ".git",
  ".env",
  ".env.local",
  "*.log",
  "*.tsbuildinfo",
];

const filtered = includes.filter((p) => existsSync(join(repoRoot, p)));
if (filtered.length === 0) {
  console.error("nothing to snapshot — repo layout looks wrong");
  process.exit(1);
}

const args: string[] = ["-czf", outFile];
for (const pattern of excludes) {
  args.push(`--exclude=${pattern}`);
}
args.push(...filtered);

console.log("creating snapshot:", relative(repoRoot, outFile));
console.log("including:", filtered.join(", "));

execFileSync("tar", args, { cwd: repoRoot, stdio: "inherit" });

const size = statSync(outFile).size;
console.log(
  `\nsnapshot ready: ${relative(repoRoot, outFile)} (${(
    size /
    1024 /
    1024
  ).toFixed(2)} MB)`,
);
console.log(
  "\nto recreate the app from this snapshot:\n" +
    "  mkdir scenario-simulator && tar -xzf scenario-simulator-snapshot.tar.gz -C scenario-simulator\n" +
    "  cd scenario-simulator\n" +
    "  pnpm install\n" +
    '  export DATABASE_URL="postgres://…"\n' +
    "  pnpm --filter @workspace/db run push\n" +
    "  pnpm --filter @workspace/api-spec run codegen\n" +
    "  pnpm run build\n",
);
