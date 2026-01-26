(() => {
  const dataEl = document.getElementById("softfield-data");
  if (!dataEl) return;

  let data;
  try {
    data = JSON.parse(dataEl.textContent);
  } catch (error) {
    return;
  }

  const stage = document.querySelector(".heatmap-stage");
  if (!stage) return;

  const canvas = stage.querySelector(".heatmap-canvas");
  const overlay = stage.querySelector(".heatmap-overlay") || stage;
  const focus = stage.querySelector(".heatmap-focus");
  const view = stage.dataset.view || "categories";
  const defaultCategorySlug = stage.dataset.defaultCategory || "";
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get("category");

  const ctx = canvas.getContext("2d");
  const fieldCanvas = document.createElement("canvas");
  const fieldCtx = fieldCanvas.getContext("2d", { willReadFrequently: true });

  const labelLayer = document.createElement("div");
  labelLayer.className = "metaball-labels";
  overlay.appendChild(labelLayer);

  const tooltip = document.createElement("div");
  tooltip.className = "metaball-tooltip";
  const tooltipTitle = document.createElement("div");
  tooltipTitle.className = "metaball-tooltip-title";
  const tooltipMeta = document.createElement("div");
  tooltipMeta.className = "metaball-tooltip-meta";
  tooltip.appendChild(tooltipTitle);
  tooltip.appendChild(tooltipMeta);
  overlay.appendChild(tooltip);

  const allPosts = normalizePosts(data.posts || []);
  const scene = buildScene(allPosts, view, requestedSlug, defaultCategorySlug);

  const state = {
    groups: scene.groups,
    groupMap: scene.groupMap,
    posts: scene.posts,
    activeCategory: scene.activeCategory,
    view,
    labels: [],
    hoveredPost: null,
    hoveredGroup: null,
    activeGroups: new Set(),
    viewTransform: { scale: 1, offsetX: 0, offsetY: 0 },
    layoutSize: { width: 0, height: 0 },
    fieldScale: 2,
    kernelSigma: 48,
    needsField: true,
    needsRender: true,
    rafId: null,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panOrigin: { x: 0, y: 0 },
    hasDragged: false,
  };

  const layoutSettings = {
    iterations: 8,
    step: 0.5,
    anchorPull: 0.18,
    selfAttract: 0.22,
    minSpacing: 12,
    passes: 1,
    padding: 18,
  };

  const fieldSettings = {
    threshold: 0.28,
    softness: 0.1,
    kernelExtent: 3.2,
    strength: 1,
    colorGain: 1.45,
    postBoost: 1.65,
    groupBoost: 1.35,
    groupDim: 0.6,
  };

  if (scene.activeCategory && view === "tags") {
    highlightCategoryLinks(slugify(scene.activeCategory));
  }

  syncLabels();
  handleResize();
  window.addEventListener("resize", debounce(handleResize, 150));
  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointermove", onPointerMove);
  overlay.addEventListener("pointerleave", () => clearHover(true));
  window.addEventListener("pointerup", onPointerUp);
  overlay.addEventListener("wheel", onWheel, { passive: false });
  overlay.addEventListener("click", onClick);

  function handleResize() {
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    state.layoutSize.width = rect.width;
    state.layoutSize.height = rect.height;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    state.fieldScale = chooseFieldScale(rect.width, rect.height);
    state.kernelSigma = chooseKernelSigma(rect.width, rect.height);
    state.viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    layoutScene();
    state.needsField = true;
    scheduleRender();
  }

  function layoutScene() {
    if (!state.groups.length || !state.posts.length) return;

    seedPosts();
    relaxPosts();
    updateGroupCenters();
    assignPostColors();
    syncLabels();
    updateLabelPositions();
  }

  function seedPosts() {
    const { width, height } = state.layoutSize;
    const center = { x: width * 0.5, y: height * 0.52 };
    const radius = Math.min(width, height) * 0.36;
    const golden = Math.PI * (3 - Math.sqrt(5));

    state.posts.forEach((post, index) => {
      const r = Math.sqrt((index + 0.5) / state.posts.length) * radius;
      const angle = index * golden;
      const jitter = (seededRandom(post.id) - 0.5) * radius * 0.12;
      const jitterY = (seededRandom(`${post.id}-y`) - 0.5) * radius * 0.12;
      post.seedX = center.x + Math.cos(angle) * r + jitter;
      post.seedY = center.y + Math.sin(angle) * r + jitterY;
      post.x = post.seedX;
      post.y = post.seedY;
    });
  }

  function relaxPosts() {
    const { width, height } = state.layoutSize;
    const padding = layoutSettings.padding;

    for (let iter = 0; iter < layoutSettings.iterations; iter += 1) {
      state.posts.forEach((post, index) => {
        const centroid = combinedFieldCentroid(post, index);
        const targetX = lerp(centroid.x, post.seedX, layoutSettings.anchorPull);
        const targetY = lerp(centroid.y, post.seedY, layoutSettings.anchorPull);
        post.x = lerp(post.x, targetX, layoutSettings.step);
        post.y = lerp(post.y, targetY, layoutSettings.step);
      });

      resolveOverlaps(state.posts, layoutSettings.minSpacing, layoutSettings.passes);
      clampPositions(state.posts, width, height, padding);
    }
  }

  function combinedFieldCentroid(post, postIndex) {
    const sigma2 = state.kernelSigma * state.kernelSigma;
    const invTwoSigma2 = 1 / (2 * sigma2);
    let sumX = 0;
    let sumY = 0;
    let sumW = 0;

    post.groups.forEach((groupName) => {
      const group = state.groupMap.get(groupName);
      if (!group) return;
      const categoryWeight = getMembershipWeight(post, groupName);

      group.sources.forEach((sourceIndex) => {
        const source = state.posts[sourceIndex];
        const dx = post.x - source.x;
        const dy = post.y - source.y;
        const dist2 = dx * dx + dy * dy;
        const influence = Math.exp(-dist2 * invTwoSigma2) * getMembershipWeight(source, groupName);
        const selfFactor = sourceIndex === postIndex ? layoutSettings.selfAttract : 1;
        const weight = influence * categoryWeight * selfFactor;
        sumX += source.x * weight;
        sumY += source.y * weight;
        sumW += weight;
      });
    });

    if (sumW === 0) {
      return { x: post.seedX, y: post.seedY };
    }

    return { x: sumX / sumW, y: sumY / sumW };
  }

  function updateGroupCenters() {
    state.groups.forEach((group) => {
      let sumX = 0;
      let sumY = 0;
      let sumW = 0;
      group.sources.forEach((index) => {
        const post = state.posts[index];
        const weight = getMembershipWeight(post, group.name);
        sumX += post.x * weight;
        sumY += post.y * weight;
        sumW += weight;
      });
      if (sumW === 0) {
        group.x = state.layoutSize.width * 0.5;
        group.y = state.layoutSize.height * 0.5;
      } else {
        group.x = sumX / sumW;
        group.y = sumY / sumW;
      }
    });
  }

  function assignPostColors() {
    state.posts.forEach((post) => {
      post.color = mixGroupColors(post.groups, post.groupWeights, state.groupMap);
    });
  }

  function render() {
    if (!state.needsRender) return;

    if (state.needsField) {
      buildFieldTexture();
      state.needsField = false;
    }

    const { width, height } = state.layoutSize;
    const ratio = window.devicePixelRatio || 1;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(state.viewTransform.offsetX, state.viewTransform.offsetY);
    ctx.scale(state.viewTransform.scale, state.viewTransform.scale);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      fieldCanvas,
      0,
      0,
      fieldCanvas.width,
      fieldCanvas.height,
      0,
      0,
      width,
      height
    );

    drawPosts();
    ctx.restore();

    updateLabelPositions();
    updateStatus();

    state.needsRender = false;
    state.rafId = null;
  }

  function buildFieldTexture() {
    const { width, height } = state.layoutSize;
    const scale = state.fieldScale;
    const fieldWidth = Math.ceil(width / scale);
    const fieldHeight = Math.ceil(height / scale);
    fieldCanvas.width = fieldWidth;
    fieldCanvas.height = fieldHeight;

    const fieldSize = fieldWidth * fieldHeight;
    const fieldTotal = new Float32Array(fieldSize);
    const fieldR = new Float32Array(fieldSize);
    const fieldG = new Float32Array(fieldSize);
    const fieldB = new Float32Array(fieldSize);

    const sigma2 = state.kernelSigma * state.kernelSigma;
    const invTwoSigma2 = 1 / (2 * sigma2);
    const radius = state.kernelSigma * fieldSettings.kernelExtent;
    const radius2 = radius * radius;
    const radiusGrid = Math.ceil(radius / scale);
    const active = state.activeGroups.size > 0;

    state.posts.forEach((post) => {
      const postBoost = state.hoveredPost && state.hoveredPost.id === post.id ? fieldSettings.postBoost : 1;

      post.groups.forEach((groupName) => {
        const group = state.groupMap.get(groupName);
        if (!group) return;
        const groupBoost = active
          ? state.activeGroups.has(groupName)
            ? fieldSettings.groupBoost
            : fieldSettings.groupDim
          : 1;
        const weight = getMembershipWeight(post, groupName) * postBoost * groupBoost;
        if (weight <= 0) return;

        const centerX = post.x / scale;
        const centerY = post.y / scale;
        const minX = clamp(Math.floor(centerX - radiusGrid), 0, fieldWidth - 1);
        const maxX = clamp(Math.ceil(centerX + radiusGrid), 0, fieldWidth - 1);
        const minY = clamp(Math.floor(centerY - radiusGrid), 0, fieldHeight - 1);
        const maxY = clamp(Math.ceil(centerY + radiusGrid), 0, fieldHeight - 1);
        const color = group.color;

        for (let y = minY; y <= maxY; y += 1) {
          const worldY = (y + 0.5) * scale;
          const dy = worldY - post.y;
          for (let x = minX; x <= maxX; x += 1) {
            const worldX = (x + 0.5) * scale;
            const dx = worldX - post.x;
            const dist2 = dx * dx + dy * dy;
            if (dist2 > radius2) continue;

            const influence = Math.exp(-dist2 * invTwoSigma2) * weight * fieldSettings.strength;
            const idx = y * fieldWidth + x;
            fieldTotal[idx] += influence;
            fieldR[idx] += influence * (color.r / 255);
            fieldG[idx] += influence * (color.g / 255);
            fieldB[idx] += influence * (color.b / 255);
          }
        }
      });
    });

    const image = fieldCtx.createImageData(fieldWidth, fieldHeight);
    const data = image.data;
    const threshold = fieldSettings.threshold;
    const softness = fieldSettings.softness;
    const colorGain = fieldSettings.colorGain;

    for (let i = 0; i < fieldSize; i += 1) {
      const total = fieldTotal[i];
      const alpha = smoothstep(threshold - softness, threshold + softness, total);
      const outIndex = i * 4;

      if (alpha <= 0) {
        data[outIndex] = 255;
        data[outIndex + 1] = 255;
        data[outIndex + 2] = 255;
        data[outIndex + 3] = 255;
        continue;
      }

      const r = 1 - Math.exp(-fieldR[i] * colorGain);
      const g = 1 - Math.exp(-fieldG[i] * colorGain);
      const b = 1 - Math.exp(-fieldB[i] * colorGain);

      data[outIndex] = clamp(Math.round(255 * (1 - alpha) + 255 * r * alpha), 0, 255);
      data[outIndex + 1] = clamp(Math.round(255 * (1 - alpha) + 255 * g * alpha), 0, 255);
      data[outIndex + 2] = clamp(Math.round(255 * (1 - alpha) + 255 * b * alpha), 0, 255);
      data[outIndex + 3] = 255;
    }

    fieldCtx.putImageData(image, 0, 0);
  }

  function drawPosts() {
    const highlight = state.activeGroups.size > 0;
    const radius = 3.6;

    state.posts.forEach((post) => {
      const isActive = !highlight || hasIntersection(post.groups, state.activeGroups);
      const isHover = state.hoveredPost && state.hoveredPost.id === post.id;
      const alpha = isHover ? 1 : isActive ? 0.85 : 0.18;
      const size = isHover ? radius * 1.7 : radius;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${post.color.r}, ${post.color.g}, ${post.color.b})`;
      ctx.beginPath();
      ctx.arc(post.x, post.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isHover ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = isHover ? 1.4 : 0.8;
      ctx.stroke();
      ctx.restore();
    });
  }

  function updateLabelPositions() {
    if (!state.labels.length) return;
    const { scale, offsetX, offsetY } = state.viewTransform;

    state.labels.forEach(({ element, group }) => {
      const screenX = group.x * scale + offsetX;
      const screenY = group.y * scale + offsetY;
      element.style.left = `${screenX}px`;
      element.style.top = `${screenY}px`;
      element.style.setProperty("--field-hue", group.hue);
    });
  }

  function syncLabels() {
    labelLayer.innerHTML = "";
    state.labels = state.groups.map((group) => {
      const label = document.createElement("div");
      label.className = "metaball-label";
      label.style.setProperty("--field-hue", group.hue);
      label.setAttribute("data-group", group.name);
      label.setAttribute("role", "note");
      label.tabIndex = 0;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = group.name;
      label.appendChild(nameSpan);

      label.addEventListener("mouseenter", () => setHoveredGroup(group));
      label.addEventListener("focus", () => setHoveredGroup(group));
      label.addEventListener("mouseleave", () => setHoveredGroup(null));
      label.addEventListener("blur", () => setHoveredGroup(null));
      labelLayer.appendChild(label);

      return { element: label, group };
    });

    updateLabelStates();
  }

  function updateLabelStates() {
    const active = state.activeGroups.size > 0;
    state.labels.forEach(({ element, group }) => {
      if (!active) {
        element.classList.remove("is-active", "is-dim");
        return;
      }
      if (state.activeGroups.has(group.name)) {
        element.classList.add("is-active");
        element.classList.remove("is-dim");
      } else {
        element.classList.remove("is-active");
        element.classList.add("is-dim");
      }
    });
  }

  function setHoveredGroup(group) {
    state.hoveredGroup = group;
    state.needsField = true;
    updateActiveGroups();
  }

  function updateActiveGroups() {
    let next = new Set();
    if (state.hoveredPost) {
      next = new Set(state.hoveredPost.groups);
    } else if (state.hoveredGroup) {
      next = new Set([state.hoveredGroup.name]);
    }

    if (!setsEqual(next, state.activeGroups)) {
      state.activeGroups = next;
      state.needsField = true;
      updateLabelStates();
      scheduleRender();
    }
  }

  function updateStatus() {
    if (!focus) return;
    if (state.hoveredPost) {
      focus.textContent = `${state.hoveredPost.title}`;
      return;
    }
    if (state.hoveredGroup) {
      focus.textContent = `${state.hoveredGroup.name} | ${state.hoveredGroup.count} posts`;
      return;
    }
    if (state.activeCategory && state.view === "tags") {
      focus.textContent = `${state.activeCategory} | ${state.posts.length} posts`;
      return;
    }
    focus.textContent = "Drag to pan | Scroll to zoom | Hover nodes to inspect";
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    state.isPanning = true;
    state.panStart = getPointer(event);
    state.panOrigin = { ...state.viewTransform };
    state.hasDragged = false;
    stage.classList.add("is-panning");
    overlay.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const point = getPointer(event);
    if (state.isPanning) {
      const dx = point.x - state.panStart.x;
      const dy = point.y - state.panStart.y;
      if (Math.hypot(dx, dy) > 6) {
        state.hasDragged = true;
      }
      state.viewTransform.offsetX = state.panOrigin.offsetX + dx;
      state.viewTransform.offsetY = state.panOrigin.offsetY + dy;
      state.needsRender = true;
      scheduleRender();
      return;
    }

    const world = toWorld(point);
    const hover = findHoveredPost(world);
    if (hover && (!state.hoveredPost || state.hoveredPost.id !== hover.id)) {
      state.hoveredPost = hover;
      state.needsField = true;
      showTooltip(hover, point);
      updateActiveGroups();
      scheduleRender();
      return;
    }

    if (!hover && state.hoveredPost) {
      clearHover(false);
      return;
    }

    if (state.hoveredPost) {
      showTooltip(state.hoveredPost, point);
      return;
    }

    const group = findHoveredGroup(world);
    if ((group && (!state.hoveredGroup || state.hoveredGroup.name !== group.name)) || (!group && state.hoveredGroup)) {
      state.hoveredGroup = group;
      state.needsField = true;
      updateActiveGroups();
      scheduleRender();
    }
  }

  function onPointerUp(event) {
    if (!state.isPanning) return;
    state.isPanning = false;
    stage.classList.remove("is-panning");
    overlay.releasePointerCapture(event.pointerId);
  }

  function onWheel(event) {
    event.preventDefault();
    const point = getPointer(event);
    const world = toWorld(point);
    const zoom = Math.exp(-event.deltaY * 0.0016);
    const nextScale = clamp(state.viewTransform.scale * zoom, 0.6, 2.6);

    state.viewTransform.scale = nextScale;
    state.viewTransform.offsetX = point.x - world.x * nextScale;
    state.viewTransform.offsetY = point.y - world.y * nextScale;
    state.needsRender = true;
    scheduleRender();
  }

  function onClick() {
    if (state.isPanning || state.hasDragged) return;
    if (state.hoveredPost) {
      window.location.href = state.hoveredPost.relPermalink;
    }
  }

  function findHoveredPost(world) {
    const radius = 9 / state.viewTransform.scale;
    let closest = null;
    let closestDist = radius * radius;
    for (const post of state.posts) {
      const dx = world.x - post.x;
      const dy = world.y - post.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= closestDist) {
        closest = post;
        closestDist = dist2;
      }
    }
    return closest;
  }

  function showTooltip(post, point) {
    tooltipTitle.textContent = post.title;
    const categoryLine = formatWeightList(post.categories, post.categoryWeights);
    if (state.view === "tags") {
      tooltipMeta.textContent = `Categories: ${categoryLine} | Tags: ${post.tags.join(", ")}`;
    } else {
      tooltipMeta.textContent = `Categories: ${categoryLine}`;
    }
    tooltip.classList.add("is-visible");

    const { width, height } = state.layoutSize;
    const padding = 18;
    const tooltipRect = tooltip.getBoundingClientRect();
    const x = clamp(point.x + 16, padding, width - tooltipRect.width - padding);
    const y = clamp(point.y + 16, padding, height - tooltipRect.height - padding);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function clearHover(resetAll) {
    if (!state.hoveredPost && !resetAll) return;
    state.hoveredPost = null;
    if (resetAll) {
      state.hoveredGroup = null;
    }
    tooltip.classList.remove("is-visible");
    state.needsField = true;
    updateActiveGroups();
    scheduleRender();
  }

  function findHoveredGroup(world) {
    if (!state.groups.length) return null;
    const sample = sampleFieldAtPoint(world.x, world.y);
    const cutoff = fieldSettings.threshold * 0.6;
    if (sample.total < cutoff) return null;

    let best = null;
    let bestValue = 0;
    state.groups.forEach((group) => {
      const value = sample.byGroup.get(group.name) || 0;
      if (value > bestValue) {
        bestValue = value;
        best = group;
      }
    });

    return best;
  }

  function sampleFieldAtPoint(x, y) {
    const sigma2 = state.kernelSigma * state.kernelSigma;
    const invTwoSigma2 = 1 / (2 * sigma2);
    let total = 0;
    const byGroup = new Map();

    state.groups.forEach((group) => {
      let value = 0;
      group.sources.forEach((sourceIndex) => {
        const source = state.posts[sourceIndex];
        const dx = x - source.x;
        const dy = y - source.y;
        const dist2 = dx * dx + dy * dy;
        value += Math.exp(-dist2 * invTwoSigma2) * getMembershipWeight(source, group.name);
      });
      byGroup.set(group.name, value);
      total += value;
    });

    return { total, byGroup };
  }

  function scheduleRender() {
    state.needsRender = true;
    if (state.rafId) return;
    state.rafId = window.requestAnimationFrame(render);
  }

  function getPointer(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function toWorld(point) {
    const { scale, offsetX, offsetY } = state.viewTransform;
    return {
      x: (point.x - offsetX) / scale,
      y: (point.y - offsetY) / scale,
    };
  }

  function buildScene(posts, mode, requested, defaultSlug) {
    let activeCategory = null;
    let workingPosts = posts;
    let groupKey = "categories";

    if (mode === "tags") {
      const categories = uniqueList(posts.flatMap((post) => post.categories));
      const targetSlug = requested || defaultSlug || (categories[0] ? slugify(categories[0]) : "");
      activeCategory = categories.find((name) => slugify(name) === targetSlug) || categories[0] || null;
      if (activeCategory) {
        workingPosts = posts.filter((post) => post.categories.includes(activeCategory));
      }
      groupKey = "tags";
    }

    const groups = buildGroups(workingPosts, groupKey);
    const mappedPosts = workingPosts.map((post) => ({
      ...post,
      groups: post[groupKey],
      groupWeights: groupKey === "categories" ? post.categoryWeights : {},
    }));
    const groupMap = attachGroupSources(mappedPosts, groups);

    return { groups, posts: mappedPosts, groupMap, activeCategory };
  }

  function buildGroups(posts, key) {
    const map = new Map();
    posts.forEach((post) => {
      post[key].forEach((name) => {
        const existing = map.get(name) || {
          name,
          slug: slugify(name),
          count: 0,
          hue: hueFromString(name),
          color: hslToRgb(hueFromString(name), 78, 58),
          sources: [],
          x: 0,
          y: 0,
        };
        existing.count += 1;
        map.set(name, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function attachGroupSources(posts, groups) {
    const groupMap = new Map();
    groups.forEach((group, index) => {
      group.index = index;
      group.sources = [];
      groupMap.set(group.name, group);
    });

    posts.forEach((post, index) => {
      post.groups.forEach((name) => {
        const group = groupMap.get(name);
        if (group) group.sources.push(index);
      });
    });

    return groupMap;
  }

  function normalizePosts(posts) {
    return posts.map((post, index) => {
      const categories = normalizeList(post.categories, "Unclassified");
      const tags = normalizeList(post.tags, "Untagged");
      return {
        id: post.slug || post.relPermalink || String(index),
        slug: post.slug || "",
        title: post.title || "Untitled",
        relPermalink: post.relPermalink || post.slug || "#",
        categories,
        tags,
        categoryWeights: normalizeWeights(post.categoryWeights || post.category_weights),
        date: post.date || "",
      };
    });
  }

  function normalizeWeights(weights) {
    if (!weights || typeof weights !== "object") return {};
    return Object.fromEntries(
      Object.entries(weights).map(([key, value]) => [key, Number(value) || 1])
    );
  }

  function getMembershipWeight(post, name) {
    if (!post.groupWeights) return 1;
    return post.groupWeights[name] || post.groupWeights[slugify(name)] || 1;
  }

  function mixGroupColors(names, weights, groupMap) {
    let r = 0;
    let g = 0;
    let b = 0;
    let total = 0;
    names.forEach((name) => {
      const group = groupMap.get(name);
      if (!group) return;
      const weight = weights && (weights[name] || weights[slugify(name)]) ? weights[name] || weights[slugify(name)] : 1;
      r += group.color.r * weight;
      g += group.color.g * weight;
      b += group.color.b * weight;
      total += weight;
    });
    if (!total) return { r: 200, g: 200, b: 200 };
    return {
      r: Math.round(r / total),
      g: Math.round(g / total),
      b: Math.round(b / total),
    };
  }

  function formatWeightList(names, weights) {
    if (!weights || Object.keys(weights).length === 0) {
      return names.join(", ");
    }
    return names
      .map((name) => {
        const weight = weights[name] || weights[slugify(name)] || 1;
        if (Math.abs(weight - 1) < 0.01) return name;
        return `${name} (${weight.toFixed(2)})`;
      })
      .join(", ");
  }

  function chooseFieldScale(width, height) {
    const pixels = width * height;
    if (pixels > 900000) return 2.6;
    if (pixels > 520000) return 1.9;
    return 1.5;
  }

  function chooseKernelSigma(width, height) {
    const base = Math.min(width, height);
    return clamp(base * 0.085, 28, 90);
  }

  function highlightCategoryLinks(activeSlug) {
    const links = document.querySelectorAll("[data-category-link]");
    links.forEach((link) => {
      if (link.dataset.categoryLink === activeSlug) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });
  }

  function uniqueList(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function normalizeList(list, fallback) {
    if (typeof list === "string") {
      list = [list];
    }
    if (!Array.isArray(list) || list.length === 0) {
      return [fallback];
    }
    const normalized = list
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return normalized.length ? normalized : [fallback];
  }

  function hasIntersection(names, set) {
    return names.some((name) => set.has(name));
  }

  function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }

  function hslToRgb(h, s, l) {
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function hueFromString(text) {
    const hash = hashString(text);
    return (Math.abs(hash) % 300) + 30;
  }

  function hashString(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  function seededRandom(text) {
    const seed = hashString(String(text));
    let t = (seed + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function resolveOverlaps(points, minDistance, passes) {
    const minDist2 = minDistance * minDistance;
    for (let pass = 0; pass < passes; pass += 1) {
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const a = points[i];
          const b = points[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 === 0 || dist2 > minDist2) continue;
          const dist = Math.sqrt(dist2);
          const push = (minDistance - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  function clampPositions(points, width, height, padding) {
    points.forEach((point) => {
      point.x = clamp(point.x, padding, width - padding);
      point.y = clamp(point.y, padding, height - padding);
    });
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function debounce(fn, wait) {
    let timeout;
    return (...args) => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => fn(...args), wait);
    };
  }
})();
