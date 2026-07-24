import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "out");
const clientDir = join(root, "client");
const pkgPath = join(clientDir, "client-package.json");

if (!existsSync(outDir)) {
  console.error("Missing ./out — run `npm run build` first.");
  process.exit(1);
}

const pkg =
  existsSync(pkgPath) &&
  JSON.parse(readFileSync(pkgPath, "utf8"));

if (existsSync(clientDir)) {
  rmSync(clientDir, { recursive: true, force: true });
}
mkdirSync(clientDir, { recursive: true });

for (const name of readdirSync(outDir)) {
  cpSync(join(outDir, name), join(clientDir, name), { recursive: true });
}

writeFileSync(
  pkgPath,
  JSON.stringify(
    pkg ?? { name: "RakshaDrishti", version: "0.0.1", homepage: "index.html" },
    null,
    4,
  ) + "\n",
);

function removeTxtFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      removeTxtFiles(path);
    } else if (name.endsWith(".txt")) {
      rmSync(path);
    }
  }
}

removeTxtFiles(clientDir);

const fileCount = (function count(dir) {
  return readdirSync(dir).reduce((total, name) => {
    const path = join(dir, name);
    return total + (statSync(path).isDirectory() ? count(path) : 1);
  }, 0);
})(clientDir);

console.log(`Prepared client/ (${fileCount} files, .txt payloads removed).`);
