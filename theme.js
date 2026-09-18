(function () {
  const root = document.documentElement;
  const storageKey = "jack-chou-theme";
  const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function storedTheme() {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function applyTheme(theme, persist) {
    const isDark = theme === "dark";
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    document.querySelectorAll(".dark-mode-toggle").forEach(function (button) {
      const icon = button.querySelector(".dark-mode-toggle__icon");
      if (icon) {
        icon.classList.toggle("dark-mode-toggle__icon--moon", isDark);
      }
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    });

    if (persist) {
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch (error) {
        // The theme still works when storage is unavailable.
      }
    }
  }

  applyTheme(storedTheme() || (systemPreference.matches ? "dark" : "light"), false);

  function initializeToggle() {
    applyTheme(root.dataset.theme || "light", false);

    document.querySelectorAll(".dark-mode-toggle").forEach(function (button) {
      button.addEventListener("click", function () {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

        if (!document.startViewTransition || reducedMotion.matches) {
          applyTheme(nextTheme, true);
          return;
        }

        const bounds = button.getBoundingClientRect();
        const originX = bounds.left + bounds.width / 2;
        const originY = bounds.top + bounds.height / 2;
        const radius = Math.hypot(
          Math.max(originX, window.innerWidth - originX),
          Math.max(originY, window.innerHeight - originY)
        );

        root.style.setProperty("--theme-origin-x", `${originX}px`);
        root.style.setProperty("--theme-origin-y", `${originY}px`);
        root.style.setProperty("--theme-reveal-radius", `${radius}px`);

        document.startViewTransition(function () {
          applyTheme(nextTheme, true);
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeToggle, { once: true });
  } else {
    initializeToggle();
  }
})();
