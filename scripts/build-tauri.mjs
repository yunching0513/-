#!/usr/bin/env node
/**
 * Build Strata for Tauri.
 *
 * Tauri requires a static export, but Next.js refuses to static-export any
 * folder containing API routes. We temporarily rename `src/app/api` away
 * for the duration of the build, then restore it. The Tauri app uses
 * client-direct AI calls and Tauri's HTTP plugin for everything that used
 * to need the server — no API routes are needed in the bundle.
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const apiDir = resolve(root, "src/app/api");
const apiBackup = resolve(root, "src/app/_api_disabled_for_tauri");

let backedUp = false;

function restore() {
  if (backedUp && existsSync(apiBackup)) {
    renameSync(apiBackup, apiDir);
    console.log("✓ Restored src/app/api");
  }
}

process.on("exit", restore);
process.on("SIGINT", () => {
  restore();
  process.exit(130);
});
process.on("uncaughtException", (err) => {
  restore();
  throw err;
});

try {
  if (existsSync(apiDir)) {
    renameSync(apiDir, apiBackup);
    backedUp = true;
    console.log("→ Moved src/app/api → _api_disabled_for_tauri");
  }
  console.log("→ Running next build (static export)");
  execSync("npx next build", {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, TAURI_BUILD: "1" },
  });
  console.log("✓ Tauri static export complete (./out)");
} finally {
  restore();
}
