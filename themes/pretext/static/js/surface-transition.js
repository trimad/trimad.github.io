(() => {
  const KEY = "pretextSurfaceTransition";
  const REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function safeParse(value) {
    try {
      return JSON.parse(value || "{}");
    } catch (_) {
      return {};
    }
  }

  function transitionLabel(title) {
    const label = document.createElement("div");
    label.className = "surface-transition__label";
    label.innerHTML = `
      <span>Loading static post route</span>
      <strong>${escapeHTML(title || document.title.replace(/ · .+$/, ""))}</strong>
    `;
    return label;
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[char]);
  }

  function buildOverlay(title, direction) {
    const overlay = document.createElement("div");
    overlay.className = `surface-transition surface-transition--${direction}`;
    overlay.setAttribute("aria-hidden", "true");
    overlay.appendChild(transitionLabel(title));
    return overlay;
  }

  function runIncomingTransition() {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    sessionStorage.removeItem(KEY);

    const payload = safeParse(raw);
    if (REDUCED_MOTION || Date.now() - Number(payload.at || 0) > 15000) return;

    const overlay = buildOverlay(payload.title, "in");
    overlay.classList.add("active");
    document.documentElement.classList.add("surface-arriving");
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.remove("active"));
    });

    const cleanup = () => {
      overlay.remove();
      document.documentElement.classList.remove("surface-arriving");
    };
    overlay.addEventListener("transitionend", cleanup, { once: true });
    window.setTimeout(cleanup, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runIncomingTransition, { once: true });
  } else {
    runIncomingTransition();
  }
})();
