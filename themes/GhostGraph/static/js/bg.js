let c,ctx,w,h,sn,fc,a,b,d,e,f,g;
let noiseData;

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
  c=createCanvas(windowWidth,windowHeight);
  c.position(0,0);
  c.style('position','fixed');
  c.style('top','0');
  c.style('left','0');
  c.style('z-index','-1');
  c.style('pointer-events','none');
  c.style('width','100vw');
  c.style('height','100vh');
  c.elt.style.imageRendering="pixelated";
  ctx=_renderer.drawingContext;
  w=width;h=height;
  sn=Math.sin;
  noSmooth();noStroke();
  frameRate(30);
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
  resizeCanvas(windowWidth,windowHeight);
  w=width;h=height;
  c.style('width','100vw');
  c.style('height','100vh');
}
