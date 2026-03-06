(() => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const next = navToggle.getAttribute("aria-expanded") !== "true";
      navToggle.setAttribute("aria-expanded", String(next));
      nav.classList.toggle("is-open", next);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
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

  const codeBlocks = Array.from(document.querySelectorAll(".highlight, pre")).filter(
    (block) => !(block.matches("pre") && block.parentElement?.classList.contains("highlight"))
  );

  codeBlocks.forEach((block) => {
    if (block.querySelector(".rei-code-copy")) return;

    const code = block.querySelector("code");
    const getText = () => (code ? code.innerText : block.innerText).trim();
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
        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1800);
      } catch {
        button.textContent = "Failed";
        window.setTimeout(() => {
          button.textContent = "Copy";
        }, 1800);
      }
    });

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
})();
