/* GhostGraph — Pure Force-Directed Layout (auto-tuned for any node count)
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

  // ----------------------------
  // Canvas sizing (DPR-safe)
  // ----------------------------
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  let dpr = window.devicePixelRatio || 1;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.scale(dpr, dpr);

    // Graph forces depend on size; retune on resize
    updateCategoryAnchors();
    rebuildEdges();
    retuneForGraph();
    reheat();
  }

  // ----------------------------
  // Parse + normalize data
  // ----------------------------
  let parsed = { nodes: [] };
  try {
    parsed = JSON.parse(dataEl.textContent || "{}");
  } catch (err) {
    console.error("GhostGraph: failed to parse data", err);
    return;
  }

  const cleanString = (s) =>
    String(s || "").replace(/[\[\]'"]/g, "").trim().toLowerCase();

  const normalizeList = (v) => {
    if (Array.isArray(v)) return v.filter(Boolean).map(cleanString);
    if (typeof v === "string") return v.split(",").map(cleanString).filter(Boolean);
    return [];
  };

  const tokenize = (str) =>
    (str || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t && t.length >= 2);

  // Stable 32-bit hash (FNV-1a-ish)
  function hash32(str) {
    str = String(str || "");
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const nodes = (parsed.nodes || []).map((n, idx) => {
    const tags = normalizeList(n.tags);
    const categories = normalizeList(n.categories);
    const cleanUrl = (n.url || "").toString().replace(/"/g, "").trim();

    const tokenSet = new Set([...tokenize(n.title || ""), ...tags, ...categories]);

    const key = n.id || n.slug || n.url || n.title || String(idx);

    return {
      ...n,
      _key: String(key),
      url: cleanUrl,
      tags,
      categories,
      tokens: tokenSet,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      visible: true,
      renderRadius: 8.5,
    };
  });

  if (!nodes.length) {
    console.warn("GhostGraph: no posts found to render");
    return;
  }

  // ----------------------------
  // Colors (layout is not category-based, but color is)
  // ----------------------------
  const hashHue = (str, offset = 0, span = 360) =>
    (hash32(str) % span + offset) % 360;

  const allCategories = Array.from(
    new Set(
      nodes.flatMap((n) =>
        n.categories && n.categories.length ? n.categories : ["uncategorized"]
      )
    )
  );

  const categoryHueMap = new Map();
  (function buildCategoryHues() {
    const cats = allCategories.length ? allCategories : ["uncategorized"];
    const count = cats.length;
    const step = count > 0 ? 360 / count : 360;
    // Start at a deterministic offset to avoid always beginning at pure red
    const offset = hashHue("category-offset", 0, 360);

    cats.forEach((cat, idx) => {
      const hue = (offset + idx * step) % 360;
      categoryHueMap.set(cat, hue);
    });
  })();

  const categoryAnchors = new Map();
  function updateCategoryAnchors() {
    categoryAnchors.clear();

    const cats = allCategories.length ? allCategories : ["uncategorized"];
    const cx = width / 2;
    const cy = height / 2;
    const ring = Math.min(width, height) * 0.34;

    cats.forEach((cat, idx) => {
      const baseAngle = (idx / Math.max(1, cats.length)) * Math.PI * 2;
      const wiggle = ((hash32("cat|" + cat) % 1000) / 1000 - 0.5) * 0.35;
      const theta = baseAngle + wiggle * (Math.PI / Math.max(2, cats.length));
      const radial = ring * (0.72 + ((hash32("cat-r|" + cat) % 1000) / 1000) * 0.18);
      categoryAnchors.set(cat, {
        x: cx + Math.cos(theta) * radial * 0.55,
        y: cy + Math.sin(theta) * radial * 0.55,
      });
    });
  }
  updateCategoryAnchors();

  const tagColorMap = new Map();
  function tagColor(tag) {
    const t = tag || "__untagged__";
    if (tagColorMap.has(t)) return tagColorMap.get(t);
    const hue = hashHue(t);
    const col = `hsl(${hue}, 80%, 62%)`;
    tagColorMap.set(t, col);
    return col;
  }

  // ----------------------------
  // Edges: deterministic, aesthetic, capped per tag (cap auto-scales with N)
  // ----------------------------
  let edges = [];

  function edgeCapForN(N) {
    // Small graphs can afford more per-tag connections; large graphs need stricter caps
    // ~12..28 range feels good; adjust if your tags are extremely broad.
    return Math.round(clamp(10 + Math.sqrt(N) * 1.6, 12, 28));
  }

  function rebuildEdges() {
    edges = [];

    const live = nodes.filter((n) => n.visible);
    if (live.length < 2) return;

    const EDGE_CAP_PER_TAG = edgeCapForN(live.length);

    const tagMap = new Map(); // tag -> nodes[]
    live.forEach((n) => {
      (n.tags || []).forEach((t) => {
        const tag = t || "__untagged__";
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag).push(n);
      });
    });

    // Merge multi-tag edges into a single edge with weight
    const merged = new Map(); // pairKey -> edge

    function addEdge(a, b, tag) {
      if (!a || !b || a === b) return;
      const ka = a._key;
      const kb = b._key;
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;

      const existing = merged.get(key);
      if (existing) {
        existing.weight += 1;
        if (tag) existing.tags.add(tag);
        return;
      }

      merged.set(key, {
        source: a,
        target: b,
        weight: 1,
        tags: new Set(tag ? [tag] : []),
      });
    }

    for (const [tag, list] of tagMap) {
      if (list.length < 2) continue;

      // Stable, deterministic order for this tag group
      const sorted = [...list].sort((a, b) => {
        const ha = hash32(tag + "|" + a._key);
        const hb = hash32(tag + "|" + b._key);
        return ha - hb;
      });

      // Cap to prevent big tags from creating hairballs
      const trimmed =
        sorted.length > EDGE_CAP_PER_TAG ? sorted.slice(0, EDGE_CAP_PER_TAG) : sorted;

      const m = trimmed.length;
      const makeRing = m <= 10;

      // chain (and ring for small sets)
      for (let i = 0; i < m - 1; i++) addEdge(trimmed[i], trimmed[i + 1], tag);
      if (makeRing) addEdge(trimmed[m - 1], trimmed[0], tag);

      // chords
      const step = Math.max(2, Math.round(Math.sqrt(m)));
      const chordCount = Math.min(5, Math.floor(m / 3));
      for (let i = 0; i < chordCount; i++) {
        addEdge(trimmed[i], trimmed[(i + step) % m], tag);
      }
    }

    // Fallback if no tags exist
    if (!merged.size) {
      const sorted = [...live].sort((a, b) => hash32(a._key) - hash32(b._key));
      for (let i = 0; i < sorted.length; i++) {
        addEdge(sorted[i], sorted[(i + 1) % sorted.length], "fallback");
      }
    }

    edges = Array.from(merged.values()).map((e) => {
      const tags = Array.from(e.tags);
      e.tag = tags[0] || "fallback";
      e.tags = tags;
      return e;
    });
  }

  // ----------------------------
  // Seed positions (wide spread based on N + viewport)
  // ----------------------------
  function seedPositions() {
    const live = nodes.filter((n) => n.visible);
    const N = Math.max(1, live.length);

    const cx = width / 2;
    const cy = height / 2;

    // k is the natural spacing length scale (bigger when N small, smaller when N large)
    const area = Math.max(1, width * height);
    const k = Math.sqrt(area / N);

    // Start wide: scale up from k, but keep within viewport
    const R = clamp(k * 6.8, Math.min(width, height) * 0.36, Math.min(width, height) * 0.78);

    nodes.forEach((n) => {
      const a = (hash32(n._key) / 0xffffffff) * Math.PI * 2;
      const r = (0.25 + (hash32("r|" + n._key) / 0xffffffff) * 0.75) * R;
      n.x = cx + Math.cos(a) * r;
      n.y = cy + Math.sin(a) * r;
      n.vx = 0;
      n.vy = 0;
    });
  }

  // ----------------------------
  // Force simulation (auto-tuned)
  // ----------------------------
  const sim = {
    alpha: 1.0,
    alphaMin: 0.015,
    alphaDecay: 0.022,

    charge: 1800,
    spring: 0.017,
    baseLink: 240,

    center: 0.0009,
    collide: 0.070,
    padding: 10,

    categoryPull: 0.012,

    fillTarget: 0.94,
    fillStrength: 0.0016,

    friction: 0.84,
    maxVel: 5.2,
    margin: 30,
  };

  function reheat() {
    sim.alpha = 1.0;
  }

  function retuneForGraph() {
    const live = nodes.filter((n) => n.visible);
    const N = Math.max(1, live.length);
    const area = Math.max(1, width * height);

    const k = Math.sqrt(area / N); // natural spacing scale

    // density hint
    const E = edges.length;
    const avgDegree = N > 0 ? (2 * E) / N : 0;

    // Distances + forces derived from k
    sim.baseLink = clamp(k * 1.45, 150, 460);
    sim.charge = clamp(k * k * 0.32, 1000, 9000);

    // Springs: slightly stronger as degree increases
    sim.spring = clamp(0.013 + avgDegree * 0.0009, 0.013, 0.030);

    // Center gravity: weaker with more nodes (prevents "balling up")
    sim.center = clamp(0.0014 / Math.sqrt(N), 0.00035, 0.0012);

    // Category gravity: keep category clusters cohesive without overpowering links
    sim.categoryPull = clamp(0.007 + (80 / (N + 80)) * 0.010, 0.007, 0.020);

    // Fill: small graphs should fill more of the viewport
    sim.fillTarget = clamp(0.90 + (60 / (N + 60)) * 0.06, 0.90, 0.98);
    sim.fillStrength = clamp(0.0016 + (80 / (N + 80)) * 0.0018, 0.0016, 0.0034);

    // Motion bounds
    sim.maxVel = clamp(4.6 + Math.log10(N + 10), 4.6, 6.4);
    sim.friction = clamp(0.86 - Math.log10(N + 10) * 0.02, 0.78, 0.86);

    // Collision padding: slightly more when sparse
    sim.padding = clamp(9 + (120 / (N + 120)) * 4, 9, 13);

    reheat();
  }

  // Interaction state
  let queryActive = false;
  let hoveredNode = null;
  let activeNode = null;
  let dragNode = null;
  let dragOffset = { x: 0, y: 0 };
  let dragStart = null;
  let dragMoved = false;

  function applyForces() {
    const live = nodes.filter((n) => n.visible);
    if (!live.length) return;

    const cx = width / 2;
    const cy = height / 2;

    // Pairwise: repulsion + collision
    for (let i = 0; i < live.length; i++) {
      const a = live[i];
      if (dragNode === a) continue;

      for (let j = i + 1; j < live.length; j++) {
        const b = live[j];
        if (dragNode === b) continue;

        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist2 = dx * dx + dy * dy + 0.01;
        let dist = Math.sqrt(dist2);

        const nx = dx / dist;
        const ny = dy / dist;

        // Charge
        const f = (sim.charge * sim.alpha) / dist2;
        a.vx += nx * f;
        a.vy += ny * f;
        b.vx -= nx * f;
        b.vy -= ny * f;

        // Collision
        const ra = (a.renderRadius || 8.5) + sim.padding;
        const rb = (b.renderRadius || 8.5) + sim.padding;
        const minDist = ra + rb;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const push = overlap * sim.collide * sim.alpha;
          a.vx += nx * push;
          a.vy += ny * push;
          b.vx -= nx * push;
          b.vy -= ny * push;
        }
      }
    }

    // Link springs
    for (const e of edges) {
      if (!e.source.visible || !e.target.visible) continue;
      if (dragNode === e.source || dragNode === e.target) continue;

      const a = e.source;
      const b = e.target;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

      const w = Math.min(6, e.weight || 1);
      const desired = Math.max(90, sim.baseLink - w * 14);
      const strength = sim.spring * (0.8 + w * 0.25) * sim.alpha;

      const diff = dist - desired;
      const nx = dx / dist;
      const ny = dy / dist;

      const fx = nx * diff * strength;
      const fy = ny * diff * strength;

      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Category clustering
    const catPull = sim.categoryPull * sim.alpha;
    if (catPull > 0) {
      for (const n of live) {
        if (dragNode === n) continue;
        const cats = n.categories && n.categories.length ? n.categories : ["uncategorized"];
        let tx = 0, ty = 0, count = 0;
        for (const c of cats) {
          const anchor = categoryAnchors.get(c) || { x: width / 2, y: height / 2 };
          tx += anchor.x;
          ty += anchor.y;
          count += 1;
        }
        if (count) {
          const ax = tx / count;
          const ay = ty / count;
          n.vx += (ax - n.x) * catPull;
          n.vy += (ay - n.y) * catPull;
        }
      }
    }

    // Viewport-fill force (force-based, not post-rescaling)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of live) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const bbCx = (minX + maxX) / 2;
    const bbCy = (minY + maxY) / 2;

    const targetX = width * sim.fillTarget;
    const targetY = height * sim.fillTarget;

    const needX = (targetX - spanX) / targetX; // + expand, - compress
    const needY = (targetY - spanY) / targetY;

    const fill = sim.fillStrength * sim.alpha;
    const fxScale = needX * fill;
    const fyScale = needY * fill;

    for (const n of live) {
      if (dragNode === n) continue;
      n.vx += (n.x - bbCx) * fxScale;
      n.vy += (n.y - bbCy) * fyScale;
    }

    // Integrate + mild centering + soft bounds
    const margin = sim.margin;
    const boundMinX = margin;
    const boundMaxX = width - margin;
    const boundMinY = margin;
    const boundMaxY = height - margin;

    for (const n of live) {
      if (dragNode === n) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }

      n.vx += (cx - n.x) * sim.center * sim.alpha;
      n.vy += (cy - n.y) * sim.center * sim.alpha;

      if (n.x < boundMinX) n.vx += (boundMinX - n.x) * 0.03 * sim.alpha;
      if (n.x > boundMaxX) n.vx -= (n.x - boundMaxX) * 0.03 * sim.alpha;
      if (n.y < boundMinY) n.vy += (boundMinY - n.y) * 0.03 * sim.alpha;
      if (n.y > boundMaxY) n.vy -= (n.y - boundMaxY) * 0.03 * sim.alpha;

      n.vx *= sim.friction;
      n.vy *= sim.friction;

      const s2 = n.vx * n.vx + n.vy * n.vy;
      if (s2 > sim.maxVel * sim.maxVel) {
        const scale = sim.maxVel / Math.sqrt(s2);
        n.vx *= scale;
        n.vy *= scale;
      }

      n.x += n.vx;
      n.y += n.vy;
    }

    sim.alpha = Math.max(sim.alphaMin, sim.alpha * (1 - sim.alphaDecay));
  }

  // ----------------------------
  // Rendering
  // ----------------------------
  function drawRoundedRect(x, y, w, h, r) {
    const radius = Math.max(4, Math.min(r, Math.min(w, h) / 2));
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

  function drawCategoryLabels() {
    const catBounds = new Map();
    for (const n of nodes) {
      if (!n.visible) continue;
      const cats = n.categories && n.categories.length ? n.categories : ["uncategorized"];
      const r = n.renderRadius || 8.5;
      for (const c of cats) {
        const b = catBounds.get(c) || {
          minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity,
        };
        b.minX = Math.min(b.minX, n.x - r);
        b.minY = Math.min(b.minY, n.y - r);
        b.maxX = Math.max(b.maxX, n.x + r);
        b.maxY = Math.max(b.maxY, n.y + r);
        catBounds.set(c, b);
      }
    }

    if (!catBounds.size) return;

    ctx.save();

    catBounds.forEach((b, cat) => {
      if (!Number.isFinite(b.minX) || !Number.isFinite(b.minY)) return;
      const pad = 26;
      const w = (b.maxX - b.minX) + pad * 2;
      const h = (b.maxY - b.minY) + pad * 2;
      const x = b.minX - pad;
      const y = b.minY - pad;

      const hue = categoryHueMap.get(cat) ?? hashHue(cat || "uncategorized");
      const fill = `hsla(${hue}, 75%, 62%, 0.01)`;
      const stroke = `hsla(${hue}, 80%, 55%, 0.35)`;
      const textCol = `hsl(${hue}, 85%, 65%)`;

      drawRoundedRect(x, y, w, h, 14);
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      const label = (cat || "uncategorized").toUpperCase();
      ctx.font = '24px "Share Tech Mono", monospace';
      ctx.fillStyle = textCol;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, x, y - 6);
    });

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Category backdrops behind edges/nodes
    drawCategoryLabels();

    // Edges
    for (const e of edges) {
      if (!e.source.visible || !e.target.visible) continue;

      const sx = e.source.x, sy = e.source.y;
      const tx = e.target.x, ty = e.target.y;

      const col = tagColor(e.tag);
      const w = Math.min(6, e.weight || 1);

      ctx.globalAlpha = queryActive ? 0.60 : 0.42;
      ctx.lineWidth = 0.95 + w * 0.08;

      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 2;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (queryActive) {
        const label = String(e.tag || "").replace(/^cat:/, "").replace(/["']/g, "");
        if (label) {
          ctx.save();
          ctx.globalAlpha = 0.72;
          ctx.font = '10px "Share Tech Mono", monospace';
          ctx.fillStyle = "rgba(216, 226, 255, 0.75)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, (sx + tx) / 2, (sy + ty) / 2);
          ctx.restore();
        }
      }
    }

    // Nodes
    ctx.globalAlpha = 1;
    const centerX = width / 2;
    const centerY = height / 2;

    for (const n of nodes) {
      if (!n.visible) continue;

      const isHover = hoveredNode === n;
      const isActive = activeNode === n;

      const rBase = n.renderRadius || 8.5;
      const r = isActive ? rBase * 1.25 : isHover ? rBase * 1.12 : rBase;

      const grad = ctx.createRadialGradient(
        n.x - r * 0.4, n.y - r * 0.4, r * 0.2,
        n.x, n.y, r
      );

      grad.addColorStop(0, "rgba(124, 255, 255, 0.95)");
      grad.addColorStop(0.55, "rgba(0, 205, 190, 0.80)");
      grad.addColorStop(1, "rgba(0, 24, 44, 0.55)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      if (queryActive) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.60)";
        ctx.shadowBlur = 2;

        const title = (n.title || "").replace(/["']/g, "");
        const angle = Math.atan2(n.y - centerY, n.x - centerX);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        ctx.font = '14px "Share Tech Mono", monospace';
        ctx.fillStyle = "rgba(216, 226, 255, 0.92)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const baseOffset = r + 10;
        ctx.fillText(title, n.x + dx * baseOffset, n.y + dy * baseOffset);

        ctx.restore();
      }
    }

    ctx.globalAlpha = 1;
  }

  // ----------------------------
  // Loop (idle-friendly)
  // ----------------------------
  function loop() {
    const stillHot = sim.alpha > sim.alphaMin + 0.001;
    const interacting = !!dragNode;

    if (stillHot || interacting) applyForces();
    draw();

    requestAnimationFrame(loop);
  }

  // ----------------------------
  // Search filtering
  // ----------------------------
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

  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      const q = (e.target.value || "").toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);
      const queryTokens = new Set(terms);
      queryActive = terms.length > 0;

      if (!terms.length) {
        nodes.forEach((n) => {
          n.visible = true;
          n.renderRadius = 8.5;
        });
        rebuildEdges();
        retuneForGraph();
        reheat();
        return;
      }

      nodes.forEach((n) => {
        const simScore = similarityToQuery(n.tokens, queryTokens);
        n.visible = simScore > 0;
        if (n.visible) {
          const base = 6;
          const boost = Math.min(16, simScore * 20);
          n.renderRadius = base + boost;
        }
      });

      rebuildEdges();
      retuneForGraph();
      reheat();
    });
  }

  (function prefillSearch() {
    if (!searchEl) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      searchEl.value = q;
      searchEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
  })();

  // ----------------------------
  // Interaction (hover/drag/click)
  // ----------------------------
  function findNodeAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    let closest = null;
    let minDist = Infinity;

    for (const n of nodes) {
      if (!n.visible) continue;
      const r = (n.renderRadius || 8.5) * 1.35;
      const dx = n.x - x;
      const dy = n.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r && dist < minDist) {
        minDist = dist;
        closest = n;
      }
    }
    return closest;
  }

  canvas.addEventListener("mousemove", (e) => {
    if (dragNode) {
      const rect = canvas.getBoundingClientRect();
      dragNode.x = e.clientX - rect.left + dragOffset.x;
      dragNode.y = e.clientY - rect.top + dragOffset.y;

      if (dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      }
      reheat();
      return;
    }

    hoveredNode = findNodeAt(e.clientX, e.clientY);
    canvas.style.cursor = hoveredNode ? "pointer" : "default";
  });

  canvas.addEventListener("mouseleave", () => {
    hoveredNode = null;
    activeNode = null;
    canvas.style.cursor = "default";
  });

  canvas.addEventListener("mousedown", (e) => {
    activeNode = findNodeAt(e.clientX, e.clientY);
    if (activeNode) {
      dragNode = activeNode;
      const rect = canvas.getBoundingClientRect();
      dragOffset.x = dragNode.x - (e.clientX - rect.left);
      dragOffset.y = dragNode.y - (e.clientY - rect.top);
      dragStart = { x: e.clientX, y: e.clientY };
      dragMoved = false;
      reheat();
    }
  });

  canvas.addEventListener("mouseup", () => {
    activeNode = null;
    dragNode = null;
    dragStart = null;
    reheat();
  });

  canvas.addEventListener("click", (e) => {
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    const node = findNodeAt(e.clientX, e.clientY);
    if (node && node.url) window.location.href = node.url;
  });

  canvas.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const node = findNodeAt(e.clientX, e.clientY);
    if (node && node.url) {
      e.preventDefault();
      window.open(node.url, "_blank");
    }
  });

  // ----------------------------
  // HUD (always on top)
  // ----------------------------
  const hud = document.createElement("div");
  hud.className = "gg-hud";
  hud.style.position = "fixed";
  hud.style.left = "12px";
  hud.style.bottom = "12px";
  hud.style.padding = "6px 10px";
  hud.style.borderRadius = "8px";
  hud.style.background = "rgba(5, 8, 15, 0.75)";
  hud.style.color = "#9ab6ff";
  hud.style.font = '12px "Share Tech Mono", monospace';
  hud.style.pointerEvents = "none";
  hud.style.zIndex = "2147483647";
  hud.style.isolation = "isolate";
  document.body.appendChild(hud);

  function updateHud() {
    const visibleNodes = nodes.filter((n) => n.visible).length;
    const visibleEdges = edges.filter((e) => e.source.visible && e.target.visible).length;
    hud.textContent =
      `Nodes: ${visibleNodes}/${nodes.length} • ` +
      `Edges: ${visibleEdges}/${edges.length} • ` +
      `cap/tag: ${edgeCapForN(Math.max(1, visibleNodes))} • ` +
      `α=${sim.alpha.toFixed(2)}`;
  }
  updateHud();
  setInterval(updateHud, 800);

  // ----------------------------
  // Init
  // ----------------------------
  resize();           // sets canvas and calls rebuildEdges/retune
  seedPositions();    // wide initial spread (needs width/height)
  rebuildEdges();
  retuneForGraph();
  reheat();

  window.addEventListener("resize", resize);
  loop();
})();