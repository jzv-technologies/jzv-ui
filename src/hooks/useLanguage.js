import { useState, useEffect } from "react";
import translations from "../locales/translations.ui.json";
import { translate } from "./i18n";

const getGoogleTranslateLang = () => {
  try {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("googtrans="));
    if (cookieValue) {
      const parts = cookieValue.split("=");
      if (parts.length > 1) {
        const val = decodeURIComponent(parts[1]);
        const match = val.split("/");
        if (match.length > 2) {
          return match[2].toLowerCase(); // e.g. "ur", "ta", "ar"
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse googtrans cookie:", err);
  }
  return "en";
};

const resolvePath = (obj, path) => {
  return path.split(".").reduce((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return current[segment];
  }, obj);
};

const findNestedTranslation = (obj, key) => {
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

export default function useLanguage() {
  const [language, setLanguage] = useState(() => getGoogleTranslateLang());

  useEffect(() => {
    const updateLanguage = () => {
      const current = getGoogleTranslateLang();
      setLanguage(current);
    };

    const handleComboChange = (e) => {
      if (e.target && e.target.classList.contains("goog-te-combo")) {
        setTimeout(updateLanguage, 100);
      }
    };

    const element = document.getElementById("google_translate_element");
    if (element) {
      element.addEventListener("change", handleComboChange);
    }

    const interval = setInterval(updateLanguage, 1000);

    return () => {
      if (element) {
        element.removeEventListener("change", handleComboChange);
      }
      clearInterval(interval);
    };
  }, []);

  const t = (key, defaultText) => {
    return translate(translations, language, key, defaultText);
  };

  return { language, t };
}
