(() => {
  const debugEnabled = new URLSearchParams(window.location.search).has('debug');
  const debugEntries = new Map();
  let debugPanel = null;

  const renderDebug = () => {
    if (!debugEnabled || !debugPanel) {
      return;
    }
    const rows = Array.from(debugEntries.entries())
      .map(([key, value]) => `<div><strong>${key}</strong>: ${value}</div>`)
      .join('');
    debugPanel.innerHTML = rows || '<div><strong>debug</strong>: no data</div>';
  };

  const setDebug = (key, value) => {
    if (!debugEnabled) {
      return;
    }
    debugEntries.set(key, value);
    renderDebug();
  };

  const initDebugPanel = () => {
    if (!debugEnabled || !document.body) {
      return null;
    }
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.left = '16px';
    panel.style.bottom = '16px';
    panel.style.zIndex = '9999';
    panel.style.maxWidth = '360px';
    panel.style.maxHeight = '50vh';
    panel.style.overflow = 'auto';
    panel.style.padding = '10px 12px';
    panel.style.borderRadius = '8px';
    panel.style.border = '1px solid rgba(93, 242, 214, 0.4)';
    panel.style.background = 'rgba(6, 12, 18, 0.92)';
    panel.style.color = '#c1d2e6';
    panel.style.fontFamily = '"Chakra Petch", sans-serif';
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.4';
    panel.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.4)';
    panel.style.pointerEvents = 'auto';
    panel.setAttribute('data-sv-debug', 'true');
    document.body.appendChild(panel);
    return panel;
  };

  const showInlineError = (rootEl, message) => {
    if (!rootEl) {
      return;
    }
    const existing = rootEl.querySelector('[data-sv-error]');
    if (existing) {
      existing.textContent = message;
      return;
    }
    const box = document.createElement('div');
    box.setAttribute('data-sv-error', 'true');
    box.style.position = 'absolute';
    box.style.inset = '20px';
    box.style.display = 'flex';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
    box.style.border = '1px dashed rgba(255, 255, 255, 0.2)';
    box.style.borderRadius = '12px';
    box.style.color = '#e4f0ff';
    box.style.fontFamily = '"Chakra Petch", sans-serif';
    box.style.letterSpacing = '0.08em';
    box.style.textTransform = 'uppercase';
    box.style.fontSize = '0.8rem';
    box.style.background = 'rgba(6, 12, 18, 0.5)';
    box.textContent = message;
    rootEl.style.position = 'relative';
    rootEl.appendChild(box);
  };

  debugPanel = initDebugPanel();
  setDebug('build', 'sv-d3-debug-2026-01-15-03');

  const loadD3 = (onReady) => {
    if (window.d3) {
      setDebug('d3', true);
      onReady();
      return;
    }
    const cdnUrls = [
      'https://d3js.org/d3.v7.min.js',
      'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
      'https://unpkg.com/d3@7/dist/d3.min.js'
    ];
    let index = 0;

    const tryNext = () => {
      if (index >= cdnUrls.length) {
        setDebug('d3', false);
        setDebug('error', 'd3 failed to load from all CDNs');
        showInlineError(document.getElementById('voronoi-root'), 'd3 failed to load from all CDNs');
        return;
      }
      const url = cdnUrls[index];
      index += 1;
      setDebug('d3.cdn', url);
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => {
        setDebug('d3', true);
        onReady();
      };
      script.onerror = () => {
        tryNext();
      };
      document.head.appendChild(script);
    };

    tryNext();
  };

  const start = () => {
    const dataEl = document.getElementById('voronoi-data');
    const root = document.getElementById('voronoi-root');
    setDebug('dataEl', Boolean(dataEl));
    setDebug('root', Boolean(root));
    if (!dataEl || !root || !window.d3) {
      if (!window.d3) {
        showInlineError(root, 'd3 missing: check CDN access or provide local d3');
        console.warn('sprawl-voronoi: d3 not loaded');
      }
      return;
    }

    let data;
    try {
      const raw = dataEl.textContent.trim();
      setDebug('data.length', raw.length);
      data = JSON.parse(raw);
      if (typeof data === 'string') {
        data = JSON.parse(data);
        setDebug('data.doubleParse', 'ok');
      }
      setDebug('data.type', Array.isArray(data) ? 'array' : typeof data);
    } catch (error) {
      setDebug('error', `parse: ${error.message}`);
      showInlineError(root, 'failed to parse voronoi data');
      console.error('sprawl-voronoi: failed to parse data', error);
      return;
    }

    const infoEl = document.getElementById('cell-info');
    const pathEl = document.getElementById('map-path');
    const backButton = document.querySelector('[data-action="back"]');
    const resetButton = document.querySelector('[data-action="reset"]');
    const searchInput = document.querySelector('[data-voronoi-search]');
    const sourceCategories = Array.isArray(data) ? data : (data.categories || []);
    let searchQuery = '';
    let renderPending = false;

    const svg = window.d3.select(root)
    .append('svg')
    .attr('class', 'sv-voronoi-svg')
    .attr('role', 'img')
    .attr('aria-label', 'Voronoi treemap navigation');

    const defs = svg.append('defs');
    const cellClipGroup = defs.append('g').attr('class', 'sv-cell-clips');
    const postLayer = svg.append('g').attr('class', 'sv-layer sv-layer-post');
    const tagLayer = svg.append('g').attr('class', 'sv-layer sv-layer-tag');
    const categoryLayer = svg.append('g').attr('class', 'sv-layer sv-layer-category');

    const state = {
      width: 0,
      height: 0,
      view: 'overview',
      selectedCategoryId: null
    };

    const labelThresholds = {
      category: 999999,
      tag: 2000,
      post: 999999
    };

    const categoryColors = new Map();

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const adjustLightness = (color, delta) => ({
      h: color.h,
      s: color.s,
      l: clamp(color.l + delta, 10, 92)
    });

    const hashString = (value) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
    };

    const mulberry32 = (seed) => {
    return () => {
      let t = seed += 0x6d2b79f5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    };

    const makeClipId = (node, level) => {
    const raw = `${level}-${node.id}`;
    return `sv-clip-${raw.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    };

    const syncSize = () => {
    const bounds = root.getBoundingClientRect();
    state.width = Math.max(bounds.width || 0, 320);
    state.height = Math.max(bounds.height || 0, 320);
    svg.attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', `0 0 ${state.width} ${state.height}`);
    };

    const ensureSizeReady = () => {
    syncSize();
    if (state.width < 10 || state.height < 10) {
      requestAnimationFrame(renderTreemap);
      return false;
    }
    return true;
    };

    const polygonBounds = (polygon) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    polygon.forEach((point) => {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
    });
    return [minX, minY, maxX, maxY];
    };

    const normalizePolygon = (polygon) => {
    if (!polygon || polygon.length < 3) {
      return [];
    }
    const first = polygon[0];
    const last = polygon[polygon.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      return polygon.slice(0, -1);
    }
    return polygon;
    };

    const toHsl = (color) => `hsl(${Math.round(color.h)}, ${Math.round(color.s)}%, ${Math.round(color.l)}%)`;

    const mixHsl = (a, b, t) => {
    const angleDiff = ((((b.h - a.h) % 360) + 540) % 360) - 180;
    const h = (a.h + angleDiff * t + 360) % 360;
    return {
      h,
      s: a.s + (b.s - a.s) * t,
      l: a.l + (b.l - a.l) * t
    };
    };

    const buildCategoryColors = (categories) => {
    categoryColors.clear();
    const baseCategories = categories.filter((cat) => !cat.isDerived);
    baseCategories.sort((a, b) => a.name.localeCompare(b.name));
    baseCategories.forEach((cat, index) => {
      const hue = (165 + index * 53) % 360;
      categoryColors.set(cat.id, { h: hue, s: 55, l: 46 });
    });
    categories.filter((cat) => cat.isDerived).forEach((cat) => {
      const parentA = categoryColors.get(cat.parents && cat.parents[0]);
      const parentB = categoryColors.get(cat.parents && cat.parents[1]);
      if (parentA && parentB) {
        categoryColors.set(cat.id, mixHsl(parentA, parentB, 0.5));
      } else {
        const seed = mulberry32(hashString(cat.id));
        const hue = 170 + seed() * 140;
        categoryColors.set(cat.id, { h: hue, s: 50, l: 46 });
      }
    });
  };

    const buildTagColors = (category) => {
    const tagColors = new Map();
    const baseTags = category.tags.filter((tag) => !tag.isDerived);
    baseTags.sort((a, b) => a.name.localeCompare(b.name));
    const baseColor = categoryColors.get(category.id) || { h: 180, s: 55, l: 46 };
    baseTags.forEach((tag) => {
      const seed = mulberry32(hashString(tag.id));
      const offset = (seed() - 0.5) * 24;
      tagColors.set(tag.id, {
        h: (baseColor.h + offset + 360) % 360,
        s: clamp(baseColor.s + 8, 50, 70),
        l: clamp(baseColor.l + 6, 38, 58)
      });
    });
    category.tags.filter((tag) => tag.isDerived).forEach((tag) => {
      const parentA = tagColors.get(tag.parents && tag.parents[0]);
      const parentB = tagColors.get(tag.parents && tag.parents[1]);
      if (parentA && parentB) {
        tagColors.set(tag.id, mixHsl(parentA, parentB, 0.5));
      } else {
        tagColors.set(tag.id, {
          h: baseColor.h,
          s: clamp(baseColor.s + 6, 48, 68),
          l: clamp(baseColor.l + 8, 38, 58)
        });
      }
    });
    return tagColors;
  };

    const buildPostColor = (baseColor, postId) => {
    const seed = mulberry32(hashString(postId));
    const offset = (seed() - 0.5) * 18;
    return {
      h: (baseColor.h + offset + 360) % 360,
      s: clamp(baseColor.s + 6, 45, 72),
      l: clamp(baseColor.l + 10, 40, 62)
    };
  };

    const seedPoint = (node, polygon, center, minWeight, maxWeight) => {
    const bounds = polygonBounds(polygon);
    const width = bounds[2] - bounds[0];
    const height = bounds[3] - bounds[1];
    const seed = mulberry32(hashString(node.id));
    const angle = seed() * Math.PI * 2;
    const weightScale = maxWeight === minWeight ? 0.5 : (node.weight - minWeight) / (maxWeight - minWeight);
    const radius = Math.min(width, height) * (0.18 + (1 - weightScale) * 0.28) * (0.6 + seed() * 0.4);
    const x = clamp(center[0] + Math.cos(angle) * radius, bounds[0] + 10, bounds[2] - 10);
    const y = clamp(center[1] + Math.sin(angle) * radius, bounds[1] + 10, bounds[3] - 10);
    return [x, y];
    };

    const generateSeeds = (nodes, polygon) => {
    const center = window.d3.polygonCentroid(polygon);
    const weights = nodes.map((node) => node.weight || 1);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const seeds = new Map();
    nodes.forEach((node) => {
      if (Array.isArray(node.seed) && node.seed.length === 2) {
        seeds.set(node.id, [node.seed[0], node.seed[1]]);
      }
    });
    const baseNodes = nodes.filter((node) => !node.isDerived && !seeds.has(node.id));
    baseNodes.forEach((node) => {
      seeds.set(node.id, seedPoint(node, polygon, center, minWeight, maxWeight));
    });
    const derivedNodes = nodes.filter((node) => node.isDerived && node.parents && node.parents.length === 2 && !seeds.has(node.id));
    derivedNodes.forEach((node) => {
      const parentA = seeds.get(node.parents[0]);
      const parentB = seeds.get(node.parents[1]);
      if (parentA && parentB) {
        const mid = [(parentA[0] + parentB[0]) / 2, (parentA[1] + parentB[1]) / 2];
        const seed = mulberry32(hashString(node.id));
        const offsetMag = (seed() - 0.5) * 0.18;
        const dx = parentB[0] - parentA[0];
        const dy = parentB[1] - parentA[1];
        const len = Math.hypot(dx, dy) || 1;
        const perp = [-dy / len, dx / len];
        const bounds = polygonBounds(polygon);
        const scale = Math.min(bounds[2] - bounds[0], bounds[3] - bounds[1]);
        const x = clamp(mid[0] + perp[0] * offsetMag * scale, bounds[0] + 8, bounds[2] - 8);
        const y = clamp(mid[1] + perp[1] * offsetMag * scale, bounds[1] + 8, bounds[3] - 8);
        seeds.set(node.id, [x, y]);
      } else {
        seeds.set(node.id, seedPoint(node, polygon, center, minWeight, maxWeight));
      }
    });
    return seeds;
    };

    const clipPolygonHalfPlane = (polygon, a, b, c) => {
    const input = normalizePolygon(polygon);
    if (!input.length) {
      return [];
    }
    const output = [];
    const epsilon = 1e-7;
    for (let i = 0; i < input.length; i += 1) {
      const s = input[i];
      const e = input[(i + 1) % input.length];
      const ds = a * s[0] + b * s[1] - c;
      const de = a * e[0] + b * e[1] - c;
      const insideS = ds <= epsilon;
      const insideE = de <= epsilon;
      if (insideS && insideE) {
        output.push(e);
      } else if (insideS && !insideE) {
        const denom = ds - de;
        const t = denom === 0 ? 0 : ds / denom;
        output.push([s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t]);
      } else if (!insideS && insideE) {
        const denom = ds - de;
        const t = denom === 0 ? 0 : ds / denom;
        output.push([s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t]);
        output.push(e);
      }
    }
    return output;
    };

    const ensurePointInside = (point, polygon) => {
    if (window.d3.polygonContains(polygon, point)) {
      return point;
    }
    return window.d3.polygonCentroid(polygon);
    };

    const reseedPoint = (node, polygon) => {
    const center = window.d3.polygonCentroid(polygon);
    const bounds = polygonBounds(polygon);
    const seed = mulberry32(hashString(`${node.id}-reseed`));
    const angle = seed() * Math.PI * 2;
    const radius = Math.min(bounds[2] - bounds[0], bounds[3] - bounds[1]) * 0.08;
    const point = [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
    return ensurePointInside(point, polygon);
    };

    const computePowerDiagram = (nodes, polygon) => {
    const base = normalizePolygon(polygon);
    if (!base.length) {
      return nodes.map(() => []);
    }
    return nodes.map((node, index) => {
      const site = node._site;
      if (!site) {
        return [];
      }
      let cell = base.slice();
      for (let j = 0; j < nodes.length; j += 1) {
        if (j === index) {
          continue;
        }
        const other = nodes[j];
        const otherSite = other._site;
        if (!otherSite) {
          continue;
        }
        const dx = otherSite[0] - site[0];
        const dy = otherSite[1] - site[1];
        if (dx === 0 && dy === 0) {
          continue;
        }
        const c = (otherSite[0] * otherSite[0] + otherSite[1] * otherSite[1]
          - site[0] * site[0] - site[1] * site[1]
          + (node._power || 0) - (other._power || 0)) / 2;
        cell = clipPolygonHalfPlane(cell, dx, dy, c);
        if (cell.length < 3) {
          break;
        }
      }
      return cell;
    });
    };

    const computeVoronoiTreemap = (nodes, polygon, seeds, options = {}) => {
    const totalWeight = nodes.reduce((sum, node) => sum + (node.weight || 1), 0);
    const totalArea = Math.abs(window.d3.polygonArea(polygon));
    const center = window.d3.polygonCentroid(polygon);
    const bounds = polygonBounds(polygon);
    const targets = nodes.map((node) => {
      const weight = node.weight || 1;
      return totalArea * (weight / totalWeight);
    });
    const minPower = totalArea / Math.max(totalWeight * 500, 1);
    const relax = options.relax ?? 0.65;
    const powerAdjust = options.powerAdjust ?? 0.6;
    const maxIterations = options.iterations ?? 64;
    const errorThreshold = options.errorThreshold ?? 0.02;

    nodes.forEach((node, index) => {
      const seed = seeds.get(node.id) || center;
      const point = ensurePointInside([seed[0], seed[1]], polygon);
      node._site = point;
      node._power = Math.max(minPower, targets[index] / Math.PI);
    });

    let polygons = [];
    let maxError = Infinity;
    for (let i = 0; i < maxIterations; i += 1) {
      polygons = computePowerDiagram(nodes, polygon);
      maxError = 0;
      nodes.forEach((node, index) => {
        const cell = polygons[index];
        if (!cell || cell.length < 3) {
          node._site = reseedPoint(node, polygon);
          return;
        }
        const area = Math.abs(window.d3.polygonArea(cell));
        const target = targets[index] || 1;
        if (target > 0) {
          maxError = Math.max(maxError, Math.abs(area - target) / target);
        }
        const centroid = window.d3.polygonCentroid(cell);
        node._site[0] = clamp(node._site[0] + (centroid[0] - node._site[0]) * relax, bounds[0] + 2, bounds[2] - 2);
        node._site[1] = clamp(node._site[1] + (centroid[1] - node._site[1]) * relax, bounds[1] + 2, bounds[3] - 2);
        if (area > 0 && target > 0) {
          const ratio = clamp(target / area, 0.25, 4);
          node._power = Math.max(minPower, node._power * Math.pow(ratio, powerAdjust));
        }
      });
      if (maxError < errorThreshold) {
        break;
      }
    }
    polygons = computePowerDiagram(nodes, polygon);
    return { polygons, maxError };
    };

    const polygonPath = (polygon) => {
    if (!polygon || polygon.length < 3) {
      return '';
    }
    return `M${polygon.map((point) => `${point[0].toFixed(2)},${point[1].toFixed(2)}`).join('L')}Z`;
    };

    const updateInfo = (title, lines) => {
    if (!infoEl) {
      return;
    }
    const fragment = document.createDocumentFragment();
    const heading = document.createElement('strong');
    heading.textContent = title;
    fragment.appendChild(heading);
    lines.forEach((line) => {
      const div = document.createElement('div');
      div.textContent = line;
      fragment.appendChild(div);
    });
    infoEl.replaceChildren(fragment);
    };

    const shorten = (value, max) => {
    if (!value) {
      return '';
    }
    if (value.length <= max) {
      return value;
    }
    return `${value.slice(0, max - 3)}...`;
    };

    const wrapLabel = (value) => {
    if (!value) {
      return [];
    }
    const maxChars = 14;
    const maxLines = 3;
    const words = value.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) {
      lines.push(current);
    }
    let trimmed = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      const last = trimmed[maxLines - 1];
      trimmed[maxLines - 1] = shorten(last, maxChars - 1);
    }
    trimmed = trimmed.map((line) => (line.length > maxChars ? shorten(line, maxChars - 1) : line));
    return trimmed;
    };

    const normalizeQuery = (value) => value.toLowerCase().trim();

    const getTagSearchText = (tag, categoryName) => {
    if (tag._searchText) {
      return tag._searchText;
    }
    const parts = [];
    if (tag.name) {
      parts.push(tag.name);
    }
    if (Array.isArray(tag.parentNames)) {
      parts.push(...tag.parentNames);
    }
    if (categoryName) {
      parts.push(categoryName);
    }
    tag._searchText = parts.join(' ').toLowerCase();
    return tag._searchText;
    };

    const tagMatchesQuery = (tag, query, categoryName) => {
    if (!query) {
      return true;
    }
    return getTagSearchText(tag, categoryName).includes(query);
    };

    const filterCategory = (category, query) => {
    const categoryName = category.name || '';
    const tags = Array.isArray(category.tags)
      ? category.tags.filter((tag) => tagMatchesQuery(tag, query, categoryName))
      : [];
    if (!tags.length) {
      return null;
    }
    const weight = tags.reduce((sum, tag) => sum + (tag.weight || 1), 0);
    return {
      ...category,
      tags,
      weight: Math.max(1, weight || 0)
    };
    };

    const buildFilteredCategories = (categories, query) => {
    const normalized = normalizeQuery(query || '');
    return categories
      .map((category) => filterCategory(category, normalized))
      .filter(Boolean);
    };

    const scheduleRender = () => {
    if (renderPending) {
      return;
    }
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      renderTreemap();
    });
    };

    const defaultColor = { h: 200, s: 60, l: 50 };

    const layoutTreemap = (categories, polygon, options = {}) => {
    const aggregateSmallTags = options.aggregateSmallTags ?? true;
    buildCategoryColors(categories);
    const catSeeds = generateSeeds(categories, polygon);
    const catTreemap = computeVoronoiTreemap(categories, polygon, catSeeds, {
      iterations: 72,
      errorThreshold: 0.02
    });

    categories.forEach((category, index) => {
      category._color = categoryColors.get(category.id) || defaultColor;
      category._polygon = catTreemap.polygons[index] || [];
    });

    const tags = [];
    let tagError = 0;

    categories.forEach((category) => {
      const categoryPolygon = category._polygon || [];
      if (categoryPolygon.length < 3) {
        return;
      }
      let categoryTags = Array.isArray(category.tags) ? category.tags.slice() : [];
      if (!categoryTags.length) {
        return;
      }
      if (aggregateSmallTags && categoryTags.length > 6) {
        const categoryArea = Math.abs(window.d3.polygonArea(categoryPolygon));
        const minVisibleTags = 6;
        const minTagArea = 1600;
        const sorted = categoryTags.slice().sort((a, b) => (b.weight || 1) - (a.weight || 1));
        const totalWeight = sorted.reduce((sum, tag) => sum + (tag.weight || 1), 0);
        const kept = [];
        const dropped = [];
        sorted.forEach((tag, index) => {
          const weight = tag.weight || 1;
          const targetArea = totalWeight ? categoryArea * (weight / totalWeight) : categoryArea;
          if (index < minVisibleTags || targetArea >= minTagArea) {
            kept.push(tag);
          } else {
            dropped.push(tag);
          }
        });
        if (dropped.length) {
          const otherWeight = dropped.reduce((sum, tag) => sum + (tag.weight || 1), 0);
          kept.push({
            id: `${category.id}::other`,
            name: 'Other',
            weight: Math.max(1, otherWeight),
            isAggregate: true,
            isDerived: true,
            parents: [],
            parentNames: [],
            link: '',
            posts: []
          });
        }
        categoryTags = kept;
      }

      const tagColors = buildTagColors({ ...category, tags: categoryTags });
      categoryTags.forEach((tag) => {
        tag._color = tagColors.get(tag.id) || category._color || defaultColor;
        tag._categoryName = category.name;
      });

      const totalTagWeight = categoryTags.reduce((sum, tag) => sum + (tag.weight || 1), 0);
      const labelWeight = Math.max(0.4, totalTagWeight * 0.08);
      const bounds = polygonBounds(categoryPolygon);
      const labelSeed = [
        (bounds[0] + bounds[2]) / 2,
        bounds[1] + (bounds[3] - bounds[1]) * 0.06
      ];
      const labelNode = {
        id: `${category.id}::label`,
        name: category.name,
        weight: labelWeight,
        isLabel: true,
        labelType: 'category',
        isDerived: category.isDerived,
        parents: category.parents || [],
        parentNames: category.parentNames || [],
        link: category.link || '',
        _categoryId: category.id,
        seed: labelSeed,
        _color: adjustLightness(category._color || defaultColor, -8),
        _categoryName: category.name,
        _categoryWeight: category.weight
      };

      const treemapNodes = [labelNode, ...categoryTags];
      const tagSeeds = generateSeeds(treemapNodes, categoryPolygon);
      const tagTreemap = computeVoronoiTreemap(treemapNodes, categoryPolygon, tagSeeds, {
        iterations: 56,
        errorThreshold: 0.03
      });
      tagError = Math.max(tagError, tagTreemap.maxError || 0);
      treemapNodes.forEach((tag, index) => {
        tag._polygon = tagTreemap.polygons[index] || [];
        tags.push(tag);
      });
    });

    return {
      categories,
      tags,
      posts: [],
      errors: {
        category: catTreemap.maxError || 0,
        tag: tagError,
        post: 0
      }
    };
    };

    const layoutCategoryView = (category, polygon, query) => {
    if (!category) {
      return { tags: [], posts: [], errors: { tag: 0, post: 0 } };
    }
    const categoryName = category.name || '';
    const rawTags = Array.isArray(category.tags) ? category.tags : [];
    const tagNodes = rawTags
      .filter((tag) => tagMatchesQuery(tag, query, categoryName))
      .map((tag) => ({ ...tag }));
    if (!tagNodes.length) {
      return { tags: [], posts: [], errors: { tag: 0, post: 0 } };
    }
    const tagColors = buildTagColors({ ...category, tags: tagNodes });
    tagNodes.forEach((tag) => {
      tag._color = tagColors.get(tag.id) || category._color || defaultColor;
      tag._categoryName = categoryName;
    });

    const tagSeeds = generateSeeds(tagNodes, polygon);
    const tagTreemap = computeVoronoiTreemap(tagNodes, polygon, tagSeeds, {
      iterations: 60,
      errorThreshold: 0.03
    });

    const posts = [];
    let postError = 0;
    tagNodes.forEach((tag, index) => {
      tag._polygon = tagTreemap.polygons[index] || [];
      const tagPolygon = tag._polygon || [];
      if (tagPolygon.length < 3) {
        return;
      }
      const tagPosts = Array.isArray(tag.posts) ? tag.posts : [];
      const postNodes = tagPosts.map((post) => ({ ...post }));
      const totalPostWeight = postNodes.reduce((sum, post) => sum + (post.weight || 1), 0);
      const labelWeight = Math.max(0.4, totalPostWeight * 0.12);
      const tagBounds = polygonBounds(tagPolygon);
      const labelSeed = [
        (tagBounds[0] + tagBounds[2]) / 2,
        tagBounds[1] + (tagBounds[3] - tagBounds[1]) * 0.08
      ];
      const labelNode = {
        id: `${tag.id}::label`,
        name: tag.name,
        weight: labelWeight,
        isLabel: true,
        labelType: 'tag',
        isDerived: tag.isDerived,
        parents: tag.parents || [],
        parentNames: tag.parentNames || [],
        link: '',
        seed: labelSeed,
        _color: adjustLightness(tag._color || category._color || defaultColor, -8),
        _categoryName: categoryName,
        _tagName: tag.name
      };
      const treemapPosts = [labelNode, ...postNodes];
      treemapPosts.forEach((post) => {
        if (post.isLabel) {
          return;
        }
        post._color = buildPostColor(tag._color || category._color || defaultColor, post.id);
        post._categoryName = categoryName;
        post._tagName = tag.name;
      });
      const postSeeds = generateSeeds(treemapPosts, tagPolygon);
      const postTreemap = computeVoronoiTreemap(treemapPosts, tagPolygon, postSeeds, {
        iterations: 44,
        errorThreshold: 0.04
      });
      postError = Math.max(postError, postTreemap.maxError || 0);
      treemapPosts.forEach((post, postIndex) => {
        post._polygon = postTreemap.polygons[postIndex] || [];
        posts.push(post);
      });
    });

    return {
      tags: tagNodes,
      posts,
      errors: {
        tag: tagTreemap.maxError || 0,
        post: postError
      }
    };
    };

    const drawCells = (nodes, level, layer) => {
    const validNodes = nodes.filter((node) => node._polygon && node._polygon.length >= 3);
    const polygons = validNodes.map((node) => node._polygon);
    const boundsList = polygons.map((poly) => polygonBounds(poly));

    const clips = cellClipGroup.selectAll(`clipPath.sv-clip-${level}`).data(validNodes, (node) => node.id);
    clips.exit().remove();
    const clipsEnter = clips.enter()
      .append('clipPath')
      .attr('class', `sv-clip sv-clip-${level}`)
      .attr('id', (node) => makeClipId(node, level));
    clipsEnter.append('path');
    const clipsMerged = clipsEnter.merge(clips);
    clipsMerged.attr('id', (node) => makeClipId(node, level));
    clipsMerged.select('path')
      .attr('d', (node, index) => polygonPath(polygons[index]));

    const groups = layer.selectAll('g.sv-cell-group').data(validNodes, (node) => node.id);
    groups.exit().remove();
    const groupsEnter = groups.enter()
      .append('g')
      .attr('class', 'sv-cell-group')
      .attr('data-level', level);

    groupsEnter.append('path').attr('class', 'sv-cell');
    groupsEnter.append('text').attr('class', 'sv-cell-label');
    groupsEnter.append('title');

    const merged = groupsEnter.merge(groups);
    merged.classed('is-label', (node) => Boolean(node.isLabel));
    merged.classed('is-tag-label', (node) => node.isLabel && node.labelType === 'tag');
    merged.classed('is-category-label', (node) => node.isLabel && node.labelType === 'category');
    merged.classed('is-aggregate', (node) => Boolean(node.isAggregate));
    merged.attr('tabindex', (node) => {
      if (node.isAggregate) {
        return -1;
      }
      if (node.isLabel && !node.link && !node._categoryId) {
        return -1;
      }
      return 0;
    });
    merged.attr('role', (node) => {
      if (node.isAggregate) {
        return 'presentation';
      }
      if (node.link || node._categoryId) {
        return 'link';
      }
      if (node.isLabel) {
        return 'presentation';
      }
      return level === 'post' ? 'link' : 'button';
    });
    merged.style('cursor', (node) => {
      if (node.isAggregate) {
        return 'default';
      }
      if (node.isLabel && !node.link && !node._categoryId) {
        return 'default';
      }
      return 'pointer';
    });

    merged.select('path')
      .attr('d', (node, index) => polygonPath(polygons[index]))
      .attr('fill', (node) => {
        const color = node._color || defaultColor;
        return toHsl(color);
      });

    merged.select('text')
      .attr('clip-path', (node) => `url(#${makeClipId(node, level)})`)
      .each(function(node, index) {
        const area = Math.abs(window.d3.polygonArea(polygons[index] || []));
        const text = window.d3.select(this);
        const isLabel = Boolean(node.isLabel);
        text.selectAll('tspan').remove();
        const threshold = (level === 'post' && state.view === 'category')
          ? 500
          : labelThresholds[level];
        if (!isLabel && area < threshold) {
          return;
        }
        const lines = wrapLabel(node.name || node.title);
        const bounds = boundsList[index];
        const centroid = window.d3.polygonCentroid(polygons[index]);
        const isCentered = level !== 'post' || isLabel;
        const lineHeight = isLabel ? 14 : (level === 'category' ? 14 : 12);
        const startX = isCentered ? centroid[0] : bounds[0] + 6;
        const startY = isCentered
          ? centroid[1] - (lines.length - 1) * (lineHeight / 2)
          : bounds[1] + 14;
        text.attr('text-anchor', isCentered ? 'middle' : 'start');
        text.attr('dominant-baseline', isCentered ? 'middle' : 'alphabetic');
        text.classed('is-label', isLabel);
        text.attr('x', startX).attr('y', startY);
        lines.forEach((line, i) => {
          text.append('tspan')
            .attr('x', startX)
            .attr('dy', i === 0 ? 0 : lineHeight)
            .text(line);
        });
      })
      .classed('is-hidden', (node, index) => {
        if (node.isLabel || node.isAggregate) {
          return false;
        }
        const area = Math.abs(window.d3.polygonArea(polygons[index] || []));
        const threshold = (level === 'post' && state.view === 'category')
          ? 500
          : labelThresholds[level];
        return area < threshold;
      });

    merged.select('title')
      .text((node) => {
        if (level === 'post') {
          return node.title || '';
        }
        return `${node.name} (${node.weight || 0})`;
      });

    merged.on('mouseenter', (event, node) => handleHover(node, level));
    merged.on('focus', (event, node) => handleHover(node, level));
    merged.on('mouseleave', () => resetInfo());
    merged.on('blur', () => resetInfo());
    merged.on('click', (event, node) => handleSelect(node, level));
    merged.on('keydown', (event, node) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect(node, level);
      }
    });

    return {
      drawn: validNodes.length,
      invalid: nodes.length - validNodes.length
    };
    };

    const handleHover = (node, level) => {
    if (node.isLabel) {
      if (node.labelType === 'tag') {
        const label = node.isDerived ? `Derived tag: ${node.name}` : `Tag: ${node.name}`;
        const lines = [];
        if (node._categoryName) {
          lines.push(`Category: ${node._categoryName}`);
        }
        updateInfo(label, lines);
        return;
      }
      const label = node.isDerived ? `Derived category: ${node.name}` : `Category: ${node.name}`;
      const lines = [`Posts: ${node._categoryWeight || node.weight || 0}`];
      lines.push('Click to view posts by tag.');
      updateInfo(label, lines);
      return;
    }
    if (node.isAggregate) {
      const label = `Other tags in ${node._categoryName || 'category'}`;
      updateInfo(label, ['Clickable tags are shown individually.']);
      return;
    }
    if (level === 'category') {
      const label = node.isDerived ? `Derived category: ${node.name}` : `Category: ${node.name}`;
      const lines = [`Posts: ${node.weight}`];
      if (node.parentNames && node.parentNames.length) {
        lines.push(`Parents: ${node.parentNames.join(' + ')}`);
      }
      updateInfo(label, lines);
      return;
    }
    if (level === 'tag') {
      const label = node.isDerived ? `Derived tag: ${node.name}` : `Tag: ${node.name}`;
      const lines = [`Posts: ${node.weight}`];
      if (node._categoryName) {
        lines.push(`Category: ${node._categoryName}`);
      }
      if (node.parentNames && node.parentNames.length) {
        lines.push(`Parents: ${node.parentNames.join(' + ')}`);
      }
      updateInfo(label, lines);
      return;
    }
    if (level === 'post') {
      const lines = [];
      if (node.categories && node.categories.length) {
        lines.push(`Category: ${node.categories.join(', ')}`);
      } else if (node._categoryName) {
        lines.push(`Category: ${node._categoryName}`);
      }
      if (node.tags && node.tags.length) {
        lines.push(`Tag: ${node.tags.join(', ')}`);
      } else if (node._tagName) {
        lines.push(`Tag: ${node._tagName}`);
      }
      if (node.dateDisplay) {
        lines.push(`Published: ${node.dateDisplay}`);
      }
      if (node.readingTime) {
        lines.push(`Reading: ${node.readingTime} min`);
      }
      updateInfo(node.title, lines);
    }
    };

    const resetInfo = () => {
    updateInfo('Spatial map', ['Hover or focus a cell to inspect metadata.']);
    };

    const handleSelect = (node, level) => {
    if (node.isAggregate) {
      return;
    }
    if (node.isLabel) {
      if (node._categoryId) {
        state.view = 'category';
        state.selectedCategoryId = node._categoryId;
        renderTreemap();
        return;
      }
      if (node.link) {
        window.location.href = node.link;
      }
      return;
    }
    if (level === 'post' && node.link) {
      window.location.href = node.link;
      return;
    }
    if (level === 'category') {
      state.view = 'category';
      state.selectedCategoryId = node.id;
      renderTreemap();
      return;
    }
    if (level === 'tag') {
      if (node.link) {
        window.location.href = node.link;
        return;
      }
      if (searchInput) {
        const nextQuery = normalizeQuery(node.parentNames && node.parentNames.length
          ? node.parentNames.join(' ')
          : (node.name || ''));
        searchInput.value = nextQuery;
        searchQuery = nextQuery;
        scheduleRender();
      }
    }
    };

    const setPathLabel = (categoryName) => {
    if (!pathEl) {
      return;
    }
    if (categoryName) {
      pathEl.textContent = `Category: ${categoryName} / tags / posts`;
      return;
    }
    pathEl.textContent = 'All categories / tags';
    };

    const renderTreemap = () => {
    if (!ensureSizeReady()) {
      return;
    }
    svg.attr('data-view', state.view);
    const polygon = [
      [0, 0],
      [state.width, 0],
      [state.width, state.height],
      [0, state.height]
    ];
    setDebug('query', searchQuery || '');
    if (state.view === 'category') {
      const category = sourceCategories.find((cat) => cat.id === state.selectedCategoryId) || null;
      if (!category) {
        state.view = 'overview';
        state.selectedCategoryId = null;
        renderTreemap();
        return;
      }
      buildCategoryColors(sourceCategories);
      category._color = categoryColors.get(category.id) || defaultColor;
      const layout = layoutCategoryView(category, polygon, searchQuery);
      setPathLabel(category.name);

      if (!layout.tags.length) {
        drawCells([], 'post', postLayer);
        drawCells([], 'tag', tagLayer);
        drawCells([], 'category', categoryLayer);
        if (searchQuery) {
          updateInfo('No matches', ['Try a different search term.']);
        } else {
          updateInfo('No data', ['There are no tags in this category.']);
        }
        return;
      }

      const postStats = drawCells(layout.posts, 'post', postLayer);
      const tagStats = drawCells(layout.tags, 'tag', tagLayer);
      const categoryStats = drawCells([], 'category', categoryLayer);

      setDebug('posts', `${layout.posts.length}`);
      setDebug('tags', `${layout.tags.length}`);
      setDebug('paths', `${postStats.drawn + tagStats.drawn + categoryStats.drawn}`);
      setDebug('invalid.post', `${postStats.invalid}`);
      setDebug('invalid.tag', `${tagStats.invalid}`);
      setDebug('invalid.category', `${categoryStats.invalid}`);
      setDebug('areaError.tag', `${(layout.errors.tag * 100).toFixed(1)}%`);
      setDebug('areaError.post', `${(layout.errors.post * 100).toFixed(1)}%`);

      if (backButton) {
        backButton.disabled = false;
      }
      if (resetButton) {
        resetButton.disabled = false;
      }
      resetInfo();
      return;
    }

    const categories = buildFilteredCategories(sourceCategories, searchQuery);
    setDebug('categories', `${sourceCategories.length}`);
    setDebug('filtered.categories', `${categories.length}`);
    if (!categories.length) {
      drawCells([], 'post', postLayer);
      drawCells([], 'tag', tagLayer);
      drawCells([], 'category', categoryLayer);
      if (searchQuery) {
        updateInfo('No matches', ['Try a different search term.']);
      } else {
        updateInfo('No data', ['There are no items in this view.']);
      }
      return;
    }
    const layout = layoutTreemap(categories, polygon, { aggregateSmallTags: !searchQuery });
    setPathLabel();

    const postStats = drawCells(layout.tags, 'tag', postLayer);
    const tagStats = drawCells([], 'tag', tagLayer);
    const categoryStats = drawCells(layout.categories, 'category', categoryLayer);

    setDebug('posts', `${layout.posts.length}`);
    setDebug('tags', `${layout.tags.length}`);
    setDebug('paths', `${postStats.drawn + tagStats.drawn + categoryStats.drawn}`);
    setDebug('invalid.post', `${postStats.invalid}`);
    setDebug('invalid.tag', `${tagStats.invalid}`);
    setDebug('invalid.category', `${categoryStats.invalid}`);
    setDebug('areaError.category', `${(layout.errors.category * 100).toFixed(1)}%`);
    setDebug('areaError.tag', `${(layout.errors.tag * 100).toFixed(1)}%`);
    setDebug('areaError.post', `${(layout.errors.post * 100).toFixed(1)}%`);

    if (backButton) {
      backButton.disabled = true;
    }
    if (resetButton) {
      resetButton.disabled = false;
    }
    resetInfo();
    };

    if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      const next = normalizeQuery(event.target.value || '');
      if (next === searchQuery) {
        return;
      }
      searchQuery = next;
      scheduleRender();
    });
    }

    if (backButton) {
    backButton.addEventListener('click', () => {
      if (state.view === 'category') {
        state.view = 'overview';
        state.selectedCategoryId = null;
        renderTreemap();
      }
    });
    }

    if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
      }
      searchQuery = '';
      state.view = 'overview';
      state.selectedCategoryId = null;
      renderTreemap();
    });
    }

    if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      renderTreemap();
    });
    resizeObserver.observe(root);
    } else {
    window.addEventListener('resize', renderTreemap);
    }

    renderTreemap();
  };

  loadD3(start);
})();
