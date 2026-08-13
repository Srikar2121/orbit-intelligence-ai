import { useEffect } from "react";

/**
 * Keeps browser UI colors (address bar, status bar, PWA chrome) in sync with
 * the app's current theme — including the in-app light/dark toggle and any
 * mode themes (genz / codey) that change --background.
 */
function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]:not([media])`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function ThemeColorSync() {
  useEffect(() => {
    const apply = () => {
      const isLight = document.documentElement.classList.contains("light");
      const bg = getComputedStyle(document.body).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)") setMeta("theme-color", bg);
      setMeta("color-scheme", isLight ? "light" : "dark");
      setMeta("msapplication-TileColor", bg || (isLight ? "#fff5f9" : "#14101f"));
      setMeta(
        "apple-mobile-web-app-status-bar-style",
        isLight ? "default" : "black-translucent",
      );
      document.documentElement.style.colorScheme = isLight ? "light" : "dark";
    };

    // run after paint so CSS variables are resolved
    const raf = requestAnimationFrame(apply);

    const observer = new MutationObserver(() => requestAnimationFrame(apply));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mq.removeEventListener("change", apply);
    };
  }, []);

  return null;
}
