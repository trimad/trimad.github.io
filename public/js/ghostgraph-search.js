(function (global) {
  const normalize = (v) => String(v || "").toLowerCase().trim();
  const toSet = (arr) => new Set((arr || []).map(normalize).filter(Boolean));

  function similarityToQuery(nodeTokens, queryTokens) {
    if (!queryTokens.size) return 0;
    let hits = 0;
    for (const qt of queryTokens) {
      let matched = false;
      for (const nt of nodeTokens) {
        if (nt === qt || nt.startsWith(qt)) {
          matched = true;
          break;
        }
      }
      if (matched) hits++;
    }
    return hits / queryTokens.size;
  }

  function init(opts) {
    const {
      searchEl,
      nodes,
      setQueryActive,
      rebuildEdges,
      retuneForGraph,
      reheat,
      meta,
    } = opts || {};

    if (!searchEl || !nodes || !setQueryActive) return;

    const allowedCats = meta && Array.isArray(meta.categories) ? toSet(meta.categories) : new Set();
    const allowedTags = meta && Array.isArray(meta.tags) ? toSet(meta.tags) : new Set();

    // Build inverted index once for fast lookups
    const index = new Map(); // token -> Set(nodes)
    nodes.forEach((n) => {
      const tokenBag = new Set();
      (n.tokens || []).forEach((t) => tokenBag.add(normalize(t)));
      (n.categories || []).forEach((c) => tokenBag.add(normalize(c)));
      (n.tags || []).forEach((t) => tokenBag.add(normalize(t)));
      tokenBag.forEach((t) => {
        if (!t) return;
        if (!index.has(t)) index.set(t, new Set());
        index.get(t).add(n);
      });
    });

    const runSearch = (termsRaw) => {
      const terms = termsRaw.map(normalize).filter(Boolean);
      const active = terms.length > 0;
      setQueryActive(active);

      if (!active) {
        nodes.forEach((n) => {
          n.visible = true;
          n.renderRadius = 8.5;
        });
        rebuildEdges();
        retuneForGraph();
        reheat();
        return;
      }

      const exactTerms = terms.filter(
        (t) => allowedCats.has(t) || allowedTags.has(t) || index.has(t)
      );

      let visibleSet = null;
      if (exactTerms.length) {
        for (const t of exactTerms) {
          const bucket = index.get(t);
          if (!bucket) {
            visibleSet = null;
            break;
          }
          if (!visibleSet) {
            visibleSet = new Set(bucket);
          } else {
            for (const n of Array.from(visibleSet)) {
              if (!bucket.has(n)) visibleSet.delete(n);
            }
          }
        }
      }

      if (visibleSet && visibleSet.size) {
        nodes.forEach((n) => {
          const hit = visibleSet.has(n);
          n.visible = hit;
          n.renderRadius = hit ? 12 : 8.5;
        });
      } else {
        const queryTokens = new Set(terms);
        nodes.forEach((n) => {
          const simScore = similarityToQuery(n.tokens, queryTokens);
          n.visible = simScore > 0;
          if (n.visible) {
            const base = 6;
            const boost = Math.min(16, simScore * 20);
            n.renderRadius = base + boost;
          }
        });
      }

      rebuildEdges();
      retuneForGraph();
      reheat();
    };

    searchEl.addEventListener("input", (e) => {
      const q = (e.target.value || "").toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);
      runSearch(terms);
    });

    (function prefillSearch() {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        searchEl.value = q;
        searchEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
    })();

    (function focusSearchOnLoad() {
      requestAnimationFrame(() => {
        searchEl.focus({ preventScroll: true });
        if (typeof searchEl.select === "function") searchEl.select();
      });
    })();
  }

  global.GhostGraphSearch = Object.assign(global.GhostGraphSearch || {}, { init });
})(window);
