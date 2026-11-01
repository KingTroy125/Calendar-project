import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Starts a small local cluster:
 *   - N Express API instances on consecutive ports
 *   - one load balancer in front of them
 *
 * Usage:
 *   npm run cluster
 *   INSTANCES=2 BASE_PORT=3100 LB_PORT=8181 npm run cluster
 *
 * Point the frontend at the balancer:
 *   BACKEND_URL=http://localhost:8080
 */

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const instances = Math.max(1, Number(process.env.INSTANCES ?? 3));
const basePort = Number(process.env.BASE_PORT ?? 3001);
const lbPort = Number(process.env.LB_PORT ?? 8080);

const children = [];
let shuttingDown = false;

function start(label, script, env) {
  const child = spawn(process.execPath, [path.join(backendRoot, script)], {
    cwd: backendRoot,
    // Vercel sets VERCEL=1; locally we must not inherit that or the API would
    // skip its listener. Any non-"1" value works, and dotenv leaves it alone.
    env: { ...process.env, VERCEL: "local", ...env },
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[cluster] ${label} failed to start: ${error.message}`);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[cluster] ${label} exited (code=${code ?? "null"}, signal=${signal ?? "none"})`);
  });

  children.push({ label, child });
  return child;
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[cluster] ${signal} received, stopping ${children.length} process(es)`);
  for (const { label, child } of children) {
    if (!child.killed) {
      try {
        child.kill("SIGTERM");
        console.log(`[cluster] stopped ${label}`);
      } catch (error) {
        console.error(`[cluster] could not stop ${label}: ${error.message}`);
      }
    }
  }
  setTimeout(() => process.exit(0), 1500).unref();
}

const apiPorts = Array.from({ length: instances }, (_, index) => basePort + index);

for (const port of apiPorts) {
  start(`api:${port}`, "src/server.js", { PORT: String(port) });
}

const upstreams = apiPorts.map((port) => `http://localhost:${port}`).join(",");

async function waitForApis(ports, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  const pending = new Set(ports);

  while (pending.size > 0 && Date.now() < deadline && !shuttingDown) {
    await Promise.all(
      [...pending].map(async (port) => {
        try {
          const response = await fetch(`http://localhost:${port}/health`);
          if (response.ok) pending.delete(port);
        } catch {
          // Instance is not ready yet; retry on the next pass.
        }
      }),
    );
    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return [...pending];
}

const notReady = await waitForApis(apiPorts);
if (shuttingDown) {
  process.exit(0);
}
if (notReady.length > 0) {
  console.warn(`[cluster] Starting the balancer while these ports are not ready: ${notReady.join(", ")}`);
}

start("load-balancer", "src/loadbalancer.js", {
  LB_PORT: String(lbPort),
  UPSTREAMS: upstreams,
});
console.log(`[cluster] Load balancer → http://localhost:${lbPort}`);
console.log(`[cluster] Upstreams → ${upstreams}`);
console.log(`[cluster] Set frontend BACKEND_URL=http://localhost:${lbPort}`);

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
