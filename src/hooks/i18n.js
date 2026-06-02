export const resolvePath = (obj, path) => {
  return path.split(".").reduce((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return current[segment];
  }, obj);
};

export const findNestedTranslation = (obj, key) => {
  if (!obj || typeof obj !== "object") return undefined;
  if (
    Object.prototype.hasOwnProperty.call(obj, key) &&
    typeof obj[key] === "string"
  ) {
    return obj[key];
  }
  for (const value of Object.values(obj)) {
    if (typeof value === "object") {
      const result = findNestedTranslation(value, key);
      if (result) return result;
    }
  }
  return undefined;
};

const ensureObj = (v) => (v && typeof v === "object" ? v : {});

// translations: either legacy (locale-first) or UI-first
export function translate(translations, language, key, defaultText) {
  // 1) Legacy lookup: translations[lang] -> resolve dotted path or nested search
  const locale =
    (translations && translations[language]) ||
    (translations && translations.en);
  let translation;
  if (locale) {
    translation = key.includes(".")
      ? resolvePath(locale, key)
      : locale[key] || findNestedTranslation(locale, key);
  }

  if (translation && typeof translation === "string") {
    return { text: translation, isCustom: true };
  }

  // 2) UI-first lookup: resolve dotted UI path on the root translations, then pick language leaf
  const uiNode = key.includes(".")
    ? resolvePath(translations, key)
    : translations && translations[key];

  if (uiNode) {
    // If the node is a string, return it directly
    if (typeof uiNode === "string") {
      return { text: uiNode, isCustom: true };
    }

    // If node is an object mapping lang -> string
    const obj = ensureObj(uiNode);
    const exact = obj[language];
    const short =
      language && language.split("-")[0] && obj[language.split("-")[0]];
    const en = obj.en;
    const firstString = Object.values(obj).find((v) => typeof v === "string");

    const pick = exact || short || en || firstString;
    if (pick) return { text: pick, isCustom: true };
  }

  // 3) Final fallback to provided defaultText or key
  return { text: defaultText || key, isCustom: false };
}

export default translate;
