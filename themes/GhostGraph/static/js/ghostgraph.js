/* GhostGraph - Voronoi Weave (categories + tags + posts)
   Requires:
   - <canvas id="gg-canvas"></canvas>
   - <script type="application/json" id="gg-data">{"nodes":[...]}</script>
   - optional <input id="gg-search" />
*/
(function () {
  "use strict";

  const canvas = document.getElementById("gg-canvas");
  const dataEl = document.getElementById("gg-data");
  const searchEl = document.getElementById("gg-search");
  if (!canvas || !dataEl) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const palette = [
    { h: 178, s: 82, l: 52 }, // teal
    { h: 138, s: 82, l: 52 }, // green
    { h: 312, s: 82, l: 58 }, // magenta
    { h: 198, s: 82, l: 60 }, // cyan
    { h: 36, s: 90, l: 58 },  // amber
    { h: 220, s: 75, l: 60 }, // blue
  ];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function hsla(h, s, l, a) {
    return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")";
  }

  function hash32(str) {
    str = String(str || "");
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967295;
    };
  }

  function cleanString(s) {
    return String(s || "").replace(/[\[\]'"]/g, "").trim();
  }

  function keyify(s) {
    return cleanString(s).toLowerCase();
  }

  function normalizeList(v) {
    if (Array.isArray(v)) return v.map(cleanString).filter(Boolean);
    if (typeof v === "string") return v.split(",").map(cleanString).filter(Boolean);
    return [];
  }

  function tokenize(str) {
    return String(str || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t && t.length >= 2);
  }

  function truncateLabel(text, max) {
    const clean = String(text || "").replace(/["']/g, "").trim();
    if (clean.length <= max) return clean;
    const cut = Math.max(1, max - 3);
    return clean.slice(0, cut).trimEnd() + "...";
  }

  function categoryColors(key) {
    const p = palette[hash32("cat|" + key) % palette.length];
    return {
      fill: hsla(p.h, p.s, 26, 0.2),
      fillStrong: hsla(p.h, p.s, 32, 0.3),
      edge: hsla(p.h, p.s, 64, 0.5),
      edgeStrong: hsla(p.h, p.s, 70, 0.9),
      glow: hsla(p.h, p.s, 64, 0.22),
      label: hsla(p.h, p.s, 82, 0.95),
      post: hsla(p.h, p.s, 64, 1),
    };
  }

  function tagColors(key) {
    const p = palette[hash32("tag|" + key) % palette.length];
    return {
      link: hsla(p.h, p.s, 62, 0.36),
      halo: hsla(p.h, p.s, 62, 0.14),
      edge: hsla(p.h, p.s, 70, 0.6),
      node: hsla(p.h, p.s, 68, 0.85),
      label: hsla(p.h, p.s, 82, 0.9),
      fill: hsla(p.h, p.s, 24, 0.18),
      fillStrong: hsla(p.h, p.s, 30, 0.28),
      edgeStrong: hsla(p.h, p.s, 76, 0.85),
      glow: hsla(p.h, p.s, 64, 0.22),
      post: hsla(p.h, p.s, 68, 1),
    };
  }

  function polygonArea(poly) {
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      area += a.x * b.y - b.x * a.y;
    }
    return area * 0.5;
  }

  function polygonCentroid(poly) {
    if (!poly.length) return null;
    let cx = 0;
    let cy = 0;
    const area = polygonArea(poly);
    if (!area) {
      const avg = poly.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 }
      );
      return { x: avg.x / poly.length, y: avg.y / poly.length };
    }
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const cross = a.x * b.y - b.x * a.y;
      cx += (a.x + b.x) * cross;
      cy += (a.y + b.y) * cross;
    }
    const scale = 1 / (6 * area);
    return { x: cx * scale, y: cy * scale };
  }

  function rectsIntersect(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function circleIntersectsRect(cx, cy, r, rect) {
    const nearestX = clamp(cx, rect.x, rect.x + rect.w);
    const nearestY = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= r * r;
  }

  function expandRect(rect, pad) {
    return {
      x: rect.x - pad,
      y: rect.y - pad,
      w: rect.w + pad * 2,
      h: rect.h + pad * 2,
    };
  }

  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function clipPolygon(poly, nx, ny, c) {
    if (!poly.length) return [];
    const clipped = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const da = a.x * nx + a.y * ny - c;
      const db = b.x * nx + b.y * ny - c;
      const aIn = da <= 0;
      const bIn = db <= 0;
      if (aIn && bIn) {
        clipped.push(b);
      } else if (aIn && !bIn) {
        const t = da / (da - db);
        clipped.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        });
      } else if (!aIn && bIn) {
        const t = da / (da - db);
        clipped.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        });
        clipped.push(b);
      }
    }
    return clipped;
  }

  function tracePolygon(poly) {
    if (!poly.length) return;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  let parsed = { nodes: [] };
  try {
    parsed = JSON.parse(dataEl.textContent || "{}");
  } catch (err) {
    console.error("GhostGraph: failed to parse data", err);
    return;
  }

  const posts = [];
  const allCategoryNames = new Map();
  const allTagNames = new Map();
  const UNTAGGED_KEY = "untagged";

  (parsed.nodes || []).forEach((n, idx) => {
    const title = String(n.title || "");
    const url = String(n.url || "").replace(/["']/g, "").trim();
    const rawTags = normalizeList(n.tags);
    const rawCategories = normalizeList(n.categories);
    const categoryNames = rawCategories.length ? rawCategories : ["Uncategorized"];
    const categoryKeys = [];

    categoryNames.forEach((name) => {
      const key = keyify(name) || "uncategorized";
      categoryKeys.push(key);
      if (!allCategoryNames.has(key)) {
        allCategoryNames.set(key, cleanString(name) || "Uncategorized");
      }
    });

    const primaryKey = categoryKeys[0] || "uncategorized";
    const primaryName =
      allCategoryNames.get(primaryKey) || cleanString(categoryNames[0]) || "Uncategorized";

    const tagKeys = [];
    const tagNames = [];
    rawTags.forEach((name) => {
      const key = keyify(name);
      if (!key) return;
      tagKeys.push(key);
      tagNames.push(cleanString(name) || key);
      if (!allTagNames.has(key)) {
        allTagNames.set(key, cleanString(name) || key);
      }
    });

    const nodeKey = n.id || n.slug || n.url || n.title || String(idx);
    const tokens = new Set([
      ...tokenize(title),
      ...tagKeys,
      ...categoryKeys,
    ]);
    const searchText = [
      title,
      ...tagNames,
      ...categoryNames,
    ].join(" ").toLowerCase();

    const post = {
      key: String(nodeKey),
      title,
      url,
      tags: tagNames,
      tagKeys,
      categories: categoryNames.map((name) => cleanString(name) || "Uncategorized"),
      categoryKeys,
      categoryKey: primaryKey,
      categoryName: primaryName,
      tokens,
      searchText,
      cellKey: primaryKey,
      x: 0,
      y: 0,
      radius: 0,
      matchScore: 1,
    };

    posts.push(post);
  });

  if (!posts.length) {
    console.warn("GhostGraph: no posts found to render");
    return;
  }

  function createCategory(key, name) {
    return {
      key,
      name: name || allCategoryNames.get(key) || key,
      count: 0,
      posts: [],
      colors: categoryColors(key),
    };
  }

  function createTag(key, name) {
    return {
      key,
      name: name || allTagNames.get(key) || key,
      count: 0,
      posts: [],
      colors: tagColors(key),
    };
  }

  const view = {
    mode: "category",
    filterCategoryKey: null,
    filterCategoryName: null,
    posts: [],
    cells: [],
    cellMap: new Map(),
    categories: [],
    categoryMap: new Map(),
    tags: [],
    tagMap: new Map(),
    categoryBadge: null,
  };

  const state = {
    width: 0,
    height: 0,
    dpr: window.devicePixelRatio || 1,
    margin: 24,
    time: 0,
    postRadius: 4,
    queryTokens: new Set(),
    queryActive: false,
    searchQuery: "",
  };

  function getSearchTerms() {
    const query = String(state.searchQuery || "").trim().toLowerCase();
    if (!query) return [];
    return query.split(/\s+/).filter(Boolean);
  }

  function resolveCategoryFilter(value) {
    const raw = cleanString(value || "");
    if (!raw) return null;
    const key = keyify(raw);
    if (!key) return null;
    if (!allCategoryNames.has(key)) return null;
    return { key, name: allCategoryNames.get(key) };
  }

  function buildView() {
    const filterKey = view.filterCategoryKey;
    let basePosts = filterKey
      ? posts.filter((post) => post.categoryKeys.includes(filterKey))
      : posts.slice();
    if (filterKey && !basePosts.length) {
      view.mode = "category";
      view.filterCategoryKey = null;
      view.filterCategoryName = null;
      basePosts = posts.slice();
    }
    view.filterCategoryName = view.filterCategoryKey
      ? allCategoryNames.get(view.filterCategoryKey)
      : null;

    const terms = getSearchTerms();
    view.posts = terms.length
      ? basePosts.filter((post) =>
          terms.every((term) => post.searchText.includes(term))
        )
      : basePosts;

    const categoryMap = new Map();
    view.posts.forEach((post) => {
      const key = post.categoryKey;
      let cat = categoryMap.get(key);
      if (!cat) {
        cat = createCategory(key, post.categoryName);
        categoryMap.set(key, cat);
      }
      cat.posts.push(post);
      cat.count += 1;
    });
    view.categories = Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    view.categoryMap = categoryMap;

    const tagMap = new Map();
    let hasUntagged = false;
    view.posts.forEach((post) => {
      if (!post.tagKeys.length) {
        hasUntagged = true;
        return;
      }
      post.tagKeys.forEach((key, idx) => {
        let tag = tagMap.get(key);
        if (!tag) {
          tag = createTag(key, post.tags[idx]);
          tagMap.set(key, tag);
        }
        tag.posts.push(post);
        tag.count += 1;
      });
    });
    if (hasUntagged) {
      if (!allTagNames.has(UNTAGGED_KEY)) {
        allTagNames.set(UNTAGGED_KEY, "Untagged");
      }
      if (!tagMap.has(UNTAGGED_KEY)) {
        tagMap.set(UNTAGGED_KEY, createTag(UNTAGGED_KEY, "Untagged"));
      }
    }
    view.tags = Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    view.tagMap = tagMap;

    if (view.mode === "category") {
      view.cells = view.categories;
      view.cellMap = view.categoryMap;
      view.posts.forEach((post) => {
        post.cellKey = post.categoryKey;
      });
    } else {
      const cellMap = new Map();
      view.tags.forEach((tag) => {
        cellMap.set(tag.key, {
          key: tag.key,
          name: tag.name,
          count: 0,
          posts: [],
          colors: tag.colors,
        });
      });
      view.posts.forEach((post) => {
        const primaryTag = pickPrimaryTag(post);
        post.cellKey = primaryTag;
        let cell = cellMap.get(primaryTag);
        if (!cell) {
          cell = createTag(primaryTag);
          cellMap.set(primaryTag, cell);
        }
        cell.posts.push(post);
        cell.count += 1;
      });
      view.cells = Array.from(cellMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      view.cellMap = cellMap;
    }
  }

  function pickPrimaryTag(post) {
    if (!post.tagKeys.length) return UNTAGGED_KEY;
    return post.tagKeys[0];
  }

  (function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const match = resolveCategoryFilter(params.get("category"));
    if (match) {
      view.mode = "tag";
      view.filterCategoryKey = match.key;
      view.filterCategoryName = match.name;
    }
    buildView();
  })();

  let hoveredPost = null;
  let hoveredCell = null;
  let hoveredTag = null;

  function seedCells() {
    const margin = state.margin;
    const w = Math.max(1, state.width - margin * 2);
    const h = Math.max(1, state.height - margin * 2);
    const baseSpacing =
      Math.min(state.width, state.height) / (Math.sqrt(Math.max(1, view.cells.length)) + 1);
    const weights = view.cells.map((cell) => Math.sqrt(cell.count || 1));
    const maxWeight = Math.max(1, ...weights);
    const weightScale = baseSpacing * 1.2;

    view.cells.forEach((cell, idx) => {
      const rng = makeRng(hash32(cell.key));
      const weight = weights[idx] || 1;
      const t = weight / maxWeight;
      cell.x = margin + rng() * w;
      cell.y = margin + rng() * h;
      cell.weight = weight;
      cell.weightValue = weightScale * (0.35 + 0.65 * t);
    });

    const iterations = 80;
    const cx = state.width / 2;
    const cy = state.height / 2;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < view.cells.length; i++) {
        const a = view.cells[i];
        for (let j = i + 1; j < view.cells.length; j++) {
          const b = view.cells[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.hypot(dx, dy);
          if (!dist) {
            dist = 0.001;
            dx = 0.001;
          }
          const target = baseSpacing + (a.weight + b.weight) * 12;
          if (dist < target) {
            const push = ((target - dist) / target) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x += nx * push;
            a.y += ny * push;
            b.x -= nx * push;
            b.y -= ny * push;
          }
        }
      }
      view.cells.forEach((cell) => {
        cell.x += (cx - cell.x) * 0.003;
        cell.y += (cy - cell.y) * 0.003;
        cell.x = clamp(cell.x, margin, state.width - margin);
        cell.y = clamp(cell.y, margin, state.height - margin);
      });
    }
  }

  function computeVoronoi() {
    const bbox = [
      { x: 0, y: 0 },
      { x: state.width, y: 0 },
      { x: state.width, y: state.height },
      { x: 0, y: state.height },
    ];

    view.cells.forEach((cell, i) => {
      let poly = bbox.slice();
      for (let j = 0; j < view.cells.length; j++) {
        if (i === j) continue;
        const other = view.cells[j];
        const nx = other.x - cell.x;
        const ny = other.y - cell.y;
        const wa = cell.weightValue || 0;
        const wb = other.weightValue || 0;
        const c =
          (other.x * other.x +
            other.y * other.y -
            wb * wb -
            (cell.x * cell.x + cell.y * cell.y - wa * wa)) *
          0.5;
        poly = clipPolygon(poly, nx, ny, c);
        if (!poly.length) break;
      }
      cell.poly = poly;
      cell.area = Math.abs(polygonArea(poly));
      cell.centroid = polygonCentroid(poly) || { x: cell.x, y: cell.y };
      cell.safePoint = pointInPolygon(cell.centroid.x, cell.centroid.y, poly)
        ? cell.centroid
        : { x: cell.x, y: cell.y };
    });
  }

  function projectInsidePolygon(x, y, poly, safePoint) {
    if (!poly || !poly.length) return { x, y };
    if (pointInPolygon(x, y, poly)) return { x, y };
    let ax = safePoint.x;
    let ay = safePoint.y;
    let bx = x;
    let by = y;
    for (let i = 0; i < 18; i++) {
      const mx = (ax + bx) * 0.5;
      const my = (ay + by) * 0.5;
      if (pointInPolygon(mx, my, poly)) {
        ax = mx;
        ay = my;
      } else {
        bx = mx;
        by = my;
      }
    }
    return { x: ax, y: ay };
  }

  function placePosts() {
    const totalPosts = view.posts.length;
    state.postRadius = clamp(
      Math.sqrt((state.width * state.height) / Math.max(1, totalPosts)) / 9.5,
      5,
      12
    );

    view.cells.forEach((cell) => {
      const group = cell.posts;
      if (!group.length) return;
      const count = group.length;
      const radius = clamp(
        Math.sqrt((cell.area || 1) / Math.PI) * 0.64,
        state.postRadius * 4,
        Math.min(state.width, state.height) * 0.35
      );
      cell.clusterRadius = radius;
      const angleOffset =
        (hash32("spin|" + cell.key) / 4294967295) * Math.PI * 2;

      for (let i = 0; i < group.length; i++) {
        const post = group[i];
        const t = (i + 0.5) / count;
        const r = Math.sqrt(t) * radius * 0.92;
        const a = i * goldenAngle + angleOffset;
        const x = cell.centroid.x + Math.cos(a) * r;
        const y = cell.centroid.y + Math.sin(a) * r;
        const projected = projectInsidePolygon(x, y, cell.poly, cell.safePoint);
        post.x = projected.x;
        post.y = projected.y;
        post.radius = state.postRadius;
      }
    });

    relaxPosts();
  }

  function relaxPosts() {
    const iterations = 18;
    const minDist = state.postRadius * 2.6;

    for (let iter = 0; iter < iterations; iter++) {
      view.cells.forEach((cell) => {
        const group = cell.posts;
        for (let i = 0; i < group.length; i++) {
          const a = group[i];
          for (let j = i + 1; j < group.length; j++) {
            const b = group[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let dist = Math.hypot(dx, dy);
            if (!dist) {
              dist = 0.001;
              dx = 0.001;
            }
            if (dist < minDist) {
              const push = ((minDist - dist) / minDist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;
              a.x += nx * push;
              a.y += ny * push;
              b.x -= nx * push;
              b.y -= ny * push;
            }
          }
        }
        group.forEach((post) => {
          const pos = projectInsidePolygon(
            post.x,
            post.y,
            cell.poly,
            cell.safePoint
          );
          post.x = pos.x;
          post.y = pos.y;
        });
      });
    }
  }

  function computeTags() {
    const margin = state.margin;
    if (view.mode === "tag") {
      view.tags.forEach((tag) => {
        const cell = view.cellMap.get(tag.key);
        if (!cell || !cell.centroid) {
          tag.x = margin;
          tag.y = margin;
          tag.orbit = 12;
          return;
        }
        tag.x = clamp(cell.centroid.x, margin, state.width - margin);
        tag.y = clamp(cell.centroid.y, margin, state.height - margin);
        const radius = Math.sqrt(Math.max(1, cell.area || 1) / Math.PI);
        tag.orbit = clamp(radius * 0.3, 14, 120);
      });
      return;
    }

    view.tags.forEach((tag) => {
      if (!tag.posts.length) {
        tag.x = margin;
        tag.y = margin;
        tag.orbit = 12;
        return;
      }
      let sumX = 0;
      let sumY = 0;
      for (const post of tag.posts) {
        sumX += post.x;
        sumY += post.y;
      }
      let x = sumX / tag.posts.length;
      let y = sumY / tag.posts.length;
      const offset = 8 + Math.sqrt(tag.posts.length) * 3;
      const angle = (hash32("tag|" + tag.key) / 4294967295) * Math.PI * 2;
      x += Math.cos(angle) * offset;
      y += Math.sin(angle) * offset;
      tag.x = clamp(x, margin, state.width - margin);
      tag.y = clamp(y, margin, state.height - margin);

      let distSum = 0;
      for (const post of tag.posts) {
        distSum += Math.hypot(post.x - tag.x, post.y - tag.y);
      }
      const avgDist = distSum / Math.max(1, tag.posts.length);
      tag.orbit = clamp(avgDist * 0.6, 14, 120);
    });
  }

  function measureLabels() {
    const scale = state.width < 720 ? 0.85 : 1;
    const cellSize = Math.round(16 * scale);
    const tagSize = Math.round(12 * scale);

    view.cells.forEach((cell) => {
      const labelBase = cell.name.toUpperCase();
      const label = view.mode === "tag" ? "#" + labelBase : labelBase;
      ctx.font = cellSize + 'px "Share Tech Mono", monospace';
      const w = ctx.measureText(label).width;
      const paddingX = cellSize * 0.45;
      const paddingY = cellSize * 0.3;
      let x = cell.centroid.x - w / 2;
      let y = cell.centroid.y;
      x = clamp(x, state.margin, state.width - w - state.margin);
      y = clamp(
        y,
        state.margin + cellSize,
        state.height - state.margin - cellSize
      );
      cell.label = label;
      cell.labelWidth = w;
      cell.labelSize = cellSize;
      cell.labelX = x;
      cell.labelY = y;
      cell.labelRect = {
        x: x - paddingX,
        y: y - cellSize / 2 - paddingY,
        w: w + paddingX * 2,
        h: cellSize + paddingY * 2,
      };
    });

    if (view.mode === "category" && state.queryActive) {
      view.tags.forEach((tag) => {
        const label = "#" + tag.name.toUpperCase();
        ctx.font = tagSize + 'px "Share Tech Mono", monospace';
        const w = ctx.measureText(label).width;
        const paddingX = tagSize * 0.45;
        const paddingY = tagSize * 0.3;
        const angle = (hash32("label|" + tag.key) / 4294967295) * Math.PI * 2;
        const offset = clamp(tag.orbit * 0.25, 10, 36);
        let x = tag.x + Math.cos(angle) * offset - w / 2;
        let y = tag.y + Math.sin(angle) * offset;
        x = clamp(x, state.margin, state.width - w - state.margin);
        y = clamp(
          y,
          state.margin + tagSize,
          state.height - state.margin - tagSize
        );
        tag.label = label;
        tag.labelWidth = w;
        tag.labelSize = tagSize;
        tag.labelX = x;
        tag.labelY = y;
        tag.labelRect = {
          x: x - paddingX,
          y: y - tagSize / 2 - paddingY,
          w: w + paddingX * 2,
          h: tagSize + paddingY * 2,
        };
      });
    }

    view.categoryBadge = null;
    if (view.mode === "tag" && view.filterCategoryName) {
      const badge = ("Category: " + view.filterCategoryName).toUpperCase();
      ctx.font = cellSize + 'px "Share Tech Mono", monospace';
      const w = ctx.measureText(badge).width;
      const paddingX = cellSize * 0.55;
      const paddingY = cellSize * 0.35;
      const x = state.margin;
      const y = state.margin + cellSize;
      view.categoryBadge = {
        label: badge,
        labelWidth: w,
        labelSize: cellSize,
        colors: categoryColors(view.filterCategoryKey || "category"),
        rect: {
          x: x,
          y: y - cellSize / 2 - paddingY,
          w: w + paddingX * 2,
          h: cellSize + paddingY * 2,
        },
      };
    }
  }

  function measurePostLabels() {
    const scale = state.width < 720 ? 0.85 : 1;
    const postSize = Math.max(10, Math.round(11 * scale));
    const reserved = [];
    const padding = 4;

    view.cells.forEach((cell) => {
      if (cell.labelRect) reserved.push(expandRect(cell.labelRect, padding));
    });
    if (view.mode === "category" && state.queryActive) {
      view.tags.forEach((tag) => {
        if (tag.labelRect) reserved.push(expandRect(tag.labelRect, padding));
      });
    }
    if (view.categoryBadge && view.categoryBadge.rect) {
      reserved.push(expandRect(view.categoryBadge.rect, padding));
    }

    view.posts.forEach((post) => {
      const label = truncateLabel(post.title || "Untitled", 28);
      ctx.font = postSize + 'px "Share Tech Mono", monospace';
      const w = ctx.measureText(label).width;
      const paddingX = postSize * 0.45;
      const paddingY = postSize * 0.3;
      const rectW = w + paddingX * 2;
      const rectH = postSize + paddingY * 2;
      const cell = view.cellMap.get(post.cellKey);
      const baseAngle = cell && cell.centroid
        ? Math.atan2(post.y - cell.centroid.y, post.x - cell.centroid.x)
        : (hash32("pl|" + post.key) / 4294967295) * Math.PI * 2;
      const angleStep = (Math.PI * 2) / 10;
      const baseOffset = post.radius + 14;
      const maxRings = 6;
      let bestRect = null;
      let bestScore = Infinity;

      for (let ring = 0; ring < maxRings; ring++) {
        const offset = baseOffset + ring * (10 + post.radius * 0.35);
        for (let i = 0; i < 10; i++) {
          const angle = baseAngle + i * angleStep;
          const lx = post.x + Math.cos(angle) * offset;
          const ly = post.y + Math.sin(angle) * offset;
          let rx = lx - rectW / 2;
          let ry = ly - rectH / 2;
          rx = clamp(rx, state.margin, state.width - rectW - state.margin);
          ry = clamp(ry, state.margin, state.height - rectH - state.margin);

          const rect = { x: rx, y: ry, w: rectW, h: rectH };
          let score = 0;
          if (circleIntersectsRect(post.x, post.y, post.radius + 4, rect)) {
            score += 2;
          }
          for (const taken of reserved) {
            if (rectsIntersect(rect, taken)) score += 1;
          }
          if (score < bestScore) {
            bestScore = score;
            bestRect = rect;
          }
          if (score === 0) {
            ring = maxRings;
            break;
          }
        }
      }

      post.label = label;
      post.labelWidth = w;
      post.labelSize = postSize;
      post.labelRect = bestRect || {
        x: clamp(post.x - rectW / 2, state.margin, state.width - rectW - state.margin),
        y: clamp(post.y - rectH / 2, state.margin, state.height - rectH - state.margin),
        w: rectW,
        h: rectH,
      };

      reserved.push(expandRect(post.labelRect, padding));
    });
  }

  function layout() {
    if (state.width <= 0 || state.height <= 0) return;
    seedCells();
    computeVoronoi();
    placePosts();
    computeTags();
    measureLabels();
    measurePostLabels();
  }

  function updateSearch(query) {
    state.searchQuery = String(query || "").toLowerCase().trim();
    const terms = getSearchTerms();
    state.queryTokens = new Set(terms);
    state.queryActive = terms.length > 0;

    buildView();
    layout();

    view.posts.forEach((post) => {
      post.matchScore = 1;
    });
    view.cells.forEach((cell) => {
      cell.activeCount = cell.count || 0;
    });
    view.tags.forEach((tag) => {
      tag.activeCount = tag.count || 0;
    });

    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
  }

  function getExpandedPostLabel(post) {
    const text = String(post.title || post.label || "Untitled")
      .replace(/["']/g, "")
      .trim();
    const fontSize = post.labelSize || 12;
    ctx.font = fontSize + 'px "Share Tech Mono", monospace';
    const textWidth = ctx.measureText(text).width;
    const paddingX = fontSize * 0.45;
    const paddingY = fontSize * 0.3;
    const rectW = textWidth + paddingX * 2;
    const rectH = fontSize + paddingY * 2;
    const base = post.labelRect || { x: post.x, y: post.y, w: rectW, h: rectH };
    const cx = base.x + base.w / 2;
    const cy = base.y + base.h / 2;
    const x = clamp(cx - rectW / 2, state.margin, state.width - rectW - state.margin);
    const y = clamp(cy - rectH / 2, state.margin, state.height - rectH - state.margin);
    return {
      text,
      textWidth,
      rect: { x, y, w: rectW, h: rectH },
      fontSize,
    };
  }

  function findPostLabelAt(x, y) {
    if (hoveredPost && hoveredPost.labelRect) {
      const expanded = getExpandedPostLabel(hoveredPost);
      if (pointInRect(x, y, expanded.rect)) return hoveredPost;
    }
    for (let i = view.posts.length - 1; i >= 0; i--) {
      const post = view.posts[i];
      if (!post.labelRect) continue;
      if (pointInRect(x, y, post.labelRect)) return post;
    }
    return null;
  }

  function findLabelAt(list, x, y) {
    for (const item of list) {
      const rect = item.labelRect;
      if (!rect) continue;
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        return item;
      }
    }
    return null;
  }

  function pointInRect(x, y, rect) {
    if (!rect) return false;
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function findCellAt(x, y) {
    for (const cell of view.cells) {
      if (!cell.poly || !cell.poly.length) continue;
      if (pointInPolygon(x, y, cell.poly)) return cell;
    }
    return null;
  }

  function updateUrl(categoryName) {
    const url = new URL(window.location.href);
    if (categoryName) {
      url.searchParams.set("category", categoryName);
    } else {
      url.searchParams.delete("category");
    }
    window.history.pushState(null, "", url.toString());
  }

  function syncViewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const match = resolveCategoryFilter(params.get("category"));
    if (match) {
      view.mode = "tag";
      view.filterCategoryKey = match.key;
      view.filterCategoryName = match.name;
    } else {
      view.mode = "category";
      view.filterCategoryKey = null;
      view.filterCategoryName = null;
    }
    updateSearch(state.searchQuery);
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
  }

  function applyCategoryFilter(cell) {
    if (!cell) return;
    view.mode = "tag";
    view.filterCategoryKey = cell.key;
    view.filterCategoryName = cell.name;
    updateSearch(state.searchQuery);
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
    updateUrl(cell.name);
  }

  function clearCategoryFilter() {
    view.mode = "category";
    view.filterCategoryKey = null;
    view.filterCategoryName = null;
    updateSearch(state.searchQuery);
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
    updateUrl(null);
  }

  function drawCells(focusCell) {
    ctx.save();
    ctx.lineJoin = "round";
    view.cells.forEach((cell) => {
      if (!cell.poly || !cell.poly.length) return;
      const highlight = focusCell && focusCell.key === cell.key;
      const fill = highlight ? cell.colors.fillStrong : cell.colors.fill;
      const edge = highlight ? cell.colors.edgeStrong : cell.colors.edge;

      tracePolygon(cell.poly);
      ctx.globalAlpha = 1;
      ctx.fillStyle = fill;
      ctx.fill();

      tracePolygon(cell.poly);
      ctx.strokeStyle = edge;
      ctx.lineWidth = highlight ? 1.9 : 1.1;
      ctx.setLineDash([8, 12]);
      ctx.lineDashOffset = -state.time * 0.02 + (hash32(cell.key) % 60);
      ctx.stroke();
      ctx.setLineDash([]);

      tracePolygon(cell.poly);
      ctx.globalAlpha = highlight ? 0.35 : 0.16;
      ctx.strokeStyle = cell.colors.glow;
      ctx.lineWidth = highlight ? 3.2 : 2.2;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawTagLinks(focusTag, focusPost) {
    if (!state.queryActive) return;
    const focusTagKey = focusTag ? focusTag.key : null;
    const focusPostTags = focusPost ? new Set(focusPost.tagKeys) : null;

    ctx.save();
    view.tags.forEach((tag) => {
      const activeCount = tag.activeCount ?? tag.count;
      const tagActive = focusTagKey
        ? tag.key === focusTagKey
        : focusPostTags
        ? focusPostTags.has(tag.key)
        : false;
      const density = 1 / Math.sqrt(Math.max(1, tag.posts.length));
      const baseAlpha = tagActive ? 0.6 : activeCount ? 0.16 : 0.06;
      const alpha = baseAlpha * (0.6 + density * 0.8);

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = tag.colors.halo;
      ctx.lineWidth = tagActive ? 1.4 : 0.7;
      ctx.setLineDash([4, 12]);
      ctx.lineDashOffset = -state.time * 0.03 + (hash32(tag.key) % 40);
      ctx.beginPath();
      ctx.arc(tag.x, tag.y, tag.orbit, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const post of tag.posts) {
        const postActive = !state.queryActive || post.matchScore > 0;
        const postFocused = focusPost && post === focusPost;
        const linkAlpha = alpha * (postActive ? 1 : 0.25) * (postFocused ? 1.3 : 1);
        if (linkAlpha < 0.02) continue;
        const dx = post.x - tag.x;
        const dy = post.y - tag.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const bend = 8 + (hash32(tag.key + "|" + post.key) % 18);
        const mx = (post.x + tag.x) * 0.5;
        const my = (post.y + tag.y) * 0.5;
        const cx = mx + nx * bend;
        const cy = my + ny * bend;

        ctx.globalAlpha = linkAlpha;
        ctx.strokeStyle = tag.colors.link;
        ctx.lineWidth = tagActive ? 1.4 : 0.8;
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -state.time * 0.05;
        ctx.beginPath();
        ctx.moveTo(tag.x, tag.y);
        ctx.quadraticCurveTo(cx, cy, post.x, post.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.globalAlpha = tagActive ? 0.9 : 0.5;
      ctx.fillStyle = tag.colors.node;
      const nodeR = tagActive ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(tag.x, tag.y - nodeR);
      ctx.lineTo(tag.x + nodeR, tag.y);
      ctx.lineTo(tag.x, tag.y + nodeR);
      ctx.lineTo(tag.x - nodeR, tag.y);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  function drawPostLabels(focusPost, focusCell, focusTag) {
    const focusTagKey = focusTag ? focusTag.key : null;
    ctx.save();
    for (const post of view.posts) {
      if (focusPost && post === focusPost) continue;
      if (!post.labelRect) continue;
      let alpha = 1;
      if (focusCell && post.cellKey !== focusCell.key) alpha *= 0.14;
      if (focusTagKey && !post.tagKeys.includes(focusTagKey)) alpha *= 0.14;
      if (focusPost && post !== focusPost) alpha *= 0.25;
      if (alpha < 0.02) continue;

      const cell = view.cellMap.get(post.cellKey);
      const color = cell ? cell.colors.label : "rgba(216, 226, 255, 0.9)";
      const stroke = cell ? cell.colors.edge : "rgba(72, 242, 227, 0.4)";
      drawLabel(
        post.label,
        post.labelRect,
        post.labelSize,
        color,
        stroke,
        alpha,
        post.labelWidth
      );
    }

    if (focusPost && focusPost.labelRect) {
      let alpha = 1;
      if (focusCell && focusPost.cellKey !== focusCell.key) alpha *= 0.14;
      if (focusTagKey && !focusPost.tagKeys.includes(focusTagKey)) alpha *= 0.14;
      const expanded = getExpandedPostLabel(focusPost);
      const cell = view.cellMap.get(focusPost.cellKey);
      const color = cell ? cell.colors.label : "rgba(216, 226, 255, 0.9)";
      const stroke = cell ? cell.colors.edge : "rgba(72, 242, 227, 0.4)";
      drawLabel(
        expanded.text,
        expanded.rect,
        expanded.fontSize,
        color,
        stroke,
        alpha,
        expanded.textWidth
      );
    }
    ctx.restore();
  }

  function drawLabel(label, rect, fontSize, color, stroke, alpha, textWidth) {
    ctx.save();
    ctx.font = fontSize + 'px "Share Tech Mono", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(6, 10, 18, 0.7)";
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    roundRect(rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(label, rect.x + (rect.w - textWidth) / 2, rect.y + rect.h / 2);
    ctx.restore();
  }

  function drawLabels(focusCell, focusTag) {
    ctx.save();
    view.cells.forEach((cell) => {
      if (!cell.labelRect) return;
      const highlight = focusCell && focusCell.key === cell.key;
      const active = !state.queryActive || (cell.activeCount || 0) > 0;
      const alpha = highlight ? 0.95 : active ? 0.7 : 0.25;
      drawLabel(
        cell.label,
        cell.labelRect,
        cell.labelSize,
        cell.colors.label,
        cell.colors.edge,
        alpha,
        cell.labelWidth
      );
    });

    if (view.mode === "category" && state.queryActive) {
      view.tags.forEach((tag) => {
        if (!tag.labelRect) return;
        const highlight = focusTag && focusTag.key === tag.key;
        const active = !state.queryActive || (tag.activeCount || 0) > 0;
        const alpha = highlight ? 0.9 : active ? 0.55 : 0.2;
        drawLabel(
          tag.label,
          tag.labelRect,
          tag.labelSize,
          tag.colors.label,
          tag.colors.edge,
          alpha,
          tag.labelWidth
        );
      });
    }

    if (view.categoryBadge) {
      drawLabel(
        view.categoryBadge.label,
        view.categoryBadge.rect,
        view.categoryBadge.labelSize,
        view.categoryBadge.colors.label,
        view.categoryBadge.colors.edge,
        0.85,
        view.categoryBadge.labelWidth
      );
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);
    const focusPost = hoveredPost || null;
    const focusCell = hoveredCell || null;
    const focusTag = view.mode === "category" ? hoveredTag || null : null;

    drawCells(focusCell);
    if (view.mode === "category") {
      drawTagLinks(focusTag, focusPost);
    }
    drawPostLabels(focusPost, focusCell, focusTag);
    drawLabels(focusCell, focusTag);
  }

  function loop(ts) {
    state.time = ts || state.time + 16;
    draw();
    requestAnimationFrame(loop);
  }

  function resize() {
    state.width = canvas.clientWidth;
    state.height = canvas.clientHeight;
    state.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(state.width * state.dpr));
    canvas.height = Math.max(1, Math.floor(state.height * state.dpr));
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    layout();
  }

  function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  canvas.addEventListener("mousemove", (e) => {
    const pos = getMousePos(e);
    hoveredPost = findPostLabelAt(pos.x, pos.y);
    if (hoveredPost) {
      hoveredCell = null;
      hoveredTag = null;
      canvas.style.cursor = "pointer";
      return;
    }
    if (view.mode === "category" && state.queryActive) {
      hoveredTag = findLabelAt(view.tags, pos.x, pos.y);
    } else {
      hoveredTag = null;
    }

    const badgeHover =
      view.mode === "tag" && view.categoryBadge
        ? pointInRect(pos.x, pos.y, view.categoryBadge.rect)
        : false;
    if (badgeHover) {
      hoveredCell = null;
      canvas.style.cursor = "pointer";
      return;
    }

    if (hoveredTag) {
      hoveredCell = null;
      canvas.style.cursor = "pointer";
      return;
    }

    const cellLabel = findLabelAt(view.cells, pos.x, pos.y);
    hoveredCell = cellLabel || findCellAt(pos.x, pos.y);

    if (view.mode === "category" && hoveredCell) {
      canvas.style.cursor = "pointer";
      return;
    }

    canvas.style.cursor = "default";
  });

  canvas.addEventListener("mouseleave", () => {
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
    canvas.style.cursor = "default";
  });

  canvas.addEventListener("click", (e) => {
    const pos = getMousePos(e);
    const node = findPostLabelAt(pos.x, pos.y);
    if (node && node.url) {
      window.location.href = node.url;
      return;
    }
    if (
      view.mode === "tag" &&
      view.categoryBadge &&
      pointInRect(pos.x, pos.y, view.categoryBadge.rect)
    ) {
      clearCategoryFilter();
      return;
    }
    if (view.mode === "category") {
      const cell = findLabelAt(view.cells, pos.x, pos.y) || findCellAt(pos.x, pos.y);
      if (cell) {
        applyCategoryFilter(cell);
      }
    }
  });

  canvas.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const pos = getMousePos(e);
    const node = findPostLabelAt(pos.x, pos.y);
    if (node && node.url) {
      e.preventDefault();
      window.open(node.url, "_blank", "noopener,noreferrer");
    }
  });

  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      const q = (e.target.value || "").toLowerCase().trim();
      updateSearch(q);
    });
  }

  (function prefillSearch() {
    if (!searchEl) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      searchEl.value = q;
      updateSearch(q);
    } else {
      updateSearch("");
    }
  })();

  window.addEventListener("popstate", syncViewFromUrl);

  resize();
  window.addEventListener("resize", resize);
  loop();
})();

