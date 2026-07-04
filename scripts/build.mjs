import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "renderer"), { recursive: true });

await run(process.platform === "win32" ? "npx.cmd" : "npx", [
  "tsc",
  "--project",
  "tsconfig.json"
]);

await build({
  entryPoints: [path.join(root, "src/renderer/index.ts")],
  bundle: true,
  outfile: path.join(dist, "renderer/index.js"),
  platform: "browser",
  format: "iife",
  target: "chrome130",
  sourcemap: true
});

await cp(
  path.join(root, "src/renderer/index.html"),
  path.join(dist, "renderer/index.html")
);
await cp(
  path.join(root, "src/renderer/styles.css"),
  path.join(dist, "renderer/styles.css")
);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}
