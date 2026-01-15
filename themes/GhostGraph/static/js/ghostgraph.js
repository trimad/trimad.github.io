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
  const tooltipEl = document.getElementById("gg-tooltip");
  const hotspotsEl = document.getElementById("gg-hotspots");
  if (!canvas || !dataEl) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;
  const shell = canvas.closest(".gg-shell") || canvas.parentElement;
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const palette = [
    { h: 178, s: 68, l: 52 }, // teal
    { h: 148, s: 64, l: 50 }, // green
    { h: 310, s: 70, l: 58 }, // magenta
    { h: 198, s: 70, l: 60 }, // cyan
    { h: 36, s: 78, l: 58 },  // amber
    { h: 220, s: 68, l: 60 }, // blue
  ];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const transitionMs = 260;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function hsla(h, s, l, a) {
    return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")";
  }

  function mixHue(a, b, t) {
    const delta = ((b - a + 540) % 360) - 180;
    return (a + delta * t + 360) % 360;
  }

  function mixHsl(a, b, t) {
    return {
      h: mixHue(a.h, b.h, t),
      s: a.s + (b.s - a.s) * t,
      l: a.l + (b.l - a.l) * t,
    };
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

  function categoryBase(key) {
    const p = palette[hash32("cat|" + key) % palette.length];
    return { h: p.h, s: p.s, l: p.l };
  }

  function categoryColorsFromBase(base) {
    return {
      fill: hsla(base.h, base.s, 24, 0.22),
      fillStrong: hsla(base.h, base.s, 30, 0.32),
      edge: hsla(base.h, base.s, 64, 0.5),
      edgeStrong: hsla(base.h, base.s, 70, 0.9),
      glow: hsla(base.h, base.s, 64, 0.22),
      label: hsla(base.h, base.s, 82, 0.95),
      post: hsla(base.h, base.s, 64, 1),
    };
  }

  function categoryColors(baseOrKey) {
    const base =
      typeof baseOrKey === "string" || !baseOrKey
        ? categoryBase(baseOrKey || "category")
        : baseOrKey;
    return categoryColorsFromBase(base);
  }

  function tagColors(tagKey, baseOrKey) {
    const base =
      typeof baseOrKey === "string" || !baseOrKey
        ? categoryBase(baseOrKey || tagKey || "tag")
        : baseOrKey;
    const jitter = (hash32("tag|" + tagKey) % 36) - 18;
    const h = (base.h + jitter + 360) % 360;
    const s = clamp(base.s + 6, 48, 86);
    const l = clamp(base.l + 8, 42, 74);
    return {
      link: hsla(h, s, 60, 0.32),
      halo: hsla(h, s, 62, 0.14),
      edge: hsla(h, s, 70, 0.6),
      node: hsla(h, s, 68, 0.85),
      label: hsla(h, s, 82, 0.9),
      fill: hsla(h, s, 24, 0.18),
      fillStrong: hsla(h, s, 30, 0.28),
      edgeStrong: hsla(h, s, 76, 0.85),
      glow: hsla(h, s, 64, 0.22),
      post: hsla(h, s, 68, 1),
    };
  }

  function makePairKey(a, b) {
    const pair = [String(a || ""), String(b || "")].sort();
    return pair[0] + "~" + pair[1];
  }

  function parsePairKey(value) {
    const raw = String(value || "");
    if (!raw || raw.indexOf("~") === -1) return null;
    const parts = raw.split("~").filter(Boolean);
    if (parts.length !== 2) return null;
    return { keyA: parts[0], keyB: parts[1] };
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

  function polygonBounds(poly) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX) || !isFinite(minY)) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
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
  const UNCLASSIFIED_KEY = "unclassified";
  const UNCLASSIFIED_NAME = "Unclassified";
  const UNTAGGED_KEY = "untagged";
  allCategoryNames.set(UNCLASSIFIED_KEY, UNCLASSIFIED_NAME);

  (parsed.nodes || []).forEach((n, idx) => {
    const title = String(n.title || "");
    const url = String(n.url || "").replace(/["']/g, "").trim();
    const rawTags = normalizeList(n.tags);
    const rawCategories = normalizeList(n.categories);
    let categoryNames = rawCategories.length ? rawCategories : [UNCLASSIFIED_NAME];
    if (categoryNames.length > 2) categoryNames = categoryNames.slice(0, 2);
    const categoryKeys = [];

    categoryNames.forEach((name) => {
      const key = keyify(name) || UNCLASSIFIED_KEY;
      categoryKeys.push(key);
      if (!allCategoryNames.has(key)) {
        allCategoryNames.set(key, cleanString(name) || UNCLASSIFIED_NAME);
      }
    });

    const primaryKey = categoryKeys[0] || UNCLASSIFIED_KEY;
    const secondaryKey = categoryKeys[1] || null;
    const primaryName =
      allCategoryNames.get(primaryKey) || cleanString(categoryNames[0]) || UNCLASSIFIED_NAME;
    const secondaryName = secondaryKey ? allCategoryNames.get(secondaryKey) || "" : "";
    const pairKey = categoryKeys.length === 2 ? makePairKey(categoryKeys[0], categoryKeys[1]) : null;

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
    const dateRaw = String(n.date || "");
    const dateDisplay = String(n.dateDisplay || "");
    const readingTime = Number(n.readingTime) || 0;
    const readingTimeDisplay = String(n.readingTimeDisplay || "");
    const dateValue = dateRaw ? Date.parse(dateRaw) || 0 : 0;
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
      categories: categoryNames.map((name) => cleanString(name) || UNCLASSIFIED_NAME),
      categoryKeys,
      categoryKey: primaryKey,
      categoryName: primaryName,
      categorySecondaryKey: secondaryKey,
      categorySecondaryName: secondaryName,
      categoryPairKey: pairKey,
      date: dateRaw,
      dateDisplay,
      dateValue,
      readingTime,
      readingTimeDisplay,
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
    const base = categoryBase(key);
    return {
      key,
      name: name || allCategoryNames.get(key) || key,
      count: 0,
      weightCount: 0,
      posts: [],
      base,
      colors: categoryColors(base),
      isDerived: false,
    };
  }

  function createDerivedCategory(keyA, keyB) {
    const pairKey = makePairKey(keyA, keyB);
    const nameA = allCategoryNames.get(keyA) || keyA;
    const nameB = allCategoryNames.get(keyB) || keyB;
    const base = mixHsl(categoryBase(keyA), categoryBase(keyB), 0.5);
    return {
      key: pairKey,
      name: nameA + " + " + nameB,
      pairKeys: [keyA, keyB],
      pairNames: [nameA, nameB],
      count: 0,
      weightCount: 0,
      posts: [],
      base,
      colors: categoryColors(base),
      isDerived: true,
    };
  }

  function createDerivedTag(keyA, keyB, tagA, tagB) {
    const pairKey = makePairKey(keyA, keyB);
    const nameA = (tagA && tagA.name) || allTagNames.get(keyA) || keyA;
    const nameB = (tagB && tagB.name) || allTagNames.get(keyB) || keyB;
    const baseA = (tagA && tagA.base) || categoryBase(keyA);
    const baseB = (tagB && tagB.base) || categoryBase(keyB);
    const base = mixHsl(baseA, baseB, 0.5);
    return {
      key: pairKey,
      name: nameA + " + " + nameB,
      pairKeys: [keyA, keyB],
      pairNames: [nameA, nameB],
      count: 0,
      weightCount: 0,
      posts: [],
      base,
      colors: categoryColors(base),
      isDerived: true,
    };
  }

  function createTag(key, name, base, categoryKey) {
    const resolvedBase =
      base || categoryBase(categoryKey || key || UNCLASSIFIED_KEY);
    return {
      key,
      name: name || allTagNames.get(key) || key,
      count: 0,
      posts: [],
      categoryKey: categoryKey || null,
      categoryCounts: new Map(),
      base: resolvedBase,
      colors: tagColors(key, resolvedBase),
    };
  }

  const view = {
    mode: "category",
    filterCategoryKey: null,
    filterCategoryName: null,
    filterPairKey: null,
    filterPairNames: null,
    filterBase: null,
    focusTagKey: null,
    posts: [],
    cells: [],
    cellMap: new Map(),
    categories: [],
    categoryMap: new Map(),
    derivedCategories: [],
    derivedMap: new Map(),
    tags: [],
    tagMap: new Map(),
    derivedTags: [],
    derivedTagMap: new Map(),
    categoryBadge: null,
  };

  const state = {
    width: 0,
    height: 0,
    dpr: window.devicePixelRatio || 1,
    margin: 24,
    time: 0,
    motionTime: 0,
    postRadius: 4,
    queryTokens: new Set(),
    queryActive: false,
    searchQuery: "",
    transitionStart: 0,
    transitionActive: false,
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

  function resolvePairFilter(value) {
    const parsed = parsePairKey(value);
    if (!parsed) return null;
    if (!allCategoryNames.has(parsed.keyA) || !allCategoryNames.has(parsed.keyB)) {
      return null;
    }
    return parsed;
  }

  function buildView() {
    const filterKey = view.filterCategoryKey;
    const filterPairKey = view.filterPairKey;
    let basePosts = posts.slice();
    if (filterPairKey) {
      basePosts = posts.filter((post) => post.categoryPairKey === filterPairKey);
    } else if (filterKey) {
      basePosts = posts.filter((post) => post.categoryKeys.includes(filterKey));
    }
    if ((filterKey || filterPairKey) && !basePosts.length) {
      view.mode = "category";
      view.filterCategoryKey = null;
      view.filterCategoryName = null;
      view.filterPairKey = null;
      view.filterPairNames = null;
      view.filterBase = null;
      basePosts = posts.slice();
    }
    view.filterCategoryName = view.filterCategoryKey
      ? allCategoryNames.get(view.filterCategoryKey)
      : null;
    const pairResolved = view.filterPairKey ? resolvePairFilter(view.filterPairKey) : null;
    if (view.filterPairKey && !pairResolved) {
      view.filterPairKey = null;
    }
    view.filterPairNames = pairResolved
      ? [
          allCategoryNames.get(pairResolved.keyA),
          allCategoryNames.get(pairResolved.keyB),
        ]
      : null;
    view.filterBase = pairResolved
      ? mixHsl(categoryBase(pairResolved.keyA), categoryBase(pairResolved.keyB), 0.5)
      : view.filterCategoryKey
      ? categoryBase(view.filterCategoryKey)
      : null;

    const terms = getSearchTerms();
    view.posts = terms.length
      ? basePosts.filter((post) =>
          terms.every((term) => post.searchText.includes(term))
        )
      : basePosts;

    const categoryMap = new Map();
    const derivedMap = new Map();
    view.posts.forEach((post) => {
      const keys = post.categoryKeys.length ? post.categoryKeys : [UNCLASSIFIED_KEY];
      keys.forEach((key) => {
        let cat = categoryMap.get(key);
        if (!cat) {
          cat = createCategory(key);
          categoryMap.set(key, cat);
        }
        cat.weightCount += 1;
      });

      if (keys.length === 2) {
        const pairKey = post.categoryPairKey || makePairKey(keys[0], keys[1]);
        let pairCell = derivedMap.get(pairKey);
        if (!pairCell) {
          pairCell = createDerivedCategory(keys[0], keys[1]);
          derivedMap.set(pairKey, pairCell);
        }
        pairCell.posts.push(post);
        pairCell.count += 1;
        pairCell.weightCount += 1;
        post.categoryCellKey = pairKey;
      } else {
        const key = keys[0] || UNCLASSIFIED_KEY;
        let cat = categoryMap.get(key);
        if (!cat) {
          cat = createCategory(key);
          categoryMap.set(key, cat);
        }
        cat.posts.push(post);
        cat.count += 1;
        post.categoryCellKey = key;
      }
    });
    view.categories = Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    view.categoryMap = categoryMap;
    view.derivedCategories = Array.from(derivedMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    view.derivedMap = derivedMap;

    const tagMap = new Map();
    const untaggedPosts = [];
    view.posts.forEach((post) => {
      const tagKeysForView =
        view.mode === "tag" ? post.tagKeys.slice(0, 2) : post.tagKeys;
      const tagNamesForView =
        view.mode === "tag" ? post.tags.slice(0, 2) : post.tags;
      if (!tagKeysForView.length) {
        untaggedPosts.push(post);
        return;
      }
      tagKeysForView.forEach((key, idx) => {
        let tag = tagMap.get(key);
        if (!tag) {
          tag = createTag(key, tagNamesForView[idx]);
          tagMap.set(key, tag);
        }
        tag.posts.push(post);
        tag.count += 1;
        post.categoryKeys.forEach((catKey) => {
          tag.categoryCounts.set(
            catKey,
            (tag.categoryCounts.get(catKey) || 0) + 1
          );
        });
      });
    });
    if (untaggedPosts.length) {
      if (!allTagNames.has(UNTAGGED_KEY)) {
        allTagNames.set(UNTAGGED_KEY, "Untagged");
      }
      let tag = tagMap.get(UNTAGGED_KEY);
      if (!tag) {
        tag = createTag(
          UNTAGGED_KEY,
          "Untagged",
          view.filterBase,
          view.filterCategoryKey
        );
        tagMap.set(UNTAGGED_KEY, tag);
      }
      untaggedPosts.forEach((post) => {
        tag.posts.push(post);
        tag.count += 1;
        post.categoryKeys.forEach((catKey) => {
          tag.categoryCounts.set(
            catKey,
            (tag.categoryCounts.get(catKey) || 0) + 1
          );
        });
      });
    }
    view.tags = Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    view.tags.forEach((tag) => {
      const dominant = pickDominantCategory(tag.categoryCounts) || UNCLASSIFIED_KEY;
      const base = view.filterBase ? view.filterBase : categoryBase(dominant);
      tag.categoryKey = view.filterCategoryKey || dominant;
      tag.base = base;
      tag.colors = tagColors(tag.key, base);
      tag.latestPost = pickLatestPost(tag.posts);
    });
    view.tagMap = tagMap;
    view.derivedTags = [];
    view.derivedTagMap = new Map();

    if (view.mode === "tag") {
      const derivedTagMap = new Map();
      view.posts.forEach((post) => {
        const tagKeysForView = post.tagKeys.slice(0, 2);
        if (tagKeysForView.length >= 2) {
          const pairKey = makePairKey(tagKeysForView[0], tagKeysForView[1]);
          let pairCell = derivedTagMap.get(pairKey);
          if (!pairCell) {
            const tagA = tagMap.get(tagKeysForView[0]);
            const tagB = tagMap.get(tagKeysForView[1]);
            pairCell = createDerivedTag(tagKeysForView[0], tagKeysForView[1], tagA, tagB);
            derivedTagMap.set(pairKey, pairCell);
          }
          pairCell.posts.push(post);
          pairCell.count += 1;
          pairCell.weightCount += 1;
          post.tagCellKey = pairKey;
        } else {
          post.tagCellKey = pickPrimaryTag(post);
        }
      });
      view.derivedTags = Array.from(derivedTagMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      view.derivedTags.forEach((cell) => {
        cell.latestPost = pickLatestPost(cell.posts);
      });
      view.derivedTagMap = derivedTagMap;
    }

    if (view.mode === "category") {
      view.cells = view.categories.concat(view.derivedCategories);
      view.cellMap = new Map([...categoryMap, ...derivedMap]);
      view.posts.forEach((post) => {
        post.cellKey = post.categoryCellKey || post.categoryKey;
      });
    } else {
      view.cells = view.tags.concat(view.derivedTags);
      view.cellMap = new Map([...tagMap, ...view.derivedTagMap]);
      view.posts.forEach((post) => {
        post.cellKey = post.tagCellKey || pickPrimaryTag(post);
      });
    }
  }

  function pickPrimaryTag(post) {
    if (!post.tagKeys.length) return UNTAGGED_KEY;
    return post.tagKeys[0];
  }

  function pickDominantCategory(counts) {
    if (!counts || !counts.size) return null;
    let bestKey = null;
    let bestCount = -1;
    counts.forEach((count, key) => {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    });
    return bestKey;
  }

  function pickLatestPost(list) {
    if (!list || !list.length) return null;
    return list
      .slice()
      .sort((a, b) => {
        if (b.dateValue !== a.dateValue) return b.dateValue - a.dateValue;
        const titleCmp = (a.title || "").localeCompare(b.title || "");
        if (titleCmp !== 0) return titleCmp;
        return String(a.key || "").localeCompare(String(b.key || ""));
      })[0];
  }

  (function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const pairMatch = resolvePairFilter(params.get("pair"));
    if (pairMatch) {
      view.mode = "tag";
      view.filterPairKey = makePairKey(pairMatch.keyA, pairMatch.keyB);
      view.filterPairNames = [
        allCategoryNames.get(pairMatch.keyA),
        allCategoryNames.get(pairMatch.keyB),
      ];
    } else {
      const match = resolveCategoryFilter(params.get("category"));
      if (match) {
        view.mode = "tag";
        view.filterCategoryKey = match.key;
        view.filterCategoryName = match.name;
      }
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
    const baseCells = view.cells.filter((cell) => !cell.isDerived);
    const derivedCells = view.cells.filter((cell) => cell.isDerived);
    const rankedCells = view.cells
      .slice()
      .sort((a, b) => {
        const countA = a.count || 0;
        const countB = b.count || 0;
        if (countB !== countA) return countB - countA;
        return String(a.key || "").localeCompare(String(b.key || ""));
      });
    const rankMap = new Map();
    rankedCells.forEach((cell, idx) => {
      rankMap.set(cell.key, idx);
    });
    const rankDenom = Math.max(1, rankedCells.length - 1);
    const weightScale = baseSpacing * 1.2;

    function rankWeight(cell) {
      const rank = rankMap.has(cell.key) ? rankMap.get(cell.key) : rankDenom;
      const t = 1 - rank / rankDenom;
      return 0.4 + 0.6 * t;
    }

    baseCells.forEach((cell) => {
      const rng = makeRng(hash32(cell.key));
      const weight = rankWeight(cell);
      cell.x = margin + rng() * w;
      cell.y = margin + rng() * h;
      cell.weight = weight;
      cell.weightValue = weightScale * weight;
    });

    const iterations = 80;
    const cx = state.width / 2;
    const cy = state.height / 2;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < baseCells.length; i++) {
        const a = baseCells[i];
        for (let j = i + 1; j < baseCells.length; j++) {
          const b = baseCells[j];
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
      baseCells.forEach((cell) => {
        cell.x += (cx - cell.x) * 0.003;
        cell.y += (cy - cell.y) * 0.003;
        cell.x = clamp(cell.x, margin, state.width - margin);
        cell.y = clamp(cell.y, margin, state.height - margin);
      });
    }

    const parentMap = view.mode === "tag" ? view.tagMap : view.categoryMap;
    derivedCells.forEach((cell) => {
      const parentA = cell.pairKeys ? parentMap.get(cell.pairKeys[0]) : null;
      const parentB = cell.pairKeys ? parentMap.get(cell.pairKeys[1]) : null;
      if (parentA && parentB) {
        const midX = (parentA.x + parentB.x) * 0.5;
        const midY = (parentA.y + parentB.y) * 0.5;
        let dx = parentB.x - parentA.x;
        let dy = parentB.y - parentA.y;
        let dist = Math.hypot(dx, dy);
        if (!dist) dist = 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const offset = clamp(dist * 0.12, 10, 44);
        const sign = hash32("offset|" + cell.key) % 2 ? 1 : -1;
        cell.x = clamp(midX + nx * offset * sign, margin, state.width - margin);
        cell.y = clamp(midY + ny * offset * sign, margin, state.height - margin);
      } else {
        const rng = makeRng(hash32(cell.key));
        cell.x = margin + rng() * w;
        cell.y = margin + rng() * h;
      }
      const weight = rankWeight(cell);
      cell.weight = weight;
      cell.weightValue = weightScale * weight * 0.7;
    });
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

      if (view.mode === "category") {
        const centroid = cell.centroid || { x: cell.x, y: cell.y };
        const bounds =
          cell.poly && cell.poly.length
            ? polygonBounds(cell.poly)
            : {
                x: state.margin,
                y: state.margin,
                w: state.width - state.margin * 2,
                h: state.height - state.margin * 2,
              };
        const usableW = Math.max(24, bounds.w * 0.82);
        const usableH = Math.max(20, bounds.h * 0.4);
        let fontSize = clamp(
          Math.sqrt(cell.area || 1) * 0.18 * scale,
          18,
          180
        );
        if (cell.isDerived) {
          fontSize *= 0.72;
        }
        fontSize = Math.min(fontSize, usableH);
        ctx.font = fontSize + 'px "Share Tech Mono", monospace';
        let w = ctx.measureText(label).width;
        if (w > usableW) {
          fontSize = Math.max(12, Math.floor(fontSize * (usableW / w)));
          ctx.font = fontSize + 'px "Share Tech Mono", monospace';
          w = ctx.measureText(label).width;
        }
        if (fontSize < 12 || usableW < 36 || usableH < 18) {
          cell.label = label;
          cell.labelWidth = w;
          cell.labelSize = fontSize;
          cell.labelRect = null;
          return;
        }

        const cx = clamp(
          centroid.x,
          bounds.x + w / 2,
          bounds.x + bounds.w - w / 2
        );
        const cy = clamp(
          centroid.y,
          bounds.y + fontSize / 2,
          bounds.y + bounds.h - fontSize / 2
        );
        cell.label = label;
        cell.labelWidth = w;
        cell.labelSize = fontSize;
        cell.labelX = cx;
        cell.labelY = cy;
        cell.labelRect = {
          x: cx - w / 2,
          y: cy - fontSize / 2,
          w: w,
          h: fontSize,
        };
        return;
      }

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
      if ((cell.area || 0) < 900) {
        cell.label = label;
        cell.labelWidth = w;
        cell.labelSize = cellSize;
        cell.labelRect = null;
        return;
      }
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
        if (tagSize < 10 || tag.orbit < 12) {
          tag.label = label;
          tag.labelWidth = w;
          tag.labelSize = tagSize;
          tag.labelRect = null;
          return;
        }
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
    if (view.mode === "tag" && (view.filterCategoryName || view.filterPairNames)) {
      const badgeLabel = view.filterPairNames
        ? "Overlap: " + view.filterPairNames.join(" + ")
        : "Category: " + view.filterCategoryName;
      const badge = badgeLabel.toUpperCase();
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
        colors: categoryColors(view.filterBase || view.filterCategoryKey || "category"),
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
    const postSize = Math.max(11, Math.round(13 * scale));
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
      const label = truncateLabel(post.title || "Untitled", 60);
      ctx.font = postSize + 'px "Share Tech Mono", monospace';
      const w = ctx.measureText(label).width;
      const paddingX = postSize * 0.45;
      const paddingY = postSize * 0.3;
      const rectW = w + paddingX * 2;
      const rectH = postSize + paddingY * 2;
      const cell = view.cellMap.get(post.cellKey);
      const hideLabel = cell && cell.area && cell.area < 700;
      post.labelHidden = hideLabel;
      if (hideLabel) {
        post.label = label;
        post.labelWidth = w;
        post.labelSize = postSize;
        post.labelRect = null;
        return;
      }
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

  function getElementCenter(el) {
    if (!el || !shell) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    return {
      x: rect.left - shellRect.left + rect.width / 2,
      y: rect.top - shellRect.top + rect.height / 2,
    };
  }

  function setHotspotRect(el, rect) {
    el.style.left = rect.x + "px";
    el.style.top = rect.y + "px";
    el.style.width = rect.w + "px";
    el.style.height = rect.h + "px";
  }

  function clampRect(rect) {
    const pad = 6;
    return {
      x: clamp(rect.x, pad, state.width - rect.w - pad),
      y: clamp(rect.y, pad, state.height - rect.h - pad),
      w: rect.w,
      h: rect.h,
    };
  }

  function getCellHotspotRect(cell) {
    if (cell.labelRect) return clampRect(cell.labelRect);
    const center = cell.safePoint || cell.centroid || { x: cell.x, y: cell.y };
    const size = clamp(Math.sqrt(cell.area || 1) * 0.22, 60, 160);
    return clampRect({
      x: center.x - size / 2,
      y: center.y - size / 3,
      w: size,
      h: size * 0.55,
    });
  }

  function getPostHotspotRect(post) {
    if (post.labelRect) return clampRect(post.labelRect);
    const size = clamp(post.radius * 2.8, 16, 28);
    return clampRect({
      x: post.x - size / 2,
      y: post.y - size / 2,
      w: size,
      h: size,
    });
  }

  function formatList(list, joiner) {
    return (list || []).filter(Boolean).join(joiner || ", ");
  }

  function buildPostLines(post) {
    const lines = [];
    if (post.categories && post.categories.length) {
      const label = post.categories.length > 1 ? "Categories" : "Category";
      lines.push(label + ": " + formatList(post.categories, " / "));
    }
    if (post.tags && post.tags.length) {
      const label = post.tags.length > 1 ? "Tags" : "Tag";
      lines.push(label + ": " + formatList(post.tags, ", "));
    }
    const timeParts = [];
    const dateText = post.dateDisplay || post.date || "";
    const readText =
      post.readingTimeDisplay ||
      (post.readingTime ? post.readingTime + " min read" : "");
    if (dateText) timeParts.push(dateText);
    if (readText) timeParts.push(readText);
    if (timeParts.length) lines.push(timeParts.join(" - "));
    return lines;
  }

  function setTooltipContent(title, lines) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = "";
    const titleEl = document.createElement("div");
    titleEl.className = "gg-tooltip-title";
    titleEl.textContent = title;
    tooltipEl.appendChild(titleEl);
    (lines || []).forEach((line) => {
      const row = document.createElement("div");
      row.className = "gg-tooltip-meta";
      row.textContent = line;
      tooltipEl.appendChild(row);
    });
  }

  function positionTooltip(x, y) {
    if (!tooltipEl || !shell) return;
    const pad = 12;
    const maxX = shell.clientWidth - tooltipEl.offsetWidth - pad;
    const maxY = shell.clientHeight - tooltipEl.offsetHeight - pad;
    const left = clamp(x + 14, pad, maxX);
    const top = clamp(y + 14, pad, maxY);
    tooltipEl.style.left = left + "px";
    tooltipEl.style.top = top + "px";
  }

  function showTooltip(title, lines, x, y) {
    if (!tooltipEl) return;
    setTooltipContent(title, lines);
    tooltipEl.classList.add("is-visible");
    tooltipEl.setAttribute("aria-hidden", "false");
    positionTooltip(x, y);
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove("is-visible");
    tooltipEl.setAttribute("aria-hidden", "true");
  }

  function showTooltipForPost(post, pos) {
    const lines = buildPostLines(post);
    showTooltip(post.title || "Untitled", lines, pos.x, pos.y);
  }

  function showTooltipForCell(cell, pos) {
    if (cell.isDerived) {
      const names = cell.pairNames || [cell.name];
      const title = "Overlap: " + names.join(" + ");
      showTooltip(title, ["Posts: " + cell.count], pos.x, pos.y);
      return;
    }
    const lines = [];
    if (view.mode === "tag") {
      const latest = cell.latestPost ? "Latest: " + cell.latestPost.title : null;
      if (latest) lines.push(latest);
      lines.push("Posts: " + cell.count);
      showTooltip("Tag: #" + cell.name, lines, pos.x, pos.y);
      return;
    }
    lines.push("Posts: " + cell.count);
    showTooltip("Category: " + cell.name, lines, pos.x, pos.y);
  }

  function showTooltipForTag(tag, pos) {
    const lines = [];
    const latest = tag.latestPost ? "Latest: " + tag.latestPost.title : null;
    if (latest) lines.push(latest);
    lines.push("Posts: " + tag.count);
    showTooltip("Tag: #" + tag.name, lines, pos.x, pos.y);
  }

  function updateTooltipFromHover(pos) {
    if (!tooltipEl || !pos) return;
    if (hoveredPost) {
      showTooltipForPost(hoveredPost, pos);
      return;
    }
    if (view.mode === "category" && hoveredTag) {
      showTooltipForTag(hoveredTag, pos);
      return;
    }
    if (hoveredCell) {
      showTooltipForCell(hoveredCell, pos);
      return;
    }
    hideTooltip();
  }

  function syncHotspots() {
    if (!hotspotsEl) return;
    const frag = document.createDocumentFragment();

    view.cells.forEach((cell) => {
      const rect = getCellHotspotRect(cell);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gg-hotspot gg-hotspot-cell";
      if (cell.isDerived) button.classList.add("is-derived");
      setHotspotRect(button, rect);
      if (view.mode === "tag") {
        const latest = cell.latestPost ? ", latest: " + cell.latestPost.title : "";
        button.setAttribute("aria-label", "Tag " + cell.name + ", " + cell.count + " posts" + latest);
      } else if (cell.isDerived) {
        button.setAttribute(
          "aria-label",
          "Overlap " + cell.name + ", " + cell.count + " posts"
        );
      } else {
        button.setAttribute(
          "aria-label",
          "Category " + cell.name + ", " + cell.count + " posts"
        );
      }
      button.addEventListener("focus", () => {
        hoveredPost = null;
        hoveredTag = null;
        hoveredCell = cell;
        showTooltipForCell(cell, getElementCenter(button));
      });
      button.addEventListener("blur", () => {
        hoveredCell = null;
        hideTooltip();
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (view.mode === "category") {
          applyCategoryFilter(cell);
        } else {
          openLatestPostForTag(cell, false);
        }
      });
      frag.appendChild(button);
    });

    if (view.categoryBadge && view.categoryBadge.rect) {
      const badgeButton = document.createElement("button");
      badgeButton.type = "button";
      badgeButton.className = "gg-hotspot gg-hotspot-badge";
      setHotspotRect(badgeButton, clampRect(view.categoryBadge.rect));
      badgeButton.setAttribute("aria-label", "Back to categories");
      badgeButton.addEventListener("focus", () => {
        hoveredPost = null;
        hoveredTag = null;
        hoveredCell = null;
        const center = getElementCenter(badgeButton);
        showTooltip("Back to categories", [], center.x, center.y);
      });
      badgeButton.addEventListener("blur", () => {
        hideTooltip();
      });
      badgeButton.addEventListener("click", (event) => {
        event.preventDefault();
        clearCategoryFilter();
      });
      frag.appendChild(badgeButton);
    }

    view.posts.forEach((post) => {
      if (!post.url) return;
      const rect = getPostHotspotRect(post);
      const link = document.createElement("a");
      link.className = "gg-hotspot gg-hotspot-post";
      link.href = post.url;
      setHotspotRect(link, rect);
      const ariaParts = [post.title || "Untitled"];
      if (post.categories && post.categories.length) {
        ariaParts.push("Categories: " + formatList(post.categories, " / "));
      }
      if (post.tags && post.tags.length) {
        ariaParts.push("Tags: " + formatList(post.tags, ", "));
      }
      if (post.dateDisplay) ariaParts.push(post.dateDisplay);
      if (post.readingTimeDisplay) ariaParts.push(post.readingTimeDisplay);
      link.setAttribute("aria-label", ariaParts.join(". "));
      link.addEventListener("focus", () => {
        hoveredPost = post;
        hoveredTag = null;
        hoveredCell = null;
        showTooltipForPost(post, getElementCenter(link));
      });
      link.addEventListener("blur", () => {
        hoveredPost = null;
        hideTooltip();
      });
      frag.appendChild(link);
    });

    hotspotsEl.textContent = "";
    hotspotsEl.appendChild(frag);
  }

  function layout() {
    if (state.width <= 0 || state.height <= 0) return;
    seedCells();
    computeVoronoi();
    placePosts();
    computeTags();
    measureLabels();
    measurePostLabels();
    if (hotspotsEl) syncHotspots();
  }

  function startTransition() {
    if (prefersReducedMotion) return;
    state.transitionStart = performance.now();
    state.transitionActive = true;
  }

  function getTransitionAlpha() {
    if (!state.transitionActive) return 1;
    const elapsed = state.time - state.transitionStart;
    const t = clamp(elapsed / transitionMs, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    if (t >= 1) {
      state.transitionActive = false;
    }
    return eased;
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
    if (tooltipEl) hideTooltip();
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
    const base = post.labelRect || {
      x: post.x - rectW / 2,
      y: post.y - rectH / 2,
      w: rectW,
      h: rectH,
    };
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
    if (hoveredPost && hoveredPost.labelRect && !hoveredPost.labelHidden) {
      const expanded = getExpandedPostLabel(hoveredPost);
      if (pointInRect(x, y, expanded.rect)) return hoveredPost;
    }
    for (let i = view.posts.length - 1; i >= 0; i--) {
      const post = view.posts[i];
      if (post.labelRect && !post.labelHidden) {
        if (pointInRect(x, y, post.labelRect)) return post;
      }
    }
    for (let i = view.posts.length - 1; i >= 0; i--) {
      const post = view.posts[i];
      if (pointInCircle(x, y, post.x, post.y, post.radius + 4)) return post;
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

  function pointInCircle(x, y, cx, cy, r) {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  function findCellAt(x, y) {
    for (const cell of view.cells) {
      if (!cell.poly || !cell.poly.length) continue;
      if (pointInPolygon(x, y, cell.poly)) return cell;
    }
    return null;
  }

  function updateUrl(filter) {
    const url = new URL(window.location.href);
    if (filter && filter.type === "pair") {
      url.searchParams.set("pair", filter.key);
      url.searchParams.delete("category");
    } else if (filter && filter.type === "category") {
      url.searchParams.set("category", filter.name);
      url.searchParams.delete("pair");
    } else {
      url.searchParams.delete("category");
      url.searchParams.delete("pair");
    }
    window.history.pushState(null, "", url.toString());
  }

  function syncViewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const pairMatch = resolvePairFilter(params.get("pair"));
    if (pairMatch) {
      view.mode = "tag";
      view.filterPairKey = makePairKey(pairMatch.keyA, pairMatch.keyB);
      view.filterPairNames = [
        allCategoryNames.get(pairMatch.keyA),
        allCategoryNames.get(pairMatch.keyB),
      ];
      view.filterCategoryKey = null;
      view.filterCategoryName = null;
    } else {
      const match = resolveCategoryFilter(params.get("category"));
      if (match) {
        view.mode = "tag";
        view.filterCategoryKey = match.key;
        view.filterCategoryName = match.name;
        view.filterPairKey = null;
        view.filterPairNames = null;
      } else {
        view.mode = "category";
        view.filterCategoryKey = null;
        view.filterCategoryName = null;
        view.filterPairKey = null;
        view.filterPairNames = null;
      }
    }
    updateSearch(state.searchQuery);
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
  }

  function applyCategoryFilter(cell) {
    if (!cell) return;
    view.mode = "tag";
    if (cell.isDerived) {
      view.filterPairKey = cell.key;
      view.filterPairNames = cell.pairNames || null;
      view.filterCategoryKey = null;
      view.filterCategoryName = null;
      updateUrl({ type: "pair", key: cell.key });
    } else {
      view.filterCategoryKey = cell.key;
      view.filterCategoryName = cell.name;
      view.filterPairKey = null;
      view.filterPairNames = null;
      updateUrl({ type: "category", name: cell.name });
    }
    startTransition();
    updateSearch(state.searchQuery);
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
  }

  function clearCategoryFilter() {
    view.mode = "category";
    view.filterCategoryKey = null;
    view.filterCategoryName = null;
    view.filterPairKey = null;
    view.filterPairNames = null;
    startTransition();
    updateSearch(state.searchQuery);
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
    updateUrl(null);
  }

  function openLatestPostForTag(tag, openInNewTab) {
    if (!tag || !tag.latestPost || !tag.latestPost.url) return;
    if (openInNewTab) {
      window.open(tag.latestPost.url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = tag.latestPost.url;
    }
  }

  function drawCells(focusCell, fade) {
    const fadeScale = fade || 1;
    ctx.save();
    ctx.lineJoin = "round";
    view.cells.forEach((cell) => {
      if (!cell.poly || !cell.poly.length) return;
      const highlight = focusCell && focusCell.key === cell.key;
      const fill = highlight ? cell.colors.fillStrong : cell.colors.fill;
      const edge = highlight ? cell.colors.edgeStrong : cell.colors.edge;
      const alpha = (cell.isDerived ? 0.82 : 1) * fadeScale;

      tracePolygon(cell.poly);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fill();

      tracePolygon(cell.poly);
      ctx.strokeStyle = edge;
      ctx.lineWidth = highlight ? 1.9 : cell.isDerived ? 0.95 : 1.1;
      ctx.setLineDash(cell.isDerived ? [5, 10] : [8, 12]);
      ctx.lineDashOffset =
        -state.motionTime * (cell.isDerived ? 0.015 : 0.02) + (hash32(cell.key) % 60);
      ctx.stroke();
      ctx.setLineDash([]);

      tracePolygon(cell.poly);
      ctx.globalAlpha = (highlight ? 0.35 : cell.isDerived ? 0.12 : 0.16) * fadeScale;
      ctx.strokeStyle = cell.colors.glow;
      ctx.lineWidth = highlight ? 3.2 : 2.2;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawTagLinks(focusTag, focusPost, fade) {
    if (!state.queryActive) return;
    const focusTagKey = focusTag ? focusTag.key : null;
    const focusPostTags = focusPost ? new Set(focusPost.tagKeys) : null;
    const fadeScale = fade || 1;

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

      ctx.globalAlpha = alpha * fadeScale;
      ctx.strokeStyle = tag.colors.halo;
      ctx.lineWidth = tagActive ? 1.4 : 0.7;
      ctx.setLineDash([4, 12]);
      ctx.lineDashOffset = -state.motionTime * 0.03 + (hash32(tag.key) % 40);
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

        ctx.globalAlpha = linkAlpha * fadeScale;
        ctx.strokeStyle = tag.colors.link;
        ctx.lineWidth = tagActive ? 1.4 : 0.8;
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -state.motionTime * 0.05;
        ctx.beginPath();
        ctx.moveTo(tag.x, tag.y);
        ctx.quadraticCurveTo(cx, cy, post.x, post.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.globalAlpha = (tagActive ? 0.9 : 0.5) * fadeScale;
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

  function drawPostLabels(focusPost, focusCell, focusTag, fade) {
    const focusTagKey = focusTag ? focusTag.key : null;
    const fadeScale = fade || 1;
    ctx.save();
    for (const post of view.posts) {
      if (post.labelHidden && (!focusPost || post !== focusPost)) continue;
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
        alpha * fadeScale,
        post.labelWidth
      );
    }

    if (focusPost) {
      let alpha = 1;
      if (focusCell && focusPost.cellKey !== focusCell.key) alpha *= 0.14;
      if (focusTagKey && !focusPost.tagKeys.includes(focusTagKey)) alpha *= 0.14;
      const expanded = focusPost.labelRect
        ? {
            text: focusPost.label,
            rect: focusPost.labelRect,
            fontSize: focusPost.labelSize,
            textWidth: focusPost.labelWidth,
          }
        : getExpandedPostLabel(focusPost);
      const cell = view.cellMap.get(focusPost.cellKey);
      const color = cell ? cell.colors.label : "rgba(216, 226, 255, 0.9)";
      const stroke = cell ? cell.colors.edge : "rgba(72, 242, 227, 0.4)";
      drawLabel(
        expanded.text,
        expanded.rect,
        expanded.fontSize,
        color,
        stroke,
        alpha * fadeScale,
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
    ctx.fillStyle = "rgba(6, 10, 18, 0.85)";
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    roundRect(rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = color;
    ctx.fillText(label, rect.x + (rect.w - textWidth) / 2, rect.y + rect.h / 2);
    ctx.restore();
  }

  function drawCellLabel(label, rect, fontSize, color, alpha) {
    ctx.save();
    ctx.font = fontSize + 'px "Share Tech Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
  }

  function drawLabels(focusCell, focusTag, fade) {
    const fadeScale = fade || 1;
    ctx.save();
    view.cells.forEach((cell) => {
      if (!cell.labelRect) return;
      const highlight = focusCell && focusCell.key === cell.key;
      const active = !state.queryActive || (cell.activeCount || 0) > 0;
      if (view.mode === "category") {
        let alpha = highlight ? 0.45 : active ? 0.28 : 0.12;
        if (cell.isDerived) alpha *= 0.7;
        drawCellLabel(
          cell.label,
          cell.labelRect,
          cell.labelSize,
          cell.colors.label,
          alpha * fadeScale
        );
      } else {
        const alpha = highlight ? 0.95 : active ? 0.7 : 0.25;
        drawLabel(
          cell.label,
          cell.labelRect,
          cell.labelSize,
          cell.colors.label,
          cell.colors.edge,
          alpha * fadeScale,
          cell.labelWidth
        );
      }
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
          alpha * fadeScale,
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
        0.85 * fadeScale,
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
    const fade = getTransitionAlpha();

    drawCells(focusCell, fade);
    if (view.mode === "category") {
      drawTagLinks(focusTag, focusPost, fade);
    }
    drawPostLabels(focusPost, focusCell, focusTag, fade);
    drawLabels(focusCell, focusTag, fade);
  }

  function loop(ts) {
    state.time = ts || state.time + 16;
    state.motionTime = prefersReducedMotion ? 0 : state.time;
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
      updateTooltipFromHover(pos);
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
      hoveredPost = null;
      hoveredCell = null;
      hoveredTag = null;
      canvas.style.cursor = "pointer";
      showTooltip("Back to categories", [], pos.x, pos.y);
      return;
    }

    if (hoveredTag) {
      hoveredCell = null;
      canvas.style.cursor = "pointer";
      updateTooltipFromHover(pos);
      return;
    }

    const cellLabel = findLabelAt(view.cells, pos.x, pos.y);
    hoveredCell = cellLabel || findCellAt(pos.x, pos.y);

    if (hoveredCell) {
      canvas.style.cursor = "pointer";
      updateTooltipFromHover(pos);
      return;
    }

    canvas.style.cursor = "default";
    updateTooltipFromHover(pos);
  });

  canvas.addEventListener("mouseleave", () => {
    hoveredPost = null;
    hoveredCell = null;
    hoveredTag = null;
    canvas.style.cursor = "default";
    hideTooltip();
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
    if (view.mode === "tag") {
      const cell = findLabelAt(view.cells, pos.x, pos.y) || findCellAt(pos.x, pos.y);
      if (cell) {
        openLatestPostForTag(cell, false);
        return;
      }
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
      return;
    }
    if (view.mode === "tag") {
      const cell = findLabelAt(view.cells, pos.x, pos.y) || findCellAt(pos.x, pos.y);
      if (cell) {
        e.preventDefault();
        openLatestPostForTag(cell, true);
      }
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

