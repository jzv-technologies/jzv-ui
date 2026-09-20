import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Auto-update cache to deployed version on new deployment
try {
  const currentBuild = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 'dev';
  const savedBuild = localStorage.getItem('jzv_app_build_version');
  if (savedBuild && savedBuild !== currentBuild) {
    console.log(`[Cache Manager] New version deployed (${savedBuild} -> ${currentBuild}). Purging stale caches...`);
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }
  localStorage.setItem('jzv_app_build_version', currentBuild);
} catch (e) {
  console.warn('[Cache Manager] Cache invalidation skipped:', e);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
