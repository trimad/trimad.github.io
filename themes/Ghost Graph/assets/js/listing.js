(() => {
  const sections = document.querySelectorAll("[data-collection-filter]");
  if (!sections.length) {
    return;
  }

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .trim();

  sections.forEach((section) => {
    const input = section.querySelector("[data-listing-search]");
    const clearButton = section.querySelector("[data-listing-clear]");
    const count = section.querySelector("[data-listing-count]");
    const empty = section.querySelector("[data-listing-empty]");
    const cards = Array.from(section.querySelectorAll("[data-card]"));

    if (!cards.length) {
      return;
    }

    const sync = () => {
      const query = normalize(input ? input.value : "");
      let visible = 0;

      cards.forEach((card) => {
        const haystack = normalize(card.dataset.filterText);
        const matches = !query || haystack.includes(query);
        card.hidden = !matches;
        if (matches) {
          visible += 1;
        }
      });

      if (count) {
        count.textContent = String(visible);
      }

      if (empty) {
        empty.hidden = visible > 0;
      }

      if (clearButton) {
        clearButton.hidden = !query;
      }
    };

    if (input) {
      input.addEventListener("input", sync);
    }

    if (clearButton && input) {
      clearButton.addEventListener("click", () => {
        input.value = "";
        sync();
        input.focus();
      });
    }

    sync();
  });
})();
