import { translate } from "../src/hooks/i18n.js";
import fs from "fs";
const translations = JSON.parse(
  fs.readFileSync("./src/locales/translations.json", "utf8"),
);

function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

// basic legacy lookup
const r1 = translate(translations, "en", "header.logout");
ok(r1.text === "Logout", "legacy: header.logout en -> Logout");

// legacy nested
const r2 = translate(translations, "ur", "login.main.welcome_heading");
ok(r2.text && r2.text.includes("پورٹل"), "legacy nested ur welcome_heading");

// after running migration script, UI-first key should be present in translations.ui.json
// we simulate a UI-first shape for test
const ui = {
  header: { logout: { en: "LogoutUI", ur: "لاگ آؤٹUI" } },
};

const r3 = translate(ui, "en", "header.logout");
ok(r3.text === "LogoutUI", "UI-first lookup returns LogoutUI");

console.log("Tests complete. exitCode:", process.exitCode || 0);
