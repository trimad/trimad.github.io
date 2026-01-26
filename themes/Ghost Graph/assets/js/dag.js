(() => {
  const dataEl = document.getElementById("dag-data");
  const container = document.getElementById("dag");
  if (!dataEl || !container) {
    return;
  }

  const emptyState = container.querySelector(".dag-empty");
  const FALLBACK_CATEGORY = "Uncategorized";
  const FALLBACK_TAG = "Untagged";
  const palette = getPalette();

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

  const indexedPosts = posts.map((post) => ({
    ...post,
    _search: buildSearchText(post),
  }));
  const taxonomies = data.taxonomies || {};
  const fullGraph = buildGraphData(indexedPosts, taxonomies);
  let graph = fullGraph;

  const highlight = {
    selectedNodes: new Set(),
    relatedNodes: new Set(),
    selectedLinks: new Set(),
    relatedLinks: new Set(),
  };

  const Graph = ForceGraph3D()(container)
    .backgroundColor("rgba(0,0,0,0)")
    .graphData({ nodes: graph.nodes, links: graph.links })
    .nodeLabel((node) => node.name)
    .nodeColor((node) => nodeColor(node, highlight, palette))
    .nodeVal((node) => nodeValue(node))
    .nodeThreeObject((node) => makeNodeGlyph(node, palette))
    .nodeThreeObjectExtend(false)
    .linkColor((link) => linkColor(link, highlight, palette))
    .linkWidth((link) => linkWidth(link, highlight))
    .linkOpacity(0.55)
    .linkDirectionalParticles((link) => linkParticles(link, highlight))
    .linkDirectionalParticleWidth(1.4)
    .linkDirectionalParticleSpeed(0.007)
    .onNodeClick((node, event) => {
      if (node && node.type === "post" && node.href) {
        window.location.href = node.href;
        return;
      }
      if (event && (event.metaKey || event.ctrlKey) && node.href) {
        window.location.href = node.href;
        return;
      }
      setFocus({ kind: "node", node });
    })
    .onLinkClick((link, event) => {
      if (event && (event.metaKey || event.ctrlKey) && link.href) {
        window.location.href = link.href;
        return;
      }
      setFocus({ kind: "link", link });
    });

  if (typeof Graph.onBackgroundClick === "function") {
    Graph.onBackgroundClick(() => setFocus(null));
  }

  Graph.d3Force("charge").strength(-160);
  Graph.d3Force("link").distance((link) => (link.type === "cat-tag" ? 160 : 110));

  const resizeGraph = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width && height) {
      Graph.width(width);
      Graph.height(height);
    }
  };

  resizeGraph();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => resizeGraph());
    observer.observe(container);
  } else {
    window.addEventListener("resize", resizeGraph);
  }

  let fitted = false;
  Graph.onEngineStop(() => {
    container.classList.add("is-ready");
    if (!fitted) {
      fitted = true;
      Graph.zoomToFit(700, 60);
    }
  });

  let currentSelection = null;
  const focusKind = container.dataset.focusKind;
  const focusValue = container.dataset.focusValue;
  if (focusKind && focusValue) {
    currentSelection = selectionFromFocus(graph, focusKind, focusValue);
  }
  applyFocus();

  const searchInput = document.getElementById("dag-search");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const value = String(event.target.value || "").trim().toLowerCase();
      const filteredPosts = value
        ? indexedPosts.filter((post) => post._search.includes(value))
        : indexedPosts;
      updateGraph(filteredPosts, value);
    });
  }

  function setFocus(selection) {
    currentSelection = selection;
    applyFocus();
  }

  function applyFocus() {
    highlight.selectedNodes.clear();
    highlight.relatedNodes.clear();
    highlight.selectedLinks.clear();
    highlight.relatedLinks.clear();

    if (!currentSelection) {
      updateLabelColors();
      Graph.refresh();
      return;
    }

    const related = getRelatedPosts(currentSelection, graph);
    const {
      selectedNodeIds,
      relatedNodeIds,
      selectedLinkIds,
      relatedLinkIds,
    } = getRelatedIds(currentSelection, graph);

    selectedNodeIds.forEach((id) => highlight.selectedNodes.add(id));
    relatedNodeIds.forEach((id) => highlight.relatedNodes.add(id));
    selectedLinkIds.forEach((id) => highlight.selectedLinks.add(id));
    relatedLinkIds.forEach((id) => highlight.relatedLinks.add(id));

    updateLabelColors();
    Graph.refresh();

    if (currentSelection.kind === "node") {
      focusCamera(currentSelection.node);
    }
  }

  function updateGraph(nextPosts, query) {
    graph = buildGraphData(nextPosts, taxonomies);
    Graph.graphData({ nodes: graph.nodes, links: graph.links });
    normalizeSelection();
    applyFocus();
    if (!nextPosts.length) {
      container.classList.add("is-empty");
      if (emptyState) {
        emptyState.textContent = query
          ? "No posts match this search."
          : "Add posts with categories and tags to grow the map.";
      }
    } else {
      container.classList.remove("is-empty");
      if (emptyState) {
        emptyState.textContent = "Add posts with categories and tags to grow the map.";
      }
    }
    Graph.zoomToFit(600, 60);
  }

  function normalizeSelection() {
    if (!currentSelection) return;
    if (currentSelection.kind === "node") {
      const id = currentSelection.node?.id;
      if (id && graph.nodesById.has(id)) {
        currentSelection.node = graph.nodesById.get(id);
      } else {
        currentSelection = null;
      }
      return;
    }
    if (currentSelection.kind === "link") {
      const id = currentSelection.link?.id;
      if (id && graph.linksById.has(id)) {
        currentSelection.link = graph.linksById.get(id);
      } else {
        currentSelection = null;
      }
      return;
    }
    if (currentSelection.kind === "tag-group") {
      const key = currentSelection.key;
      if (!key || !graph.tagNodesByName.has(key)) {
        currentSelection = null;
      }
    }
  }

  function focusCamera(node) {
    if (!node || node.x == null) return;
    const distance = 140;
    const dist = Math.hypot(node.x, node.y, node.z || 0);
    const ratio = dist > 0 ? 1 + distance / dist : 1.2;
    Graph.cameraPosition(
      { x: node.x * ratio, y: node.y * ratio, z: (node.z || 0) * ratio },
      node,
      900
    );
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

    categoryKeys.forEach((categoryKey) => {
      const categoryPosts = postsByCategory.get(categoryKey) || [];
      const tagDisplay = new Map();
      categoryPosts.forEach((post) => {
        post.tags.forEach((tag) => {
          const key = normalizeKey(tag);
          if (!tagDisplay.has(key)) {
            tagDisplay.set(key, tag);
          }
          if (!tagDisplayByKey.has(key)) {
            tagDisplayByKey.set(key, tag);
          }
        });
      });

      const tagKeys = Array.from(tagDisplay.keys()).sort((a, b) => {
        return tagDisplay.get(a).localeCompare(tagDisplay.get(b));
      });

      tagKeys.forEach((tagKey) => {
        const node = {
          id: `tag:${categoryKey}::${tagKey}`,
          key: tagKey,
          type: "tag",
          name: tagDisplay.get(tagKey),
          categoryKey,
          categoryName: categoryDisplayByKey.get(categoryKey),
          level: 1,
          href: taxonomyLinks.tags[tagKey],
        };
        tagNodes.push(node);
        pushToMap(tagNodesByCategory, categoryKey, node);
        pushToMap(tagNodesByName, tagKey, node);
      });
    });

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
      const tags = tagNodesByCategory.get(categoryNode.key) || [];
      tags.forEach((tagNode) => {
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
          const tagId = `tag:${categoryKey}::${tagKey}`;
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
      pushToMap(linksByNode, link.source, link);
      pushToMap(linksByNode, link.target, link);
      linksById.set(link.id, link);
    });

    return {
      posts: postsInput,
      nodes,
      links,
      nodesById,
      categoryNodes,
      categoryNodesByKey,
      tagNodesByCategory,
      tagNodesByName,
      tagDisplayByKey,
      postNodes,
      postsByCategory,
      postsByTag,
      postsByCategoryTag,
      linksByNode,
      linksById,
      taxonomyLinks,
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
      return { kind: "tag-group", key, name };
    }
    return null;
  }

  function getRelatedPosts(selection, graphData) {
    if (selection.kind === "node") {
      const node = selection.node;
      if (node.type === "category") {
        return uniquePosts(graphData.postsByCategory.get(node.key) || []);
      }
      if (node.type === "tag") {
        return uniquePosts(
          graphData.postsByCategoryTag.get(`${node.categoryKey}::${node.key}`) || []
        );
      }
      if (node.type === "post") {
        return relatedToPost(node.post, graphData);
      }
    }

    if (selection.kind === "link") {
      const link = selection.link;
      if (link.type === "cat-tag") {
        return uniquePosts(
          graphData.postsByCategoryTag.get(`${link.categoryKey}::${link.tagKey}`) || []
        );
      }
      if (link.type === "tag-post") {
        const related =
          graphData.postsByCategoryTag.get(`${link.categoryKey}::${link.tagKey}`) || [];
        return uniquePosts(related);
      }
    }

    if (selection.kind === "tag-group") {
      return uniquePosts(graphData.postsByTag.get(selection.key) || []);
    }

    return [];
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

  function relatedToPost(post, graphData) {
    const related = new Set();
    post.categoryKeys.forEach((categoryKey) => {
      const postsForCategory = graphData.postsByCategory.get(categoryKey) || [];
      postsForCategory.forEach((item) => related.add(item));
    });
    post.tagKeys.forEach((tagKey) => {
      const postsForTag = graphData.postsByTag.get(tagKey) || [];
      postsForTag.forEach((item) => related.add(item));
    });
    related.delete(post);
    return uniquePosts(Array.from(related));
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

  function uniquePosts(postsInput) {
    const seen = new Set();
    return postsInput.filter((post) => {
      const key = post.relPermalink || post.permalink || post.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
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
      ...(post.rawCategories || []),
      ...(post.rawTags || []),
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
      post: "#7fb2ff",
    };
  }

  function nodeValue(node) {
    if (node.type === "category") return 12;
    if (node.type === "tag") return 7;
    return 4;
  }

  function nodeColor(node, highlightState, theme) {
    if (highlightState.selectedNodes.has(node.id)) return theme.text;
    if (highlightState.relatedNodes.has(node.id)) return theme.muted;
    return baseColorForType(node.type, theme);
  }

  function linkColor() {
    return "rgba(255, 255, 255, 0.35)";
  }

  function linkWidth(link, highlightState) {
    if (highlightState.selectedLinks.has(link.id)) return 2.4;
    if (highlightState.relatedLinks.has(link.id)) return 1.8;
    return 1;
  }

  function linkParticles(link, highlightState) {
    if (highlightState.selectedLinks.has(link.id)) return 6;
    if (highlightState.relatedLinks.has(link.id)) return 2;
    return 0;
  }

  function linkEndpointId(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === "string") return endpoint;
    if (typeof endpoint === "object" && endpoint.id) return endpoint.id;
    return null;
  }

  function linkSourceType(link) {
    if (link.source && typeof link.source === "object" && link.source.type) {
      return link.source.type;
    }
    const sourceId = linkEndpointId(link.source);
    if (!sourceId) return null;
    if (sourceId.startsWith("cat:")) return "category";
    if (sourceId.startsWith("tag:")) return "tag";
    if (sourceId.startsWith("post:")) return "post";
    return null;
  }

  function baseColorForType(type, theme) {
    if (type === "category") return "#ff3b3b";
    if (type === "tag") return "#3bd671";
    if (type === "post") return "#3b6bff";
    return theme.link;
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

  function updateLabelColors() {
    if (typeof THREE === "undefined") return;
    graph.nodes.forEach((node) => {
      if (!node._labelSprite || !node._labelSprite.material) return;
      const color = nodeColor(node, highlight, palette);
      node._labelSprite.material.color = new THREE.Color(color);
    });
  }

  function makeLabelSprite(node, theme) {
    if (typeof THREE === "undefined") return null;
    const fontSize = 48;
    const paddingX = 16;
    const paddingY = 10;
    const fontFamily = "Chakra Petch, Arial, sans-serif";
    const label = String(node.name || "");

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
    sprite.position.y = nodeValue(node) * 2.2;
    sprite.renderOrder = 999;
    node._labelSprite = sprite;
    return sprite;
  }
})();
