import fs from "fs";
import path from "path";

const root = path.resolve("./src");
const uiFile = path.join(root, "locales", "translations.ui.json");
const ui = JSON.parse(fs.readFileSync(uiFile, "utf8"));

function resolvePath(obj, pathStr) {
  return pathStr
    .split(".")
    .reduce((cur, seg) => (cur && cur[seg] ? cur[seg] : undefined), obj);
}

function findFiles(dir, exts = [".jsx", ".js"]) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...findFiles(p, exts));
    else if (exts.includes(path.extname(p))) out.push(p);
  }
  return out;
}

const files = findFiles(root);
const keySet = new Set();
const keyRegex1 = /<Translate\s+[^>]*id=\"([^\"]+)\"/g;
const keyRegex2 = /<Translate\s+[^>]*id=\{\s*\"([^\"]+)\"\s*\}/g;
const tRegex = /t\(\s*\"([^\"]+)\"/g;

for (const file of files) {
  const s = fs.readFileSync(file, "utf8");
  let m;
  while ((m = keyRegex1.exec(s))) keySet.add(m[1]);
  while ((m = keyRegex2.exec(s))) keySet.add(m[1]);
  while ((m = tRegex.exec(s))) keySet.add(m[1]);
}

// filter plausible i18n keys: lowercase letters, numbers, underscores, dots, and dashes
// only consider dotted keys like 'login.form.sign_in' (conservative)
const keyPattern = /^[a-z0-9_.-]+(\.[a-z0-9_.-]+)+$/i;
const keys = Array.from(keySet)
  .filter((k) => keyPattern.test(k))
  .sort();
const missing = [];
for (const k of keys) {
  const node = resolvePath(ui, k);
  if (node === undefined) missing.push(k);
}

console.log(`Scanned ${files.length} files, found ${keys.length} unique keys.`);
if (missing.length === 0)
  console.log("All keys present in translations.ui.json (UI-first).");
else {
  console.log(`Missing ${missing.length} keys:`);
  for (const m of missing) console.log(" - ", m);
}
