#!/usr/bin/env node
/**
 * Frees the default Metro port by stopping stale node.exe listeners.
 * Prevents accidental multi-Metro setups (e.g. 8081 zombie + 8082 active).
 */
import { execSync } from "node:child_process";

const port = process.argv[2] ?? "8081";

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function freePortWindows(targetPort) {
  let netstat;
  try {
    netstat = run(`netstat -ano | findstr :${targetPort}`);
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of netstat.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const pid = line.trim().split(/\s+/).at(-1);
    if (pid && pid !== "0") pids.add(pid);
  }

  for (const pid of pids) {
    let task = "";
    try {
      task = run(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
    } catch {
      continue;
    }
    if (!task.toLowerCase().includes("node.exe")) continue;
    console.log(`[free-metro-port] stopping node.exe (PID ${pid}) on port ${targetPort}`);
    run(`taskkill /PID ${pid} /F`);
  }
}

function freePortUnix(targetPort) {
  let out;
  try {
    out = run(`lsof -ti tcp:${targetPort}`);
  } catch {
    return;
  }
  for (const pid of out.split(/\s+/).filter(Boolean)) {
    console.log(`[free-metro-port] stopping PID ${pid} on port ${targetPort}`);
    run(`kill -9 ${pid}`);
  }
}

if (process.platform === "win32") {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
