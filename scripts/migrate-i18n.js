import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve("./src/locales");
const infile = path.join(root, "translations.json");
const outUi = path.join(root, "translations.ui.json");

function setDeep(obj, pathArr, lang, value) {
  let cur = obj;
  for (let i = 0; i < pathArr.length; i++) {
    const seg = pathArr[i];
    if (i === pathArr.length - 1) {
      if (!cur[seg] || typeof cur[seg] !== "object") cur[seg] = {};
      cur[seg][lang] = value;
    } else {
      if (!cur[seg] || typeof cur[seg] !== "object") cur[seg] = {};
      cur = cur[seg];
    }
  }
}

function flattenKeys(obj, prefix = []) {
  const entries = [];
  if (typeof obj === "string") {
    entries.push({ path: prefix, value: obj });
    return entries;
  }
  for (const [k, v] of Object.entries(obj || {})) {
    entries.push(...flattenKeys(v, [...prefix, k]));
  }
  return entries;
}

async function main() {
  try {
    const raw = await fs.readFile(infile, "utf8");
    const translations = JSON.parse(raw);

    const ui = {};

    for (const [lang, tree] of Object.entries(translations)) {
      const entries = flattenKeys(tree, []);
      for (const e of entries) {
        setDeep(ui, e.path, lang, e.value);
      }
    }

    await fs.writeFile(outUi, JSON.stringify(ui, null, 2), "utf8");
    console.log("Wrote:", outUi);

    // optional: write per-locale files
    const args = process.argv.slice(2);
    if (args.includes("--per-locale")) {
      for (const [lang, tree] of Object.entries(translations)) {
        const out = path.join(root, `${lang}.json`);
        await fs.writeFile(out, JSON.stringify(tree, null, 2), "utf8");
        console.log("Wrote:", out);
      }
    }

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 2;
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
