"use client";

import { useEffect } from "react";

/** Registers /sw.js in production so the app opens and converts offline after one visit. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // unsupported context (e.g. private mode) — the app still works online
    });
  }, []);
  return null;
}
