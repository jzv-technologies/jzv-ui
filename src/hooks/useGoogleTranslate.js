import { useEffect } from "react";

export default function useGoogleTranslate() {
  useEffect(() => {
    // 1. Define the global initializer function
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        const container = document.getElementById("google_translate_element");
        if (container && !container.querySelector(".goog-te-combo")) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: "en,ar,ta,ur", // English, Arabic, Tamil, Urdu
              autoDisplay: false,
            },
            "google_translate_element"
          );
        }
      }
    };

    // 2. Helper to load the script
    const addGoogleTranslateScript = () => {
      const script = document.createElement("script");
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    };

    // 3. Load script if not present
    if (!(window.google && window.google.translate) && !document.querySelector('script[src*="translate.google.com"]')) {
      addGoogleTranslateScript();
    }

    // 4. Self-healing interval: if React diffing clears the container DOM on re-renders, restore the dropdown
    const interval = setInterval(() => {
      if (window.google && window.google.translate) {
        const container = document.getElementById("google_translate_element");
        if (container && !container.querySelector(".goog-te-combo")) {
          window.googleTranslateElementInit();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);
}
