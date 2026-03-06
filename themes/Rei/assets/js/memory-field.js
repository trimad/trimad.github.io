(() => {
  document.querySelectorAll("[data-memory-field]").forEach((root) => {
    const dataEl = root.querySelector("[data-memory-field-data]");
    const stage = root.querySelector("[data-memory-stage]");
    const linksSvg = root.querySelector("[data-memory-links]");
    const details = root.querySelector("[data-memory-details]");
    const results = root.querySelector("[data-memory-results]");
    const resultsList = root.querySelector("[data-memory-results-list]");
    const search = root.querySelector("[data-memory-search]");
    const clear = root.querySelector("[data-memory-clear]");

    if (!dataEl || !stage || !linksSvg || !details || !results || !resultsList || !search) {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(dataEl.textContent || "{}");
      if (typeof payload === "string") {
        payload = JSON.parse(payload);
      }
    } catch {
      return;
    }

    if (!payload || typeof payload !== "object") {
      return;
    }

    const graph = buildGraph(payload);
    const elements = {
      columns: {
        category: root.querySelector('[data-memory-column="category"]'),
        tag: root.querySelector('[data-memory-column="tag"]'),
        page: root.querySelector('[data-memory-column="page"]'),
      },
      lists: {
        category: root.querySelector('[data-memory-list="category"]'),
        tag: root.querySelector('[data-memory-list="tag"]'),
        page: root.querySelector('[data-memory-list="page"]'),
      },
      counts: {
        category: root.querySelector('[data-memory-count="category"]'),
        tag: root.querySelector('[data-memory-count="tag"]'),
        page: root.querySelector('[data-memory-count="page"]'),
      },
      toggles: Array.from(root.querySelectorAll("[data-memory-toggle]")),
    };

    const state = {
      query: String(root.dataset.defaultQuery || "").trim().toLowerCase(),
      visibility: {
        category: true,
        tag: true,
        page: true,
      },
      pageLabelSingular: String(root.dataset.pageLabelSingular || "Entry"),
      pageLabelPlural: String(root.dataset.pageLabelPlural || "Entries"),
      focusKind: String(root.dataset.focusKind || ""),
      focusValue: String(root.dataset.focusValue || ""),
      pinnedId: resolvePinnedId(graph, root.dataset.focusKind, root.dataset.focusValue),
      activeId: null,
    };

    if (state.query) {
      search.value = root.dataset.defaultQuery || "";
      if (clear) clear.hidden = false;
    }

    if (!state.pinnedId && graph.pages.length) {
      state.pinnedId = graph.pages[0].id;
    }

    let currentView = null;
    let nodeElements = new Map();
    let drawFrame = null;

    elements.toggles.forEach((toggle) => {
      toggle.addEventListener("change", () => {
        const type = String(toggle.dataset.memoryToggle || "");
        if (type === "categories") state.visibility.category = toggle.checked;
        if (type === "tags") state.visibility.tag = toggle.checked;
        if (type === "pages") state.visibility.page = toggle.checked;
        render();
      });
    });

    search.addEventListener("input", () => {
      state.query = String(search.value || "").trim().toLowerCase();
      if (clear) clear.hidden = state.query.length === 0;
      render();
    });

    if (clear) {
      clear.addEventListener("click", () => {
        search.value = "";
        state.query = "";
        clear.hidden = true;
        render();
        search.focus();
      });
    }

    stage.addEventListener("pointerleave", () => {
      state.activeId = currentView?.defaultId || state.pinnedId || null;
      refreshState();
    });

    stage.addEventListener("focusout", () => {
      window.requestAnimationFrame(() => {
        if (root.contains(document.activeElement)) return;
        state.activeId = currentView?.defaultId || state.pinnedId || null;
        refreshState();
      });
    });

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => scheduleDraw()).observe(stage);
    } else {
      window.addEventListener("resize", () => scheduleDraw());
    }

    render();

    function render() {
      currentView = buildView(graph, state);
      nodeElements = new Map();

      renderColumn("category", currentView.categories);
      renderColumn("tag", currentView.tags);
      renderColumn("page", currentView.pages);
      renderResultsPanel(currentView.results, state.query);

      const fallbackActive = currentView.defaultId || state.pinnedId;
      if (!nodeExistsInView(currentView, state.activeId)) {
        state.activeId = fallbackActive;
      }

      refreshState();
    }

    function renderColumn(type, items) {
      const column = elements.columns[type];
      const list = elements.lists[type];
      const count = elements.counts[type];
      if (!column || !list || !count) return;

      const visible = state.visibility[type];
      column.classList.toggle("is-hidden", !visible);
      list.innerHTML = "";
      count.textContent = visible ? String(items.length) : "0";
      if (!visible) return;

      items.forEach((node) => {
        const link = document.createElement("a");
        link.href = node.href || "#";
        link.className = `rei-memory-node rei-memory-node--${node.type}`;
        link.dataset.memoryNode = node.id;

        const content = document.createElement("div");
        const label = document.createElement("small");
        const title = document.createElement("strong");
        const meta = document.createElement("span");

        if (node.type === "page") {
          label.textContent = state.pageLabelSingular;
          title.textContent = node.title;
          meta.textContent = formatDate(node.lastmod);
        } else {
          label.textContent = node.type === "category" ? "Category" : "Tag";
          title.textContent = node.name;
          meta.textContent = String(node.count || 0);
        }

        content.append(label, title);
        link.append(content, meta);

        link.addEventListener("mouseenter", () => {
          state.activeId = node.id;
          refreshState();
        });

        link.addEventListener("focus", () => {
          state.activeId = node.id;
          refreshState();
        });

        list.appendChild(link);
        nodeElements.set(node.id, link);
      });
    }

    function refreshState() {
      const activeId = state.activeId || currentView?.defaultId || state.pinnedId;
      nodeElements.forEach((element, id) => {
        element.classList.toggle("is-active", id === activeId);
      });
      renderDetails(activeId);
      scheduleDraw(activeId);
    }

    function renderDetails(activeId) {
      const node = getNode(graph, activeId);
      details.innerHTML = "";

      if (!node) {
        details.innerHTML = `
          <p class="rei-kicker"><span></span>Signal Detail</p>
          <h3>Awaiting selection</h3>
          <p>No visible node is active.</p>
        `;
        return;
      }

      const kicker = document.createElement("p");
      kicker.className = "rei-kicker";
      kicker.innerHTML = "<span></span>Signal Detail";

      const title = document.createElement("h3");
      title.textContent = node.type === "page" ? node.title : node.name;

      const copy = document.createElement("p");
      const links = document.createElement("div");
      links.className = "rei-memory__details-links";

      if (node.type === "page") {
        copy.textContent = node.summary || `No summary available for this ${state.pageLabelSingular.toLowerCase()}.`;
        node.categoryIds.forEach((id) => {
          const related = graph.categoriesById.get(id);
          if (related) links.appendChild(makeDetailLink(related.href, related.name, "category"));
        });
        node.tagIds.forEach((id) => {
          const related = graph.tagsById.get(id);
          if (related) links.appendChild(makeDetailLink(related.href, `#${related.name}`, "tag"));
        });
      } else {
        const connectedPages = pickPagesForNode(node, graph, 4);
        copy.textContent = `${node.count || connectedPages.length} connected entr${connectedPages.length === 1 ? "y" : "ies"} in the archive.`;
        connectedPages.forEach((pageNode) => {
          links.appendChild(makeDetailLink(pageNode.href, pageNode.title, "page"));
        });
      }

      const primary = document.createElement("a");
      primary.className = "rei-button rei-button--primary";
      primary.href = node.href || "#";
      primary.textContent = node.type === "page" ? `Open ${state.pageLabelSingular.toLowerCase()}` : "Open term";

      details.append(kicker, title, copy, links, primary);
    }

    function renderResultsPanel(items, query) {
      resultsList.innerHTML = "";

      if (!query) {
        results.hidden = true;
        return;
      }

      results.hidden = false;
      if (!items.length) {
        const empty = document.createElement("p");
        empty.textContent = `No matching ${state.pageLabelPlural.toLowerCase()} found.`;
        resultsList.appendChild(empty);
        return;
      }

      items.forEach((node) => {
        const link = document.createElement("a");
        link.href = node.href;
        link.className = "rei-memory__result";
        const title = document.createElement("strong");
        title.className = "rei-memory__result-title";
        title.textContent = node.title;
        const summary = document.createElement("span");
        summary.className = "rei-memory__result-summary";
        summary.textContent = node.summary || `${node.sectionTitle} · ${formatDate(node.lastmod)}`;
        link.append(title, summary);
        resultsList.appendChild(link);
      });
    }

    function scheduleDraw(activeId = state.activeId || currentView?.defaultId || state.pinnedId) {
      if (drawFrame) return;
      drawFrame = window.requestAnimationFrame(() => {
        drawFrame = null;
        drawLinks(currentView, activeId);
      });
    }

    function drawLinks(view, activeId) {
      if (!view) return;
      linksSvg.innerHTML = "";

      const stageRect = stage.getBoundingClientRect();
      const positions = new Map();
      nodeElements.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        positions.set(id, {
          x: rect.left - stageRect.left + rect.width / 2,
          y: rect.top - stageRect.top + rect.height / 2,
        });
      });

      buildLinks(view, state.visibility).forEach((link) => {
        const source = positions.get(link.source);
        const target = positions.get(link.target);
        if (!source || !target) return;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", `rei-memory__path${link.source === activeId || link.target === activeId ? " is-active" : ""}`);
        path.setAttribute("d", curveBetween(source, target));
        linksSvg.appendChild(path);
      });
    }
  });

  function buildGraph(payload) {
    const categoriesById = new Map(
      (payload.categories || []).map((node) => [
        node.id,
        { ...node, type: "category", pageIds: new Set(), tagIds: new Set(), searchText: String(node.name || "").toLowerCase() },
      ])
    );
    const tagsById = new Map(
      (payload.tags || []).map((node) => [
        node.id,
        { ...node, type: "tag", pageIds: new Set(), categoryIds: new Set(), searchText: String(node.name || "").toLowerCase() },
      ])
    );
    const pagesById = new Map();

    (payload.pages || []).forEach((page) => {
      const categoryIds = (page.categories || []).map((item) => `category:${item.key}`);
      const tagIds = (page.tags || []).map((item) => `tag:${item.key}`);
      const node = {
        ...page,
        type: "page",
        categoryIds,
        tagIds,
        searchText: [
          page.title,
          page.summary,
          page.sectionTitle,
          ...(page.categories || []).map((item) => item.name),
          ...(page.tags || []).map((item) => item.name),
        ]
          .join(" ")
          .toLowerCase(),
      };
      pagesById.set(node.id, node);

      categoryIds.forEach((id) => categoriesById.get(id)?.pageIds.add(node.id));
      tagIds.forEach((id) => tagsById.get(id)?.pageIds.add(node.id));
      categoryIds.forEach((categoryId) => {
        tagIds.forEach((tagId) => {
          categoriesById.get(categoryId)?.tagIds.add(tagId);
          tagsById.get(tagId)?.categoryIds.add(categoryId);
        });
      });
    });

    return {
      categoriesById,
      tagsById,
      pagesById,
      categories: sortByCountName([...categoriesById.values()]),
      tags: sortByCountName([...tagsById.values()]),
      pages: [...pagesById.values()].sort(sortByDateDesc),
    };
  }

  function buildView(graph, state) {
    if (state.query) {
      return buildSearchView(graph, state.query);
    }
    if (state.focusKind === "section" && state.focusValue) {
      return buildSectionView(graph, state.focusValue);
    }
    if (state.pinnedId) {
      return buildFocusedView(graph, state.pinnedId);
    }
    return buildDefaultView(graph);
  }

  function buildDefaultView(graph) {
    const categories = graph.categories.slice(0, 7);
    const tags = graph.tags.slice(0, 10);
    const pages = graph.pages.slice(0, 10);
    return {
      categories,
      tags,
      pages,
      results: [],
      defaultId: pages[0]?.id || categories[0]?.id || tags[0]?.id || null,
    };
  }

  function buildFocusedView(graph, pinnedId) {
    const node = getNode(graph, pinnedId);
    if (!node) return buildDefaultView(graph);

    if (node.type === "category") {
      const pages = pickLatestPages(node.pageIds, graph, 12);
      const tags = collectTagsFromPages(pages, graph, 12);
      return { categories: [node], tags, pages, results: [], defaultId: node.id };
    }

    if (node.type === "tag") {
      const pages = pickLatestPages(node.pageIds, graph, 12);
      const categories = collectCategoriesFromPages(pages, graph, 8);
      return { categories, tags: [node], pages, results: [], defaultId: node.id };
    }

    const pages = [node, ...scoreRelatedPages(node, graph).slice(0, 8)];
    return {
      categories: collectCategoriesFromPages(pages, graph, 8),
      tags: collectTagsFromPages(pages, graph, 12),
      pages,
      results: [],
      defaultId: node.id,
    };
  }

  function buildSectionView(graph, section) {
    const pages = graph.pages.filter((page) => page.section === section);
    const categories = collectCategoriesFromPages(pages, graph);
    const tags = collectTagsFromPages(pages, graph);

    return {
      categories,
      tags,
      pages,
      results: [],
      defaultId: pages[0]?.id || categories[0]?.id || tags[0]?.id || null,
    };
  }

  function buildSearchView(graph, query) {
    const matchedPages = graph.pages.filter((page) => page.searchText.includes(query)).slice(0, 12);
    const matchedCategories = graph.categories.filter((node) => node.searchText.includes(query)).slice(0, 4);
    const matchedTags = graph.tags.filter((node) => node.searchText.includes(query)).slice(0, 6);

    const pageMap = new Map(matchedPages.map((page) => [page.id, page]));
    matchedCategories.forEach((node) => {
      pickLatestPages(node.pageIds, graph, 4).forEach((page) => pageMap.set(page.id, page));
    });
    matchedTags.forEach((node) => {
      pickLatestPages(node.pageIds, graph, 4).forEach((page) => pageMap.set(page.id, page));
    });

    const pages = [...pageMap.values()].sort(sortByDateDesc).slice(0, 12);
    const categories = uniqueNodes([...matchedCategories, ...collectCategoriesFromPages(pages, graph, 12)]).slice(0, 10);
    const tags = uniqueNodes([...matchedTags, ...collectTagsFromPages(pages, graph, 14)]).slice(0, 12);

    return {
      categories,
      tags,
      pages,
      results: matchedPages.slice(0, 8),
      defaultId: matchedPages[0]?.id || matchedCategories[0]?.id || matchedTags[0]?.id || null,
    };
  }

  function resolvePinnedId(graph, kind, value) {
    if (!kind || !value) return null;
    if (kind === "page" && graph.pagesById.has(value)) return value;
    if (kind === "category" && graph.categoriesById.has(`category:${value}`)) return `category:${value}`;
    if (kind === "tag" && graph.tagsById.has(`tag:${value}`)) return `tag:${value}`;
    return null;
  }

  function pickLatestPages(ids, graph, limit) {
    return [...ids]
      .map((id) => graph.pagesById.get(id))
      .filter(Boolean)
      .sort(sortByDateDesc)
      .slice(0, limit);
  }

  function collectCategoriesFromPages(pages, graph, limit) {
    const items = new Map();
    pages.forEach((page) => {
      page.categoryIds.forEach((id) => {
        const node = graph.categoriesById.get(id);
        if (node) items.set(id, node);
      });
    });
    const sorted = sortByCountName([...items.values()]);
    return Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
  }

  function collectTagsFromPages(pages, graph, limit) {
    const items = new Map();
    pages.forEach((page) => {
      page.tagIds.forEach((id) => {
        const node = graph.tagsById.get(id);
        if (node) items.set(id, node);
      });
    });
    const sorted = sortByCountName([...items.values()]);
    return Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
  }

  function scoreRelatedPages(page, graph) {
    return graph.pages
      .filter((candidate) => candidate.id !== page.id)
      .map((candidate) => {
        const sharedCategories = candidate.categoryIds.filter((id) => page.categoryIds.includes(id)).length;
        const sharedTags = candidate.tagIds.filter((id) => page.tagIds.includes(id)).length;
        const sameSection = candidate.section === page.section ? 1 : 0;
        return { candidate, score: sharedCategories * 2 + sharedTags * 3 + sameSection };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || sortByDateDesc(a.candidate, b.candidate))
      .map((entry) => entry.candidate);
  }

  function buildLinks(view, visibility) {
    const categoryIds = new Set(view.categories.map((node) => node.id));
    const tagIds = new Set(view.tags.map((node) => node.id));
    const pageIds = new Set(view.pages.map((node) => node.id));
    const links = [];

    if (visibility.category && visibility.tag) {
      view.categories.forEach((category) => {
        category.tagIds.forEach((tagId) => {
          if (tagIds.has(tagId)) {
            links.push({ source: category.id, target: tagId });
          }
        });
      });
    }

    if (visibility.tag && visibility.page) {
      view.pages.forEach((page) => {
        page.tagIds.forEach((tagId) => {
          if (tagIds.has(tagId)) {
            links.push({ source: tagId, target: page.id });
          }
        });
      });
    }

    if (!visibility.tag && visibility.category && visibility.page) {
      view.pages.forEach((page) => {
        page.categoryIds.forEach((categoryId) => {
          if (categoryIds.has(categoryId)) {
            links.push({ source: categoryId, target: page.id });
          }
        });
      });
    }

    return links.filter((link) => {
      if (!visibility.category && String(link.source).startsWith("category:")) return false;
      if (!visibility.tag && String(link.source).startsWith("tag:")) return false;
      if (!visibility.tag && String(link.target).startsWith("tag:")) return false;
      if (!visibility.page && pageIds.has(link.target)) return false;
      return true;
    });
  }

  function pickPagesForNode(node, graph, limit) {
    if (node.type === "page") return [node];
    return pickLatestPages(node.pageIds, graph, limit);
  }

  function makeDetailLink(href, label, type) {
    const link = document.createElement("a");
    link.href = href;
    link.className = `rei-pill rei-pill--${type === "category" ? "category" : type === "tag" ? "tag" : "page"}`;
    link.textContent = label;
    return link;
  }

  function curveBetween(source, target) {
    const delta = Math.max(Math.abs(target.x - source.x) * 0.45, 36);
    return `M ${source.x} ${source.y} C ${source.x + delta} ${source.y}, ${target.x - delta} ${target.y}, ${target.x} ${target.y}`;
  }

  function getNode(graph, id) {
    if (!id) return null;
    return graph.pagesById.get(id) || graph.categoriesById.get(id) || graph.tagsById.get(id) || null;
  }

  function nodeExistsInView(view, id) {
    if (!id || !view) return false;
    return [...view.categories, ...view.tags, ...view.pages].some((node) => node.id === id);
  }

  function uniqueNodes(nodes) {
    return [...new Map(nodes.filter(Boolean).map((node) => [node.id, node])).values()];
  }

  function sortByCountName(items) {
    return items.sort((a, b) => (b.count || 0) - (a.count || 0) || String(a.name || "").localeCompare(String(b.name || "")));
  }

  function sortByDateDesc(a, b) {
    return String(b.lastmod || b.date || "").localeCompare(String(a.lastmod || a.date || ""));
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }
})();
