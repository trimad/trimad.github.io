(() => {
  const copyText = async (text) => {
    if (!text) {
      return false;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  };

  const getCodeText = (block) => {
    const codeEl = block.querySelector("code");
    if (codeEl) {
      return codeEl.innerText.replace(/\s+$/, "");
    }

    const preEl = block.querySelector("pre");
    if (preEl) {
      return preEl.innerText.replace(/\s+$/, "");
    }

    return "";
  };

  const enhanceBlock = (block) => {
    if (block.dataset.copyReady === "true") {
      return;
    }

    const codeText = getCodeText(block);
    if (!codeText) {
      return;
    }

    block.dataset.copyReady = "true";
    block.classList.add("sv-code-block");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "sv-copy-btn";
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.textContent = "Copy";

    button.addEventListener("click", async () => {
      try {
        const ok = await copyText(getCodeText(block));
        if (ok) {
          button.textContent = "Copied";
          button.classList.add("is-copied");
          setTimeout(() => {
            button.textContent = "Copy";
            button.classList.remove("is-copied");
          }, 1400);
        }
      } catch (err) {
        button.textContent = "Error";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1400);
      }
    });

    block.appendChild(button);
  };

  const init = () => {
    document.querySelectorAll(".highlight").forEach(enhanceBlock);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
