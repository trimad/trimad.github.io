let c,ctx,w,h,sn,fc,a,b,d,e,f,g;

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
  ctx.fillStyle="rgba(8,18,28,0.70)";
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
}

function windowResized(){
  resizeCanvas(windowWidth,windowHeight);
  w=width;h=height;
  c.style('width','100vw');
  c.style('height','100vh');
}
