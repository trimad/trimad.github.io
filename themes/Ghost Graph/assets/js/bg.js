let c,ctx,w,h,sn,fc,a,b,d,e,f,g;
let noiseData;
let hostEl = null;

function drawPhosphorMask() {
  const stripeWidth = 3;
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let x = 0; x < w; x += stripeWidth) {
    ctx.fillStyle = 'rgba(255,90,60,0.35)';
    ctx.fillRect(x, 0, 1, h);
    ctx.fillStyle = 'rgba(255,180,60,0.25)';
    ctx.fillRect(x + 1, 0, 1, h);
    ctx.fillStyle = 'rgba(255,120,60,0.35)';
    ctx.fillRect(x + 2, 0, 1, h);
  }
  ctx.restore();
}

function drawVignette() {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.65);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawNoise() {
  if (!noiseData || noiseData.width !== w || noiseData.height !== h) {
    const imgData = ctx.createImageData(w, h);
    noiseData = imgData;
  }
  const data = noiseData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random() * 18;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = n;
  }
  ctx.putImageData(noiseData, 0, 0);
}

function setup(){
  pixelDensity(1);
  hostEl = document.getElementById("bg-canvas");
  if (!hostEl) {
    return;
  }
  const size = getHostSize();
  c=createCanvas(size.width,size.height);
  c.parent(hostEl);
  c.style('position','absolute');
  c.style('top','0');
  c.style('left','0');
  c.style('pointer-events','none');
  c.style('width','100%');
  c.style('height','100%');
  c.style('z-index','0');
  c.elt.style.imageRendering="pixelated";
  ctx=_renderer.drawingContext;
  w=width;h=height;
  sn=Math.sin;
  noSmooth();noStroke();
  frameRate(30);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => resizeToHost());
    observer.observe(hostEl);
  }
}

function draw(){
  // manual background (faster than background())
  ctx.fillStyle="rgba(5,10,18,0.75)";
  ctx.fillRect(0,0,w,h);

  fc=frameCount;
  a=0.17; b=0.13; d=7; e=7; f=255;

  // micro-optimized loop: manual increments + local vars
  // reduce repeated global lookups
  for(g=0; g<h; g+=3){
    // stroke(...) equivalent
    ctx.strokeStyle=`rgba(0,${f},${f},${(d + sn(g*a + fc*b)*e)/255})`;

    // line(...) equivalent (faster)
    ctx.beginPath();
    ctx.moveTo(0,g);
    ctx.lineTo(w,g);
    ctx.stroke();
  }

  // phosphor mask (toggleable)
  //drawPhosphorMask();

  // vignette/curvature darkening
  drawVignette();

  // subtle noise overlay
  //drawNoise();
}

function windowResized(){
  resizeToHost();
}

function resizeToHost(){
  if (!hostEl) return;
  const size = getHostSize();
  resizeCanvas(size.width,size.height);
  w=width;h=height;
}

function getHostSize(){
  const rect = hostEl.getBoundingClientRect();
  return {
    width: Math.max(1, Math.floor(rect.width)),
    height: Math.max(1, Math.floor(rect.height)),
  };
}
