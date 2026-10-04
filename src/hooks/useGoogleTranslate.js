import { useEffect } from 'react';

export default function useGoogleTranslate() {
  useEffect(() => {
    // Check if Google Translate API is available (deprecated widget)
    const isTranslateElementAvailable = () => {
      return (
        window.google &&
        window.google.translate &&
        typeof window.google.translate.TranslateElement === 'function'
      );
    };

    // 1. Define the global initializer function
    window.googleTranslateElementInit = () => {
      if (isTranslateElementAvailable()) {
        const container = document.getElementById('google_translate_element');
        if (container && !container.querySelector('.goog-te-combo')) {
          try {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: 'en',
                includedLanguages: 'en,ar,ta,ur', // English, Arabic, Tamil, Urdu
                autoDisplay: false,
              },
              'google_translate_element'
            );
          } catch (error) {
            console.warn(
              '[useGoogleTranslate] Google Translate widget initialization failed:',
              error
            );
            // Fallback: show a simple language selector or hide the container
            const container = document.getElementById('google_translate_element');
            if (container) {
              container.style.display = 'none';
            }
          }
        }
      } else {
        console.warn('[useGoogleTranslate] Google Translate widget API not available (deprecated)');
        // Hide the container since the widget is not available
        const container = document.getElementById('google_translate_element');
        if (container) {
          container.style.display = 'none';
        }
      }
    };

    // 2. Helper to load the script
    const addGoogleTranslateScript = () => {
      const script = document.createElement('script');
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = () => {
        console.warn('[useGoogleTranslate] Failed to load Google Translate script');
        const container = document.getElementById('google_translate_element');
        if (container) {
          container.style.display = 'none';
        }
      };
      document.body.appendChild(script);
    };

    // 3. Load script if not present
    if (
      !(window.google && window.google.translate) &&
      !document.querySelector('script[src*="translate.google.com"]')
    ) {
      addGoogleTranslateScript();
    } else if (isTranslateElementAvailable()) {
      // Script already loaded, initialize if needed
      const container = document.getElementById('google_translate_element');
      if (container && !container.querySelector('.goog-te-combo')) {
        window.googleTranslateElementInit();
      }
    } else {
      // API not available, hide container
      const container = document.getElementById('google_translate_element');
      if (container) {
        container.style.display = 'none';
      }
    }

    // 4. Self-healing interval: if React diffing clears the container DOM on re-renders, restore the dropdown
    const interval = setInterval(() => {
      if (isTranslateElementAvailable()) {
        const container = document.getElementById('google_translate_element');
        if (container && !container.querySelector('.goog-te-combo')) {
          window.googleTranslateElementInit();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);
}
