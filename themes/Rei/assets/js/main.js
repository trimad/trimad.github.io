(() => {
  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");

  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (navToggle && nav) {
    const closeNav = () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };

    navToggle.addEventListener("click", () => {
      const next = navToggle.getAttribute("aria-expanded") !== "true";
      navToggle.setAttribute("aria-expanded", String(next));
      nav.classList.toggle("is-open", next);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });

    nav.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("a")) closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 832) closeNav();
    });
  }

  document.querySelectorAll("[data-filter-root]").forEach((root) => {
    const input = root.querySelector("[data-filter-input]");
    const clear = root.querySelector("[data-filter-clear]");
    const count = root.querySelector("[data-filter-count]");
    const listHost = root.nextElementSibling;

    if (!input || !listHost) return;

    const items = Array.from(
      listHost.querySelectorAll("[data-filter-item]")
    );

    const update = () => {
      const query = String(input.value || "").trim().toLowerCase();
      let visible = 0;

      items.forEach((item) => {
        const haystack = String(item.dataset.filterText || "").toLowerCase();
        const match = !query || haystack.includes(query);
        item.hidden = !match;
        if (match) visible += 1;
      });

      if (count) count.textContent = String(visible);
      if (clear) clear.hidden = query.length === 0;
      root.classList.toggle("is-filtering", query.length > 0);
    };

    input.addEventListener("input", update);
    if (clear) {
      clear.addEventListener("click", () => {
        input.value = "";
        update();
        input.focus();
      });
    }

    update();
  });

  document.querySelectorAll("[data-rei-toc-progress]").forEach((panel) => {
    const segmentHost = panel.querySelector("[data-rei-toc-segments]");
    const links = Array.from(panel.querySelectorAll(".rei-toc a[href^='#']"));

    if (!segmentHost || links.length === 0) return;

    const entries = links
      .map((link) => {
        const heading = getHeadingFromLink(link);
        if (!heading) return null;
        return { link, heading };
      })
      .filter(Boolean);

    if (entries.length === 0) return;

    const primaryEntries = entries.filter((entry) => entry.heading.tagName === "H2");
    const segmentEntries = entries.length > 18 && primaryEntries.length > 1 ? primaryEntries : entries;

    segmentHost.replaceChildren();
    segmentHost.style.setProperty("--toc-count", String(segmentEntries.length));
    panel.classList.add("is-progress-aware");

    entries.forEach((entry, index) => {
      const label = document.createElement("span");
      label.className = "rei-toc__label";
      while (entry.link.firstChild) label.appendChild(entry.link.firstChild);
      entry.link.appendChild(label);

      const count = document.createElement("span");
      count.className = "rei-toc__count";
      count.textContent = `${index + 1}/${entries.length}`;
      entry.link.appendChild(count);
    });

    segmentEntries.forEach((entry) => {
      const segment = document.createElement("span");
      segment.className = "rei-toc__segment";
      segmentHost.appendChild(segment);
      entry.segment = segment;
    });

    let frame = 0;
    let activeIndex = -1;

    const update = () => {
      frame = 0;
      const marker = window.scrollY + Math.min(window.innerHeight * 0.35, 220);
      const positions = entries.map((entry) => entry.heading.getBoundingClientRect().top + window.scrollY);
      const lastEntry = entries[entries.length - 1];
      const article = lastEntry.heading.closest(".rei-prose");
      const articleBottom = article
        ? article.getBoundingClientRect().bottom + window.scrollY
        : document.documentElement.scrollHeight;

      let nextIndex = 0;
      for (let index = 0; index < positions.length; index += 1) {
        if (positions[index] <= marker) nextIndex = index;
      }

      if (nextIndex !== activeIndex) activeIndex = nextIndex;

      const segmentPositions = segmentEntries.map((entry) => entry.heading.getBoundingClientRect().top + window.scrollY);
      let activeSegmentIndex = 0;
      for (let index = 0; index < segmentPositions.length; index += 1) {
        if (segmentPositions[index] <= marker) activeSegmentIndex = index;
      }

      const segmentStart = segmentPositions[activeSegmentIndex];
      const segmentEnd = segmentPositions[activeSegmentIndex + 1] || articleBottom;
      const segmentLength = Math.max(segmentEnd - segmentStart, 1);
      const segmentProgress = clamp((marker - segmentStart) / segmentLength, 0, 1);

      entries.forEach((entry, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;

        entry.link.classList.toggle("is-complete", complete);
        entry.link.classList.toggle("is-active", active);

        if (active) {
          entry.link.setAttribute("aria-current", "location");
        } else {
          entry.link.removeAttribute("aria-current");
        }
      });

      segmentEntries.forEach((entry, index) => {
        const complete = index < activeSegmentIndex;
        const active = index === activeSegmentIndex;
        const fill = complete ? 1 : active ? segmentProgress : 0;

        entry.segment.classList.toggle("is-complete", complete);
        entry.segment.classList.toggle("is-active", active);
        entry.segment.style.setProperty("--segment-fill", String(fill));
      });
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("load", scheduleUpdate, { once: true });
    entries.forEach((entry) => {
      entry.link.addEventListener("click", () => window.setTimeout(scheduleUpdate, 80));
    });

    update();
  });

  const codeBlocks = Array.from(document.querySelectorAll(".highlight, pre")).filter(
    (block) => !(block.matches("pre") && block.parentElement?.classList.contains("highlight"))
  );

  codeBlocks.forEach((block) => {
    if (block.querySelector(".rei-code-copy")) return;

    const code = block.querySelector("code");
    const status = document.createElement("span");
    status.className = "rei-code-copy-status sr-only";
    status.setAttribute("aria-live", "polite");

    const getText = () => {
      if (code) return code.textContent.trim();

      const clone = block.cloneNode(true);
      clone.querySelectorAll(".rei-code-copy, .rei-code-copy-status").forEach((node) => node.remove());
      return clone.textContent.trim();
    };

    if (!getText()) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "rei-code-copy";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code to clipboard");

    button.addEventListener("click", async () => {
      const text = getText();
      try {
        await copyText(text);
        button.textContent = "Copied";
        button.classList.add("is-copied");
        button.classList.remove("is-failed");
        button.setAttribute("aria-label", "Code copied to clipboard");
        status.textContent = "Code copied to clipboard";
        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
          button.setAttribute("aria-label", "Copy code to clipboard");
        }, 1800);
      } catch {
        button.textContent = "Failed";
        button.classList.add("is-failed");
        button.classList.remove("is-copied");
        button.setAttribute("aria-label", "Copy failed");
        status.textContent = "Copy failed";
        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-failed");
          button.setAttribute("aria-label", "Copy code to clipboard");
        }, 1800);
      }
    });

    block.appendChild(status);
    block.appendChild(button);
  });

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function getHeadingFromLink(link) {
    const hash = link.hash || link.getAttribute("href");
    if (!hash || !hash.startsWith("#")) return null;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      return null;
    }

    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
