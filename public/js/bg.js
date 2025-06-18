/*
  Ghost in the Shell themed cyberpunk network simulation.
  Nodes have their heading reset away from temporary Kanji symbols if close.
  Ternary operations used wherever possible. Flicker color is branchless.
*/

let nodes = [];
let kanjiGlyphs = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(10);
  let numNodes = floor(map(windowWidth, 0, 5120, 0, 512));
  console.log(numNodes)
  for (let i = 0; i < numNodes; i++) {
    nodes.push(new Node(random(width), random(height)));
  }
  textFont('monospace');
  textSize(24);
  frameRate(30);
}


function draw() {
  drawCyberBG();

  // Update and display Kanji glyphs, remove expired ones
  for (let i = kanjiGlyphs.length - 1; i >= 0; i--) {
    kanjiGlyphs[i].update();
    kanjiGlyphs[i].display();
    kanjiGlyphs[i].isDead() ? kanjiGlyphs.splice(i, 1) : 0;
  }

  // Check for kanjiGlyph repulsion and update nodes
  nodes.forEach(node => {
    kanjiGlyphs.forEach(glyph => {
      glyph.resetHeadingIfNear(node);
    });
    node.update();
    node.display();
  });

  // Neon connections
  stroke(0, 255, 200, 150);
  strokeWeight(1);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      let d = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
      d < 128 ? line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y) : 0;
    }
  }

  // Every 30 frames, add a new Kanji glyph object
  frameCount % 30 === 0
    ? kanjiGlyphs.push(new KanjiGlyph(
      random(['灰', '影', '魂', '神', '電', '脳', '幻']),
      random(width), random(height), random(30, 80)))
    : 0;
}

function windowResized() {
  nodes = [];
  kanjiGlyphs = [];
  setup();
}

// ---- Node ----
class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(4, 8);
    let angle = random(TWO_PI);
    let speed = random(0.5, 2);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
  }

  setHeading(theta) {
    let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
    this.vx = cos(theta) * speed;
    this.vy = sin(theta) * speed;
  }

  update() {
    this.x += this.vx + random(-0.3, 0.3);
    this.y += this.vy + random(-0.3, 0.3);

    // Branchless bounce using ternaries
    this.vx *= (this.x < 0 || this.x > width) ? -1 : 1;
    this.vy *= (this.y < 0 || this.y > height) ? -1 : 1;
  }

  display() {
    noStroke();
    for (let r = this.size; r < this.size + 10; r += 2) {
      fill(0, 255, 247, map(r, this.size, this.size + 10, 200, 0));
      ellipse(this.x, this.y, r);
    }
  }
}

// ---- KanjiGlyph ----
class KanjiGlyph {
  constructor(kanji, x, y, size) {
    this.kanji = kanji;
    this.x = x;
    this.y = y;
    this.size = size;
    this.life = 30; // frames
    this.maxLife = 30;
    this.radius = 4 * size; // repulsion zone: 2*diameter
  }

  update() {
    this.life--;
  }

  isDead() {
    return this.life <= 0;
  }

  // Branchless: always call setHeading, but multiply with 'repel' (0 or 1)
  resetHeadingIfNear(node) {
    let dx = node.x - this.x;
    let dy = node.y - this.y;
    let d = sqrt(dx * dx + dy * dy);
    let repel = (d < this.radius && d > 0.01) ? 1 : 0;
    let angle = atan2(dy, dx);
    repel ? node.setHeading(angle) : 0;
  }

  display() {
    push();
    textAlign(CENTER, CENTER);
    textSize(this.size);
    noStroke();

    // Flicker pattern: build branchless
    let flickerFrames = Array(30).fill(1);
    [24, 22, 13].forEach(f => { if (f >= 0 && f < 30) flickerFrames[f] = 0; });

    let frameIdx = constrain(this.maxLife - this.life, 0, 29);
    let f = flickerFrames[frameIdx]; // 1 = on, 0 = off

    // Fade out overall opacity based on life
    let alpha = map(this.life, 0, this.maxLife, 0, 220);

    // Branchless color: fill is white if f=1, black if f=0
    fill(255 * f, 255 * f, 255 * f, alpha);

    text(this.kanji, this.x, this.y);
    pop();
  }
}

function drawCyberBG() {
  background(8, 18, 28, 180);

  // Subtle scanlines
  for (let y = 0; y < height; y += 3) {
    stroke(0, 255, 255, 7 + sin(y * 0.17 + frameCount * 0.13) * 7);
    line(0, y, width, y);
  }
}
