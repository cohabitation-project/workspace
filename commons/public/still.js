(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- the names we give the unnameable ---- */
  var NAMES = [
    "God","Source","the Self","Love","Truth","the One",
    "Spirit","Nothing","Everything","the Ground","the Witness","the Light"
  ];

  var field  = document.getElementById("field");
  var whisper= document.getElementById("whisper");
  var leftEl = document.getElementById("left");
  var still  = document.getElementById("stillness");
  var again  = document.getElementById("again");
  var nodes  = [];
  var remaining = 0;

  function layout(){
    // place names evenly on a ring, rotated a little so none sits dead-top
    var n = nodes.length || NAMES.length;
    for(var i=0;i<nodes.length;i++){
      var node = nodes[i];
      var frac = node.index / NAMES.length;
      var ang = frac * Math.PI*2 - Math.PI/2 + 0.20;
      var r = 0.405; // ring radius as fraction of field (center is 0.5,0.5)
      var x = 50 + Math.cos(ang)*r*100;
      var y = 50 + Math.sin(ang)*r*100;
      node.el.style.left = x + "%";
      node.el.style.top  = y + "%";
    }
  }

  function build(){
    // clear any previous names
    for(var i=0;i<nodes.length;i++){ if(nodes[i].el.parentNode) nodes[i].el.parentNode.removeChild(nodes[i].el); }
    nodes = [];
    remaining = NAMES.length;
    for(var j=0;j<NAMES.length;j++){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "name";
      b.textContent = NAMES[j];
      b.setAttribute("aria-label", "let fall: " + NAMES[j].replace(/^the\s+/,''));
      (function(btn){ btn.addEventListener("click", function(){ fall(btn); }); })(b);
      field.appendChild(b);
      nodes.push({ el:b, index:j, fallen:false });
    }
    layout();
    updateCount();
    still.classList.remove("shown");
    still.setAttribute("aria-hidden","true");
    whisper.style.opacity = "1";
  }

  function updateCount(){
    leftEl.textContent = remaining;
    whisper.lastChild && (leftEl.nextSibling.textContent = remaining===1 ? " remains" : " remain");
  }

  function fall(btn){
    var rec=null;
    for(var i=0;i<nodes.length;i++){ if(nodes[i].el===btn){ rec=nodes[i]; break; } }
    if(!rec || rec.fallen) return;
    rec.fallen = true;
    remaining--;
    btn.disabled = true;
    // let it drift slightly outward as it dissolves
    var ang = (rec.index/NAMES.length)*Math.PI*2 - Math.PI/2 + 0.20;
    var dx = Math.cos(ang)*26, dy = Math.sin(ang)*26 + 10;
    btn.style.transform = "translate(-50%,-50%) translate("+dx+"px,"+dy+"px)";
    btn.classList.add("falling");
    updateCount();
    if(remaining<=0){ setTimeout(reveal, reduce?300:900); }
  }

  function reveal(){
    whisper.style.opacity = "0";
    still.classList.add("shown");
    still.setAttribute("aria-hidden","false");
    setTimeout(function(){ try{ again.focus(); }catch(e){} }, reduce?400:1600);
  }

  again.addEventListener("click", build);
  window.addEventListener("resize", layout);

  /* ---- the night ---- */
  var sky = document.getElementById("sky");
  var ctx = sky.getContext("2d");
  var W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
  var stars=[];

  function seedStars(){
    var count = Math.round((W*H)/ (14000));
    count = Math.max(70, Math.min(260, count));
    stars=[];
    for(var i=0;i<count;i++){
      stars.push({
        x:Math.random()*W, y:Math.random()*H,
        r:Math.random()*1.3+0.2,
        base:Math.random()*0.5+0.15,
        amp:Math.random()*0.4+0.1,
        ph:Math.random()*Math.PI*2,
        sp:Math.random()*0.8+0.3
      });
    }
  }
  function resize(){
    W = sky.clientWidth; H = sky.clientHeight;
    sky.width = Math.round(W*DPR); sky.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    seedStars();
    if(reduce) drawStatic();
  }
  function drawStatic(){
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<stars.length;i++){
      var s=stars[i];
      ctx.globalAlpha = s.base+s.amp*0.5;
      ctx.fillStyle = "#cdd6ec";
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  var t0=performance.now();
  function frame(now){
    var t=(now-t0)/1000;
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<stars.length;i++){
      var s=stars[i];
      var a = s.base + s.amp*Math.sin(t*s.sp + s.ph);
      if(a<0) a=0;
      ctx.globalAlpha=a;
      ctx.fillStyle = "#cdd6ec";
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  build();
  if(!reduce) requestAnimationFrame(frame);
})();
