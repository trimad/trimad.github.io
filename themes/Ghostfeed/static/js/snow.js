/* 
  Ghost in the Shell themed cyberpunk network simulation.
  This sketch creates a dynamic network of glowing nodes connected by neon lines,
  evoking a futuristic digital landscape and cybernetic aesthetics.
*/

let nodes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(10);
  // Create nodes proportionally based on screen area
  let numNodes = floor((width * height) / 10000);
  for (let i = 0; i < numNodes; i++) {
    nodes.push(new Node(random(width), random(height)));
  }
  textFont('monospace');
  textSize(24);
  frameRate(30);
}

function draw() {
  // Dark background with a bit of transparency for a trailing effect
  background(10, 20);
  
  // Update and display each node
  nodes.forEach(node => {
    node.update();
    node.display();
  });
  
  // Draw neon connections between nodes that are close enough
  stroke(0, 255, 200, 150);
  strokeWeight(1);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      let d = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
      if (d < 120) {
        line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
      }
    }
  }
  
  // Occasionally, display a random ghostly Kanji symbol to deepen the cyberpunk mystique
  if (frameCount % 30 === 0) {
    let kanji = random(['灰', '影', '魂', '神', '電', '脳', '幻']);
    let x = random(width);
    let y = random(height);
    push();
      textSize(random(30, 80));
      noStroke();
      fill(255, 255, 255, 200);
      text(kanji, x, y);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  nodes = [];
  let numNodes = floor((width * height) / 10000);
  for (let i = 0; i < numNodes; i++) {
    nodes.push(new Node(random(width), random(height)));
  }
}

class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.size = random(4, 8);
  }

  update() {
    // Add a slight random jitter for a glitchy effect
    this.x += this.vx + random(-0.3, 0.3);
    this.y += this.vy + random(-0.3, 0.3);
    
    // Bounce off edges
    if (this.x < 0 || this.x > width) {
      this.vx *= -1;
    }
    if (this.y < 0 || this.y > height) {
      this.vy *= -1;
    }
  }

  display() {
    noStroke();
    // Create a glowing effect by drawing multiple concentric circles with diminishing opacity
    for (let r = this.size; r < this.size + 10; r += 2) {
      fill(0, 255, 247, map(r, this.size, this.size + 10, 200, 0));
      ellipse(this.x, this.y, r);
    }
  }
}