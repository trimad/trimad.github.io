import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from "https://esm.sh/@chenglou/pretext@0.0.6";

const stageNode = document.querySelector("#wall-stage");
const canvas = document.querySelector("#post-wall");
const lens = document.querySelector("#search-lens");
const input = document.querySelector("#wall-search");
const count = document.querySelector("#wall-count");
const menu = document.querySelector("#result-menu");
const toc = document.querySelector("#article-toc");
const tocSections = document.querySelector("#toc-sections");
const tocProgress = document.querySelector("#toc-progress");
const dataNode = document.querySelector("#post-wall-data");

const posts = JSON.parse(dataNode?.textContent || "[]").map((post, index) => ({
  ...post,
  index,
  searchable: normalized(`${post.title} ${post.date} ${(post.tags || []).join(" ")} ${post.text}`),
}));

const isAmbientPage = stageNode?.classList.contains("wall-stage--ambient");

const ctx = canvas.getContext("2d", { alpha: true });
const WALL_FONT = "18px Georgia, serif";
const TITLE_FONT = "700 52px Georgia, serif";
const H1_FONT = "700 38px Georgia, serif";
const H2_FONT = "700 28px Georgia, serif";
const BODY_FONT = "19px Georgia, serif";
const CODE_FONT = "15px ui-monospace, SFMono-Regular, Menlo, monospace";
const META_FONT = "13px Inter, ui-sans-serif, system-ui, sans-serif";
const CODE_LINE_HEIGHT = 22;
const CODE_PAD_X = 16;
const CODE_LANGUAGE_HEIGHT = 24;
const CODE_BG = "rgba(39, 40, 34, 0.94)";
const CODE_BORDER = "rgba(248, 248, 242, 0.13)";
const CODE_TEXT = "#f8f8f2";
const WALL_LINE_HEIGHT = 25;
const PADDING = 28;
const MAX_MENU_RESULTS = 8;
const SURFACE_TRANSITION_KEY = "pretextSurfaceTransition";

let query = "";
let selectedUrl = "";
let panelDrag = null;
let preparedCache = new Map();
let blockCache = new Map();
let focusProgress = 0;
let targetFocus = 0;
let animationFrame = null;
let lastAnimationTime = 0;
let lastMenuKey = "";
let lastSingleUrl = "";
let lastTocKey = "";
let articleScroll = 0;
let articleMaxScroll = 0;
let articleHeightCache = new Map();
let articleHeadingPositions = [];
let articleScrollbar = null;
let articleScrollDrag = null;
let pageHeadingPositions = [];

function normalized(value) {
  return (value || "").toLowerCase();
}

function slugify(value) {
  return normalized(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "section";
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);
}

function safeSetPointerCapture(node, pointerId) {
  try {
    node.setPointerCapture(pointerId);
  } catch (_) {
    // Synthetic smoke-test pointer events may not create an active pointer.
  }
}

function safeReleasePointerCapture(node, pointerId) {
  try {
    if (node.hasPointerCapture(pointerId)) node.releasePointerCapture(pointerId);
  } catch (_) {
    // See safeSetPointerCapture.
  }
}

function panelTopFloor(stage) {
  if (!isAmbientPage) return PADDING;
  const header = document.querySelector(".site-header")?.getBoundingClientRect();
  if (!header) return PADDING;
  return Math.max(PADDING, Math.ceil(header.bottom - stage.top + 12));
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function panelBounds(panel) {
  const stage = canvas.getBoundingClientRect();
  const minX = PADDING;
  const minY = panelTopFloor(stage);
  return {
    stage,
    minX,
    minY,
    maxX: Math.max(minX, stage.width - panel.offsetWidth - PADDING),
    maxY: Math.max(minY, stage.height - panel.offsetHeight - PADDING),
  };
}

function setPanelPosition(panel, x, y, centered = false) {
  const bounds = panelBounds(panel);
  if (centered) {
    const halfWidth = panel.offsetWidth / 2;
    const halfHeight = panel.offsetHeight / 2;
    panel.style.left = `${clampValue(x, bounds.minX + halfWidth, bounds.stage.width - PADDING - halfWidth)}px`;
    panel.style.top = `${clampValue(y, bounds.minY + halfHeight, bounds.stage.height - PADDING - halfHeight)}px`;
    panel.style.transform = "translate(-50%, -50%)";
    return;
  }
  panel.style.left = `${clampValue(x, bounds.minX, bounds.maxX)}px`;
  panel.style.top = `${clampValue(y, bounds.minY, bounds.maxY)}px`;
  panel.style.transform = "none";
}

function attachDraggablePanel(panel, options = {}) {
  if (!panel) return;
  panel.addEventListener("pointerdown", (event) => {
    if (event.button != null && event.button !== 0) return;
    if (options.ignore?.(event)) return;
    const rect = panel.getBoundingClientRect();
    panelDrag = {
      panel,
      pointerId: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      centered: typeof options.centered === "function" ? options.centered() : Boolean(options.centered),
    };
    panel.classList.add("dragging");
    safeSetPointerCapture(panel, event.pointerId);
    event.preventDefault();
  });
}

function moveActivePanel(event) {
  if (!panelDrag) return;
  const { panel, dx, dy, centered } = panelDrag;
  const stage = canvas.getBoundingClientRect();
  if (centered) {
    setPanelPosition(panel, event.clientX - stage.left - dx + panel.offsetWidth / 2, event.clientY - stage.top - dy + panel.offsetHeight / 2, true);
  } else {
    setPanelPosition(panel, event.clientX - stage.left - dx, event.clientY - stage.top - dy, false);
  }
  render();
  event.preventDefault();
}

function endActivePanelDrag(event) {
  if (!panelDrag) return;
  const { panel, pointerId } = panelDrag;
  panelDrag = null;
  panel.classList.remove("dragging");
  safeReleasePointerCapture(panel, pointerId ?? event.pointerId);
}

function matchingPosts() {
  const q = normalized(query).trim();
  if (!q) return posts;
  return posts.filter((post) => post.searchable.includes(q));
}

function corpusFor(items) {
  return items.map((post) => `${post.title}. ${post.date}. ${post.text}`).join("\n\n✦ ");
}

function ensurePrepared(text, font = WALL_FONT) {
  const key = `${font}\n${text}`;
  if (!preparedCache.has(key)) {
    // Pretext preparation is cached by text+font. Dragging the lens/TOC and animating the article
    // only reruns the cheap streaming line layout against new row widths.
    preparedCache.set(key, prepareWithSegments(text || "No matching text.", font));
  }
  return preparedCache.get(key);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  placeTocDefault();
  placeLensDefault();
  render();
}

function rectObstacle(node, y, pad = 18) {
  if (!node || node.hidden) return null;
  const stage = canvas.getBoundingClientRect();
  const box = node.getBoundingClientRect();
  const top = box.top - stage.top - pad;
  const bottom = box.bottom - stage.top + pad;
  if (y < top || y > bottom) return null;
  return {
    left: Math.max(PADDING, box.left - stage.left - pad),
    right: Math.min(stage.width - PADDING, box.right - stage.left + pad),
  };
}

function subtractObstacles(spans, obstacles) {
  let result = spans;
  for (const obstacle of obstacles.filter(Boolean)) {
    const next = [];
    for (const span of result) {
      const spanRight = span.x + span.width;
      if (obstacle.right <= span.x || obstacle.left >= spanRight) {
        next.push(span);
        continue;
      }
      if (obstacle.left > span.x) next.push({ x: span.x, width: obstacle.left - span.x });
      if (obstacle.right < spanRight) next.push({ x: obstacle.right, width: spanRight - obstacle.right });
    }
    result = next;
  }
  return result.filter((span) => span.width >= 90);
}

function activeObstaclesForY(y, lensPad = 18, tocPad = 18) {
  return [rectObstacle(lens, y, lensPad), rectObstacle(toc, y, tocPad)];
}

function wallSpansForY(y, stage) {
  const base = [{ x: PADDING, width: stage.width - PADDING * 2 }];
  const flowed = subtractObstacles(base, activeObstaclesForY(y, 18, 18));
  return flowed.length ? flowed : base;
}

function articleBaseSpans(stage) {
  const sidePad = Math.max(PADDING, Math.min(96, stage.width * 0.08));
  const width = Math.max(280, Math.min(900, stage.width - sidePad * 2));
  const x = Math.max(PADDING, (stage.width - width) / 2);
  return [{ x, width }];
}

function articleSpansForY(y, stage) {
  const spans = articleBaseSpans(stage);
  const flowed = subtractObstacles(spans, activeObstaclesForY(y, 24, 20));
  return flowed.length ? flowed : spans;
}

function drawLine(text, x, y, alpha = 1) {
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

function drawWall(text, alpha = 1) {
  const stage = canvas.getBoundingClientRect();
  const handle = ensurePrepared(text, WALL_FONT);
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = PADDING + WALL_LINE_HEIGHT;
  let guard = 0;

  ctx.font = WALL_FONT;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(232, 237, 242, 0.56)";

  while (y < stage.height - PADDING && guard < 1400) {
    guard += 1;
    const spans = wallSpansForY(y, stage);
    let drew = false;
    for (const span of spans) {
      // Each visible row is measured with Pretext after subtracting the draggable search/dropdown
      // and TOC geometry. This keeps the text in the canvas rather than asking the DOM to reflow it.
      const range = layoutNextLineRange(handle, cursor, span.width);
      if (!range) return;
      const line = materializeLineRange(handle, range);
      drawLine(line.text || String(line), span.x, y, alpha * (spans.length > 1 ? 0.42 : 0.58));
      cursor = range.end;
      drew = true;
    }
    y += WALL_LINE_HEIGHT;
    if (!drew) y += WALL_LINE_HEIGHT;
  }
}

function contentBlocks(post) {
  if (blockCache.has(post.url)) return blockCache.get(post.url);
  const doc = new DOMParser().parseFromString(post.html || "", "text/html");
  const blocks = [
    { type: "title", text: post.title },
    { type: "meta", text: post.date },
  ];

  let headingIndex = 0;
  doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,.rei-notice,.notice,.download-resource,.download-resource-description,.highlight,pre").forEach((node) => {
    const tag = node.tagName.toLowerCase();
    const isNotice = node.classList.contains("rei-notice") || node.classList.contains("notice");
    const isDownload = node.classList.contains("download-resource") || node.classList.contains("download-resource-description");
    if (!isNotice && node.closest(".rei-notice,.notice")) return;
    if (!isDownload && node.closest(".download-resource,.download-resource-description")) return;
    if (tag === "pre" && node.closest(".highlight")) return;
    if (node.classList.contains("highlight") || tag === "pre") {
      const pre = tag === "pre" ? node : node.querySelector("pre");
      const code = pre?.querySelector("code");
      const lines = codeLinesFromPre(pre);
      if (!lines.length) return;
      const language = code?.dataset.lang || (code?.className || "").match(/language-([^\s]+)/)?.[1] || "code";
      blocks.push({
        type: "code",
        text: lines.map((line) => line.text).join("\n"),
        language,
        lines,
      });
      return;
    }
    const text = node.textContent.replace(/\s+/g, " ").trim();
    if (!text) return;
    const headingLevel = tag.startsWith("h") ? Number(tag.slice(1)) : 0;
    blocks.push({
      type: headingLevel ? "heading" : isNotice ? "notice" : isDownload ? "download" : tag === "blockquote" ? "quote" : "body",
      level: headingLevel,
      id: headingLevel ? `${slugify(text)}-${headingIndex++}` : "",
      text: tag === "li" ? `• ${text}` : text,
    });
  });

  blockCache.set(post.url, blocks);
  return blocks;
}

function mergeRuns(runs) {
  const merged = [];
  for (const run of runs) {
    if (!run.text) continue;
    const previous = merged[merged.length - 1];
    if (previous && previous.color === run.color) previous.text += run.text;
    else merged.push({ ...run });
  }
  return merged;
}

function collectCodeRuns(node, inheritedColor = CODE_TEXT) {
  if (!node) return [];
  if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent || "", color: inheritedColor }];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const color = node.style?.color || inheritedColor;
  return mergeRuns(Array.from(node.childNodes).flatMap((child) => collectCodeRuns(child, color)));
}

function cleanCodeRuns(runs) {
  return mergeRuns(runs.map((run) => ({
    color: run.color || CODE_TEXT,
    text: (run.text || "").replace(/\t/g, "    ").replace(/\n+$/g, ""),
  })));
}

function codeLinesFromPre(pre) {
  if (!pre) return [];
  const wrappers = pre.querySelectorAll("code > span[style*='display:flex']");
  const sourceLines = wrappers.length ? Array.from(wrappers).map((wrapper) => wrapper.firstElementChild || wrapper) : [];
  if (!sourceLines.length) {
    return (pre.textContent || "").replace(/\t/g, "    ").replace(/\n+$/g, "").split("\n").map((text) => ({
      text,
      runs: [{ text, color: CODE_TEXT }],
    }));
  }
  return sourceLines.map((lineNode) => {
    const runs = cleanCodeRuns(collectCodeRuns(lineNode));
    return {
      text: runs.map((run) => run.text).join(""),
      runs,
    };
  });
}

function headingBlocks(post) {
  return contentBlocks(post).filter((block) => block.type === "heading");
}

function blockStyle(block) {
  if (block.type === "title") return { font: TITLE_FONT, lineHeight: 56, before: 0, after: 12, color: "rgba(255, 241, 214, 0.96)" };
  if (block.type === "meta") return { font: META_FONT, lineHeight: 22, before: 0, after: 26, color: "rgba(155, 211, 255, 0.82)" };
  if (block.type === "heading") {
    return block.level <= 2
      ? { font: H1_FONT, lineHeight: 42, before: 22, after: 12, color: "rgba(255, 210, 138, 0.92)" }
      : { font: H2_FONT, lineHeight: 33, before: 18, after: 9, color: "rgba(255, 210, 138, 0.86)" };
  }
  if (block.type === "code") return { font: CODE_FONT, lineHeight: CODE_LINE_HEIGHT, before: 14, after: 18, color: CODE_TEXT };
  if (block.type === "notice") return { font: "600 18px Georgia, serif", lineHeight: 28, before: 14, after: 16, color: "rgba(255, 210, 138, 0.88)" };
  if (block.type === "download") return { font: "600 17px Inter, ui-sans-serif, system-ui, sans-serif", lineHeight: 25, before: 10, after: 12, color: "rgba(155, 211, 255, 0.86)" };
  if (block.type === "quote") return { font: "italic 21px Georgia, serif", lineHeight: 30, before: 14, after: 16, color: "rgba(232, 237, 242, 0.74)" };
  return { font: BODY_FONT, lineHeight: 29, before: 8, after: 10, color: "rgba(232, 237, 242, 0.86)" };
}

function fillCodeBackground(span, visibleY, rowHeight, alpha, isHeader = false) {
  const top = visibleY - rowHeight + 5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = isHeader ? "rgba(15, 16, 15, 0.94)" : CODE_BG;
  ctx.fillRect(span.x, top, span.width, rowHeight + 2);
  ctx.fillStyle = "rgba(249, 38, 114, 0.78)";
  ctx.fillRect(span.x, top, 3, rowHeight + 2);
  ctx.strokeStyle = CODE_BORDER;
  ctx.beginPath();
  ctx.moveTo(span.x, top);
  ctx.lineTo(span.x + span.width, top);
  ctx.stroke();
  ctx.restore();
}

function drawCodeRuns(runs, x, y, maxWidth, alpha) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - CODE_LINE_HEIGHT + 2, maxWidth, CODE_LINE_HEIGHT + 4);
  ctx.clip();
  ctx.font = CODE_FONT;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = alpha;
  let cursorX = x;
  for (const run of runs.length ? runs : [{ text: "", color: CODE_TEXT }]) {
    ctx.fillStyle = run.color || CODE_TEXT;
    ctx.fillText(run.text, cursorX, y);
    cursorX += ctx.measureText(run.text).width;
  }
  ctx.restore();
}

function flowCodeBlock(block, y, alpha, draw = true) {
  const stage = canvas.getBoundingClientRect();
  const style = blockStyle(block);
  y += style.before;
  let lineIndex = -1;
  let guard = 0;
  ctx.font = CODE_FONT;

  while (lineIndex < block.lines.length && guard < 1200) {
    guard += 1;
    const visibleY = y - articleScroll;
    const spans = articleSpansForY(visibleY, stage);
    for (const span of spans) {
      if (lineIndex >= block.lines.length) break;
      if (draw && visibleY > -CODE_LINE_HEIGHT && visibleY < stage.height + CODE_LINE_HEIGHT) {
        const arrive = 1 - alpha;
        const shiftedSpan = { x: span.x + arrive * 20, width: span.width };
        fillCodeBackground(shiftedSpan, visibleY + arrive * 44, CODE_LINE_HEIGHT, alpha, lineIndex === -1);
        if (lineIndex === -1) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = META_FONT;
          ctx.fillStyle = "rgba(255, 210, 138, 0.76)";
          ctx.textBaseline = "alphabetic";
          ctx.fillText((block.language || "code").toUpperCase(), shiftedSpan.x + CODE_PAD_X, visibleY + arrive * 44 - 2);
          ctx.restore();
        } else {
          drawCodeRuns(block.lines[lineIndex].runs, shiftedSpan.x + CODE_PAD_X, visibleY + arrive * 44, Math.max(40, shiftedSpan.width - CODE_PAD_X * 2), alpha);
        }
      }
      lineIndex += 1;
    }
    y += lineIndex === 0 ? CODE_LANGUAGE_HEIGHT : style.lineHeight;
  }
  return y + style.after;
}

function flowBlock(block, y, alpha, draw = true, headingPositions = null) {
  if (block.type === "code") return flowCodeBlock(block, y, alpha, draw);
  const stage = canvas.getBoundingClientRect();
  const style = blockStyle(block);
  const handle = ensurePrepared(block.text, style.font);
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let guard = 0;
  y += style.before;
  if (headingPositions && block.type === "heading") headingPositions.push({ id: block.id, y, level: block.level, text: block.text });
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  ctx.textBaseline = "alphabetic";

  while (guard < 500) {
    guard += 1;
    const visibleY = y - articleScroll;
    const spans = articleSpansForY(visibleY, stage);
    let progressed = false;
    for (const span of spans) {
      const range = layoutNextLineRange(handle, cursor, span.width);
      if (!range) return y + style.after;
      const line = materializeLineRange(handle, range);
      if (draw && visibleY > -style.lineHeight && visibleY < stage.height + style.lineHeight) {
        const arrive = 1 - alpha;
        // The selected post is still drawn by the canvas: lines drift down into their formatted
        // Pretext layout while the raw wall text fades, instead of appearing in a DOM pop-up.
        drawLine(line.text || String(line), span.x + arrive * 20, visibleY + arrive * 44, alpha);
      }
      cursor = range.end;
      progressed = true;
    }
    y += style.lineHeight;
    if (!progressed) y += style.lineHeight;
  }
  return y + style.after;
}

function measureArticle(post, collectHeadings = false) {
  const key = `${post.url}:${canvas.width}:${canvas.height}:${Math.round(toc?.offsetWidth || 0)}:${Math.round(lens?.offsetWidth || 0)}`;
  if (!collectHeadings && articleHeightCache.has(key)) return { height: articleHeightCache.get(key), headings: articleHeadingPositions };
  let y = PADDING + 30;
  const headings = [];
  for (const block of contentBlocks(post)) y = flowBlock(block, y, 0, false, collectHeadings ? headings : null);
  const height = y + PADDING;
  if (collectHeadings) articleHeadingPositions = headings;
  articleHeightCache.set(key, height);
  return { height, headings: collectHeadings ? headings : articleHeadingPositions };
}

function drawCanvasArticle(post, alpha) {
  if (alpha <= 0.01) return;
  const stage = canvas.getBoundingClientRect();
  const { height: articleHeight } = measureArticle(post, true);
  articleMaxScroll = Math.max(0, articleHeight - stage.height + PADDING * 2);
  articleScroll = Math.max(0, Math.min(articleScroll, articleMaxScroll));
  articleScrollbar = null;

  ctx.save();
  ctx.globalAlpha = alpha * 0.52;
  ctx.fillStyle = "rgba(3, 4, 7, 0.62)";
  ctx.fillRect(0, 0, stage.width, stage.height);
  ctx.globalAlpha = 1;
  ctx.restore();

  let y = PADDING + 30;
  for (const block of contentBlocks(post)) {
    if (y - articleScroll > stage.height + 120) break;
    y = flowBlock(block, y, alpha, true);
  }

  if (articleMaxScroll > 8) {
    articleScrollbar = articleScrollbarGeometry(stage, articleHeight);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(232, 237, 242, 0.10)";
    ctx.fillRect(articleScrollbar.x, articleScrollbar.trackTop, articleScrollbar.width, articleScrollbar.trackHeight);
    ctx.fillStyle = "rgba(155, 211, 255, 0.48)";
    ctx.fillRect(articleScrollbar.x, articleScrollbar.thumbTop, articleScrollbar.width, articleScrollbar.thumbHeight);
    ctx.restore();
  }
}

function articleScrollbarGeometry(stage, articleHeight) {
  const trackTop = PADDING;
  const trackHeight = Math.max(64, stage.height - PADDING * 2);
  const thumbHeight = Math.max(36, (trackHeight / Math.max(articleHeight, stage.height)) * trackHeight);
  const travel = Math.max(0, trackHeight - thumbHeight);
  const thumbTop = trackTop + (articleMaxScroll > 0 ? (articleScroll / articleMaxScroll) * travel : 0);
  const x = stage.width - 24;
  return {
    x,
    width: 12,
    hitLeft: x - 16,
    hitRight: stage.width,
    trackTop,
    trackHeight,
    thumbTop,
    thumbHeight,
    travel,
  };
}

function articleScrollbarHit(clientX, clientY) {
  if (!articleScrollbar || articleMaxScroll <= 0) return null;
  const stage = canvas.getBoundingClientRect();
  const x = clientX - stage.left;
  const y = clientY - stage.top;
  const bar = articleScrollbar;
  if (x < bar.hitLeft || x > bar.hitRight || y < bar.trackTop || y > bar.trackTop + bar.trackHeight) return null;
  return {
    ...bar,
    localY: y,
    onThumb: y >= bar.thumbTop && y <= bar.thumbTop + bar.thumbHeight,
  };
}

function scrollArticleToThumb(clientY, offsetY, bar) {
  const stage = canvas.getBoundingClientRect();
  const y = clientY - stage.top - offsetY;
  const ratio = bar.travel > 0 ? Math.max(0, Math.min(1, (y - bar.trackTop) / bar.travel)) : 0;
  articleScroll = Math.max(0, Math.min(articleMaxScroll, ratio * articleMaxScroll));
  render();
  updateCanvasCursor();
}

function updateCanvasCursor(event = null) {
  if (articleScrollDrag) {
    canvas.style.cursor = "ns-resize";
    return;
  }
  const hit = event ? articleScrollbarHit(event.clientX, event.clientY) : null;
  canvas.style.cursor = hit ? "ns-resize" : "default";
}

function renderMenu(items) {
  const q = normalized(query).trim();
  if (!q || items.length === 0) {
    menu.hidden = true;
    menu.replaceChildren();
    lastMenuKey = "";
    return;
  }

  const shown = items.slice(0, MAX_MENU_RESULTS);
  const key = shown.map((post) => post.url).join("|") + `:${items.length}`;
  menu.hidden = false;
  if (key === lastMenuKey) return;
  lastMenuKey = key;
  menu.innerHTML = `
    ${shown.map((post) => `
      <a class="result-item" role="option" href="${escapeHTML(post.url)}" data-url="${escapeHTML(post.url)}" data-title="${escapeHTML(post.title)}">
        <span>${escapeHTML(post.title)}</span>
        <small>${escapeHTML(post.date)}</small>
      </a>
    `).join("")}
    ${items.length > shown.length ? `<p class="result-more">${items.length - shown.length} more matches…</p>` : ""}
  `;
}

function navigateToPost(post) {
  if (!post?.url) return;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  try {
    sessionStorage.setItem(SURFACE_TRANSITION_KEY, JSON.stringify({ title: post.title, at: Date.now() }));
  } catch (_) {}

  if (prefersReducedMotion) {
    window.location.assign(post.url);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "surface-transition surface-transition--out";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="surface-transition__label">
      <span>Opening static post route</span>
      <strong>${escapeHTML(post.title)}</strong>
    </div>
  `;
  document.body.appendChild(overlay);
  stageNode.classList.add("surface-departing");

  requestAnimationFrame(() => overlay.classList.add("active"));
  window.setTimeout(() => window.location.assign(post.url), 520);
}

function tocKey(post) {
  return headingBlocks(post).map((heading) => `${heading.level}:${heading.id}`).join("|") || post.url;
}

function renderToc(post) {
  if (!toc || !tocSections || !tocProgress) return;
  const headings = headingBlocks(post);
  const key = tocKey(post);
  toc.hidden = false;
  if (key !== lastTocKey) {
    lastTocKey = key;
    tocSections.innerHTML = headings.length
      ? headings.map((heading) => {
        const level = Math.min(6, Math.max(1, heading.level));
        return `
        <div class="toc-row level-${level}" data-id="${escapeHTML(heading.id)}">
          <button type="button" class="toc-segment" data-id="${escapeHTML(heading.id)}" aria-label="Jump to ${escapeHTML(heading.text)}"></button>
          <button type="button" class="toc-link level-${level}" data-id="${escapeHTML(heading.id)}">
            <span>${escapeHTML(heading.text)}</span>
          </button>
        </div>
      `;
      }).join("")
      : `<p class="toc-empty">No headings found.</p>`;
    tocProgress.innerHTML = "";
    placeTocDefault(true);
  }
  updateTocProgress();
}

function pageHeadingBlocks() {
  const root = document.querySelector(".page-content-shell .content-body")
    || document.querySelector(".page-content-shell .content-list")
    || document.querySelector(".page-content-shell article")
    || document.querySelector(".page-content-shell");
  if (!root) return [];
  return Array.from(root.querySelectorAll("h2,h3,h4,h5,h6")).map((heading, index) => {
    if (!heading.id) heading.id = `${slugify(heading.textContent || "section")}-${index}`;
    return {
      id: heading.id,
      level: Number(heading.tagName.slice(1)) || 2,
      text: heading.textContent.replace(/\s+/g, " ").trim(),
      node: heading,
    };
  }).filter((heading) => heading.text);
}

function renderPageToc() {
  if (!toc || !tocSections || !tocProgress) return;
  const headings = pageHeadingBlocks();
  pageHeadingPositions = headings;
  if (!headings.length) {
    hideToc();
    return;
  }

  const key = headings.map((heading) => `${heading.level}:${heading.id}:${heading.text}`).join("|");
  toc.hidden = false;
  if (key !== lastTocKey) {
    lastTocKey = key;
    tocSections.innerHTML = headings.map((heading) => {
      const level = Math.min(6, Math.max(1, heading.level));
      return `
        <div class="toc-row level-${level}" data-id="${escapeHTML(heading.id)}">
          <button type="button" class="toc-segment" data-id="${escapeHTML(heading.id)}" aria-label="Jump to ${escapeHTML(heading.text)}"></button>
          <button type="button" class="toc-link level-${level}" data-id="${escapeHTML(heading.id)}">
            <span>${escapeHTML(heading.text)}</span>
          </button>
        </div>
      `;
    }).join("");
    tocProgress.innerHTML = "";
    placeTocDefault(true);
    placeLensDefault(true);
  }
  updateTocProgress();
}

function hideToc() {
  if (!toc) return;
  toc.hidden = true;
  lastTocKey = "";
}

function currentHeadingId() {
  if (isAmbientPage) {
    let active = pageHeadingPositions[0]?.id || "";
    for (const heading of pageHeadingPositions) {
      if (heading.node.getBoundingClientRect().top <= 140) active = heading.id;
      else break;
    }
    return active;
  }

  let active = articleHeadingPositions[0]?.id || "";
  for (const heading of articleHeadingPositions) {
    if (heading.y <= articleScroll + PADDING + 40) active = heading.id;
    else break;
  }
  return active;
}

function updateTocProgress() {
  if (!toc || toc.hidden) return;
  const activeId = currentHeadingId();
  const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const scrollRatio = isAmbientPage ? window.scrollY / scrollMax : articleMaxScroll > 0 ? articleScroll / articleMaxScroll : 1;
  toc.style.setProperty("--toc-progress", `${Math.max(0, Math.min(100, scrollRatio * 100))}%`);
  toc.querySelectorAll("[data-id]").forEach((node) => {
    node.classList.toggle("active", node.dataset.id === activeId);
    const heading = isAmbientPage
      ? pageHeadingPositions.find((candidate) => candidate.id === node.dataset.id)
      : articleHeadingPositions.find((candidate) => candidate.id === node.dataset.id);
    const complete = isAmbientPage
      ? Boolean(heading && heading.node.getBoundingClientRect().top < 120)
      : Boolean(heading && heading.y < articleScroll + PADDING);
    node.classList.toggle("complete", complete);
  });
}

function placeTocDefault(force = false) {
  if (!toc || toc.hidden) return;
  if (toc.dataset.placed === "true" && !force) return;
  const stage = canvas.getBoundingClientRect();
  const left = Math.max(PADDING, stage.width * 0.035);
  const top = isAmbientPage ? Math.max(panelTopFloor(stage), stage.height * 0.10) : Math.max(PADDING, stage.height * 0.18);
  setPanelPosition(toc, left, top, false);
  toc.dataset.placed = "true";
}

function placeLensDefault(force = false) {
  if (!lens) return;
  if (!isAmbientPage) return;
  if (lens.dataset.placed === "true" && !force) return;
  const stage = canvas.getBoundingClientRect();
  const left = Math.max(PADDING, stage.width * 0.035);
  let top = Math.max(panelTopFloor(stage), stage.height * 0.10);
  if (toc && !toc.hidden) {
    const tocBox = toc.getBoundingClientRect();
    const stageBox = canvas.getBoundingClientRect();
    top = Math.max(panelTopFloor(stage), tocBox.bottom - stageBox.top + 16);
  }
  setPanelPosition(lens, left, top, false);
  lens.dataset.placed = "true";
}

function updateChrome(items) {
  count.value = `${items.length} ${items.length === 1 ? "post" : "posts"}`;
  renderMenu(items);

  if (isAmbientPage) {
    renderPageToc();
    stageNode.classList.remove("single-result");
    setTargetFocus(0);
    return;
  }

  if (lastSingleUrl) lastSingleUrl = "";
  articleScroll = 0;
  articleHeightCache = new Map();
  articleHeadingPositions = [];
  hideToc();
  stageNode.classList.remove("single-result");
  setTargetFocus(0);
}

function setTargetFocus(value) {
  if (targetFocus === value) return;
  targetFocus = value;
  startFocusAnimation();
}

function startFocusAnimation() {
  if (animationFrame) return;
  lastAnimationTime = performance.now();
  animationFrame = requestAnimationFrame(tickFocusAnimation);
}

function tickFocusAnimation(now) {
  const delta = Math.max(16, now - lastAnimationTime);
  lastAnimationTime = now;
  const step = Math.min(1, delta / 360);
  focusProgress += (targetFocus - focusProgress) * step;
  if (Math.abs(targetFocus - focusProgress) < 0.015) focusProgress = targetFocus;
  render();
  if (focusProgress !== targetFocus) {
    animationFrame = requestAnimationFrame(tickFocusAnimation);
  } else {
    animationFrame = null;
  }
}

function render() {
  const stage = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, stage.width, stage.height);
  const gradient = ctx.createRadialGradient(stage.width * 0.5, stage.height * 0.45, 0, stage.width * 0.5, stage.height * 0.5, Math.max(stage.width, stage.height) * 0.7);
  gradient.addColorStop(0, "rgba(33, 48, 78, 0.72)");
  gradient.addColorStop(1, "rgba(3, 4, 7, 0.96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, stage.width, stage.height);

  const items = matchingPosts();
  updateChrome(items);
  drawWall(corpusFor(items), isAmbientPage ? 0.42 : 1);
}

input.addEventListener("input", () => {
  query = input.value;
  selectedUrl = "";
  articleScroll = 0;
  preparedCache = new Map();
  articleHeightCache = new Map();
  render();
});

lens.addEventListener("submit", (event) => event.preventDefault());

menu.addEventListener("click", (event) => {
  const button = event.target.closest(".result-item");
  if (!button) return;
  if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const post = posts.find((candidate) => candidate.url === button.dataset.url);
  if (!post) return;
  navigateToPost(post);
});

input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const first = matchingPosts()[0];
  if (!first) return;
  event.preventDefault();
  navigateToPost(first);
});

function scrollableOverlayCanUseWheel(target, deltaY) {
  const scroller = target.closest?.(".result-menu, .toc-sections");
  if (!scroller || scroller.hidden || scroller.scrollHeight <= scroller.clientHeight) return false;
  const atTop = scroller.scrollTop <= 0;
  const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
  return (deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom);
}

function handleArticleWheel(event) {
  if (targetFocus !== 1 && focusProgress < 0.5) return;
  if (scrollableOverlayCanUseWheel(event.target, event.deltaY)) return;
  event.preventDefault();
  articleScroll = Math.max(0, Math.min(articleMaxScroll, articleScroll + event.deltaY));
  render();
}

stageNode.addEventListener("wheel", handleArticleWheel, { passive: false });

canvas.addEventListener("pointerdown", (event) => {
  if (targetFocus !== 1 && focusProgress < 0.5) return;
  const hit = articleScrollbarHit(event.clientX, event.clientY);
  if (!hit) return;
  event.preventDefault();
  const offsetY = hit.onThumb ? hit.localY - hit.thumbTop : hit.thumbHeight / 2;
  articleScrollDrag = { pointerId: event.pointerId, offsetY, bar: hit };
  scrollArticleToThumb(event.clientY, offsetY, hit);
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (_) {
    // Synthetic browser smoke events do not always create an active pointer.
    // Real pointer events still capture normally; without capture, dragging continues while the pointer stays over the canvas.
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!articleScrollDrag) {
    updateCanvasCursor(event);
    return;
  }
  event.preventDefault();
  scrollArticleToThumb(event.clientY, articleScrollDrag.offsetY, articleScrollDrag.bar);
});

function endArticleScrollDrag(event) {
  if (!articleScrollDrag) return;
  const pointerId = articleScrollDrag.pointerId;
  articleScrollDrag = null;
  let hasCapture = false;
  try {
    hasCapture = canvas.hasPointerCapture(pointerId);
  } catch (_) {}
  if (hasCapture) {
    try {
      canvas.releasePointerCapture(pointerId);
    } catch (_) {}
  }
  updateCanvasCursor(event);
}

canvas.addEventListener("pointerup", endArticleScrollDrag);
canvas.addEventListener("pointercancel", endArticleScrollDrag);
canvas.addEventListener("pointerleave", (event) => {
  if (!articleScrollDrag) updateCanvasCursor(event);
});

attachDraggablePanel(lens, {
  centered: () => !isAmbientPage,
  ignore: (event) => event.target === input || Boolean(event.target.closest(".result-menu")),
});

if (toc) {
  attachDraggablePanel(toc, {
    ignore: (event) => Boolean(event.target.closest(".toc-link, .toc-segment")),
  });

  toc.addEventListener("click", (event) => {
    const target = event.target.closest(".toc-link, .toc-segment");
    if (!target?.dataset.id) return;

    if (isAmbientPage) {
      const heading = document.getElementById(target.dataset.id);
      if (!heading) return;
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(updateTocProgress, 220);
      return;
    }

    const heading = articleHeadingPositions.find((candidate) => candidate.id === target.dataset.id);
    if (!heading) return;
    articleScroll = Math.max(0, Math.min(articleMaxScroll, heading.y - PADDING - 20));
    render();
  });
}

window.addEventListener("pointermove", moveActivePanel);
window.addEventListener("pointerup", endActivePanelDrag);
window.addEventListener("pointercancel", endActivePanelDrag);
window.addEventListener("resize", resize);
window.addEventListener("scroll", () => {
  if (isAmbientPage) updateTocProgress();
}, { passive: true });
resize();
