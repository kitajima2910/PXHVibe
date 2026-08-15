#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = path => readFileSync(resolve(root, path), "utf8");
const pkg = JSON.parse(read("package.json"));
const version = pkg.version;
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

requireCondition(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), `Invalid release version: ${version}`);
requireCondition(read("README.md").includes(`v${version}`), "README version is stale");
requireCondition(!existsSync(resolve(root, "STATUS.md")) || read("STATUS.md").includes(`v${version}`), "STATUS version is stale");
requireCondition(pkg.license !== "MIT" || (existsSync(resolve(root, "LICENSE")) && read("LICENSE").startsWith("MIT License")), "MIT LICENSE is missing or invalid");
requireCondition(typeof pkg.main !== "string" || existsSync(resolve(root, pkg.main)), `Main entry is missing: ${pkg.main}`);
for (const binPath of Object.values(pkg.bin ?? {})) {
  requireCondition(typeof binPath === "string" && existsSync(resolve(root, binPath)), `Binary entry is missing: ${binPath}`);
}

const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split(/\r?\n/);
for (const runtimeFile of [".pipeline-state.json", "promptLog.txt", ".context.json", ".env"]) {
  requireCondition(!tracked.includes(runtimeFile) || !existsSync(resolve(root, runtimeFile)), `Runtime file is tracked: ${runtimeFile}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[FAIL] ${failure}`);
  process.exit(1);
}
console.log(`[OK] Release integrity v${version}`);
