import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";

(() => {
  const dataEl = document.getElementById("dag-data");
  const container = document.getElementById("dag");
  if (!dataEl || !container) {
    return;
  }

  const mapSection = container.closest(".sv-map");
  const emptyState = container.querySelector(".dag-empty");
  const resultsPanel = document.getElementById("dag-results");
  const resultsList = resultsPanel
    ? resultsPanel.querySelector(".sv-map-results-list")
    : null;
  const resultsEmpty = resultsPanel
    ? resultsPanel.querySelector(".sv-map-results-empty")
    : null;

  const FALLBACK_CATEGORY = "Uncategorized";
  const FALLBACK_TAG = "Untagged";
  const palette = getPalette();
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof ForceGraph3D === "undefined") {
    if (emptyState) {
      emptyState.textContent = "Graph library unavailable. Check CDN access.";
    }
    container.classList.add("is-empty");
    return;
  }

  let data;
  try {
    data = JSON.parse(dataEl.textContent);
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
  } catch (error) {
    return;
  }

  const posts = (data.posts || []).map(normalizePost);
  if (!posts.length) {
    container.classList.add("is-empty");
    return;
  }
  container.classList.remove("is-empty");

  const indexedPosts = posts.map((post) => ({
    ...post,
    _search: buildSearchText(post),
    _searchMeta: buildSearchMeta(post),
  }));

  const taxonomies = data.taxonomies || {};
  let graphData = buildGraphData(indexedPosts, taxonomies);
  applyDeterministicPositions(graphData);
  const fullGraphData = graphData;
  let searchGraphData = graphData;
  let baseGraphData = graphData;
  const homePath = "/";
  const taxonomyPathLookup = buildTaxonomyPathLookup(fullGraphData);
  const visibility = {
    categories: true,
    tags: true,
    posts: true,
  };

  const highlight = {
    selectedNodes: new Set(),
    relatedNodes: new Set(),
    selectedLinks: new Set(),
    relatedLinks: new Set(),
    searchNodes: new Set(),
    searchLinks: new Set(),
    primaryNodeId: null,
    hoveredNodeId: null,
    isSearchActive: false,
  };

  const supportsThreeSprites = typeof THREE !== "undefined";

  const Graph = ForceGraph3D()(container)
    .backgroundColor("rgba(0,0,0,0)")
    .graphData({ nodes: graphData.nodes, links: graphData.links })
    .nodeLabel((node) => `${node.name} (${labelForType(node.type)})`)
    .nodeColor((node) => nodeColor(node, highlight, palette))
    .nodeVal((node) => nodeValue(node, highlight))
    .linkColor((link) => linkColor(link, highlight, palette))
    .linkWidth((link) => linkWidth(link, highlight))
    .linkOpacity(0.55)
    .linkDirectionalParticles((link) => linkParticles(link, highlight))
    .linkDirectionalParticleWidth(1.4)
    .linkDirectionalParticleSpeed(0.007)
    .onNodeClick((node, event) => handleNodeClick(node, event))
    .onNodeHover((node) => {
      highlight.hoveredNodeId = node ? node.id : null;
      updateLabels();
    })
    .onLinkClick((link, event) => {
      if (event && (event.metaKey || event.ctrlKey) && link.href) {
        window.location.href = link.href;
        return;
      }
      setFocus({ kind: "link", link });
    });

  if (supportsThreeSprites) {
    Graph.nodeThreeObject((node) => makeNodeGlyph(node, palette))
      .nodeThreeObjectExtend(false);
  }

  const labelLayer = supportsThreeSprites ? null : createLabelLayer();
  const labelNodes = supportsThreeSprites ? null : new Map();
  const labelVector = supportsThreeSprites ? null : Graph.camera().position.clone();
  let labelFrame = null;

  if (typeof Graph.onBackgroundClick === "function") {
    Graph.onBackgroundClick(() => {});
  }

  Graph.d3Force("charge").strength(-160);
  Graph.d3Force("link").distance((link) => (link.type === "cat-tag" ? 160 : 110));

  let lastWidth = 0;
  let lastHeight = 0;
  const resizeGraph = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width && height && (width !== lastWidth || height !== lastHeight)) {
      Graph.width(width);
      Graph.height(height);
      lastWidth = width;
      lastHeight = height;
      scheduleLabelUpdate();
    }
  };

  resizeGraph();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => resizeGraph());
    observer.observe(container);
  } else {
    window.addEventListener("resize", resizeGraph);
  }

  const controls = Graph.controls && Graph.controls();
  if (controls && typeof controls.addEventListener === "function") {
    controls.addEventListener("change", () => scheduleLabelUpdate());
  }

  let fitted = false;
  let pendingFit = false;
  Graph.onEngineStop(() => {
    container.classList.add("is-ready");
    if (!fitted) {
      fitted = true;
      Graph.zoomToFit(motionDuration(700), 60);
    }
    if (pendingFit && graphData.nodes.length) {
      pendingFit = false;
      Graph.zoomToFit(motionDuration(700), 60);
    }
    updateLabels();
  });

  let currentSelection = null;
  const focusKind = container.dataset.focusKind;
  const focusValue = container.dataset.focusValue;
  if (focusKind && focusValue) {
    currentSelection = selectionFromFocus(graphData, focusKind, focusValue);
  }
  refreshHighlights();

  const searchInput = document.getElementById("dag-search");
  const clearButton = mapSection
    ? mapSection.querySelector(".sv-search-clear")
    : document.querySelector(".sv-search-clear");
  const homeButton = document.getElementById("dag-home");
  const categoryToggle = document.getElementById("dag-toggle-categories");
  const tagToggle = document.getElementById("dag-toggle-tags");
  const postToggle = document.getElementById("dag-toggle-posts");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const value = String(event.target.value || "").trim().toLowerCase();
      updateSearch(value);
      updateClearVisibility();
    });
  }
  if (clearButton && searchInput) {
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      updateSearch("");
      updateClearVisibility();
      searchInput.focus();
    });
  }
  if (categoryToggle || tagToggle || postToggle) {
    const updateVisibility = () => {
      visibility.categories = categoryToggle ? categoryToggle.checked : true;
      visibility.tags = tagToggle ? tagToggle.checked : true;
      visibility.posts = postToggle ? postToggle.checked : true;
      currentSelection = sanitizeSelectionForVisibility(currentSelection);
      baseGraphData = buildGraphTypeFilter(searchGraphData, visibility);
      applySelectionPrune(currentSelection);
      refreshHighlights();
    };
    [categoryToggle, tagToggle, postToggle].forEach((toggle) => {
      if (!toggle) return;
      toggle.addEventListener("change", updateVisibility);
    });
  }
  if (homeButton) {
    homeButton.addEventListener("click", () => {
      goHome();
    });
  }
  updateClearVisibility();

  window.addEventListener("popstate", () => {
    syncSelectionToLocation();
  });

  function handleNodeClick(node, event) {
    if (!node) return;
    if (node && node.type === "post" && node.href) {
      window.location.href = node.href;
      return;
    }
    if (event && (event.metaKey || event.ctrlKey) && node.href) {
      window.location.href = node.href;
      return;
    }
    if (node.type === "tag") {
      setFocus({
        kind: "tag-group",
        key: node.key,
        name: node.name,
        anchor: node,
      });
      return;
    }
    setFocus({ kind: "node", node });
  }

  function setFocus(selection, options = {}) {
    currentSelection = selection;
    applySelectionPrune(selection);
    refreshHighlights();
    if (options.updateUrl !== false) {
      updateUrlForSelection(selection);
    }
    const anchor = selectionAnchor(selection);
    if (anchor) {
      focusCamera(anchor, { mode: "focus" });
    }
  }

  function refreshHighlights() {
    clearHighlightSets(
      highlight.selectedNodes,
      highlight.relatedNodes,
      highlight.selectedLinks,
      highlight.relatedLinks
    );

    if (currentSelection) {
      applyHighlightForSelection(
        currentSelection,
        highlight.selectedNodes,
        highlight.relatedNodes,
        highlight.selectedLinks,
        highlight.relatedLinks
      );
    }

    updateLabels();
    Graph.refresh();
  }

  function applySelectionPrune(selection) {
    const nextGraphData = buildSelectionGraphData(selection);
    if (nextGraphData === graphData) {
      return;
    }
    graphData = nextGraphData;
    Graph.graphData({ nodes: graphData.nodes, links: graphData.links });
    pendingFit = true;
  }

  function buildSelectionGraphData(selection) {
    if (!selection) return baseGraphData;

    if (selection.kind === "tag-group") {
      const tagNodes = baseGraphData.tagNodesByName.get(selection.key) || [];
      if (!tagNodes.length) return baseGraphData;
      const { nodeIds, linkIds } = collectRelatedIds(tagNodes, baseGraphData, 1);
      if (!nodeIds.size) return baseGraphData;
      return buildGraphSlice(nodeIds, linkIds, baseGraphData);
    }

    if (
      selection.kind === "node" &&
      (selection.node.type === "category" || selection.node.type === "tag")
    ) {
      const node = baseGraphData.nodesById.get(selection.node.id);
      if (!node) return baseGraphData;
      if (selection.node.type === "category") {
        return buildCategorySelectionGraphData(node, baseGraphData);
      }
      const { nodeIds, linkIds } = collectRelatedIds([node], baseGraphData, 1);
      if (!nodeIds.size) return baseGraphData;
      return buildGraphSlice(nodeIds, linkIds, baseGraphData);
    }

    return baseGraphData;
  }

  function buildCategorySelectionGraphData(categoryNode, sourceGraph) {
    const categoryKey = categoryNode.key;
    if (!categoryKey) return sourceGraph;

    const nodeIds = new Set();
    const linkIds = new Set();

    nodeIds.add(categoryNode.id);

    const tagNodes = sourceGraph.tagNodesByCategory.get(categoryKey) || [];
    tagNodes.forEach((tagNode) => {
      nodeIds.add(tagNode.id);
      const catTagLinkId = `link:cat:${categoryKey}->${tagNode.id}`;
      if (sourceGraph.linksById.has(catTagLinkId)) {
        linkIds.add(catTagLinkId);
      }
    });

    const categoryPosts = sourceGraph.postsByCategory.get(categoryKey) || [];
    categoryPosts.forEach((post) => {
      const postNode = sourceGraph.postNodesByKey.get(post.key);
      if (!postNode) return;
      nodeIds.add(postNode.id);
      post.tagKeys.forEach((tagKey) => {
        const tagId = `tag:${tagKey}`;
        const tagPostLinkId = `link:${tagId}->${postNode.id}`;
        if (sourceGraph.linksById.has(tagPostLinkId)) {
          linkIds.add(tagPostLinkId);
        }
      });
    });

    if (!nodeIds.size) return sourceGraph;
    return buildGraphSlice(nodeIds, linkIds, sourceGraph);
  }

  function collectRelatedIds(nodes, sourceGraph, depth = 1) {
    const nodeIds = new Set();
    const linkIds = new Set();
    const frontier = new Set();
    nodes.forEach((node) => {
      if (!node) return;
      nodeIds.add(node.id);
      frontier.add(node.id);
    });

    let current = frontier;
    for (let step = 0; step < depth; step += 1) {
      if (!current.size) break;
      const next = new Set();
      current.forEach((nodeId) => {
        const links = sourceGraph.linksByNode.get(nodeId) || [];
        links.forEach((link) => {
          linkIds.add(link.id);
          const sourceId = linkEndpointId(link.source);
          const targetId = linkEndpointId(link.target);
          if (sourceId && !nodeIds.has(sourceId)) {
            nodeIds.add(sourceId);
            next.add(sourceId);
          }
          if (targetId && !nodeIds.has(targetId)) {
            nodeIds.add(targetId);
            next.add(targetId);
          }
        });
      });
      current = next;
    }
    return { nodeIds, linkIds };
  }

  function updateSearch(query) {
    highlight.isSearchActive = Boolean(query);
    highlight.primaryNodeId = null;
    clearSet(highlight.searchNodes);
    clearSet(highlight.searchLinks);

    if (!query) {
      searchGraphData = fullGraphData;
      baseGraphData = buildGraphTypeFilter(searchGraphData, visibility);
      currentSelection = sanitizeSelectionForVisibility(currentSelection);
      applySelectionPrune(currentSelection);
      if (mapSection) {
        mapSection.classList.remove("is-searching");
      }
      updateResultsPanel([]);
      refreshHighlights();
      return;
    }

    const ranked = rankSearchResults(query, indexedPosts);
    searchGraphData = buildFilteredGraphData(ranked);
    baseGraphData = buildGraphTypeFilter(searchGraphData, visibility);
    currentSelection = sanitizeSelectionForVisibility(currentSelection);
    applySelectionPrune(currentSelection);

    if (ranked.length) {
      const primaryEntry = ranked.find(({ post }) =>
        graphData.postNodesByKey.has(post.key)
      );
      if (primaryEntry) {
        const primaryNode = graphData.postNodesByKey.get(primaryEntry.post.key);
        if (primaryNode) {
          highlight.primaryNodeId = primaryNode.id;
        }
      }
    }

    ranked.forEach(({ post }) => {
      const postNode = graphData.postNodesByKey.get(post.key);
      if (postNode) {
        highlight.searchNodes.add(postNode.id);
      }
      post.categoryKeys.forEach((categoryKey) => {
        const categoryNode = graphData.categoryNodesByKey.get(categoryKey);
        if (categoryNode) {
          highlight.searchNodes.add(categoryNode.id);
        }
        post.tagKeys.forEach((tagKey) => {
          const tagId = `tag:${tagKey}`;
          if (graphData.nodesById.has(tagId)) {
            highlight.searchNodes.add(tagId);
          }
          const catTagLinkId = `link:cat:${categoryKey}->${tagId}`;
          if (graphData.linksById.has(catTagLinkId)) {
            highlight.searchLinks.add(catTagLinkId);
          }
          if (postNode) {
            const tagPostLinkId = `link:${tagId}->${postNode.id}`;
            if (graphData.linksById.has(tagPostLinkId)) {
              highlight.searchLinks.add(tagPostLinkId);
            }
          }
        });
      });
    });

    if (mapSection) {
      mapSection.classList.add("is-searching");
    }
    updateResultsPanel(ranked);
    refreshHighlights();

    const primaryNode =
      highlight.primaryNodeId && graphData.nodesById.get(highlight.primaryNodeId);
    if (primaryNode) {
      focusCamera(primaryNode, { mode: "search" });
    }
  }

  function updateResultsPanel(ranked) {
    if (!resultsPanel || !resultsList) return;
    resultsList.innerHTML = "";
    const visibleRanked = highlight.isSearchActive
      ? ranked.filter(({ post }) => graphData.postNodesByKey.has(post.key))
      : ranked;
    if (!highlight.isSearchActive) {
      resultsPanel.classList.add("is-empty");
      if (resultsEmpty) {
        resultsEmpty.textContent = "Type to search.";
      }
      updateClearVisibility();
      return;
    }

    if (!visibleRanked.length) {
      resultsPanel.classList.add("is-empty");
      if (resultsEmpty) {
        resultsEmpty.textContent = "No posts match this search.";
      }
      updateClearVisibility();
      return;
    }

    resultsPanel.classList.remove("is-empty");
    if (resultsEmpty) {
      resultsEmpty.textContent = "";
    }

    visibleRanked.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "sv-map-results-item";
      if (index === 0) {
        li.classList.add("is-primary");
      }
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.post.title;
      button.addEventListener("click", () => {
        const node = graphData.postNodesByKey.get(item.post.key);
        if (node) {
          setFocus({ kind: "node", node });
        }
      });
      li.appendChild(button);
      resultsList.appendChild(li);
    });
    updateClearVisibility();
  }

  function selectionAnchor(selection) {
    if (!selection) return null;
    if (selection.kind === "node") return selection.node;
    if (selection.kind === "tag-group") {
      if (selection.anchor) return selection.anchor;
      const nodes = graphData.tagNodesByName.get(selection.key) || [];
      return nodes[0];
    }
    return null;
  }

  function sanitizeSelectionForVisibility(selection) {
    if (!selection) return null;
    if (selection.kind === "tag-group" && !visibility.tags) return null;
    if (selection.kind === "node") {
      if (selection.node.type === "category" && !visibility.categories) return null;
      if (selection.node.type === "tag" && !visibility.tags) return null;
      if (selection.node.type === "post" && !visibility.posts) return null;
    }
    return selection;
  }

  function goHome(options = {}) {
    currentSelection = null;
    highlight.primaryNodeId = null;
    highlight.hoveredNodeId = null;
    if (searchInput) {
      searchInput.value = "";
    }
    updateSearch("");
    updateClearVisibility();
    if (options.updateUrl !== false) {
      updateUrlForSelection(null, { replace: options.replace === true });
    }
  }

  function updateUrlForSelection(selection, options = {}) {
    if (!window.history || typeof window.history.pushState !== "function") return;

    let href = null;
    let state = { selection: null };

    if (!selection) {
      href = homePath;
    } else if (selection.kind === "tag-group") {
      const key = selection.key;
      href = fullGraphData.taxonomyLinks.tags[key];
      state = { selection: { kind: "tag", key } };
    } else if (selection.kind === "node" && selection.node.type === "category") {
      const key = selection.node.key;
      href = fullGraphData.taxonomyLinks.categories[key];
      state = { selection: { kind: "category", key } };
    } else {
      return;
    }

    if (!href) return;

    const nextPath = normalizePath(new URL(href, window.location.origin).pathname);
    const currentPath = normalizePath(window.location.pathname);
    if (nextPath === currentPath) {
      window.history.replaceState(state, "", nextPath);
      return;
    }

    if (options.replace) {
      window.history.replaceState(state, "", nextPath);
    } else {
      window.history.pushState(state, "", nextPath);
    }
  }

  function selectionFromLocation() {
    const path = normalizePath(window.location.pathname);
    if (path === normalizePath(homePath)) return null;

    const tagKey = taxonomyPathLookup.tags.get(path);
    if (tagKey) {
      const nodes = baseGraphData.tagNodesByName.get(tagKey) || [];
      if (!nodes.length) {
        return null;
      }
      return {
        kind: "tag-group",
        key: tagKey,
        name: baseGraphData.tagDisplayByKey.get(tagKey) || tagKey,
        anchor: nodes[0],
      };
    }

    const categoryKey = taxonomyPathLookup.categories.get(path);
    if (categoryKey) {
      const node = baseGraphData.categoryNodesByKey.get(categoryKey);
      if (node) {
        return { kind: "node", node };
      }
    }

    return null;
  }

  function syncSelectionToLocation() {
    const selection = sanitizeSelectionForVisibility(selectionFromLocation());
    currentSelection = selection;
    applySelectionPrune(selection);
    refreshHighlights();
    const anchor = selectionAnchor(selection);
    if (anchor) {
      focusCamera(anchor, { mode: "focus" });
    }
  }

  function isSelectionPruneActive() {
    if (!currentSelection) return false;
    if (currentSelection.kind === "tag-group") return true;
    if (
      currentSelection.kind === "node" &&
      (currentSelection.node.type === "category" || currentSelection.node.type === "tag")
    ) {
      return true;
    }
    return false;
  }

  function focusCamera(node, options = {}) {
    if (!node || node.x == null) return;
    const isSearch = options.mode === "search";
    const distance = isSearch ? 80 : 140;
    const dist = Math.hypot(node.x, node.y, node.z || 0);
    const ratio = dist > 0 ? 1 + distance / dist : 1.2;
    Graph.cameraPosition(
      { x: node.x * ratio, y: node.y * ratio, z: (node.z || 0) * ratio },
      node,
      motionDuration(isSearch ? 650 : 900)
    );
  }

  function motionDuration(ms) {
    return prefersReducedMotion ? 0 : ms;
  }

  function buildSearchMeta(post) {
    const toLower = (value) => String(value || "").trim().toLowerCase();
    return {
      title: toLower(post.title),
      categories: (post.categories || []).map(toLower),
      tags: (post.tags || []).map(toLower),
      dates: [post.date, post.lastmod].filter(Boolean).map(toLower),
    };
  }

  function rankSearchResults(query, postsInput) {
    return postsInput
      .map((post) => {
        const meta = post._searchMeta;
        let rank = null;
        if (meta.title && meta.title === query) {
          rank = 0;
        } else if (meta.title && meta.title.includes(query)) {
          rank = 1;
        } else if (meta.tags && meta.tags.some((tag) => tag.includes(query))) {
          rank = 2;
        } else if (meta.categories && meta.categories.some((cat) => cat.includes(query))) {
          rank = 3;
        } else if (meta.dates && meta.dates.some((date) => date.includes(query))) {
          rank = 4;
        }
        if (rank === null) return null;
        return { post, rank };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        const aDate = safeDateValue(a.post.lastmod || a.post.date);
        const bDate = safeDateValue(b.post.lastmod || b.post.date);
        if (aDate !== bDate) return bDate - aDate;
        return String(a.post.title).localeCompare(String(b.post.title));
      });
  }

  function safeDateValue(value) {
    const time = Date.parse(value || "");
    return Number.isNaN(time) ? 0 : time;
  }

  function normalizePost(post) {
    const rawCategories = toArray(post.categories).filter(Boolean);
    const rawTags = toArray(post.tags).filter(Boolean);
    const finalCategories = rawCategories.length ? rawCategories : [FALLBACK_CATEGORY];
    const finalTags = rawTags.length ? rawTags : [FALLBACK_TAG];
    return {
      ...post,
      categories: finalCategories,
      tags: finalTags,
      rawCategories,
      rawTags,
      categoryKeys: finalCategories.map(normalizeKey),
      tagKeys: finalTags.map(normalizeKey),
      key: post.relPermalink || post.permalink || post.title,
    };
  }

  function buildGraphData(postsInput, taxonomies) {
    const taxonomyLinks = normalizeTaxonomyLinks(taxonomies);
    const postsByCategory = new Map();
    const postsByTag = new Map();
    const postsByCategoryTag = new Map();
    const categoryDisplayByKey = new Map();

    postsInput.forEach((post) => {
      post.categories.forEach((category, index) => {
        const key = post.categoryKeys[index];
        if (!categoryDisplayByKey.has(key)) {
          categoryDisplayByKey.set(key, category);
        }
        pushToMap(postsByCategory, key, post);
      });
      post.tags.forEach((tag, index) => {
        const key = post.tagKeys[index];
        pushToMap(postsByTag, key, post);
      });
      post.categoryKeys.forEach((categoryKey) => {
        post.tagKeys.forEach((tagKey) => {
          pushToMap(postsByCategoryTag, `${categoryKey}::${tagKey}`, post);
        });
      });
    });

    const categoryKeys = Array.from(categoryDisplayByKey.keys()).sort((a, b) => {
      return categoryDisplayByKey.get(a).localeCompare(categoryDisplayByKey.get(b));
    });

    const categoryNodes = categoryKeys.map((key) => ({
      id: `cat:${key}`,
      key,
      type: "category",
      name: categoryDisplayByKey.get(key),
      level: 0,
      href: taxonomyLinks.categories[key],
    }));
    const categoryNodesByKey = new Map(categoryNodes.map((node) => [node.key, node]));

    const tagNodes = [];
    const tagNodesByCategory = new Map();
    const tagNodesByName = new Map();
    const tagDisplayByKey = new Map();

    postsInput.forEach((post) => {
      post.tags.forEach((tag) => {
        const key = normalizeKey(tag);
        if (!tagDisplayByKey.has(key)) {
          tagDisplayByKey.set(key, tag);
        }
      });
    });

    const tagKeys = Array.from(tagDisplayByKey.keys()).sort((a, b) => {
      return tagDisplayByKey.get(a).localeCompare(tagDisplayByKey.get(b));
    });

    tagKeys.forEach((tagKey) => {
      const node = {
        id: `tag:${tagKey}`,
        key: tagKey,
        type: "tag",
        name: tagDisplayByKey.get(tagKey),
        level: 1,
        href: taxonomyLinks.tags[tagKey],
      };
      tagNodes.push(node);
      pushToMap(tagNodesByName, tagKey, node);
    });

    const tagNodesByKey = new Map(tagNodes.map((node) => [node.key, node]));

    const postNodes = postsInput.map((post) => ({
      id: `post:${post.key}`,
      type: "post",
      name: post.title,
      level: 2,
      href: post.relPermalink || post.permalink,
      post,
    }));
    const postNodesByKey = new Map(postNodes.map((node) => [node.post.key, node]));

    const nodes = [...categoryNodes, ...tagNodes, ...postNodes];
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    const links = [];

    categoryNodes.forEach((categoryNode) => {
      const categoryPosts = postsByCategory.get(categoryNode.key) || [];
      const categoryTagKeys = new Set();
      categoryPosts.forEach((post) => {
        post.tagKeys.forEach((tagKey) => categoryTagKeys.add(tagKey));
      });
      const orderedTagKeys = Array.from(categoryTagKeys).sort((a, b) => {
        return tagDisplayByKey.get(a).localeCompare(tagDisplayByKey.get(b));
      });
      orderedTagKeys.forEach((tagKey) => {
        const tagNode = tagNodesByKey.get(tagKey);
        if (!tagNode) return;
        pushToMap(tagNodesByCategory, categoryNode.key, tagNode);
        links.push({
          id: `link:${categoryNode.id}->${tagNode.id}`,
          type: "cat-tag",
          source: categoryNode.id,
          target: tagNode.id,
          categoryKey: categoryNode.key,
          tagKey: tagNode.key,
          href: tagNode.href || categoryNode.href,
        });
      });
    });

    postsInput.forEach((post) => {
      const postNode = postNodesByKey.get(post.key);
      if (!postNode) return;
      post.categoryKeys.forEach((categoryKey) => {
        post.tagKeys.forEach((tagKey) => {
          const tagId = `tag:${tagKey}`;
          if (!nodesById.has(tagId)) return;
          links.push({
            id: `link:${tagId}->${postNode.id}`,
            type: "tag-post",
            source: tagId,
            target: postNode.id,
            categoryKey,
            tagKey,
            postKey: post.key,
            href: postNode.href,
          });
        });
      });
    });

    const linksByNode = new Map();
    const linksById = new Map();
    links.forEach((link) => {
      const sourceId = linkEndpointId(link.source);
      const targetId = linkEndpointId(link.target);
      if (sourceId) {
        pushToMap(linksByNode, sourceId, link);
      }
      if (targetId) {
        pushToMap(linksByNode, targetId, link);
      }
      linksById.set(link.id, link);
    });

    return {
      posts: postsInput,
      nodes,
      links,
      nodesById,
      categoryNodes,
      tagNodes,
      categoryNodesByKey,
      tagNodesByKey,
      tagNodesByCategory,
      tagNodesByName,
      tagDisplayByKey,
      postNodes,
      postNodesByKey,
      postsByCategory,
      postsByTag,
      postsByCategoryTag,
      linksByNode,
      linksById,
      taxonomyLinks,
    };
  }

  function buildFilteredGraphData(ranked) {
    if (!ranked.length) {
      return createEmptyGraphData(fullGraphData);
    }

    const nodeIds = new Set();
    const linkIds = new Set();

    ranked.forEach(({ post }) => {
      const postNode = fullGraphData.postNodesByKey.get(post.key);
      if (!postNode) return;

      nodeIds.add(postNode.id);
      post.categoryKeys.forEach((categoryKey) => {
        const categoryId = `cat:${categoryKey}`;
        if (fullGraphData.nodesById.has(categoryId)) {
          nodeIds.add(categoryId);
        }

        post.tagKeys.forEach((tagKey) => {
          const tagId = `tag:${tagKey}`;
          if (!fullGraphData.nodesById.has(tagId)) return;
          nodeIds.add(tagId);

          const catTagLinkId = `link:cat:${categoryKey}->${tagId}`;
          if (fullGraphData.linksById.has(catTagLinkId)) {
            linkIds.add(catTagLinkId);
          }

          const tagPostLinkId = `link:${tagId}->${postNode.id}`;
          if (fullGraphData.linksById.has(tagPostLinkId)) {
            linkIds.add(tagPostLinkId);
          }
        });
      });
    });

    if (!nodeIds.size) {
      return createEmptyGraphData(fullGraphData);
    }

    return buildGraphSlice(nodeIds, linkIds, fullGraphData);
  }

  function buildGraphSlice(nodeIds, linkIds, sourceGraph = fullGraphData) {
    const nodes = (sourceGraph.nodes || []).filter((node) => nodeIds.has(node.id));
    const links = (sourceGraph.links || []).filter((link) => linkIds.has(link.id));
    const categoryNodes = (sourceGraph.categoryNodes || []).filter((node) => nodeIds.has(node.id));
    const tagNodes = (sourceGraph.tagNodes || []).filter((node) => nodeIds.has(node.id));
    const postNodes = (sourceGraph.postNodes || []).filter((node) => nodeIds.has(node.id));

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const categoryNodesByKey = new Map(categoryNodes.map((node) => [node.key, node]));
    const postNodesByKey = new Map(postNodes.map((node) => [node.post.key, node]));

    const tagNodesByCategory = new Map();
    const tagNodesByName = new Map();
    const tagDisplayByKey = new Map();
    const tagNodesByKey = new Map(tagNodes.map((node) => [node.key, node]));
    tagNodes.forEach((node) => {
      pushToMap(tagNodesByName, node.key, node);
      if (!tagDisplayByKey.has(node.key)) {
        tagDisplayByKey.set(node.key, node.name);
      }
    });
    links.forEach((link) => {
      if (link.type !== "cat-tag") return;
      const tagId = linkEndpointId(link.target);
      if (!tagId) return;
      const tagNode = nodesById.get(tagId);
      if (!tagNode) return;
      pushToMap(tagNodesByCategory, link.categoryKey, tagNode);
    });

    const posts = postNodes.map((node) => node.post);
    const postsByCategory = new Map();
    const postsByTag = new Map();
    const postsByCategoryTag = new Map();

    posts.forEach((post) => {
      post.categoryKeys.forEach((categoryKey) => {
        pushToMap(postsByCategory, categoryKey, post);
      });
      post.tagKeys.forEach((tagKey) => {
        pushToMap(postsByTag, tagKey, post);
      });
      post.categoryKeys.forEach((categoryKey) => {
        post.tagKeys.forEach((tagKey) => {
          pushToMap(postsByCategoryTag, `${categoryKey}::${tagKey}`, post);
        });
      });
    });

    const linksByNode = new Map();
    const linksById = new Map();
    links.forEach((link) => {
      pushToMap(linksByNode, link.source, link);
      pushToMap(linksByNode, link.target, link);
      linksById.set(link.id, link);
    });

    return {
      posts,
      nodes,
      links,
      nodesById,
      categoryNodes,
      categoryNodesByKey,
      tagNodes,
      tagNodesByCategory,
      tagNodesByName,
      tagNodesByKey,
      tagDisplayByKey,
      postNodes,
      postNodesByKey,
      postsByCategory,
      postsByTag,
      postsByCategoryTag,
      linksByNode,
      linksById,
      taxonomyLinks: sourceGraph.taxonomyLinks,
    };
  }

  function createEmptyGraphData(sourceGraph = fullGraphData) {
    return {
      posts: [],
      nodes: [],
      links: [],
      nodesById: new Map(),
      categoryNodes: [],
      categoryNodesByKey: new Map(),
      tagNodes: [],
      tagNodesByCategory: new Map(),
      tagNodesByName: new Map(),
      tagNodesByKey: new Map(),
      tagDisplayByKey: new Map(),
      postNodes: [],
      postNodesByKey: new Map(),
      postsByCategory: new Map(),
      postsByTag: new Map(),
      postsByCategoryTag: new Map(),
      linksByNode: new Map(),
      linksById: new Map(),
      taxonomyLinks: sourceGraph.taxonomyLinks,
    };
  }

  function selectionFromFocus(graphData, kind, value) {
    if (kind === "post") {
      const postNode = graphData.postNodes.find(
        (node) => node.post.relPermalink === value || node.post.permalink === value
      );
      if (postNode) return { kind: "node", node: postNode };
    }
    if (kind === "categories") {
      const key = normalizeKey(value);
      const categoryNode = graphData.categoryNodesByKey.get(key);
      if (categoryNode) return { kind: "node", node: categoryNode };
    }
    if (kind === "tags") {
      const key = normalizeKey(value);
      const name = graphData.tagDisplayByKey.get(key) || value;
      const nodes = graphData.tagNodesByName.get(key) || [];
      return { kind: "tag-group", key, name, anchor: nodes[0] };
    }
    return null;
  }

  function getRelatedIds(selection, graphData) {
    const selectedNodeIds = new Set();
    const relatedNodeIds = new Set();
    const selectedLinkIds = new Set();
    const relatedLinkIds = new Set();

    if (!selection) {
      return { selectedNodeIds, relatedNodeIds, selectedLinkIds, relatedLinkIds };
    }

    if (selection.kind === "node") {
      const node = selection.node;
      selectedNodeIds.add(node.id);
      const links = graphData.linksByNode.get(node.id) || [];
      links.forEach((link) => {
        relatedLinkIds.add(link.id);
        const sourceId = linkEndpointId(link.source);
        const targetId = linkEndpointId(link.target);
        if (sourceId) relatedNodeIds.add(sourceId);
        if (targetId) relatedNodeIds.add(targetId);
      });
    }

    if (selection.kind === "link") {
      const link = selection.link;
      selectedLinkIds.add(link.id);
      relatedLinkIds.add(link.id);
      const sourceId = linkEndpointId(link.source);
      const targetId = linkEndpointId(link.target);
      if (sourceId) relatedNodeIds.add(sourceId);
      if (targetId) relatedNodeIds.add(targetId);
    }

    if (selection.kind === "tag-group") {
      const tagNodes = graphData.tagNodesByName.get(selection.key) || [];
      tagNodes.forEach((node) => {
        selectedNodeIds.add(node.id);
        const links = graphData.linksByNode.get(node.id) || [];
        links.forEach((link) => {
          relatedLinkIds.add(link.id);
          const sourceId = linkEndpointId(link.source);
          const targetId = linkEndpointId(link.target);
          if (sourceId) relatedNodeIds.add(sourceId);
          if (targetId) relatedNodeIds.add(targetId);
        });
      });
    }

    return { selectedNodeIds, relatedNodeIds, selectedLinkIds, relatedLinkIds };
  }

  function applyHighlightForSelection(
    selection,
    selectedNodes,
    relatedNodes,
    selectedLinks,
    relatedLinks
  ) {
    const {
      selectedNodeIds,
      relatedNodeIds,
      selectedLinkIds,
      relatedLinkIds,
    } = getRelatedIds(selection, graphData);

    selectedNodeIds.forEach((id) => selectedNodes.add(id));
    relatedNodeIds.forEach((id) => relatedNodes.add(id));
    selectedLinkIds.forEach((id) => selectedLinks.add(id));
    relatedLinkIds.forEach((id) => relatedLinks.add(id));
  }

  function normalizeTaxonomyLinks(taxonomies) {
    const categories = {};
    const tags = {};
    Object.keys(taxonomies.categories || {}).forEach((key) => {
      categories[normalizeKey(key)] = taxonomies.categories[key];
    });
    Object.keys(taxonomies.tags || {}).forEach((key) => {
      tags[normalizeKey(key)] = taxonomies.tags[key];
    });
    return { categories, tags };
  }

  function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePath(path) {
    if (!path) return "/";
    let cleaned = path.split("?")[0].split("#")[0];
    if (!cleaned.startsWith("/")) {
      cleaned = `/${cleaned}`;
    }
    cleaned = cleaned.replace(/\/+$/, "");
    if (!cleaned) return "/";
    return `${cleaned}/`;
  }

  function buildTaxonomyPathLookup(sourceGraph) {
    const lookup = {
      categories: new Map(),
      tags: new Map(),
    };

    const addEntries = (map, entries) => {
      Object.entries(entries || {}).forEach(([key, href]) => {
        if (!href) return;
        const path = normalizePath(new URL(href, window.location.origin).pathname);
        map.set(path, key);
      });
    };

    addEntries(lookup.categories, sourceGraph.taxonomyLinks.categories);
    addEntries(lookup.tags, sourceGraph.taxonomyLinks.tags);
    return lookup;
  }

  function pushToMap(map, key, value) {
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(value);
  }

  function buildSearchText(post) {
    const parts = [
      post.title,
      ...(post.categories || []),
      ...(post.tags || []),
      post.date,
      post.lastmod,
    ];
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function getPalette() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => {
      const value = styles.getPropertyValue(name);
      return value ? value.trim() : fallback;
    };
    return {
      text: read("--text", "#e4f0ff"),
      muted: read("--muted", "#9fb3c8"),
      accent: read("--accent", "#5df2d6"),
      warm: read("--accent-warm", "#ffb454"),
      link: read("--stroke", "rgba(255, 255, 255, 0.22)"),
      dim: read("--dim", "rgba(120, 150, 178, 0.18)"),
      post: "#7fb2ff",
    };
  }

  function nodeValue(node, highlightState) {
    let base = 4;
    if (node.type === "category") base = 12;
    if (node.type === "tag") base = 7;
    if (highlightState.primaryNodeId === node.id) return base + 3;
    if (highlightState.selectedNodes.has(node.id)) return base + 1.5;
    return base;
  }

  function nodeColor(node, highlightState, theme) {
    if (highlightState.primaryNodeId === node.id) return theme.accent;
    if (highlightState.selectedNodes.has(node.id)) {
      return isSelectionPruneActive() ? baseColorForType(node.type, theme) : theme.text;
    }
    if (highlightState.relatedNodes.has(node.id)) {
      return isSelectionPruneActive() ? baseColorForType(node.type, theme) : theme.muted;
    }
    if (highlightState.isSearchActive) {
      if (highlightState.searchNodes.has(node.id)) {
        return baseColorForType(node.type, theme);
      }
      return theme.dim;
    }
    return baseColorForType(node.type, theme);
  }

  function linkColor(link, highlightState, theme) {
    if (highlightState.selectedLinks.has(link.id)) return theme.accent;
    if (highlightState.relatedLinks.has(link.id)) return theme.link;
    if (highlightState.isSearchActive) {
      if (highlightState.searchLinks.has(link.id)) return theme.link;
      return "rgba(255, 255, 255, 0.06)";
    }
    return theme.link;
  }

  function linkWidth(link, highlightState) {
    if (highlightState.selectedLinks.has(link.id)) return 2.4;
    if (highlightState.relatedLinks.has(link.id)) return 1.6;
    if (highlightState.isSearchActive && highlightState.searchLinks.has(link.id)) return 1.2;
    return 0.9;
  }

  function linkParticles(link, highlightState) {
    if (highlightState.selectedLinks.has(link.id)) return 4;
    return 0;
  }

  function linkEndpointId(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === "string") return endpoint;
    if (typeof endpoint === "object" && endpoint.id) return endpoint.id;
    return null;
  }


  function baseColorForType(type, theme) {
    if (type === "category") return "#ff3b3b";
    if (type === "tag") return "#3bd671";
    if (type === "post") return "#3b6bff";
    return theme.link;
  }

  function labelForType(type) {
    if (type === "category") return "Category";
    if (type === "tag") return "Tag";
    if (type === "post") return "Post";
    return "Node";
  }

  function nodeEmoji(type) {
    if (type === "category") return "🗂️";
    if (type === "tag") return "🏷️";
    if (type === "post") return "📝";
    return "●";
  }

  function makeNodeGlyph(node, theme) {
    if (typeof THREE === "undefined") return null;
    const group = new THREE.Group();
    const emojiSprite = makeEmojiSprite(node, theme);
    const labelSprite = makeLabelSprite(node, theme);
    if (emojiSprite) group.add(emojiSprite);
    if (labelSprite) group.add(labelSprite);
    if (node.type === "post") {
      const halo = makePrimaryHalo(theme);
      if (halo) {
        group.add(halo);
        node._haloSprite = halo;
      }
    }
    return group;
  }

  function makeEmojiSprite(node, theme) {
    if (typeof THREE === "undefined") return null;
    const fontSize = 90;
    const paddingX = 20;
    const paddingY = 20;
    const fontFamily = "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
    const label = nodeEmoji(node.type);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `600 ${fontSize}px ${fontFamily}`;
    const textWidth = Math.ceil(context.measureText(label).width);
    canvas.width = textWidth + paddingX * 2;
    canvas.height = fontSize + paddingY * 2;

    context.font = `600 ${fontSize}px ${fontFamily}`;
    context.fillStyle = "#ffffff";
    context.textBaseline = "middle";
    context.fillText(label, paddingX, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      color: new THREE.Color("#ffffff"),
    });

    const sprite = new THREE.Sprite(material);
    const scale = 0.1;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.position.y = 0;
    sprite.renderOrder = 998;
    node._emojiSprite = sprite;
    return sprite;
  }

  function makePrimaryHalo(theme) {
    if (typeof THREE === "undefined") return null;
    const size = 240;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = size;
    canvas.height = size;

    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      size / 8,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "rgba(78, 240, 255, 0.55)");
    gradient.addColorStop(1, "rgba(78, 240, 255, 0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      color: new THREE.Color(theme.accent),
    });

    const sprite = new THREE.Sprite(material);
    const scale = 0.12;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.position.y = 0;
    sprite.renderOrder = 997;
    sprite.visible = false;
    return sprite;
  }

  function updateLabels() {
    if (supportsThreeSprites) {
      updateLabelColors();
      updateLabelVisibility();
      updatePrimaryEffects();
      return;
    }
    scheduleLabelUpdate();
  }

  function updateLabelColors() {
    if (typeof THREE === "undefined") return;
    graphData.nodes.forEach((node) => {
      if (!node._labelSprite || !node._labelSprite.material) return;
      const color = nodeColor(node, highlight, palette);
      node._labelSprite.material.color = new THREE.Color(stripAlpha(color));
    });
  }

  function updatePrimaryEffects() {
    if (typeof THREE === "undefined") return;
    graphData.nodes.forEach((node) => {
      if (!node._haloSprite) return;
      node._haloSprite.visible = highlight.primaryNodeId === node.id;
    });
  }

  function updateLabelVisibility() {
    if (typeof THREE === "undefined") return;
    graphData.nodes.forEach((node) => {
      if (!node._labelSprite) return;
      node._labelSprite.visible = shouldShowLabel(node);
    });
  }

  function updateDomLabels() {
    if (!labelLayer || !labelNodes || !labelVector) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    const visibleIds = new Set();
    graphData.nodes.forEach((node) => {
      if (!shouldShowLabel(node)) return;
      const id = node.id;
      visibleIds.add(id);

      let el = labelNodes.get(id);
      if (!el) {
        el = document.createElement("div");
        el.className = `sv-map-label type-${node.type}`;
        el.textContent = formatNodeLabel(node);
        labelNodes.set(id, el);
        labelLayer.appendChild(el);
      } else if (el.textContent !== formatNodeLabel(node)) {
        el.textContent = formatNodeLabel(node);
      }

      const color = stripAlpha(nodeColor(node, highlight, palette));
      el.style.color = color;
      el.classList.toggle("is-primary", highlight.primaryNodeId === id);

      const x = node.x || 0;
      const y = node.y || 0;
      const z = node.z || 0;
      labelVector.set(x, y, z).project(Graph.camera());
      const screenX = (labelVector.x * 0.5 + 0.5) * width;
      const screenY = (-labelVector.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(-50%, -50%) translate(${screenX}px, ${screenY}px)`;
    });

    labelNodes.forEach((el, id) => {
      if (!visibleIds.has(id)) {
        el.remove();
        labelNodes.delete(id);
      }
    });
  }

  function shouldShowLabel(node) {
    return true;
  }

  function makeLabelSprite(node, theme) {
    if (typeof THREE === "undefined") return null;
    const fontSize = 48;
    const paddingX = 16;
    const paddingY = 10;
    const fontFamily = "Chakra Petch, Arial, sans-serif";
    const label = `${node.name} (${labelForType(node.type)})`;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `600 ${fontSize}px ${fontFamily}`;
    const textWidth = Math.ceil(context.measureText(label).width);
    canvas.width = textWidth + paddingX * 2;
    canvas.height = fontSize + paddingY * 2;

    context.font = `600 ${fontSize}px ${fontFamily}`;
    context.fillStyle = "#ffffff";
    context.textBaseline = "middle";
    context.fillText(label, paddingX, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      color: new THREE.Color(baseColorForType(node.type, theme)),
    });

    const sprite = new THREE.Sprite(material);
    const scale = 0.1;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.position.y = nodeValue(node, highlight) * 2.2;
    sprite.renderOrder = 999;
    sprite.visible = true;
    node._labelSprite = sprite;
    return sprite;
  }

  function applyDeterministicPositions(graphData) {
    graphData.nodes.forEach((node) => {
      if (node.x != null && node.y != null && node.z != null) return;
      const seed = Math.abs(hashString(node.id));
      const randA = seededRandom(seed);
      const randB = seededRandom(seed + 1);
      const randC = seededRandom(seed + 2);
      const baseRadius = node.type === "category" ? 240 : node.type === "tag" ? 200 : 160;
      const radius = baseRadius + randC * 30;
      const theta = randA * Math.PI * 2;
      const phi = Math.acos(2 * randB - 1);
      node.x = radius * Math.sin(phi) * Math.cos(theta);
      node.y = radius * Math.sin(phi) * Math.sin(theta);
      node.z = radius * Math.cos(phi);
    });
  }

  function hashString(value) {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) + hash + value.charCodeAt(i);
      hash &= 0xffffffff;
    }
    return hash;
  }

  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function findTagNodeForPost(tagKey, post) {
    if (!post) return null;
    const tagId = `tag:${tagKey}`;
    const node = graphData.nodesById.get(tagId);
    if (node) return node;
    const nodes = graphData.tagNodesByName.get(tagKey) || [];
    return nodes[0] || null;
  }

  function scheduleLabelUpdate() {
    if (!labelLayer) return;
    if (labelFrame) return;
    labelFrame = window.requestAnimationFrame(() => {
      labelFrame = null;
      updateDomLabels();
    });
  }

  function createLabelLayer() {
    const stage = container.closest(".sv-map-stage") || container.parentElement;
    if (!stage) return null;
    const layer = document.createElement("div");
    layer.className = "sv-map-labels";
    stage.appendChild(layer);
    return layer;
  }

  function formatNodeLabel(node) {
    return `${node.name} (${labelForType(node.type)})`;
  }

  function clearHighlightSets(nodes, relatedNodes, links, relatedLinks) {
    clearSet(nodes);
    clearSet(relatedNodes);
    clearSet(links);
    clearSet(relatedLinks);
  }

  function clearSet(set) {
    if (set && typeof set.clear === "function") {
      set.clear();
    }
  }

  function updateClearVisibility() {
    if (!clearButton || !searchInput) return;
    const hasValue = String(searchInput.value || "").trim().length > 0;
    clearButton.hidden = !hasValue;
  }

  function buildGraphTypeFilter(sourceGraph, filter) {
    const nodeIds = new Set();
    (sourceGraph.nodes || []).forEach((node) => {
      if (node.type === "category" && !filter.categories) return;
      if (node.type === "tag" && !filter.tags) return;
      if (node.type === "post" && !filter.posts) return;
      nodeIds.add(node.id);
    });

    const linkIds = new Set();
    (sourceGraph.links || []).forEach((link) => {
      const sourceId = linkEndpointId(link.source);
      const targetId = linkEndpointId(link.target);
      if (!sourceId || !targetId) return;
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return;
      linkIds.add(link.id);
    });

    if (!nodeIds.size) {
      return createEmptyGraphData(sourceGraph);
    }

    return buildGraphSlice(nodeIds, linkIds, sourceGraph);
  }

  function stripAlpha(color) {
    if (!color || typeof color !== "string") return color;
    const match = color.trim().match(/^rgba\(([^)]+)\)$/i);
    if (!match) return color;
    const parts = match[1].split(",").map((part) => part.trim());
    if (parts.length < 3) return color;
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
})();
