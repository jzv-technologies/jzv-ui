import { useEffect } from "react";

export default function useGoogleTranslate() {
  useEffect(() => {
    const addGoogleTranslateScript = () => {
      const script = document.createElement("script");

      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

      script.async = true;

      document.body.appendChild(script);
    };

    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "ar,en,ta,ur",
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element",
        );
      }
    };

    const existingScript = document.querySelector(
      'script[src*="translate.google.com"]',
    );

    if (!existingScript) {
      addGoogleTranslateScript();
    } else if (window.google?.translate) {
      window.googleTranslateElementInit();
    }
  }, []);
}
