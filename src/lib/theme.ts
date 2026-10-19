"use client";

import { useEffect } from "react";
import { useSettings, type Theme } from "./progress";

const BAR: Record<"light" | "dark", string> = { light: "#f5f5f7", dark: "#000000" };

function resolved(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Keeps <html data-theme> and the browser bar colour in sync with the setting. */
export function useApplyTheme() {
  const { theme } = useSettings();
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR[resolved(theme)]);
    };
    apply();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}
