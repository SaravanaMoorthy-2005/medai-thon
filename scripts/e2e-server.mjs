import { spawn } from "node:child_process";
import process from "node:process";
const env = {
  ...process.env,
  PORT: "3002",
  WEB_PORT: "5174",
  HYGIENE_DB: `data/e2e-${Date.now()}.sqlite`,
};
const api = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  stdio: "inherit",
  env,
});
const web = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
  { stdio: "inherit", env },
);
function close(code = 0) {
  api.kill();
  web.kill();
  process.exit(code);
}
api.on("exit", (code) => close(code || 0));
web.on("exit", (code) => close(code || 0));
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
