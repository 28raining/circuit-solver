import { createWriteStream } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const PYODIDE_VERSION = "314.0.0";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicPyodideDir = join(root, "public/assets/pyodide");
const pyodideDir = dirname(fileURLToPath(import.meta.resolve("pyodide")));
const packagesLock = join(root, "vendor/pyodide-packages/pyodide-lock.json");

const coreFiles = ["pyodide.js", "pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip"];

const wheels = ["mpmath-1.4.1-py3-none-any.whl", "sympy-1.14.0-py3-none-any.whl"];

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(dest));
}

await mkdir(publicPyodideDir, { recursive: true });

for (const file of coreFiles) {
  process.stdout.write(`Copying ${file}...\n`);
  await cp(join(pyodideDir, file), join(publicPyodideDir, file));
}

await cp(packagesLock, join(publicPyodideDir, "pyodide-lock.json"));

for (const wheel of wheels) {
  const dest = join(publicPyodideDir, wheel);
  process.stdout.write(`Downloading ${wheel}...\n`);
  await download(`${PYODIDE_CDN}/${wheel}`, dest);
}
