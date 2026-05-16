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

    // We leave this empty so the default UI doesn't render
    window.googleTranslateElementInit = () => {};

    if (!document.querySelector('script[src*="translate.google.com"]')) {
      addGoogleTranslateScript();
    }
  }, []);
}
