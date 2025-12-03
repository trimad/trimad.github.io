(function () {
  const canvas = document.getElementById('gg-canvas');
  const dataEl = document.getElementById('gg-data');
  const searchEl = document.getElementById('gg-search');
  if (!canvas || !dataEl) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  let dpr = window.devicePixelRatio || 1;

  function resize() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    if (typeof categories !== 'undefined' && categories.length) seedCategoryCenters();
  }

  let parsed = { nodes: [] };
  try {
    parsed = JSON.parse(dataEl.textContent || '{}');
  } catch (err) {
    console.error('GhostGraph: failed to parse data', err);
    return;
  }

  const normalizeList = (v) => {
    const clean = (s) => String(s).replace(/[\[\]'"]/g, '').trim().toLowerCase();
    if (Array.isArray(v)) return v.filter(Boolean).map(clean);
    if (typeof v === 'string') {
      return v.split(',').map(clean).filter(Boolean);
    }
    return [];
  };
  const tokenize = (str) => (str || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t && t.length >= 3);

  const nodes = (parsed.nodes || []).map((n) => {
    const tags = normalizeList(n.tags);
    const categories = normalizeList(n.categories);
    const cleanUrl = (n.url || '').toString().replace(/"/g, '').trim();
    const tokenSet = new Set([
      ...tokenize(n.title || ''),
      ...tags,
      ...categories
    ]);
    return {
      ...n,
      url: cleanUrl,
      tags,
      categories,
      tokens: tokenSet,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      visible: true,
      primary: categories[0] || 'uncategorized',
      renderRadius: 8.5
    };
  });

  if (!nodes.length) {
    console.warn('GhostGraph: no posts found to render');
    return;
  }

  const palette = [
    '#00fff7', '#b000e0', '#ff6fb7', '#7df2ff', '#aaf96d',
    '#ffcc66', '#7cc7ff', '#f196f0', '#8ef0ff', '#ff9f43'
  ];

  const categories = Array.from(new Set(nodes.flatMap(n => (n.categories && n.categories.length) ? n.categories : ['uncategorized'])));
  const colorByCategory = new Map();
  categories.forEach((cat, i) => colorByCategory.set(cat, palette[i % palette.length]));
  let queryActive = false;

  // category cluster centers on a ring
  const catCenters = new Map();
  function seedCategoryCenters() {
    catCenters.clear();
    const radius = Math.min(width, height) * 0.35;
    const cx = width / 2;
    const cy = height / 2;
    categories.forEach((cat, idx) => {
      const angle = (idx / Math.max(1, categories.length)) * Math.PI * 2;
      catCenters.set(cat, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      });
    });
  }
  // initial sizing and category layout
  resize();
  seedCategoryCenters();
  window.addEventListener('resize', resize);

  // seed nodes near their category center
  (function seedPositions() {
    nodes.forEach(n => {
      const center = catCenters.get(n.primary) || { x: width / 2, y: height / 2 };
      const jitterR = 40 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      n.x = center.x + Math.cos(angle) * jitterR;
      n.y = center.y + Math.sin(angle) * jitterR;
    });
  })();

  function sharedTag(a, b) {
    const tagsA = new Set(a.tags || []);
    const tagsB = new Set(b.tags || []);
    for (const t of tagsA) {
      if (tagsB.has(t)) return t;
    }
    return null;
  }

  function tagColor(tag) {
    if (!tag) return 'rgba(0, 255, 247, 0.26)';
    // lightweight hash to hue
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = (hash << 5) - hash + tag.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsla(${hue}, 70%, 60%, 0.5)`;
  }

  let edges = [];
  function rebuildEdges() {
    edges = [];
    const tagMap = new Map();
    nodes.forEach(n => {
      (n.tags || []).forEach(t => {
        const key = t || '__untagged__';
        if (!tagMap.has(key)) tagMap.set(key, []);
        tagMap.get(key).push(n);
      });
    });

    const maxPerTag = 120;
    for (const [tag, list] of tagMap) {
      if (list.length < 2) continue;
      // shuffle lightly to vary hubs
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      const hub = shuffled[0];
      let count = 0;
      for (let i = 1; i < shuffled.length && count < maxPerTag; i++) {
        edges.push({ source: hub, target: shuffled[i], tag });
        count++;
      }
      // connect a few neighbor pairs for shape
      for (let i = 1; i < shuffled.length - 1 && count < maxPerTag; i++) {
        edges.push({ source: shuffled[i], target: shuffled[i + 1], tag });
        count++;
      }
    }

    // minimal category connectors if a category has no tag edges
    const catBuckets = new Map();
    nodes.forEach(n => {
      const key = n.primary || 'uncategorized';
      if (!catBuckets.has(key)) catBuckets.set(key, []);
      catBuckets.get(key).push(n);
    });
    for (const [cat, list] of catBuckets) {
      if (list.length < 2) continue;
      const hasEdges = edges.some(e => e.source.primary === cat || e.target.primary === cat);
      if (hasEdges) continue;
      // connect in a simple chain for visibility
      for (let i = 0; i < list.length - 1 && i < 30; i++) {
        edges.push({ source: list[i], target: list[i + 1], tag: `cat:${cat}` });
      }
    }
    // if still empty (e.g., no tags), make a loose ring to show something
    if (!edges.length && nodes.length > 1) {
      for (let i = 0; i < nodes.length; i++) {
        edges.push({ source: nodes[i], target: nodes[(i + 1) % nodes.length], tag: 'fallback' });
      }
    }

    // annotate multi-edges for bezier offsets
    const groups = new Map();
    edges.forEach(e => {
      const a = e.source.id || e.source.title || 'a';
      const b = e.target.id || e.target.title || 'b';
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });
    groups.forEach(list => {
      list.forEach((e, idx) => {
        e.multiIndex = idx;
        e.multiTotal = list.length;
      });
    });
  }
  rebuildEdges();

  function similarityToQuery(nodeTokens, queryTokens) {
    if (!queryTokens.size) return 0;
    let hits = 0;
    for (const qt of queryTokens) {
      // fuzzy substring match against any node token
      let matched = false;
      for (const nt of nodeTokens) {
        if (nt === qt) {
          matched = true;
          break;
        }
        // allow prefix matches only when the shorter term is reasonably long to avoid "ai" matching "gmail"
        if (qt.length >= 3 && nt.startsWith(qt)) {
          matched = true;
          break;
        }
        if (nt.length >= 3 && qt.startsWith(nt)) {
          matched = true;
          break;
        }
      }
      if (matched) hits++;
    }
    return hits / queryTokens.size;
  }

  function applyForces() {
    const repulsion = 1200;
    const spring = 0.01;
    const linkDistance = 240;
    const damping = 0.9;
    const maxVel = 2.8;
    const margin = 24;
    const minX = margin;
    const maxX = width - margin;
    const minY = margin;
    const maxY = height - margin;

    // repulsion
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      if (!n1.visible) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        if (!n2.visible) continue;
        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let dist2 = dx * dx + dy * dy + 0.01;
        let force = repulsion / dist2;
        let dist = Math.sqrt(dist2);
        dx /= dist;
        dy /= dist;
        n1.vx += dx * force;
        n1.vy += dy * force;
        n2.vx -= dx * force;
        n2.vy -= dy * force;
      }
    }

    // springs
    for (const e of edges) {
      if (!e.source.visible || !e.target.visible) continue;
      const dx = e.target.x - e.source.x;
      const dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const diff = dist - linkDistance;
      const force = spring * diff;
      const nx = dx / dist;
      const ny = dy / dist;
      e.source.vx += nx * force;
      e.source.vy += ny * force;
      e.target.vx -= nx * force;
      e.target.vy -= ny * force;
    }

    // center gravity and move within golden box
    for (const n of nodes) {
      if (!n.visible) continue;
      const center = catCenters.get(n.primary) || { x: width / 2, y: height / 2 };
      n.vx += (center.x - n.x) * 0.001;
      n.vy += (center.y - n.y) * 0.001;
      n.vx *= damping;
      n.vy *= damping;
      // clamp velocity
      const speed2 = n.vx * n.vx + n.vy * n.vy;
      if (speed2 > maxVel * maxVel) {
        const scale = maxVel / Math.sqrt(speed2);
        n.vx *= scale;
        n.vy *= scale;
      }
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(minX, Math.min(maxX, n.x));
      n.y = Math.max(minY, Math.min(maxY, n.y));
    }

    // recenter & rescale visible nodes to occupy ~61.8% of viewport
    const visibleNodes = nodes.filter(n => n.visible);
    if (visibleNodes.length) {
      let minVX = Infinity, maxVX = -Infinity, minVY = Infinity, maxVY = -Infinity;
      // measure label widths for padding
      ctx.font = '14px "Share Tech Mono", monospace';
      visibleNodes.forEach(n => {
        const label = (n.title || '').replace(/["']/g, '');
        const w = ctx.measureText(label).width;
        const h = 14;
        const padX = w / 2 + 12;
        const padY = h / 2 + 12;
        minVX = Math.min(minVX, n.x - padX);
        maxVX = Math.max(maxVX, n.x + padX);
        minVY = Math.min(minVY, n.y - padY);
        maxVY = Math.max(maxVY, n.y + padY);
      });

      // if no labels measured, fallback to positions
      visibleNodes.forEach(n => {
        if (!isFinite(minVX)) minVX = n.x;
        if (!isFinite(maxVX)) maxVX = n.x;
        if (!isFinite(minVY)) minVY = n.y;
        if (!isFinite(maxVY)) maxVY = n.y;
      });

      const pad = 20;
      const spanX = Math.max(1, maxVX - minVX);
      const spanY = Math.max(1, maxVY - minVY);
      const targetW = width * 0.618;
      const targetH = height * 0.618;
      const scale = Math.min(targetW / (spanX + pad), targetH / (spanY + pad), 2.0);

      const cx = (minVX + maxVX) / 2;
      const cy = (minVY + maxVY) / 2;
      const targetCX = width / 2;
      const targetCY = height / 2;

      visibleNodes.forEach(n => {
        const nx = (n.x - cx) * scale + targetCX;
        const ny = (n.y - cy) * scale + targetCY;
        n.x = Math.max(minX, Math.min(maxX, nx));
        n.y = Math.max(minY, Math.min(maxY, ny));
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    ctx.lineWidth = 1.2;
    for (const e of edges) {
      if (!e.source.visible || !e.target.visible) continue;
      ctx.strokeStyle = tagColor(e.tag);
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 4;
      const sx = e.source.x, sy = e.source.y;
      const tx = e.target.x, ty = e.target.y;
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const px = -dy / dist;
      const py = dx / dist;
      const offset = (e.multiTotal > 1)
        ? (e.multiIndex - (e.multiTotal - 1) / 2) * 42
        : 0;
      const cx = (sx + tx) / 2 + px * offset;
      const cy = (sy + ty) / 2 + py * offset;

      ctx.beginPath();
      if (offset === 0) {
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
      } else {
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, tx, ty);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // edge label at curve mid
      const tagLabel = String(e.tag || '').replace(/^cat:/, '').replace(/["']/g, '');
      if (tagLabel) {
        const qx = 0.25 * sx + 0.5 * cx + 0.25 * tx;
        const qy = 0.25 * sy + 0.5 * cy + 0.25 * ty;
        ctx.save();
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.fillStyle = 'rgba(216, 226, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagLabel, qx, qy);
        ctx.restore();
      }
    }

    // category backdrops
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '64px "Orbitron", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    categories.forEach(cat => {
      // compute centroid of visible nodes in this category
      let sumX = 0, sumY = 0, count = 0;
      nodes.forEach(n => {
        if (n.visible && n.primary === cat) {
          sumX += n.x;
          sumY += n.y;
          count++;
        }
      });
      if (!count) return; // skip labels when a category has been fully pruned
      const center = { x: sumX / count, y: sumY / count };
      const label = String(cat || '').replace(/["']/g, '').toUpperCase();
      ctx.fillText(label, center.x, center.y);
    });
    ctx.restore();

    for (const n of nodes) {
      if (!n.visible) continue;
      const color = colorByCategory.get(n.primary) || '#00fff7';
      const r = n.renderRadius || 8.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.stroke();

      // label
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      const title = (n.title || '').replace(/["']/g, '');
      const angle = Math.atan2(n.y - cy, n.x - cx);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const baseOffset = r + 8;

      ctx.font = '14px "Share Tech Mono", monospace';
      ctx.fillStyle = 'rgba(216, 226, 255, 0.92)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(title);
      const w = metrics.width;
      const h = 14; // approximate line height
      const labelX = n.x + dx * (baseOffset + w / 2 + 4);
      const labelY = n.y + dy * (baseOffset + h / 2 + 4);
      ctx.fillText(title, labelX, labelY);

      ctx.shadowBlur = 0;
    }
  }

  function loop() {
    applyForces();
    draw();
    requestAnimationFrame(loop);
  }
  loop();

  if (searchEl) {
    let queryTokens = new Set();
    searchEl.addEventListener('input', (e) => {
      const q = (e.target.value || '').toLowerCase().trim();
      const terms = q.split(/\s+/).filter(Boolean);
      queryTokens = new Set(terms);
      queryActive = terms.length > 0;
      if (!terms.length) {
        nodes.forEach(n => {
          n.visible = true;
          n.renderRadius = 8.5;
        });
        rebuildEdges();
        return;
      }
      nodes.forEach(n => {
        const sim = similarityToQuery(n.tokens, queryTokens);
        n.visible = sim > 0;
        if (n.visible) {
          const base = 6;
          const boost = Math.min(16, sim * 20);
          n.renderRadius = base + boost;
        }
      });
      rebuildEdges();
    });
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    let closest = null;
    let minDist = 9999;
    for (const n of nodes) {
      if (!n.visible) continue;
      const dx = n.x - x;
      const dy = n.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = n;
      }
    }
    if (closest && minDist < 14 && closest.url) {
      window.location.href = closest.url;
    }
  });

  // simple HUD for debugging visibility
  const hud = document.createElement('div');
  hud.style.position = 'fixed';
  hud.style.left = '12px';
  hud.style.bottom = '12px';
  hud.style.padding = '6px 10px';
  hud.style.borderRadius = '8px';
  hud.style.background = 'rgba(5, 8, 15, 0.75)';
  hud.style.color = '#9ab6ff';
  hud.style.font = '12px "Share Tech Mono", monospace';
  hud.style.pointerEvents = 'none';
  document.body.appendChild(hud);

  function updateHud() {
    const visibleNodes = nodes.filter(n => n.visible).length;
    const visibleEdges = edges.filter(e => e.source.visible && e.target.visible).length;
    hud.textContent = `Nodes: ${visibleNodes}/${nodes.length} • Edges: ${visibleEdges}/${edges.length}`;
  }
  updateHud();
  setInterval(updateHud, 800);
})();
