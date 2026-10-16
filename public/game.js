/* Luna's Cozy Pets – The Island · v30 · the whole game (three.js r128: local copy in public/vendor, CDN fallback; see index.html) */
(function(){
if(!window.THREE){document.getElementById('loading').textContent='The 3D library could not load. Check your connection and reload.';return;}
const T=THREE;
/* ---------------- utilities ---------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rand=mulberry32(20260916);
const R=(a,b)=>a+(b-a)*rand();
const pick=arr=>arr[Math.floor(rand()*arr.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function smooth(e0,e1,x){const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);}
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az;const t=clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(px-(ax+dx*t),pz-(az+dz*t));}


/* ---------------- calendar: real-date season & holiday ----------------
   Uses the viewer's real date. To preview another time of year add #spring, #summer, #autumn,
   #winter, #halloween, #harvest, #christmas or #valentines to the page link. */
const CAL=(function(){
  const now=new Date();let m=now.getMonth()+1,d=now.getDate();
  let tag='';try{tag=(location.hash||'').slice(1).toLowerCase();}catch(e){}
  const force={spring:[4,20],summer:[7,10],autumn:[10,14],fall:[10,14],winter:[1,20],halloween:[10,25],harvest:[11,20],
    thanksgiving:[11,20],christmas:[12,20],holidays:[12,20],valentines:[2,10]}[tag];
  if(force){m=force[0];d=force[1];}
  const season=(m>=3&&m<=5)?'spring':(m>=6&&m<=8)?'summer':(m>=9&&m<=11)?'autumn':'winter';
  const holiday=m===10?'halloween':m===11?'harvest':m===12?'winter':(m===2&&d<=14)?'valentine':null;
  const holidayName={halloween:'Halloween',harvest:'Harvest time',winter:'Winter holidays',valentine:"Valentine's week"}[holiday]||null;
  return {m,d,season,holiday,holidayName};
})();
const SEASON=({
  spring:{ground:['#6fae3f','#8cc54f','#5a9636'],canopy:[['#f7c6d9','#f3b3cb','#fad4e2','#eea7c1','#f9bfd3']],canopyScale:1,litter:0.6,
    clump:['#5c9d38','#7bb847'],bush:['#3f7f3a','#4a8f41'],wild:['#ffffff','#ffd24d','#ff9ab8','#b79cff'],
    beds:['#ff9ab8','#ffd24d','#b79cff','#ffffff','#ff7a5c','#7fd1ff'],moss:'#6d8f4a',bamboo:'#5f9a3c',falling:'petals'},
  summer:{ground:['#62a63a','#7fbd48','#4f8f32'],canopy:[['#5d9a44','#6aa84f','#7cb85a','#4f8a3a']],canopyScale:1,litter:0.1,
    clump:['#559636','#6fae40'],bush:['#3f7f3a','#4a8f41'],wild:['#ffffff','#ffd24d','#ff7a5c','#7fd1ff'],
    beds:['#ff9ab8','#ffd24d','#ff7a5c','#ffffff','#b79cff','#ff5d5d'],moss:'#6d8f4a',bamboo:'#5f9a3c',falling:null},
  autumn:{ground:['#86983d','#a2a64a','#74883a'],
    canopy:[['#c8402a','#d9532b','#b33224','#e0663a'],['#e8862a','#f0a238','#d97424','#f2b347'],['#e9c046','#f2d15c','#d8a930','#c9a33a'],['#c8402a','#e8862a','#e9c046','#a0662c']],
    canopyScale:1,litter:1.7,clump:['#9a9a45','#b3a452','#7f8f3c'],bush:['#a8382a','#c4552c','#7a8a3a','#8a4a2a'],
    wild:['#8e6bd1','#e8b923','#ffffff','#d9532b'],beds:['#d9532b','#f2a93b','#8e2a45','#f5d04a','#c46a9b','#e07b39'],
    moss:'#7c8a42',bamboo:'#93a43e',falling:'leaves'},
  winter:{ground:['#8f9c7e','#a6ad94','#7f8c70'],canopy:[['#8a6a52','#9a7a5e','#7a5e48']],canopyScale:0.55,litter:0.2,
    clump:['#9a9a7a','#8a8f70'],bush:['#4a6a40','#5a6a48'],wild:['#ffffff'],beds:['#c9d6e6','#ffffff','#e6c9d6'],
    moss:'#7a8a6a',bamboo:'#7f9a52',falling:null}
})[CAL.season];

/* ---------------- renderer ---------------- */
let renderer;
const MOBILE=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||Math.min(innerWidth,innerHeight)<600;
/* When bloom runs through a multisampled WebGL2 render target, the canvas itself doesn't need its own MSAA buffer:
   skipping it saves a full-screen multisample framebuffer (hundreds of MB on high-DPI screens) and a resolve every frame. */
const POST_OK=!!(T.EffectComposer&&T.RenderPass&&T.UnrealBloomPass);
let GL2_MSAA_POST=false;
try{
  if(POST_OK&&!MOBILE&&T.WebGLMultisampleRenderTarget){
    const cv=document.createElement('canvas');
    const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance'});
    if(gl){renderer=new T.WebGLRenderer({canvas:cv,context:gl,antialias:false,stencil:false,powerPreference:'high-performance'});GL2_MSAA_POST=true;}
  }
}catch(e){renderer=null;GL2_MSAA_POST=false;}
if(!renderer){
  try{renderer=new T.WebGLRenderer({antialias:!MOBILE,powerPreference:'high-performance'});}
  catch(e){document.getElementById('loading').classList.add('gone');document.getElementById('err').style.display='block';return;}
}
const PR=Math.min(window.devicePixelRatio||1,MOBILE?1.5:2);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=MOBILE?T.PCFShadowMap:T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;let SHADOW_N=0;
document.getElementById('stage').appendChild(renderer.domElement);
const scene=new T.Scene();
const fog=new T.FogExp2(0xf4c79f,0.0012);scene.fog=fog;
const camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,0.5,3200);

/* ---------------- procedural texture library (upgraded surfaces) ---------------- */
const TEX=(function(){
  const r=mulberry32(771);
  const aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const g=v=>{v=Math.round(clamp(v,0,255));return `rgb(${v},${v},${v})`;};
  function wrap(s,x,y,m,fn){const xs=[0],ys=[0];if(x<m)xs.push(s);if(x>s-m)xs.push(-s);if(y<m)ys.push(s);if(y>s-m)ys.push(-s);for(const ox of xs)for(const oy of ys)fn(x+ox,y+oy);}
  function speck(ctx,s,n,lo,hi,r0,r1,alpha=1){ctx.globalAlpha=alpha;for(let i=0;i<n;i++){const x=r()*s,y=r()*s,rr=r0+r()*(r1-r0);ctx.fillStyle=g(lo+(hi-lo)*r());
    wrap(s,x,y,rr+1,(px,py)=>{ctx.beginPath();ctx.arc(px,py,rr,0,6.2832);ctx.fill();});}ctx.globalAlpha=1;}
  function mk(size,draw,rep){const cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d');draw(ctx,size);
    const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=aniso;if(rep)t.repeat.set(rep[0],rep[1]);return t;}

  // meadow grass: soft tonal blotches + thousands of tiny blades
  const grass=mk(512,(c,s)=>{c.fillStyle=g(228);c.fillRect(0,0,s,s);
    speck(c,s,70,200,255,20,60,0.16);
    c.lineCap='round';
    for(let i=0;i<4200;i++){const x=r()*s,y=r()*s,len=4+r()*9,a=-Math.PI/2+(r()-0.5)*1.1;c.strokeStyle=g(185+r()*70);c.lineWidth=1+r()*1.4;
      wrap(s,x,y,len+2,(px,py)=>{c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len);c.stroke();});}
    speck(c,s,500,250,255,0.6,1.4,0.7);
  },[52,52]);

  // wood grain: wavy, seamless long grain with a few knots
  const wood=mk(256,(c,s)=>{c.fillStyle=g(236);c.fillRect(0,0,s,s);
    for(let i=0;i<70;i++){const y0=r()*s,amp=1+r()*4,k=1+Math.floor(r()*3),ph=r()*6.28;c.strokeStyle=g(170+r()*55);c.lineWidth=0.6+r()*1.8;c.globalAlpha=0.35+r()*0.4;
      wrap(s,0,y0,amp+3,(ox,oy)=>{c.beginPath();for(let x=0;x<=s;x+=4){const y=oy+Math.sin(x/s*6.2832*k+ph)*amp;x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();});}
    c.globalAlpha=1;
    for(let i=0;i<3;i++){const x=20+r()*(s-40),y=20+r()*(s-40);for(let k=5;k>0;k--){c.fillStyle=g(150+k*16);c.beginPath();c.ellipse(x,y,k*3.2,k*1.4,0,0,6.2832);c.fill();}}
  });

  // lime plaster: fine speckle and faint trowel clouds
  const plaster=mk(256,(c,s)=>{c.fillStyle=g(244);c.fillRect(0,0,s,s);speck(c,s,40,225,255,12,34,0.18);speck(c,s,2600,212,255,0.4,1.4,0.8);});

  // kawara roof tiles: rounded columns stepped in courses
  const roof=mk(256,(c,s)=>{const cols=8,rows=4,cw=s/cols,rh=s/rows;
    for(let i=0;i<cols;i++){const gr=c.createLinearGradient(i*cw,0,(i+1)*cw,0);gr.addColorStop(0,g(110));gr.addColorStop(0.45,g(255));gr.addColorStop(0.62,g(225));gr.addColorStop(1,g(105));
      c.fillStyle=gr;c.fillRect(i*cw,0,cw,s);}
    for(let j=0;j<rows;j++){const y=j*rh;const sh=c.createLinearGradient(0,y,0,y+rh*0.35);sh.addColorStop(0,'rgba(0,0,0,.55)');sh.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=sh;c.fillRect(0,y,s,rh*0.35);
      c.fillStyle='rgba(255,255,255,.35)';c.fillRect(0,y+rh-3,s,2);}
    speck(c,s,600,150,255,0.5,1.3,0.35);
  },[3,3]);

  // cobbled stone: irregular cells with mortar cracks + grit
  const stone=mk(256,(c,s)=>{c.fillStyle=g(150);c.fillRect(0,0,s,s);
    for(let i=0;i<34;i++){const x=r()*s,y=r()*s,rx=18+r()*22,ry=14+r()*18,rot=r()*3.14,v=205+r()*45;
      wrap(s,x,y,Math.max(rx,ry)+2,(px,py)=>{c.fillStyle=g(v);c.beginPath();c.ellipse(px,py,rx,ry,rot,0,6.2832);c.fill();c.strokeStyle=g(135);c.lineWidth=2.2;c.stroke();
        c.fillStyle='rgba(255,255,255,.18)';c.beginPath();c.ellipse(px-rx*0.2,py-ry*0.25,rx*0.55,ry*0.4,rot,0,6.2832);c.fill();});}
    speck(c,s,1800,150,255,0.4,1.3,0.55);
  });

  // leaves/blossom clusters: dappled light and shade
  const foliage=mk(128,(c,s)=>{c.fillStyle=g(225);c.fillRect(0,0,s,s);speck(c,s,90,190,255,4,9,0.45);speck(c,s,700,165,255,0.8,2.4,0.8);});

  // bark: vertical fissures
  const bark=mk(128,(c,s)=>{c.fillStyle=g(225);c.fillRect(0,0,s,s);
    for(let i=0;i<46;i++){const x0=r()*s,amp=1+r()*2.5,ph=r()*6.28;c.strokeStyle=g(140+r()*70);c.lineWidth=1+r()*2.6;
      wrap(s,x0,0,amp+3,(ox)=>{c.beginPath();for(let y=0;y<=s;y+=4){const x=ox+Math.sin(y/s*12.566+ph)*amp;y?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();});}
  });

  // washi paper with kumiko lattice shadow (also drives glow)
  const shoji=mk(256,(c,s)=>{c.fillStyle=g(252);c.fillRect(0,0,s,s);
    c.globalAlpha=0.25;for(let i=0;i<160;i++){const x=r()*s,y=r()*s,a=r()*6.28,l=6+r()*16;c.strokeStyle=g(228);c.lineWidth=0.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();}
    c.globalAlpha=1;c.strokeStyle=g(150);c.lineWidth=5;
    for(let i=0;i<=4;i++){const p=i*s/4;c.beginPath();c.moveTo(p,0);c.lineTo(p,s);c.stroke();c.beginPath();c.moveTo(0,p);c.lineTo(s,p);c.stroke();}
  });

  // cotton weave for clothing
  const fabric=mk(64,(c,s)=>{c.fillStyle=g(238);c.fillRect(0,0,s,s);
    for(let y=0;y<s;y+=4)for(let x=0;x<s;x+=4){c.fillStyle=g(((x+y)/4)%2?255:214);c.fillRect(x,y,4,2);c.fillStyle=g(((x+y)/4)%2?218:252);c.fillRect(x,y+2,4,2);}
  },[5,5]);

  return {grass,wood,plaster,roof,stone,foliage,bark,shoji,fabric};
})();

/* ---------------- world layout ---------------- */
const L0=3.5,L_LOW=1.5,L_FRONT=2.3,L_REAR=7,WATER=3.1;
const PA={x:-22,z:-11,r:8},PB={x:-2,z:27,r:9};
const SM={x:-12,z:8};
const SR=2.4;
const MT={x:-24,z:-38,r:22,h:30};
const WF={x:-22,zTop:-25,yTop:13,zBot:-18.5};
function edgeR(a){return 55+5*Math.sin(3*a+1)+3*Math.sin(5*a+2)+2*Math.sin(9*a+0.5);}
// the little island to the east, reached by the sea bridge
const ISLE2={x:93,z:2.5,R:15,h:2.9,bx0:58.5,bx1:83.6,bz:2.5};
function isle2Edge(a){return 14.5+1.8*Math.sin(3*a+0.7)+1.1*Math.sin(5*a+2.1)+0.6*Math.sin(8*a);}
function inIsle2(x,z,m=0){const d=Math.hypot(x-ISLE2.x,z-ISLE2.z);return d<ISLE2.R+5&&d<isle2Edge(Math.atan2(z-ISLE2.z,x-ISLE2.x))-m;}
function isle2Height(x,z){const d=Math.hypot(x-ISLE2.x,z-ISLE2.z);if(d>ISLE2.R+5)return null;
  const e=isle2Edge(Math.atan2(z-ISLE2.z,x-ISLE2.x));if(d>e)return -12;
  let h=ISLE2.h+micro(x,z)*0.1-smooth(e-2.2,e,d)*0.35;const dh=Math.hypot(x-(ISLE2.x+6),z-(ISLE2.z-5.5));if(dh<8)h+=Math.pow(1-dh/8,1.6)*2.2;return h;}
function micro(x,z){return Math.sin(x*0.21+Math.cos(z*0.17))*0.5+Math.sin(z*0.23+x*0.05)*0.5;}
function waterDist(x,z){
  const dA=Math.hypot(x-PA.x,z-PA.z)-PA.r,dB=Math.hypot(x-PB.x,z-PB.z)-PB.r;
  const dS=Math.min(segDist(x,z,PA.x,PA.z,SM.x,SM.z),segDist(x,z,SM.x,SM.z,PB.x,PB.z))-SR;
  return Math.min(dA,dB,dS);
}
function baseHeight(x,z){
  const i2=isle2Height(x,z);if(i2!==null)return i2;
  const r=Math.hypot(x,z),a=Math.atan2(z,x);
  if(r>edgeR(a))return -12;
  let h=L0;
  const rearLine=-20+2*Math.sin(x*0.1);
  if(z<rearLine)h=L_REAR;
  if(x<-16&&z>22+2*Math.sin(x*0.2))h=L_FRONT;
  if(x>16&&z>33)h=L_LOW;
  // ramps
  if(x>7&&x<13&&z<-14&&z>-23)h=lerp(L0,L_REAR,(-14-z)/9);
  if(x>21&&x<27&&z>29&&z<37)h=lerp(L0,L_LOW,(z-29)/8);
  if(z>23&&z<29&&x<-13&&x>-19)h=lerp(L0,L_FRONT,(-13-x)/6);
  h+=micro(x,z)*0.1;
  // mountain
  const dm=Math.hypot(x-MT.x,(z-MT.z)*1.1);
  if(dm<MT.r){const k=1-dm/MT.r;h+=Math.pow(k,1.2)*MT.h*(0.85+0.15*Math.sin(x*0.5)*Math.cos(z*0.4));}
  // waterfall ravine + upper stream
  const ax=Math.abs(x-WF.x);
  if(ax<4&&z>-35&&z<WF.zBot+1){
    const s=clamp((z-WF.zTop)/(WF.zBot-WF.zTop),0,1);
    const yw=WATER+(WF.yTop-WATER)*(1-s*s)-1.1;
    const w=smooth(4,2.4,ax);
    if(yw<h)h=lerp(h,yw,w);
  }
  // ponds and stream
  const dW=waterDist(x,z);
  if(dW<1.2){const bed=WATER-1.0;const t=smooth(-1.2,0.9,dW);h=Math.min(h,bed+(h-bed)*t);}
  return h;
}
const hAt=baseHeight;

/* ---------------- obstacle & surface registry for AI ---------------- */
const CIRCLE_OBS=[];let OBS_VER=0,CAM_READY=false;
const BOX_OBS=[];
const BRIDGES=[];
function addCircleObs(x,z,r){CIRCLE_OBS.push({x,z,r});}
function addBoxObs(x0,x1,z0,z1){BOX_OBS.push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1)});}

/* ---------------- terrain mesh ---------------- */
function buildTerrain(CX,CZ,SIZE,SEG){
  let g=new T.PlaneGeometry(SIZE,SIZE,SEG,SEG);g.rotateX(-Math.PI/2);g.translate(CX,0,CZ);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){p.setY(i,baseHeight(p.getX(i),p.getZ(i)));}
  g=g.toNonIndexed();
  const pos=g.attributes.position,cols=new Float32Array(pos.count*3);
  const c=new T.Color(),va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),n=new T.Vector3();
  const grassA=new T.Color(SEASON.ground[0]),grassB=new T.Color(SEASON.ground[1]),grassC=new T.Color(SEASON.ground[2]);
  const dirtA=new T.Color('#a07a52'),dirtB=new T.Color('#86633f'),rockA=new T.Color('#8e9196'),rockB=new T.Color('#6e7379');
  const moss=new T.Color(SEASON.moss),bed=new T.Color('#5f806a'),sea=new T.Color('#2b3b46');
  for(let i=0;i<pos.count;i+=3){
    va.fromBufferAttribute(pos,i);vb.fromBufferAttribute(pos,i+1);vc.fromBufferAttribute(pos,i+2);
    n.subVectors(vc,vb).cross(va.clone().sub(vb)).normalize();
    const ny=Math.abs(n.y),y=(va.y+vb.y+vc.y)/3,cx=(va.x+vb.x+vc.x)/3,cz=(va.z+vb.z+vc.z)/3;
    const mk=Math.hypot(cx-MT.x,(cz-MT.z)*1.1)<MT.r-1;
    const j=(Math.sin(cx*12.9898+cz*78.233)*43758.5453)%1;
    if(y<-0.6)c.copy(sea);
    else if(ny<0.78){
      if(mk&&y>7.5)c.copy(Math.floor(y*0.7)%2?rockA:rockB);
      else c.copy(Math.floor(y*1.3)%2?dirtA:dirtB);
      c.offsetHSL(0,0,j*0.03);
    }
    else if(y<WATER-0.2&&waterDist(cx,cz)<1.5)c.copy(bed);
    else if(mk&&y>12)c.copy(rockA).lerp(moss,0.55);
    else{const m=micro(cx*1.7,cz*1.7)*0.5+0.5;c.copy(grassA).lerp(grassB,m*0.8);if(j>0.35)c.lerp(grassC,0.25);}
    for(let k=0;k<3;k++){cols[(i+k)*3]=c.r;cols[(i+k)*3+1]=c.g;cols[(i+k)*3+2]=c.b;}
  }
  g.setAttribute('color',new T.BufferAttribute(cols,3));
  g.computeVertexNormals();
  const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,metalness:0,map:TEX.grass,bumpMap:TEX.grass,bumpScale:0.035}));
  m.receiveShadow=true;m.castShadow=true;scene.add(m);
}
buildTerrain(0,0,150,150);buildTerrain(ISLE2.x,ISLE2.z,44,66);
/* Height of the rendered, faceted terrain (not the smooth height function), so flat pieces such as path stones
   sit exactly on the ground you see instead of hovering over the low corners of each triangle. */
const TERR_GRIDS=[{cx:0,cz:0,size:150,seg:150},{cx:ISLE2.x,cz:ISLE2.z,size:44,seg:66}];
function meshH(x,z){let best=-1e9;
  for(const t of TERR_GRIDS){const cell=t.size/t.seg,x0=t.cx-t.size/2,z0=t.cz-t.size/2,u=(x-x0)/cell,v=(z-z0)/cell;
    if(u<0||v<0||u>=t.seg||v>=t.seg)continue;const ix=Math.floor(u),iz=Math.floor(v),fu=u-ix,fv=v-iz;
    const X0=x0+ix*cell,Z0=z0+iz*cell,X1=X0+cell,Z1=Z0+cell;
    const ha=baseHeight(X0,Z0),hb=baseHeight(X0,Z1),hc=baseHeight(X1,Z1),hd=baseHeight(X1,Z0);
    const h=fu+fv<=1?ha+fu*(hd-ha)+fv*(hb-ha):hc+(1-fu)*(hb-hc)+(1-fv)*(hd-hc);if(h>best)best=h;}
  return best>-1e9?best:baseHeight(x,z);}
const _gsUp=new T.Vector3(0,1,0),_gsN=new T.Vector3(),_gsQ=new T.Quaternion(),_gsY=new T.Quaternion();
/* A flagstone set into the ground: tilted to the local slope and sunk so only a thin lip shows above the grass. */
function groundStone(x,z,s,sz,col){
  const r=0.48*s,e=Math.max(0.25,r*0.8),hc=meshH(x,z);
  const gx=(meshH(x+e,z)-meshH(x-e,z))/(2*e),gz=(meshH(x,z+e)-meshH(x,z-e))/(2*e);
  // where the ground bulges above the tilted plane under the rim, lift just enough that the stone isn't swallowed
  let bulge=0;for(let k=0;k<8;k++){const a=k*0.7854,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;bulge=Math.max(bulge,meshH(px,pz)-(hc+gx*(px-x)+gz*(pz-z)));}
  const lip=0.022+Math.min(bulge,0.05),th=0.16;
  _gsN.set(-gx,1,-gz).normalize();_gsQ.setFromUnitVectors(_gsUp,_gsN);_gsY.setFromAxisAngle(_gsUp,R(0,6.28));_gsQ.multiply(_gsY);
  const F=new T.Matrix4().compose(new T.Vector3(x,hc+lip,z).addScaledVector(_gsN,-th/2),_gsQ.clone(),new T.Vector3(1,1,1));
  part(B.stone,F,0,0,0,s,th,sz,col);}

/* ---------------- instanced batches (modular kit) ---------------- */
const geo={
  box:new T.BoxGeometry(1,1,1),
  cyl:new T.CylinderGeometry(0.5,0.5,1,8),
  stone:new T.CylinderGeometry(0.5,0.55,1,6),
  bowl:new T.CylinderGeometry(0.5,0.34,1,10),
  ico:new T.IcosahedronGeometry(0.5,0),
  dod:new T.DodecahedronGeometry(0.5,0),
  cone3:new T.ConeGeometry(0.5,1,3),
  cone7:new T.ConeGeometry(0.5,1,7),
  pyr:(()=>{const g=new T.ConeGeometry(0.5,1,4);g.rotateY(Math.PI/4);return g;})(),
  sph:new T.SphereGeometry(0.5,10,8),
  torus:new T.TorusGeometry(0.4,0.12,6,14)
};
const matStd=new T.MeshStandardMaterial({color:0xffffff,roughness:0.88,metalness:0,flatShading:true});
const matGlow=new T.MeshStandardMaterial({color:0xfff0cc,emissive:0xffb050,emissiveIntensity:0.5,roughness:0.6,flatShading:true});
const texMat=(t,o={})=>new T.MeshStandardMaterial(Object.assign({color:0xffffff,map:t,bumpMap:t,bumpScale:0.03,roughness:0.88,metalness:0,flatShading:true},o));
const matWood=texMat(TEX.wood,{bumpScale:0.025,roughness:0.82});
const matPlaster=texMat(TEX.plaster,{bumpScale:0.012,roughness:0.95});
const matRoof=texMat(TEX.roof,{bumpScale:0.08,roughness:0.62,metalness:0.05});
const matStone=texMat(TEX.stone,{bumpScale:0.06,roughness:0.95});
const matFoliage=texMat(TEX.foliage,{bumpScale:0.02,roughness:0.9});
const matBark=texMat(TEX.bark,{bumpScale:0.05,roughness:0.95});
const matShoji=new T.MeshStandardMaterial({color:0xfff0cc,map:TEX.shoji,emissive:0xffb050,emissiveMap:TEX.shoji,emissiveIntensity:0.5,roughness:0.7,flatShading:true});
class Batch{
  constructor(g,m,cast=true){this.g=g;this.m=m;this.mats=[];this.cols=[];this.cast=cast;}
  add(mat,col){this.mats.push(mat.clone());this.cols.push(new T.Color(col));}
  build(){
    if(!this.mats.length)return null;
    const im=new T.InstancedMesh(this.g,this.m,this.mats.length);
    for(let i=0;i<this.mats.length;i++){im.setMatrixAt(i,this.mats[i]);im.setColorAt(i,this.cols[i]);}
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
    im.castShadow=this.cast;im.receiveShadow=true;im.frustumCulled=false;scene.add(im);this.im=im;return im;
  }
}
const B={
  box:new Batch(geo.box,matStd),cyl:new Batch(geo.cyl,matStd),stone:new Batch(geo.stone,matStd,false),
  rock:new Batch(geo.dod,matStd),ico:new Batch(geo.ico,matStd),blossom:new Batch(geo.ico,matStd),
  cone7:new Batch(geo.cone7,matStd),pyr:new Batch(geo.pyr,matStd),sph:new Batch(geo.sph,matStd),
  torus:new Batch(geo.torus,matStd),bowl:new Batch(geo.bowl,matStd),
  grass:new Batch(geo.cone3,matStd,false),petal:new Batch(geo.box,matStd,false),flower:new Batch(geo.ico,matStd,false),
  woodBox:new Batch(geo.box,matWood),woodCyl:new Batch(geo.cyl,matWood),plaster:new Batch(geo.box,matPlaster),
  roofBox:new Batch(geo.box,matRoof),roofPyr:new Batch(geo.pyr,matRoof),
  stoneBox:new Batch(geo.box,matStone),stoneCyl:new Batch(geo.cyl,matStone),stonePyr:new Batch(geo.pyr,matStone),stoneSlab:new Batch(geo.stone,matStone,false),
  bark:new Batch(geo.cyl,matBark)
};
// foliage, rocks and pine tiers get their own surfaces
B.ico.m=matFoliage;B.blossom.m=matFoliage;B.cone7.m=matFoliage;B.rock.m=matStone;
const G={box:new Batch(geo.box,matGlow,false),sph:new Batch(geo.sph,matGlow,false),shoji:new Batch(geo.box,matShoji,false)};
const WOODS=new Set(['#6e4b33','#8a6143','#3b2a20','#b0834f','#7d5b37','#6b4a33','#2a211c']);
const STONES=new Set(['#aaa498','#8e887d','#b9b3a6','#a39d91']);
const BARKS=new Set(['#6b4a36','#5a3d2a']);
function route(b,col){
  if(b===B.box){if(WOODS.has(col))return B.woodBox;if(col==='#efe6d1')return B.plaster;if(STONES.has(col))return B.stoneBox;if(col==='#2c2e35')return B.roofBox;}
  else if(b===B.cyl){if(WOODS.has(col))return B.woodCyl;if(BARKS.has(col))return B.bark;if(STONES.has(col))return B.stoneCyl;}
  else if(b===B.pyr){if(col==='#2c2e35'||col==='#9b3b2f')return B.roofPyr;if(STONES.has(col))return B.stonePyr;}
  else if(b===B.stone){if(STONES.has(col))return B.stoneSlab;}
  else if(b===G.box&&col==='#fff1cc')return G.shoji;
  return b;
}
const _e=new T.Euler(),_q=new T.Quaternion(),_v=new T.Vector3(),_s=new T.Vector3(),_p=new T.Matrix4(),_m=new T.Matrix4();
function frame(x,y,z,ry=0,s=1){const m=new T.Matrix4();_e.set(0,ry,0);_q.setFromEuler(_e);return m.compose(new T.Vector3(x,y,z),_q.clone(),new T.Vector3(s,s,s));}
let TREE_REC=null;const TREE_LIST=[];
function part(b,F,x,y,z,sx,sy,sz,col,rx=0,ry=0,rz=0){b=route(b,col);if(TREE_REC)TREE_REC.push([b,b.mats.length]);_e.set(rx,ry,rz);_q.setFromEuler(_e);_p.compose(_v.set(x,y,z),_q,_s.set(sx,sy,sz));_m.multiplyMatrices(F,_p);b.add(_m,col);}
const W={wood:'#6e4b33',woodL:'#8a6143',dark:'#3b2a20',plaster:'#efe6d1',roof:'#2c2e35',red:'#c63a2f',black:'#27221f',stone:'#aaa498',stoneD:'#8e887d',shoji:'#fff1cc',lamp:'#ff8a3d',warm:'#ffd58a'};
const LIGHTS=[];
function addNightLight(x,y,z){LIGHTS.push([x,y,z]);}


/* ---------------- shared primitive kit (props, decor, creatures) ---------------- */
const SPH=new T.SphereGeometry(1,16,12),CYL=new T.CylinderGeometry(1,1,1,10),CONE=new T.ConeGeometry(1,1,10),BOX=new T.BoxGeometry(1,1,1);
const MATS={};
const rnd=(a,b)=>a+(b-a)*Math.random();
function mStd(col,o={}){const k=col+JSON.stringify(o);return MATS[k]||(MATS[k]=new T.MeshStandardMaterial(Object.assign({color:col,roughness:0.85},o)));}
function blob(parent,g,mat,x,y,z,sx,sy,sz,shadow=true){const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;parent.add(m);return m;}
function canvasTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');draw(c,w,h);const t=new T.CanvasTexture(cv);t.anisotropy=4;return t;}

/* ---------------- architecture ---------------- */
function torii(x,z,ry,s){
  const F=frame(x,hAt(x,z),z,ry,s);
  for(const sx of[-2.2,2.2]){
    part(B.cyl,F,sx,2.6,0,0.5,5.2,0.5,W.red);
    part(B.cyl,F,sx,0.25,0,0.64,0.5,0.64,W.black);
    addCircleObs(x+sx*s*Math.cos(ry),z-sx*s*Math.sin(ry),0.55*s);
  }
  part(B.box,F,0,4.0,0,5.7,0.32,0.32,W.red);
  part(B.box,F,0,5.05,0,6.6,0.35,0.55,W.red);
  part(B.box,F,0,5.4,0,7.0,0.3,0.7,W.black);
  part(B.box,F,-3.75,5.5,0,0.9,0.3,0.72,W.black,0,0,-0.2);
  part(B.box,F,3.75,5.5,0,0.9,0.3,0.72,W.black,0,0,0.2);
  part(B.box,F,0,4.55,0,0.4,0.8,0.26,W.black);
}
function stoneLantern(x,z,s=1){
  const y=hAt(x,z),F=frame(x,y,z,R(0,0.4),s);
  part(B.stone,F,0,0.18,0,1.1,0.36,1.1,W.stoneD);
  part(B.cyl,F,0,0.85,0,0.42,1.0,0.42,W.stone);
  part(B.box,F,0,1.42,0,0.9,0.16,0.9,W.stone);
  part(G.box,F,0,1.78,0,0.52,0.56,0.52,W.warm);
  for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])part(B.box,F,a*0.3,1.78,b*0.3,0.12,0.58,0.12,W.stone);
  part(B.pyr,F,0,2.32,0,1.55,0.55,1.55,W.stoneD);
  part(B.sph,F,0,2.68,0,0.28,0.28,0.28,W.stone);
  addCircleObs(x,z,0.75*s);
}
function house(cx,cz){
  const y0=hAt(cx,cz),F=frame(cx,y0,cz,0,1);
  for(const ix of[-6.2,-2,2,6.2])for(const iz of[-5.3,-1.8,1.8,5.3])part(B.cyl,F,ix,0.6,iz,0.45,2.0,0.45,W.dark);
  part(B.box,F,0,1.55,0,13.5,0.3,11.5,W.wood);
  for(let k=0;k<12;k++)part(B.box,F,0,1.71,-5.4+k*0.98,13.5,0.02,0.05,W.dark);
  part(B.box,F,0,3.3,-0.8,9,3.2,7,W.plaster);
  for(const px of[-4.55,-1.5,1.5,4.55])for(const pz of[2.75,-4.35])part(B.box,F,px,3.3,pz,0.26,3.2,0.26,W.wood);
  for(const pz of[2.75,-4.35]){part(B.box,F,0,4.85,pz,9.3,0.3,0.3,W.wood);part(B.box,F,0,1.85,pz,9.3,0.22,0.3,W.wood);}
  for(const px of[-4.55,4.55]){part(B.box,F,px,4.85,-0.8,0.3,0.3,7.4,W.wood);part(B.box,F,px,3.3,-0.8,0.26,3.2,0.26,W.wood);}
  for(const xc of[-3.02,0,3.02]){
    part(G.box,F,xc,3.25,2.72,2.7,2.6,0.08,W.shoji);
    for(const off of[-0.67,0,0.67])part(B.box,F,xc+off,3.25,2.8,0.06,2.6,0.06,W.dark);
    for(const oy of[2.55,3.25,3.95])part(B.box,F,xc,oy,2.8,2.7,0.05,0.06,W.dark);
  }
  for(const sx of[-1,1]){
    part(G.box,F,sx*4.52,3.3,-0.8,0.08,2.2,3.0,W.shoji);
    for(const off of[-0.75,0,0.75])part(B.box,F,sx*4.6,3.3,-0.8+off,0.06,2.2,0.06,W.dark);
    part(B.box,F,sx*4.6,3.3,-0.8,0.06,0.05,3.0,W.dark);
  }
  part(B.box,F,0,5.0,-0.8,13.4,0.2,11.2,W.roof);
  part(B.pyr,F,0,6.35,-0.8,17.2,2.7,14.6,W.roof);
  part(B.box,F,0,7.55,-0.8,2.6,0.3,0.4,W.black);
  // front steps
  part(B.box,F,0,1.2,6.2,3.2,0.25,0.9,W.woodL);part(B.box,F,0,0.75,6.95,3.2,0.25,0.9,W.woodL);part(B.box,F,0,0.3,7.7,3.2,0.25,0.9,W.woodL);
  // veranda railing
  const rail=(ax,az,bx,bz)=>{const n=Math.max(1,Math.round(Math.hypot(bx-ax,bz-az)/1.5));
    for(let i=0;i<=n;i++){const t=i/n;part(B.box,F,lerp(ax,bx,t),2.15,lerp(az,bz,t),0.14,0.9,0.14,W.wood);}
    const len=Math.hypot(bx-ax,bz-az),ry=Math.atan2(bx-ax,bz-az);
    _e.set(0,ry,0);_q.setFromEuler(_e);_p.compose(_v.set((ax+bx)/2,2.55,(az+bz)/2),_q,_s.set(0.1,0.1,len));_m.multiplyMatrices(F,_p);B.woodBox.add(_m,W.wood);};
  rail(-6.6,5.6,-1.8,5.6);rail(1.8,5.6,6.6,5.6);rail(-6.6,5.6,-6.6,-5.6);rail(6.6,5.6,6.6,-5.6);rail(-6.6,-5.6,6.6,-5.6);
  // hanging paper lanterns
  for(const sx of[-4.2,4.2]){part(B.cyl,F,sx,4.62,4.9,0.04,0.5,0.04,W.dark);part(G.sph,F,sx,4.05,4.9,0.62,0.8,0.62,W.lamp);part(B.cyl,F,sx,4.5,4.9,0.4,0.08,0.4,W.dark);}
  // veranda props: cushion + tea tray
  part(B.box,F,-5,1.8,4.2,1.1,0.18,1.1,'#b85c4a');part(B.box,F,-3.6,1.78,4.2,0.7,0.1,0.5,W.woodL);
  addNightLight(cx,y0+4.2,cz+5.4);
  addBoxObs(cx-7.0,cx+7.0,cz-6.0,cz+1.2);
  addBoxObs(cx-7.0,cx-2.2,cz+1.0,cz+4.0);
  addBoxObs(cx+2.2,cx+7.0,cz+1.0,cz+4.0);
}
function shrine(cx,cz){
  const y0=hAt(cx,cz),F=frame(cx,y0,cz,0,1);
  part(B.box,F,0,0.3,0,7.2,0.8,6.4,W.stone);
  for(let i=0;i<3;i++)part(B.box,F,0,0.1+i*0.22,3.6+(2-i)*0.45,3.2,0.24,0.5,W.stoneD);
  part(B.box,F,0,2.05,-0.4,4.2,2.7,3.6,'#8b3a2b');
  for(const px of[-2.1,2.1])for(const pz of[1.4,-2.2])part(B.cyl,F,px,2.05,pz,0.3,2.7,0.3,W.red);
  part(B.box,F,0,3.45,-0.4,6.2,0.18,5.4,W.roof);
  part(B.pyr,F,0,4.3,-0.4,8.4,1.8,7.3,W.roof);
  part(B.box,F,0,3.2,1.55,4.4,0.14,0.14,'#e8dcc0');
  part(B.cyl,F,0,2.6,1.55,0.05,1.1,0.05,'#e8dcc0');
  part(B.sph,F,0,3.05,1.6,0.36,0.36,0.36,'#d4a843');
  // offering box
  part(B.box,F,0,1.15,2.35,1.8,0.9,0.95,'#6b4a33');
  for(let k=0;k<6;k++)part(B.box,F,-0.72+k*0.29,1.63,2.35,0.09,0.06,0.9,W.dark);
  part(G.box,F,0,2.1,1.35,1.4,1.5,0.06,W.shoji);
  stoneLantern(cx-3.4,cz+4.6,1.05);stoneLantern(cx+3.4,cz+4.6,1.05);
  addNightLight(cx,y0+3,cz+4);
  addBoxObs(cx-3.9,cx+3.9,cz-3.6,cz+3.6);
}
function bridge(cx,cz,dx,dz,len){
  const dl=Math.hypot(dx,dz);dx/=dl;dz/=dl;
  BRIDGES.push({cx,cz,dx,dz,len});
  const F=frame(cx,L0,cz,Math.atan2(dx,dz),1),n=16,A=1.35;
  const Y=t=>Math.sin(Math.PI*t)*A,S=t=>Math.cos(Math.PI*t)*Math.PI*A/len;
  for(let i=0;i<=n;i++){const t=i/n,zz=(t-0.5)*len,rx=-Math.atan(S(t));
    part(B.box,F,0,Y(t)+0.1,zz,2.5,0.14,len/n*1.1,i%2?W.woodL:W.wood,rx);
    for(const sx of[-1.12,1.12])part(B.box,F,sx,Y(t)-0.12,zz,0.2,0.32,len/n*1.15,W.dark,rx);
  }
  for(let i=0;i<=n;i+=2){const t=i/n,zz=(t-0.5)*len;
    for(const sx of[-1.3,1.3])part(B.box,F,sx,Y(t)+0.65,zz,0.16,1.15,0.16,W.red);
    if(i<n){const t2=(i+1)/n,t3=(i+2)/n,z2=(t2-0.5)*len,dzs=len*2/n,dy=Y(t3)-Y(t);
      for(const sx of[-1.3,1.3])part(B.box,F,sx,Y(t2)+1.2,z2,0.13,0.12,Math.hypot(dzs,dy)+0.05,W.red,-Math.atan(dy/dzs));}
  }
}
function seaBridge(x0,z0,x1,z1,ya,yb,A){
  const len=Math.hypot(x1-x0,z1-z0),dx=(x1-x0)/len,dz=(z1-z0)/len,cx=(x0+x1)/2,cz=(z0+z1)/2;
  BRIDGES.push({cx,cz,dx,dz,len,ya,yb,A});
  const F=frame(cx,0,cz,Math.atan2(dx,dz),1),n=Math.round(len/0.9);
  const Y=t=>lerp(ya,yb,t)+Math.sin(Math.PI*t)*A,S=t=>((yb-ya)+Math.cos(Math.PI*t)*Math.PI*A)/len;
  for(let i=0;i<=n;i++){const t=i/n,zz=(t-0.5)*len,rx=-Math.atan(S(t));
    part(B.box,F,0,Y(t)+0.1,zz,2.5,0.14,len/n*1.08,i%2?W.woodL:W.wood,rx);
    for(const sx of[-1.12,1.12])part(B.box,F,sx,Y(t)-0.12,zz,0.2,0.3,len/n*1.12,W.dark,rx);
    if(i%3===0){for(const sx of[-1.3,1.3])part(B.box,F,sx,Y(t)+0.6,zz,0.16,1.05,0.16,W.wood);
      if(i<n){const t2=Math.min(1,(i+3)/n),z2=(t2-0.5)*len,dzs=z2-zz,dy=Y(t2)-Y(t);
        for(const sx of[-1.3,1.3])part(B.cyl,F,sx,(Y(t)+Y(t2))/2+1.02,(zz+z2)/2,0.05,Math.hypot(dzs,dy),0.05,'#d9cbb0',Math.PI/2-Math.atan2(dy,dzs));}}
    if(i%4===2){const wx=cx+dx*zz,wz=cz+dz*zz;if(hAt(wx,wz)<0)for(const sx of[-1.15,1.15])part(B.cyl,F,sx,(Y(t)-2.4)/2,zz,0.34,Y(t)+2.4,0.34,W.dark);}
    if(i===Math.round(n/2)||i===3||i===n-3)for(const sx of[-1.3,1.3])part(G.sph,F,sx,Y(t)+1.25,zz,0.28,0.36,0.28,W.lamp);
  }
  addNightLight(cx,Y(0.5)+1.6,cz);
}
function fenceLine(ax,az,bx,bz,gap=null){
  const len=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.ceil(len/1.7)),pts=[];
  for(let i=0;i<=n;i++){const t=i/n,x=lerp(ax,bx,t),z=lerp(az,bz,t);
    const skip=gap&&Math.hypot(x-gap[0],z-gap[1])<1.3;pts.push({x,z,skip});
    if(!skip){part(B.box,frame(x,hAt(x,z),z),0,0.6,0,0.18,1.2,0.18,W.wood);addCircleObs(x,z,0.38);}
  }
  for(let i=0;i<n;i++){const a=pts[i],b=pts[i+1];if(a.skip||b.skip)continue;
    const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,F=frame(mx,hAt(mx,mz),mz,Math.atan2(b.x-a.x,b.z-a.z));
    const sl=Math.hypot(b.x-a.x,b.z-a.z);part(B.box,F,0,0.9,0,0.08,0.12,sl,W.woodL);part(B.box,F,0,0.45,0,0.08,0.12,sl,W.woodL);
    addCircleObs(mx,mz,0.38);
  }
}
function fenceRect(x0,x1,z0,z1,gap){fenceLine(x0,z0,x1,z0,gap);fenceLine(x1,z0,x1,z1,gap);fenceLine(x1,z1,x0,z1,gap);fenceLine(x0,z1,x0,z0,gap);}
function crate(x,z,s=1,yOff=0,ry=R(0,1)){
  const y=(yOff||hAt(x,z)),F=frame(x,y,z,ry,s);
  part(B.box,F,0,0.5,0,1,1,1,'#b0834f');
  for(const sy of[0.2,0.8])for(const sz of[-0.51,0.51])part(B.box,F,0,sy,sz,1.02,0.14,0.04,'#7d5b37');
  for(const sx of[-0.51,0.51])part(B.box,F,sx,0.5,0,0.04,0.14,1.02,'#7d5b37');
  addCircleObs(x,z,0.75*s);
}
function bench(x,z,ry){
  const F=frame(x,hAt(x,z),z,ry);
  part(B.box,F,0,0.55,0,2.4,0.12,0.7,W.woodL);part(B.box,F,0,1.0,-0.32,2.4,0.5,0.08,W.woodL);
  for(const sx of[-1,1]){part(B.box,F,sx,0.27,0,0.12,0.55,0.6,W.dark);part(B.box,F,sx,0.8,-0.32,0.1,0.9,0.1,W.dark);}
  for(const d of[-0.85,0,0.85])addCircleObs(x+d*Math.cos(ry),z-d*Math.sin(ry),0.65);
}
function bowl(x,z,col,water){
  const F=frame(x,hAt(x,z),z);
  part(B.bowl,F,0,0.1,0,0.85,0.22,0.85,col);
  if(water)part(B.stone,F,0,0.2,0,0.62,0.02,0.62,'#6fb7d8');
  else for(let i=0;i<5;i++)part(B.ico,F,R(-0.2,0.2),0.23,R(-0.2,0.2),0.14,0.1,0.14,'#8a5a2b');
  addCircleObs(x,z,0.55);
}
function petHouse(x,z,ry,col){
  const F=frame(x,hAt(x,z),z,ry);
  part(B.box,F,0,0.65,0,1.7,1.3,1.9,col);
  part(B.pyr,F,0,1.75,0,3.3,0.95,3.6,'#9b3b2f');
  part(B.box,F,0,0.5,0.96,0.65,0.8,0.04,'#2a211c');
  part(B.box,F,0,1.05,1.0,0.5,0.14,0.04,W.woodL);
  addCircleObs(x,z,1.5);
}
function toys(x,z){
  let y=hAt(x,z);part(B.sph,frame(x,y,z),0,0.22,0,0.44,0.44,0.44,'#ff5d5d');
  y=hAt(x+1.3,z+0.4);part(B.torus,frame(x+1.3,y,z+0.4),0,0.12,0,0.9,0.9,0.9,'#4fb3ff',Math.PI/2);
  y=hAt(x-0.9,z+1.1);const F=frame(x-0.9,y,z+1.1,R(0,3));
  part(B.cyl,F,0,0.13,0,0.16,1.0,0.16,'#e9d7b1',0,0,Math.PI/2);part(B.sph,F,-0.55,0.15,0,0.3,0.3,0.3,'#e9d7b1');part(B.sph,F,0.55,0.15,0,0.3,0.3,0.3,'#e9d7b1');
  y=hAt(x+0.4,z-1.2);part(B.sph,frame(x+0.4,y,z-1.2),0,0.18,0,0.36,0.36,0.36,'#ffd23f');
}
function petBed(x,z){
  const F=frame(x,hAt(x,z),z);
  part(B.torus,F,0,0.18,0,2.1,2.1,1.6,'#d9795c',Math.PI/2);
  part(B.cyl,F,0,0.1,0,1.7,0.16,1.7,'#f2d6b8');
  addCircleObs(x,z,1.15);
}
function swing(x,z,ry){
  const F=frame(x,hAt(x,z),z,ry);
  for(const sx of[-1.6,1.6])for(const sz of[-0.5,0.5])part(B.box,F,sx,1.25,sz,0.14,2.6,0.14,W.dark,sz*-0.35,0,0);
  part(B.box,F,0,2.45,0,3.6,0.18,0.18,W.dark);
  const pv=new T.Group();pv.position.set(x,hAt(x,z)+2.45,z);pv.rotation.order='YXZ';pv.rotation.y=ry;scene.add(pv);
  const rope=mStd('#d9cbb0',{roughness:0.9}),wd=mStd('#8a6143',{roughness:0.8});
  for(const sx of[-0.9,0.9])blob(pv,CYL,rope,sx,-0.8,0,0.04,1.6,0.04,false);
  blob(pv,BOX,wd,0,-1.6,0,2.1,0.12,0.6);blob(pv,BOX,wd,0,-1.25,-0.28,2.1,0.6,0.08);
  const lunaA=new T.Object3D();lunaA.position.set(-0.45,-1.54,0.02);pv.add(lunaA);const dogA=new T.Object3D();dogA.position.set(0.5,-1.54,0.06);pv.add(dogA);
  for(const sx of[-1.6,1.6])for(const sz of[-0.5,0.5])addCircleObs(x+Math.cos(ry)*sx+Math.sin(ry)*sz,z-Math.sin(ry)*sx+Math.cos(ry)*sz,0.32);
  SWING={x,z,ry,pv,lunaA,dogA,amp:0,target:0,ph:0,front:[x+Math.sin(ry)*1.45,z+Math.cos(ry)*1.45],
    update(dt){this.amp=lerp(this.amp,this.target,Math.min(1,dt*0.9));this.ph+=dt*2.1;this.pv.rotation.x=Math.sin(this.ph)*(this.amp+0.025);}};
}
let SWING=null;
function postLantern(x,y,z){
  const F=frame(x,y,z);
  part(B.box,F,0,1.2,0,0.16,2.4,0.16,W.dark);part(B.box,F,0.35,2.35,0,0.8,0.1,0.1,W.dark);
  part(G.sph,F,0.65,2.0,0,0.42,0.52,0.42,W.lamp);part(B.cyl,F,0.65,2.3,0,0.3,0.06,0.3,W.dark);
  addCircleObs(x,z,0.45);
}

/* ---------------- place architecture ---------------- */
const HOUSE={x:20,z:-2};
house(HOUSE.x,HOUSE.z);
shrine(16,-38);
// stairs to the shrine terrace
for(let i=0;i<9;i++){const z=-14.5-i,top=L0+(i+1)*(3.5/9);part(B.box,frame(10,0,z),0,top-0.45,0,6,0.9,1.05,i%2?W.stone:W.stoneD);}
for(const sx of[6.6,13.4])for(let i=0;i<9;i+=2){const z=-14.5-i;part(B.box,frame(sx,0,z),0,L0+(i+1)*0.39,0,0.8,1.0,2.1,W.stoneD);}
addBoxObs(6.0,7.2,-23.5,-13.8);addBoxObs(12.8,14.0,-23.5,-13.8);
torii(10,-11,0,1.3);torii(10,-26,0,1.0);torii(13.4,-31,Math.atan2(0.8,-0.6),0.72);
bridge(-7,17.5,0.885,-0.466,9);
bridge(-17,-1.5,0.885,-0.466,9);
// dock
let zE=34;while(hAt(24,zE)>-1&&zE<90)zE+=0.25;
(function dock(){
  const F=frame(24,0,zE,0,1),top=1.7;
  for(let k=0,zz=-5;zz<=14;zz+=0.55,k++)part(B.box,F,0,top,zz,3.6,0.14,0.48,k%3?W.woodL:W.wood);
  for(const sx of[-1.5,1.5])part(B.box,F,sx,top-0.2,4.5,0.22,0.24,19,W.dark);
  for(const zz of[0,3.5,7,10.5,14])for(const sx of[-1.9,1.9])part(B.cyl,F,sx,-0.4,zz,0.36,4.4,0.36,W.dark);
  part(B.box,F,0,top,15.9,7.4,0.14,3.2,W.woodL);
  for(const sx of[-3.4,3.4])for(const zz of[14.6,17.2])part(B.cyl,F,sx,-0.4,zz,0.36,4.4,0.36,W.dark);
  for(const sx of[-1.9,1.9]){part(B.box,F,sx,top+0.75,6.5,0.1,0.1,13,W.wood);for(const zz of[0,3.25,6.5,9.75,13])part(B.box,F,sx,top+0.4,zz,0.14,0.8,0.14,W.wood);}
  part(B.torus,F,-2.6,top+0.16,15.4,1.1,1.1,0.9,'#d9cbb0',Math.PI/2);
  addCircleObs(24-2.6,zE+15.4,0.65);
  postLantern(24-3.6,top,zE+17.3);postLantern(24+3.2,top,zE+17.3);
  crate(26.4,zE+15.2,0.8,top+0.07,0.3);crate(26.6,zE+16.4,0.65,top+0.07,1.1);
  addNightLight(24,top+2.4,zE+16.5);
})();
// seaside market at the foot of the pier: Luna sells her harvest and her catch here
const PRICES={knit:18,herbs:6,honey:15,egg:5,apple:4,berries:3,shell:4,blossom:3,wood:8,pumpkin:8,tomato:4,carrot:3,kale:4,lettuce:5,corn:4,garlic:3,
  'Bluegill':12,'Largemouth Bass':28,'Rainbow Trout':24,'Channel Catfish':30,'Koi':0,
  'Atlantic Mackerel':22,'Red Snapper':40,'Striped Bass':36,'Flounder':26,'Pufferfish':45};
const MARKET=(function(){
  const mx=29,mz=39.9,y=hAt(mx,mz),F=frame(mx,y,mz,0);
  addBoxObs(26.6,31.1,37.5,42.3);
  // floor, posts, back wall, half walls
  part(B.box,F,0,0.12,0,4.6,0.24,4.8,W.woodL);
  for(let k=0;k<9;k++)part(B.box,F,-2.1+k*0.52,0.25,0,0.04,0.02,4.7,W.wood);
  for(const[px,pz]of[[-2.1,-2.25],[-2.1,2.25],[1.95,-2.25],[1.95,2.25]])part(B.box,F,px,1.7,pz,0.22,3.0,0.22,W.wood);
  part(B.box,F,2.0,1.6,0,0.14,2.8,4.4,'#efe6d1');
  for(const s of[-1,1])part(B.box,F,-0.05,0.7,s*2.25,4.0,0.9,0.1,W.woodL);
  // shelves of jars and squash on the back wall
  for(const sy of[1.15,1.85]){part(B.box,F,1.78,sy,0,0.36,0.06,4.0,W.woodL);
    for(let k=0;k<7;k++){const zz=-1.6+k*0.53,col=['#e8792a','#f2c94c','#d9532b','#7fae3a','#c63a2f','#f2c94c','#e8792a'][k];
      if(sy<1.5)part(B.sph,F,1.78,sy+0.15,zz,0.24,0.2,0.24,col);else{part(B.cyl,F,1.78,sy+0.15,zz,0.16,0.26,0.16,'#cfe6ee');part(B.cyl,F,1.78,sy+0.12,zz,0.13,0.18,0.13,col);}}}
  // counter with produce crates and a fish tray on ice
  part(B.box,F,-1.7,0.72,0,0.7,0.95,3.9,W.wood);part(B.box,F,-1.7,1.22,0,0.9,0.08,4.1,W.woodL);
  for(let k=0;k<4;k++){const zz=-1.5+k;part(B.box,F,-1.72,1.36,zz,0.66,0.2,0.86,k===3?'#e9f3f7':'#b0834f');}
  for(const[a,b]of[[-0.15,-0.2],[0.12,0.05],[-0.1,0.18],[0.1,-0.22]])part(B.sph,F,-1.72+a,1.55,-1.5+b,0.2,0.16,0.2,'#e8792a');
  for(let k=0;k<5;k++){part(B.cyl,F,-1.92+k*0.1,1.52,-0.5,0.06,0.42,0.06,'#f2c94c',Math.PI/2);part(B.ico,F,-1.92+k*0.1,1.53,-0.27,0.07,0.07,0.16,'#7fae3a');}
  for(let k=0;k<6;k++)part(B.sph,F,-1.95+(k%3)*0.16,1.52,0.5+(k<3?-0.15:0.15),0.05,0.05,0.2,'#f08a2c');
  for(let k=0;k<3;k++)part(B.sph,F,-1.9+k*0.2,1.5,1.5,0.07,0.05,0.3,['#b9c2ca','#e0503a','#2f6f8a'][k]);
  // gable roof and ridge beam
  for(const s of[-1,1])part(B.box,F,s*1.15,3.6,0,2.62,0.12,5.4,'#b8473a',0,0,-s*0.42);
  part(B.box,F,0,4.12,0,0.2,0.2,5.5,W.dark);
  // barrels and crates outside
  part(B.cyl,F,1.1,0.45,-2.95,0.42,0.9,0.42,W.wood);part(B.cyl,F,1.7,0.45,-3.0,0.42,0.9,0.42,W.wood);
  part(B.box,F,0.9,0.35,2.95,0.7,0.7,0.7,'#b0834f');part(B.box,F,1.6,0.35,3.0,0.7,0.7,0.7,'#b0834f');part(B.box,F,1.25,1.0,2.95,0.6,0.6,0.6,'#b0834f');
  for(const[a,b]of[[1.1,-2.95],[1.7,-3.0]])part(B.sph,F,a,0.98,b,0.26,0.2,0.26,'#e8792a');
  addCircleObs(mx+1.4,mz-2.95,0.75);addCircleObs(mx+1.25,mz+2.95,0.75);
  // lanterns and a string of bulbs across the front
  for(const s of[-1,1]){part(B.box,F,-2.3,2.75,s*2.25,0.06,0.3,0.06,W.dark);part(G.sph,F,-2.3,2.5,s*2.25,0.22,0.28,0.22,W.lamp);}
  addNightLight(mx-2.4,y+2.6,mz);
  for(let k=0;k<9;k++){const t=k/8,zz=-2.2+t*4.4;part(G.sph,F,-2.35,3.05-Math.sin(t*Math.PI)*0.35,zz,0.07,0.09,0.07,k%2?W.warm:'#ff9ac0');}
  // striped awning over the counter + painted sign + chalk price board
  const g=new T.Group();g.position.set(mx,y,mz);scene.add(g);
  const stripe=canvasTex(256,64,c=>{for(let i=0;i<8;i++){c.fillStyle=i%2?'#fbf3e4':'#d9483b';c.fillRect(i*32,0,32,64);}});
  const aw=new T.Mesh(new T.PlaneGeometry(4.9,1.1),new T.MeshStandardMaterial({map:stripe,side:T.DoubleSide,roughness:0.8}));
  aw.position.set(-2.65,2.95,0);aw.rotation.set(0,-Math.PI/2,0);aw.rotateX(-0.95);aw.castShadow=true;g.add(aw);
  for(let k=0;k<10;k++){const sc=new T.Mesh(new T.CircleGeometry(0.245,12,0,Math.PI),mStd(k%2?'#fbf3e4':'#d9483b',{side:T.DoubleSide}));
    sc.position.set(-3.1,2.62,-2.2+k*0.49);sc.rotation.set(Math.PI,-Math.PI/2,0);g.add(sc);}
  const signTex=canvasTex(512,128,c=>{c.fillStyle='#2f5a4a';c.fillRect(0,0,512,128);c.strokeStyle='#f2c94c';c.lineWidth=8;c.strokeRect(8,8,496,112);
    c.fillStyle='#fbf3e4';c.font='800 54px "Zen Maru Gothic", Nunito, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('SEASIDE MARKET',256,68);
    c.fillStyle='#f2c94c';for(const x of[34,478]){c.beginPath();c.arc(x,64,14,0,6.2832);c.fill();}});
  const sign=new T.Mesh(new T.PlaneGeometry(3.4,0.85),new T.MeshStandardMaterial({map:signTex,roughness:0.7}));
  sign.position.set(-2.38,3.55,0);sign.rotation.y=-Math.PI/2;g.add(sign);
  const board=canvasTex(256,320,c=>{c.fillStyle='#24302c';c.fillRect(0,0,256,320);c.strokeStyle='#8a6143';c.lineWidth=14;c.strokeRect(0,0,256,320);
    c.fillStyle='#f4efe2';c.textAlign='center';c.font='700 30px "Zen Maru Gothic", Nunito, sans-serif';c.fillText('Today',128,44);
    c.font='500 22px "Zen Maru Gothic", Nunito, sans-serif';c.textAlign='left';
    [['Pumpkin',8],['Corn',4],['Carrot',3],['Lettuce',5],['Tomato',4],['Fish','12-45']].forEach(([n,p],i)=>{c.fillText(n,26,92+i*38);c.textAlign='right';c.fillText(p+' ¢',230,92+i*38);c.textAlign='left';});});
  const bg=new T.Group();bg.position.set(-3.3,0,-2.9);bg.rotation.y=-Math.PI/2-0.5;g.add(bg);
  for(const s of[-1,1]){const leg=blob(bg,BOX,mStd('#6e4b33'),0,0.55,s*0.32,0.06,1.15,0.06);leg.rotation.x=s*0.25;}
  const bp=new T.Mesh(new T.PlaneGeometry(0.75,0.95),new T.MeshStandardMaterial({map:board,roughness:0.95}));bp.position.set(0,0.7,0.36);bp.rotation.x=-0.25;bg.add(bp);
  addCircleObs(mx-3.3,mz-2.9,0.45);
  // the shopkeeper: Mrs. Marmalade, a ginger cat in an apron
  const kp=new T.Group();kp.position.set(mx-0.85,y+0.24,mz);kp.rotation.y=-Math.PI/2;scene.add(kp);
  const fur=mStd('#e98b3c',{roughness:0.95}),cream=mStd('#fbefdc',{roughness:0.95}),apron=mStd('#4f9a8a',{roughness:0.8});
  const body=new T.Group();kp.add(body);
  blob(body,SPH,fur,0,0.55,0,0.3,0.45,0.26);blob(body,SPH,apron,0,0.52,0.08,0.27,0.4,0.22,false);blob(body,SPH,cream,0,0.85,0.14,0.16,0.12,0.08,false);
  for(let k=0;k<3;k++)blob(body,SPH,mStd('#c96a26'),0,0.92-k*0.12,-0.2,0.24,0.03,0.08,false);
  const head=new T.Group();head.position.set(0,1.2,0.02);body.add(head);
  blob(head,SPH,fur,0,0,0,0.27,0.24,0.24);blob(head,SPH,cream,0,-0.07,0.17,0.13,0.09,0.08,false);
  blob(head,SPH,mStd('#f07f98'),0,-0.02,0.24,0.035,0.025,0.02,false);
  for(const s of[-1,1]){const ear=blob(head,CONE,fur,s*0.15,0.22,-0.02,0.09,0.16,0.07);ear.rotation.z=-s*0.35;
    const inn=blob(head,CONE,mStd('#f6a9bb'),s*0.148,0.21,0.02,0.05,0.1,0.02,false);inn.rotation.z=-s*0.35;
    blob(head,SPH,mStd('#1d1a1c',{roughness:0.2}),s*0.09,0.04,0.2,0.035,0.045,0.025,false);
    blob(head,SPH,mStd('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.4}),s*0.09+0.012,0.06,0.22,0.01,0.01,0.008,false);
    for(const a of[-0.15,0.1]){const wk=blob(head,CYL,mStd('#fbefdc'),s*0.2,-0.06+a*0.2,0.18,0.004,0.18,0.004,false);wk.rotation.z=s*(Math.PI/2+a);}}
  const kerchief=blob(head,SPH,mStd('#f2c94c'),0,0.2,-0.02,0.24,0.08,0.22,false);kerchief.rotation.x=-0.2;
  const arms=[];for(const s of[-1,1]){const a=new T.Group();a.position.set(s*0.3,0.85,0.02);body.add(a);blob(a,SPH,fur,0,-0.2,0,0.08,0.24,0.08);blob(a,SPH,cream,0,-0.42,0,0.075,0.07,0.075,false);arms.push(a);}
  const tail=blob(body,SPH,fur,0,0.35,-0.3,0.07,0.28,0.07);tail.rotation.x=-0.8;
  kp.userData.noWx=true;
  return {x:mx,z:mz,y,keeper:kp,body,head,arms,tail,waveT:0,
    update(dt,time){this.waveT=Math.max(0,this.waveT-dt);const w=this.waveT>0;
      this.body.position.y=Math.sin(time*2.1)*0.015;this.head.rotation.z=Math.sin(time*0.9)*0.08;this.tail.rotation.z=Math.sin(time*1.7)*0.4;
      const near=Math.hypot(AI.x-this.x,AI.z-this.z)<6;
      this.head.rotation.y=lerp(this.head.rotation.y,near?clamp(normalizeAngle(Math.atan2(AI.x-this.keeper.position.x,AI.z-this.keeper.position.z)+Math.PI/2),-0.8,0.8):Math.sin(time*0.4)*0.4,Math.min(1,dt*4));
      this.arms[1].rotation.z=lerp(this.arms[1].rotation.z,w?2.4+Math.sin(time*9)*0.35:0.15,Math.min(1,dt*8));
      this.arms[0].rotation.z=lerp(this.arms[0].rotation.z,-0.15,Math.min(1,dt*8));}};
})();
// gardens
const VEG={x0:33,x1:47,z0:8,z1:20},FLO={x0:34,x1:46,z0:-15,z1:-5},ZEN={x:-38,z:6,w:12,d:9},YARD={x0:-38,x1:-26,z0:27,z1:37};
fenceRect(VEG.x0,VEG.x1,VEG.z0,VEG.z1,[33,14]);
const VEG_BEDS=[],FLOWER_BEDS=[];
for(let r=0;r<3;r++)for(let c=0;c<2;c++){
  const bx=37.6+c*6.2,bz=10.2+r*3.8,y=hAt(bx,bz),F=frame(bx,y,bz);
  part(B.box,F,0,0.22,0,5,0.44,2.2,W.woodL);
  addBoxObs(bx-2.6,bx+2.6,bz-1.2,bz+1.2);
  VEG_BEDS.push({bx,bz,y:y+0.47,r,c});
}
// compost bin by the veggie patch
{const cx=31.2,cz=18.2,F=frame(cx,hAt(cx,cz),cz,0.2);
 for(let k=0;k<5;k++){part(B.box,F,0,0.15+k*0.22,0.75,1.6,0.16,0.08,W.woodL);part(B.box,F,0,0.15+k*0.22,-0.75,1.6,0.16,0.08,W.woodL);part(B.box,F,0.78,0.15+k*0.22,0,0.08,0.16,1.5,W.woodL);}
 for(const[a,b]of[[-0.78,-0.75],[0.78,-0.75],[-0.78,0.75],[0.78,0.75]])part(B.box,F,a,0.55,b,0.12,1.1,0.12,W.dark);
 part(B.ico,F,0,0.75,0,1.3,0.55,1.3,'#4a3324');addCircleObs(cx,cz,1.1);}
petHouse(44.5,22.8,-0.4,'#c98b5a');
fenceRect(FLO.x0,FLO.x1,FLO.z0,FLO.z1,[34,-10]);
// the old flower garden is now a corn & carrot field (two rows of raised beds with a centre aisle)
for(let r=0;r<2;r++)for(let c=0;c<2;c++){const bx=37.4+c*5.6,bz=-12+r*4.4,y=hAt(bx,bz),F=frame(bx,y,bz);
  part(B.box,F,0,0.22,0,5,0.44,2.2,W.woodL);
  addBoxObs(bx-2.6,bx+2.6,bz-1.2,bz+1.2);
  VEG_BEDS.push({bx,bz,y:y+0.47,r,c,field:(r+c)%2?'carrot':'corn',spotZ:r?bz-1.9:bz+1.9});}
// a little scarecrow watches over the corn
{const sx=46.6,sz=-15.8,F=frame(sx,hAt(sx,sz),sz,-2.4);part(B.cyl,F,0,0.9,0,0.1,1.8,0.1,W.woodL);part(B.cyl,F,0,1.35,0,0.08,1.3,0.08,W.woodL,0,0,Math.PI/2);
 part(B.box,F,0,1.25,0,0.5,0.6,0.25,'#c63a2f');part(B.sph,F,0,1.78,0,0.4,0.44,0.4,'#e2cc9a');part(B.cyl,F,0,1.94,0,0.72,0.06,0.72,'#c9a24a');part(B.ico,F,0,2.06,0,0.36,0.3,0.36,'#c9a24a');}
// zen raked sand garden
(function zen(){
  const cv=document.createElement('canvas');cv.width=768;cv.height=576;const ctx=cv.getContext('2d');
  ctx.fillStyle='#ece2cc';ctx.fillRect(0,0,768,576);
  {const zr=mulberry32(5);for(let i=0;i<9000;i++){const v=Math.round(200+zr()*55);ctx.fillStyle=`rgba(${v},${v-8},${v-22},.55)`;ctx.fillRect(zr()*768,zr()*576,1.4,1.4);}}
  ctx.strokeStyle='rgba(140,118,88,.45)';ctx.lineWidth=4;
  for(let y=10;y<576;y+=16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(768,y);ctx.stroke();}
  const spots=[[230,210,40],[520,330,56],[610,150,30]];
  for(const[x,y,r0]of spots){ctx.fillStyle='#ece2cc';ctx.beginPath();ctx.arc(x,y,r0+90,0,Math.PI*2);ctx.fill();
    for(let r=r0+10;r<r0+95;r+=16){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}}
  {const zr=mulberry32(9);for(let i=0;i<5000;i++){const v=Math.round(195+zr()*55);ctx.fillStyle=`rgba(${v},${v-8},${v-22},.5)`;ctx.fillRect(zr()*768,zr()*576,1.3,1.3);}}
  const tex=new T.CanvasTexture(cv);
  const y=hAt(ZEN.x,ZEN.z);
  const m=new T.Mesh(new T.PlaneGeometry(ZEN.w,ZEN.d),new T.MeshStandardMaterial({map:tex,roughness:1}));
  m.rotation.x=-Math.PI/2;m.position.set(ZEN.x,y+0.14,ZEN.z);m.receiveShadow=true;scene.add(m);
  const F=frame(ZEN.x,y,ZEN.z);
  part(B.box,F,0,0.12,ZEN.d/2+0.15,ZEN.w+0.6,0.3,0.3,W.stoneD);part(B.box,F,0,0.12,-ZEN.d/2-0.15,ZEN.w+0.6,0.3,0.3,W.stoneD);
  part(B.box,F,ZEN.w/2+0.15,0.12,0,0.3,0.3,ZEN.d,W.stoneD);part(B.box,F,-ZEN.w/2-0.15,0.12,0,0.3,0.3,ZEN.d,W.stoneD);
  for(const[x,yy,r0]of spots){const wx=ZEN.x-ZEN.w/2+x/768*ZEN.w,wz=ZEN.z-ZEN.d/2+yy/576*ZEN.d,s=r0/30;
    part(B.rock,frame(wx,y,wz,R(0,6)),0,0.35*s,0,1.1*s,0.9*s,1.0*s,'#7f837f');part(B.ico,frame(wx,y,wz),0,0.72*s,0,0.8*s,0.28*s,0.75*s,'#6d8f4a');}
  addBoxObs(ZEN.x-ZEN.w/2-0.4,ZEN.x+ZEN.w/2+0.4,ZEN.z-ZEN.d/2-0.4,ZEN.z+ZEN.d/2+0.4);
})();
// pet play yard on the lower front terrace
fenceRect(YARD.x0,YARD.x1,YARD.z0,YARD.z1,[-26,31]);
petHouse(-35.5,29.5,0.5,'#e2b27a');petBed(-29,34.5);toys(-32,33);
bowl(-36,34.8,'#4fb3ff',true);bowl(-34.9,35.2,'#ff8fab',false);
crate(-37,36,0.8);crate(-36.2,36.3,0.55,hAt(-36.2,36.3)+0.8,0.8);
// near house pet corner
bowl(26.5,5.2,'#ffd23f',false);bowl(27.6,5.4,'#4fb3ff',true);toys(29,3);petBed(9.5,-3);
crate(30.5,-7,0.9);crate(31.4,-6.2,0.7);crate(30.8,-6.6,0.6,hAt(30.8,-6.6)+0.9,0.5);
swing(12,15,0.6);
bench(-33,-7,Math.PI*0.45);bench(28,31,Math.PI);bench(20,-42,0);bench(-2,-6,0.1);
// stone lanterns along paths
[[6.2,-13],[13.8,-13],[6.2,-24.2],[13.8,-24.2],[-1,12],[-31,-4],[-30.5,11.5],[27.5,28],[15,8],[-14,-6]].forEach(p=>stoneLantern(p[0],p[1]));
addNightLight(10,hAt(10,-24)+2.5,-24.5);addNightLight(-4,hAt(-4,12)+2.2,13);addNightLight(-31,hAt(-31,-4)+2.2,-4);

/* ---------------- stone paths ---------------- */
const PATHS=[
  [[24,zE-2],[24,30],[21,14],[20,6.5]],
  [[20,6.5],[10,4],[10,-13.8]],
  [[10,-23.6],[11,-29],[16,-33.5]],
  [[10,3],[0,8],[-2.2,15]],
  [[-11.8,20],[-22,16],[-31,10.8]],
  [[-11.8,20],[-16,26],[-26,31]],
  [[10,-5],[0,-4],[-12.2,-4]],
  [[-21.8,1],[-28,-2],[-32,-6]],
  [[27,0],[31,4],[33,14]],
  [[27,-4],[34,-10]]
];
function pathDist(x,z){let d=1e9;for(const P of PATHS)for(let i=0;i<P.length-1;i++)d=Math.min(d,segDist(x,z,P[i][0],P[i][1],P[i+1][0],P[i+1][1]));return d;}
for(const P of PATHS)for(let i=0;i<P.length-1;i++){
  const[ax,az]=P[i],[bx,bz]=P[i+1],len=Math.hypot(bx-ax,bz-az),n=Math.floor(len/0.95),px=-(bz-az)/len,pz=(bx-ax)/len;
  for(let k=0;k<=n;k++){const t=k/n,cx=lerp(ax,bx,t),cz=lerp(az,bz,t),offs=k%2?[-0.6,0.6]:[0,-1.05,1.05];
    for(const o of offs){if(k%2===0&&Math.abs(o)>0.5&&rand()<0.5)continue;
      const x=cx+px*(o+R(-0.12,0.12)),z=cz+pz*(o+R(-0.12,0.12));if(waterDist(x,z)<0.6)continue;
      const s=R(0.75,1.05);groundStone(x,z,s,s*R(0.8,1),rand()<0.5?'#b9b3a6':'#a39d91');}
  }
}

/* ---------------- vegetation ---------------- */
const ZONES=[[11,29,-10,8],[VEG.x0-1,VEG.x1+1,VEG.z0-1,VEG.z1+3],[FLO.x0-1,FLO.x1+1,FLO.z0-1,FLO.z1+1],
  [ZEN.x-ZEN.w/2-1,ZEN.x+ZEN.w/2+1,ZEN.z-ZEN.d/2-1,ZEN.z+ZEN.d/2+1],[10,22,-44,-31],[5,15,-26,-12],
  [19,29,26,70],[25,33.5,35.5,44],[YARD.x0-1,YARD.x1+1,YARD.z0-1,YARD.z1+1],[-27,-17,-36,-16],[8,16,12,18],[25,33,-9,7],[12,30.5,6.5,14],[29.5,33,15.5,20.5]];
const TREES=[];
function okSpot(x,z,o){
  if(Math.hypot(x,z)>edgeR(Math.atan2(z,x))-(o.margin||3))return false;
  const h=hAt(x,z);if(h<1)return false;
  if(waterDist(x,z)<(o.water||2.5))return false;
  if(pathDist(x,z)<(o.path||2.8))return false;
  for(const b of ZONES)if(x>b[0]&&x<b[1]&&z>b[2]&&z<b[3])return false;
  if(o.flat){const s=Math.max(Math.abs(hAt(x+1,z)-h),Math.abs(hAt(x-1,z)-h),Math.abs(hAt(x,z+1)-h),Math.abs(hAt(x,z-1)-h));if(s>o.flat)return false;}
  if(o.space)for(const t of TREES)if(Math.hypot(t[0]-x,t[1]-z)<o.space)return false;
  return true;
}
const CANOPIES=[];
function treeBegin(){TREE_REC=[];return{c0:CIRCLE_OBS.length,k0:CANOPIES.length};}
function treeEnd(x,z,kind,s,st){TREE_LIST.push({id:TREE_LIST.length,x,z,y:hAt(x,z),kind,s,parts:TREE_REC,obs:CIRCLE_OBS.slice(st.c0),canopies:CANOPIES.slice(st.k0),chopped:false});TREE_REC=null;}
function cherry(x,z,s){const st=treeBegin();cherry0(x,z,s);treeEnd(x,z,'Cherry tree',s,st);}
function pine(x,z,s){const st=treeBegin();pine0(x,z,s);treeEnd(x,z,'Pine tree',s,st);}
function bamboo(x,z){const st=treeBegin();bamboo0(x,z);treeEnd(x,z,'Bamboo grove',1,st);}
function cherry0(x,z,s){
  const y=hAt(x,z),F=frame(x,y,z,R(0,6.28),s);TREES.push([x,z]);
  const pal=pick(SEASON.canopy),cs=SEASON.canopyScale;
  addCircleObs(x,z,0.65*s+0.3);
  part(B.cyl,F,0,1.5,0,0.55,3,0.55,'#6b4a36');
  part(B.cyl,F,0.55,3.3,0,0.32,2.2,0.32,'#6b4a36',0,0,-0.6);part(B.cyl,F,-0.5,3.2,0.3,0.3,2,0.3,'#6b4a36',0.3,0,0.65);
  const n=7+Math.floor(rand()*3);
  for(let i=0;i<n;i++){const a=i/n*6.28+R(-0.3,0.3),r=i===0?0:R(1.2,2.3),d=R(1.9,2.9);
    part(B.blossom,F,Math.cos(a)*r,4.4+R(-0.6,1.4),Math.sin(a)*r,d*cs,d*0.88*cs,d*cs,pick(pal));}
  CANOPIES.push({x,z,y:y+4.7*s,r:2.3*s,pal});
  for(let i=0,nl=Math.round(22*SEASON.litter);i<nl;i++){const a=R(0,6.28),r=R(0.6,4.2)*s,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
    if(waterDist(px,pz)<0.3)continue;part(B.petal,frame(px,meshH(px,pz)+0.02,pz,R(0,6.28)),0,0,0,0.3,0.03,0.2,pick(pal));}
}
function pine0(x,z,s){
  const y=hAt(x,z),F=frame(x,y,z,R(0,6.28),s);TREES.push([x,z]);
  addCircleObs(x,z,1.1*s+0.3);
  part(B.cyl,F,0,0.8,0,0.45,1.6,0.45,'#5a3d2a');
  const tiers=[[2.3,4.2,3.2],[3.9,3.3,2.8],[5.3,2.3,2.4]];
  for(const[ty,w,h]of tiers)part(B.cone7,F,0,ty,0,w,h,w,rand()<0.5?'#2f6b45':'#397a50');
}
function bamboo0(x,z){
  TREES.push([x,z]);addCircleObs(x,z,2.1);const n=8+Math.floor(rand()*6);
  for(let i=0;i<n;i++){const px=x+R(-1.6,1.6),pz=z+R(-1.6,1.6),h=R(6,10),y=hAt(px,pz),rx=R(-0.07,0.07),rz=R(-0.07,0.07),F=frame(px,y,pz);
    part(B.cyl,F,0,h/2,0,0.22,h,0.22,rand()<0.5?'#86b24f':'#6f9e42',rx,0,rz);
    for(let k=0;k<3;k++)part(B.ico,F,R(-0.8,0.8)+rz*-h,h*R(0.6,1),R(-0.8,0.8)+rx*h,R(0.9,1.5),R(0.35,0.55),R(0.9,1.5),SEASON.bamboo);}
}
function mossRock(x,z,s){
  const y=hAt(x,z),F=frame(x,y,z,R(0,6.28));
  part(B.rock,F,0,0.35*s,0,1.3*s,R(0.8,1.1)*s,R(1,1.3)*s,rand()<0.5?'#84878a':'#747a7c');
  if(rand()<0.75)part(B.ico,F,0,0.75*s,0,0.95*s,0.3*s,0.95*s,SEASON.moss);
  addCircleObs(x,z,0.7*s+0.25);
}
function bush(x,z,s){const F=frame(x,hAt(x,z),z,R(0,6));
  for(let i=0;i<3;i++)part(B.ico,F,R(-0.6,0.6)*s,0.55*s,R(-0.6,0.6)*s,R(1,1.5)*s,R(0.8,1.1)*s,R(1,1.5)*s,pick(SEASON.bush));
  addCircleObs(x,z,0.85*s+0.25);
}
function scatter(count,tries,o,fn){let placed=0;for(let t=0;t<tries&&placed<count;t++){const x=R(-62,62),z=R(-62,62);if(okSpot(x,z,o)){fn(x,z);placed++;}}}

// hand-placed hero trees
[[3.5,-14,1.35],[16.5,-17,1.0],[6,-38,1.35],[24,-31,1.0],[-15,33,1.35],[11,31,1.0],[4,-1.5,0.75],[-8,-13,1.0],[-34,17,1.0],[30,-17,0.75],[-4,40,0.75]].forEach(t=>cherry(t[0],t[1],t[2]));
scatter(24,4000,{flat:0.4,space:7,path:3},(x,z)=>cherry(x,z,pick([0.75,1,1,1.35])));
scatter(22,4000,{flat:0.5,space:4.5,margin:2.5},(x,z)=>{if(x>30||(z<-28&&x>-2)||(x<-40&&z<0))pine(x,z,R(0.8,1.25));});
[[-48,-6],[26,-47],[2,-45],[-45,22],[42,-24]].forEach(p=>{if(okSpot(p[0],p[1],{margin:2}))bamboo(p[0],p[1]);});
scatter(26,6000,{flat:0.4,space:3.5,path:2.4,margin:2.5},(x,z)=>{if(x>30||z<-28)pine(x,z,R(0.8,1.2));});
scatter(40,3000,{water:1.5,path:2},(x,z)=>mossRock(x,z,R(0.6,1.6)));
for(const P of[PA,PB])for(let i=0;i<14;i++){const a=R(0,6.28),r=P.r+R(1.3,2.2),x=P.x+Math.cos(a)*r,z=P.z+Math.sin(a)*r;if(pathDist(x,z)>1.6)mossRock(x,z,R(0.5,1.1));}
for(let i=0;i<10;i++){const z=R(-34,-19),x=WF.x+pick([-1,1])*R(3.3,5);mossRock(x,z,R(0.9,1.8));}
scatter(55,5000,{flat:0.6,path:2,water:1.2,space:2},(x,z)=>bush(x,z,R(0.6,1.1)));
// grass clumps & wildflowers
{let placed=0;for(let t=0;t<14000&&placed<2300;t++){const x=R(-62,62),z=R(-62,62);
  if(Math.hypot(x,z)>edgeR(Math.atan2(z,x))-1)continue;const h=hAt(x,z);if(h<1||waterDist(x,z)<0.4||pathDist(x,z)<1.4)continue;
  let bad=false;for(const b of ZONES.slice(0,8))if(x>b[0]&&x<b[1]&&z>b[2]&&z<b[3]){bad=true;break;}if(bad)continue;
  if(Math.abs(hAt(x+0.8,z)-h)>0.5)continue;
  const F=frame(x,h,z,R(0,6.28)),gc=pick(SEASON.clump);
  for(let k=0;k<3;k++)part(B.grass,F,R(-0.2,0.2),0.3,R(-0.2,0.2),0.18,R(0.5,0.8),0.18,gc,R(-0.25,0.25),0,R(-0.25,0.25));
  if(rand()<0.12)part(B.flower,F,0.1,0.62,0,0.22,0.18,0.22,pick(SEASON.wild));
  placed++;}}


/* ---------------- the little island across the sea bridge ---------------- */
{
  const I=ISLE2,y0=I.h;
  // a rustic boardwalk bridge on piles, from the east shore to the little island
  seaBridge(I.bx0,I.bz,I.bx1,I.bz,3.55,y0+0.05,0.8);
  // stepping-stone trail from the landing to the clearing
  const trail=[[I.bx1-1,I.bz],[I.x-6,I.z+1.5],[I.x-1,I.z+0.5],[I.x+3,I.z-2]];
  for(let s=0;s<trail.length-1;s++){const[ax,az]=trail[s],[bx,bz]=trail[s+1],len=Math.hypot(bx-ax,bz-az),n=Math.floor(len/1.1);
    for(let k=0;k<=n;k++){const t=k/n,x=lerp(ax,bx,t)+R(-0.25,0.25),z=lerp(az,bz,t)+R(-0.25,0.25),sc=R(0.75,1.05);
      groundStone(x,z,sc,sc*R(0.8,1),rand()<0.5?'#b9b3a6':'#a39d91');}}
  I.trail=trail;
  // nature: trees, bushes, mossy rocks, grass and wildflowers (the clearing in the middle stays open for your things)
  const ok=(x,z,m,space)=>{const d=Math.hypot(x-I.x,z-I.z);if(d>isle2Edge(Math.atan2(z-I.z,x-I.x))-m)return false;
    if(Math.hypot(x-(I.x+1),z-(I.z-0.5))<5.2)return false;if(Math.abs(z-I.bz)<2.6&&x<I.x-4)return false;
    for(const s of trail)if(Math.hypot(x-s[0],z-s[1])<1.6)return false;
    if(space)for(const t of TREES)if(Math.hypot(t[0]-x,t[1]-z)<space)return false;return true;};
  let n=0;for(let t=0;t<900&&n<11;t++){const x=I.x+R(-15,15),z=I.z+R(-15,15);if(ok(x,z,3.2,4.2)){if(rand()<0.45)pine(x,z,R(0.75,1.05));else cherry(x,z,pick([0.75,1,1]));n++;}}
  n=0;for(let t=0;t<600&&n<9;t++){const x=I.x+R(-15,15),z=I.z+R(-15,15);if(ok(x,z,2.2,2.2)){bush(x,z,R(0.6,1));n++;}}
  n=0;for(let t=0;t<600&&n<8;t++){const x=I.x+R(-15,15),z=I.z+R(-15,15);if(ok(x,z,1.8,2)){mossRock(x,z,R(0.6,1.3));n++;}}
  n=0;for(let t=0;t<4000&&n<420;t++){const x=I.x+R(-15,15),z=I.z+R(-15,15),d=Math.hypot(x-I.x,z-I.z);if(d>isle2Edge(Math.atan2(z-I.z,x-I.x))-1.2)continue;
    const h=hAt(x,z),F=frame(x,h,z,R(0,6.28)),gc=pick(SEASON.clump);
    for(let k=0;k<3;k++)part(B.grass,F,R(-0.2,0.2),0.3,R(-0.2,0.2),0.18,R(0.5,0.8),0.18,gc,R(-0.25,0.25),0,R(-0.25,0.25));
    if(rand()<0.2)part(B.flower,F,0.1,0.62,0,0.22,0.18,0.22,pick(SEASON.wild));n++;}
  // a driftwood bench looking out to sea, and a little welcome sign
  bench(I.x+9.5,I.z+6.5,-2.3);
  {const sx=I.bx1+1.6,sz=I.bz-2.1,F=frame(sx,hAt(sx,sz),sz,-Math.PI/2);part(B.box,F,0,0.6,0,0.12,1.2,0.12,W.wood);part(B.box,F,0,1.25,0,1.3,0.55,0.08,W.woodL);addCircleObs(sx,sz,0.35);}
}

/* ---------------- holiday decor around Luna's house (chosen from the real date) ---------------- */
const DECOR_UPDATERS=[];
(function holidayDecor(){
  if(!CAL.holiday)return;
  const HX=20,HZ=-2,y0=hAt(HX,HZ),deck=y0+1.7,railZ=HZ+5.62,railY=deck+0.9,eaveY=y0+5.0;
  const add=o=>{scene.add(o);return o;};
  const night=()=>typeof nightK==='number'?nightK:0;
  // a sagging string of bulbs between points; returns bulb positions
  function sag(points,step,drop){const out=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),n=Math.max(1,Math.round(len/step));
    for(let k=0;k<n;k++){const t=k/n;out.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)-Math.sin(Math.PI*t)*drop,lerp(a[2],b[2],t)]);}}out.push(points[points.length-1]);return out;}
  function bulbString(pts,colors,size){
    const im=new T.InstancedMesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial({color:0xffffff}),pts.length),M=new T.Matrix4(),c=new T.Color();
    pts.forEach((p,i)=>{M.makeScale(size,size*1.25,size).setPosition(p[0],p[1],p[2]);im.setMatrixAt(i,M);im.setColorAt(i,c.set(colors[i%colors.length]));});
    im.frustumCulled=false;add(im);
    // gentle chase: dim and brighten bulbs in turn
    let acc=0,phase=0;DECOR_UPDATERS.push(dt=>{acc+=dt;if(acc<0.35)return;acc=0;phase++;
      pts.forEach((p,i)=>{c.set(colors[i%colors.length]);if((i+phase)%4===0)c.multiplyScalar(0.45);im.setColorAt(i,c);});im.instanceColor.needsUpdate=true;});
    return im;
  }
  const leftRail=[[HX-6.6,railY,railZ],[HX-4.2,railY,railZ],[HX-1.8,railY,railZ]],rightRail=[[HX+1.8,railY,railZ],[HX+4.2,railY,railZ],[HX+6.6,railY,railZ]];
  const arch=[[HX-1.8,deck+0.05,railZ+0.05],[HX-1.8,deck+2.7,railZ+0.05],[HX-1.0,deck+3.05,railZ+0.05],[HX+1.0,deck+3.05,railZ+0.05],[HX+1.8,deck+2.7,railZ+0.05],[HX+1.8,deck+0.05,railZ+0.05]];

  if(CAL.holiday==='halloween')halloween();
  else if(CAL.holiday==='harvest')harvest();
  else if(CAL.holiday==='winter')winterLights();
  else if(CAL.holiday==='valentine')valentine();

  function halloween(){
    /* ---- carved jack-o'-lanterns: dark carved holes by day, candle glow at night ---- */
    const faceTex=[0,1,2].map(v=>canvasTex(128,128,c=>{c.clearRect(0,0,128,128);c.fillStyle='#fff';
      const tri=(x,y,s,up)=>{c.beginPath();c.moveTo(x-s,y+(up?s*0.6:-s*0.6));c.lineTo(x+s,y+(up?s*0.6:-s*0.6));c.lineTo(x,y+(up?-s:s));c.closePath();c.fill();};
      if(v===0){tri(40,46,16,true);tri(88,46,16,true);tri(64,66,8,true);
        c.beginPath();c.moveTo(22,80);for(let i=0;i<=8;i++)c.lineTo(22+i*10.5,i%2?96:80);c.lineTo(106,80);c.quadraticCurveTo(64,122,22,80);c.fill();}
      else if(v===1){c.beginPath();c.ellipse(42,48,13,17,0,0,7);c.ellipse(86,48,13,17,0,0,7);c.fill();tri(64,68,7,false);
        c.beginPath();c.moveTo(26,82);c.quadraticCurveTo(64,112,102,82);c.quadraticCurveTo(64,96,26,82);c.fill();}
      else{tri(40,48,15,false);tri(88,48,15,false);c.beginPath();c.arc(64,68,6,0,7);c.fill();
        c.beginPath();c.moveTo(30,84);c.lineTo(98,84);c.lineTo(90,100);c.lineTo(76,92);c.lineTo(64,104);c.lineTo(52,92);c.lineTo(38,100);c.closePath();c.fill();}}));
    const faceMats=faceTex.map(t=>new T.MeshStandardMaterial({color:'#2a1405',map:t,alphaMap:t,transparent:true,alphaTest:0.4,emissive:'#ff9a2a',emissiveMap:t,emissiveIntensity:0.4,depthWrite:false}));
    const pumpkinMat=mStd('#e8792a',{roughness:0.6}),stemMat=mStd('#5a4a24');
    function jack(x,y,z,s,ry,v){
      const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;g.scale.setScalar(s);
      blob(g,SPH,pumpkinMat,0,0.34,0,0.42,0.34,0.42);
      for(let k=0;k<6;k++){const a=k/6*Math.PI*2+0.5;blob(g,SPH,pumpkinMat,Math.cos(a)*0.16,0.34,Math.sin(a)*0.16,0.28,0.33,0.28,false);}
      blob(g,CYL,stemMat,0,0.72,0,0.05,0.14,0.05);
      const face=new T.Mesh(new T.PlaneGeometry(0.56,0.56),faceMats[v]);face.position.set(0,0.36,0.455);g.add(face);
      add(g);return g;
    }
    const gy=(x,z)=>hAt(x,z);
    [[HX-3.0,HZ+7.2,1.0,0],[HX+3.0,HZ+7.2,1.0,1],[HX-2.4,HZ+7.9,0.6,2],[HX+2.5,HZ+7.95,0.65,0]].forEach(([x,z,s,v])=>{jack(x,gy(x,z),z,s,0,v);addCircleObs(x,z,0.45*s+0.1);});
    jack(HX-1.3,deck+0.02,HZ+5.25,0.7,0,1);jack(HX+1.3,deck+0.02,HZ+5.25,0.7,0,2);
    [[19.2,9.6,0.8,0,0.3],[22.3,12.4,0.75,1,-0.4]].forEach(([x,z,s,v,ry])=>{jack(x,gy(x,z),z,s,ry,v);addCircleObs(x,z,0.4);});
    const porchGlow=new T.PointLight(0xff8a2a,0,13,2);porchGlow.position.set(HX,deck+0.7,HZ+6.4);add(porchGlow);
    DECOR_UPDATERS.push((dt,t)=>{const n=smooth(0.2,0.85,night()),fl=0.85+0.15*Math.sin(t*13)*Math.sin(t*7.3);
      faceMats.forEach((m,i)=>m.emissiveIntensity=(0.35+n*2.1)*(i===1?fl:0.92+0.08*Math.sin(t*11+i)));porchGlow.intensity=n*0.7*fl;});

    /* ---- motion-activated animatronic witch ---- */
    {const wx=HX+4.6,wz=HZ+8.6,Wg=new T.Group();Wg.position.set(wx,gy(wx,wz),wz);Wg.rotation.y=-0.4;add(Wg);addCircleObs(wx,wz,0.8);
     const robe=mStd('#2a1f3a'),skin=mStd('#86b45e'),hatM=mStd('#1d1626'),bandM=mStd('#8a43b5');
     blob(Wg,CONE,robe,0,0.8,0,0.6,1.6,0.6);blob(Wg,CYL,mStd('#1a1a1a'),0,0.05,0,0.45,0.1,0.45);
     const torso=new T.Group();torso.position.y=1.55;Wg.add(torso);blob(torso,SPH,robe,0,0,0,0.3,0.32,0.26);
     const head=new T.Group();head.position.y=0.52;torso.add(head);
     blob(head,SPH,skin,0,0,0,0.24,0.26,0.24);blob(head,SPH,mStd('#9aa0a8'),0,-0.02,-0.07,0.29,0.27,0.24);
     const nose=blob(head,CONE,skin,0,-0.02,0.28,0.05,0.2,0.05);nose.rotation.x=Math.PI/2+0.2;
     const eyeMat=new T.MeshStandardMaterial({color:'#c6ff7a',emissive:'#7dff3a',emissiveIntensity:0.5});
     for(const s of[-1,1])blob(head,SPH,eyeMat,s*0.085,0.06,0.2,0.045,0.045,0.03,false);
     blob(head,CYL,hatM,0,0.21,0,0.44,0.03,0.44);blob(head,CYL,bandM,0,0.28,0,0.21,0.08,0.21);
     const cone=blob(head,CONE,hatM,0,0.66,-0.05,0.21,0.78,0.21);cone.rotation.x=-0.22;
     const arms=[];
     for(const s of[-1,1]){const a=new T.Group();a.position.set(s*0.3,0.1,0);torso.add(a);
       const sl=blob(a,CYL,robe,s*0.08,-0.22,0.05,0.09,0.5,0.09);sl.rotation.z=s*0.3;
       blob(a,SPH,skin,s*0.16,-0.48,0.1,0.08,0.08,0.08);arms.push(a);}
     const broom=new T.Group();broom.position.set(-0.16,-0.48,0.1);arms[0].add(broom);
     blob(broom,CYL,mStd('#7a5532'),0,0.2,0,0.03,1.6,0.03);blob(broom,CONE,mStd('#c9a45a'),0,-0.7,0,0.16,0.4,0.16).rotation.x=Math.PI;
     blob(Wg,SPH,mStd('#1b1b1f',{roughness:0.4,metalness:0.4}),0,0.32,0.75,0.38,0.32,0.38);
     const brew=new T.MeshStandardMaterial({color:'#7dff3a',emissive:'#5aff2a',emissiveIntensity:0.6});blob(Wg,CYL,brew,0,0.55,0.75,0.3,0.02,0.3,false);
     let active=0,cool=0,target=null;
     DECOR_UPDATERS.push((dt,t)=>{
       cool=Math.max(0,cool-dt);active=Math.max(0,active-dt);
       if(!active&&!cool&&typeof AI!=='undefined'){
         let who=null,best=3.4;
         if(Math.hypot(AI.x-wx,AI.z-wz)<best){who=AI;best=Math.hypot(AI.x-wx,AI.z-wz);}
         for(const e of ALL_ANIMALS){const d=Math.hypot(e.x-wx,e.z-wz);if(d<best){best=d;who=e;}}
         if(who){active=3.6;cool=7;target=who;emote(head,'cackle',0.75,2.2,0.7);
           if(who===AI&&AI.state!=='act')lunaStartle();}
       }
       const k=active>0?1:0;
       const yawTo=target?clamp(normalizeAngle(Math.atan2(target.x-wx,target.z-wz)-Wg.rotation.y),-1,1):0;
       head.rotation.y=lerp(head.rotation.y,k?yawTo:Math.sin(t*0.3)*0.1,Math.min(1,dt*5));
       torso.rotation.z=lerp(torso.rotation.z,k?Math.sin(t*6)*0.12:0,Math.min(1,dt*6));
       arms[1].rotation.z=lerp(arms[1].rotation.z,k?2.3+Math.sin(t*9)*0.35:0.05,Math.min(1,dt*7));
       arms[1].rotation.x=lerp(arms[1].rotation.x,k?-0.4:0,Math.min(1,dt*7));
       eyeMat.emissiveIntensity=k?2.6+Math.sin(t*20):0.5+night()*0.8;
       brew.emissiveIntensity=0.5+night()*1.2+(k?1.2:0)+Math.sin(t*4)*0.2;
     });}

    /* ---- giant lawn inflatables: ghost, black cat, pumpkin (gently swaying) ---- */
    const nylon=c=>mStd(c,{roughness:0.35});
    function inflatable(x,z,build,r){const g=new T.Group();g.position.set(x,gy(x,z),z);add(g);addCircleObs(x,z,r);
      blob(g,BOX,mStd('#2b2f36'),0.4,0.1,0.5,0.4,0.2,0.3);const body=new T.Group();g.add(body);build(body);
      const ph=x*0.37;DECOR_UPDATERS.push((dt,t)=>{body.rotation.z=Math.sin(t*0.9+ph)*0.05;body.rotation.x=Math.sin(t*0.7+ph)*0.03;body.scale.y=1+Math.sin(t*1.7+ph)*0.012;});}
    inflatable(26.4,8.6,b=>{const wht=nylon('#f6f7fb'),blk=nylon('#151519');
      const geo=new T.CylinderGeometry(0.95,1.45,2.5,20,1,true),p=geo.attributes.position;
      for(let i=0;i<p.count;i++)if(p.getY(i)<0){const a=Math.atan2(p.getZ(i),p.getX(i));p.setY(i,p.getY(i)+Math.sin(a*7)*0.16);}
      geo.computeVertexNormals();const sheet=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#f6f7fb',roughness:0.35,side:T.DoubleSide}));sheet.position.y=1.35;sheet.castShadow=true;b.add(sheet);
      blob(b,SPH,wht,0,3.0,0,1.05,1.1,1.0);
      for(const s of[-1,1]){blob(b,SPH,wht,s*1.2,2.25,0.1,0.55,0.22,0.24);blob(b,SPH,blk,s*0.36,3.15,0.86,0.17,0.26,0.08,false);}
      blob(b,SPH,blk,0,2.65,0.92,0.2,0.24,0.08,false);},1.6);
    inflatable(28.8,11.2,b=>{const blk=nylon('#1d1b22');
      blob(b,SPH,blk,0,1.0,0,0.95,1.05,0.85);blob(b,SPH,blk,0,2.25,0.1,0.72,0.66,0.66);
      for(const s of[-1,1]){const e=blob(b,CONE,blk,s*0.42,2.85,0.05,0.22,0.48,0.16);e.rotation.z=-s*0.35;
        blob(b,SPH,new T.MeshStandardMaterial({color:'#ffe24a',emissive:'#ffcc00',emissiveIntensity:0.9}),s*0.25,2.35,0.66,0.13,0.17,0.06,false);}
      blob(b,SPH,mStd('#f07a8a'),0,2.15,0.74,0.07,0.05,0.04,false);
      blob(b,BOX,nylon('#e8792a'),0,1.75,0.62,0.55,0.18,0.08,false);
      const tail=new T.Mesh(new T.TorusGeometry(0.6,0.12,8,16,Math.PI*1.2),blk);tail.position.set(0.7,0.6,-0.5);tail.rotation.set(0,0.6,-0.4);tail.castShadow=true;b.add(tail);},1.3);
    inflatable(24.2,12.8,b=>{const o=nylon('#f07f25');
      blob(b,SPH,o,0,1.25,0,1.35,1.15,1.35);
      for(let k=0;k<8;k++){const a=k/8*Math.PI*2;blob(b,SPH,o,Math.cos(a)*0.55,1.25,Math.sin(a)*0.55,0.9,1.1,0.9,false);}
      blob(b,CYL,mStd('#4f6b2a'),0,2.45,0,0.12,0.35,0.12);blob(b,SPH,mStd('#5a8a32'),0.3,2.4,0.05,0.35,0.06,0.2,false);
      const f=new T.Mesh(new T.PlaneGeometry(1.7,1.7),faceMats[0]);f.position.set(0,1.3,1.42);b.add(f);},1.5);

    /* ---- stretchy spiderwebs on the veranda corners and post tops ---- */
    const webTex=canvasTex(256,256,c=>{c.clearRect(0,0,256,256);c.strokeStyle='rgba(255,255,255,0.9)';c.lineWidth=1.6;
      const cx=20,cy=20,spokes=9;for(let i=0;i<spokes;i++){const a=i/(spokes-1)*Math.PI/2;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*260,cy+Math.sin(a)*260);c.stroke();}
      for(let r=22;r<250;r+=19){c.beginPath();for(let i=0;i<spokes;i++){const a=i/(spokes-1)*Math.PI/2,rr=r+(i%2?4:-3);const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?c.quadraticCurveTo(cx+Math.cos(a-0.1)*(rr-6),cy+Math.sin(a-0.1)*(rr-6),x,y):c.moveTo(x,y);}c.stroke();}});
    const webMat=new T.MeshBasicMaterial({map:webTex,transparent:true,depthWrite:false,side:T.DoubleSide,opacity:0.85});
    function web(x,y,z,s,flipX,flipY){const m=new T.Mesh(new T.PlaneGeometry(s,s),webMat);m.position.set(x,y,z);m.scale.set(flipX?-1:1,flipY?-1:1,1);add(m);return m;}
    web(HX-6.6+0.8,deck+2.45,railZ+0.02,1.6,false,false);web(HX+6.6-0.8,deck+2.45,railZ+0.02,1.6,true,false);
    web(HX-1.8-0.5,deck+2.4,railZ+0.04,1.0,true,false);web(HX+1.8+0.5,deck+2.4,railZ+0.04,1.0,false,false);
    {const sp=new T.Group();add(sp);const bm=mStd('#141216',{roughness:0.4});blob(sp,SPH,bm,0,0,0,0.13,0.11,0.16);blob(sp,SPH,bm,0,0.02,0.15,0.08,0.07,0.08);
     for(const s of[-1,1])for(let k=0;k<4;k++){const l=blob(sp,CYL,bm,s*0.16,-0.02,-0.1+k*0.07,0.012,0.3,0.012,false);l.rotation.z=s*1.1;l.rotation.x=(k-1.5)*0.3;}
     const thread=blob(sp,CYL,new T.MeshBasicMaterial({color:'#e8e8e8'}),0,0.6,0,0.006,1.2,0.006,false);
     const bx=HX-6.6+1.1,top=deck+2.9;
     DECOR_UPDATERS.push((dt,t)=>{const d=0.4+0.6*(0.5+0.5*Math.sin(t*0.35));sp.position.set(bx,top-d*1.4,railZ+0.15);thread.scale.y=d*1.4;thread.position.y=d*0.7;sp.rotation.y=Math.sin(t*0.5)*0.4;});}

    /* ---- floating witch hats hung from the porch eave on fishing line ---- */
    {const hatM=mStd('#1a1520',{roughness:0.6}),bandC=['#8a43b5','#e8792a','#3fae5a','#8a43b5'],line=new T.MeshBasicMaterial({color:'#cfd6dc',transparent:true,opacity:0.5});
     [HX-5.4,HX-2.6,HX+2.6,HX+5.4].forEach((x,i)=>{const g=new T.Group();add(g);
       blob(g,CYL,hatM,0,0,0,0.42,0.025,0.42);blob(g,CYL,mStd(bandC[i]),0,0.07,0,0.2,0.08,0.2,false);
       const c=blob(g,CONE,hatM,0,0.43,0,0.2,0.75,0.2);c.rotation.z=0.2*(i%2?1:-1);
       blob(g,CYL,line,0,1.6,0,0.005,2.6,0.005,false);
       const baseY=deck+2.05,ph=i*1.7;
       DECOR_UPDATERS.push((dt,t)=>{g.position.set(x,baseY+Math.sin(t*0.8+ph)*0.07,HZ+4.85);g.rotation.y=Math.sin(t*0.4+ph)*0.6;});});}

    /* ---- yard stakes: a mini graveyard with skeleton hands and zombie arms ---- */
    {const ripTex=canvasTex(128,128,c=>{c.fillStyle='#9a9ca0';c.fillRect(0,0,128,128);c.fillStyle='#6a6c70';c.font='bold 38px Georgia, serif';c.textAlign='center';c.fillText('R.I.P',64,62);
       c.fillRect(30,80,68,5);c.fillRect(40,92,48,4);});
     const stoneM=mStd('#9a9ca0',{roughness:0.95}),faceM=new T.MeshStandardMaterial({map:ripTex,roughness:0.95});
     [[13.6,9.4,0.1],[15.4,10.0,-0.15],[17.1,9.3,0.2],[14.4,11.6,-0.1],[16.4,11.8,0.12]].forEach(([x,z,tilt],i)=>{
       const g=new T.Group();g.position.set(x,gy(x,z),z);g.rotation.set(0,tilt*2,tilt*0.4);add(g);addCircleObs(x,z,0.45);
       blob(g,BOX,stoneM,0,0.42,0,0.7,0.84,0.16);blob(g,CYL,stoneM,0,0.84,0,0.35,0.16,0.35).rotation.x=Math.PI/2;
       const f=new T.Mesh(new T.PlaneGeometry(0.6,0.6),faceM);f.position.set(0,0.55,0.085);g.add(f);
       blob(g,BOX,mStd('#5e4a33'),0,0.02,0.45,0.75,0.05,0.7,false);});
     const bone=mStd('#efe9da',{roughness:0.7}),zomb=mStd('#7f9a5a'),rag=mStd('#3d3a46');
     function hand(x,z,mat,sleeve,ry){const g=new T.Group();g.position.set(x,gy(x,z),z);g.rotation.y=ry;add(g);addCircleObs(x,z,0.3);
       blob(g,CYL,mat,0,0.25,0,0.05,0.5,0.05);if(sleeve)blob(g,CYL,sleeve,0,0.12,0,0.09,0.24,0.09);
       blob(g,BOX,mat,0,0.55,0,0.16,0.14,0.05);
       for(let k=0;k<4;k++){const f=blob(g,CYL,mat,-0.06+k*0.04,0.7,0,0.016,0.16,0.016,false);f.rotation.z=(k-1.5)*0.18;}
       const th=blob(g,CYL,mat,0.1,0.58,0,0.016,0.12,0.016,false);th.rotation.z=-0.9;
       const ph=x;DECOR_UPDATERS.push((dt,t)=>{g.rotation.z=Math.sin(t*1.3+ph)*0.08;});}
     hand(14.1,10.6,bone,null,0.4);hand(16.1,10.8,bone,null,-0.3);hand(17.6,10.6,bone,null,0.1);
     hand(15.0,12.7,zomb,rag,0.2);hand(13.1,12.3,zomb,rag,-0.5);
     const sk=new T.Group();sk.position.set(15.6,gy(15.6,11.0),11.0);add(sk);blob(sk,SPH,bone,0,0.1,0,0.18,0.17,0.2);
     for(const s of[-1,1])blob(sk,SPH,mStd('#141216'),s*0.065,0.15,0.16,0.045,0.05,0.03,false);}

    /* ---- lawn projector throwing moving bats and ghosts onto the siding ---- */
    {const px=HX-2.1,pz=HZ+10.6,py=gy(px,pz);
     const proj=new T.Group();proj.position.set(px,py,pz);add(proj);addCircleObs(px,pz,0.35);
     blob(proj,BOX,mStd('#222428'),0,0.22,0,0.3,0.24,0.34);blob(proj,CYL,mStd('#222428'),0,0.08,0,0.03,0.16,0.03);
     const lens=blob(proj,CYL,new T.MeshBasicMaterial({color:'#c69bff'}),0,0.24,-0.18,0.08,0.04,0.08,false);lens.rotation.x=Math.PI/2;
     const W2=8.6,H2=2.9,wallZ=HZ+2.86;
     const cv=document.createElement('canvas');cv.width=512;cv.height=176;const c=cv.getContext('2d');const tex=new T.CanvasTexture(cv);
     const bats=[...Array(7)].map((_,i)=>({x:Math.random()*512,y:30+Math.random()*110,v:40+Math.random()*50,s:10+Math.random()*10,ph:Math.random()*6}));
     const ghosts=[...Array(2)].map((_,i)=>({x:i*260,y:80,v:22+i*8}));
     const plane=new T.Mesh(new T.PlaneGeometry(W2,H2),new T.MeshBasicMaterial({map:tex,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));
     plane.position.set(HX,deck+1.55,wallZ);add(plane);
     const beamGeo=new T.ConeGeometry(3.4,1,24,1,true);beamGeo.translate(0,-0.5,0);
     const beam=new T.Mesh(beamGeo,new T.MeshBasicMaterial({color:'#b98aff',transparent:true,opacity:0.05,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
     const from=new T.Vector3(px,py+0.24,pz-0.2),to=new T.Vector3(HX,deck+1.55,wallZ),dir=to.clone().sub(from);
     beam.position.copy(from);beam.scale.set(1,dir.length(),1);beam.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),dir.normalize());add(beam);
     let acc=0;
     DECOR_UPDATERS.push((dt,t)=>{
       const n=smooth(0.15,0.75,night());plane.material.opacity=0.12+0.88*n;beam.material.opacity=0.012+0.06*n;
       acc+=dt;if(acc<0.05)return;acc=0;
       if(n<0.03||camera.position.distanceToSquared(plane.position)>130*130)return;   // invisible or too far to notice: skip the redraw + texture upload
       c.clearRect(0,0,512,176);
       const g=c.createRadialGradient(256,88,10,256,88,280);g.addColorStop(0,'rgba(170,40,90,0.55)');g.addColorStop(0.6,'rgba(110,40,160,0.35)');g.addColorStop(1,'rgba(40,10,60,0)');
       c.fillStyle=g;c.fillRect(0,0,512,176);
       c.fillStyle='rgba(235,225,255,0.55)';
       for(const gh of ghosts){gh.x=(gh.x+gh.v*0.05)%600;const x=gh.x-40,y=gh.y+Math.sin(t*1.5+gh.v)*10;
         c.beginPath();c.arc(x,y-14,22,Math.PI,0);c.lineTo(x+22,y+22);for(let k=0;k<4;k++)c.lineTo(x+22-11*(k+0.5),y+(k%2?22:12));c.lineTo(x-22,y+22);c.closePath();c.fill();}
       c.fillStyle='rgba(255,210,150,0.85)';
       for(const b of bats){b.x=(b.x+b.v*0.05)%560;const x=b.x-24,y=b.y+Math.sin(t*2+b.ph)*12,f=Math.sin(t*14+b.ph)*0.6,s=b.s;
         c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-s*0.8,y-s*(0.6+f),x-s*1.8,y-s*0.2*f);c.quadraticCurveTo(x-s,y+s*0.1,x,y+s*0.25);
         c.quadraticCurveTo(x+s,y+s*0.1,x+s*1.8,y-s*0.2*f);c.quadraticCurveTo(x+s*0.8,y-s*(0.6+f),x,y);c.fill();}
       tex.needsUpdate=true;
     });}

    /* ---- pre-lit autumn garlands: orange & purple bulbs, mini pumpkins and black maple leaves ---- */
    const gl=[...sag(leftRail,0.32,0.12),...sag(rightRail,0.32,0.12)];
    bulbString(gl,['#ff8a2a','#a64dff','#ffb347','#7a3cff'],0.055);
    bulbString(sag(arch,0.3,0.05),['#a64dff','#ff8a2a'],0.06);
    {const pim=new T.InstancedMesh(SPH,mStd('#e8792a',{roughness:0.6}),gl.length),lim=new T.InstancedMesh(BOX,mStd('#1b1a1f',{roughness:0.7}),gl.length),M=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler();
     gl.forEach((p,i)=>{M.compose(new T.Vector3(p[0],p[1]-0.06,p[2]+0.04),q.identity(),new T.Vector3(0.06,0.05,0.06));pim.setMatrixAt(i,i%2?M:M.clone().scale(new T.Vector3(0,0,0)));
       e.set(0.4,0,i*1.3);M.compose(new T.Vector3(p[0]+0.15,p[1]-0.02,p[2]+0.03),q.setFromEuler(e),new T.Vector3(0.16,0.13,0.01));lim.setMatrixAt(i,M);});
     add(pim);add(lim);}

    /* ---- tall wooden "Trick or Treat" porch sign ---- */
    {const sx=HX-4.5,sz=HZ+6.5,g=new T.Group();g.position.set(sx,gy(sx,sz),sz);g.rotation.set(-0.06,0.12,0);add(g);addCircleObs(sx,sz,0.5);
     const tex=canvasTex(160,400,c=>{c.fillStyle='#3a2a20';c.fillRect(0,0,160,400);c.fillStyle='rgba(0,0,0,0.18)';for(let y=0;y<400;y+=50)c.fillRect(0,y,160,3);
       c.fillStyle='#ff8a2a';c.font='900 46px "Zen Maru Gothic", Nunito, sans-serif';c.textAlign='center';c.fillText('TRICK',80,110);
       c.fillStyle='#b98aff';c.font='900 36px "Zen Maru Gothic", Nunito, sans-serif';c.fillText('or',80,170);
       c.fillStyle='#ff8a2a';c.font='900 46px "Zen Maru Gothic", Nunito, sans-serif';c.fillText('TREAT',80,235);
       c.fillStyle='#f07f25';c.beginPath();c.ellipse(80,320,40,32,0,0,7);c.fill();c.fillStyle='#3a2a20';c.beginPath();c.moveTo(62,312);c.lineTo(72,300);c.lineTo(74,316);c.fill();c.beginPath();c.moveTo(98,312);c.lineTo(88,300);c.lineTo(86,316);c.fill();
       c.fillRect(60,330,40,6);c.fillStyle='#5a7a2a';c.fillRect(76,282,8,12);
       c.fillStyle='#111';c.beginPath();c.moveTo(80,40);c.quadraticCurveTo(60,24,40,40);c.quadraticCurveTo(58,44,80,52);c.quadraticCurveTo(102,44,120,40);c.quadraticCurveTo(100,24,80,40);c.fill();});
     blob(g,BOX,new T.MeshStandardMaterial({map:tex,roughness:0.9}),0,1.3,0,0.8,2.0,0.08);
     for(const s of[-1,1])blob(g,BOX,mStd('#2a1d16'),s*0.32,0.35,-0.06,0.08,0.7,0.08);}

    /* ---- fog machine puffing low fog across the walkway ---- */
    {const fx=HX+2.3,fz=HZ+6.35,mach=new T.Group();mach.position.set(fx,gy(fx,fz),fz);add(mach);addCircleObs(fx,fz,0.35);
     blob(mach,BOX,mStd('#2b2f36'),0,0.14,0,0.36,0.28,0.24);blob(mach,CYL,mStd('#4a4f58'),-0.2,0.16,0,0.05,0.12,0.05).rotation.z=Math.PI/2;
     const puffTex=canvasTex(64,64,c=>{const g=c.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
     const puffs=[...Array(26)].map((_,i)=>{const s=new T.Sprite(new T.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false,opacity:0,color:'#e9e4f2'}));add(s);return {s,age:i*0.3,life:0,vx:0,vz:0};});
     const reset=p=>{p.age=0;p.life=rnd(6,9);p.vx=rnd(-1.0,-0.2);p.vz=rnd(-0.1,0.7);p.s.position.set(fx-0.25,gy(fx,fz)+0.15,fz);};
     puffs.forEach(p=>{reset(p);p.age=rnd(0,6);});
     DECOR_UPDATERS.push((dt,t)=>{const n=night(),gain=0.22+0.3*n;
       for(const p of puffs){p.age+=dt;if(p.age>p.life)reset(p);const k=p.age/p.life;
         p.s.position.x+=p.vx*dt*(1-k*0.6);p.s.position.z+=p.vz*dt;p.s.position.y=hAt(p.s.position.x,p.s.position.z)+0.15+k*0.35;
         const sc=0.6+k*2.6;p.s.scale.set(sc*1.6,sc*0.7,1);p.s.material.opacity=Math.sin(Math.PI*k)*gain;p.s.material.color.setRGB(0.92,0.9-0.1*n,0.98);}});}
  }

  function harvest(){
    const hay=mStd('#d9b65a',{roughness:1}),corn=mStd('#c9a65a',{roughness:1});
    for(const[x,z]of[[HX-3,HZ+7.3],[HX+3,HZ+7.3]]){const g=new T.Group();g.position.set(x,hAt(x,z),z);add(g);addCircleObs(x,z,0.8);
      blob(g,BOX,hay,0,0.32,0,1.3,0.64,0.75);for(let k=0;k<3;k++){const p=blob(g,SPH,mStd(['#e8792a','#f2d15c','#d9532b'][k]),-0.35+k*0.35,0.82,0,0.22,0.18,0.22);}
      for(let k=0;k<5;k++){const c=blob(g,CONE,corn,-0.5+k*0.25,1.2,-0.3,0.1,2.2,0.1);c.rotation.z=(k-2)*0.06;}}
    bulbString([...sag(leftRail,0.35,0.12),...sag(rightRail,0.35,0.12)],['#ffb347','#ff8a2a','#f2d15c'],0.05);
  }
  function winterLights(){
    bulbString([...sag(leftRail,0.3,0.12),...sag(rightRail,0.3,0.12)],['#ff4d4d','#3fd16b','#4da6ff','#ffd24d'],0.055);
    bulbString(sag(arch,0.28,0.05),['#ff4d4d','#ffffff','#3fd16b'],0.06);
    const w=new T.Mesh(new T.TorusGeometry(0.55,0.17,10,24),mStd('#2f6b45'));w.position.set(HX,deck+2.3,HZ+2.95);add(w);
    blob(w,SPH,mStd('#d93a3a'),0,-0.55,0.12,0.16,0.12,0.08);
    const s=new T.Group(),sx=HX+4,sz=HZ+10;s.position.set(sx,hAt(sx,sz),sz);add(s);addCircleObs(sx,sz,0.8);
    const snow=mStd('#f4f7fb');blob(s,SPH,snow,0,0.6,0,0.65,0.6,0.65);blob(s,SPH,snow,0,1.45,0,0.48,0.45,0.48);blob(s,SPH,snow,0,2.08,0,0.34,0.32,0.34);
    const n=blob(s,CONE,mStd('#f08a2c'),0,2.08,0.38,0.05,0.25,0.05);n.rotation.x=Math.PI/2;blob(s,CYL,mStd('#d93a3a'),0,1.82,0,0.36,0.1,0.36);
  }
  function valentine(){
    bulbString([...sag(leftRail,0.3,0.12),...sag(rightRail,0.3,0.12),...sag(arch,0.3,0.05)],['#ff4d7a','#ffffff','#ff9ab8'],0.055);
  }
})();



/* ---------------- lanterns around the island: soft pools of light so nights are low-lit, not dark ---------------- */
const LANTERN_POOLS=[];
function paperLantern(x,z){
  const y=hAt(x,z),F=frame(x,y,z,R(0,6.28));
  part(B.box,F,0,0.75,0,0.14,1.5,0.14,W.dark);part(B.box,F,0,1.52,0,0.5,0.08,0.5,W.dark);
  part(G.sph,F,0,1.22,0,0.38,0.5,0.38,W.lamp);part(B.cyl,F,0,1.0,0,0.24,0.05,0.24,W.dark);
  addCircleObs(x,z,0.35);LANTERN_POOLS.push([x,y,z,3.4]);
}
{
  const spots=[],far=(x,z,d)=>spots.every(s=>Math.hypot(s[0]-x,s[1]-z)>d);
  const free=(x,z)=>{if(!isFinite(hAt(x,z))||hAt(x,z)<1)return false;if(waterDist(x,z)<1.2)return false;
    for(const c of CIRCLE_OBS)if(Math.hypot(c.x-x,c.z-z)<c.r+0.9)return false;
    for(const b of BOX_OBS)if(x>b.x0-1&&x<b.x1+1&&z>b.z0-1&&z<b.z1+1)return false;
    if(getBridgeInfo(x,z)||isOnDock(x,z))return false;return true;};
  // existing stone lanterns get their glow pools too
  for(const p of[[6.2,-13],[13.8,-13],[6.2,-24.2],[13.8,-24.2],[-1,12],[-31,-4],[-30.5,11.5],[27.5,28],[15,8],[-14,-6]]){spots.push(p);LANTERN_POOLS.push([p[0],hAt(p[0],p[1]),p[1],3.6]);}
  // hand-placed: market, dock, yard gate, gardens, bridge ends, the little island
  for(const p of[[24.9,36.4],[21.4,40.5],[-23.6,28.6],[31.2,12.4],[32.3,-11.8],[57.5,5.2],[85.6,5.8],[ISLE2.x+5.5,ISLE2.z+3.5],[ISLE2.x-3,ISLE2.z-4.5],[2.5,20.5],[-20,20],[-36,3]])
    if(free(p[0],p[1])&&far(p[0],p[1],5)){paperLantern(p[0],p[1]);spots.push(p);}
  // and every so often along the stone paths
  let n=0;for(const P of PATHS)for(let i=0;i<P.length-1;i++){const[ax,az]=P[i],[bx,bz]=P[i+1],len=Math.hypot(bx-ax,bz-az),px=-(bz-az)/len,pz=(bx-ax)/len;
    for(let d=5;d<len;d+=10){const s=(n++%2?1:-1)*1.9,x=ax+(bx-ax)*d/len+px*s,z=az+(bz-az)*d/len+pz*s;
      if(free(x,z)&&far(x,z,7.5)){paperLantern(x,z);spots.push([x,z]);}}}
}
const POOL_MAT=new T.MeshBasicMaterial({map:canvasTex(128,128,c=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,205,140,1)');g.addColorStop(0.4,'rgba(255,170,95,0.5)');g.addColorStop(1,'rgba(255,150,70,0)');c.fillStyle=g;c.fillRect(0,0,128,128);}),
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,polygonOffset:true,polygonOffsetFactor:-2});
for(const[x,y,z,r]of LANTERN_POOLS){const m=new T.Mesh(new T.PlaneGeometry(r*2,r*2),POOL_MAT);m.rotation.x=-Math.PI/2;m.position.set(x,y+0.09,z);m.renderOrder=2;m.userData.noWx=true;scene.add(m);}

/* ---------------- build instanced meshes ---------------- */
Object.values(B).forEach(b=>b.build());Object.values(G).forEach(b=>b.build());

/* ---------------- caretaker surface height & AI navigation brain ---------------- */
function getBridgeInfo(x,z){
  for(const br of BRIDGES){
    const rx=x-br.cx,rz=z-br.cz;
    const zz=rx*br.dx+rz*br.dz;
    const sx=rx*br.dz-rz*br.dx;
    if(Math.abs(zz)<=br.len*0.5+0.45&&Math.abs(sx)<=1.05){
      const t=clamp(zz/br.len+0.5,0,1);
      const y=(br.ya!==undefined?lerp(br.ya,br.yb,t)+Math.sin(Math.PI*t)*br.A:L0+Math.sin(Math.PI*t)*1.35)+0.17;
      return {onBridge:true,y,sx,zz,t};
    }
  }
  return null;
}
function isOnDock(x,z){
  if(z>=zE-5.2&&z<=zE+14.3&&Math.abs(x-24)<=1.4)return true;
  if(z>zE+14.3&&z<=zE+17.2&&Math.abs(x-24)<=3.2)return true;
  return false;
}
function isOnHouseStepsOrPorch(x,z){
  if(x>=18.7&&x<=21.3&&z>=3.3&&z<=6.2)return true;
  if(x>=18.0&&x<=22.0&&z>=1.4&&z<=3.4)return true;
  return false;
}
function walkHeight(x,z){
  const br=getBridgeInfo(x,z);
  if(br)return br.y;
  if(isOnDock(x,z)){
    if(z<zE-3.5){
      const t=clamp((z-(zE-5.2))/1.7,0,1);
      return lerp(hAt(x,z),1.77,t);
    }
    return 1.77;
  }
  if(isOnHouseStepsOrPorch(x,z)){
    const y0=L0;
    if(z<=3.6)return y0+1.7;
    const t=clamp((6.1-z)/2.5,0,1);
    return lerp(y0,y0+1.7,t);
  }
  if(x>=7.4&&x<=12.6&&z>=-23.6&&z<=-14.0){
    const t=clamp((-14.0-z)/9.6,0,1);
    return lerp(L0,L_REAR,t);
  }
  return hAt(x,z);
}

function isPointWalkable(x,z,pad=0.38){
  const br=getBridgeInfo(x,z);
  const onDock=isOnDock(x,z);
  const onPorch=isOnHouseStepsOrPorch(x,z);
  const onStairs=(x>=7.6&&x<=12.4&&z>=-23.8&&z<=-13.8);
  const onDockRamp=(x>=21.5&&x<=26.5&&z>=28.5&&z<=37.5);
  const onFrontRamp=(x>=-19.2&&x<=-12.8&&z>=22.8&&z<=29.2);

  for(const b of BOX_OBS){
    if(x>=b.x0-pad&&x<=b.x1+pad&&z>=b.z0-pad&&z<=b.z1+pad)return false;
  }
  for(const c of CIRCLE_OBS){
    if(Math.hypot(x-c.x,z-c.z)<c.r+pad)return false;
  }

  if(br){return Math.abs(br.sx)<=1.0-pad*0.35;}
  if(onDock)return true;
  if(onPorch)return true;

  const r=Math.hypot(x,z),a=Math.atan2(z,x);
  if(r>edgeR(a)-1.6&&!inIsle2(x,z,1.6))return false;
  if(waterDist(x,z)<0.55+pad)return false;
  if(Math.abs(x-WF.x)<4.3&&z>-36&&z<WF.zBot+1.5)return false;
  if(Math.hypot(x-MT.x,(z-MT.z)*1.1)<MT.r-1.5&&hAt(x,z)>L_REAR+0.8)return false;

  if(!onStairs&&!onDockRamp&&!onFrontRamp){
    const h0=hAt(x,z);
    if(h0<1.0)return false;
    const step=0.65;
    const dh=Math.max(
      Math.abs(hAt(x+step,z)-h0),
      Math.abs(hAt(x-step,z)-h0),
      Math.abs(hAt(x,z+1)-h0),
      Math.abs(hAt(x,z-1)-h0)
    );
    if(dh>0.38)return false;
  }
  return true;
}

const NAV={
  minX:-58,maxX:110,minZ:-56,maxZ:58,step:0.5
};
NAV.cols=Math.round((NAV.maxX-NAV.minX)/NAV.step)+1;
NAV.rows=Math.round((NAV.maxZ-NAV.minZ)/NAV.step)+1;
NAV.walk=new Uint8Array(NAV.cols*NAV.rows);
NAV.cost=new Float32Array(NAV.cols*NAV.rows);

function toGrid(x,z){
  return [
    clamp(Math.round((x-NAV.minX)/NAV.step),0,NAV.cols-1),
    clamp(Math.round((z-NAV.minZ)/NAV.step),0,NAV.rows-1)
  ];
}
function toWorld(gx,gz){
  return [NAV.minX+gx*NAV.step,NAV.minZ+gz*NAV.step];
}
function gIdx(gx,gz){return gz*NAV.cols+gx;}

(function buildNavGrid(){
  for(let gz=0;gz<NAV.rows;gz++){
    for(let gx=0;gx<NAV.cols;gx++){
      const [wx,wz]=toWorld(gx,gz);
      const id=gIdx(gx,gz);
      if(isPointWalkable(wx,wz,0.34)){
        NAV.walk[id]=1;
        const pd=pathDist(wx,wz);
        const onBr=getBridgeInfo(wx,wz)!==null;
        NAV.cost[id]=(pd<1.3||onBr)?0.85:1.15;
      }else{
        NAV.walk[id]=0;
        NAV.cost[id]=999;
      }
    }
  }
  for(let gz=1;gz<NAV.rows-1;gz++){
    for(let gx=1;gx<NAV.cols-1;gx++){
      const id=gIdx(gx,gz);
      if(!NAV.walk[id])continue;
      let nearBlocked=0;
      for(let dz=-2;dz<=2;dz++){
        for(let dx=-2;dx<=2;dx++){
          if(!NAV.walk[gIdx(clamp(gx+dx,0,NAV.cols-1),clamp(gz+dz,0,NAV.rows-1))]){
            nearBlocked+=(Math.abs(dx)<=1&&Math.abs(dz)<=1)?2:1;
          }
        }
      }
      if(nearBlocked>0)NAV.cost[id]+=nearBlocked*0.18;
    }
  }
})();

function findNearestWalkableCell(gx,gz){
  if(NAV.walk[gIdx(gx,gz)])return [gx,gz];
  for(let r=1;r<25;r++){
    for(let dz=-r;dz<=r;dz++){
      for(let dx=-r;dx<=r;dx++){
        if(Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;
        const nx=gx+dx,nz=gz+dz;
        if(nx>=0&&nx<NAV.cols&&nz>=0&&nz<NAV.rows&&NAV.walk[gIdx(nx,nz)])return [nx,nz];
      }
    }
  }
  return [gx,gz];
}

function hasGridLineOfSight(ax,az,bx,bz){
  const dist=Math.hypot(bx-ax,bz-az);
  const steps=Math.max(2,Math.ceil(dist/0.22));
  for(let i=1;i<steps;i++){
    const t=i/steps;
    const x=lerp(ax,bx,t),z=lerp(az,bz,t);
    const [gx,gz]=toGrid(x,z),id=gIdx(gx,gz);
    if(!NAV.walk[id]||NAV.cost[id]>2.2)return false;
  }
  return true;
}

const PF={id:0};
function findPathWorld(sx,sz,tx,tz){
  let [sgx,sgz]=toGrid(sx,sz);
  let [tgx,tgz]=toGrid(tx,tz);
  [sgx,sgz]=findNearestWalkableCell(sgx,sgz);
  [tgx,tgz]=findNearestWalkableCell(tgx,tgz);
  const startId=gIdx(sgx,sgz),goalId=gIdx(tgx,tgz);
  if(startId===goalId)return [[tx,tz]];

  // search buffers are allocated once and reused; a stamp marks which entries belong to this search
  const N=NAV.cols*NAV.rows;
  if(!PF.g){PF.g=new Float32Array(N);PF.f=new Float32Array(N);PF.from=new Int32Array(N);PF.seen=new Uint32Array(N);PF.done=new Uint32Array(N);}
  const stamp=++PF.id,gScore=PF.g,fScore=PF.f,cameFrom=PF.from,seen=PF.seen,done=PF.done;
  const G=i=>seen[i]===stamp?gScore[i]:1e9;

  const heap=[];
  function push(id){
    heap.push(id);
    let i=heap.length-1;
    while(i>0){
      const p=(i-1)>>1;
      if(fScore[heap[p]]<=fScore[heap[i]])break;
      const tmp=heap[p];heap[p]=heap[i];heap[i]=tmp;i=p;
    }
  }
  function pop(){
    const top=heap[0],last=heap.pop();
    if(heap.length>0){
      heap[0]=last;
      let i=0;
      while(true){
        let l=2*i+1,r=2*i+2,sm=i;
        if(l<heap.length&&fScore[heap[l]]<fScore[heap[sm]])sm=l;
        if(r<heap.length&&fScore[heap[r]]<fScore[heap[sm]])sm=r;
        if(sm===i)break;
        const tmp=heap[i];heap[i]=heap[sm];heap[sm]=tmp;i=sm;
      }
    }
    return top;
  }

  seen[startId]=stamp;gScore[startId]=0;cameFrom[startId]=-1;
  fScore[startId]=Math.hypot(tgx-sgx,tgz-sgz);
  push(startId);

  const dirs=[[-1,0,1],[1,0,1],[0,-1,1],[0,1,1],[-1,-1,1.414],[1,-1,1.414],[-1,1,1.414],[1,1,1.414]];
  let found=false,closestId=startId,closestDist=1e9;

  while(heap.length>0){
    const curr=pop();
    if(curr===goalId){found=true;break;}
    if(done[curr]===stamp)continue;
    done[curr]=stamp;

    const cx=curr%NAV.cols,cz=(curr/NAV.cols)|0;
    const dGoal=Math.hypot(tgx-cx,tgz-cz);
    if(dGoal<closestDist){closestDist=dGoal;closestId=curr;}

    for(const [dx,dz,len] of dirs){
      const nx=cx+dx,nz=cz+dz;
      if(nx<0||nx>=NAV.cols||nz<0||nz>=NAV.rows)continue;
      const nid=gIdx(nx,nz);
      if(!NAV.walk[nid]||done[nid]===stamp)continue;
      if(dx!==0&&dz!==0){
        if(!NAV.walk[gIdx(cx+dx,cz)]||!NAV.walk[gIdx(cx,cz+dz)])continue;
      }
      const tentativeG=gScore[curr]+len*NAV.cost[nid];
      if(tentativeG<G(nid)){
        seen[nid]=stamp;cameFrom[nid]=curr;
        gScore[nid]=tentativeG;
        const adx=Math.abs(tgx-nx),adz=Math.abs(tgz-nz);
        const h=(adx+adz)+(1.414-2)*Math.min(adx,adz);
        fScore[nid]=tentativeG+h*0.95;
        push(nid);
      }
    }
  }

  let endId=found?goalId:closestId;
  const raw=[];
  let cur=endId;
  while(cur!==-1&&cur!==startId){
    const gx=cur%NAV.cols,gz=(cur/NAV.cols)|0;
    raw.push(toWorld(gx,gz));
    cur=cameFrom[cur];
  }
  raw.reverse();
  if(!raw.length)return [[tx,tz]];

  const smoothed=[[sx,sz]];
  let anchor=0;
  const pts=[[sx,sz],...raw];
  while(anchor<pts.length-1){
    let furthest=anchor+1;
    for(let test=Math.min(pts.length-1,anchor+18);test>anchor+1;test--){
      if(hasGridLineOfSight(pts[anchor][0],pts[anchor][1],pts[test][0],pts[test][1])){
        furthest=test;
        break;
      }
    }
    smoothed.push(pts[furthest]);
    anchor=furthest;
  }
  smoothed.shift();
  return smoothed;
}

/* ---------------- build 3D Caretaker Character (Luna) ---------------- */
function createCatShirtTexture(){
  const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const ctx=cv.getContext('2d');
  const r=mulberry32(4242);
  ctx.fillStyle='#67c4ee';ctx.fillRect(0,0,S,S);
  const COLS=['#5bb8ea','#f39a3d','#a9b1c3','#2d2b33','#fbfbf8','#f5a3c3','#9fd98c','#6d8fe0','#f4c56a','#b89ae0','#66c9c2','#ef7b6f'];
  const NC=4,NR=4,cw=S/NC,ch=S/NR;
  function cat(x,y,w,h,col,v){
    const dark=col==='#2d2b33',line='#26232b',feat=dark?'#f3d75a':'#2a2329';
    ctx.lineWidth=3;ctx.strokeStyle=line;ctx.lineJoin='round';
    // body
    ctx.fillStyle=col;ctx.beginPath();
    const bw=w*0.78,by=y+h*0.12;ctx.moveTo(x-bw/2,y+h);ctx.lineTo(x-bw/2+6,by+18);ctx.quadraticCurveTo(x,by-8,x+bw/2-6,by+18);ctx.lineTo(x+bw/2,y+h);ctx.closePath();ctx.fill();ctx.stroke();
    // ears
    const hw=w*0.43,hh=h*0.33;
    for(const sx of[-1,1]){
      ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x+sx*hw*0.95,y-hh*0.15);ctx.lineTo(x+sx*hw*0.9,y-hh*1.35);ctx.lineTo(x+sx*hw*0.25,y-hh*0.85);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle=dark?'#c86a86':'#f39ab2';ctx.beginPath();ctx.moveTo(x+sx*hw*0.82,y-hh*0.35);ctx.lineTo(x+sx*hw*0.82,y-hh*1.1);ctx.lineTo(x+sx*hw*0.38,y-hh*0.8);ctx.closePath();ctx.fill();
    }
    // head
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,hw,hh,0,0,6.2832);ctx.fill();ctx.stroke();
    if(v%4===3){ctx.fillStyle=dark?'#55525c':'#ffffff';ctx.beginPath();ctx.ellipse(x,y+hh*0.42,hw*0.45,hh*0.4,0,0,6.2832);ctx.fill();}
    // eyes
    const ex=hw*0.42,ey=y-hh*0.05;
    for(const sx of[-1,1]){
      const px=x+sx*ex;
      if(v%3===1){ctx.strokeStyle=feat;ctx.lineWidth=2.6;ctx.beginPath();ctx.arc(px,ey-2,6,0.15*Math.PI,0.85*Math.PI);ctx.stroke();}
      else if(v%3===2){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,ey,8,0,6.2832);ctx.fill();ctx.fillStyle='#2a2329';ctx.beginPath();ctx.arc(px,ey,5,0,6.2832);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px-1.5,ey-2,1.6,0,6.2832);ctx.fill();}
      else{ctx.fillStyle=feat;ctx.beginPath();ctx.ellipse(px,ey,4.2,5.4,0,0,6.2832);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px-1.2,ey-2,1.4,0,6.2832);ctx.fill();}
    }
    // nose, mouth, whiskers
    const ny=y+hh*0.22;ctx.fillStyle='#f07f9a';ctx.beginPath();ctx.moveTo(x-4,ny);ctx.lineTo(x+4,ny);ctx.lineTo(x,ny+4);ctx.closePath();ctx.fill();
    ctx.strokeStyle=feat;ctx.lineWidth=2;
    if(v%3===2){ctx.beginPath();ctx.arc(x,ny+9,3.4,0,6.2832);ctx.stroke();}
    else{ctx.beginPath();ctx.arc(x-3.5,ny+4,3.5,0,Math.PI);ctx.arc(x+3.5,ny+4,3.5,0,Math.PI);ctx.stroke();}
    ctx.lineWidth=1.4;
    for(const sx of[-1,1])for(const dy of[-3,2]){ctx.beginPath();ctx.moveTo(x+sx*hw*0.5,ny+dy);ctx.lineTo(x+sx*hw*1.08,ny+dy*1.8-2);ctx.stroke();}
  }
  let idx=0;
  for(let row=-1;row<=NR;row++)for(let c=0;c<NC;c++){
    const x=(c+0.5+((row&1)?0.5:0))*cw+(r()-0.5)*8,y=(row+0.42)*ch+(r()-0.5)*6;
    const col=COLS[(idx*7+row*5+3)%COLS.length],v=Math.floor(r()*12);idx++;
    for(const ox of[-S,0,S])cat(x+ox,y,cw*0.96,ch*1.0,col,v);
  }
  const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,1);tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());tex.needsUpdate=true;return tex;
}

/* Faces redraw a 512px canvas on every blink. Draw each expression once into its own texture and just swap maps,
   so blinking no longer re-uploads a texture (and rebuilds its mipmaps) several times a second. */
function cacheFaceSwaps(faceObj,mat,keyOf){
  const draw=faceObj.drawFace,cache={};
  faceObj.drawFace=function(mode){const k=keyOf(mode);let t=cache[k];
    if(!t){draw(mode);const cv=document.createElement('canvas');cv.width=faceObj.tex.image.width;cv.height=faceObj.tex.image.height;
      cv.getContext('2d').drawImage(faceObj.tex.image,0,0);t=new T.CanvasTexture(cv);t.anisotropy=faceObj.tex.anisotropy;cache[k]=t;}
    if(mat.map!==t)mat.map=t;};
}
function createCaretakerFaceTexture(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=512;
  const ctx=cv.getContext('2d');const tex=new T.CanvasTexture(cv);
  const SKIN='#f8c6a6';
  const ell=(x,y,rx,ry)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  function drawFace(blink=false){
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=SKIN;ctx.fillRect(0,0,512,512);
    // the sphere maps 512px to 360deg across but 180deg down, so draw in equal-angle units
    ctx.setTransform(1,0,0,2,0,-256);
    for(const sx of[-1,1]){const cx=256+sx*62,cy=274,grd=ctx.createRadialGradient(cx,cy,2,cx,cy,24);
      grd.addColorStop(0,'rgba(240,128,108,0.30)');grd.addColorStop(1,'rgba(240,128,108,0)');ctx.fillStyle=grd;ell(cx,cy,24,24);}
    ctx.fillStyle='#d4896a';
    for(const sx of[-1,1])for(const[fx,fy,rr]of[[46,270,2.4],[56,266,2.6],[66,271,2.3],[50,278,2.5],[60,280,2.2],[70,276,2.4],[40,274,2.0]])ell(256+sx*fx,fy,rr,rr);
    for(const[nx,ny]of[[-8,262],[0,260],[8,263],[-4,266],[5,266]])ell(256+nx,ny,1.8,1.8);
    ctx.lineCap='round';
    // thin chestnut brows, just above the big round eyes
    ctx.strokeStyle='#6a4632';ctx.lineWidth=3.6;
    for(const sx of[-1,1]){const ex=256+sx*52;ctx.beginPath();ctx.moveTo(ex-sx*16,226);ctx.quadraticCurveTo(ex,218,ex+sx*18,224);ctx.stroke();}
    for(const sx of[-1,1]){
      const ex=256+sx*52,ey=248;
      if(blink){
        ctx.strokeStyle='#2a201c';ctx.lineWidth=3.6;ctx.beginPath();ctx.ellipse(ex,ey+4,20,11,0,0.12*Math.PI,0.88*Math.PI);ctx.stroke();
      }else{
        ctx.fillStyle='#ffffff';ell(ex,ey,23,26);
        ctx.fillStyle='#5a4034';ell(ex,ey+2,18.5,22);
        ctx.fillStyle='#2a211c';ell(ex,ey+3,11,13.2);
        ctx.fillStyle='#ffffff';ell(ex-sx*6,ey-8,5.2,5.4);ell(ex+sx*5,ey+10,2.1,2.1);
        ctx.strokeStyle='#2a201c';ctx.lineWidth=3.6;ctx.beginPath();ctx.ellipse(ex,ey,23.4,26.4,0,Math.PI*1.06,Math.PI*1.94);ctx.stroke();
        const a=sx>0?-0.18*Math.PI:-0.82*Math.PI,lx=ex+Math.cos(a)*23.4,ly=ey+Math.sin(a)*26.4;
        ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(lx,ly);ctx.quadraticCurveTo(lx+sx*5,ly-3,lx+sx*10,ly-8);ctx.stroke();
      }
    }
    // wide open smile with one front tooth, like her stills
    const mY=278,mW=26;
    ctx.beginPath();ctx.moveTo(256-mW,mY);ctx.quadraticCurveTo(256,mY+4,256+mW,mY);ctx.quadraticCurveTo(256+mW*0.6,mY+18,256,mY+18);ctx.quadraticCurveTo(256-mW*0.6,mY+18,256-mW,mY);ctx.closePath();
    ctx.fillStyle='#6e2a24';ctx.fill();
    ctx.save();ctx.clip();
    ctx.fillStyle='#d4685f';ell(256,mY+18,13,7);
    ctx.fillStyle='#ffffff';ctx.fillRect(249,mY,14,6.5);
    ctx.restore();
    ctx.beginPath();ctx.moveTo(256-mW,mY);ctx.quadraticCurveTo(256,mY+4,256+mW,mY);ctx.quadraticCurveTo(256+mW*0.6,mY+18,256,mY+18);ctx.quadraticCurveTo(256-mW*0.6,mY+18,256-mW,mY);ctx.closePath();
    ctx.strokeStyle='#5a2019';ctx.lineWidth=1.6;ctx.stroke();
    ctx.setTransform(1,0,0,1,0,0);
    tex.needsUpdate=true;
  }
  drawFace(false);return {tex,drawFace};
}


function gridGeo(nu,nv,fn,wrapU){
  const pos=[],uv=[],idx=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const p=fn(i/nu,j/nv);pos.push(p[0],p[1],p[2]);uv.push(i/nu,1-j/nv);}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();
  if(wrapU){const n=g.attributes.normal;for(let j=0;j<=nv;j++){const a=j*(nu+1),b=a+nu;
    const x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),l=Math.hypot(x,y,z)||1;n.setXYZ(a,x/l,y/l,z/l);n.setXYZ(b,x/l,y/l,z/l);}}
  return g;
}

/* ---- hair shells (shared by Luna and Lady Moon) ----
   One continuous surface: a crown that follows the head, bangs at the front, and hair that falls to the shoulders.
   Every vertex is pushed outside the head ellipsoid, so the scalp can never poke through (that was Luna's "bald spot"). */
const HAIR_LUNA={EA:0.529,EB:0.47,EC:0.48,head:[0.5712,0.4845,0.5202],
  // chestnut bob from her stills: bangs across the forehead, hair to the shoulders, ends flipped out
  bang:a=>1.26+0.08*Math.sin(a)-0.02*Math.cos(2*a),faceOpen:0.8,yb:-0.86,ybBack:-0.02,wave:0.03,flipSide:0.18,flipBack:0.1,tuck:0.04,clump:0.012,curl:2.2};
const HAIR_MOON={EA:0.5,EB:0.455,EC:0.45,head:[0.5292,0.4704,0.4802],
  // fuller cobalt bob: side-swept bangs above the glasses, waves to the shoulders
  bang:a=>1.12+0.14*Math.sin(a+0.35)-0.02*Math.cos(2*a),faceOpen:0.74,yb:-0.9,ybBack:-0.04,wave:0.062,flipSide:0.2,flipBack:0.12,tuck:0.04,clump:0.026,curl:2.6};
const HAIR_SOLON={EA:0.52,EB:0.46,EC:0.47,head:[0.55,0.48,0.5],
  // short chestnut cut: bangs and a little hair at the ears and nape, the rest tucked under his beanie
  bang:a=>1.18+0.06*Math.sin(a),faceOpen:0.92,yb:-0.16,ybBack:-0.08,wave:0.01,flipSide:0.04,flipBack:0.01,tuck:0.02,clump:0.004,curl:2};
function hairShape(cfg){
  const{EA,EB,EC}=cfg,[HX,HY,HZ]=cfg.head;
  const rEll=(x,y,z)=>1/Math.sqrt((x/EA)**2+(y/EB)**2+(z/EC)**2);
  const inHead=(x,y,z)=>(x/HX)**2+(y/HY)**2+(z/HZ)**2;     // <1 means inside the scalp
  const pMax=a=>lerp(cfg.bang(a),Math.PI/2+0.06,smooth(0.7,1.35,Math.abs(a)));
  const CAP=0.55,a0=cfg.faceOpen;
  function capPt(az,p){
    const dx=Math.sin(p)*Math.sin(az),dy=Math.cos(p),dz=Math.sin(p)*Math.cos(az);
    const lip=0.014*smooth(0.85,1,p/pMax(az))*Math.max(0,Math.cos(az));
    const vol=0.05*(1-Math.abs(dy))*smooth(0.6,1.3,Math.abs(az));
    const th=0.03+0.035*Math.max(0,dy)+vol+lip+cfg.clump*Math.abs(Math.sin(az*8+p*0.5))*smooth(0.4,1.2,p);
    let R=rEll(dx,dy,dz)+th;
    for(let k=0;k<40&&inHead(dx*R,dy*R+0.02,dz*R)<1.06;k++)R+=0.004;   // keep a clear gap above the scalp
    return [dx*R,dy*R+0.02,dz*R];
  }
  return (u,v)=>{
    const az=-Math.PI+u*Math.PI*2;
    if(v<=CAP)return capPt(az,(v/CAP)*pMax(az));
    const[x0,y0,z0]=capPt(az,pMax(az));
    const h0=Math.hypot(x0,z0),dx=x0/h0,dz=z0/h0;
    const len=smooth(a0-0.05,a0+0.3,Math.abs(az));          // no hanging hair across the face
    const t=(v-CAP)/(1-CAP);
    const back=smooth(0.3,1,-Math.cos(az)),side=1-back;
    const yb=cfg.yb+cfg.ybBack*back+0.025*Math.sin(az*7+0.7);
    const y=y0+(yb-y0)*t*len;
    const dh=0.03*Math.sin(t*Math.PI)*side+0.03*side*smooth(0,0.4,t)
      +cfg.flipSide*Math.pow(t,2.4)*side+cfg.flipBack*Math.pow(t,2.4)*back   // ends flip outward
      -cfg.tuck*back*Math.sin(t*Math.PI)                                    // tucks in at the nape
      +cfg.wave*Math.sin(t*Math.PI*cfg.curl+az*3)*t                        // soft waves
      +cfg.clump*Math.abs(Math.sin(az*9));
    let h=h0+dh*len;
    for(let k=0;k<40&&inHead(dx*h,y,dz*h)<1.06;k++)h+=0.004;
    return [dx*h,y,dz*h];
  };
}
function buildHair(mat,cfg=HAIR_LUNA){
  const m=new T.Mesh(gridGeo(128,48,hairShape(cfg),true),mat);m.castShadow=true;return m;
}

/* Chestnut bob: darker roots, warm midtones, a soft shine band. Colour lives in the texture (the material stays white). */
function makeChestnutHairTexture(){
  const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d'),r=mulberry32(321);
  c.fillStyle='#6b4330';c.fillRect(0,0,S,S);
  const cols=['#4a2c1c','#5c3824','#7a4e34','#8d5a3c','#6a4030','#3d2418','#9a6844','#5a3422'];
  c.lineCap='round';
  for(let i=0;i<1100;i++){const x0=r()*S,ph=r()*6.28,amp=2+r()*5,len=0.5+r()*0.5,y0=r()*0.2*S;
    c.strokeStyle=cols[Math.floor(r()*cols.length)];c.globalAlpha=0.35+r()*0.5;c.lineWidth=0.6+r()*2.0;
    for(const ox of[0,-S,S]){c.beginPath();for(let k=0;k<=20;k++){const t=k/20,y=y0+t*len*S,x=x0+ox+Math.sin(t*Math.PI*1.4+ph)*amp;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}}
  c.globalAlpha=1;
  let g=c.createLinearGradient(0,0,0,S*0.16);g.addColorStop(0,'rgba(40,22,14,0.45)');g.addColorStop(1,'rgba(40,22,14,0)');c.fillStyle=g;c.fillRect(0,0,S,S*0.16);
  g=c.createLinearGradient(0,S*0.72,0,S);g.addColorStop(0,'rgba(180,130,90,0)');g.addColorStop(1,'rgba(180,130,90,0.16)');c.fillStyle=g;c.fillRect(0,S*0.72,S,S*0.28);
  for(let i=0;i<280;i++){const x=r()*S,y=S*(0.16+r()*0.06),h=5+r()*14;c.globalAlpha=0.08+r()*0.18;c.fillStyle='#c4a07a';
    for(const ox of[0,-S,S])c.fillRect(x+ox,y,1+r()*2,h);}
  c.globalAlpha=1;
  const t=new T.CanvasTexture(cv);t.wrapS=T.RepeatWrapping;t.wrapT=T.ClampToEdgeWrapping;t.repeat.set(2.2,1);t.anisotropy=4;return t;
}
function buildCaretaker(){
  const HIP=0.86,HEAD_S=0.58;
  const root=new T.Group();const bodyPivot=new T.Group();root.add(bodyPivot);
  const skinMat=new T.MeshStandardMaterial({color:'#f8c6a6',roughness:0.6});
  const hairTex=makeChestnutHairTexture();
  const hairMat=new T.MeshStandardMaterial({color:'#ffffff',map:hairTex,bumpMap:hairTex,bumpScale:0.01,roughness:0.46,metalness:0.03,side:T.DoubleSide});
  const lockTex=hairTex.clone();lockTex.needsUpdate=true;lockTex.center.set(0.5,0.5);lockTex.rotation=Math.PI/2;lockTex.repeat.set(1,0.45);
  const hairLockMat=new T.MeshStandardMaterial({color:'#ffffff',map:lockTex,bumpMap:lockTex,bumpScale:0.008,roughness:0.48,metalness:0.02});
  const noseMat=new T.MeshStandardMaterial({color:'#f29a72',roughness:0.55});
  const shortsMat=new T.MeshStandardMaterial({color:'#f4a07a',roughness:0.8,map:TEX.fabric});
  const shortsCuffMat=new T.MeshStandardMaterial({color:'#e89068',roughness:0.8,map:TEX.fabric});
  // shoeBlackMat is the upper (white on her usual look); shoeWhiteMat is the toe, heel and sole (black)
  const shoeBlackMat=new T.MeshStandardMaterial({color:'#f7f7f4',roughness:0.55});
  const shoeWhiteMat=new T.MeshStandardMaterial({color:'#2b2d31',roughness:0.6});
  const shirtMat=new T.MeshStandardMaterial({map:createCatShirtTexture(),roughness:0.78});
  const faceObj=createCaretakerFaceTexture();
  const headMat=new T.MeshStandardMaterial({map:faceObj.tex,roughness:0.62});
  cacheFaceSwaps(faceObj,headMat,b=>b?'blink':'open');

  const shCv=document.createElement('canvas');shCv.width=128;shCv.height=128;
  const shCtx=shCv.getContext('2d');const shGrd=shCtx.createRadialGradient(64,64,6,64,64,58);
  shGrd.addColorStop(0,'rgba(15,20,35,0.48)');shGrd.addColorStop(1,'rgba(15,20,35,0)');
  shCtx.fillStyle=shGrd;shCtx.fillRect(0,0,128,128);
  const shadowDisc=new T.Mesh(new T.PlaneGeometry(1.55,1.55),new T.MeshBasicMaterial({map:new T.CanvasTexture(shCv),transparent:true,depthWrite:false}));
  shadowDisc.rotation.x=-Math.PI/2;shadowDisc.position.y=0.03;root.add(shadowDisc);
  const charLight=new T.PointLight(0xffdfc2,0.35,7,2);charLight.position.set(0,2.0,1.15);root.add(charLight);

  // head is smaller than the old chibi ball so the torso, arms and legs read at a human height, like her still
  const headGroup=new T.Group();headGroup.position.set(0,HIP+0.92,0);headGroup.scale.setScalar(HEAD_S);bodyPivot.add(headGroup);
  const headGeo=new T.SphereGeometry(0.51,36,28);headGeo.scale(1.02,0.95,1.12);headGeo.rotateY(-Math.PI/2); // after the turn: 0.571 wide, 0.52 deep
  const headMesh=new T.Mesh(headGeo,headMat);headMesh.castShadow=true;headGroup.add(headMesh);
  const noseMesh=new T.Mesh(new T.SphereGeometry(0.05,14,12),noseMat);noseMesh.scale.set(1.15,0.72,0.85);noseMesh.position.set(0,-0.02,0.49);headGroup.add(noseMesh);
  const hairGrp=new T.Group();hairGrp.add(buildHair(hairMat));hairGrp.add(buildHairLocks(hairShape(HAIR_LUNA),hairLockMat,{n:16,seed:17}));headGroup.add(hairGrp);

  const neck=new T.Mesh(new T.CylinderGeometry(0.09,0.11,0.16,12),skinMat);neck.position.set(0,HIP+0.78,0);bodyPivot.add(neck);
  const shirtMesh=new T.Mesh(new T.CylinderGeometry(0.24,0.32,0.74,24),shirtMat);shirtMesh.scale.set(1.05,1.0,0.78);shirtMesh.position.set(0,HIP+0.38,0);shirtMesh.castShadow=true;bodyPivot.add(shirtMesh);
  const collar=new T.Mesh(new T.TorusGeometry(0.12,0.02,8,20),shirtMat);collar.rotation.x=Math.PI/2;collar.position.set(0,HIP+0.76,0);bodyPivot.add(collar);

  let handR=null,can=null;
  function makeArm(side){
    const g=new T.Group();g.position.set(side*0.32,HIP+0.68,0);
    const sleeve=new T.Mesh(new T.CylinderGeometry(0.09,0.11,0.28,14),shirtMat);sleeve.position.set(side*0.04,-0.12,0);sleeve.rotation.z=side*0.28;g.add(sleeve);
    const arm=new T.Mesh(new T.CylinderGeometry(0.055,0.048,0.52,12),skinMat);arm.position.set(side*0.1,-0.46,0);arm.rotation.z=side*0.12;g.add(arm);
    const hand=new T.Mesh(new T.SphereGeometry(0.085,14,12),skinMat);hand.position.set(side*0.14,-0.76,0.01);g.add(hand);
    if(side>0){
      handR=new T.Object3D();handR.position.set(0.14,-0.8,0.06);g.add(handR);
      // watering can, shown only while watering
      can=new T.Group();can.position.set(0.16,-0.78,0.04);can.visible=false;g.add(can);
      const cm=new T.MeshStandardMaterial({color:'#5fae6e',roughness:0.45,metalness:0.25});
      const body=new T.Mesh(new T.CylinderGeometry(0.085,0.095,0.16,14),cm);body.position.y=-0.04;can.add(body);
      const spout=new T.Mesh(new T.CylinderGeometry(0.014,0.02,0.24,8),cm);spout.position.set(0,0.0,0.15);spout.rotation.x=1.05;can.add(spout);
      const rose=new T.Mesh(new T.SphereGeometry(0.03,8,6),cm);rose.position.set(0,0.05,0.25);can.add(rose);
      const handle=new T.Mesh(new T.TorusGeometry(0.06,0.012,6,14,Math.PI),cm);handle.position.set(0,0.04,-0.02);handle.rotation.y=Math.PI/2;can.add(handle);
      can.spout=new T.Object3D();can.spout.position.set(0,0.06,0.28);can.add(can.spout);
    }
    bodyPivot.add(g);return g;
  }
  const leftArm=makeArm(-1),rightArm=makeArm(1);
  const pelvis=new T.Mesh(new T.CylinderGeometry(0.3,0.31,0.18,18),shortsMat);pelvis.scale.set(1.07,1,0.8);pelvis.position.set(0,HIP+0.02,0);bodyPivot.add(pelvis);

  function makeLeg(side){
    const g=new T.Group();g.position.set(side*0.13,HIP,0);
    const shortLeg=new T.Mesh(new T.CylinderGeometry(0.13,0.135,0.32,16),shortsMat);shortLeg.position.set(0,-0.14,0);g.add(shortLeg);
    const cuff=new T.Mesh(new T.CylinderGeometry(0.145,0.145,0.06,16),shortsCuffMat);cuff.position.set(0,-0.32,0);g.add(cuff);
    const calf=new T.Mesh(new T.CylinderGeometry(0.062,0.055,0.46,12),skinMat);calf.position.set(0,-0.54,0);g.add(calf);
    const pant=new T.Mesh(new T.CylinderGeometry(0.13,0.09,0.7,14),shortsMat);pant.position.set(0,-0.38,0);pant.visible=false;pant.castShadow=true;g.add(pant);
    const foot=new T.Group();foot.position.set(0,-0.8,0.05);
    const sole=new T.Mesh(new T.BoxGeometry(0.2,0.04,0.33),shoeWhiteMat);sole.position.set(0,-0.04,0.02);foot.add(sole);
    const upper=new T.Mesh(new T.BoxGeometry(0.172,0.082,0.17),shoeBlackMat);upper.position.set(0,0.018,-0.025);foot.add(upper);
    const toe=new T.Mesh(new T.SphereGeometry(0.09,14,10),shoeWhiteMat);toe.scale.set(1.05,0.46,0.72);toe.position.set(0,-0.012,0.128);foot.add(toe);
    const heel=new T.Mesh(new T.BoxGeometry(0.174,0.064,0.05),shoeWhiteMat);heel.position.set(0,0.032,-0.108);foot.add(heel);
    for(let k=0;k<3;k++){const lace=new T.Mesh(new T.BoxGeometry(0.1,0.012,0.015),shoeBlackMat);lace.position.set(0,0.068,-0.01+k*0.028);lace.rotation.y=(k%2?1:-1)*0.38;foot.add(lace);}
    g.add(foot);bodyPivot.add(g);return {leg:g,foot,shortLeg,cuff,pant};
  }
  const leftLeg=makeLeg(-1),rightLeg=makeLeg(1);
  bodyPivot.scale.setScalar(1);scene.add(root);
  return {root,bodyPivot,headGroup,leftArm,rightArm,leftLeg,rightLeg,shadowDisc,charLight,faceObj,HIP,handR,can,nose:noseMesh,
    mats:{shirtMat,shortsMat,shortsCuffMat,shoeBlackMat,shoeWhiteMat,skinMat}};
}

const caretaker=buildCaretaker();

/* ================= Space Launch Twilight Plume Event ================= */
/* ================= Space Launch Twilight Plume Event ================= */
/* ---------------- twilight rocket launch: "space jellyfish" ----------------
   Modelled on real twilight launches: a glowing orange ascent arc rises from the sea, the engine lights up a huge
   blue-white bell of expanding exhaust (the "jellyfish") with rays fanning back from the engine, and a billowing,
   sunlit cloud trails behind with warm tints. Everything is additive and bright so the bloom pass makes it glow.
   One draw call for all particles (instanced billboards) + one for the bell. No scene lights are added. */
const SPACE_LAUNCH = (function(){
  // launched from open sea INSIDE the ring of backdrop mountains (radius 340) so nothing hides it; climbs high above the skyline
  const PAD=new T.Vector3(150,0,-175), DIR=new T.Vector3(0.95,0,0.32).normalize(), K=0.55;   // K scales the plume to this closer distance
  const H=270, D=210, TA=18, TOTAL=50;                 // ascent seconds, whole show seconds
  const pathAt=(s,out)=>out.copy(PAD).addScaledVector(DIR,D*s*s).setY(H*(1-Math.pow(1-s,1.7)));
  const sOf=t=>Math.pow(clamp(t/TA,0,1),1.25);

  // soft billowy cloud texture for the exhaust puffs
  const cloudTex=canvasTex(128,128,c=>{const r=mulberry32(4242);c.fillStyle='#000';c.fillRect(0,0,128,128);c.globalCompositeOperation='lighter';
    for(let i=0;i<26;i++){const x=64+(r()-0.5)*62,y=64+(r()-0.5)*62,rad=10+r()*26,g=c.createRadialGradient(x,y,0,x,y,rad);
      g.addColorStop(0,'rgba(255,255,255,'+(0.18+r()*0.2)+')');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,rad,0,6.2832);c.fill();}});

  // ---- instanced billboard particles ----
  const N_TRAIL=560,N_PLUME=820,FIXED=4,N=FIXED+N_TRAIL+N_PLUME;
  const pg=new T.PlaneGeometry(1,1),geo=new T.InstancedBufferGeometry();
  geo.index=pg.index;geo.setAttribute('position',pg.attributes.position);geo.setAttribute('uv',pg.attributes.uv);
  const aPos=new T.InstancedBufferAttribute(new Float32Array(N*3),3),aCol=new T.InstancedBufferAttribute(new Float32Array(N*4),4),aDat=new T.InstancedBufferAttribute(new Float32Array(N*3),3);
  for(const at of[aPos,aCol,aDat])at.setUsage(T.DynamicDrawUsage);
  geo.setAttribute('iPos',aPos);geo.setAttribute('iCol',aCol);geo.setAttribute('iDat',aDat);geo.instanceCount=N;
  const pMat=new T.ShaderMaterial({uniforms:{uCloud:{value:cloudTex}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,
    vertexShader:`attribute vec3 iPos;attribute vec4 iCol;attribute vec3 iDat;varying vec2 vUv;varying vec4 vCol;varying float vKind;
      void main(){vUv=uv;vCol=iCol;vKind=iDat.z;vec4 mv=viewMatrix*vec4(iPos,1.0);float c=cos(iDat.y),s=sin(iDat.y);
        mv.xy+=vec2(c*position.x-s*position.y,s*position.x+c*position.y)*iDat.x;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D uCloud;varying vec2 vUv;varying vec4 vCol;varying float vKind;
      void main(){vec2 d=vUv-0.5;float r=length(d)*2.0;float a;
        if(vKind>1.5){a=exp(-r*r*2.6)*smoothstep(1.0,0.6,r);}
        else if(vKind<0.5){a=exp(-r*r*5.0)+0.32*exp(-r*r*1.2);a*=smoothstep(1.0,0.75,r);}
        else{a=texture2D(uCloud,vUv).r*smoothstep(1.0,0.55,r)*1.6;}
        a*=vCol.a;if(a<0.003)discard;gl_FragColor=vec4(vCol.rgb,a);}`});
  const parts=new T.Mesh(geo,pMat);parts.frustumCulled=false;parts.visible=false;parts.renderOrder=5;parts.userData.noWx=true;scene.add(parts);

  // ---- the glowing "jellyfish" bell: a teardrop shell with a bright fresnel rim and rays from the engine ----
  const bg=new T.SphereGeometry(1,48,32);{const P=bg.attributes.position;for(let i=0;i<P.count;i++){let x=P.getX(i),y=P.getY(i),z=P.getZ(i);
    const k=z>=0?1-0.18*z*z:1-0.66*Math.pow(-z,1.45);P.setXYZ(i,x*k,y*k,z);}bg.computeVertexNormals();}
  const bellMat=new T.ShaderMaterial({uniforms:{uA:{value:0},uRim:{value:new T.Color(0.75,0.92,1.35)},uIn:{value:new T.Color(0.32,0.55,1.05)},uT:{value:0}},
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false,
    vertexShader:`varying vec3 vN;varying vec3 vV;varying vec3 vL;void main(){vL=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uA;uniform vec3 uRim;uniform vec3 uIn;uniform float uT;varying vec3 vN;varying vec3 vV;varying vec3 vL;
      void main(){float f=1.0-abs(dot(normalize(vN),normalize(vV)));float rim=pow(f,2.3);
        float along=vL.z;float front=smoothstep(-1.0,0.55,along);
        float ang=atan(vL.y,vL.x);float rays=pow(0.5+0.5*sin(ang*9.0+along*1.7+uT*0.15),6.0)*smoothstep(-0.7,0.9,along);
        float glow=smoothstep(0.2,1.0,along);   // brighter toward the engine end
        vec3 col=mix(uIn,uRim,rim)+vec3(0.5,0.6,0.75)*glow*0.5;
        float a=(0.02+rim*0.75+rays*0.22+glow*0.12)*front*uA;gl_FragColor=vec4(col,a);}`});
  const bell=new T.Mesh(bg,bellMat);bell.visible=false;bell.renderOrder=4;bell.frustumCulled=false;bell.userData.noWx=true;scene.add(bell);

  // ---- photographed twilight cloud (the still the launch blooms into) ----
  // Starts with the big blow at about 7s, pinned so the photo's engine sits on the live engine, then
  // expands slowly and thins away. The rocket, plume and bell underneath are left exactly as they are.
  const CLOUD_UE=0.145,CLOUD_VE=0.507,CLOUD_ASPECT=2000/1342;
  // Opened from disk, Chrome will not put launch-cloud.jpg on a WebGL texture: three.js
  // asks for a CORS fetch, which file:// cannot do, and a non-CORS local image is rejected
  // by texImage2D. The double-click page loads public/images/launch-cloud.js first, which
  // sets LUNA_LAUNCH_CLOUD to a data URL of this same photo.
  const photoURL=window.LUNA_LAUNCH_CLOUD||((window.LUNA_ASSET_BASE||'')+'images/launch-cloud.jpg');
  const photoTex=new T.TextureLoader().load(photoURL);
  photoTex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  photoTex.minFilter=T.LinearFilter;photoTex.magFilter=T.LinearFilter;photoTex.generateMipmaps=false;
  const cloudVS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const cloudFS=`uniform sampler2D uMap;uniform float uOp;uniform float uT;uniform float uBillow;varying vec2 vUv;
    void main(){
      vec2 e=vec2(0.145,0.507);vec2 from=vUv-e;float rad=length(from);
      float ang=sin(rad*7.0-uT*0.16)*0.010*uBillow;float cs=cos(ang),sn=sin(ang);
      vec2 uv=e+vec2(cs*from.x-sn*from.y,sn*from.x+cs*from.y);
      uv.x+=sin(uv.y*5.0+uT*0.14)*0.007*uBillow;uv.y+=sin(uv.x*4.2-uT*0.11)*0.005*uBillow;
      if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0)discard;
      vec3 col=texture2D(uMap,uv).rgb;
      float luma=dot(col,vec3(0.299,0.587,0.114));
      // navy sky stays out so the card never shows; the colored plume stays solid
      float sky=smoothstep(0.11,0.20,luma);
      float core=smoothstep(0.90,0.995,luma);
      vec3 dye=col+(col-vec3(luma))*0.42;
      dye=min(dye*1.06,vec3(1.25));
      float vig=smoothstep(0.72,0.40,length(vUv-vec2(0.46,0.50)));
      float band=smoothstep(0.06,0.20,vUv.y)*smoothstep(0.97,0.80,vUv.y);
      float edge=smoothstep(0.0,0.04,vUv.x)*smoothstep(1.0,0.96,vUv.x)*smoothstep(0.0,0.04,vUv.y)*smoothstep(1.0,0.96,vUv.y);
      edge*=band;
      float a=sky*(1.0-core*0.45)*vig*edge*uOp;
      if(a<0.025)discard;
      gl_FragColor=vec4(dye*a,a);
    }`;
  const cloudMat=new T.ShaderMaterial({uniforms:{uMap:{value:photoTex},uOp:{value:0},uT:{value:0},uBillow:{value:0}},
    transparent:true,depthWrite:false,depthTest:false,fog:false,
    side:T.DoubleSide,
    blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,
    blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor,
    vertexShader:cloudVS,fragmentShader:cloudFS});
  const glowFS=`uniform sampler2D uMap;uniform float uOp;uniform float uT;uniform float uBillow;varying vec2 vUv;
    void main(){
      vec2 uv=vUv;uv.x+=sin(uv.y*5.0+uT*0.16)*0.01*uBillow;uv.y+=sin(uv.x*4.0-uT*0.12)*0.008*uBillow;
      vec3 col=texture2D(uMap,clamp(uv,0.0,1.0)).rgb;
      float luma=dot(col,vec3(0.299,0.587,0.114));
      float a=smoothstep(0.18,0.36,luma)*smoothstep(0.70,0.36,length(vUv-vec2(0.46,0.50)))*uOp;
      if(a<0.01)discard;
      gl_FragColor=vec4(col,a);
    }`;
  const glowMat=new T.ShaderMaterial({uniforms:{uMap:{value:photoTex},uOp:{value:0},uT:{value:0},uBillow:{value:0}},
    transparent:true,depthWrite:false,depthTest:false,fog:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    vertexShader:cloudVS,fragmentShader:glowFS});
  const cloudGeo=new T.PlaneGeometry(1,1);
  const cloud=new T.Mesh(cloudGeo,cloudMat);cloud.visible=false;cloud.frustumCulled=false;cloud.renderOrder=6;cloud.userData.noWx=true;scene.add(cloud);
  const glow=new T.Mesh(cloudGeo,glowMat);glow.visible=false;glow.frustumCulled=false;glow.renderOrder=5;glow.userData.noWx=true;scene.add(glow);

  // ---- state ----
  const P=new Float32Array(N_PLUME*3),V=new Float32Array(N_PLUME*3),Pd=new Float32Array(N_PLUME*8); // age,life,size0,grow,rot,spin,warm,alpha
  const TP=new Float32Array(N_TRAIL*3),TB=new Float32Array(N_TRAIL);   // trail position, birth time
  let active=false,t=0,pi=0,ti=0,tCount=0,looked=false;
  const eng=new T.Vector3(),prev=new T.Vector3(),lastTrail=new T.Vector3(),vel=new T.Vector3(),bellC=new T.Vector3(),tmp=new T.Vector3(),_q=new T.Quaternion(),Z=new T.Vector3(0,0,1);
  const cX=new T.Vector3(),cY=new T.Vector3(),cZ=new T.Vector3(),cTo=new T.Vector3(),cBack=new T.Vector3(),cM=new T.Matrix4(),cUpW=new T.Vector3(0,1,0);
  const photoCenter=new T.Vector3(),faceAnchor=new T.Vector3();let photoW=48,faceW=48,faceH=32;
  function faceCloud(){
    if(!cloud.visible)return;
    const width=faceW,height=faceH,dir=bell.userData.dir||DIR;
    cTo.copy(camera.position).sub(faceAnchor);if(cTo.lengthSq()<1)cTo.set(0,0.4,1);cTo.normalize();
    cBack.copy(dir).multiplyScalar(-1);cX.copy(cBack).addScaledVector(cTo,-cBack.dot(cTo));
    if(cX.lengthSq()<0.2){cX.crossVectors(cTo,cUpW);if(cX.lengthSq()<1e-4)cX.set(1,0,0);}
    cX.normalize();
    cY.crossVectors(cTo,cX).normalize();cZ.crossVectors(cX,cY).normalize();
    cloud.position.copy(faceAnchor).addScaledVector(cX,(0.5-CLOUD_UE)*width).addScaledVector(cY,(0.5-CLOUD_VE)*height);
    cM.makeBasis(cX,cY,cZ);cloud.quaternion.setFromRotationMatrix(cM);cloud.scale.set(width,height,1);
    glow.position.copy(cloud.position);glow.quaternion.copy(cloud.quaternion);glow.scale.set(width*1.08,height*1.08,1);
  }
  const focus=new T.Object3D();          // what Luna and the auto camera look at
  const aim=new T.Vector3(),midPath=new T.Vector3();pathAt(sOf(TA*0.7),midPath);
  const view={k:0,target:0};             // eases the free camera up toward the sky during the show
  let bellLen=0,bellA=0;
  function setP(i,x,y,z,size,rot,kind,r,g,b,a){aPos.array[i*3]=x;aPos.array[i*3+1]=y;aPos.array[i*3+2]=z;aDat.array[i*3]=size;aDat.array[i*3+1]=rot;aDat.array[i*3+2]=kind;
    const c=aCol.array;c[i*4]=r;c[i*4+1]=g;c[i*4+2]=b;c[i*4+3]=a;}
  function hide(i){aCol.array[i*4+3]=0;aDat.array[i*3]=0;}
  function reset(){for(let i=0;i<N;i++)hide(i);for(let i=0;i<N_PLUME;i++)Pd[i*8+1]=0;pi=0;ti=0;tCount=0;looked=false;bellLen=0;bellA=0;
    pathAt(0,eng);prev.copy(eng);lastTrail.copy(eng);bellC.copy(eng);}
  function aimCamera(){
    if(typeof FREE==='undefined'||FREE.on||INSIDE.on||DIRECTOR.on)return;
    pathAt(0.62,tmp);const dx=tmp.x-camTarget.x,dz=tmp.z-camTarget.z;
    tTheta=theta+normalizeAngle(Math.atan2(-dx,-dz)-theta);idle=0;view.target=1;
  }
  return {
    focus,view,aim,pad:PAD,
    get active(){return active;},
    get time(){return t;},
    get bellLen(){return bellLen;},
    bellDir(){return bell.userData.dir||DIR;},
    get cloudSpan(){return photoW;},
    get cloudCenter(){return photoCenter;},
    get cloudCover(){return cloud.visible?cloudMat.uniforms.uOp.value:0;},
    faceCloud,
    trigger(forced=false){
      if(active && !forced) return;
      let played=false;
      try{ played = !!localStorage.getItem('lunas-spacelaunch-played-v1'); }catch(e){}
      if(played && !forced) return; // only plays by itself the first time ever; the button replays it any time
      active=true;t=0;reset();parts.visible=true;bell.visible=false;aim.copy(midPath);
      aimCamera();
      toast('Look out over the sea: a rocket launch is lighting up the twilight sky!');
      try{ localStorage.setItem('lunas-spacelaunch-played-v1', '1'); }catch(e){}
    },
    update(dt){
      // the free camera eases toward the launch view and back again
      view.k+=(view.target-view.k)*Math.min(1,dt*0.9);if(view.k<0.001&&view.target===0)view.k=0;
      if(!active) return;
      t+=dt;
      if(t>TA+16)view.target=0;
      // --- engine along the ascent arc ---
      prev.copy(eng);
      const burning=t<TA;
      if(burning)pathAt(sOf(t),eng);
      vel.subVectors(eng,prev).divideScalar(Math.max(dt,1e-4));
      const s=sOf(t),alt=clamp(eng.y/H,0,1);
      focus.position.copy(burning?eng:bellC);
      aim.copy(midPath).lerp(focus.position,0.8);if(bell.visible)aim.addScaledVector(bell.userData.dir||DIR,-bellLen*0.5);
      // Luna stops to watch (and the auto camera frames her looking up)
      if(!looked&&t>3&&t<TA+6&&typeof AI!=='undefined'&&!AI.inside&&!CTRL.on&&!STILL.on&&AI.state!=='skylook'&&canInterrupt()){
        looked=true;AI.saved={state:AI.state,timer:AI.timer};AI.state='skylook';AI.skyT=11;AI.skyObj=focus;AI.lastSky=simTime;emote(caretaker.headGroup,'!',0.85,1.4,0.55);}
      // --- glowing orange ascent trail ---
      if(burning){
        const gap=0.9;let d=lastTrail.distanceTo(eng);
        while(d>gap){lastTrail.lerp(eng,gap/d);const k=ti%N_TRAIL;TP[k*3]=lastTrail.x;TP[k*3+1]=lastTrail.y;TP[k*3+2]=lastTrail.z;TB[k]=t;ti++;tCount=Math.min(N_TRAIL,tCount+1);d=lastTrail.distanceTo(eng);}
      }
      for(let k=0;k<N_TRAIL;k++){const i=FIXED+k;if(k>=tCount){hide(i);continue;}
        const age=t-TB[k],fresh=Math.exp(-age*1.6),fade=Math.exp(-age/13)*smooth(0,0.2,age+0.2);
        setP(i,TP[k*3],TP[k*3+1],TP[k*3+2],3.6+2.2*fresh,0,0,1.55+0.5*fresh,0.62+0.45*fresh,0.22+0.35*fresh,0.85*fade);}
      // --- exhaust plume particles (start once the rocket is high enough to catch sunlight) ---
      if(burning&&s>0.22){
        const rate=lerp(22,62,smooth(0.22,0.8,s));let n=rate*dt+Math.random();n=Math.floor(n);
        const back=tmp.copy(vel).normalize();
        for(let e=0;e<n;e++){const k=pi%N_PLUME;pi++;
          // random direction with a bias backwards along the flight path: forms the teardrop bell and trailing cloud
          let rx=Math.random()*2-1,ry=Math.random()*2-1,rz=Math.random()*2-1;const rl=Math.hypot(rx,ry,rz)||1;rx/=rl;ry/=rl;rz/=rl;
          const expand=lerp(3,17,alt)*(0.55+Math.random()*0.6)*K,bk=lerp(6,16,Math.random())*K;
          P[k*3]=eng.x+rx;P[k*3+1]=eng.y+ry;P[k*3+2]=eng.z+rz;
          V[k*3]=rx*expand-back.x*bk;V[k*3+1]=ry*expand-back.y*bk+0.6;V[k*3+2]=rz*expand-back.z*bk;
          const o=k*8;Pd[o]=0;Pd[o+1]=lerp(16,27,Math.random());Pd[o+2]=lerp(2,4,Math.random());Pd[o+3]=lerp(2.2,5.2,Math.random())*(0.55+alt)*K;
          Pd[o+4]=Math.random()*6.28;Pd[o+5]=(Math.random()-0.5)*0.25;Pd[o+6]=Math.random()<lerp(0.4,0.16,alt)?1:0;Pd[o+7]=lerp(0.03,0.06,Math.random());}
      }
      const drag=Math.exp(-dt*0.28);
      for(let k=0;k<N_PLUME;k++){const i=FIXED+N_TRAIL+k,o=k*8;if(Pd[o+1]<=0){hide(i);continue;}
        Pd[o]+=dt;const age=Pd[o],life=Pd[o+1];if(age>=life){Pd[o+1]=0;hide(i);continue;}
        V[k*3]*=drag;V[k*3+1]*=drag;V[k*3+2]*=drag;P[k*3]+=V[k*3]*dt;P[k*3+1]+=V[k*3+1]*dt;P[k*3+2]+=V[k*3+2]*dt;Pd[o+4]+=Pd[o+5]*dt;
        const a=smooth(0,0.5,age)*(1-smooth(life*0.35,life,age))*Pd[o+7],hot=Math.exp(-age*0.9);
        let r,g,b;if(Pd[o+6]){r=1.4;g=0.66+0.15*hot;b=0.34+0.2*hot;}        // warm sunset-lit puffs
        else{r=0.5+0.3*hot;g=0.72+0.25*hot;b=1.2+0.1*hot;}               // blue-white sunlit exhaust
        setP(i,P[k*3],P[k*3+1],P[k*3+2],Pd[o+2]+Pd[o+3]*age,Pd[o+4],1,r,g,b,a);}
      // --- engine light, halo and launch-pad glow ---
      const flick=0.85+0.15*Math.sin(t*41)*Math.sin(t*17.3),engA=burning?1:Math.max(0,1-(t-TA)*1.4);
      const high=smooth(0.15,0.45,s);
      setP(0,eng.x,eng.y,eng.z,(6+4*high)*flick,0,0,2.2,1.9,1.6,engA);                                              // white-hot core
      setP(1,eng.x,eng.y,eng.z,lerp(16,40,high)*flick,0,0,lerp(1.5,0.55,high),lerp(0.7,0.8,high),lerp(0.25,1.4,high),0.45*engA); // halo: orange low, blue high
      setP(2,PAD.x,5,PAD.z,55,0,0,1.6,0.7,0.25,Math.max(0,1-t/7)*0.9);                                              // glow on the sea at lift-off
      // --- the jellyfish bell grows around the engine, then lingers and spreads after engine cut-off ---
      if(burning)bellC.copy(eng);
      const grow=smooth(TA*0.38,TA+6,t);bellLen=(lerp(3,150,grow)+(t>TA?(t-TA)*2.2:0))*K;
      bellA=smooth(TA*0.38,TA*0.62,t)*(1-smooth(TA+8,TOTAL-4,t));
      bell.visible=bellA>0.002;
      if(bell.visible){const dir=vel.lengthSq()>1e-6&&burning?tmp.copy(vel).normalize():tmp.copy(bell.userData.dir||DIR);bell.userData.dir=dir.clone();
        _q.setFromUnitVectors(Z,dir);bell.quaternion.copy(_q);const rad=bellLen*0.52;bell.scale.set(rad,rad,bellLen);
        bell.position.copy(bellC).addScaledVector(dir,-bellLen*0.9);/* engine rides at the bright front tip */bellMat.uniforms.uA.value=bellA*0.6;bellMat.uniforms.uT.value=t;}
      // soft atmospheric halo around the whole jellyfish
      if(bell.visible){tmp.copy(bell.position).addScaledVector(bell.userData.dir,bellLen*0.35);setP(3,tmp.x,tmp.y,tmp.z,bellLen*2.8,0,2,0.3,0.48,1.1,0.16*bellA);}else hide(3);
      // the still joins the blow at ~7s (where the reference film's big expansion is), grows with it, then fades
      {
        const growT=smooth(6.6,28,t),gone=smooth(32,45.4,t),op=smooth(6.6,10.5,t)*(1-gone);
        const width=lerp(96,340,growT)*(1+gone*0.12);
        const show=op>0.015&&!!(photoTex.image&&photoTex.image.width);
        cloud.visible=glow.visible=show;
        if(show){
          const height=width/CLOUD_ASPECT,anchor=burning?eng:bellC,dir=bell.userData.dir||DIR,billow=smooth(9,22,t);
          faceAnchor.copy(anchor);faceW=width;faceH=height;
          photoW=width;photoCenter.copy(anchor).addScaledVector(dir,-width*0.36);
          cloudMat.uniforms.uOp.value=op;cloudMat.uniforms.uT.value=t;cloudMat.uniforms.uBillow.value=billow*0.4;
          glowMat.uniforms.uOp.value=op*0.08;glowMat.uniforms.uT.value=t;glowMat.uniforms.uBillow.value=billow*0.4;
        }
      }
      aPos.needsUpdate=true;aCol.needsUpdate=true;aDat.needsUpdate=true;
      if(t>=TOTAL){active=false;parts.visible=false;bell.visible=false;cloud.visible=false;glow.visible=false;view.target=0;}
    }
  };
})();


/* ================= Lady Moon: 3D Chibi Crafter Companion & AI Brain ================= */
let FOLLOW_MOON = false, FOLLOW_SOLON = false;
function createCrochetTexture(){
  const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
  c.fillStyle='#dcdcdc';c.fillRect(0,0,S,S);
  for(let y=0;y<S;y+=8){
    c.fillStyle=y%16===0?'#cecece':'#e8e8e8';c.fillRect(0,y,S,4);
    for(let x=0;x<S;x+=8){
      c.strokeStyle='#b0b0b0';c.lineWidth=1.4;
      c.beginPath();c.arc(x+((y/8)%2)*4,y+4,3.2,0.15*Math.PI,0.85*Math.PI);c.stroke();
    }
  }
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,3);return t;
}
const CROCHET_TEX = createCrochetTexture();

function createRainbowOnesieTexture(){
  const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
  const bands=['#e82c2a','#f28322','#f7d426','#3eb54a','#2276e3','#7a35c9'];
  const nb=12,bh=S/nb;
  for(let i=0;i<nb;i++){
    c.fillStyle=bands[i%bands.length];
    c.fillRect(0,i*bh,S,bh+1);
    c.fillStyle='rgba(255,255,255,0.09)';
    c.fillRect(0,i*bh,S,3);
    c.fillStyle='rgba(0,0,0,0.08)';
    c.fillRect(0,(i+1)*bh-3,S,3);
  }
  // subtle vertical rib knit lines
  c.fillStyle='rgba(255,255,255,0.04)';
  for(let x=0;x<S;x+=6)c.fillRect(x,0,2,S);
  // the cylinder's seam (u = 0 and u = 1) is the front, so the zipper straddles both edges
  c.fillStyle='#3a4454';c.fillRect(0,0,7,S);c.fillRect(S-7,0,7,S);
  c.fillStyle='#d8dee8';for(let y=6;y<S;y+=10){c.fillRect(1,y,5,4);c.fillRect(S-6,y,5,4);}
  // gold zipper pull on the upper chest
  c.fillStyle='#f0c84a';c.strokeStyle='#8a6420';c.lineWidth=2;
  c.beginPath();c.roundRect?c.roundRect(S-11,36,14,22,3):c.fillRect(S-11,36,14,22);c.fill();c.stroke();
  c.fillStyle='#fff4c4';c.fillRect(S-7,40,6,6);
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}

function createRainbowLimbTexture(reps){
  const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
  const bands=['#e82c2a','#f28322','#f7d426','#3eb54a','#2276e3','#7a35c9'];
  const nb=reps||6,bh=S/nb;
  for(let i=0;i<nb;i++){
    c.fillStyle=bands[i%bands.length];c.fillRect(0,i*bh,S,bh+1);
    c.fillStyle='rgba(0,0,0,0.08)';c.fillRect(0,(i+1)*bh-2,S,2);
  }
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}

function createLadyMoonFaceTexture(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=512;
  const ctx=cv.getContext('2d');const tex=new T.CanvasTexture(cv);
  const SKIN='#f8c6a6';
  const ell=(x,y,rx,ry)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  function drawFace(mode){
    // mode: false/'open' | true/'blink' | 'happy' (closed-eye ^ ^ smile) | 'smile' (closed mouth smile)
    const blink=(mode===true||mode==='blink'),happy=(mode==='happy'),soft=(mode==='smile');
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=SKIN;ctx.fillRect(0,0,512,512);
    ctx.setTransform(1,0,0,2,0,-256);
    // rosy round cheeks
    for(const sx of[-1,1]){
      const cx=256+sx*64,cy=272,grd=ctx.createRadialGradient(cx,cy,2,cx,cy,28);
      grd.addColorStop(0,'rgba(242,122,104,0.36)');grd.addColorStop(1,'rgba(242,122,104,0)');
      ctx.fillStyle=grd;ell(cx,cy,28,26);
    }
    // freckles across cheeks and nose bridge
    ctx.fillStyle='#c46845';
    for(const sx of[-1,1]){
      for(const[fx,fy,r]of[[44,268,2.6],[54,265,2.8],[64,269,2.5],[49,275,2.7],[59,277,2.4],[69,274,2.6],[36,272,2.2]]){
        ell(256+sx*fx,fy,r,r);
      }
    }
    for(const[nx,ny]of[[-10,263],[0,261],[11,264],[-5,267],[6,267]])ell(256+nx,ny,2.1,2.1);
    // cobalt-blue eyebrows
    ctx.strokeStyle='#1852c2';ctx.lineWidth=4.8;ctx.lineCap='round';
    for(const sx of[-1,1]){
      const ex=256+sx*50;
      ctx.beginPath();ctx.moveTo(ex-sx*18,217);ctx.quadraticCurveTo(ex,210,ex+sx*19,216);ctx.stroke();
    }
    // eyes: large round gray-brown with prominent black lashes, or happy ^ ^ arcs
    for(const sx of[-1,1]){
      const ex=256+sx*50,ey=245;
      if(blink){
        ctx.strokeStyle='#231b18';ctx.lineWidth=4.0;
        ctx.beginPath();ctx.ellipse(ex,ey+4,20,10,0,0.12*Math.PI,0.88*Math.PI);ctx.stroke();
      }else if(happy){
        ctx.strokeStyle='#231b18';ctx.lineWidth=4.4;
        ctx.beginPath();ctx.ellipse(ex,ey+5,19,12,0,1.12*Math.PI,1.88*Math.PI);ctx.stroke();
        ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(ex+sx*18,ey+2);ctx.lineTo(ex+sx*24,ey-2);ctx.stroke();
      }else{
        ctx.fillStyle='#ffffff';ell(ex,ey,22,24.5);
        ctx.fillStyle='#5c4538';ell(ex,ey+1.5,17.8,20.5);
        ctx.fillStyle='#7c604e';ell(ex,ey+2,15,17.5);
        ctx.fillStyle='#1f1917';ell(ex,ey+2.5,10.2,12);
        ctx.fillStyle='#ffffff';ell(ex-sx*5.5,ey-6.5,4.8,4.8);ell(ex+sx*6,ey+9.5,2.2,2.2);
        ctx.strokeStyle='#1e1614';ctx.lineWidth=4.2;
        ctx.beginPath();ctx.ellipse(ex,ey,22.2,24.8,0,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
        // prominent outer black eyelashes
        const lx=ex+sx*20.5,ly=ey-7;
        ctx.lineWidth=3.4;ctx.beginPath();ctx.moveTo(lx,ly);ctx.quadraticCurveTo(lx+sx*6,ly-3,lx+sx*10,ly-7);ctx.stroke();
        ctx.beginPath();ctx.moveTo(lx-sx*3,ly-5);ctx.quadraticCurveTo(lx+sx*3,ly-8,lx+sx*6,ly-11);ctx.stroke();
      }
    }
    // mouth: simple curved smile or cheerful open smile
    const mY=275;
    if(soft||blink){
      ctx.strokeStyle='#5a241c';ctx.lineWidth=3.2;
      ctx.beginPath();ctx.arc(256,mY-3,18,0.18*Math.PI,0.82*Math.PI);ctx.stroke();
    }else{
      const mW=happy?25:21,mH=happy?18:15;
      ctx.beginPath();ctx.moveTo(256-mW,mY);ctx.quadraticCurveTo(256,mY+3,256+mW,mY);
      ctx.quadraticCurveTo(256+mW*0.6,mY+mH,256,mY+mH);ctx.quadraticCurveTo(256-mW*0.6,mY+mH,256-mW,mY);ctx.closePath();
      ctx.fillStyle='#68241f';ctx.fill();
      ctx.save();ctx.clip();
      ctx.fillStyle='#e06e66';ell(256,mY+mH,14,7.5);
      ctx.fillStyle='#ffffff';ctx.fillRect(242,mY,28,5.5);
      ctx.restore();
      ctx.strokeStyle='#521d18';ctx.lineWidth=1.8;ctx.stroke();
    }
    ctx.setTransform(1,0,0,1,0,0);
    tex.needsUpdate=true;
  }
  drawFace('open');
  return {tex,drawFace};
}

/* Lady Moon's hair: cobalt strands with darker roots, lighter tips and a soft "halo" shine, drawn once into a
   seamless canvas that wraps around her head (used as colour and bump so the strands catch the light). */
function makeBlueHairTexture(){
  const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d'),r=mulberry32(4711);
  c.fillStyle='#2a6ef2';c.fillRect(0,0,S,S);
  const cols=['#1a4ed4','#2460ea','#3b78f6','#4d88ff','#6aa0ff','#1850d0','#123fba','#7eb0ff'];
  c.lineCap='round';
  for(let i=0;i<1300;i++){const x0=r()*S,ph=r()*6.28,amp=3+r()*7,wv=1.6+r()*1.4,len=0.45+r()*0.55,y0=r()*0.25*S;
    c.strokeStyle=cols[Math.floor(r()*cols.length)];c.globalAlpha=0.35+r()*0.5;c.lineWidth=0.6+r()*2.2;
    for(const ox of[0,-S,S]){c.beginPath();for(let k=0;k<=24;k++){const t=k/24,y=y0+t*len*S,x=x0+ox+Math.sin(t*Math.PI*wv+ph)*amp;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}}
  c.globalAlpha=1;
  // darker at the roots, a touch lighter toward the ends
  let g=c.createLinearGradient(0,0,0,S*0.14);g.addColorStop(0,'rgba(8,24,70,0.55)');g.addColorStop(1,'rgba(8,24,70,0)');c.fillStyle=g;c.fillRect(0,0,S,S*0.14);
  g=c.createLinearGradient(0,S*0.7,0,S);g.addColorStop(0,'rgba(120,170,255,0)');g.addColorStop(1,'rgba(120,170,255,0.18)');c.fillStyle=g;c.fillRect(0,S*0.7,S,S*0.3);
  // the glossy halo band near the crown, broken up strand by strand
  for(let i=0;i<420;i++){const x=r()*S,y=S*(0.15+r()*0.07),h=6+r()*16;c.globalAlpha=0.1+r()*0.25;c.fillStyle=r()<0.5?'#a9c9ff':'#7fadff';
    for(const ox of[0,-S,S])c.fillRect(x+ox,y,1+r()*2,h);}
  c.globalAlpha=1;
  const t=new T.CanvasTexture(cv);t.wrapS=T.RepeatWrapping;t.wrapT=T.ClampToEdgeWrapping;t.repeat.set(3,1);t.anisotropy=renderer?Math.min(8,renderer.capabilities.getMaxAnisotropy()):4;return t;
}
/* Wavy, tapered locks laid over the hair shell around her sides and back, plus two face-framing pieces:
   they give the bob real volume and strand clumps. All locks are merged into one mesh (one draw call). */
function buildHairLocks(shape,mat,opt){
  const pos=[],nrm=[],uvs=[],idx=[];let base=0;const tmp=new T.Vector3();
  const add=(az,len,thick,out,waves,fwd)=>{
    const u=(az+Math.PI)/(Math.PI*2),pts=[];
    for(let i=0;i<=10;i++){const v=0.5+i*0.05*len;const[x,y,z]=shape(u,Math.min(v,1));const l=Math.hypot(x,z)||1,t=i/10;
      const tx=-z/l,tz=x/l,w=Math.sin(t*Math.PI*waves+az*3)*0.018*t;   // waves run sideways along the lock
      pts.push(new T.Vector3(x+x/l*out+tx*w+(fwd||0)*0,y-(v>1?(v-1)*0.5:0)-t*t*0.05,z+z/l*out+tz*w));}
    const curve=new T.CatmullRomCurve3(pts),tg=new T.TubeGeometry(curve,22,thick,7,false),P=tg.attributes.position,R=8;
    // taper toward the tip and flatten slightly so it reads as a ribbon of hair, not a pipe
    for(let i=0;i<=22;i++){let cx=0,cy=0,cz=0;for(let j=0;j<R;j++){const k=i*R+j;cx+=P.getX(k);cy+=P.getY(k);cz+=P.getZ(k);}cx/=R;cy/=R;cz/=R;
      const t=i/22,f=Math.max(0.15,Math.min(1,t/0.2))*(1-0.8*Math.pow(t,1.6)),nl=Math.hypot(cx,cz)||1,nx=cx/nl,nz=cz/nl;
      for(let j=0;j<R;j++){const k=i*R+j;let dx=P.getX(k)-cx,dy=P.getY(k)-cy,dz=P.getZ(k)-cz;const dn=(dx*nx+dz*nz)*0.6;dx-=nx*dn;dz-=nz*dn;
        P.setXYZ(k,cx+dx*f,cy+dy*f,cz+dz*f);}}
    tg.computeVertexNormals();
    const N=tg.attributes.normal,UV=tg.attributes.uv;
    for(let k=0;k<P.count;k++){pos.push(P.getX(k),P.getY(k),P.getZ(k));nrm.push(N.getX(k),N.getY(k),N.getZ(k));uvs.push(UV.getX(k),UV.getY(k));}
    const I=tg.index.array;for(let k=0;k<I.length;k++)idx.push(I[k]+base);base+=P.count;tg.dispose();
  };
  const r=mulberry32((opt&&opt.seed)||99),n=(opt&&opt.n)||30;
  for(let k=0;k<n;k++){const a=0.98+(k/Math.max(1,n-1))*(Math.PI*2-1.96),az=a>Math.PI?a-Math.PI*2:a;   // all the way round, except across the face
    add(az+(r()-0.5)*0.06,0.8+r()*0.3,0.034+r()*0.016,0.006+r()*0.012,1.5+r()*1.5);}
  if(!opt||opt.frame!==false)for(const s of[-1,1])add(s*0.88,1.0,0.04,0.012,2);   // face-framing locks
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nrm,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(idx);
  const m=new T.Mesh(g,mat);m.castShadow=true;return m;
}
function buildLadyMoonHair(blueMat,streakMat,lockMat){
  // Wavy cobalt bob with a full crown and side-swept bangs. It stays on under every hat (the hats sit on top of it).
  const grp=new T.Group();
  const shape=hairShape(HAIR_MOON);
  const fullMesh=new T.Mesh(gridGeo(160,56,shape,true),blueMat);fullMesh.castShadow=true;grp.add(fullMesh);
  const locks=buildHairLocks(shape,lockMat||blueMat);grp.add(locks);
  // a single red-orange streak lying on the hair surface on her right side, from the part down to the ends
  const pts=[];for(let i=0;i<=10;i++){const v=0.28+i*0.07,u=(Math.PI-0.95)/(Math.PI*2);const[x,y,z]=shape(u,Math.min(v,0.98));const l=Math.hypot(x,z)||1;
    pts.push(new T.Vector3(x+x/l*0.016,y,z+z/l*0.016));}
  const streakMesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),40,0.026,8,false),streakMat);streakMesh.castShadow=true;grp.add(streakMesh);
  return {grp,fullMesh,streakMesh,locks};
}

function buildLadyMoonGlasses(){
  const g=new T.Group();
  const frameMat=new T.MeshStandardMaterial({color:'#2a211c',roughness:0.42,metalness:0.06});
  const lensMat=new T.MeshStandardMaterial({color:'#e7f3ff',transparent:true,opacity:0.16,roughness:0.08,metalness:0.15});
  for(const sx of[-1,1]){
    const rim=new T.Group();rim.position.set(sx*0.2,0.02,0.49);rim.rotation.y=sx*0.12;g.add(rim);
    // thick rounded-rectangle frames, the shape in her stills
    blob(rim,BOX,frameMat,0,0.115,0,0.28,0.038,0.032,false);
    blob(rim,BOX,frameMat,0,-0.115,0,0.28,0.036,0.032,false);
    blob(rim,BOX,frameMat,-0.132,0,0,0.038,0.24,0.032,false);
    blob(rim,BOX,frameMat,0.132,0,0,0.038,0.24,0.032,false);
    for(const[cx,cy]of[[-0.12,0.1],[0.12,0.1],[-0.12,-0.1],[0.12,-0.1]])blob(rim,SPH,frameMat,cx,cy,0,0.028,0.028,0.03,false);
    blob(rim,BOX,lensMat,0,0,0.004,0.23,0.2,0.012,false);
    const temple=blob(g,BOX,frameMat,sx*0.46,0.03,0.2,0.028,0.03,0.5,false);
    temple.rotation.y=-sx*0.16;
  }
  blob(g,BOX,frameMat,0,0.03,0.505,0.1,0.034,0.03,false);
  return g;
}

function buildCrochetBucketHat(kind){
  // kind: 'frog' | 'strawberry' | 'coral'
  const g=new T.Group();
  const baseCol=kind==='frog'?'#7ed465':kind==='strawberry'?'#f5a4bc':'#e54832';
  const hatMat=new T.MeshStandardMaterial({color:baseCol,map:CROCHET_TEX,bumpMap:CROCHET_TEX,bumpScale:0.028,roughness:0.92,side:T.DoubleSide});
  // Lathe profile + wavy ruffled brim
  const hatGeo=gridGeo(64,24,(u,v)=>{
    const a=u*Math.PI*2;
    let r,y;
    if(v<0.55){
      const t=v/0.55;
      r=0.48*Math.sin(t*Math.PI*0.5);
      y=0.46*Math.cos(t*Math.PI*0.5)*0.58+0.28;
    }else if(v<0.80){
      const t=(v-0.55)/0.25;
      r=lerp(0.48,0.53,t);
      y=lerp(0.28,0.11,t);
    }else{
      const t=(v-0.80)/0.20;
      const wave=Math.sin(a*10)*0.014*t;
      r=lerp(0.53,0.66,t);
      y=lerp(0.11,0.02,t)+wave;
    }
    return [Math.cos(a)*r,y,Math.sin(a)*r];
  },true);
  const dome=new T.Mesh(hatGeo,hatMat);dome.castShadow=true;dome.receiveShadow=true;g.add(dome);

  if(kind==='frog'){
    const eyeGreen=hatMat,sclera=mStd('#ffffff',{roughness:0.3}),pupil=mStd('#161618',{roughness:0.15}),shine=mStd('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.4});
    for(const sx of[-1,1]){
      const eg=new T.Group();eg.position.set(sx*0.23,0.47,0.18);eg.rotation.y=sx*0.15;g.add(eg);
      blob(eg,SPH,eyeGreen,0,0,0,0.16,0.175,0.145);
      blob(eg,SPH,sclera,0,0.012,0.095,0.118,0.13,0.06,false);
      blob(eg,SPH,pupil,0,0.012,0.135,0.074,0.086,0.032,false);
      blob(eg,SPH,shine,sx*0.022,0.04,0.148,0.02,0.02,0.01,false);
    }
  }else if(kind==='strawberry'){
    const berryMat=mStd('#e52b30',{roughness:0.5}),seedMat=mStd('#f7d648',{roughness:0.4}),leafMat=mStd('#3ea845',{roughness:0.75});
    // 6 small 3D strawberries attached around the crown
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2+0.32,br=0.585,by=0.22;
      const sb=new T.Group();sb.position.set(Math.cos(a)*br,by,Math.sin(a)*br);sb.rotation.y=-a+Math.PI/2;sb.rotation.x=0.22;g.add(sb);
      blob(sb,SPH,berryMat,0,0,0,0.065,0.078,0.048);
      blob(sb,CONE,leafMat,0,0.075,0,0.048,0.03,0.035,false);
      for(const[dx,dy]of[[-0.02,0.01],[0.02,0.01],[0,-0.025],[-0.022,-0.02],[0.022,-0.02]]){
        blob(sb,SPH,seedMat,dx,dy,0.044,0.008,0.01,0.006,false);
      }
    }
    // green leafy stem detail on top
    const topStem=new T.Group();topStem.position.set(0,0.52,0);g.add(topStem);
    blob(topStem,CYL,leafMat,0,0.05,0,0.028,0.10,0.028,false).rotation.z=0.18;
    for(let k=0;k<5;k++){
      const la=k*Math.PI*2/5;
      const lf=blob(topStem,SPH,leafMat,Math.cos(la)*0.09,0.01,Math.sin(la)*0.09,0.09,0.022,0.045,false);
      lf.rotation.y=-la;
    }
  }
  g.visible=false;
  return g;
}

function buildLadyMoonProps(){
  // 1. Knitting project + needles + floor yarn ball
  const knitGroup=new T.Group();knitGroup.visible=false;
  const woodMat=mStd('#d8a96c',{roughness:0.6}),capMat=mStd('#b57c42',{roughness:0.6});
  const needleL=new T.Group();needleL.position.set(-0.14,0.06,0.04);needleL.rotation.set(0.25,0.2,-0.78);knitGroup.add(needleL);
  blob(needleL,CYL,woodMat,0,0,0,0.012,0.38,0.012,false);blob(needleL,SPH,capMat,0,0.19,0,0.022,0.022,0.022,false);
  const needleR=new T.Group();needleR.position.set(0.14,0.06,0.04);needleR.rotation.set(0.25,-0.2,0.78);knitGroup.add(needleR);
  blob(needleR,CYL,woodMat,0,0,0,0.012,0.38,0.012,false);blob(needleR,SPH,capMat,0,0.19,0,0.022,0.022,0.022,false);
  // colorful rainbow knitted swatch hanging between the needles
  const swatch=new T.Group();swatch.position.set(0,-0.08,0.06);knitGroup.add(swatch);
  const rCols=['#e82c2a','#f28322','#f7d426','#3eb54a','#2276e3','#7a35c9','#ff5d9e'];
  for(let r=0;r<9;r++){
    for(let c=0;c<7;c++){
      const col=rCols[(r+c)%rCols.length];
      blob(swatch,SPH,mStd(col,{roughness:0.95}),(c-3)*0.032,-r*0.032,(r%2)*0.006,0.022,0.02,0.018,false);
    }
  }
  // 2. Giant rainbow yarn ball held in both arms
  const yarnGroup=new T.Group();yarnGroup.visible=false;
  const yarnTex=createRainbowLimbTexture(8);
  const ballMat=new T.MeshStandardMaterial({map:yarnTex,bumpMap:CROCHET_TEX,bumpScale:0.025,roughness:0.9});
  const bigBall=new T.Mesh(new T.SphereGeometry(0.19,20,16),ballMat);bigBall.rotation.z=0.45;bigBall.castShadow=true;yarnGroup.add(bigBall);
  // trailing rainbow yarn strand
  const strandPts=[new T.Vector3(0,-0.16,0.05),new T.Vector3(-0.08,-0.32,0.08),new T.Vector3(0.06,-0.46,0.12),new T.Vector3(0.18,-0.48,0.04)];
  const strand=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(strandPts),18,0.012,6,false),mStd('#e82c2a',{roughness:0.9}));
  yarnGroup.add(strand);

  // 3. Plump fresh strawberry held in hand
  const berryGroup=new T.Group();berryGroup.visible=false;
  const bMat=mStd('#e62b30',{roughness:0.45}),sMat=mStd('#f7d648',{roughness:0.4}),lMat=mStd('#3ea845',{roughness:0.7});
  blob(berryGroup,SPH,bMat,0,0,0,0.095,0.115,0.095);
  blob(berryGroup,CONE,bMat,0,-0.04,0,0.085,0.12,0.085,false).rotation.x=Math.PI;
  for(let k=0;k<12;k++){
    const a=k*2.3,y=-0.05+(k%4)*0.032,r=0.085*(1-Math.abs(y)*3);
    blob(berryGroup,SPH,sMat,Math.cos(a)*r,y,Math.sin(a)*r,0.009,0.012,0.009,false);
  }
  for(let k=0;k<5;k++){
    const a=k*Math.PI*2/5;
    blob(berryGroup,SPH,lMat,Math.cos(a)*0.05,0.105,Math.sin(a)*0.05,0.05,0.015,0.025,false).rotation.y=-a;
  }
  blob(berryGroup,CYL,lMat,0,0.13,0,0.012,0.04,0.012,false);

  return {knitGroup,needleL,needleR,swatch,yarnGroup,berryGroup};
}

function buildLadyMoon(){
  const HIP=0.86,HEAD_S=0.58;
  const root=new T.Group(),bodyPivot=new T.Group();root.add(bodyPivot);
  const skinMat=new T.MeshStandardMaterial({color:'#f8c6a6',roughness:0.6});
  const noseMat=new T.MeshStandardMaterial({color:'#f08c64',roughness:0.55});
  const hairTex=makeBlueHairTexture();
  const hairBlueMat=new T.MeshStandardMaterial({color:'#ffffff',map:hairTex,bumpMap:hairTex,bumpScale:0.012,roughness:0.42,metalness:0.04,side:T.DoubleSide});
  const lockTex=hairTex.clone();lockTex.needsUpdate=true;lockTex.center.set(0.5,0.5);lockTex.rotation=Math.PI/2;lockTex.repeat.set(1,0.5);
  const hairLockMat=new T.MeshStandardMaterial({color:'#ffffff',map:lockTex,bumpMap:lockTex,bumpScale:0.01,roughness:0.42,metalness:0.04});
  const hairStreakMat=new T.MeshStandardMaterial({color:'#e84a27',roughness:0.48,side:T.DoubleSide});
  const onesieTex=createRainbowOnesieTexture();
  const limbTex=createRainbowLimbTexture(5);
  const shirtMat=new T.MeshStandardMaterial({map:onesieTex,roughness:0.8});
  const limbMat=new T.MeshStandardMaterial({map:limbTex,roughness:0.8});
  const shortsMat=new T.MeshStandardMaterial({map:limbTex,roughness:0.8});
  const shortsCuffMat=new T.MeshStandardMaterial({color:'#7a35c9',roughness:0.8});
  const shoeBlackMat=new T.MeshStandardMaterial({color:'#f7f7f4',roughness:0.55});
  const shoeWhiteMat=new T.MeshStandardMaterial({color:'#3d5278',roughness:0.6});
  const faceObj=createLadyMoonFaceTexture();
  const headMat=new T.MeshStandardMaterial({map:faceObj.tex,roughness:0.62});
  cacheFaceSwaps(faceObj,headMat,m=>(m===true||m==='blink')?'blink':(m==='happy'||m==='smile')?m:'open');

  // soft ground shadow disc
  const shCv=document.createElement('canvas');shCv.width=128;shCv.height=128;
  const shCtx=shCv.getContext('2d'),shGrd=shCtx.createRadialGradient(64,64,6,64,64,58);
  shGrd.addColorStop(0,'rgba(15,20,35,0.48)');shGrd.addColorStop(1,'rgba(15,20,35,0)');
  shCtx.fillStyle=shGrd;shCtx.fillRect(0,0,128,128);
  const shadowDisc=new T.Mesh(new T.PlaneGeometry(1.55,1.55),new T.MeshBasicMaterial({map:new T.CanvasTexture(shCv),transparent:true,depthWrite:false}));
  shadowDisc.rotation.x=-Math.PI/2;shadowDisc.position.y=0.03;root.add(shadowDisc);

  // Head
  const headGroup=new T.Group();headGroup.position.set(0,HIP+0.92,0);headGroup.scale.setScalar(HEAD_S);bodyPivot.add(headGroup);
  const headGeo=new T.SphereGeometry(0.49,36,28);headGeo.scale(0.98,0.96,1.08);headGeo.rotateY(-Math.PI/2); // after the turn: 0.529 wide, 0.48 deep
  const headMesh=new T.Mesh(headGeo,headMat);headMesh.castShadow=true;headGroup.add(headMesh);
  // Small triangular nose
  const noseGeo=new T.ConeGeometry(0.052,0.068,4);noseGeo.rotateY(Math.PI/4);
  const noseMesh=new T.Mesh(noseGeo,noseMat);noseMesh.scale.set(1.15,0.85,0.95);noseMesh.position.set(0,-0.012,0.482);noseMesh.rotation.x=0.35;headGroup.add(noseMesh);
  // Large rectangular glasses
  const glasses=buildLadyMoonGlasses();headGroup.add(glasses);
  // Cobalt-blue wavy hair + red-orange accent streak
  const hair=buildLadyMoonHair(hairBlueMat,hairStreakMat,hairLockMat);headGroup.add(hair.grp);
  // 3 Signature Crocheted Bucket Hats
  const hats={
    frog:buildCrochetBucketHat('frog'),
    strawberry:buildCrochetBucketHat('strawberry'),
    coral:buildCrochetBucketHat('coral')
  };
  // hats are sized to sit ON her hair (crown fits inside, brim rests just above the glasses), so the blue waves always show beneath
  for(const k in hats){hats[k].position.set(0,0.12,0.0);hats[k].scale.setScalar(1.15);hats[k].rotation.x=-0.06;}
  for(const k in hats)headGroup.add(hats[k]);

  // Neck & Rainbow Onesie Torso
  const neck=new T.Mesh(new T.CylinderGeometry(0.09,0.11,0.16,12),skinMat);neck.position.set(0,HIP+0.78,0);bodyPivot.add(neck);
  const shirtMesh=new T.Mesh(new T.CylinderGeometry(0.24,0.32,0.74,24),shirtMat);shirtMesh.scale.set(1.05,1.0,0.8);shirtMesh.position.set(0,HIP+0.38,0);shirtMesh.castShadow=true;bodyPivot.add(shirtMesh);
  const collar=new T.Mesh(new T.TorusGeometry(0.12,0.022,8,20),mStd('#e82c2a',{roughness:0.8}));collar.rotation.x=Math.PI/2;collar.position.set(0,HIP+0.76,0);bodyPivot.add(collar);

  // Full rainbow-striped long sleeves + round hands + crafter ring
  const ringMat=mStd('#f5c842',{metalness:0.7,roughness:0.25});
  function makeArm(side){
    const g=new T.Group();g.position.set(side*0.32,HIP+0.68,0);
    const sleeve=new T.Mesh(new T.CylinderGeometry(0.085,0.095,0.34,14),limbMat);sleeve.position.set(side*0.03,-0.16,0);sleeve.rotation.z=side*0.16;sleeve.castShadow=true;g.add(sleeve);
    const arm=new T.Mesh(new T.CylinderGeometry(0.07,0.062,0.42,14),limbMat);arm.position.set(side*0.07,-0.5,0);arm.rotation.z=side*0.08;arm.castShadow=true;g.add(arm);
    const cuff=new T.Mesh(new T.TorusGeometry(0.064,0.014,6,14),mStd('#e82c2a',{roughness:0.8}));cuff.position.set(side*0.09,-0.72,0);cuff.rotation.x=Math.PI/2;g.add(cuff);
    const hand=new T.Mesh(new T.SphereGeometry(0.08,14,12),skinMat);hand.position.set(side*0.1,-0.78,0.01);g.add(hand);
    const ring=new T.Mesh(new T.TorusGeometry(0.028,0.007,6,12),ringMat);ring.position.set(side*0.1,-0.8,0.07);g.add(ring);
    bodyPivot.add(g);return g;
  }
  const leftArm=makeArm(-1),rightArm=makeArm(1);

  // Crafting props attached to chest/hands
  const props=buildLadyMoonProps();
  props.knitGroup.position.set(0,0.52,0.36);bodyPivot.add(props.knitGroup);
  props.yarnGroup.position.set(0,0.62,0.38);bodyPivot.add(props.yarnGroup);
  props.berryGroup.position.set(-0.22,0.82,0.40);bodyPivot.add(props.berryGroup);

  // Pelvis & Rainbow-striped full-length legs + sneakers + barefoot option
  const pelvis=new T.Mesh(new T.CylinderGeometry(0.3,0.31,0.18,18),shortsMat);pelvis.scale.set(1.08,1,0.82);pelvis.position.set(0,HIP+0.02,0);bodyPivot.add(pelvis);
  function makeLeg(side){
    const g=new T.Group();g.position.set(side*0.13,HIP,0);
    const shortLeg=new T.Mesh(new T.CylinderGeometry(0.125,0.115,0.34,16),shortsMat);shortLeg.position.set(0,-0.16,0);shortLeg.castShadow=true;g.add(shortLeg);
    const pant=new T.Mesh(new T.CylinderGeometry(0.12,0.085,0.72,16),shortsMat);pant.position.set(0,-0.4,0);pant.castShadow=true;g.add(pant);
    const shoe=new T.Group();shoe.position.set(0,-0.8,0.05);
    const sole=new T.Mesh(new T.BoxGeometry(0.2,0.04,0.33),shoeWhiteMat);sole.position.set(0,-0.04,0.02);shoe.add(sole);
    const upper=new T.Mesh(new T.BoxGeometry(0.172,0.082,0.17),shoeBlackMat);upper.position.set(0,0.018,-0.025);shoe.add(upper);
    const toe=new T.Mesh(new T.SphereGeometry(0.09,14,10),shoeWhiteMat);toe.scale.set(1.02,0.46,0.7);toe.position.set(0,-0.012,0.128);shoe.add(toe);
    const heel=new T.Mesh(new T.BoxGeometry(0.174,0.06,0.048),shoeWhiteMat);heel.position.set(0,0.03,-0.108);shoe.add(heel);
    for(let k=0;k<3;k++){const lace=new T.Mesh(new T.BoxGeometry(0.1,0.012,0.015),shoeBlackMat);lace.position.set(0,0.068,-0.01+k*0.028);shoe.add(lace);}
    g.add(shoe);
    // Barefoot mesh for cross-legged knitting pose
    const bareFoot=new T.Group();bareFoot.position.set(0,-0.78,0.06);bareFoot.visible=false;
    blob(bareFoot,SPH,skinMat,0,0,0,0.085,0.055,0.13,false);
    for(let t=-2;t<=2;t++)blob(bareFoot,SPH,skinMat,t*0.026,-0.01,0.12,0.016,0.016,0.02,false);
    g.add(bareFoot);
    bodyPivot.add(g);return {leg:g,shoe,bareFoot,shortLeg,pant};
  }
  const leftLeg=makeLeg(-1),rightLeg=makeLeg(1);
  bodyPivot.scale.setScalar(1);
  root.rotation.order='YXZ';
  root.userData.noWx=true;
  scene.add(root);

  return {
    root,bodyPivot,headGroup,leftArm,rightArm,leftLeg,rightLeg,shadowDisc,faceObj,HIP,
    hair,hats,glasses,props,onesieTex,limbTex,nose:noseMesh,
    mats:{shirtMat,limbMat,shortsMat,shortsCuffMat,shoeBlackMat,shoeWhiteMat,skinMat}
  };
}

const ladyMoon = buildLadyMoon();
const MOON_HATS = [
  {id:'frog',name:'Frog Bucket Hat',icon:'🐸'},
  {id:'strawberry',name:'Strawberry Hat',icon:'🍓'},
  {id:'coral',name:'Coral Bucket Hat',icon:'🧶'},
  {id:'none',name:'No hat',icon:'💙'}
];
const MOON_STYLE = {hat:'strawberry',outfit:'rainbow',mask:'none',userLockedHat:false};
try{
  const ms=JSON.parse(localStorage.getItem('ladymoon-closet-v2')||'null');
  if(ms){if(ms.hat)MOON_STYLE.hat=ms.hat;if(ms.outfit)MOON_STYLE.outfit=ms.outfit;if(ms.mask)MOON_STYLE.mask=ms.mask;if(ms.userLockedHat)MOON_STYLE.userLockedHat=true;}
}catch(e){}

function applyLadyMoonCloset(fromUser){
  const M=ladyMoon.mats,H=ladyMoon.hats,hr=ladyMoon.hair;
  if(!(MOON_STYLE.hat in H))MOON_STYLE.hat='none';
  for(const k in H)H[k].visible=(k===MOON_STYLE.hat);
  const hasHat=MOON_STYLE.hat!=='none';
  // her blue hair always stays on: with or without a hat
  if(hr.fullMesh) hr.fullMesh.visible=true;
  if(hr.streakMesh) hr.streakMesh.visible=true;
  // anything she doesn't own (or that no longer exists) falls back to her signature look
  const okOutfit=MOON_STYLE.outfit==='rainbow'||(typeof OUTFITS!=='undefined'&&OUTFITS.some(o=>o.id===MOON_STYLE.outfit&&!o.hidden&&(!o.price||owns(o.id))));
  if(!okOutfit)MOON_STYLE.outfit='rainbow';
  const okMask=MOON_STYLE.mask==='none'||(typeof MASKS!=='undefined'&&MASKS.some(m=>m.id===MOON_STYLE.mask&&(!m.price||owns(m.id))));
  if(!okMask)MOON_STYLE.mask='none';
  const legs=[ladyMoon.leftLeg,ladyMoon.rightLeg];
  let o=null;
  if(MOON_STYLE.outfit==='rainbow'){
    M.shirtMat.map=ladyMoon.onesieTex;M.shirtMat.color.set('#ffffff');M.shirtMat.needsUpdate=true;
    M.limbMat.map=ladyMoon.limbTex;M.limbMat.color.set('#ffffff');M.limbMat.needsUpdate=true;
    M.shortsMat.map=ladyMoon.limbTex;M.shortsMat.color.set('#ffffff');M.shortsMat.needsUpdate=true;
    M.shoeBlackMat.color.set('#f7f7f4');M.shoeWhiteMat.color.set('#3d5278');
    for(const L of legs){L.shortLeg.material=M.shortsMat;L.pant.material=M.shortsMat;}
  }else{
    o=OUTFITS.find(x=>x.id===MOON_STYLE.outfit);
    M.shirtMat.map=shirtTexture(o);M.shirtMat.color.set('#ffffff');M.shirtMat.needsUpdate=true;
    M.limbMat.map=null;M.limbMat.color.set(o.bg||'#f8c6a6');M.limbMat.needsUpdate=true;
    M.shortsMat.map=null;M.shortsMat.color.set(o.bcol||'#283d6e');M.shortsMat.needsUpdate=true;
    M.shoeBlackMat.color.set(o.shoe[0]);M.shoeWhiteMat.color.set(o.shoe[1]);
    // same bottoms as Luna: pants, shorts (bare shins) or a skirt
    for(const L of legs){L.shortLeg.material=o.bottom==='skirt'?M.skinMat:M.shortsMat;L.pant.material=o.bottom==='pants'?M.shortsMat:M.skinMat;}
  }
  if(typeof MOON_WARDROBE!=='undefined'){
    const W=MOON_WARDROBE,masked=MOON_STYLE.mask!=='none';
    W.skirt.visible=!!o&&o.bottom==='skirt';
    // outfit accessories; a crochet hat replaces caps, beanies and bows, and a mask covers head accessories (like Luna)
    for(const k in W.ACC){const head=k!=='bandana';W.ACC[k].visible=!!o&&o.acc===k&&!(head&&(hasHat||masked));}
    if(o&&o.accCol)W.accMat.color.set(o.accCol);
    for(const k in W.maskGroups){const g=W.maskGroups[k];g.visible=k===MOON_STYLE.mask;if(g.userData.ears)g.userData.ears.visible=!hasHat;}
    if(ladyMoon.nose)ladyMoon.nose.visible=!masked;
    // her glasses stay on, resting on top of a mask
    ladyMoon.glasses.position.z=masked?0.075:0;
  }
  if(fromUser){
    LM.twirlT=0.95;
    emote(ladyMoon.headGroup,'sparkle',0.95);
    try{localStorage.setItem('ladymoon-closet-v2',JSON.stringify(MOON_STYLE));}catch(e){}
  }
}
setTimeout(()=>applyLadyMoonCloset(false),0);

/* ================= Solon: island fixer, dog coach, third chibi =================
   Same build as Luna and Lady Moon (head shell, hair, face canvas, limbs) with his own look:
   green frog beanie, black glasses, green controller tee, navy shorts, green sneakers. */
function createSolonShirtTexture(){
  const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
  c.fillStyle='#3cb44a';c.fillRect(0,0,S,S);
  c.fillStyle='rgba(255,255,255,0.06)';for(let y=0;y<S;y+=5)c.fillRect(0,y,S,2);
  c.fillStyle='rgba(0,0,0,0.05)';for(let y=3;y<S;y+=5)c.fillRect(0,y,S,1);
  // game pad on his left chest. Cylinder u=0 is the front (+Z); +u runs toward +X, his left, the viewer's right.
  c.save();c.translate(58,148);
  c.fillStyle='#f7f8fb';c.strokeStyle='#1c2430';c.lineWidth=8;c.lineJoin='round';
  if(c.roundRect){c.beginPath();c.roundRect(-36,-24,86,50,16);c.fill();c.stroke();}
  else{c.fillRect(-36,-24,86,50);c.strokeRect(-36,-24,86,50);}
  c.fillStyle='#243044';c.fillRect(-24,-5,20,10);c.fillRect(-19,-14,10,28);
  for(const[dx,dy]of[[18,-10],[30,0],[18,10],[8,0]]){c.beginPath();c.arc(dx,dy,5.2,0,6.2832);c.fill();}
  c.restore();
  const t=new T.CanvasTexture(cv);t.anisotropy=4;t.wrapS=T.ClampToEdgeWrapping;t.wrapT=T.ClampToEdgeWrapping;return t;
}
function createSolonFaceTexture(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=512;const ctx=cv.getContext('2d');const tex=new T.CanvasTexture(cv);
  const SKIN='#f6c3a2';
  const ell=(x,y,rx,ry)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  function drawFace(mode){
    const blink=(mode===true||mode==='blink'),happy=(mode==='happy'),wink=(mode==='wink');
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=SKIN;ctx.fillRect(0,0,512,512);
    ctx.setTransform(1,0,0,2,0,-256);
    for(const sx of[-1,1]){const cx=256+sx*66,cy=274,grd=ctx.createRadialGradient(cx,cy,2,cx,cy,26);
      grd.addColorStop(0,'rgba(240,120,100,0.32)');grd.addColorStop(1,'rgba(240,120,100,0)');ctx.fillStyle=grd;ell(cx,cy,26,24);}
    ctx.fillStyle='#c47852';
    for(const sx of[-1,1])for(const[fx,fy,r]of[[42,268,2.5],[52,264,2.7],[62,270,2.4],[47,276,2.5],[58,278,2.3],[68,273,2.4]])ell(256+sx*fx,fy,r,r);
    for(const[nx,ny]of[[-8,262],[0,260],[9,263],[-4,266],[5,267]])ell(256+nx,ny,1.9,1.9);
    ctx.strokeStyle='#5c3a28';ctx.lineWidth=4.2;ctx.lineCap='round';
    for(const sx of[-1,1]){const ex=256+sx*52;ctx.beginPath();ctx.moveTo(ex-sx*16,220);ctx.quadraticCurveTo(ex,214,ex+sx*18,220);ctx.stroke();}
    for(const sx of[-1,1]){
      const ex=256+sx*52,ey=246,shut=blink||(wink&&sx>0)||happy;
      if(shut){
        ctx.strokeStyle='#241c18';ctx.lineWidth=4.2;
        ctx.beginPath();ctx.ellipse(ex,ey+(happy?-2:4),20,happy?12:10,0,happy?1.12*Math.PI:0.12*Math.PI,happy?1.88*Math.PI:0.88*Math.PI);ctx.stroke();
      }else{
        ctx.fillStyle='#ffffff';ell(ex,ey,22,25);
        ctx.fillStyle='#5c4638';ell(ex,ey+1.5,17.5,21);
        ctx.fillStyle='#241c18';ell(ex,ey+2.5,10.5,12.5);
        ctx.fillStyle='#ffffff';ell(ex-sx*6,ey-8,5,5.2);ell(ex+sx*4,ey+9,2,2);
        ctx.strokeStyle='#241c18';ctx.lineWidth=3.8;ctx.beginPath();ctx.ellipse(ex,ey,22.4,25.4,0,Math.PI*1.08,Math.PI*1.92);ctx.stroke();
      }
    }
    const mY=276;
    if(happy){
      const mW=24,mH=16;
      ctx.beginPath();ctx.moveTo(256-mW,mY);ctx.quadraticCurveTo(256,mY+3,256+mW,mY);ctx.quadraticCurveTo(256+mW*0.55,mY+mH,256,mY+mH);ctx.quadraticCurveTo(256-mW*0.55,mY+mH,256-mW,mY);ctx.closePath();
      ctx.fillStyle='#6a241e';ctx.fill();ctx.save();ctx.clip();ctx.fillStyle='#e07068';ell(256,mY+mH,12,6);ctx.fillStyle='#fff';ctx.fillRect(244,mY,24,5);ctx.restore();
    }else{
      ctx.strokeStyle='#5a241c';ctx.lineWidth=3.4;ctx.beginPath();ctx.arc(256,mY-4,16,0.15*Math.PI,0.85*Math.PI);ctx.stroke();
    }
    ctx.setTransform(1,0,0,1,0,0);tex.needsUpdate=true;
  }
  drawFace('open');return {tex,drawFace};
}
function buildSolonGlasses(){
  const g=new T.Group();
  const frame=new T.MeshStandardMaterial({color:'#16181c',roughness:0.32,metalness:0.18});
  const lens=new T.MeshStandardMaterial({color:'#e9f4ff',transparent:true,opacity:0.13,roughness:0.06,metalness:0.2});
  for(const sx of[-1,1]){
    const rim=new T.Group();rim.position.set(sx*0.198,0.012,0.5);rim.rotation.y=sx*0.1;g.add(rim);
    blob(rim,BOX,frame,0,0.098,0,0.26,0.034,0.03,false);
    blob(rim,BOX,frame,0,-0.098,0,0.26,0.032,0.03,false);
    blob(rim,BOX,frame,-0.122,0,0,0.034,0.2,0.03,false);
    blob(rim,BOX,frame,0.122,0,0,0.034,0.2,0.03,false);
    blob(rim,BOX,lens,0,0,0.004,0.21,0.16,0.01,false);
    const temple=blob(g,BOX,frame,sx*0.46,0.02,0.18,0.026,0.028,0.5,false);temple.rotation.y=-sx*0.16;
  }
  blob(g,BOX,frame,0,0.018,0.515,0.11,0.03,0.028,false);
  return g;
}
function buildPomBeanie(){
  // knit cap with two round pom-poms, matching Solon's still (not a frog face)
  const g=new T.Group();
  const col='#6fbf55';
  const hatMat=new T.MeshStandardMaterial({color:col,map:CROCHET_TEX,bumpMap:CROCHET_TEX,bumpScale:0.05,roughness:0.96,side:T.DoubleSide});
  const geo=gridGeo(48,18,(u,v)=>{
    const a=u*Math.PI*2,p=v*Math.PI*0.48;
    let r=Math.sin(p)*0.52,y=Math.cos(p)*0.42+0.02;
    if(v>0.82){const k=(v-0.82)/0.18;r=0.5+k*0.06;y=0.08-k*0.06;}
    return [Math.cos(a)*r,y,Math.sin(a)*r];
  },true);
  const dome=new T.Mesh(geo,hatMat);dome.castShadow=true;dome.receiveShadow=true;g.add(dome);
  const rib=new T.Mesh(new T.TorusGeometry(0.5,0.045,8,24),hatMat);rib.rotation.x=Math.PI/2;rib.position.y=0.02;g.add(rib);
  for(const sx of[-1,1]){
    const pom=new T.Mesh(new T.SphereGeometry(0.13,16,12),hatMat);pom.position.set(sx*0.16,0.46,0.02);pom.castShadow=true;g.add(pom);
  }
  return g;
}
function buildSolon(){
  const HIP=0.86,HEAD_S=0.58;
  const root=new T.Group(),bodyPivot=new T.Group();root.add(bodyPivot);
  const skinMat=new T.MeshStandardMaterial({color:'#f6c3a2',roughness:0.6});
  const hairTex=makeChestnutHairTexture();
  const hairMat=new T.MeshStandardMaterial({color:'#ffffff',map:hairTex,bumpMap:hairTex,bumpScale:0.008,roughness:0.5,side:T.DoubleSide});
  const noseMat=new T.MeshStandardMaterial({color:'#f09a74',roughness:0.55});
  const shirtTex=createSolonShirtTexture();
  const shirtMat=new T.MeshStandardMaterial({map:shirtTex,roughness:0.78});
  const shortsMat=new T.MeshStandardMaterial({color:'#2a3f78',roughness:0.8,map:TEX.fabric});
  const shortsCuffMat=new T.MeshStandardMaterial({color:'#223668',roughness:0.8,map:TEX.fabric});
  const shoeGreen=new T.MeshStandardMaterial({color:'#3cb44a',roughness:0.55});
  const shoeWhite=new T.MeshStandardMaterial({color:'#f4f4f2',roughness:0.5});
  const faceObj=createSolonFaceTexture();
  const headMat=new T.MeshStandardMaterial({map:faceObj.tex,roughness:0.62});
  cacheFaceSwaps(faceObj,headMat,m=>(m===true||m==='blink')?'blink':(m==='happy'||m==='wink')?m:'open');
  const shCv=document.createElement('canvas');shCv.width=shCv.height=128;const sh=shCv.getContext('2d'),sg=sh.createRadialGradient(64,64,6,64,64,58);
  sg.addColorStop(0,'rgba(15,20,35,0.48)');sg.addColorStop(1,'rgba(15,20,35,0)');sh.fillStyle=sg;sh.fillRect(0,0,128,128);
  const shadowDisc=new T.Mesh(new T.PlaneGeometry(1.55,1.55),new T.MeshBasicMaterial({map:new T.CanvasTexture(shCv),transparent:true,depthWrite:false}));
  shadowDisc.rotation.x=-Math.PI/2;shadowDisc.position.y=0.03;root.add(shadowDisc);
  const headGroup=new T.Group();headGroup.position.set(0,HIP+0.92,0);headGroup.scale.setScalar(HEAD_S);bodyPivot.add(headGroup);
  const headGeo=new T.SphereGeometry(0.5,36,28);headGeo.scale(1.0,0.96,1.08);headGeo.rotateY(-Math.PI/2);
  const headMesh=new T.Mesh(headGeo,headMat);headMesh.castShadow=true;headGroup.add(headMesh);
  const nose=new T.Mesh(new T.SphereGeometry(0.048,12,10),noseMat);nose.scale.set(1.2,0.75,0.85);nose.position.set(0,-0.02,0.49);headGroup.add(nose);
  const glasses=buildSolonGlasses();headGroup.add(glasses);
  const hair=buildHair(hairMat,HAIR_SOLON);headGroup.add(hair);
  const beanie=buildPomBeanie();beanie.position.set(0,0.28,0);beanie.scale.setScalar(1.02);headGroup.add(beanie);
  const neck=new T.Mesh(new T.CylinderGeometry(0.09,0.11,0.16,12),skinMat);neck.position.set(0,HIP+0.78,0);bodyPivot.add(neck);
  const shirtMesh=new T.Mesh(new T.CylinderGeometry(0.25,0.33,0.72,24),shirtMat);shirtMesh.scale.set(1.08,1,0.8);shirtMesh.position.set(0,HIP+0.38,0);shirtMesh.castShadow=true;bodyPivot.add(shirtMesh);
  const collar=new T.Mesh(new T.TorusGeometry(0.12,0.018,8,20),shirtMat);collar.rotation.x=Math.PI/2;collar.position.set(0,HIP+0.75,0);bodyPivot.add(collar);
  function makeArm(side){
    const g=new T.Group();g.position.set(side*0.32,HIP+0.68,0);
    const sleeve=new T.Mesh(new T.CylinderGeometry(0.09,0.11,0.22,14),shirtMat);sleeve.position.set(side*0.03,-0.08,0);sleeve.rotation.z=side*0.22;g.add(sleeve);
    const arm=new T.Mesh(new T.CylinderGeometry(0.055,0.048,0.5,12),skinMat);arm.position.set(side*0.08,-0.4,0);arm.rotation.z=side*0.1;g.add(arm);
    const hand=new T.Mesh(new T.SphereGeometry(0.082,14,12),skinMat);hand.position.set(side*0.12,-0.7,0.01);g.add(hand);
    bodyPivot.add(g);return g;
  }
  const leftArm=makeArm(-1),rightArm=makeArm(1);
  const pelvis=new T.Mesh(new T.CylinderGeometry(0.3,0.32,0.16,18),shortsMat);pelvis.scale.set(1.1,1,0.82);pelvis.position.set(0,HIP+0.02,0);bodyPivot.add(pelvis);
  function makeLeg(side){
    const g=new T.Group();g.position.set(side*0.13,HIP,0);
    const shortLeg=new T.Mesh(new T.CylinderGeometry(0.13,0.135,0.32,16),shortsMat);shortLeg.position.set(0,-0.14,0);g.add(shortLeg);
    const cuff=new T.Mesh(new T.CylinderGeometry(0.142,0.142,0.055,16),shortsCuffMat);cuff.position.set(0,-0.32,0);g.add(cuff);
    const calf=new T.Mesh(new T.CylinderGeometry(0.06,0.052,0.46,12),skinMat);calf.position.set(0,-0.54,0);g.add(calf);
    const pant=new T.Mesh(new T.CylinderGeometry(0.13,0.09,0.7,14),shortsMat);pant.position.set(0,-0.38,0);pant.visible=false;pant.castShadow=true;g.add(pant);
    const shoe=new T.Group();shoe.position.set(0,-0.8,0.05);
    const sole=new T.Mesh(new T.BoxGeometry(0.2,0.04,0.32),shoeWhite);sole.position.set(0,-0.04,0.02);shoe.add(sole);
    const upper=new T.Mesh(new T.BoxGeometry(0.17,0.08,0.16),shoeGreen);upper.position.set(0,0.016,-0.02);shoe.add(upper);
    const toe=new T.Mesh(new T.SphereGeometry(0.088,14,10),shoeWhite);toe.scale.set(1.02,0.46,0.7);toe.position.set(0,-0.012,0.125);shoe.add(toe);
    for(let k=0;k<3;k++){const lace=new T.Mesh(new T.BoxGeometry(0.1,0.012,0.014),shoeWhite);lace.position.set(0,0.064,-0.005+k*0.026);shoe.add(lace);}
    g.add(shoe);bodyPivot.add(g);return {leg:g,shoe,shortLeg,cuff,pant};
  }
  const leftLeg=makeLeg(-1),rightLeg=makeLeg(1);
  bodyPivot.scale.setScalar(1);root.rotation.order='YXZ';root.userData.noWx=true;scene.add(root);
  return {root,bodyPivot,headGroup,leftArm,rightArm,leftLeg,rightLeg,shadowDisc,faceObj,HIP,glasses,beanie,hair,nose,
    signatureShirt:shirtMat.map,
    mats:{shirtMat,shortsMat,shortsCuffMat,skinMat,shoeGreen,shoeWhite}};
}
const solon=buildSolon();
const SOLON_STYLE={hat:true,outfit:'solon',mask:'none'};
try{const ss=JSON.parse(localStorage.getItem('solon-closet-v2')||'null');if(ss){if(ss.hat===false)SOLON_STYLE.hat=false;if(ss.outfit)SOLON_STYLE.outfit=ss.outfit;if(ss.mask)SOLON_STYLE.mask=ss.mask;}}catch(e){}
function applySolonCloset(fromUser){
  const M=solon.mats,W=solon.wardrobe;
  const known=typeof OUTFITS!=='undefined'&&OUTFITS.some(o=>o.id===SOLON_STYLE.outfit&&!o.hidden&&(!o.price||owns(o.id)));
  if(SOLON_STYLE.outfit!=='solon'&&!known)SOLON_STYLE.outfit='solon';
  const sig=SOLON_STYLE.outfit==='solon';
  const o=sig?null:OUTFITS.find(x=>x.id===SOLON_STYLE.outfit);
  const masked=SOLON_STYLE.mask!=='none'&&!!W;
  if(sig||!W){
    M.shirtMat.map=solon.signatureShirt;M.shirtMat.color.set('#ffffff');M.shirtMat.needsUpdate=true;
    M.shortsMat.map=TEX.fabric;M.shortsMat.color.set('#2a3f78');M.shortsMat.needsUpdate=true;
    M.shortsCuffMat.color.set('#223668');
    M.shoeGreen.color.set('#3cb44a');M.shoeWhite.color.set('#f4f4f2');
    for(const L of[solon.leftLeg,solon.rightLeg]){L.shortLeg.visible=true;L.cuff.visible=true;if(L.pant)L.pant.visible=false;}
    if(W){W.skirt.visible=false;for(const k in W.ACC)W.ACC[k].visible=false;for(const k in W.maskGroups)W.maskGroups[k].visible=masked&&k===SOLON_STYLE.mask;}
    solon.glasses.visible=!masked;solon.nose.visible=!masked;
  }else{
    M.shirtMat.map=shirtTexture(o);M.shirtMat.color.set('#ffffff');M.shirtMat.needsUpdate=true;
    M.shortsMat.map=null;M.shortsMat.color.set(o.bcol||'#2a3f78');M.shortsMat.needsUpdate=true;
    M.shortsCuffMat.color.set(o.bcol||'#223668');
    M.shoeGreen.color.set(o.shoe[0]);M.shoeWhite.color.set(o.shoe[1]);
    for(const L of[solon.leftLeg,solon.rightLeg]){L.shortLeg.visible=o.bottom!=='skirt';L.cuff.visible=o.bottom==='shorts';if(L.pant)L.pant.visible=o.bottom==='pants';if(L.pant)L.pant.material=M.shortsMat;L.shortLeg.material=M.shortsMat;}
    W.skirt.visible=o.bottom==='skirt';
    for(const k in W.ACC)W.ACC[k].visible=o.acc===k&&!(masked&&k!=='bandana');
    if(o.accCol)W.accMat.color.set(o.accCol);
    for(const k in W.maskGroups)W.maskGroups[k].visible=k===SOLON_STYLE.mask;
    solon.glasses.visible=!masked;solon.nose.visible=!masked;
  }
  solon.beanie.visible=SOLON_STYLE.hat!==false&&(sig||!(o&&(o.acc==='beanie'||o.acc==='cap')));
  solon.hair.visible=true;
  if(fromUser){SL.twirlT=0.7;emote(solon.headGroup,'sparkle',0.9);try{localStorage.setItem('solon-closet-v2',JSON.stringify(SOLON_STYLE));}catch(e){}}
}
const _solSpawn=snapWalkable(-18.2,25.8);
const SL={
  x:_solSpawn[0],z:_solSpawn[1],y:0,yaw:-0.4,pitch:0,speed:0,walkSpeed:3.05,
  state:'idle',act:null,timer:1.4,actT:0,actDur:3,
  path:[],wp:0,walkPhase:0,blinkTimer:2.1,isBlinking:false,faceMode:'open',
  sitK:0,squatK:0,jumpT:0,twirlT:0,emoteT:0,spot:null,inside:false,ix:1.5,iz:1.4,
  stuckT:0,stuckN:0,checkX:_solSpawn[0],checkZ:_solSpawn[1],mAct:null,broom:null
};
SL.y=walkHeight(SL.x,SL.z);solon.root.position.set(SL.x,SL.y,SL.z);

function poseSolon(dt,time){
  const M=solon,acting=SL.state==='act',act=acting?SL.act:null;
  const sitting=act==='sit',squatting=act==='feed'||act==='train';
  SL.sitK=lerp(SL.sitK,sitting?1:0,Math.min(1,dt*5));
  SL.squatK=lerp(SL.squatK,squatting?1:0,Math.min(1,dt*6));
  SL.twirlT=Math.max(0,SL.twirlT-dt);
  const tw=SL.twirlT>0?smooth(0,1,1-SL.twirlT/0.7)*Math.PI*2:0;
  let hop=0;
  if(act==='cheer')hop=Math.abs(Math.sin(time*6.2))*0.28;
  if(SL.jumpT>0)hop+=Math.sin((1-SL.jumpT/0.62)*Math.PI)*0.72;
  const gy=SL.inside?0:walkHeight(SL.x,SL.z);
  SL.y=lerp(SL.y,gy,Math.min(1,dt*22));
  M.root.position.set(SL.x,SL.y-SL.sitK*0.7-SL.squatK*0.28+hop,SL.z);
  M.root.rotation.y=SL.yaw+tw;
  const mv=clamp(SL.speed/3.3,0,1),running=SL.speed>3.3;
  if(mv>0.03)SL.walkPhase+=dt*SL.speed*(running?4.1:3.6);
  const s=Math.sin(SL.walkPhase),c=Math.cos(SL.walkPhase),H=M.HIP;
  let lLegX=s*(running?0.8:0.6)*mv,rLegX=-s*(running?0.8:0.6)*mv;
  let lLegZ=0,rLegZ=0,lLegY=H+Math.max(0,-c)*0.1*mv,rLegY=H+Math.max(0,c)*0.1*mv;
  const walkLX=lLegX,walkRX=rLegX;
  if(SL.sitK>0.05){lLegX=lerp(lLegX,-1.25,SL.sitK);rLegX=lerp(rLegX,-1.25,SL.sitK);lLegZ=lerp(0,0.35,SL.sitK);rLegZ=lerp(0,-0.35,SL.sitK);}
  if(SL.squatK>0.05){lLegX=lerp(lLegX,-0.95,SL.squatK);rLegX=lerp(rLegX,-0.95,SL.squatK);}
  if(act==='cheer'){lLegX=-0.15;rLegX=-0.7-Math.abs(Math.sin(time*6.2))*0.3;}
  M.leftLeg.leg.rotation.set(lLegX,0,lLegZ);M.rightLeg.leg.rotation.set(rLegX,0,rLegZ);
  {const w=(lLegX===walkLX&&rLegX===walkRX)?1:0;
    M.leftLeg.shoe.rotation.x=w*(-walkLX*0.75-(lLegY-H)*1.4);M.rightLeg.shoe.rotation.x=w*(-walkRX*0.75-(rLegY-H)*1.4);}
  M.leftLeg.leg.position.y=lLegY;M.rightLeg.leg.position.y=rLegY;
  M.bodyPivot.position.y=Math.abs(s)*(running?0.07:0.05)*mv;
  M.bodyPivot.rotation.z=s*0.045*mv;
  let lean=(running?0.14:0.05)*mv+0.26*SL.squatK;
  let lX=-s*(running?0.65:0.46)*mv,rX=s*(running?0.65:0.46)*mv,lZ=0,rZ=0;
  if(M.broom)M.broom.visible=acting&&act==='sweep';
  if(acting){
    switch(act){
      case 'wave':rZ=2.35+Math.sin(time*8)*0.3;lZ=-0.15;lX=-0.15;break;
      case 'cheer':lZ=-2.5-Math.sin(time*8)*0.15;rZ=2.5+Math.sin(time*8)*0.15;lX=-0.2;rX=-0.2;lean=-0.06;break;
      case 'hips':lZ=-0.42;rZ=0.42;lX=0.35;rX=0.35;lean=0.04;break;
      case 'scout':rX=-0.35;rZ=1.7;lZ=-0.2;lean=-0.02;break;
      case 'train':rX=-1.35+Math.sin(time*3)*0.08;rZ=-0.15;lZ=-0.7;lX=-0.2;lean=0.12;break;
      case 'feed':lX=-1.05;rX=-1.05+Math.sin(time*4)*0.12;lZ=0.15;rZ=-0.15;break;
      case 'sweep':{const sw=Math.sin(time*4.2);rX=-0.6+sw*0.08;lX=-0.8;rZ=-0.05+sw*0.28;lZ=0.2+sw*0.28;lean=0.16;break;}
      case 'chat':rZ=0.55+Math.max(0,Math.sin(time*2.5))*0.55;rX=-0.45;lZ=-0.55;lX=-0.2;break;
      case 'stretch':lZ=-2.6;rZ=2.6;lean=-0.08;break;
      case 'herd':rZ=0.4+Math.sin(time*3)*0.4;rX=-0.4;lX=-0.2;break;
      case 'sit':lX=-0.45;rX=-0.45;lZ=-0.2;rZ=0.2;lean=0.08;break;
    }
  }
  const ak=Math.min(1,dt*10);
  M.bodyPivot.rotation.x=lerp(M.bodyPivot.rotation.x,lean,ak);
  M.leftArm.rotation.x=lerp(M.leftArm.rotation.x,lX,ak);M.rightArm.rotation.x=lerp(M.rightArm.rotation.x,rX,ak);
  M.leftArm.rotation.z=lerp(M.leftArm.rotation.z,lZ,ak);M.rightArm.rotation.z=lerp(M.rightArm.rotation.z,rZ,ak);
  let hy=Math.sin(time*0.8)*0.12,hp=act==='scout'?-0.25:act==='feed'||act==='train'?0.28:0,hz=act==='hips'?0.06:0;
  const nearL=Math.hypot(AI.x-SL.x,AI.z-SL.z),nearM=LM.inside?99:Math.hypot(LM.x-SL.x,LM.z-SL.z);
  if(act!=='scout'&&act!=='sit'&&nearL<5)hy=clamp(normalizeAngle(Math.atan2(AI.x-SL.x,AI.z-SL.z)-SL.yaw),-0.9,0.9);
  else if(act!=='scout'&&nearM<5)hy=clamp(normalizeAngle(Math.atan2(LM.x-SL.x,LM.z-SL.z)-SL.yaw),-0.9,0.9);
  M.headGroup.rotation.y=lerp(M.headGroup.rotation.y,hy,Math.min(1,dt*6));
  M.headGroup.rotation.x=lerp(M.headGroup.rotation.x,hp,Math.min(1,dt*6));
  M.headGroup.rotation.z=lerp(M.headGroup.rotation.z,hz,Math.min(1,dt*6));
}

/* Lady Moon's Crafter AI Brain */
const LM = {
  x:16.5,z:7.2,y:0,yaw:0.4,pitch:0,speed:0,walkSpeed:2.95,
  state:'act',act:'wave',timer:4.0,actT:0,actDur:4.0,
  path:[],wp:0,walkPhase:0,blinkTimer:1.9,isBlinking:false,faceMode:'open',
  sitK:0,squatK:0,jumpK:0,twirlT:0,emoteT:0,hatSwapT:75,
  spot:null,petTarget:null,inside:false,ix:-1.6,iz:2.2,ipath:[]
};
LM.y = walkHeight(LM.x,LM.z);
ladyMoon.root.position.set(LM.x,LM.y,LM.z);

const MOON_SPOTS = [
  {x:17.2,z:6.8,look:[20,14],acts:['knitSit','yarnBall','cheer','wave']},
  {x:-2.8,z:14.2,look:[-12,8],acts:['knitSit','strawberry','dance','knitSquat']},
  {x:32.2,z:11.8,look:[38,12],acts:['strawberry','knitSquat','yarnBall','cheer']},
  {x:32.5,z:-9.5,look:[38,-10],acts:['strawberry','knitSit','dance']},
  {x:-29.5,z:6.2,look:[-38,6],acts:['knitSit','yarnBall','dance']},
  {x:10.2,z:-8.5,look:[10,-20],acts:['wave','cheer','knitSquat']},
  {x:24.0,z:zE+13.5,look:[24,zE+30],acts:['knitSit','wave','dance']},
  {x:-23.5,z:29.5,look:[-31,32],acts:['knitSquat','cheer','yarnBall']},
  {x:ISLE2.x-1.5,z:ISLE2.z+2.2,look:[ISLE2.x+10,ISLE2.z+5],acts:['knitSit','cheer','dance','strawberry']}
];

function chooseLadyMoonPlan(){
  // Occasionally swap her crocheted bucket hat if not locked by the player
  if(!MOON_STYLE.userLockedHat&&LM.hatSwapT<=0){
    LM.hatSwapT=rnd(65,120);
    const hats=['frog','strawberry','coral','none'];
    MOON_STYLE.hat=hats[(hats.indexOf(MOON_STYLE.hat)+1)%hats.length];
    applyLadyMoonCloset(false);
    emote(ladyMoon.headGroup,'sparkle',0.95,1.6,0.55);
  }
  const r=Math.random();
  // 28% chance: walk over to Luna to hang out, wave, or knit beside her
  if(r<0.28&&Math.hypot(AI.x-LM.x,AI.z-LM.z)<42){
    const[tx,tz]=randomSpotNear(AI.x,AI.z,2.8,1.5);
    LM.spot={x:tx,z:tz,look:[AI.x,AI.z],act:pick(['wave','knitSit','cheer','dance','yarnBall'])};
  }
  // 22% chance: visit a pet to cuddle or squat-knit beside them
  else if(r<0.50){
    const pets=ALL_ANIMALS.filter(e=>!e.inside&&Math.hypot(e.x-LM.x,e.z-LM.z)<35);
    const p=pets.length?pick(pets):null;
    if(p){
      const[tx,tz]=randomSpotNear(p.x,p.z,1.8,1.0);
      LM.spot={x:tx,z:tz,look:[p.x,p.z],pet:p,act:Math.random()<0.55?'pet':'knitSquat'};
    }
  }
  if(!LM.spot){
    const sp=pick(MOON_SPOTS);
    const[tx,tz]=snapWalkable(sp.x+rnd(-1.2,1.2),sp.z+rnd(-1.2,1.2));
    LM.spot={x:tx,z:tz,look:sp.look,act:pick(sp.acts)};
  }
  LM.walkSpeed=Math.random()<0.38?3.55:2.85; // energetic skip-run vs bouncy walk
  LM.path=planPath(LM.x,LM.z,LM.spot.x,LM.spot.z);
  LM.wp=0;
  LM.state='walk';
  LM.timer=28;
}

function beginLadyMoonAct(actName){
  LM.state='act';
  LM.act=actName||(LM.spot&&LM.spot.act)||'knitSit';
  LM.actT=0;
  const durs={knitSit:[9,14],knitSquat:[7,11],yarnBall:[5,8],strawberry:[5,7.5],cheer:[3.6,5],dance:[4.5,7],wave:[3,4.5],pet:[4,6]};
  const d=durs[LM.act]||[5,8];
  LM.actDur=LM.timer=rnd(d[0],d[1]);
  LM.emoteT=0.6;
  if(LM.act==='strawberry'||LM.act==='dance'||LM.act==='cheer'){
    LM.faceMode='happy';ladyMoon.faceObj.drawFace('happy');
  }else{
    LM.faceMode='open';ladyMoon.faceObj.drawFace('open');
  }
  const em={knitSit:'note',knitSquat:'sparkle',yarnBall:'heart',strawberry:'heart',cheer:'sparkle',dance:'note',wave:'heart',pet:'heart'}[LM.act]||'note';
  emote(ladyMoon.headGroup,em,0.95,1.8,0.58);
}

function poseLadyMoon(dt,time){
  const M=ladyMoon,acting=(LM.state==='act'),act=acting?(LM.act==='radio'?(LM.radioPhase==='dance'?'dance':'radioTune'):LM.act):null;
  const sitting=(act==='knitSit'),squatting=(act==='knitSquat'||act==='tend'||(act==='pet'&&!!(LM.spot&&LM.spot.pet&&LM.spot.pet.kind!=='dog')));
  LM.sitK=lerp(LM.sitK,sitting?1:0,Math.min(1,dt*5));
  LM.squatK=lerp(LM.squatK,squatting?1:0,Math.min(1,dt*6));
  LM.twirlT=Math.max(0,LM.twirlT-dt);
  const tw=LM.twirlT>0?smooth(0,1,1-LM.twirlT/0.95)*Math.PI*2:0;

  // Barefoot when sitting cross-legged knitting, sneakers otherwise
  const bare=(LM.sitK>0.55);
  M.leftLeg.shoe.visible=!bare;M.rightLeg.shoe.visible=!bare;
  M.leftLeg.bareFoot.visible=bare;M.rightLeg.bareFoot.visible=bare;

  // Prop visibility
  M.props.knitGroup.visible=acting&&(act==='knitSit'||act==='knitSquat');
  M.props.yarnGroup.visible=acting&&(act==='yarnBall'||act==='yarnPlay');
  MOON_BROOM.visible=acting&&act==='sweep';
  M.props.berryGroup.visible=acting&&(act==='strawberry');

  // Hop height for cheer / dance / skip
  let hop=0;
  if(act==='cheer'||act==='dogPlay')hop=Math.abs(Math.sin(time*6.5))*(act==='dogPlay'?0.22:0.32);
  if(LM.jumpT>0)hop+=Math.sin((1-LM.jumpT/0.62)*Math.PI)*0.75;
  else if(act==='dance')hop=Math.abs(Math.sin(time*5.2))*0.18;

  const gy=LM.inside?0:walkHeight(LM.x,LM.z);
  LM.y=lerp(LM.y,gy,Math.min(1,dt*22));
  M.root.position.set(LM.x,LM.y-LM.sitK*0.7-LM.squatK*0.3+hop,LM.z);
  M.root.rotation.y=LM.yaw+tw;

  const mv=clamp(LM.speed/3.2,0,1),running=LM.speed>3.2;
  if(mv>0.03)LM.walkPhase+=dt*LM.speed*(running?4.2:3.7);
  const s=Math.sin(LM.walkPhase),c=Math.cos(LM.walkPhase),H=M.HIP;

  // Legs: walk/run, cross-legged sit, low squat, star-jump kick, or balance dance
  let lLegX=s*(running?0.82:0.62)*mv,rLegX=-s*(running?0.82:0.62)*mv;
  // lift each foot while it swings forward and plant it as it pushes back, so the stride runs heel-to-toe in the walking direction
  let lLegZ=0,rLegZ=0,lLegY=H+Math.max(0,-c)*0.11*mv,rLegY=H+Math.max(0,c)*0.11*mv;
  const walkLX=lLegX,walkRX=rLegX;
  if(LM.sitK>0.05){
    // Cross-legged sitting pose
    lLegX=lerp(lLegX,-1.35,LM.sitK);rLegX=lerp(rLegX,-1.35,LM.sitK);
    lLegZ=lerp(0,0.48,LM.sitK);rLegZ=lerp(0,-0.48,LM.sitK);
  }
  if(LM.squatK>0.05){
    lLegX=lerp(lLegX,-1.05,LM.squatK);rLegX=lerp(rLegX,-1.05,LM.squatK);
    lLegZ=lerp(lLegZ,-0.18,LM.squatK);rLegZ=lerp(rLegZ,0.18,LM.squatK);
  }
  if(act==='cheer'){
    lLegX=0.15;rLegX=-0.85-Math.abs(Math.sin(time*6.5))*0.35;rLegZ=-0.18;
  }else if(act==='dance'){
    const sw=Math.sin(time*5.2);
    lLegX=sw>0?-0.65:0.1;rLegX=sw<=0?-0.65:0.1;
    lLegZ=-0.16;rLegZ=0.16;
  }
  M.leftLeg.leg.rotation.set(lLegX,0,lLegZ);
  M.rightLeg.leg.rotation.set(rLegX,0,rLegZ);
  { // soles stay flat while walking (only the walk swing is counter-rotated, so sit, squat and dance poses are unchanged)
    const w=(lLegX===walkLX&&rLegX===walkRX)?1:0,lu=(lLegY-H)*1.5,ru=(rLegY-H)*1.5;
    M.leftLeg.shoe.rotation.x=w*(-walkLX*0.8-lu);M.rightLeg.shoe.rotation.x=w*(-walkRX*0.8-ru);}
  M.leftLeg.leg.position.y=lLegY;M.rightLeg.leg.position.y=rLegY;

  // Body bounce & tilt
  M.bodyPivot.position.y=Math.abs(s)*(running?0.08:0.055)*mv+Math.sin(time*2.8)*0.014*(1-mv);
  M.bodyPivot.rotation.z=act==='dance'?Math.sin(time*5.2)*0.14:s*0.05*mv;

  // Arms & knitting needle motion
  let lean=(running?0.16:0.06)*mv+0.28*LM.squatK+0.08*LM.sitK;
  let lX=-s*(running?0.68:0.48)*mv,rX=s*(running?0.68:0.48)*mv,lZ=0,rZ=0;
  if(acting){
    switch(act){
      case 'knitSit':
      case 'knitSquat':{
        const k1=Math.sin(time*9)*0.16,k2=Math.cos(time*9)*0.16;
        lX=-1.05+k1;rX=-1.05+k2;lZ=0.28;rZ=-0.28;
        M.props.needleL.rotation.z=-0.78+k1*0.6;
        M.props.needleR.rotation.z=0.78+k2*0.6;
        M.props.knitGroup.position.y=act==='knitSquat'?0.46:0.52;
        break;
      }
      case 'yarnBall':
        lX=-1.12+Math.sin(time*3)*0.06;rX=-1.12-Math.sin(time*3)*0.06;
        lZ=0.32;rZ=-0.32;lean=0.05;
        M.props.yarnGroup.rotation.y=Math.sin(time*2)*0.25;
        break;
      case 'strawberry':
        lX=-1.35+Math.sin(time*4)*0.08;rX=-1.15;lZ=0.22;rZ=-0.18;
        break;
      case 'cheer':
        lZ=-2.45-Math.sin(time*8)*0.18;rZ=2.45+Math.sin(time*8)*0.18;
        lX=-0.25;rX=-0.25;lean=-0.08;
        break;
      case 'dance':
        lZ=-2.35+Math.sin(time*5.2)*0.25;rZ=1.15+Math.cos(time*5.2)*0.25;
        lX=-0.2;rX=-0.2;
        break;
      case 'wave':
        rZ=2.38+Math.sin(time*8.5)*0.32;lZ=-0.15;lX=-0.2;
        break;
      case 'radioTune':   // reaching out to turn the radio's knob
        rX=-1.2+Math.sin(time*9)*0.05;rZ=0.1;lX=-0.2;lean=0.12;
        break;
      case 'pet':
        rX=-1.2+Math.sin(time*5)*0.28;lX=-0.45;lean=0.32;
        break;
      case 'tend':
        rX=-1.15+Math.sin(time*5)*0.32;lX=-0.95+Math.sin(time*5+1.2)*0.25;lZ=0.15;rZ=-0.15;
        break;
      case 'sweep':{const sw=Math.sin(time*4.2);rX=-0.6+sw*0.08;lX=-0.8+sw*0.08;rZ=-0.05+sw*0.3;lZ=0.2+sw*0.3;lean=0.16;break;}
      case 'chat':
        rZ=0.5+Math.max(0,Math.sin(time*2.4))*0.6;rX=-0.5+Math.sin(time*3.3)*0.2;lX=-0.3;lZ=-0.1;
        break;
      case 'yarnPlay':
        rX=-1.45+Math.sin(time*4)*0.35;rZ=-0.2;lX=-0.4;lean=0.12;M.props.yarnGroup.rotation.y=Math.sin(time*5)*0.6;
        break;
      case 'dogPlay':
        lZ=-2.2-Math.sin(time*8)*0.25;rZ=2.2+Math.sin(time*8)*0.25;lX=-0.2;rX=-0.2;lean=-0.05;
        break;
    }
  }
  const ak=Math.min(1,dt*10);
  M.bodyPivot.rotation.x=lerp(M.bodyPivot.rotation.x,lean,ak);
  M.leftArm.rotation.x=lerp(M.leftArm.rotation.x,lX,ak);
  M.rightArm.rotation.x=lerp(M.rightArm.rotation.x,rX,ak);
  M.leftArm.rotation.z=lerp(M.leftArm.rotation.z,lZ,ak);
  M.rightArm.rotation.z=lerp(M.rightArm.rotation.z,rZ,ak);

  // Head look & playful tilt
  let hy=Math.sin(time*0.9)*0.22,hp=0,hz=0;
  if(act==='knitSit'||act==='knitSquat'){hp=0.28;hy=Math.sin(time*2.2)*0.12;hz=Math.sin(time*1.5)*0.06;}
  else if(act==='yarnBall'){hp=0.22;hz=0.10;}
  else if(act==='strawberry'){hp=0.12;hy=-0.18;hz=-0.12;}
  else if(act==='cheer'||act==='dance'){hp=-0.12;hz=Math.sin(time*5.2)*0.14;}
  else if(Math.hypot(AI.x-LM.x,AI.z-LM.z)<5.5){
    hy=clamp(normalizeAngle(Math.atan2(AI.x-LM.x,AI.z-LM.z)-LM.yaw),-0.95,0.95);
  }
  M.headGroup.rotation.y=lerp(M.headGroup.rotation.y,hy,Math.min(1,dt*6));
  M.headGroup.rotation.x=lerp(M.headGroup.rotation.x,hp,Math.min(1,dt*6));
  M.headGroup.rotation.z=lerp(M.headGroup.rotation.z,hz,Math.min(1,dt*6));
}

function updateLadyMoon(dt,time){
  LM.hatSwapT-=dt;
  // Blinking when not in happy closed-eye mode
  if(LM.faceMode!=='happy'){
    LM.blinkTimer-=dt;
    if(LM.blinkTimer<=0){
      if(!LM.isBlinking){LM.isBlinking=true;ladyMoon.faceObj.drawFace('blink');LM.blinkTimer=0.13;}
      else{LM.isBlinking=false;ladyMoon.faceObj.drawFace('open');LM.blinkTimer=rnd(2.0,4.6);}
    }
  }
  if(INSIDE.on){
    if(!LM.inside){
      LM.inside=true;scene.remove(ladyMoon.root);INSIDE.scene.add(ladyMoon.root);
      LM.ix=-2.2;LM.iz=1.8;LM.yaw=0.5;LM.speed=0;beginLadyMoonAct('knitSit');
    }
    if(HOLD.moon){LM.speed=0;poseLadyMoon(dt,time);return;}
    LM.timer-=dt;
    if(LM.timer<=0){
      const inActs=['knitSit','yarnBall','strawberry','dance','wave'];
      beginLadyMoonAct(pick(inActs));
    }
    const svX=LM.x,svZ=LM.z;LM.x=LM.ix;LM.z=LM.iz;
    poseLadyMoon(dt,time);
    LM.x=svX;LM.z=svZ;
    return;
  }else if(LM.inside){
    LM.inside=false;INSIDE.scene.remove(ladyMoon.root);scene.add(ladyMoon.root);
    const s=snapWalkable(POI.houseSteps.x-1.6,POI.houseSteps.z+1.2);
    LM.x=s[0];LM.z=s[1];LM.state='idle';LM.timer=1.0;
  }

  if(HOLD.moon){
    LM.speed=lerp(LM.speed,0,Math.min(1,dt*12));
    if(LM.state==='walk'){LM.state='idle';LM.path=[];}
    poseLadyMoon(dt,time);return;
  }
  if(CTRL.on&&FOLLOW_MOON){moonCtrlUpdate(dt,time);return;}
  if(CTRL.moonStarted){CTRL.moonStarted=false;LM.mAct=null;LM.state='idle';LM.timer=0.6;}
  LM.timer-=dt;
  if(LM.state==='idle'){
    LM.speed=lerp(LM.speed,0,Math.min(1,dt*10));
    if(LM.timer<=0)chooseLadyMoonPlan();
  }else if(LM.state==='walk'){
    if(!LM.path||LM.wp>=LM.path.length||LM.timer<=0){
      if(LM.spot&&LM.spot.look){
        LM.yaw=Math.atan2(LM.spot.look[0]-LM.x,LM.spot.look[1]-LM.z);
      }
      beginLadyMoonAct(LM.spot?LM.spot.act:'knitSit');
    }else{
      const[wx,wz]=LM.path[LM.wp],dx=wx-LM.x,dz=wz-LM.z,d=Math.hypot(dx,dz),last=(LM.wp===LM.path.length-1);
      if(d<(last?0.35:0.65)){LM.wp++;}
      else{
        moonStuckCheck(dt);
        const diff=normalizeAngle(Math.atan2(dx,dz)-LM.yaw);
        LM.yaw+=diff*Math.min(1,dt*8);
        const sp=LM.walkSpeed*clamp(1-Math.abs(diff)/2.4,0.35,1);
        LM.speed=lerp(LM.speed,sp,Math.min(1,dt*7));
        const nx=LM.x+Math.sin(LM.yaw)*LM.speed*dt,nz=LM.z+Math.cos(LM.yaw)*LM.speed*dt;
        if(isPointWalkable(nx,nz,0.22)){LM.x=nx;LM.z=nz;}else{LM.x+=dx/d*LM.speed*dt;LM.z+=dz/d*LM.speed*dt;}
      }
    }
  }else if(LM.state==='act'){
    LM.speed=lerp(LM.speed,0,Math.min(1,dt*10));
    LM.actT+=dt;LM.emoteT-=dt;
    moonNewActs(dt);
    if(LM.emoteT<=0){
      LM.emoteT=rnd(3.2,5.5);
      const em={knitSit:'note',knitSquat:'sparkle',yarnBall:'heart',strawberry:'heart',cheer:'sparkle',dance:'note',wave:'heart',pet:'heart',tend:'leaf',sweep:'sparkle',chat:'note',yarnPlay:'heart',dogPlay:'ball'}[LM.act]||'note';
      emote(ladyMoon.headGroup,em,0.95,1.7,0.55);
    }
    if(LM.timer<=0){
      if(LM.act==='knitSit'||LM.act==='knitSquat'){
        addGood('knit',1);
        emote(ladyMoon.headGroup,'sparkle',0.95,1.9,0.62);
      }
      if(LM.faceMode==='happy'){LM.faceMode='open';ladyMoon.faceObj.drawFace('open');}
      if(LM.act==='sweep'&&LM.spot&&LM.spot.mess){LM.spot.mess.dirt=0;ISLAND.drawMess(LM.spot.mess);emote(ladyMoon.headGroup,'sparkle',0.95);}
      if(LM.act==='tend'&&LM.spot&&LM.spot.bed&&Math.random()<0.5){addGood('herbs',1);emote(ladyMoon.headGroup,'basket',0.95);}
      moonFinish(true);
      LM.spot=null;LM.state='idle';LM.timer=rnd(0.6,1.8);
    }
  }
  poseLadyMoon(dt,time);
}

function ladyMoonStatus(){
  if(HOLD.moon)return 'Lady Moon is holding still';
  if(CTRL.on&&FOLLOW_MOON)return moonCtrlStatus();
  const hatLbl={frog:'🐸',strawberry:'🍓',coral:'🧶',none:'💙'}[MOON_STYLE.hat]||'';
  const sp=LM.spot;
  if(LM.state==='act'){
    if(LM.act==='tend')return 'Lady Moon '+hatLbl+' is helping in the garden';
    if(LM.act==='sweep')return 'Lady Moon '+hatLbl+' is sweeping '+((sp&&sp.mess&&sp.mess.label)||'up');
    if(LM.act==='chat')return 'Lady Moon '+hatLbl+' is chatting with Luna';
    if(LM.act==='radio')return 'Lady Moon '+hatLbl+(LM.radioPhase==='dance'?' is dancing to '+RADIO.label():LM.radioPhase==='off'?' is switching the radio off':' is turning on the radio');
    if(LM.act==='yarnPlay')return 'Lady Moon '+hatLbl+' is playing yarn with '+((sp&&sp.pet&&sp.pet.name)||'a kitty');
    if(LM.act==='dogPlay')return 'Lady Moon '+hatLbl+' is playing zoomies with '+((sp&&sp.dog&&sp.dog.name)||'the pups');
    if(LM.act==='pet'&&sp&&sp.pet)return 'Lady Moon '+hatLbl+' is cuddling '+sp.pet.name;}
  if(LM.state==='walk')return 'Lady Moon '+hatLbl+' is '+(LM.speed>3.2?'skipping across the island':'strolling along');
  const words={
    knitSit:'knitting a rainbow scarf',
    knitSquat:'crouching & knitting',
    yarnBall:'winding her giant rainbow yarn ball',
    strawberry:'enjoying a sweet strawberry',
    cheer:'doing a joyful star-jump!',
    dance:'doing a happy crafter dance',
    wave:'waving hello',
    pet:'cuddling a furry friend'
  };
  return 'Lady Moon '+hatLbl+' is '+(words[LM.act]||'crafting');
}


/* ================= Island life: shared helpers ================= */
let nightK=0,simTime=0;
function normalizeAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}
function isCellOpen(x,z){const[gx,gz]=toGrid(x,z),id=gIdx(gx,gz);return NAV.walk[id]===1&&NAV.cost[id]<2.2;}
function snapWalkable(x,z){const[gx,gz]=toGrid(x,z);const c=findNearestWalkableCell(gx,gz);return toWorld(c[0],c[1]);}
function randomSpotNear(x,z,r,minR=0){
  for(let i=0;i<40;i++){const a=Math.random()*6.2832,d=minR+Math.sqrt(Math.random())*(r-minR),px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;
    if(isCellOpen(px,pz))return[px,pz];}
  return snapWalkable(x,z);
}
function planPath(sx,sz,tx,tz){if(hasGridLineOfSight(sx,sz,tx,tz))return[[tx,tz]];return findPathWorld(sx,sz,tx,tz);}
function followPath(e,dt,speed,turn=7){
  if(!e.path||e.wp>=e.path.length){e.moving=Math.max(0,e.moving-dt*5);return true;}
  const[tx,tz]=e.path[e.wp],dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz),last=e.wp===e.path.length-1;
  if(d<(last?0.28:0.6)){e.wp++;return e.wp>=e.path.length;}
  const diff=normalizeAngle(Math.atan2(dx,dz)-e.yaw);e.yaw+=diff*Math.min(1,dt*turn);
  let sp=speed*clamp(1-Math.abs(diff)/2.4,0.25,1);if(last)sp*=clamp(d/1.2,0.35,1);
  const nx=e.x+Math.sin(e.yaw)*sp*dt,nz=e.z+Math.cos(e.yaw)*sp*dt;
  const[ngx,ngz]=toGrid(nx,nz);if(NAV.walk[gIdx(ngx,ngz)]){e.x=nx;e.z=nz;}else{e.x+=dx/d*sp*dt;e.z+=dz/d*sp*dt;}
  e.moving=sp;return false;
}
function addEyes(head,dx,y,z,r){
  for(const s of[-1,1]){
    blob(head,SPH,mStd('#1d1a1c',{roughness:0.25}),s*dx,y,z,r,r*1.1,r*0.7,false);
    blob(head,SPH,mStd('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.35}),s*dx+r*0.3,y+r*0.4,z+r*0.55,r*0.32,r*0.32,r*0.32,false);
  }
}
function legPivot(parent,x,y,z,len,r,mat,pawMat){
  const g=new T.Group();g.position.set(x,y,z);parent.add(g);
  blob(g,CYL,mat,0,-len/2,0,r,len,r);blob(g,SPH,pawMat||mat,0,-len,0.012,r*1.15,r*0.8,r*1.35,false);return g;
}

/* ---------------- emote bubbles ---------------- */
const EMOTE_TEX={},EMOTES=[],_wp=new T.Vector3();
function emoteTexture(kind){
  if(EMOTE_TEX[kind])return EMOTE_TEX[kind];
  const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
  c.fillStyle='rgba(255,255,255,0.96)';c.strokeStyle='rgba(60,50,70,0.3)';c.lineWidth=4;
  c.beginPath();c.arc(64,58,44,0,6.2832);c.fill();c.stroke();
  c.beginPath();c.moveTo(54,96);c.lineTo(64,118);c.lineTo(73,95);c.closePath();c.fill();
  c.textAlign='center';c.textBaseline='middle';
  if(kind==='heart'){c.fillStyle='#ff5d8f';c.beginPath();c.moveTo(64,84);c.bezierCurveTo(18,56,36,20,64,42);c.bezierCurveTo(92,20,110,56,64,84);c.fill();}
  else if(kind==='drop'){c.fillStyle='#4fb3ff';c.beginPath();c.moveTo(64,24);c.quadraticCurveTo(90,58,88,68);c.arc(64,68,24,0,Math.PI,false);c.quadraticCurveTo(38,58,64,24);c.fill();}
  else if(kind==='note'){c.fillStyle='#7a5cff';c.font='bold 66px sans-serif';c.fillText('♪',64,60);}
  else if(kind==='zzz'){c.fillStyle='#6b7bd6';c.font='bold 32px sans-serif';c.fillText('z',42,74);c.font='bold 46px sans-serif';c.fillText('Z',74,50);}
  else if(kind==='!'){c.fillStyle='#ff7a3d';c.font='bold 72px sans-serif';c.fillText('!',64,60);}
  else if(kind==='?'){c.fillStyle='#5aa0ff';c.font='bold 64px sans-serif';c.fillText('?',64,60);}
  else if(kind==='sparkle'){c.fillStyle='#f5c518';c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,r=i%2?11:32;c.lineTo(64+Math.cos(a)*r,58+Math.sin(a)*r);}c.closePath();c.fill();}
  else if(kind==='ball'){c.fillStyle='#ff5d5d';c.beginPath();c.arc(64,58,24,0,6.2832);c.fill();c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(64,58,24,-0.7,0.7);c.stroke();}
  else if(kind==='food'){c.fillStyle='#8a5a2b';for(const[x,y]of[[52,50],[64,46],[76,50],[58,56],[70,56]]){c.beginPath();c.arc(x,y,7,0,6.2832);c.fill();}
    c.fillStyle='#4fb3ff';c.beginPath();c.moveTo(30,58);c.lineTo(98,58);c.quadraticCurveTo(92,84,64,84);c.quadraticCurveTo(36,84,30,58);c.fill();}
  else if(kind==='weed'){c.fillStyle='#4f8f2f';c.beginPath();c.moveTo(64,86);c.quadraticCurveTo(40,60,46,36);c.quadraticCurveTo(60,52,64,86);c.fill();
    c.beginPath();c.moveTo(64,86);c.quadraticCurveTo(88,58,84,34);c.quadraticCurveTo(68,52,64,86);c.fill();c.strokeStyle='#e2432f';c.lineWidth=7;c.beginPath();c.moveTo(40,34);c.lineTo(88,82);c.stroke();}
  else if(kind==='bug'){c.fillStyle='#d9322a';c.beginPath();c.arc(64,62,24,0,6.2832);c.fill();c.fillStyle='#1d1a1c';c.beginPath();c.arc(64,38,10,0,6.2832);c.fill();
    c.fillRect(62,40,4,46);for(const[x,y]of[[52,54],[76,54],[54,72],[74,72]]){c.beginPath();c.arc(x,y,5,0,6.2832);c.fill();}}
  else if(kind==='basket'){c.fillStyle='#e8792a';c.beginPath();c.arc(54,50,14,0,6.2832);c.fill();c.fillStyle='#e2432f';c.beginPath();c.arc(76,52,11,0,6.2832);c.fill();
    c.fillStyle='#b5864a';c.beginPath();c.moveTo(30,56);c.lineTo(98,56);c.lineTo(88,88);c.lineTo(40,88);c.closePath();c.fill();c.strokeStyle='#8a6143';c.lineWidth=3;for(let x=42;x<90;x+=10){c.beginPath();c.moveTo(x,58);c.lineTo(x-2,86);c.stroke();}}
  else if(kind==='compost'){c.fillStyle='#5a3a24';c.beginPath();c.moveTo(26,86);c.quadraticCurveTo(64,20,102,86);c.closePath();c.fill();c.fillStyle='#7fae3a';c.beginPath();c.ellipse(64,40,6,12,0.4,0,6.2832);c.fill();}
  else if(kind==='leaf'){c.fillStyle='#d9532b';c.beginPath();c.moveTo(64,24);c.lineTo(78,46);c.lineTo(98,40);c.lineTo(88,62);c.lineTo(100,74);c.lineTo(72,76);c.lineTo(64,94);c.lineTo(56,76);c.lineTo(28,74);c.lineTo(40,62);c.lineTo(30,40);c.lineTo(50,46);c.closePath();c.fill();}
  else if(kind==='scissors'){c.strokeStyle='#6b7480';c.lineWidth=7;c.beginPath();c.moveTo(42,30);c.lineTo(84,78);c.moveTo(86,30);c.lineTo(44,78);c.stroke();
    c.fillStyle='#e8792a';for(const x of[40,88]){c.beginPath();c.arc(x,84,11,0,6.2832);c.fill();}}
  else if(kind==='seed'){c.fillStyle='#d9b65a';c.fillRect(40,30,48,58);c.fillStyle='#4f8f2f';c.beginPath();c.ellipse(64,52,10,16,0,0,6.2832);c.fill();c.fillStyle='#8a6143';c.fillRect(40,74,48,6);}
  else if(kind==='fish'){c.fillStyle='#4f9fd8';c.beginPath();c.ellipse(58,58,28,16,0,0,6.2832);c.fill();c.beginPath();c.moveTo(82,58);c.lineTo(104,40);c.lineTo(104,76);c.closePath();c.fill();
    c.fillStyle='#bfe3ff';c.beginPath();c.ellipse(56,64,20,7,0,0,6.2832);c.fill();c.fillStyle='#1d1a1c';c.beginPath();c.arc(42,53,4,0,6.2832);c.fill();}
  else if(kind==='coin'){const g=c.createRadialGradient(54,48,4,64,58,30);g.addColorStop(0,'#fff1a8');g.addColorStop(0.6,'#f2c230');g.addColorStop(1,'#b8861a');c.fillStyle=g;c.beginPath();c.arc(64,58,28,0,6.2832);c.fill();
    c.strokeStyle='#fff6c8';c.lineWidth=3;c.beginPath();c.arc(64,58,20,0,6.2832);c.stroke();c.fillStyle='#b8861a';c.font='bold 26px sans-serif';c.fillText('¢',64,59);}
  else if(kind==='cackle'){c.fillStyle='#7a3fa0';c.font='bold 30px sans-serif';c.fillText('hee',64,46);c.fillStyle='#4fae3a';c.fillText('hee!',64,76);}
  return EMOTE_TEX[kind]=new T.CanvasTexture(cv);
}
const EMOTE_POOL=[];let INSIDE_REF=null;
function emote(obj,kind,yOff=1.0,dur=1.9,scale=0.62){
  const s=EMOTE_POOL.pop()||new T.Sprite(new T.SpriteMaterial({transparent:true,depthWrite:false}));
  s.material.map=emoteTexture(kind);s.material.opacity=1;s.scale.setScalar(0.01);
  const sc=INSIDE_REF&&INSIDE_REF.on&&(obj===caretaker.headGroup||INSIDE_REF.dogs.some(d=>d.root===obj))?INSIDE_REF.scene:scene;sc.add(s);EMOTES.push({s,obj,yOff,dur,t:0,scale,sc});
}
function updateEmotes(dt){
  for(let i=EMOTES.length-1;i>=0;i--){const e=EMOTES[i];e.t+=dt;const k=e.t/e.dur;
    e.obj.getWorldPosition(_wp);e.s.position.set(_wp.x,_wp.y+e.yOff+k*0.35,_wp.z);
    e.s.scale.setScalar(e.scale*(k<0.15?smooth(0,0.15,k)*1.12:1));e.s.material.opacity=1-smooth(0.75,1,k);
    if(k>=1){(e.sc||scene).remove(e.s);EMOTE_POOL.push(e.s);EMOTES.splice(i,1);}}
}

/* ---------------- pets: cats, bunnies and Luna's dog ---------------- */
function makeCat(o){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const mC=mStd(o.col),mA=mStd(o.accent),pink=mStd('#f49ab0');
  blob(body,SPH,mC,0,0.27,0,0.17,0.15,0.3);
  blob(body,SPH,mA,0,0.25,0.17,0.12,0.12,0.12);
  if(o.stripes)for(let i=0;i<3;i++)blob(body,SPH,mStd(o.stripes),0,0.39,-0.13+i*0.11,0.11,0.035,0.035,false);
  const head=new T.Group();head.position.set(0,0.42,0.26);body.add(head);
  blob(head,SPH,mC,0,0,0,0.155,0.14,0.14);
  blob(head,SPH,mA,0,-0.045,0.09,0.08,0.06,0.06);
  for(const s of[-1,1]){const ear=blob(head,CONE,mC,s*0.09,0.13,-0.01,0.055,0.11,0.04);ear.rotation.z=-s*0.3;
    const inn=blob(head,CONE,pink,s*0.087,0.122,0.012,0.032,0.07,0.02,false);inn.rotation.z=-s*0.3;}
  addEyes(head,0.06,0.02,0.12,0.026);
  blob(head,SPH,pink,0,-0.025,0.148,0.017,0.012,0.012,false);
  const legs=[[-1,1],[1,1],[-1,-1],[1,-1]].map(([sx,sz])=>legPivot(body,sx*0.09,0.2,sz*0.17,0.2,0.038,mC,mA));
  const tail=[];let par=body,pz=-0.28,py=0.33;
  for(let i=0;i<5;i++){const g=new T.Group();g.position.set(0,py,pz);par.add(g);
    const seg=blob(g,CYL,i===4&&o.tip?mStd(o.tip):mC,0,0,-0.05,0.032-i*0.003,0.11,0.032-i*0.003);seg.rotation.x=Math.PI/2;tail.push(g);par=g;py=0;pz=-0.1;}
  return {root,body,head,legs,tail};
}
function makeBunny(o){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const mC=mStd(o.col),mA=mStd(o.accent),pink=mStd('#f6a9bb');
  blob(body,SPH,mC,0,0.19,-0.02,0.16,0.15,0.2);
  for(const s of[-1,1]){blob(body,SPH,mC,s*0.08,0.14,-0.08,0.08,0.09,0.11);blob(body,SPH,mA,s*0.08,0.03,-0.04,0.04,0.03,0.1,false);blob(body,SPH,mA,s*0.05,0.04,0.12,0.035,0.04,0.05,false);}
  blob(body,SPH,mStd('#ffffff'),0,0.22,-0.21,0.055,0.055,0.055);
  const head=new T.Group();head.position.set(0,0.33,0.14);body.add(head);
  blob(head,SPH,mC,0,0,0,0.12,0.11,0.12);
  blob(head,SPH,mA,0,-0.04,0.08,0.06,0.045,0.045);
  addEyes(head,0.062,0.02,0.085,0.02);
  blob(head,SPH,pink,0,-0.02,0.12,0.014,0.01,0.01,false);
  const ears=[];
  for(const s of[-1,1]){const g=new T.Group();g.position.set(s*0.045,0.08,-0.02);head.add(g);
    blob(g,SPH,mC,0,0.13,0,0.04,0.14,0.025);blob(g,SPH,pink,0,0.13,0.012,0.022,0.1,0.012,false);
    g.rotation.z=-s*(o.lop?1.6:0.15);ears.push(g);}
  return {root,body,head,ears,legs:[],tail:[]};
}
function makeDog(o){
  // Kiko: a plush sable Shetland Sheepdog (Sheltie)
  const root=new T.Group(),body=new T.Group();root.add(body);
  const FUR={tan:'#c9843c',gold:'#e8a85a',sable:'#3a2416',mid:'#6b4428',cream:'#f6efe2',white:'#fffaf3',pink:'#f0a0a6',black:'#241810'};
  const fm={},fur=c=>fm[c]||(fm[c]=mStd(c,{roughness:0.95}));
  // fur tufts: soft cones that give the coat its jagged, fluffy edge
  const tuft=(p,c,x,y,z,r,h,rx,rz,ry=0)=>{const m=blob(p,CONE,fur(c),x,y,z,r,h,r*0.8,false);m.rotation.set(rx,ry,rz);return m;};
  // torso with a dark saddle over the back and a cream belly
  blob(body,SPH,fur(FUR.tan),0,0.36,-0.02,0.2,0.18,0.34);
  blob(body,SPH,fur(FUR.sable),0,0.46,-0.06,0.2,0.13,0.3);
  blob(body,SPH,fur(FUR.black),0,0.5,-0.08,0.16,0.07,0.22);
  blob(body,SPH,fur(FUR.cream),0,0.26,0.02,0.15,0.09,0.26,false);
  blob(body,SPH,fur(FUR.tan),0,0.36,-0.26,0.17,0.16,0.16);
  for(const s of[-1,1])for(let k=0;k<5;k++)tuft(body,k%2?FUR.sable:FUR.mid,s*0.175,0.42,0.1-k*0.085,0.04,0.085,0,-s*(Math.PI-0.25));
  // big white chest ruff with jagged tufts, framed by a sable mane
  blob(body,SPH,fur(FUR.sable),0,0.64,0.2,0.26,0.24,0.16);
  for(const s of[-1,1])for(let k=0;k<3;k++)tuft(body,k===1?FUR.mid:FUR.sable,s*(0.22+k*0.012),0.54-k*0.08,0.26,0.07,0.2,-0.1,-s*(Math.PI-0.3));
  blob(body,SPH,fur(FUR.white),0,0.48,0.26,0.24,0.28,0.18);
  blob(body,SPH,fur(FUR.white),0,0.34,0.3,0.2,0.16,0.14);
  for(let k=0;k<8;k++){const a=(k-3.5)*0.16;tuft(body,FUR.white,Math.sin(a)*0.2,0.24,0.3+Math.cos(a)*0.05,0.06,0.17,-0.15,Math.PI+a*0.5);}
  for(let k=0;k<6;k++){const a=(k-2.5)*0.22;tuft(body,FUR.white,Math.sin(a)*0.22,0.4,0.36+Math.cos(a)*0.03,0.055,0.15,-0.55,Math.PI+a*0.7);}
  // head: sable cap and frame, golden face, white blaze and muzzle
  const head=new T.Group();head.position.set(0,0.77,0.31);head.scale.setScalar(1.1);body.add(head);
  blob(head,SPH,fur(FUR.tan),0,0,0,0.2,0.19,0.18);
  blob(head,SPH,fur(FUR.sable),0,0.065,-0.035,0.205,0.135,0.16);
  for(const s of[-1,1]){
    blob(head,SPH,fur(FUR.gold),s*0.14,-0.07,0.02,0.07,0.085,0.075);
    for(let k=0;k<4;k++)tuft(head,k===3?FUR.sable:FUR.gold,s*(0.17+k*0.005),0.0-k*0.055,0.03-k*0.015,0.065,0.17,0.15,-s*(Math.PI/2+0.45+k*0.22));
    for(let k=0;k<3;k++)tuft(head,FUR.sable,s*0.2,0.04-k*0.08,-0.06,0.065,0.16,0,-s*(Math.PI/2+0.2+k*0.2));
    blob(head,SPH,fur(FUR.gold),s*0.06,0.078,0.15,0.032,0.018,0.016,false);
  }
  const blaze=blob(head,SPH,fur(FUR.white),0,0.04,0.17,0.04,0.16,0.035,false);blaze.rotation.x=-0.4;
  blob(head,SPH,fur(FUR.white),0,-0.07,0.15,0.11,0.085,0.12);
  blob(head,SPH,mStd('#1b1718',{roughness:0.3}),0,-0.04,0.235,0.036,0.026,0.024,false);
  blob(head,SPH,mStd('#5a2428'),0,-0.112,0.19,0.05,0.025,0.035,false);
  const tongue=blob(head,SPH,fur(FUR.pink),0,-0.125,0.205,0.032,0.012,0.04,false);
  for(const s of[-1,1]){
    blob(head,SPH,mStd('#2a1c14',{roughness:0.2}),s*0.078,0.025,0.155,0.055,0.064,0.032,false);
    blob(head,SPH,mStd('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.55}),s*0.078+0.016,0.046,0.178,0.016,0.016,0.01,false);
    blob(head,SPH,mStd('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.4}),s*0.078-0.014,0.008,0.18,0.007,0.007,0.005,false);
    // tall sable ears, pink inside, the sheltie silhouette
    const ear=new T.Group();ear.position.set(s*0.1,0.17,-0.02);ear.rotation.set(0.08,0,-s*0.18);head.add(ear);
    blob(ear,CONE,fur(FUR.black),0,0.11,0,0.07,0.22,0.038);
    blob(ear,CONE,fur(FUR.pink),0,0.085,0.022,0.04,0.14,0.012,false);
    tuft(head,FUR.gold,s*0.15,0.12,0.0,0.045,0.13,0,-s*1.15);
    tuft(head,FUR.gold,s*0.16,0.08,0.03,0.04,0.11,0.2,-s*1.5);
  }
  const mouth=new T.Object3D();mouth.position.set(0,-0.115,0.24);head.add(mouth);
  // legs: golden upper legs, cream socks, white paws with toe lines
  const legs=[[-1,1],[1,1],[-1,-1],[1,-1]].map(([sx,sz])=>{
    const g=new T.Group();g.position.set(sx*0.1,0.3,sz*0.17);body.add(g);
    blob(g,CYL,fur(FUR.tan),0,-0.07,0,0.056,0.15,0.056);
    blob(g,CYL,fur(FUR.cream),0,-0.21,0,0.05,0.16,0.05);
    blob(g,SPH,fur(FUR.white),0,-0.29,0.018,0.062,0.04,0.08,false);
    for(const t of[-1,1])blob(g,BOX,mStd('#b9a88e'),t*0.018,-0.285,0.09,0.004,0.025,0.03,false);
    return g;});
  // bushy tail: sable base, tan middle, white tip
  const wag=new T.Group();wag.position.set(0,0.42,-0.34);wag.rotation.x=-0.45;body.add(wag);
  blob(wag,SPH,fur(FUR.sable),0,0.02,-0.08,0.1,0.1,0.14);
  blob(wag,SPH,fur(FUR.tan),0,0.02,-0.2,0.12,0.12,0.14);
  blob(wag,SPH,fur(FUR.cream),0,0.0,-0.32,0.11,0.12,0.13);
  for(let k=0;k<5;k++)tuft(wag,FUR.white,(k-2)*0.04,0.02,-0.42,0.045,0.11,-2.2,(k-2)*0.25);
  root.scale.setScalar(0.98);
  return {root,body,head,legs,tail:[],wag,wagAxis:'y',tongue,mouth};
}
function makeShepherd(o){
  // Bruno: a plush German Shepherd pup (black saddle, tan legs, dark muzzle mask)
  const root=new T.Group(),body=new T.Group();root.add(body);
  const FUR={tan:'#c47a32',light:'#e2a45a',black:'#1a1614',dark:'#2a211c',pink:'#e7b0a0',blush:'#e09078'};
  const fm={},fur=c=>fm[c]||(fm[c]=mStd(c,{roughness:0.95}));
  const tuft=(p,c,x,y,z,r,h,rx,rz,ry=0)=>{const m=blob(p,CONE,fur(c),x,y,z,r,h,r*0.8,false);m.rotation.set(rx,ry,rz);return m;};
  // body: tan with a black saddle over the back and shoulders
  blob(body,SPH,fur(FUR.tan),0,0.4,-0.02,0.2,0.2,0.4);
  blob(body,SPH,fur(FUR.black),0,0.5,-0.04,0.21,0.16,0.34);
  blob(body,SPH,fur(FUR.tan),0,0.38,-0.32,0.17,0.17,0.16);
  blob(body,SPH,fur(FUR.light),0,0.28,0.02,0.14,0.1,0.28,false);
  for(const s of[-1,1])for(let k=0;k<5;k++)tuft(body,FUR.black,s*0.18,0.41,0.12-k*0.085,0.045,0.09,0,-s*(Math.PI-0.25));
  // chest: fluffy light-tan bib with black tufts at the sides of the neck
  blob(body,SPH,fur(FUR.tan),0,0.6,0.2,0.22,0.2,0.15);
  blob(body,SPH,fur(FUR.light),0,0.46,0.24,0.19,0.22,0.15);
  for(let k=0;k<6;k++){const a=(k-2.5)*0.2;tuft(body,FUR.light,Math.sin(a)*0.16,0.3,0.28+Math.cos(a)*0.05,0.05,0.13,-0.15,Math.PI+a*0.6);}
  for(const s of[-1,1])for(let k=0;k<3;k++)tuft(body,FUR.black,s*(0.19+k*0.01),0.56-k*0.07,0.22,0.06,0.16,-0.1,-s*(Math.PI-0.35));
  // head
  const head=new T.Group();head.position.set(0,0.78,0.31);head.scale.setScalar(1.12);body.add(head);
  blob(head,SPH,fur(FUR.tan),0,0,0,0.2,0.19,0.18);
  blob(head,SPH,fur(FUR.black),0,0.07,-0.06,0.19,0.13,0.14);
  const peak=blob(head,SPH,fur(FUR.black),0,0.11,0.105,0.038,0.085,0.045,false);peak.rotation.x=-0.5;
  for(const s of[-1,1]){
    blob(head,SPH,fur(FUR.light),s*0.075,0.085,0.145,0.045,0.026,0.022,false);
    blob(head,SPH,fur(FUR.tan),s*0.14,-0.06,0.03,0.075,0.09,0.08);
    for(let k=0;k<3;k++)tuft(head,FUR.tan,s*0.17,-0.01-k*0.055,0.02,0.055,0.14,0.1,-s*(Math.PI/2+0.45+k*0.22));
    blob(head,SPH,mStd(FUR.blush,{roughness:0.9,transparent:true,opacity:0.55}),s*0.12,-0.04,0.13,0.035,0.022,0.015,false);
  }
  // dark muzzle mask, black nose, open smile with tongue out
  blob(head,SPH,fur(FUR.dark),0,-0.07,0.16,0.1,0.08,0.16);
  blob(head,SPH,fur(FUR.black),0,-0.04,0.2,0.07,0.055,0.1);
  blob(head,SPH,mStd('#141012',{roughness:0.3}),0,-0.02,0.29,0.048,0.034,0.036,false);
  blob(head,SPH,mStd('#4a1e22'),0,-0.12,0.19,0.055,0.028,0.035,false);
  const tongue=blob(head,SPH,fur('#f08a9a'),0,-0.145,0.21,0.034,0.014,0.05,false);
  for(const s of[-1,1]){
    blob(head,SPH,mStd('#ffffff'),s*0.075,0.02,0.142,0.05,0.056,0.028,false);
    blob(head,SPH,mStd('#6a3a18',{roughness:0.2}),s*0.075,0.017,0.152,0.04,0.046,0.026,false);
    blob(head,SPH,mStd('#1b120c',{roughness:0.2}),s*0.075,0.015,0.162,0.024,0.028,0.02,false);
    blob(head,SPH,mStd('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.4}),s*0.075+0.013,0.035,0.172,0.012,0.012,0.008,false);
    // tall black ears with warm pink insides
    const ear=new T.Group();ear.position.set(s*0.11,0.16,-0.03);ear.rotation.set(-0.05,0,-s*0.12);head.add(ear);
    blob(ear,CONE,fur(FUR.black),0,0.14,0,0.08,0.28,0.04);
    blob(ear,CONE,fur(FUR.pink),0,0.11,0.028,0.046,0.18,0.012,false);
    tuft(head,FUR.light,s*0.15,0.1,0.02,0.04,0.11,0.2,-s*1.2);
  }
  const mouth=new T.Object3D();mouth.position.set(0,-0.125,0.24);head.add(mouth);
  // tan legs, tan paws with dark toe tips
  const legs=[[-1,1],[1,1],[-1,-1],[1,-1]].map(([sx,sz])=>{
    const g=new T.Group();g.position.set(sx*0.105,0.3,sz*0.17);body.add(g);
    blob(g,CYL,fur(FUR.tan),0,-0.08,0,0.058,0.17,0.058);
    blob(g,CYL,fur(FUR.light),0,-0.21,0,0.052,0.14,0.052);
    blob(g,SPH,fur(FUR.light),0,-0.29,0.02,0.066,0.042,0.085,false);
    for(const t of[-1.5,-0.5,0.5,1.5])blob(g,SPH,mStd('#211b18'),t*0.022,-0.3,0.1,0.012,0.01,0.012,false);
    return g;});
  // bushy tail curling up, black on top
  // saber tail: hangs back and down, black along the top, tan underneath
  const wag=new T.Group();wag.position.set(0,0.42,-0.38);wag.rotation.x=0.85;body.add(wag);
  blob(wag,SPH,fur(FUR.black),0,0.02,-0.06,0.08,0.08,0.12);
  blob(wag,SPH,fur(FUR.black),0,0.0,-0.16,0.075,0.07,0.12);
  blob(wag,SPH,fur(FUR.tan),0,-0.02,-0.16,0.06,0.05,0.1,false);
  blob(wag,SPH,fur(FUR.tan),0,-0.02,-0.26,0.065,0.06,0.1);
  blob(wag,SPH,fur(FUR.black),0,0.02,-0.26,0.05,0.045,0.08,false);
  root.scale.setScalar(1.08);
  return {root,body,head,legs,tail:[],wag,wagAxis:'y',tongue,mouth};
}
function makeAnimal(kind,o,home){
  const b=kind==='cat'?makeCat(o):kind==='dog'?(o.breed==='shepherd'?makeShepherd(o):makeDog(o)):makeBunny(o);
  const[hx,hz]=snapWalkable(home[0],home[1]);
  const e=Object.assign(b,{kind,name:o.name,x:hx,z:hz,yaw:Math.random()*6.28,home:[hx,hz],state:'idle',timer:rnd(1,4),path:null,wp:0,moving:0,phase:0,
    idlePose:'stand',sitK:0,loafK:0,lastPet:-99,lastGreet:-99,repath:0,happy:0});
  e.root.position.set(hx,walkHeight(hx,hz),hz);scene.add(e.root);return e;
}
const PETS=[
  makeAnimal('cat',{name:'Mochi',col:'#f2a65a',accent:'#fff7ee',stripes:'#d9833a'},[29,7]),
  makeAnimal('cat',{name:'Sumi',col:'#8c8f99',accent:'#f2f0ea',tip:'#f2f0ea'},[-31,33]),
  makeAnimal('cat',{name:'Kuro',col:'#2c2b30',accent:'#f4f1ea'},[-6,-2]),
  makeAnimal('bunny',{name:'Daifuku',col:'#f5f1ea',accent:'#ffffff'},[36,3]),
  makeAnimal('bunny',{name:'Kinako',col:'#b98f66',accent:'#efe0cc',lop:true},[-14,21])
];
// both dogs start the day in the dog yard and wait for Luna to let them out
const KIKO=makeAnimal('dog',{name:'Kiko'},[-30.4,32.2]),BRUNO=makeAnimal('dog',{name:'Bruno',breed:'shepherd'},[-33.2,34.2]);
const DOGS=[KIKO,BRUNO];let DOG=KIKO;   // DOG = whichever dog is playing fetch
DOGS.forEach((d,i)=>{d.state='kennel';d.side=i?-1:1;d.lastGreet=-99;d.root.rotation.order='YXZ';});
const ALL_ANIMALS=[...PETS,...DOGS];
for(const e of ALL_ANIMALS)e.root.userData.noWx=true;

function animatePet(e,dt,time){
  const mv=clamp(e.moving/1.4,0,1);
  e.phase+=dt*e.moving*(e.kind==='bunny'?5:7.5);
  const s=Math.sin(e.phase),still=mv<0.1;
  const resting=e.state==='idle'||e.state==='onSwing'||e.state==='inside'||e.state==='petted'||e.state==='await'||e.state==='sitWait'||(e.kind==='dog'&&(e.state==='follow'||e.state==='kennel')&&still);
  const pose=e.state==='petted'?(e.kind==='cat'?'loaf':'sit'):(resting?e.idlePose:'stand');
  e.sitK=lerp(e.sitK,still&&pose==='sit'?1:0,Math.min(1,dt*5));
  e.loafK=lerp(e.loafK,still&&pose==='loaf'?1:0,Math.min(1,dt*4));
  if(e.kind==='bunny'){
    e.body.position.y=Math.abs(s)*0.14*mv-0.03*e.loafK;
    e.body.rotation.x=-Math.cos(e.phase)*0.25*mv;
    e.ears.forEach((g,i)=>{g.rotation.x=-0.25*mv*Math.sin(e.phase+1)+Math.sin(time*1.7+i)*0.06+(pose==='groom'&&still?-0.5:0);});
    const nib=pose==='nibble'&&still;
    e.head.rotation.x=lerp(e.head.rotation.x,nib?0.45+Math.sin(time*9)*0.06:(pose==='groom'&&still?0.3+Math.sin(time*6)*0.15:0),Math.min(1,dt*6));
  }else{
    const sw=0.65*mv;
    e.legs[0].rotation.x=s*sw;e.legs[3].rotation.x=s*sw;e.legs[1].rotation.x=-s*sw;e.legs[2].rotation.x=-s*sw;
    e.body.rotation.x=lerp(e.body.rotation.x,-0.42*e.sitK,Math.min(1,dt*6));
    e.body.position.y=-0.07*e.sitK-0.13*e.loafK+Math.abs(s)*0.02*mv;
    e.legs[2].rotation.x+=1.1*e.sitK+1.3*e.loafK;e.legs[3].rotation.x+=1.1*e.sitK+1.3*e.loafK;
    e.legs[0].rotation.x+=0.42*e.sitK-1.3*e.loafK;e.legs[1].rotation.x+=0.42*e.sitK-1.3*e.loafK;
    const happy=e.state==='petted'||e.happy>0;
    e.tail.forEach((g,i)=>{g.rotation.y=Math.sin(time*(happy?3.2:1.5)+i*0.7)*(0.22+0.05*i);g.rotation.x=i===0?(happy?1.2:0.5+0.3*mv):0.16;});
    if(e.wag)e.wag.rotation[e.wagAxis||'z']=Math.sin(time*(happy?20:mv>0.1?12:6))*(happy?0.7:0.4);
    if(e.tongue)e.tongue.visible=e.moving>2.5||happy;
    const groom=e.kind==='cat'&&pose==='groom'&&still;
    e.head.rotation.x=lerp(e.head.rotation.x,groom?0.5+Math.sin(time*7)*0.12:0,Math.min(1,dt*6));
  }
  // look toward Luna when she is close
  const dL=Math.hypot(AI.x-e.x,AI.z-e.z);
  let hy=0;if(dL<4.5)hy=clamp(normalizeAngle(Math.atan2(AI.x-e.x,AI.z-e.z)-e.yaw),-0.9,0.9);
  e.head.rotation.y=lerp(e.head.rotation.y,hy,Math.min(1,dt*5));
  e.root.position.set(e.x,walkHeight(e.x,e.z),e.z);e.root.rotation.y=e.yaw;
}
function faceLuna(e,dt){e.yaw+=normalizeAngle(Math.atan2(AI.x-e.x,AI.z-e.z)-e.yaw)*Math.min(1,dt*4);}
const IDLE_POSES={cat:['sit','loaf','groom','stand','sit'],bunny:['nibble','sit','groom','nibble'],dog:['sit','stand']};

function updatePet(e,dt,time){
  const dL=Math.hypot(AI.x-e.x,AI.z-e.z);e.timer-=dt;
  const speed=e.kind==='bunny'?1.7:1.15;
  if(e.state==='idle'){
    e.moving=Math.max(0,e.moving-dt*5);
    if(e.timer<=0&&!petThink(e)){
      const wet=WEATHER.rainK>0.4;
      if(!wet&&dL<7&&Math.random()<0.35){e.state='approach';e.goal='luna';e.repath=0;e.timer=12;}
      else{const[tx,tz]=randomSpotNear(e.home[0],e.home[1],wet?2:e.kind==='bunny'?6:9);e.path=planPath(e.x,e.z,tx,tz);e.wp=0;e.state='wander';e.timer=20;}
    }
  }else if(e.state==='wander'){
    if(e.flee>0)e.flee=Math.max(0,e.flee-dt);
    if(followPath(e,dt,speed*(e.flee>0?2.1:1))||e.timer<=0){e.state='idle';e.timer=e.napAfter?rnd(18,30):rnd(3,9);e.idlePose=e.napAfter||WEATHER.rainK>0.4?'loaf':pick(IDLE_POSES[e.kind]);e.napAfter=false;}
  }else if(e.state==='approach'){
    e.repath-=dt;
    const H=e.goal==='solon'&&!SL.inside?SL:e.goal==='moon'&&!LM.inside?LM:AI,dH=Math.hypot(H.x-e.x,H.z-e.z);
    if(e.repath<=0){const a=Math.atan2(e.x-H.x,e.z-H.z);e.path=planPath(e.x,e.z,H.x+Math.sin(a)*1.3,H.z+Math.cos(a)*1.3);e.wp=0;e.repath=1.2;}
    followPath(e,dt,speed*1.35);
    if(dH<1.7||e.timer<=0||dH>26){e.state='idle';e.timer=rnd(4,7);e.idlePose='sit';
      if(dH<2.2){if(e.beg)emote(e.root,'food',e.kind==='bunny'?0.65:0.8);else{e.lonely=Math.max(0,e.lonely-0.25);if(Math.random()<0.6)emote(e.root,'heart',e.kind==='bunny'?0.65:0.8);}}}
  }else if(e.state==='toBowl'){
    if(e.bowl.food<0.08){e.state='idle';e.timer=1;}
    else if(followPath(e,dt,speed*1.2)||e.timer<=0){if(Math.hypot(e.bowl.x-e.x,e.bowl.z-e.z)<2.2){e.state='eat';e.timer=rnd(4,6);e.idlePose=e.kind==='bunny'?'nibble':'sit';}else{e.state='idle';e.timer=2;}}
  }else if(e.state==='eat'){
    e.moving=Math.max(0,e.moving-dt*5);e.yaw+=normalizeAngle(Math.atan2(e.bowl.x-e.x,e.bowl.z-e.z)-e.yaw)*Math.min(1,dt*4);e.head.rotation.x=lerp(e.head.rotation.x,0.5+Math.sin(time*9)*0.08,Math.min(1,dt*6));
    if(e.timer<=0){e.hunger=0;e.beg=false;e.bowl.food=Math.max(0,e.bowl.food-0.25);e.state='idle';e.timer=rnd(5,9);e.idlePose=e.kind==='cat'?'groom':'sit';emote(e.root,'heart',e.kind==='bunny'?0.65:0.8);}
  }else if(e.state==='play'){   // pouncing at Lady Moon's dangling yarn
    if(!(LM.state==='act'&&LM.act==='yarnPlay')){e.state='idle';e.timer=rnd(2,4);}
    else{e.playT=(e.playT||0)+dt;const a=e.playT*1.6,tx=LM.x+Math.sin(LM.yaw)*0.9+Math.cos(a)*0.5,tz=LM.z+Math.cos(LM.yaw)*0.9+Math.sin(a)*0.5,dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);
      if(d>0.05){const sp=Math.min(d/dt,2.6);e.x+=dx/d*sp*dt;e.z+=dz/d*sp*dt;e.moving=sp;e.yaw+=normalizeAngle(Math.atan2(LM.x-e.x,LM.z-e.z)-e.yaw)*Math.min(1,dt*6);}
      if(Math.random()<dt*0.6)emote(e.root,Math.random()<0.5?'heart':'note',0.8,1.2,0.5);}
  }else if(e.state==='await'){
    e.moving=Math.max(0,e.moving-dt*5);if(dL<6)faceLuna(e,dt);e.idlePose='sit';
    if(e.timer<=0){e.state='idle';e.timer=rnd(1,3);}
  }else if(e.state==='petted'){
    e.moving=0;if(e.petBy==='solon')e.yaw+=normalizeAngle(Math.atan2(SL.x-e.x,SL.z-e.z)-e.yaw)*Math.min(1,dt*4);else if(e.petBy==='moon')e.yaw+=normalizeAngle(Math.atan2(LM.x-e.x,LM.z-e.z)-e.yaw)*Math.min(1,dt*4);else faceLuna(e,dt);e.lonely=Math.max(0,e.lonely-dt*0.25);
  }
  // friendly glance + heart when Luna walks by
  if(dL<2.6&&AI.state==='walk'&&time-e.lastGreet>18&&e.state!=='petted'){e.lastGreet=time;if(Math.random()<0.35)emote(e.root,'heart',e.kind==='bunny'?0.65:0.8,1.6,0.5);}
  animatePet(e,dt,time);
}

/* ---------------- the ball (for fetch) ---------------- */
const BALL={mesh:new T.Mesh(new T.SphereGeometry(0.09,12,10),mStd('#ff5d5d',{roughness:0.5})),state:'none',from:new T.Vector3(),target:[0,0],t:0,dur:1,bounce:0};
BALL.mesh.castShadow=true;BALL.mesh.visible=false;scene.add(BALL.mesh);
function updateBall(dt,time){
  if(BALL.state==='none'){BALL.mesh.visible=false;return;}
  BALL.mesh.visible=true;
  if(BALL.state==='held'){caretaker.handR.getWorldPosition(_wp);BALL.mesh.position.copy(_wp);}
  else if(BALL.state==='flying'){BALL.t+=dt;const k=Math.min(1,BALL.t/BALL.dur),[tx,tz]=BALL.target,ty=walkHeight(tx,tz)+0.09;
    BALL.mesh.position.set(lerp(BALL.from.x,tx,k),lerp(BALL.from.y,ty,k)+Math.sin(k*Math.PI)*2.4,lerp(BALL.from.z,tz,k));
    if(k>=1){BALL.state='ground';BALL.bounce=0.35;}}
  else if(BALL.state==='ground'){const[tx,tz]=BALL.target;BALL.bounce=Math.max(0,BALL.bounce-dt*0.6);
    BALL.mesh.position.set(tx,walkHeight(tx,tz)+0.09+Math.abs(Math.sin(time*12))*BALL.bounce,tz);}
  else if(BALL.state==='dog'){DOG.mouth.getWorldPosition(_wp);BALL.mesh.position.copy(_wp);}
}

/* ---------------- the dog yard: both dogs start here until Luna lets them out ---------------- */
const YARD_BOX={x0:-37.3,x1:-26.8,z0:27.7,z1:36.3};
const GATE_SPOT=snapWalkable(-24.2,31.2),GATE_IN=[-27.7,31.2];
function inYard(x,z){return x>YARD_BOX.x0&&x<YARD_BOX.x1&&z>YARD_BOX.z0&&z<YARD_BOX.z1;}
function yardSpot(){for(let i=0;i<30;i++){const x=rnd(YARD_BOX.x0+0.8,YARD_BOX.x1-0.8),z=rnd(YARD_BOX.z0+0.8,YARD_BOX.z1-0.8);if(isCellOpen(x,z))return[x,z];}return GATE_IN;}
const GATE=(function(){
  // two wooden gate leaves hung in the gap of the yard fence
  const leaves=[],x=-26,openAt=[28.67,33.67];
  for(let i=0;i<2;i++){const hz=openAt[i],dir=i?-1:1,g=new T.Group();g.position.set(x,hAt(x,hz),hz);scene.add(g);
    const leaf=new T.Group();g.add(leaf);const wood=mStd('#8a6143'),dark=mStd('#3b2a20');
    for(const y of[0.32,0.88])blob(leaf,BOX,wood,0,y,dir*1.25,0.08,0.12,2.45);
    for(let k=0;k<6;k++)blob(leaf,BOX,wood,0,0.62,dir*(0.2+k*0.42),0.07,0.95,0.12);
    blob(leaf,BOX,dark,0,0.6,dir*0.06,0.12,1.2,0.12);
    const brace=blob(leaf,BOX,wood,0,0.6,dir*1.25,0.06,0.1,2.6);brace.rotation.x=dir*0.42;
    leaves.push({leaf,dir});}
  return {leaves,open:0,target:0,closeAt:0,hold:false,update(dt){
    // swings open for Luna whenever she walks through, and for the let-out / bedtime routine
    const gateWalk=(o,st)=>st==='walk'&&Math.hypot(o.x+26,o.z-31.2)<2.6;
    if(gateWalk(AI,AI.state)||(!LM.inside&&gateWalk(LM,LM.state))||(!SL.inside&&gateWalk(SL,SL.state))){this.target=1;if(this.closeAt)this.closeAt=Math.max(this.closeAt,simTime+2.5);else if(!this.hold)this.closeAt=simTime+2.5;}
    if(this.closeAt&&simTime>this.closeAt&&!this.hold){this.target=0;this.closeAt=0;}
    this.open+=clamp(this.target-this.open,-dt*1.6,dt*1.6);
    const e=smooth(0,1,this.open);for(const l of this.leaves)l.leaf.rotation.y=l.dir*e*1.45;}};
})();
const KENNEL_SPOTS=[snapWalkable(-29.6,32.9),snapWalkable(-33.4,31.6)];
DOGS.forEach((d,i)=>{d.kennelSpot=KENNEL_SPOTS[i];});

const _sw=new T.Vector3();
function dogHopOff(d){d.state='hopOff';d.hopT=0;SWING.dogA.getWorldPosition(_sw);d.hopFrom=[_sw.x,_sw.y,_sw.z];
  const fx=SWING.front[0]+Math.cos(SWING.ry)*0.9,fz=SWING.front[1]-Math.sin(SWING.ry)*0.9;d.hopTo=snapWalkable(fx,fz);}
function swingDog(d,dt,time){
  d.hopT=(d.hopT||0)+dt;SWING.dogA.getWorldPosition(_sw);
  if(d.state==='hopOn'){const k=Math.min(1,d.hopT/0.75),f=d.hopFrom,x=lerp(f[0],_sw.x,k),y=lerp(f[1],_sw.y,k)+Math.sin(k*Math.PI)*0.9,z=lerp(f[2],_sw.z,k);
    d.yaw+=normalizeAngle((k<0.7?Math.atan2(_sw.x-f[0],_sw.z-f[2]):SWING.ry)-d.yaw)*Math.min(1,dt*8);d.moving=k<1?3:0;animatePet(d,dt,time);d.root.position.set(x,y,z);d.x=x;d.z=z;
    if(k>=1){d.state='onSwing';d.happy=3;emote(d.root,'heart',0.95);}}
  else if(d.state==='onSwing'){d.moving=0;d.idlePose='sit';d.happy=1;d.yaw=SWING.ry;animatePet(d,dt,time);d.root.position.copy(_sw);d.root.rotation.x=SWING.pv.rotation.x;d.x=_sw.x;d.z=_sw.z;}
  else{const k=Math.min(1,d.hopT/0.7),f=d.hopFrom,to=d.hopTo,ty=walkHeight(to[0],to[1]),x=lerp(f[0],to[0],k),y=lerp(f[1],ty,k)+Math.sin(k*Math.PI)*0.7,z=lerp(f[2],to[1],k);
    d.moving=2.5;d.root.rotation.x=0;animatePet(d,dt,time);d.root.position.set(x,y,z);d.x=x;d.z=z;if(k>=1){d.state='follow';d.path=null;}}
}
function updateDog(d,dt,time){
  if(d.state==='hopOn'||d.state==='onSwing'||d.state==='hopOff'){swingDog(d,dt,time);return;}
  if(d.state==='zoomies'){zoomiesUpdate(d,dt,time);animatePet(d,dt,time);return;}
  const dL=Math.hypot(AI.x-d.x,AI.z-d.z);
  d.happy=Math.max(0,d.happy-dt);d.timer-=dt;
  if(d.state==='kennel'){
    const night=nightK>0.55,gateL=Math.hypot(AI.x-GATE_SPOT[0],AI.z-GATE_SPOT[1]),gateS=SL.inside?1e9:Math.hypot(SL.x-GATE_SPOT[0],SL.z-GATE_SPOT[1]),gateD=Math.min(gateL,gateS);
    let goal=null;
    if(!night&&gateD<10)goal=[GATE_IN[0]-(d.side>0?0:0.8),GATE_IN[1]+d.side*0.8];   // Luna's coming: wait at the gate
    else if(night)goal=d.kennelSpot;
    if(goal){
      if(Math.hypot(goal[0]-d.x,goal[1]-d.z)>0.5){d.repath-=dt;if(d.repath<=0||!d.path){d.path=planPath(d.x,d.z,goal[0],goal[1]);d.wp=0;d.repath=1.5;}followPath(d,dt,night?1.4:3,8);}
      else{d.moving=Math.max(0,d.moving-dt*5);
        if(night){d.idlePose='loaf';if(time-d.lastGreet>9){d.lastGreet=time;emote(d.root,'zzz',0.85,1.6,0.45);}}
        else{d.idlePose='sit';d.happy=1;if(gateS<gateL)d.yaw+=normalizeAngle(Math.atan2(SL.x-d.x,SL.z-d.z)-d.yaw)*Math.min(1,dt*4);else faceLuna(d,dt);if(time-d.lastGreet>5){d.lastGreet=time;emote(d.root,'heart',0.95,1.5,0.5);}}}
    }else{
      if(d.timer<=0){const[tx,tz]=yardSpot();d.path=planPath(d.x,d.z,tx,tz);d.wp=0;d.timer=rnd(5,11);d.idlePose=pick(IDLE_POSES.dog);}
      followPath(d,dt,1.7,8);
    }
    if(!inYard(d.x,d.z)){d.x=clamp(d.x,YARD_BOX.x0+0.2,YARD_BOX.x1-0.2);d.z=clamp(d.z,YARD_BOX.z0+0.2,YARD_BOX.z1-0.2);}
  }else if(d.state==='toKennel'){
    const[kx,kz]=d.kennelSpot;d.repath-=dt;d.kennelT=(d.kennelT||0)+dt;
    if(d.repath<=0||!d.path){d.path=planPath(d.x,d.z,kx,kz);d.wp=0;d.repath=1.5;}
    followPath(d,dt,3.2,8);
    if((Math.hypot(kx-d.x,kz-d.z)<0.7&&inYard(d.x,d.z))||d.kennelT>25){if(!inYard(d.x,d.z)){d.x=kx;d.z=kz;}d.state='kennel';d.kennelT=0;d.idlePose='loaf';d.timer=rnd(4,8);}
  }else if(d.state==='chase'){
    const[bx,bz]=BALL.target;d.repath-=dt;
    if(d.repath<=0){d.path=planPath(d.x,d.z,bx,bz);d.wp=0;d.repath=0.8;}
    followPath(d,dt,5.4,10);
    if(BALL.state==='ground'&&Math.hypot(d.x-bx,d.z-bz)<0.7){BALL.state='dog';d.state='return';d.repath=0;d.happy=2;}
  }else if(d.state==='return'){
    d.repath-=dt;
    if(d.repath<=0){d.path=planPath(d.x,d.z,AI.x+Math.sin(AI.yaw)*1.1,AI.z+Math.cos(AI.yaw)*1.1);d.wp=0;d.repath=0.7;}
    followPath(d,dt,4.8,10);
    if(dL<1.5){BALL.state='held';d.state='sitWait';d.idlePose='sit';d.happy=3;emote(d.root,'heart',0.95);BRAIN.fetchReturned=true;}
  }else if(d.state==='sitWait'||d.state==='petted'||d.state==='await'){
    d.moving=Math.max(0,d.moving-dt*5);if(d.petBy==='solon'&&d.state==='petted')d.yaw+=normalizeAngle(Math.atan2(SL.x-d.x,SL.z-d.z)-d.yaw)*Math.min(1,dt*4);else if(d.petBy==='moon'&&d.state==='petted')d.yaw+=normalizeAngle(Math.atan2(LM.x-d.x,LM.z-d.z)-d.yaw)*Math.min(1,dt*4);else faceLuna(d,dt);d.idlePose='sit';
    if(d.state==='await'&&d.timer<=0)d.state='follow';
    if(d.state==='petted')d.happy=1;
  }else{ // follow Luna around, one dog at each shoulder
    const busy=AI.state!=='walk';
    const tx=AI.x-Math.sin(AI.yaw)*1.8+Math.cos(AI.yaw)*d.side*1.3,tz=AI.z-Math.cos(AI.yaw)*1.8-Math.sin(AI.yaw)*d.side*1.3;
    const dT=Math.hypot(tx-d.x,tz-d.z);
    if(busy&&dL<3.6){d.moving=Math.max(0,d.moving-dt*5);faceLuna(d,dt);d.idlePose=d.timer>0?d.idlePose:(d.timer=rnd(4,9),pick(IDLE_POSES.dog));}
    else if(dT>1.0){
      d.repath-=dt;if(d.repath<=0||!d.path){d.path=planPath(d.x,d.z,tx,tz);d.wp=0;d.repath=0.9;}
      followPath(d,dt,clamp(dL*1.1,2.2,5.6),9);
    }else{d.moving=Math.max(0,d.moving-dt*4);}
    if(dL>45){const[sx,sz]=randomSpotNear(AI.x,AI.z,4,2);d.x=sx;d.z=sz;d.path=null;}
  }
  animatePet(d,dt,time);
}

/* ---------------- koi in the ponds ---------------- */
const KOI=[];
function makeKoi(i){
  const cv=document.createElement('canvas');cv.width=128;cv.height=64;const c=cv.getContext('2d'),r=mulberry32(900+i);
  c.fillStyle=['#fff8f0','#ff8a3d','#fff8f0','#f4d35e','#fff8f0'][i%5];c.fillRect(0,0,128,64);
  for(let k=0;k<6;k++){c.fillStyle=k%4===3?'#262326':(i%2?'#e2402f':'#ff7a29');c.beginPath();c.ellipse(r()*128,r()*64,9+r()*18,7+r()*12,0,0,6.2832);c.fill();}
  const tex=new T.CanvasTexture(cv);
  const g=new T.Group();blob(g,SPH,new T.MeshStandardMaterial({map:tex,roughness:0.4}),0,0,0,0.075,0.055,0.24,false);
  const finMat=new T.MeshStandardMaterial({color:'#ffc39a',transparent:true,opacity:0.8,side:T.DoubleSide,roughness:0.5});
  const tail=new T.Group();tail.position.set(0,0,-0.21);g.add(tail);
  const fin=new T.Mesh(new T.PlaneGeometry(0.2,0.17),finMat);fin.rotation.y=Math.PI/2;fin.position.z=-0.08;tail.add(fin);
  for(const s of[-1,1]){const sf=new T.Mesh(new T.PlaneGeometry(0.08,0.05),finMat);sf.rotation.x=-Math.PI/2;sf.position.set(s*0.08,-0.02,0.06);g.add(sf);}
  scene.add(g);return {root:g,tail};
}
for(let i=0;i<10;i++){const P=i<5?PA:PB,k=makeKoi(i);
  Object.assign(k,{P,x:P.x+rnd(-3,3),z:P.z+rnd(-3,3),yaw:rnd(0,6.28),speed:rnd(0.4,0.8),tx:P.x,tz:P.z,depth:rnd(0.14,0.3),ph:rnd(0,6)});KOI.push(k);}
function updateKoi(dt,time){
  for(const k of KOI){
    if(Math.hypot(k.tx-k.x,k.tz-k.z)<0.6){const a=rnd(0,6.28),d=rnd(0,k.P.r-2.2);k.tx=k.P.x+Math.cos(a)*d;k.tz=k.P.z+Math.sin(a)*d;k.speed=rnd(0.35,0.9);}
    k.yaw+=normalizeAngle(Math.atan2(k.tx-k.x,k.tz-k.z)-k.yaw)*Math.min(1,dt*1.6);
    k.x+=Math.sin(k.yaw)*k.speed*dt;k.z+=Math.cos(k.yaw)*k.speed*dt;
    k.root.position.set(k.x,WATER-k.depth+Math.sin(time*0.8+k.ph)*0.03,k.z);k.root.rotation.y=k.yaw;
    k.tail.rotation.y=Math.sin(time*(6+k.speed*8)+k.ph)*0.45;
  }
}

/* ---------------- seagulls ---------------- */
const GULLS=[];
function makeGull(){
  const g=new T.Group(),w=mStd('#f7f5f0',{roughness:0.8}),grey=mStd('#a3acb6'),tip=mStd('#2d3036'),beak=mStd('#f2b13a');
  blob(g,SPH,w,0,0,0,0.16,0.15,0.5);blob(g,SPH,w,0,0.08,0.42,0.12,0.12,0.14);
  const bk=blob(g,CONE,beak,0,0.06,0.6,0.035,0.14,0.035,false);bk.rotation.x=Math.PI/2;
  for(const s of[-1,1])blob(g,SPH,tip,s*0.08,0.12,0.5,0.018,0.018,0.018,false);
  blob(g,SPH,grey,0,0.02,-0.45,0.1,0.04,0.2);
  const wings=[];
  for(const s of[-1,1]){const inner=new T.Group();inner.position.set(s*0.12,0.06,0.02);g.add(inner);
    blob(inner,SPH,grey,s*0.42,0,0,0.44,0.03,0.17);
    const outer=new T.Group();outer.position.set(s*0.84,0,0);inner.add(outer);
    blob(outer,SPH,grey,s*0.32,0,-0.03,0.34,0.025,0.13);blob(outer,SPH,tip,s*0.6,0,-0.05,0.12,0.022,0.08,false);
    wings.push({inner,outer,s});}
  g.scale.setScalar(1.4);g.rotation.order='YXZ';scene.add(g);return {root:g,wings};
}
for(let i=0;i<7;i++){const gl=makeGull();Object.assign(gl,{R:rnd(28,52),w:rnd(0.15,0.26)*(i%3?1:-1),th:rnd(0,6.28),h:rnd(24,40),cx:rnd(-10,10),cz:rnd(-10,10),ph:rnd(0,10),away:i>3?1:0,goAway:i>3,stay:rnd(20,90)});GULLS.push(gl);}
function updateGulls(dt,time){
  const badWx=WEATHER.rainK>0.35||WEATHER.snowK>0.5||nightK>0.75;
  for(const g of GULLS){
    // each gull visits for a while, then flies off out to sea and comes back later
    g.stay-=dt;if(g.stay<=0){g.goAway=!g.goAway;g.stay=g.goAway?rnd(25,80):rnd(35,100);}
    const leave=g.goAway||badWx;g.away=approach(g.away,leave?1:0,dt*0.07);
    g.root.visible=g.away<0.97;if(!g.root.visible)continue;
    const e=g.away*g.away;
    g.th+=g.w*dt;const cx=g.cx+Math.sin(time*0.02+g.ph)*14,cz=g.cz+Math.cos(time*0.017+g.ph)*14,R=g.R*(1+e*7);
    const x=cx+Math.cos(g.th)*R,z=cz+Math.sin(g.th)*R,y=g.h+Math.sin(time*0.4+g.ph)*3+e*55;
    const vx=-Math.sin(g.th)*g.w,vz=Math.cos(g.th)*g.w;
    g.root.position.set(x,y,z);g.root.rotation.set(-Math.cos(time*0.4+g.ph)*0.08,Math.atan2(vx,vz),Math.sign(g.w)*0.32);
    const flapping=Math.sin(time*0.6+g.ph)>-0.1,f=flapping?Math.sin(time*9+g.ph)*0.55:0.1;
    for(const w of g.wings){w.inner.rotation.z=w.s*f;w.outer.rotation.z=w.s*(flapping?Math.sin(time*9+g.ph-0.7)*0.4:0.06);}
  }
}

/* ---------------- butterflies (day) and fireflies (night) ---------------- */
const BUTTERFLIES=[];
{const homes=[[40,-10],[40,14],[3.5,-12],[-15,31],[16,9],[-30,10],[-32,30],[30,-17]];
 for(let i=0;i<10;i++){
  const col=pick(['#ffd24d','#ff9ab8','#9fd0ff','#ffffff','#ffb36b','#c9a0ff']);
  const m=new T.MeshStandardMaterial({color:col,side:T.DoubleSide,roughness:0.7,emissive:col,emissiveIntensity:0.2});
  const g=new T.Group(),wg=new T.PlaneGeometry(0.17,0.14);wg.rotateX(-Math.PI/2);wg.translate(0.085,0,0);
  const wr=new T.Group(),wl=new T.Group();wl.scale.x=-1;wr.add(new T.Mesh(wg,m));wl.add(new T.Mesh(wg,m));g.add(wr,wl);
  blob(g,CYL,mStd('#2a2420'),0,0,0,0.012,0.12,0.012,false).rotation.x=Math.PI/2;
  const h=homes[i%homes.length];scene.add(g);
  BUTTERFLIES.push({g,wr,wl,hx:h[0],hz:h[1],x:h[0],z:h[1],y:1,tx:h[0],tz:h[1],ty:1,ph:rnd(0,6)});
 }}
const FF_N=70,ffPos=new Float32Array(FF_N*3),FF=[];
for(let i=0;i<FF_N;i++){const c=pick([PA,PB,{x:16,z:8},{x:-30,z:10},{x:3,z:-12},{x:24,z:28}]);const[x,z]=randomSpotNear(c.x,c.z,12);FF.push({x,z,y:walkHeight(x,z)+rnd(0.4,1.8),ph:rnd(0,6.28)});}
const ffGeo=new T.BufferGeometry();ffGeo.setAttribute('position',new T.BufferAttribute(ffPos,3));
const ffMat=new T.PointsMaterial({color:0xfff2a0,size:0.22,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
const fireflies=new T.Points(ffGeo,ffMat);fireflies.frustumCulled=false;scene.add(fireflies);
function updateSmallLife(dt,time){
  const day=(1-smooth(0.4,0.75,nightK))*(1-WEATHER.over);
  for(const b of BUTTERFLIES){
    b.g.visible=day>0.05;if(!b.g.visible)continue;
    if(Math.hypot(b.tx-b.x,b.tz-b.z)<0.4){b.tx=b.hx+rnd(-5,5);b.tz=b.hz+rnd(-5,5);b.ty=rnd(0.5,1.7);}
    const dx=b.tx-b.x,dz=b.tz-b.z,d=Math.hypot(dx,dz)||1;
    b.x+=dx/d*dt*1.1+Math.sin(time*3+b.ph)*dt*0.6;b.z+=dz/d*dt*1.1+Math.cos(time*2.6+b.ph)*dt*0.6;b.y=lerp(b.y,b.ty,dt*0.8);
    b.g.position.set(b.x,walkHeight(b.x,b.z)+b.y+Math.sin(time*5+b.ph)*0.12,b.z);b.g.rotation.y=Math.atan2(dx,dz);
    const f=Math.sin(time*16+b.ph)*0.9;b.wr.rotation.z=f;b.wl.rotation.z=-f;
  }
  ffMat.opacity=smooth(0.45,0.9,nightK)*(0.75+0.25*Math.sin(time*3))*(1-WEATHER.over);
  if(ffMat.opacity>0.01){for(let i=0;i<FF_N;i++){const f=FF[i];
    ffPos[i*3]=f.x+Math.sin(time*0.6+f.ph)*0.8;ffPos[i*3+1]=f.y+Math.sin(time*0.9+f.ph*2)*0.35;ffPos[i*3+2]=f.z+Math.cos(time*0.5+f.ph)*0.8;}
    ffGeo.attributes.position.needsUpdate=true;}
}

/* ---------------- sky traffic: banner plane + hot air balloon ---------------- */
const NAVLIGHTS=[];
function makePlane(){
  const g=new T.Group(),body=mStd('#f4efe6',{roughness:0.45,metalness:0.15}),red=mStd('#d9473c',{roughness:0.5}),dark=mStd('#2b2f36'),
    glass=mStd('#8fd0ff',{roughness:0.15,metalness:0.3,emissive:'#1b3a55',emissiveIntensity:0.4});
  blob(g,CYL,body,0,0,0,0.42,3.6,0.42).rotation.x=Math.PI/2;
  blob(g,SPH,red,0,0,1.8,0.42,0.42,0.5);
  blob(g,CONE,body,0,0.05,-2.45,0.38,1.4,0.38).rotation.x=-Math.PI/2;
  blob(g,BOX,red,0,-0.05,0.2,0.86,0.12,3.0);
  blob(g,SPH,glass,0,0.32,0.85,0.28,0.22,0.55);
  blob(g,BOX,body,0,-0.05,0.4,6.4,0.1,1.0);
  for(const s of[-1,1])blob(g,BOX,red,s*3.05,-0.05,0.4,0.32,0.11,1.0);
  blob(g,BOX,body,0,0.1,-2.85,2.3,0.08,0.6);blob(g,BOX,red,0,0.65,-2.85,0.08,1.1,0.8);
  for(const s of[-1,1]){blob(g,CYL,dark,s*0.55,-0.62,0.75,0.16,0.08,0.16).rotation.z=Math.PI/2;blob(g,BOX,dark,s*0.5,-0.4,0.75,0.04,0.4,0.06);}
  const prop=new T.Group();prop.position.set(0,0,2.33);g.add(prop);
  blob(prop,BOX,dark,0,0,0,0.12,1.7,0.04);blob(prop,BOX,dark,0,0,0,1.7,0.12,0.04);blob(prop,SPH,red,0,0,0.06,0.13,0.13,0.13);
  const lr=new T.Mesh(new T.SphereGeometry(0.1,8,6),new T.MeshBasicMaterial({color:0xff3b3b}));lr.position.set(-3.22,-0.05,0.4);g.add(lr);
  const lg=new T.Mesh(new T.SphereGeometry(0.1,8,6),new T.MeshBasicMaterial({color:0x3bff6a}));lg.position.set(3.22,-0.05,0.4);g.add(lg);
  const lw=new T.Mesh(new T.SphereGeometry(0.1,8,6),new T.MeshBasicMaterial({color:0xffffff}));lw.position.set(0,1.25,-3.2);g.add(lw);
  NAVLIGHTS.push(lr,lg,lw);
  // tow rope + banner (two faces so the text reads correctly from either side)
  blob(g,CYL,mStd('#d9cbb0'),0,-0.1,-5.8,0.02,5.2,0.02,false).rotation.x=Math.PI/2;
  const bcv=document.createElement('canvas');bcv.width=1024;bcv.height=192;const bc=bcv.getContext('2d');
  const btex=new T.CanvasTexture(bcv);
  function drawBanner(){bc.fillStyle='#fff6e6';bc.fillRect(0,0,1024,192);bc.strokeStyle='#c63a2f';bc.lineWidth=10;bc.strokeRect(8,8,1008,176);
    const txt="♥ Welcome to Luna's Cozy Pets ♥";let fs=80;bc.fillStyle='#c63a2f';bc.textAlign='center';bc.textBaseline='middle';
    do{bc.font='700 '+fs+'px "Zen Maru Gothic", "Nunito", sans-serif';fs-=4;}while(bc.measureText(txt).width>950&&fs>28);
    bc.fillText(txt,512,100);btex.needsUpdate=true;}
  drawBanner();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(drawBanner);
  const bmat=new T.MeshStandardMaterial({map:btex,roughness:0.9,emissive:'#ffffff',emissiveMap:btex,emissiveIntensity:0.15});
  const banners=[];
  for(const s of[1,-1]){const geo=new T.PlaneGeometry(12,2.2,24,1),m=new T.Mesh(geo,bmat);m.rotation.y=s*Math.PI/2;m.position.set(s*0.01,-0.4,-14.4);m.castShadow=true;g.add(m);banners.push({geo,s,base:geo.attributes.position.array.slice()});}
  g.scale.setScalar(1.3);scene.add(g);return {root:g,prop,banners};
}
const PLANE=Object.assign(makePlane(),{dist:0,len:840,pause:0,start:new T.Vector3(),dir:new T.Vector3(),alt:50});
function newPlanePass(){
  const h=Math.random()*Math.PI*2,off=rnd(-16,16);
  PLANE.dir.set(Math.cos(h),0,Math.sin(h));
  PLANE.start.set(-Math.sin(h)*off-PLANE.dir.x*420,0,Math.cos(h)*off-PLANE.dir.z*420);
  PLANE.dist=0;PLANE.alt=rnd(40,55);
}
newPlanePass();PLANE.dist=250; // first pass starts on approach so it shows up soon
function updatePlane(dt,time){
  const P=PLANE;
  if(P.pause>0||(P.dist<30&&WEATHER.over>0.5)){P.pause=Math.max(0,P.pause-dt);P.root.visible=false;return;}
  P.root.visible=true;P.dist+=21*dt;
  P.root.position.set(P.start.x+P.dir.x*P.dist,P.alt+Math.sin(time*0.5)*1.2,P.start.z+P.dir.z*P.dist);
  P.root.rotation.set(0,Math.atan2(P.dir.x,P.dir.z),Math.sin(time*0.7)*0.05);
  P.prop.rotation.z+=dt*40;
  const blink=(time%1.2)<0.12;NAVLIGHTS[2].visible=blink;
  for(const b of P.banners){const p=b.geo.attributes.position;
    for(let i=0;i<p.count;i++){const xl=b.base[i*3],u=b.s>0?(xl+6)/12:(6-xl)/12;p.setZ(i,b.s*Math.sin(u*9-time*8)*0.35*(0.15+u));}
    p.needsUpdate=true;b.geo.computeVertexNormals();}
  if(P.dist>P.len){P.pause=rnd(5,12);newPlanePass();}
}
function makeBalloon(){
  const g=new T.Group(),pts=[new T.Vector2(0.55,-3.3)];
  for(let i=0;i<=26;i++){const a=-0.95+(Math.PI/2+0.95)*i/26;pts.push(new T.Vector2(Math.max(0.001,3.4*Math.cos(a)),1+3.4*Math.sin(a)));}
  const cv=document.createElement('canvas');cv.width=512;cv.height=256;const c=cv.getContext('2d');
  const gores=['#e8473f','#f6c344','#fff4e0','#4fa3d9','#f6c344','#fff4e0'];
  for(let i=0;i<12;i++){c.fillStyle=gores[i%gores.length];c.fillRect(i*512/12,0,512/12+1,256);}
  c.fillStyle='#fff4e0';c.fillRect(0,92,512,30);c.fillStyle='#e8473f';
  for(let i=0;i<16;i++){const x=16+i*32,y=107;c.beginPath();c.moveTo(x,y+8);c.bezierCurveTo(x-12,y,x-6,y-9,x,y-3);c.bezierCurveTo(x+6,y-9,x+12,y,x,y+8);c.fill();}
  c.fillStyle='#c63a2f';c.fillRect(0,236,512,20);
  const env=new T.Mesh(new T.LatheGeometry(pts,36),new T.MeshStandardMaterial({map:new T.CanvasTexture(cv),roughness:0.7,side:T.DoubleSide}));
  env.castShadow=true;g.add(env);
  const wicker=mStd('#9a6a3a',{roughness:0.95});
  blob(g,BOX,wicker,0,-5.5,0,1.0,0.75,1.0);blob(g,BOX,mStd('#6e4b33'),0,-5.1,0,1.08,0.1,1.08);
  for(const[sx,sz]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const r=blob(g,CYL,mStd('#d9cbb0'),sx*0.47,-4.2,sz*0.47,0.015,1.8,0.015,false);r.rotation.z=-sx*0.04;r.rotation.x=sz*0.04;}
  blob(g,CYL,mStd('#3b3f46',{metalness:0.5,roughness:0.4}),0,-4.35,0,0.14,0.25,0.14,false);
  const flame=blob(g,SPH,new T.MeshStandardMaterial({color:'#ffd27a',emissive:'#ff8a2a',emissiveIntensity:1.5,transparent:true,opacity:0.9}),0,-3.95,0,0.16,0.32,0.16,false);
  g.scale.setScalar(1.3);scene.add(g);return {root:g,flame};
}
const BALLOON=makeBalloon();
for(const o of[PLANE.root,BALLOON.root,BALL.mesh,...KOI.map(k=>k.root),...GULLS.map(g=>g.root),...BUTTERFLIES.map(b=>b.g),fireflies])o.userData.noWx=true;
function updateBalloon(dt,time){
  BALLOON.root.visible=WEATHER.over<0.45;
  const w=0.011,t=time+40;
  BALLOON.root.position.set(36*Math.sin(w*t),31+3*Math.sin(t*0.21),25*Math.sin(2*w*t+0.6));
  BALLOON.root.rotation.y=t*0.05;
  const burn=(t%7)<1.3;
  BALLOON.flame.material.emissiveIntensity=lerp(BALLOON.flame.material.emissiveIntensity,(burn?3.2:0.6)*(1+nightK),Math.min(1,dt*6));
  BALLOON.flame.scale.set(0.16,burn?0.5+Math.sin(time*30)*0.05:0.22,0.16);
}


/* ================= Garden: living beds Luna tends =================
   Daily/weekly upkeep: soil moisture & watering, weeding, pest checks, harvesting.
   Seasonal chores: compost (soil prep), mulching, deadheading, planting the season's crop. */
const SEASON_CROP={spring:{kind:'lettuce',label:'Sowing cool-season greens'},summer:{kind:'tomato',label:'Planting warm-season tomatoes'},
  autumn:{kind:'garlic',label:'Planting fall garlic'},winter:null}[CAL.season];
const KIND_NAME={corn:'corn',pumpkin:'pumpkins',tomato:'tomatoes',carrot:'carrots',kale:'kale',lettuce:'lettuce',garlic:'garlic',flowers:CAL.season==='autumn'?'mums':'flowers'};
const CHORE_DUR={water:[5.5,7],weed:[4.5,6],pests:[4,5.5],harvest:[5,6.5],prep:[5,6.5],mulch:[4,5.5],deadhead:[4,5.5],plant:[5,6.5]};
const CHORE_ICON={water:'drop',weed:'weed',pests:'bug',harvest:'basket',prep:'compost',mulch:'leaf',deadhead:'scissors',plant:'seed'};
const GARDEN_ACTS=new Set(Object.keys(CHORE_DUR));
const BEDS=[];
{const kinds=['pumpkin','tomato','carrot','kale','pumpkin','lettuce'],growth=[1,0.72,0.96,0.5,1,0.82,1,0.7,0.85,0.6];
 VEG_BEDS.forEach((b,i)=>BEDS.push(Object.assign({},b,{type:'veg',i,kind:b.field||kinds[i],moist:R(0.3,0.85),weeds:Math.floor(R(0,3)),pests:i===1?2:0,
   growth:growth[i],stage:'growing',mulch:R(0.15,0.55),lastCheck:-R(0,120),pickN:0,plantN:12,prepK:0,
   spot:[b.bx,b.spotZ!==undefined?b.spotZ:(b.r<2?b.bz+1.9:b.bz-1.9)],look:[b.bx,b.bz]})));
 FLOWER_BEDS.forEach((b,i)=>BEDS.push(Object.assign({},b,{type:'flower',i,kind:'flowers',moist:R(0.35,0.9),weeds:Math.floor(R(0,2)),pests:0,
   faded:R(0.15,0.45),mulch:R(0.2,0.6),lastCheck:-R(0,120),spot:[b.bx,-10],look:[b.bx,b.bz]})));
 for(const b of BEDS){if(!isCellOpen(b.spot[0],b.spot[1])){const s=snapWalkable(b.spot[0],b.spot[1]);b.spot=[s[0],s[1]];}
   const hw=b.type==='veg'?2.3:1.9,hd=b.type==='veg'?0.9:1.3;
   b.weedPos=[...Array(8)].map((_,k)=>[b.bx+(-hw+0.2+(k%4)*(2*hw-0.4)/3)+R(-0.15,0.15),b.bz+(k<4?-hd*0.75:hd*0.75)*(b.type==='veg'?0.05:1)+R(-0.12,0.12)]);
   b.dirty=true;}}

/* visuals: one instanced mesh per part, rebuilt only for beds that changed */
const G_LEAF=new T.InstancedMesh(geo.ico,texMat(TEX.foliage,{bumpScale:0.02,roughness:0.9}),VEG_BEDS.length*12);
const G_TOP=new T.InstancedMesh(geo.cone3,mStd('#ffffff',{flatShading:true}),VEG_BEDS.length*12);
const G_FRUIT=new T.InstancedMesh(SPH,mStd('#ffffff',{roughness:0.55}),VEG_BEDS.length*24);
const G_ROOT=new T.InstancedMesh(CONE,mStd('#f08a2c'),VEG_BEDS.length*12);
const G_WEED=new T.InstancedMesh(geo.cone3,mStd('#ffffff',{flatShading:true}),BEDS.length*8*3);
const G_BUG=new T.InstancedMesh(SPH,mStd('#ffffff',{roughness:0.35}),BEDS.length*4);
const G_HEAD=new T.InstancedMesh(geo.ico,mStd('#ffffff',{flatShading:true}),Math.max(1,FLOWER_BEDS.length*34));
for(const im of[G_LEAF,G_TOP,G_FRUIT,G_ROOT,G_WEED,G_BUG,G_HEAD]){im.frustumCulled=false;im.castShadow=true;im.receiveShadow=true;
  for(let i=0;i<im.count;i++){im.setColorAt(i,new T.Color(1,1,1));}scene.add(im);}
G_WEED.castShadow=G_BUG.castShadow=false;
const mulchTex=canvasTex(128,64,c=>{c.clearRect(0,0,128,64);for(let i=0;i<420;i++){const v=60+Math.random()*70;c.fillStyle=`rgba(${v+40},${v},${v-25},0.95)`;
  c.save();c.translate(Math.random()*128,Math.random()*64);c.rotate(Math.random()*3);c.fillRect(-4,-1,8,2.4);c.restore();}});
for(const b of BEDS){
  const w=b.type==='veg'?4.7:3.9,d=b.type==='veg'?1.9:2.7;
  b.soilMat=new T.MeshStandardMaterial({color:'#6a4a32',roughness:1});
  const soil=new T.Mesh(new T.PlaneGeometry(w,d),b.soilMat);soil.rotation.x=-Math.PI/2;soil.position.set(b.bx,b.y,b.bz);soil.receiveShadow=true;scene.add(soil);
  b.mulchMat=new T.MeshStandardMaterial({map:mulchTex,transparent:true,opacity:0,roughness:1,depthWrite:false});
  const mu=new T.Mesh(new T.PlaneGeometry(w,d),b.mulchMat);mu.rotation.x=-Math.PI/2;mu.position.set(b.bx,b.y+0.012,b.bz);scene.add(mu);
}
const _gm=new T.Matrix4(),_gq=new T.Quaternion(),_ge=new T.Euler(),_gv=new T.Vector3(),_gs=new T.Vector3(),_gc=new T.Color(),_gc2=new T.Color();
function gSet(im,i,x,y,z,sx,sy,sz,col,ry=0,rx=0){_ge.set(rx,ry,0);_gm.compose(_gv.set(x,y,z),_gq.setFromEuler(_ge),_gs.set(sx,sy,sz));im.setMatrixAt(i,_gm);if(col)im.setColorAt(i,_gc.set(col));}
function gHide(im,i){_gm.makeScale(0,0,0);im.setMatrixAt(i,_gm);}
function slotPos(b,s){return [b.bx-2+(s%6)*0.8,b.bz+(s<6?-0.5:0.5)];}
function refreshBed(b){
  b.dirty=false;
  const wet=b.moist,rich=b.prepK||0;
  _gc.set('#8c6c4a').lerp(_gc2.set('#3c281a'),wet).lerp(_gc2.set('#2a1a10'),rich*0.6);b.soilMat.color.copy(_gc);
  b.mulchMat.opacity=Math.min(0.95,b.mulch*1.1);
  if(b.type==='veg'){
    for(let s=0;s<12;s++){
      const li=b.i*12+s,[x,z]=slotPos(b,s),y=b.y,kind=b.kind;
      const planted=b.stage==='growing'?(s<b.plantN):false;
      const picked=b.stage==='harvested'||b.stage==='prepped'||(b.stage==='growing'&&s<b.pickN);
      const gone=b.stage==='prepped'||!planted||(picked&&(kind==='lettuce'||kind==='carrot'||kind==='garlic'));
      const g=Math.min(1,b.growth),k=0.25+0.75*g,tired=b.stage==='harvested';
      gHide(G_TOP,li);gHide(G_ROOT,li);gHide(G_FRUIT,li*2);gHide(G_FRUIT,li*2+1);gHide(G_LEAF,li);
      if(gone)continue;
      if(kind==='pumpkin'){gSet(G_LEAF,li,x,y+0.14*k,z,0.78*k,0.32*k,0.78*k,tired?'#a39a4a':'#4f8a3a',s);
        if(!picked){const kp=smooth(0.2,1,g);gSet(G_FRUIT,li*2,x+0.12,y+0.17*kp,z+0.12*(s<6?-1:1),0.3*kp,0.24*kp,0.3*kp,'#'+_gc2.set('#7a9a3a').lerp(_gc.set('#e8792a'),smooth(0.55,1,g)).getHexString());}}
      else if(kind==='tomato'){gSet(G_LEAF,li,x,y+0.38*k,z,0.4*k,0.78*k,0.4*k,tired?'#8a8a3a':'#4f9a3a',s);
        if(!picked&&g>0.3)for(let f=0;f<2;f++)gSet(G_FRUIT,li*2+f,x+(f?0.12:-0.1),y+(0.5+f*0.15)*k,z+0.15,0.1,0.1,0.1,'#'+_gc2.set('#7fae3a').lerp(_gc.set('#e2432f'),smooth(0.6,1,g)).getHexString());}
      else if(kind==='carrot'){gSet(G_TOP,li,x,y+0.32*k,z,0.3,0.62*k,0.3,'#5ea83c',s);if(g>0.45)gSet(G_ROOT,li,x,y+0.02,z,0.075,0.12,0.075,null,0,Math.PI);}
      else if(kind==='kale'){gSet(G_LEAF,li,x,y+0.2*k,z,(picked?0.25:0.55)*k,(picked?0.2:0.48)*k,(picked?0.25:0.55)*k,s%2?'#4f6f5a':'#6b5a7a',s);}
      else if(kind==='lettuce'){gSet(G_LEAF,li,x,y+0.18*k,z,0.6*k,0.44*k,0.6*k,'#8cc46a',s);}
      else if(kind==='garlic'){gSet(G_TOP,li,x,y+0.25*k,z,0.1,0.5*k,0.1,'#7fae5a',s);}
      else if(kind==='corn'){gSet(G_TOP,li,x,y+0.8*k,z,0.13,1.6*k,0.13,tired?'#c9b26a':'#5e9a3a',s);gSet(G_LEAF,li,x,y+0.62*k,z,0.36*k,0.55*k,0.36*k,tired?'#bfa35a':'#6aa84a',s);
        if(!picked&&g>0.4){gSet(G_FRUIT,li*2,x+0.11,y+0.85*k,z+0.05,0.065,0.17,0.065,g>0.85?'#f2c94c':'#9fc25a',s,0.35);gSet(G_FRUIT,li*2+1,x,y+1.62*k,z,0.05,0.09,0.05,'#d9b65a');}}
    }
  }else{
    const n=b.heads.length,fadedN=Math.round(b.faded*n);
    for(let h=0;h<n;h++){const[x,y,z,col]=b.heads[h],f=h<fadedN;
      gSet(G_HEAD,b.i*34+h,x,y-(f?0.08:0),z,f?0.18:0.26,f?0.13:0.2,f?0.18:0.26,f?'#7a5a3a':col,h);}
  }
  for(let w=0;w<8;w++){const[x,z]=b.weedPos[w];
    for(let k=0;k<3;k++){const wi=(b.i+(b.type==='veg'?0:VEG_BEDS.length))*24+w*3+k;
      if(w<b.weeds)gSet(G_WEED,wi,x+(k-1)*0.06,b.y+0.13,z+(k%2)*0.05,0.09,0.32,0.09,k%2?'#5a7a2a':'#6f8f2f',k*2.1+w,(k-1)*0.3);else gHide(G_WEED,wi);}}
  for(const im of[G_LEAF,G_TOP,G_FRUIT,G_ROOT,G_WEED,G_HEAD]){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;}
}
BEDS.forEach(refreshBed);

let gardenAcc=0;
function updateGarden(dt,time){
  gardenAcc+=dt;
  if(gardenAcc>=0.25){
    const st=gardenAcc;gardenAcc=0;
    const rain=WEATHER.rainK,snow=WEATHER.snowK,sun=(1-nightK)*(1-0.7*rain),winter=CAL.season==='winter';
    for(const b of BEDS){
      const m0=b.moist;
      b.moist=clamp(b.moist+(rain*0.05+snow*0.004-0.0024*(0.45+sun)*(1-b.mulch*0.45))*st,0,1);
      if(Math.random()<st*0.0055*(winter?0.3:1)*(1-b.mulch*0.7)&&b.weeds<6){b.weeds++;b.dirty=true;}
      if(Math.random()<st*0.0035*(winter?0.2:1)*(1-rain*0.5)&&b.pests<4){b.pests++;}
      b.mulch=Math.max(0,b.mulch-0.0011*st);
      if(b.type==='veg'&&b.stage==='growing'&&b.growth<1&&b.plantN>=12){b.growth=Math.min(1,b.growth+st*0.0035*(b.moist>0.25?1:0.25)*(b.pests>2?0.6:1)*(winter?0.2:1));b.dirty=true;}
      if(b.type==='flower'){const f0=Math.round(b.faded*34);b.faded=Math.min(1,b.faded+st*0.0016);if(Math.round(b.faded*34)!==f0)b.dirty=true;}
      if(Math.abs(b.moist-m0)>0.0001)b.dirty=true;
    }
    for(const b of BEDS)if(b.dirty)refreshBed(b);
  }
  // little beetles crawl over the leaves while a bed has pests
  for(const b of BEDS)for(let k=0;k<4;k++){const bi=(b.i+(b.type==='veg'?0:VEG_BEDS.length))*4+k;
    if(k<b.pests){let x,y,z;if(b.type==='veg'){[x,z]=slotPos(b,(k*5+b.i*3)%12);y=b.y+0.35;}else{const h=b.heads[(k*9)%b.heads.length];x=h[0];y=h[1];z=h[2];}
      const a=time*(0.8+k*0.2)+k*1.7;gSet(G_BUG,bi,x+Math.cos(a)*0.14,y+0.05,z+Math.sin(a)*0.14,0.045,0.03,0.06,k%2?'#c8302a':'#2a2a33',-a);}
    else gHide(G_BUG,bi);}
  G_BUG.instanceMatrix.needsUpdate=true;if(G_BUG.instanceColor)G_BUG.instanceColor.needsUpdate=true;
}

function bedChores(b){
  const out=[],nm=KIND_NAME[b.kind],wet=WEATHER.rainK>0.3,frozen=WEATHER.snowK>0.4;
  if(!wet&&!frozen&&b.moist<0.45)out.push(['water',0.2+(0.45-b.moist)/0.45*0.7,`Watering the ${nm}`]);
  if(b.weeds>=2&&!frozen)out.push(['weed',0.32+0.1*b.weeds,`Weeding the ${nm}`]);
  if(b.pests>=1||simTime-b.lastCheck>150)out.push(['pests',b.pests>=1?0.35+0.14*b.pests:0.26,`Checking the ${nm} for pests`]);
  if(b.type==='veg'){
    if(b.stage==='growing'&&b.growth>=1&&b.kind!=='garlic')out.push(['harvest',0.92,`Harvesting the ${nm}`]);
    if(b.stage==='harvested')out.push(['prep',0.78,'Mixing compost into the soil']);
    if(b.stage==='prepped'&&(b.field||SEASON_CROP)&&!frozen)out.push(['plant',0.82,b.field?(b.field==='corn'?'Planting sweet corn':'Sowing carrot seeds'):SEASON_CROP.label]);
  }
  if(b.mulch<0.25&&!frozen)out.push(['mulch',CAL.season==='autumn'?0.85:0.55,`Mulching the ${nm} bed`]);
  if(b.type==='flower'&&b.faded>0.35)out.push(['deadhead',0.35+b.faded*0.55,`Deadheading the ${nm}`]);
  return out;
}
function bestGardenChore(){
  let best=null,bs=0;
  for(const b of BEDS)for(const[chore,urg,label]of bedChores(b)){
    const d=Math.hypot(b.spot[0]-AI.x,b.spot[1]-AI.z),s=urg/(1+d/45);
    if(s>bs){bs=s;best={x:b.spot[0],z:b.spot[1],look:b.look,bed:b,chore,urg,label,rid:'g_'+chore+b.type+b.i};}}
  return best;
}
function gardenBegin(){
  const g=AI.target,b=g.bed;
  g.start={weeds:b.weeds,pests:b.pests,faded:b.faded||0,mulch:b.mulch,prepK:b.prepK||0};
  if(g.chore==='harvest')b.pickN=0;
  if(g.chore==='plant'){b.stage='growing';b.kind=b.field||SEASON_CROP.kind;b.growth=0.05;b.plantN=0;}
  b.dirty=true;
}
function gardenProgress(){
  const g=AI.target,b=g.bed,p=clamp(AI.actT/Math.max(0.1,AI.actDur),0,1),S=g.start;
  switch(g.chore){
    case 'weed':b.weeds=Math.round(S.weeds*(1-p));break;
    case 'pests':b.pests=Math.round(S.pests*(1-smooth(0.3,1,p)));break;
    case 'deadhead':b.faded=S.faded*(1-p);break;
    case 'mulch':b.mulch=lerp(S.mulch,1,p);break;
    case 'prep':b.prepK=p;break;
    case 'harvest':b.pickN=Math.floor(p*12);break;
    case 'plant':b.plantN=Math.floor(p*12);break;
    case 'water':if(AI.actT>1.4)b.moist=Math.max(b.moist,lerp(b.moist,1,Math.min(1,(AI.actT-1.4)/(AI.actDur-1.4))));break;
  }
  b.dirty=true;
}
const GARDEN_LOG={harvested:{},chores:0};
function gardenComplete(){
  const g=AI.target,b=g.bed;b.dirty=true;GARDEN_LOG.chores++;
  switch(g.chore){
    case 'water':b.moist=1;b.lastCheck=simTime;break;
    case 'weed':b.weeds=0;break;
    case 'pests':{const found=g.start.pests>0;b.pests=0;b.lastCheck=simTime;emote(caretaker.headGroup,found?'heart':'sparkle',0.85);break;}
    case 'harvest':b.stage='harvested';b.pickN=12;GARDEN_LOG.harvested[b.kind]=(GARDEN_LOG.harvested[b.kind]||0)+12;addGood(b.kind,12);emote(caretaker.headGroup,'basket',0.85);break;
    case 'prep':b.stage='prepped';b.prepK=1;b.moist=Math.max(b.moist,0.6);break;
    case 'plant':b.stage='growing';b.plantN=12;b.growth=0.05;b.prepK=0.5;break;
    case 'mulch':b.mulch=1;break;
    case 'deadhead':b.faded=0;break;
  }
}

/* ================= Luna's brain: needs-driven utility AI ================= */
const POI={
  houseSteps:{x:20,z:7.4,look:[20,-2]},veranda:{x:20,z:2.4,look:[20,15]},petCorner:{x:26.8,z:3.6,look:[27,5.3]},
  petBed:{x:10.8,z:-1.9,look:[9.5,-3]},torii:{x:10,z:-9.4,look:[10,-26]},shrine:{x:16,z:-33.2,look:[16,-38]},
  pier:{x:24,z:zE+16.2,look:[24,zE+40]},
  yard:{x:-31.5,z:31.5,look:[-35.5,29.5]},isle:{x:ISLE2.x+2,z:ISLE2.z+3.5,look:[ISLE2.x+16,ISLE2.z+8]},market:{x:MARKET.x-3.45,z:MARKET.z,look:[MARKET.x,MARKET.z]},zen:{x:-30.6,z:6,look:[-38,6]},waterfall:{x:-14.5,z:-16.5,look:[-22,-20]}
};
for(const k in POI){const p=POI[k];const[gx,gz]=toGrid(p.x,p.z);if(!NAV.walk[gIdx(gx,gz)]){const s=snapWalkable(p.x,p.z);p.x=s[0];p.z=s[1];}}
const TASKS=[
  {id:'feedHouse',need:'pets',poi:'petCorner',act:'feed',dur:[3.5,5],sat:0.55,shelter:true},
  {id:'feedYard',need:'pets',poi:'yard',act:'feed',dur:[3.5,5],sat:0.55},
  {id:'petBed',need:'pets',poi:'petBed',act:'inspect',dur:[2.5,4],sat:0.2,w:0.6},
  {id:'pet',need:'pets',dynamic:'pet',act:'pet',dur:[3.5,5.5],sat:0.45,w:0.9},
  {id:'garden',need:'garden',dynamic:'garden',act:'garden',dur:[5,7],sat:0,w:1.5,day:true,dry:true},
  {id:'shrine',need:'explore',poi:'shrine',act:'bow',dur:[3.5,5],sat:0.5,emote:'sparkle',dry:true},
  {id:'pier',need:'explore',poi:'pier',act:'sitView',dur:[7,11],sat:0.6,nightBonus:1.8,dry:true},
  {id:'zen',need:'explore',poi:'zen',act:'look',dur:[4,6],sat:0.45,emote:'note',dry:true},
  {id:'waterfall',need:'explore',poi:'waterfall',act:'look',dur:[4,6],sat:0.45,emote:'sparkle',dry:true},
  {id:'torii',need:'explore',poi:'torii',act:'look',dur:[2.5,4],sat:0.3,w:0.7},
  {id:'greet',need:'explore',poi:'houseSteps',act:'wave',dur:[2.5,4],sat:0.2,w:0.5,shelter:true},
  {id:'rest',need:'energy',poi:'veranda',act:'sit',dur:[7,12],sat:0.95,shelter:true},
  {id:'fetch',need:'play',dynamic:'fetch',act:'fetch',dur:[40,40],sat:0.85,day:true,w:1.1,dry:true},
  {id:'letOut',need:'pets',dynamic:'letOut',act:'gate',dur:[3,3.5],sat:0,w:2.4},
  {id:'bedtime',need:'pets',dynamic:'bedtime',act:'gate',dur:[14,14],sat:0,w:2.6},
  {id:'fish',need:'fish',dynamic:'fish',act:'fish',dur:[60,60],sat:0.9,dry:true},
  {id:'sell',need:'explore',dynamic:'sell',act:'sell',dur:[5,6],sat:0.1},
  {id:'swim',need:'swim',dynamic:'swim',act:'swim',dur:[16,24],sat:1,w:1.45,day:true,dry:true},
  {id:'swing',need:'swing',dynamic:'swing',act:'swing',dur:[13,19],sat:1,w:1.4,dry:true},
  {id:'decor',need:'enjoy',dynamic:'decor',act:'look',dur:[6,9],sat:1,w:1.4},
  {id:'islet',need:'wander',poi:'isle',act:'look',dur:[6,9],sat:1,emote:'sparkle',w:3.0,dry:true,day:true}
];
const NEEDS={energy:0.15,pets:0.55,explore:0.6,play:0.55,fish:0.3,swim:0.35,swing:0.55,wander:0.25,enjoy:0.4};
const RATES={energy:0.004,pets:0.011,explore:0.012,play:0.01,fish:0.0045,swim:0.004,swing:0.0045,wander:0.0035,enjoy:0.005};
const BRAIN={recent:[],fetch:null,fetchReturned:false};

const AI={
  x:POI.houseSteps.x,z:POI.houseSteps.z,y:0,yaw:0,pitch:0,speed:0,walkSpeed:2.7,
  state:'act',act:'wave',timer:3,actT:0,actDur:3,task:null,target:null,path:[],wp:0,walkPhase:0,
  blinkTimer:2.4,isBlinking:false,eyesClosed:false,stuckT:0,stuckN:0,checkX:0,checkZ:0,repath:0,retries:0,
  sitK:0,crouchK:0,lastSky:-99,skyCheck:1,skyT:0,skyObj:null,saved:null,emoteT:0,stretchT:0,microT:8,startleT:0,lastStartle:-99,umbrellaK:0
};
AI.y=walkHeight(AI.x,AI.z);AI.checkX=AI.x;AI.checkZ=AI.z;
const STILL={on:false};
const HOLD={luna:false,moon:false,solon:false};
caretaker.root.position.set(AI.x,AI.y,AI.z);
caretaker.root.userData.noWx=true;

/* garden tools and a rain umbrella for Luna */
const PROPS=(function(){
  const C=caretaker,wood=mStd('#8a6143'),wicker=mStd('#b5864a',{roughness:0.95});
  const basket=new T.Group();basket.position.set(-0.25,-0.5,0.08);basket.visible=false;C.leftArm.add(basket);
  blob(basket,CYL,wicker,0,-0.06,0,0.15,0.13,0.12);blob(basket,CYL,mStd('#e8792a'),0.04,0.02,0,0.06,0.05,0.06,false);
  const hb=new T.Mesh(new T.TorusGeometry(0.12,0.012,6,14,Math.PI),wicker);hb.position.y=0.0;basket.add(hb);
  const trowel=new T.Group();trowel.position.set(0.25,-0.47,0.08);trowel.visible=false;C.rightArm.add(trowel);
  blob(trowel,CYL,wood,0,0.02,0,0.018,0.12,0.018,false);blob(trowel,BOX,mStd('#9aa3ad',{metalness:0.6,roughness:0.35}),0,-0.1,0.02,0.07,0.14,0.012,false);
  const umbrella=new T.Group();umbrella.visible=false;C.leftArm.add(umbrella);umbrella.position.set(-0.24,-0.45,0.06);
  const uTex=canvasTex(256,64,c=>{for(let i=0;i<8;i++){c.fillStyle=i%2?'#ffffff':'#ff8fab';c.fillRect(i*32,0,32,64);}c.fillStyle='rgba(0,0,0,0.12)';c.fillRect(0,56,256,8);});
  blob(umbrella,CYL,mStd('#3b2a20'),0,0.75,0,0.015,1.5,0.015,false);
  const canopy=new T.Mesh(new T.ConeGeometry(0.95,0.38,8,1,true),new T.MeshStandardMaterial({map:uTex,side:T.DoubleSide,roughness:0.6}));canopy.position.y=1.55;canopy.castShadow=true;umbrella.add(canopy);
  blob(umbrella,SPH,mStd('#3b2a20'),0,1.76,0,0.03,0.03,0.03,false);
  const hook=new T.Mesh(new T.TorusGeometry(0.05,0.012,6,10,Math.PI),mStd('#3b2a20'));hook.position.set(0.05,0,0);hook.rotation.z=Math.PI;umbrella.add(hook);
  const axe=new T.Group();axe.position.set(0.25,-0.47,0.08);axe.visible=false;C.rightArm.add(axe);
  blob(axe,CYL,wood,0,-0.32,0,0.025,0.8,0.025,false);
  blob(axe,BOX,mStd('#9aa3ad',{metalness:0.7,roughness:0.3}),0,-0.66,-0.1,0.04,0.18,0.2,false);blob(axe,BOX,mStd('#d8dde2',{metalness:0.8,roughness:0.2}),0,-0.66,-0.21,0.03,0.2,0.03,false);
  const hammer=new T.Group();hammer.position.set(0.25,-0.47,0.08);hammer.visible=false;C.rightArm.add(hammer);
  blob(hammer,CYL,wood,0,-0.2,0,0.022,0.45,0.022,false);blob(hammer,BOX,mStd('#5a6068',{metalness:0.7,roughness:0.35}),0,-0.42,0,0.06,0.07,0.2,false);
  return {basket,trowel,umbrella,axe,hammer};
})();


/* ================= fishing: rod, line, bobber and real fish from the ponds and the ocean ================= */
const FISH_SPECIES=[
  {name:'Bluegill',water:'pond',len:0.32,deep:0.24,thick:0.08,col:'#5f7d5a',belly:'#f2a33a',bars:'#46604a',ear:'#1b2433'},
  {name:'Largemouth Bass',water:'pond',len:0.58,deep:0.19,thick:0.11,col:'#6f8c48',belly:'#ece6c8',band:'#34472a',bigMouth:true},
  {name:'Rainbow Trout',water:'pond',len:0.52,deep:0.14,thick:0.085,col:'#7f9070',belly:'#f4f1ea',band:'#ec7f92',spots:'#2a2a2a'},
  {name:'Channel Catfish',water:'pond',len:0.62,deep:0.14,thick:0.11,col:'#6f7c8e',belly:'#eef0f2',spots:'#33383f',barbels:true,fork:true},
  {name:'Koi',water:'pond',len:0.46,deep:0.16,thick:0.1,col:'#f6f1e8',belly:'#f6f1e8',patches:'#e8462a'},
  {name:'Atlantic Mackerel',water:'ocean',len:0.44,deep:0.11,thick:0.075,col:'#2f6f8a',belly:'#e3ebef',bars:'#13232c',fork:true},
  {name:'Red Snapper',water:'ocean',len:0.52,deep:0.22,thick:0.09,col:'#e0503a',belly:'#f6a594',eyeRed:true},
  {name:'Striped Bass',water:'ocean',len:0.62,deep:0.17,thick:0.1,col:'#b9c2ca',belly:'#f2f4f5',stripes:'#3a3f48'},
  {name:'Flounder',water:'ocean',len:0.46,deep:0.32,thick:0.045,col:'#8a7050',belly:'#8a7050',spots:'#5a4630',flat:true},
  {name:'Pufferfish',water:'ocean',len:0.3,deep:0.27,thick:0.25,col:'#d9c27a',belly:'#f6f0dc',spots:'#4a3a20',puffer:true}
];
function buildFish(sp){
  // the fish hangs from the hook at its mouth: nose points +y, back is +z, belly is -z
  const g=new T.Group(),f=new T.Group();g.add(f);
  const rx=sp.thick*0.55,ry=sp.len*0.5,rz=sp.deep*0.5,sc=1.3;f.position.y=-ry*sc;f.scale.setScalar(sc);
  const M=c=>mStd(c,{roughness:0.35,metalness:0.15});
  const onSurf=(y,z)=>Math.sqrt(Math.max(0,1-(y/ry)**2-(z/rz)**2));
  blob(f,SPH,M(sp.col),0,0,0,rx,ry,rz);
  blob(f,SPH,M(sp.belly),0,-ry*0.05,-rz*0.3,rx*1.02,ry*0.88,rz*0.72,false);
  if(sp.band)blob(f,SPH,M(sp.band),0,-ry*0.05,0,rx*1.04,ry*0.86,rz*0.17,false);
  if(sp.stripes)for(let k=-2;k<=2;k++){const z0=k*rz*0.3,s=onSurf(0,z0);blob(f,SPH,M(sp.stripes),0,-ry*0.08,z0,rx*1.04*s,ry*0.82*s,rz*0.05,false);}
  if(sp.bars)for(let k=0;k<6;k++){const y0=ry*(0.45-k*0.17),s=onSurf(y0,0);blob(f,SPH,M(sp.bars),0,y0,rz*0.25,rx*1.04*s,ry*0.035,rz*0.72*s,false);}
  const r=mulberry32(sp.name.length*977);
  if(sp.spots)for(let i=0;i<(sp.puffer?18:26);i++){const y=(r()*1.6-0.75)*ry,z=(r()*1.4-0.5)*rz,s=onSurf(y,z);if(s<0.25)continue;
    for(const sx of sp.flat?[1]:[-1,1])blob(f,SPH,M(sp.spots),sx*rx*s,y,z,0.004,0.0075,0.0075,false);}
  if(sp.patches)for(let i=0;i<5;i++){const y=(r()*1.3-0.5)*ry,z=(r()*0.9-0.2)*rz,s=onSurf(y,z);
    for(const sx of[-1,1])blob(f,SPH,M(sp.patches),sx*rx*s*0.92,y,z,rx*0.35,ry*rnd(0.18,0.3),rz*rnd(0.35,0.55),false);
    if(i===0)blob(f,SPH,M(sp.patches),0,ry*0.55,rz*0.25,rx*0.85,ry*0.25,rz*0.5,false);}
  if(sp.ear)for(const sx of[-1,1])blob(f,SPH,M(sp.ear),sx*rx*0.88,ry*0.32,rz*0.08,rx*0.2,ry*0.12,rz*0.18,false);
  // eyes (a flounder has both on its top side)
  const eyePts=sp.flat?[[1,ry*0.6,rz*0.16],[1,ry*0.56,-rz*0.08]]:[[-1,ry*0.66,rz*0.2],[1,ry*0.66,rz*0.2]];
  for(const[sx,y,z]of eyePts){const s=Math.max(0.35,onSurf(y,z));
    blob(f,SPH,mStd('#f4f1e6',{roughness:0.2}),sx*rx*s,y,z,0.016,0.02,0.02,false);
    blob(f,SPH,mStd(sp.eyeRed?'#c3242a':'#d9a640',{roughness:0.2}),sx*(rx*s+0.008),y,z,0.01,0.014,0.014,false);
    blob(f,SPH,mStd('#111',{roughness:0.1}),sx*(rx*s+0.013),y,z,0.006,0.008,0.008,false);}
  blob(f,SPH,mStd('#2a1c1c'),0,ry*0.97,rz*0.02,rx*(sp.bigMouth?0.7:0.45),0.02,rz*(sp.bigMouth?0.35:0.2),false);
  // fins: tail, dorsal, pectorals
  const fin=mStd(sp.puffer?sp.col:sp.col,{roughness:0.5,transparent:true,opacity:0.85,side:T.DoubleSide}),tl=ry*(sp.puffer?0.45:0.62);
  if(sp.fork)for(const s of[-1,1]){const t=blob(f,CONE,fin,0,-ry-tl*0.3,s*rz*0.22,0.01,tl,rz*0.55,false);t.rotation.x=s*0.42;}
  else blob(f,CONE,fin,0,-ry-tl*0.32,0,0.01,tl,rz*(sp.flat?1.1:0.95),false);
  if(!sp.puffer){const d=blob(f,CONE,fin,0,ry*0.05,rz*0.85,0.008,rz*(sp.flat?0.3:0.55),ry*(sp.flat?0.95:0.85),false);d.rotation.x=Math.PI/2;
    if(sp.flat){const v=blob(f,CONE,fin,0,ry*0.05,-rz*0.85,0.008,rz*0.3,ry*0.95,false);v.rotation.x=-Math.PI/2;}}
  for(const s of[-1,1]){const p=blob(f,CONE,fin,s*rx*0.9,ry*0.3,-rz*0.25,0.006,ry*0.28,rz*0.3,false);p.rotation.set(0.6,0,-s*2.4);}
  if(sp.barbels)for(const s of[-1,1])for(const a of[0.5,1.0]){const b=blob(f,CYL,mStd('#4a525e'),s*rx*0.6,ry*0.98,rz*0.0,0.006,ry*0.45,0.006,false);b.rotation.set(0.4,0,-s*a);}
  if(sp.puffer){const up=new T.Vector3(0,1,0),n=new T.Vector3();
    for(let i=0;i<34;i++){const u=r()*2-1,a=r()*6.2832,q=Math.sqrt(1-u*u);n.set(q*Math.cos(a),u,q*Math.sin(a));if(n.y>0.8)continue;
      const sp1=blob(f,CONE,mStd('#efe3bc'),n.x*rx,n.y*ry,n.z*rz,0.01,0.04,0.01,false);sp1.quaternion.setFromUnitVectors(up,n);}}
  g.visible=false;g.userData.noWx=true;scene.add(g);
  return {g,f,sp};
}
const FISH_MODELS=FISH_SPECIES.map(buildFish);

// fishing spots: the shores of both ponds and the end of the pier
const FISH_SPOTS=[];
for(const P of[PA,PB])for(let i=0;i<14;i++){const a=i/14*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
  for(const d of[1.3,1.8,2.4]){const sx=P.x+ca*(P.r+d),sz=P.z+sa*(P.r+d);
    if(!isCellOpen(sx,sz))continue;const cx=P.x+ca*(P.r-3.2),cz=P.z+sa*(P.r-3.2);
    if(hAt(cx,cz)<WATER-0.4){FISH_SPOTS.push({x:sx,z:sz,cast:[cx,cz],wy:WATER,water:'pond'});}break;}}
{const p=POI.pier;FISH_SPOTS.push({x:p.x,z:p.z,cast:[p.x,p.z+5.4],wy:0.02,water:'ocean'});FISH_SPOTS.push({x:p.x,z:p.z,cast:[p.x+2.5,p.z+5],wy:0.02,water:'ocean'});}

const FISH=(function(){
  const C=caretaker;
  const rod=new T.Group();rod.position.set(0.25,-0.47,0.08);rod.rotation.x=2.0;rod.visible=false;C.rightArm.add(rod);
  blob(rod,CYL,mStd('#c99a5e',{roughness:0.9}),0,0.02,0,0.024,0.32,0.024,false);
  const reel=blob(rod,CYL,mStd('#c0c6cc',{metalness:0.6,roughness:0.35}),0.05,0.1,-0.02,0.04,0.035,0.04,false);reel.rotation.z=Math.PI/2;
  blob(rod,CYL,mStd('#2b3a5a',{roughness:0.4}),0,0.6,0,0.013,0.85,0.013,false);
  blob(rod,CYL,mStd('#2b3a5a',{roughness:0.4}),0,1.38,0,0.007,0.72,0.007,false);
  for(const y of[0.5,0.9,1.25,1.55])blob(rod,SPH,mStd('#c0c6cc',{metalness:0.6}),0,y,-0.016,0.008,0.008,0.008,false);
  const tip=new T.Object3D();tip.position.y=1.74;rod.add(tip);
  const bob=new T.Group();bob.visible=false;bob.userData.noWx=true;scene.add(bob);
  bob.add(new T.Mesh(new T.SphereGeometry(0.075,14,8,0,6.2832,0,Math.PI/2),mStd('#e8322c',{roughness:0.35,emissive:'#5a0a08',emissiveIntensity:0.4})));
  bob.add(new T.Mesh(new T.SphereGeometry(0.075,14,8,0,6.2832,Math.PI/2,Math.PI/2),mStd('#f6f3ee',{roughness:0.35})));
  blob(bob,CYL,mStd('#f6f3ee'),0,0.1,0,0.008,0.08,0.008,false);
  const N=18,lp=new Float32Array(N*3),lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(lp,3));
  const line=new T.Line(lg,new T.LineBasicMaterial({color:'#f4f4f4',transparent:true,opacity:0.75}));line.frustumCulled=false;line.visible=false;line.userData.noWx=true;scene.add(line);
  const rings=[];for(let i=0;i<4;i++){const m=new T.Mesh(new T.RingGeometry(0.55,0.72,32),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.visible=false;m.userData.noWx=true;scene.add(m);rings.push({m,t:9});}
  return {rod,tip,bob,line,lp,N,rings,ri:0,phase:'idle',t:0,spot:null,bx:0,bz:0,wy:0,cur:null,casts:0,caught:0,log:{},last:'',
    biteAt:5,nib:2,from:new T.Vector3(),tipW:new T.Vector3(),hook:new T.Vector3(),look:new T.Vector3()};
})();
function fishSplash(x,y,z,s=1){const r=FISH.rings[FISH.ri++%FISH.rings.length];r.t=0;r.s=s;r.m.position.set(x,y+0.02,z);r.m.visible=true;}
function fishBegin(){
  const F=FISH;F.spot=AI.target.spot;F.casts=0;F.phase='ready';F.t=0;F.cur=null;AI.timer=999;
}
function fishEnd(){const F=FISH;F.phase='idle';if(F.cur)F.cur.g.visible=false;F.cur=null;}
function fishUpdate(dt){
  const F=FISH,S=F.spot;F.t+=dt;
  const next=p=>{F.phase=p;F.t=0;};
  switch(F.phase){
    case 'ready':if(F.t>0.7){let c=S.cast;for(let i=0;i<8;i++){const x=S.cast[0]+rnd(-0.9,0.9),z=S.cast[1]+rnd(-0.9,0.9);if(S.water==='ocean'||hAt(x,z)<WATER-0.4){c=[x,z];break;}}
      F.bx=c[0];F.bz=c[1];F.wy=S.wy;next('windup');}break;
    case 'windup':if(F.t>0.55){F.from.copy(F.tipW);F.casts++;next('fly');}break;
    case 'fly':if(F.t>0.9){fishSplash(F.bx,F.wy,F.bz,0.7);F.biteAt=rnd(3,8);F.nib=rnd(1.2,2.6);next('wait');}break;
    case 'wait':if(F.t>F.biteAt){emote(caretaker.headGroup,'!',0.85,1.3,0.55);fishSplash(F.bx,F.wy,F.bz,0.5);next('bite');}break;
    case 'bite':if(F.t>0.9){
      if(Math.random()<0.8){const pool=FISH_MODELS.filter(m=>m.sp.water===S.water);F.cur=pick(pool);F.cur.f.scale.setScalar(1.3);next('reel');}
      else{emote(caretaker.headGroup,'?',0.85,1.4,0.55);next('miss');}}break;
    case 'reel':if(F.t>1.8){F.caught++;F.last=F.cur.sp.name;F.log[F.last]=(F.log[F.last]||0)+1;
      emote(caretaker.headGroup,'fish',0.85,2.4,0.62);
      for(const e of PETS)if(e.kind==='cat'&&Math.hypot(e.x-AI.x,e.z-AI.z)<14&&(e.state==='idle'||e.state==='wander')){e.state='approach';e.repath=0;e.timer=10;}
      for(const d of DOGS)if(d.state==='follow')d.happy=3;
      next('show');}break;
    case 'show':if(F.t>3.2){F.cur.g.getWorldPosition(F.from);
      if(PRICES[F.last]&&Math.random()<0.75){addGood(F.last,1);emote(caretaker.headGroup,'coin',0.85,1.6,0.55);next('stow');}else next('release');}break;
    case 'stow':if(F.t>0.7){if(F.cur)F.cur.g.visible=false;F.cur=null;
      if(F.casts<3&&Math.random()<0.55)next('ready');else{endAct();return;}}break;
    case 'release':if(F.t>0.9){fishSplash(F.bx,F.wy,F.bz,0.8);if(F.cur)F.cur.g.visible=false;F.cur=null;emote(caretaker.headGroup,'heart',0.85);
      if(F.casts<3&&Math.random()<0.55)next('ready');else{endAct();return;}}break;
    case 'miss':if(F.t>1.4){if(F.casts<3)next('ready');else{endAct();return;}}break;
  }
  if(F.t>30)endAct();
}
function setLine(a,b,sag){const L=FISH.lp,N=FISH.N;
  for(let i=0;i<N;i++){const k=i/(N-1);L[i*3]=lerp(a.x,b.x,k);L[i*3+1]=lerp(a.y,b.y,k)-Math.sin(k*Math.PI)*sag*(1-k*0.4);L[i*3+2]=lerp(a.z,b.z,k);}
  FISH.line.geometry.attributes.position.needsUpdate=true;}
const _fb=new T.Vector3();
function updateFishing(dt,time){
  const F=FISH;
  for(const r of F.rings){if(r.t>=1.2)continue;r.t+=dt;const k=r.t/1.2;r.m.scale.setScalar((0.15+k*0.9)*r.s);r.m.material.opacity=0.75*(1-k);if(k>=1)r.m.visible=false;}
  const on=AI.state==='act'&&AI.act==='fish'&&F.phase!=='idle';
  F.rod.visible=on;F.line.visible=on;F.bob.visible=on;
  if(!on){if(F.cur)F.cur.g.visible=false;return;}
  F.tip.getWorldPosition(F.tipW);const T0=F.tipW,P=F.phase,t=F.t;
  const hang=(d)=>_fb.set(T0.x,T0.y-d,T0.z);
  let sag=0.03,fishOn=false,fishTumble=false;
  if(P==='ready'||P==='windup'){F.bob.position.copy(hang(0.45));}
  else if(P==='fly'){const k=Math.min(1,t/0.9);F.bob.position.set(lerp(F.from.x,F.bx,k),lerp(F.from.y,F.wy,k)+Math.sin(k*Math.PI)*1.3,lerp(F.from.z,F.bz,k));sag=0.05;}
  else if(P==='wait'){const nib=(time%F.nib)<0.14?-0.03:0;F.bob.position.set(F.bx,F.wy+0.02+Math.sin(time*2.2)*0.012+nib,F.bz);sag=Math.min(0.55,0.08*Math.hypot(F.bx-T0.x,F.bz-T0.z));}
  else if(P==='bite'){F.bob.position.set(F.bx,F.wy-0.05-Math.abs(Math.sin(t*14))*0.07-(t>0.5?0.05:0),F.bz);if((t%0.3)<dt)fishSplash(F.bx,F.wy,F.bz,0.35);}
  else if(P==='reel'){const k=smooth(0,1,t/1.8),h=hang(0.7);F.bob.position.set(lerp(F.bx,h.x,k),lerp(F.wy,h.y,k)+Math.sin(k*Math.PI)*0.5,lerp(F.bz,h.z,k));fishOn=k>0.08;
    if((t%0.35)<dt&&k<0.3)fishSplash(F.bob.position.x,F.wy,F.bob.position.z,0.4);}
  else if(P==='show'){F.bob.position.copy(hang(0.6));F.bob.position.x+=Math.sin(time*2.5)*0.05;fishOn=true;}
  else if(P==='release'){F.bob.position.copy(hang(0.45));fishTumble=true;}
  else if(P==='stow'){F.bob.position.copy(hang(0.45));}
  else if(P==='miss'){const k=smooth(0,1,t/1.4),h=hang(0.45);F.bob.position.set(lerp(F.bx,h.x,k),lerp(F.wy,h.y,k)+Math.sin(k*Math.PI)*0.4,lerp(F.bz,h.z,k));}
  setLine(T0,F.bob.position,sag);
  if(F.cur){const g=F.cur.g;
    if(fishOn){g.visible=true;g.position.set(F.bob.position.x,F.bob.position.y-0.14,F.bob.position.z);
      g.rotation.set(0,AI.yaw+Math.PI/2+Math.sin(time*1.7)*0.5,Math.sin(time*(P==='show'?9:14))*0.35);
      if(F.cur.sp.puffer){const k=P==='show'?smooth(0,0.6,t):0;F.cur.f.scale.setScalar(1.3*(1+0.4*k));}}
    else if(P==='stow'){g.visible=true;const k=smooth(0,1,t/0.7);g.position.set(lerp(F.from.x,AI.x,k),lerp(F.from.y,AI.y+0.8,k),lerp(F.from.z,AI.z,k));F.cur.f.scale.setScalar(1.3*(1-0.85*k));}
    else if(fishTumble){g.visible=true;const k=Math.min(1,t/0.9);g.position.set(lerp(F.from.x,F.bx,k),lerp(F.from.y,F.wy,k)+Math.sin(k*Math.PI)*0.8,lerp(F.from.z,F.bz,k));g.rotation.x+=dt*8;}
    else g.visible=false;}
  if(F.cur&&F.cur.g.visible&&P!=='stow')F.cur.g.getWorldPosition(F.look);else F.look.copy(F.bob.position);
}


/* ================= Luna's closet: 15 dog-themed outfits + 5 animal masks ================= */
const BREEDS={
  sheltie:{fur:'#d6994f',cap:'#5b3a24',ear:'up',earCol:'#5b3a24',inner:'#f0a0a6',blaze:'#fbf6ec',muzzle:'#fbf6ec'},
  corgi:{fur:'#e8862a',ear:'up',earCol:'#e8862a',inner:'#f6c0a0',blaze:'#ffffff',muzzle:'#ffffff'},
  husky:{fur:'#7d8794',ear:'up',earCol:'#5f6772',inner:'#f0c8c8',mask:'#ffffff',muzzle:'#ffffff',eye:'#3f8fe0'},
  golden:{fur:'#e9b25a',ear:'flop',earCol:'#d4923a',muzzle:'#f5cf8e'},
  pug:{fur:'#e8cc9a',ear:'flop',earCol:'#3a2e2a',muzzle:'#3a2e2a',smush:true},
  dalmatian:{fur:'#ffffff',ear:'flop',earCol:'#26222a',muzzle:'#ffffff',spots:true},
  beagle:{fur:'#f4efe6',cap:'#c47a3a',ear:'flop',earCol:'#8a5a2a',blaze:'#ffffff',muzzle:'#ffffff'}
};
const CL={
  ell(c,x,y,rx,ry,rot,col,stroke){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,rot||0,0,6.2832);c.fill();if(stroke)c.stroke();},
  tile(c,S,cols,rows,fn){let i=0;for(let r=-1;r<=rows;r++)for(let k=0;k<cols;k++){const x=(k+0.5+(r&1?0.5:0))*S/cols,y=(r+0.5)*S/rows;for(const ox of[-S,0,S])fn(x+ox,y,i);i++;}},
  scatter(c,S,n,seed,fn){const r=mulberry32(seed);for(let i=0;i<n;i++){const x=r()*S,y=r()*S,a=r()*6.28,k=r();for(const ox of[-S,0,S])fn(x+ox,y,a,k,i);}},
  dog(c,x,y,r,b){
    c.save();c.lineWidth=Math.max(1.5,r*0.07);c.strokeStyle='#2a2220';c.lineJoin='round';
    for(const s of[-1,1]){
      if(b.ear==='up'){c.fillStyle=b.earCol;c.beginPath();c.moveTo(x+s*r*0.25,y-r*0.7);c.lineTo(x+s*r*0.95,y-r*1.25);c.lineTo(x+s*r*0.92,y-r*0.2);c.closePath();c.fill();c.stroke();
        c.fillStyle=b.inner||'#f0a0a6';c.beginPath();c.moveTo(x+s*r*0.42,y-r*0.64);c.lineTo(x+s*r*0.84,y-r*1.02);c.lineTo(x+s*r*0.8,y-r*0.42);c.closePath();c.fill();}
      else CL.ell(c,x+s*r*0.88,y+r*0.08,r*0.32,r*0.62,s*0.35,b.earCol,true);
    }
    CL.ell(c,x,y,r,r*0.9,0,b.fur,false);
    c.save();c.beginPath();c.ellipse(x,y,r,r*0.9,0,0,6.2832);c.clip();
    if(b.cap){c.fillStyle=b.cap;c.beginPath();c.ellipse(x,y-r*0.78,r*1.05,r*0.55,0,0,6.2832);c.fill();for(const s of[-1,1]){c.beginPath();c.ellipse(x+s*r*0.98,y,r*0.32,r*0.8,0,0,6.2832);c.fill();}}
    if(b.mask){c.fillStyle=b.mask;c.beginPath();c.moveTo(x-r*0.75,y+r*0.05);c.quadraticCurveTo(x-r*0.32,y-r*0.45,x,y-r*0.12);c.quadraticCurveTo(x+r*0.32,y-r*0.45,x+r*0.75,y+r*0.05);c.quadraticCurveTo(x+r*0.85,y+r*0.95,x,y+r*0.95);c.quadraticCurveTo(x-r*0.85,y+r*0.95,x-r*0.75,y+r*0.05);c.fill();}
    if(b.blaze){c.fillStyle=b.blaze;c.beginPath();c.moveTo(x-r*0.07,y-r*0.95);c.lineTo(x+r*0.07,y-r*0.95);c.lineTo(x+r*0.2,y+r*0.2);c.lineTo(x-r*0.2,y+r*0.2);c.closePath();c.fill();}
    if(b.spots){c.fillStyle='#26222a';for(const[dx,dy,rr]of[[-0.45,-0.45,0.14],[0.5,-0.3,0.1],[0.42,0.42,0.12],[-0.58,0.3,0.09]]){c.beginPath();c.arc(x+dx*r,y+dy*r,rr*r,0,6.2832);c.fill();}}
    c.restore();
    c.beginPath();c.ellipse(x,y,r,r*0.9,0,0,6.2832);c.stroke();
    CL.ell(c,x,y+r*0.4,r*(b.smush?0.5:0.42),r*0.3,0,b.muzzle,false);
    for(const s of[-1,1]){CL.ell(c,x+s*r*0.38,y-r*0.05,r*0.14,r*0.16,0,b.eye||'#2a1a12',false);c.fillStyle='#fff';c.beginPath();c.arc(x+s*r*0.38+r*0.045,y-r*0.11,r*0.05,0,6.2832);c.fill();}
    CL.ell(c,x,y+r*0.25,r*0.15,r*0.1,0,'#1d1a1c',false);
    c.beginPath();c.moveTo(x,y+r*0.33);c.lineTo(x,y+r*0.43);c.moveTo(x-r*0.16,y+r*0.46);c.quadraticCurveTo(x-r*0.08,y+r*0.54,x,y+r*0.43);c.quadraticCurveTo(x+r*0.08,y+r*0.54,x+r*0.16,y+r*0.46);c.stroke();
    c.fillStyle='#f07a8a';c.beginPath();c.ellipse(x,y+r*0.5,r*0.08,r*0.11,0,0,Math.PI);c.fill();
    c.restore();
  },
  paw(c,x,y,r,col,rot){c.save();c.translate(x,y);c.rotate(rot||0);c.fillStyle=col;c.beginPath();c.ellipse(0,r*0.35,r*0.55,r*0.45,0,0,6.2832);c.fill();
    for(const[dx,dy]of[[-0.62,-0.2],[-0.22,-0.62],[0.22,-0.62],[0.62,-0.2]]){c.beginPath();c.ellipse(dx*r,dy*r,r*0.2,r*0.26,dx*0.6,0,6.2832);c.fill();}c.restore();},
  bone(c,x,y,len,col,rot){c.save();c.translate(x,y);c.rotate(rot||0);c.fillStyle=col;c.strokeStyle='rgba(0,0,0,0.25)';c.lineWidth=2.5;
    c.beginPath();c.rect(-len/2,-len*0.12,len,len*0.24);c.fill();
    for(const s of[-1,1])for(const t of[-1,1]){c.beginPath();c.arc(s*len/2,t*len*0.14,len*0.17,0,6.2832);c.fill();}c.restore();},
  ball(c,x,y,r){CL.ell(c,x,y,r,r,0,'#d7e83a',false);c.strokeStyle='#ffffff';c.lineWidth=r*0.18;c.beginPath();c.arc(x-r*1.05,y,r*0.9,-0.75,0.75);c.stroke();c.beginPath();c.arc(x+r*1.05,y,r*0.9,Math.PI-0.75,Math.PI+0.75);c.stroke();},
  heart(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.moveTo(x,y+r*0.9);c.bezierCurveTo(x-r*1.4,y,x-r*0.6,y-r*1.1,x,y-r*0.35);c.bezierCurveTo(x+r*0.6,y-r*1.1,x+r*1.4,y,x,y+r*0.9);c.fill();},
  star(c,x,y,r,col){c.fillStyle=col;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*0.42:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();},
  doxie(c,x,y,s,col,face){c.save();c.translate(x,y);c.scale(face||1,1);c.fillStyle=col;c.strokeStyle='#2a2220';c.lineWidth=2.4;
    c.beginPath();c.ellipse(0,0,s*0.9,s*0.28,0,0,6.2832);c.fill();c.stroke();
    for(const lx of[-0.6,-0.4,0.45,0.65]){c.fillRect(lx*s-s*0.06,s*0.18,s*0.12,s*0.28);}
    c.beginPath();c.ellipse(s*0.95,-s*0.25,s*0.3,s*0.24,0.3,0,6.2832);c.fill();c.stroke();
    c.beginPath();c.ellipse(s*1.22,-s*0.12,s*0.2,s*0.12,0.2,0,6.2832);c.fill();
    c.fillStyle='#4a2a1a';c.beginPath();c.ellipse(s*0.82,-s*0.12,s*0.12,s*0.24,0.5,0,6.2832);c.fill();
    CL.ell(c,s*1.4,-s*0.13,s*0.06,s*0.05,0,'#1d1a1c');CL.ell(c,s*1.0,-s*0.32,s*0.05,s*0.05,0,'#1d1a1c');
    c.strokeStyle=col;c.lineWidth=s*0.1;c.beginPath();c.moveTo(-s*0.85,-s*0.08);c.quadraticCurveTo(-s*1.15,-s*0.3,-s*1.2,-s*0.45);c.stroke();c.restore();},
  dogRun(c,x,y,s,col){c.save();c.translate(x,y);c.fillStyle=col;c.beginPath();c.ellipse(0,0,s*0.7,s*0.28,0,0,6.2832);c.fill();
    c.beginPath();c.ellipse(s*0.75,-s*0.3,s*0.28,s*0.22,0,0,6.2832);c.fill();c.beginPath();c.ellipse(s*1.0,-s*0.22,s*0.2,s*0.12,0,0,6.2832);c.fill();
    c.beginPath();c.moveTo(s*0.62,-s*0.45);c.lineTo(s*0.7,-s*0.75);c.lineTo(s*0.82,-s*0.45);c.fill();
    c.lineWidth=s*0.14;c.strokeStyle=col;c.lineCap='round';
    for(const[a,b,cx,cy]of[[-0.45,0.15,-0.9,0.45],[-0.3,0.15,-0.2,0.55],[0.35,0.15,0.75,0.5],[0.5,0.15,0.3,0.6]]){c.beginPath();c.moveTo(a*s,b*s);c.lineTo(cx*s,cy*s);c.stroke();}
    c.beginPath();c.moveTo(-s*0.65,-s*0.1);c.quadraticCurveTo(-s*1.0,-s*0.5,-s*1.1,-s*0.35);c.stroke();c.restore();},
  house(c,x,y,s){c.save();c.strokeStyle='#2a2220';c.lineWidth=2.5;c.fillStyle='#d9483a';c.fillRect(x-s*0.6,y-s*0.2,s*1.2,s*0.85);c.strokeRect(x-s*0.6,y-s*0.2,s*1.2,s*0.85);
    c.fillStyle='#7a4a2a';c.beginPath();c.moveTo(x-s*0.78,y-s*0.15);c.lineTo(x,y-s*0.8);c.lineTo(x+s*0.78,y-s*0.15);c.closePath();c.fill();c.stroke();
    c.fillStyle='#3a2420';c.beginPath();c.moveTo(x-s*0.32,y+s*0.65);c.lineTo(x-s*0.32,y+s*0.15);c.arc(x,y+s*0.15,s*0.32,Math.PI,0);c.lineTo(x+s*0.32,y+s*0.65);c.fill();
    CL.dog(c,x,y+s*0.32,s*0.27,BREEDS.beagle);c.restore();},
  umbrella(c,x,y,r,col){c.save();c.fillStyle=col;c.strokeStyle='#2a2220';c.lineWidth=2.5;c.beginPath();c.arc(x,y,r,Math.PI,0);for(let i=0;i<4;i++){c.quadraticCurveTo(x+r-(i+0.5)*r/2,y-r*0.2,x+r-(i+1)*r/2,y);}c.fill();c.stroke();
    c.beginPath();c.moveTo(x,y);c.lineTo(x,y+r*0.9);c.arc(x-r*0.15,y+r*0.9,r*0.15,0,Math.PI);c.stroke();c.restore();}
};

/* ================= market economy: coins, Luna's basket, things she owns ================= */
const GOOD_ICON={knit:'🧶',herbs:'🌿',honey:'🍯',egg:'🥚',apple:'🍎',berries:'🫐',shell:'🐚',blossom:'🌸',wood:'🪵',pumpkin:'🎃',tomato:'🍅',carrot:'🥕',kale:'🥬',lettuce:'🥬',corn:'🌽',garlic:'🧄'};
function goodIcon(k){return GOOD_ICON[k]||(k==='Pufferfish'?'🐡':'🐟');}
function goodName(k){return GOOD_ICON[k]?k.charAt(0).toUpperCase()+k.slice(1):k;}
const ECON={coins:75,wood:0,inv:{},owned:[],placed:[],chopped:[],earned:0,listeners:[]};
try{for(const k of['lunas-market-v1','lunas-closet-v1','lunas-market-tab'])localStorage.removeItem(k);}catch(e){}
try{const s=JSON.parse(localStorage.getItem('lunas-market-v2')||'null');
  if(s){ECON.coins=+s.coins||0;ECON.inv=s.inv&&typeof s.inv==='object'?s.inv:{};ECON.owned=Array.isArray(s.owned)?s.owned:[];ECON.placed=Array.isArray(s.placed)?s.placed:[];ECON.chopped=Array.isArray(s.chopped)?s.chopped.filter(n=>Number.isInteger(n)):[];ECON.wood=Math.max(0,+s.wood||0)+(+((s.inv||{}).wood)||0);delete ECON.inv.wood;ECON.earned=+s.earned||0;}}catch(e){}
function econSave(){
  try{localStorage.setItem('lunas-market-v2',JSON.stringify({coins:ECON.coins,inv:ECON.inv,owned:ECON.owned,placed:ECON.placed.map(p=>({uid:p.uid,id:p.id,x:+p.x.toFixed(2),z:+p.z.toFixed(2),ry:+p.ry.toFixed(3)})),earned:ECON.earned,chopped:ECON.chopped,wood:ECON.wood}));}catch(e){}
  for(const f of ECON.listeners)f();
}
function addGood(k,n){if(!PRICES[k])return;ECON.inv[k]=(ECON.inv[k]||0)+n;econSave();}
function basketValue(){let v=0;for(const k in ECON.inv)v+=(PRICES[k]||0)*ECON.inv[k];return v;}
function basketCount(){let n=0;for(const k in ECON.inv)n+=ECON.inv[k];return n;}
function sellBasket(){const v=basketValue();if(!v)return 0;ECON.coins+=v;ECON.earned+=v;ECON.inv={};econSave();toast('+'+v+' coins at the Seaside Market');MARKET.waveT=2.5;return v;}
function owns(id){return ECON.owned.includes(id);}
let toastT=null;
function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2600);}

// pictures for the shop-only shirts
Object.assign(CL,{
  carrot(c,x,y,s){c.fillStyle='#4f9a3a';for(const a of[-0.4,0,0.4]){c.save();c.translate(x,y-s*0.45);c.rotate(a);c.beginPath();c.ellipse(0,-s*0.22,s*0.08,s*0.25,0,0,6.2832);c.fill();c.restore();}
    c.fillStyle='#f08a2c';c.beginPath();c.moveTo(x-s*0.2,y-s*0.42);c.lineTo(x+s*0.2,y-s*0.42);c.lineTo(x,y+s*0.55);c.closePath();c.fill();
    c.strokeStyle='rgba(120,50,10,0.45)';c.lineWidth=2;for(let k=0;k<3;k++){c.beginPath();c.moveTo(x-s*(0.12-k*0.03),y-s*(0.2-k*0.22));c.lineTo(x+s*0.02,y-s*(0.17-k*0.22));c.stroke();}},
  corn(c,x,y,s){c.fillStyle='#7fae3a';for(const sd of[-1,1]){c.beginPath();c.moveTo(x,y+s*0.55);c.quadraticCurveTo(x+sd*s*0.45,y+s*0.1,x+sd*s*0.12,y-s*0.35);c.quadraticCurveTo(x+sd*s*0.12,y+s*0.2,x,y+s*0.55);c.fill();}
    CL.ell(c,x,y-s*0.05,s*0.2,s*0.48,0,'#f2c94c');c.fillStyle='#e0a92a';for(let r=-3;r<=3;r++)for(const k of[-1,0,1]){c.beginPath();c.arc(x+k*s*0.1,y-s*0.05+r*s*0.12,s*0.035,0,6.2832);c.fill();}},
  fish(c,x,y,s,col,dir){c.save();c.translate(x,y);c.scale(dir||1,1);CL.ell(c,0,0,s*0.55,s*0.28,0,col);c.fillStyle=col;c.beginPath();c.moveTo(-s*0.45,0);c.lineTo(-s*0.85,-s*0.28);c.lineTo(-s*0.85,s*0.28);c.closePath();c.fill();
    CL.ell(c,s*0.3,-s*0.06,s*0.07,s*0.07,0,'#ffffff');CL.ell(c,s*0.32,-s*0.06,s*0.035,s*0.035,0,'#1d1a1c');c.restore();},
  pumpkin(c,x,y,s){for(const[dx,w]of[[-0.32,0.34],[0.32,0.34],[0,0.4]])CL.ell(c,x+dx*s,y,w*s,s*0.42,0,dx?'#d9651f':'#f08a2c');c.fillStyle='#5a7a2a';c.fillRect(x-s*0.05,y-s*0.6,s*0.1,s*0.2);},
  coin(c,x,y,s){CL.ell(c,x,y,s,s,0,'#e9b82c');CL.ell(c,x,y,s*0.78,s*0.78,0,'#f6d35a');CL.star(c,x,y,s*0.5,'#e9b82c');},
  anchor(c,x,y,s,col){c.strokeStyle=col;c.lineWidth=s*0.12;c.lineCap='round';c.beginPath();c.arc(x,y-s*0.5,s*0.14,0,6.2832);c.moveTo(x,y-s*0.36);c.lineTo(x,y+s*0.5);
    c.moveTo(x-s*0.28,y-s*0.15);c.lineTo(x+s*0.28,y-s*0.15);c.moveTo(x-s*0.45,y+s*0.15);c.quadraticCurveTo(x-s*0.4,y+s*0.55,x,y+s*0.52);c.quadraticCurveTo(x+s*0.4,y+s*0.55,x+s*0.45,y+s*0.15);c.stroke();},
  moon(c,x,y,s,col,bg){CL.ell(c,x,y,s,s,0,col);CL.ell(c,x+s*0.45,y-s*0.2,s*0.85,s*0.85,0,bg);}
});
BREEDS.shepherd={fur:'#d4914a',cap:'#2a2220',ear:'up',earCol:'#2a2220',inner:'#d99a80',muzzle:'#f0c48a'};
const SHOP_OUTFITS=[
  {id:'farm',name:'Farm Fresh',price:180,bg:'#f6f0e0',bottom:'pants',bcol:'#3f5f8f',shoe:['#6e4b33','#e8d9b8'],acc:'cap',accCol:'#e8b84a',
    draw:(c,S)=>{c.fillStyle='rgba(217,72,59,0.28)';for(let i=0;i<S;i+=48){c.fillRect(i,0,24,S);c.fillRect(0,i,S,24);}CL.tile(c,S,3,4,(x,y,i)=>i%2?CL.carrot(c,x,y,52):CL.corn(c,x,y,52));}},
  {id:'fishin',name:"Gone Fishin'",price:200,bg:'#bfe3f7',bottom:'shorts',bcol:'#c9b58a',shoe:['#2f6f8a','#ffffff'],acc:'cap',accCol:'#2f6f8a',
    draw:(c,S)=>{c.strokeStyle='#ffffff';c.lineWidth=5;for(let y=30;y<S;y+=64){c.beginPath();c.moveTo(0,y);for(let x=0;x<S;x+=32){c.quadraticCurveTo(x+8,y-10,x+16,y);c.quadraticCurveTo(x+24,y+10,x+32,y);}c.stroke();}
      CL.tile(c,S,3,5,(x,y,i)=>CL.fish(c,x,y,58,['#e0503a','#2f6f8a','#6f8c48','#e98b3c'][i%4],i%2?1:-1));}},
  {id:'marketday',name:'Market Day',price:160,bg:'#fbf3e4',bottom:'skirt',bcol:'#2f5a4a',shoe:['#d9483b','#fbf3e4'],acc:'bow',accCol:'#f2c94c',
    draw:(c,S)=>{c.fillStyle='#d9483b';for(let x=0;x<S;x+=64)c.fillRect(x,0,30,S);CL.tile(c,S,3,4,(x,y,i)=>{if(i%2)CL.coin(c,x,y,22);else CL.pumpkin(c,x,y,36);});}},
  {id:'pumpkinpatch',name:'Pumpkin Patch',price:190,bg:'#f2a14a',bottom:'pants',bcol:'#5a3d2a',shoe:['#3b2a20','#f2a14a'],acc:'beanie',accCol:'#7a4a2a',
    draw:(c,S)=>{CL.scatter(c,S,40,91,(x,y,a)=>CL.ell(c,x,y,6,3,a,'#c9612a'));CL.tile(c,S,4,4,(x,y)=>CL.pumpkin(c,x,y,46));}},
  {id:'cornmaze',name:'Corn Maze',price:150,bg:'#ffe7a3',bottom:'shorts',bcol:'#7fae3a',shoe:['#7fae3a','#ffffff'],
    draw:(c,S)=>CL.tile(c,S,4,4,(x,y,i)=>{CL.corn(c,x,y,58);if(i%3===0)CL.paw(c,x+46,y+40,10,'#c9a24a',0.3);})},
  {id:'brunofan',name:'Bruno Fan Club',price:220,bg:'#f6d9b0',bottom:'shorts',bcol:'#211b18',shoe:['#211b18','#f6d9b0'],acc:'bandana',accCol:'#c63a2f',
    draw:(c,S)=>{CL.scatter(c,S,26,101,(x,y,a)=>CL.paw(c,x,y,12,'#c98a4a',a));CL.tile(c,S,4,4,(x,y)=>CL.dog(c,x,y,38,BREEDS.shepherd));}},
  {id:'sleepy',name:'Sleepy Pups',price:170,bg:'#26315e',bottom:'pants',bcol:'#3a4166',shoe:['#f2c94c','#26315e'],acc:'beanie',accCol:'#f2c94c',
    draw:(c,S)=>{CL.scatter(c,S,40,111,(x,y,a,k)=>CL.star(c,x,y,3+k*5,'#ffe48a'));CL.tile(c,S,3,4,(x,y,i)=>{if(i%2)CL.moon(c,x,y,22,'#ffe48a','#26315e');else CL.dog(c,x,y,32,BREEDS.sheltie);});}},
  {id:'seabreeze',name:'Sea Breeze',price:210,bg:'#f4f6fb',bottom:'skirt',bcol:'#26315e',shoe:['#ffffff','#26315e'],acc:'cap',accCol:'#26315e',
    draw:(c,S)=>{c.fillStyle='#2f4a8a';for(let y=0;y<S;y+=42)c.fillRect(0,y,S,16);CL.tile(c,S,3,3,(x,y)=>{CL.ell(c,x,y,38,38,0,'#f4f6fb');CL.anchor(c,x,y,56,'#d9483b');});}},
  {id:'strawday',name:'Strawberry Day',price:145,bg:'#ffe4ec',bottom:'shorts',bcol:'#f4a07a',shoe:['#2b2d31','#f7f7f4'],acc:'bow',accCol:'#e23b45',
    draw:(c,S)=>CL.scatter(c,S,22,17,(x,y,a,k)=>{const w=14+k*10;CL.ell(c,x,y,w,w*1.05,a,'#e23b45');c.fillStyle='#3ea845';c.beginPath();c.ellipse(x,y-w*0.7,w*0.45,w*0.22,0,Math.PI,0);c.fill();})},
  {id:'greenteam',name:'Green Team',price:135,bg:'#3cb44a',bottom:'shorts',bcol:'#2a3f78',shoe:['#3cb44a','#ffffff'],acc:'beanie',accCol:'#2f8a3a',
    draw:(c,S)=>{c.fillStyle='#2f8a3a';c.fillRect(0,0,S,S);CL.tile(c,S,3,4,(x,y)=>{c.fillStyle='#f4f6f2';c.fillRect(x-26,y-14,52,28);c.strokeStyle='#1b1b1b';c.lineWidth=4;c.strokeRect(x-26,y-14,52,28);c.fillStyle='#1b1b1b';c.fillRect(x-12,y-4,7,7);c.fillRect(x+5,y-4,7,7);});}}
];
const SHOP_MASKS=[{id:'bruno',name:'Bruno the Shepherd',price:240,base:'#cf8a3e',cap:'#211b18',lower:'#e3aa62',liner:'#211b18',ear:'#211b18',inner:'#d99a80',snout:'#3a2a20',snoutLow:'#3a2a20',tongue:true}];

const OUTFITS=[
  {id:'rainbow',name:'Rainbow Onesie',bg:'#3eb54a',bottom:'pants',bcol:'#2276e3',shoe:['#283d6e','#f4f4f2'],draw:(c,S)=>{const b=['#e82c2a','#f28322','#f7d426','#3eb54a','#2276e3','#7a35c9'];for(let i=0;i<12;i++){c.fillStyle=b[i%6];c.fillRect(0,i*S/12,S,S/12+1);}c.fillStyle='#364152';c.fillRect(S/2-5,0,10,S);}},
  {id:'usual',name:'Her usual',bottom:'shorts',bcol:'#f4a07a',shoe:['#f7f7f4','#2b2d31']},
  {id:'sheltie',name:'Sheltie Squad',bg:'#c9ecdf',bottom:'shorts',bcol:'#f39c7d',shoe:['#2b2d31','#f2f2f0'],
    draw:(c,S)=>CL.tile(c,S,4,4,(x,y)=>CL.dog(c,x,y,40,BREEDS.sheltie))},
  {id:'paws',name:'Paw Prints',bg:'#e6dcff',bottom:'skirt',bcol:'#8e6bd1',shoe:['#b79cff','#ffffff'],acc:'bow',accCol:'#ff8fab',
    draw:(c,S)=>CL.scatter(c,S,46,11,(x,y,a,k)=>CL.paw(c,x,y,14+k*10,k>0.5?'#ff8fab':'#8e6bd1',a))},
  {id:'bones',name:'Bone Appétit',bg:'#bfe3f7',bottom:'shorts',bcol:'#4f7fb8',shoe:['#d93a3a','#ffffff'],
    draw:(c,S)=>{CL.scatter(c,S,34,21,(x,y,a,k)=>CL.bone(c,x,y,46+k*20,'#fffaf0',a));CL.scatter(c,S,12,23,(x,y,a)=>CL.paw(c,x,y,12,'#4f7fb8',a));}},
  {id:'corgi',name:'Corgi Party',bg:'#ffe7a3',bottom:'shorts',bcol:'#7a5a3a',shoe:['#ffffff','#e8862a'],
    draw:(c,S)=>CL.tile(c,S,4,4,(x,y,i)=>{CL.dog(c,x,y,38,BREEDS.corgi);if(i%3===0)CL.star(c,x+52,y-46,9,'#f2a93b');})},
  {id:'dalmatian',name:'Dalmatian Dots',bg:'#fbfaf6',bottom:'pants',bcol:'#d93a3a',shoe:['#1d1a1c','#ffffff'],acc:'bandana',accCol:'#d93a3a',
    draw:(c,S)=>{CL.scatter(c,S,70,31,(x,y,a,k)=>CL.ell(c,x,y,6+k*12,5+k*9,a,'#26222a'));CL.tile(c,S,3,3,(x,y,i)=>{if(i%2)CL.dog(c,x,y,34,BREEDS.dalmatian);});}},
  {id:'wiener',name:'Wiener Walk',bg:'#f6ecd6',bottom:'shorts',bcol:'#2f6b6b',shoe:['#2f6b6b','#ffffff'],acc:'cap',accCol:'#2f8f8a',
    draw:(c,S)=>{for(let y=0;y<S;y+=64){c.fillStyle='#9fd6d0';c.fillRect(0,y,S,32);}CL.tile(c,S,3,8,(x,y,i)=>CL.doxie(c,x,y+(i%2?0:2),30,i%3?'#a0582a':'#3a2a22',i%2?1:-1));}},
  {id:'golden',name:'Golden Pup',bg:'#ffd9b8',bottom:'skirt',bcol:'#f2a93b',shoe:['#ffffff','#f2a93b'],acc:'bow',accCol:'#ffffff',
    draw:(c,S)=>{CL.scatter(c,S,24,41,(x,y)=>CL.heart(c,x,y,8,'#ffb38a'));CL.tile(c,S,4,4,(x,y)=>CL.dog(c,x,y,38,BREEDS.golden));}},
  {id:'pug',name:'Pug Hugs',bg:'#e3d4f2',bottom:'shorts',bcol:'#6b5a8a',shoe:['#2b2d31','#e3d4f2'],
    draw:(c,S)=>CL.tile(c,S,4,4,(x,y)=>CL.dog(c,x,y,38,BREEDS.pug))},
  {id:'husky',name:'Husky Nights',bg:'#26315e',bottom:'pants',bcol:'#3a4166',shoe:['#7fb2e5','#ffffff'],acc:'beanie',accCol:'#7fb2e5',
    draw:(c,S)=>{CL.scatter(c,S,40,51,(x,y,a,k)=>CL.star(c,x,y,4+k*7,k>0.6?'#ffe48a':'#cfd8ff'));CL.tile(c,S,3,3,(x,y)=>CL.dog(c,x,y,44,BREEDS.husky));}},
  {id:'fetch',name:'Fetch Day',bg:'#a8dc8f',bottom:'shorts',bcol:'#f5f0e0',shoe:['#3fae5a','#ffffff'],acc:'cap',accCol:'#3fae5a',
    draw:(c,S)=>{CL.scatter(c,S,22,61,(x,y,a,k)=>CL.ball(c,x,y,12+k*8));CL.tile(c,S,3,5,(x,y,i)=>CL.dogRun(c,x,y,34,i%2?'#3a6a3a':'#2f5a8a'));}},
  {id:'doghouse',name:'Dog House',bg:'#fbe9d0',bottom:'skirt',bcol:'#c63a2f',shoe:['#8a5a2a','#fbe9d0'],
    draw:(c,S)=>{CL.scatter(c,S,30,71,(x,y,a)=>CL.bone(c,x,y,26,'#e8c9a0',a));CL.tile(c,S,3,4,(x,y)=>CL.house(c,x,y,62));}},
  {id:'love',name:'Puppy Love',bg:'#ffd1dc',bottom:'skirt',bcol:'#ff8fab',shoe:['#ffffff','#ff8fab'],acc:'bow',accCol:'#d93a6a',
    draw:(c,S)=>CL.tile(c,S,4,5,(x,y,i)=>{CL.heart(c,x,y,34,i%2?'#ff5d8f':'#ff8fab');CL.paw(c,x,y-2,12,'#ffffff',0);})},
  {id:'hotdog',name:'Hot Dog!',bg:'#ff7a5c',bottom:'shorts',bcol:'#ffd24d',shoe:['#ffd24d','#ffffff'],acc:'cap',accCol:'#ffd24d',
    draw:(c,S)=>CL.tile(c,S,3,6,(x,y)=>{CL.ell(c,x,y+10,54,18,0,'#e8b46a');CL.doxie(c,x-6,y-2,32,'#a0582a',1);
      c.strokeStyle='#ffd24d';c.lineWidth=4;c.beginPath();c.moveTo(x-40,y-6);for(let k=0;k<6;k++)c.quadraticCurveTo(x-34+k*13,y-16,x-28+k*13,y-6);c.stroke();})},
  {id:'plaid',name:'Woof Plaid',bg:'#b8322b',bottom:'pants',bcol:'#2b2d31',shoe:['#6e4b33','#e8d9b8'],acc:'beanie',accCol:'#c63a2f',
    draw:(c,S)=>{c.fillStyle='rgba(20,18,22,0.55)';for(let i=0;i<S;i+=64){c.fillRect(i,0,26,S);c.fillRect(0,i,S,26);}
      c.fillStyle='rgba(255,220,120,0.35)';for(let i=40;i<S;i+=64){c.fillRect(i,0,4,S);c.fillRect(0,i,S,4);}
      CL.tile(c,S,3,4,(x,y,i)=>{if(i%2){c.fillStyle='#fbf6ec';c.fillRect(x-40,y-18,80,36);c.fillStyle='#b8322b';c.font='900 24px "Zen Maru Gothic", Nunito, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('WOOF',x,y+1);}
        else CL.paw(c,x,y,16,'#fbf6ec',0.3);});}},
  {id:'swimsuit',name:'Swimsuit',hidden:true,bg:'#ff7f9f',bottom:'shorts',bcol:'#ff7f9f',shoe:['#f3c6a8','#f3c6a8'],
    draw:(c,S)=>{c.fillStyle='#ffd1dc';for(let y=24;y<S;y+=96)c.fillRect(0,y,S,20);CL.scatter(c,S,70,131,(x,y,a,k)=>CL.ell(c,x,y,5+k*5,5+k*5,0,'#ffffff'));}},
  {id:'rainy',name:'Rainy Day Pups',bg:'#ffd84a',bottom:'pants',bcol:'#3a6ea5',shoe:['#ffd84a','#3a6ea5'],
    draw:(c,S)=>{CL.scatter(c,S,60,81,(x,y)=>{c.fillStyle='#7fb2e5';c.beginPath();c.ellipse(x,y,3,6,0,0,6.2832);c.fill();});
      CL.tile(c,S,3,4,(x,y,i)=>{CL.umbrella(c,x,y-26,34,['#3a6ea5','#ff5d5d','#3fae5a'][i%3]);CL.dog(c,x,y+18,22,BREEDS.beagle);});}}
];
const MASKS=[
  {id:'none',name:'No mask'},
  {id:'fox',name:'Red fox',base:'#e8742a',lower:'#fbf6ec',liner:'#2a1a12',ear:'#e8742a',earTip:'#2a1a12',inner:'#fbf6ec',snout:'#e8742a',snoutLow:'#fbf6ec'},
  {id:'cat',name:'White cat',base:'#f7f5f0',liner:'#3a3a44',ear:'#f7f5f0',inner:'#f6a9bb',stripes:'#a3a8b0',nose:'#f07f98'},
  {id:'wolf',name:'Grey wolf',base:'#8a929c',lower:'#eef0f2',liner:'#2a2d33',ear:'#7a828c',earTip:'#4a5058',inner:'#e8e0dc',snout:'#8a929c',snoutLow:'#eef0f2',brows:'#eef0f2'},
  {id:'sheltie',name:'Kiko the Sheltie',base:'#d6994f',cap:'#5b3a24',lower:'#fbf6ec',liner:'#3a2216',ear:'#5b3a24',inner:'#f0a0a6',snout:'#fbf6ec',snoutLow:'#fbf6ec',blaze:'#fbf6ec',dots:'#e7b46a',tongue:true},
  {id:'bunny',name:'Bunny',base:'#f7f3f0',liner:'#5a4a4a',ear:'#f7f3f0',inner:'#f6a9bb',nose:'#f07f98',cheeks:'#ffc2cf',bunny:true}
];
// mask face is a slice of a sphere around Luna's head: 2.5 rad wide x 1.75 rad tall
const MASK_W=512,MASK_H=358,MASK_PHI=2.5,MASK_THETA0=0.35,MASK_THETA=1.75;
function maskCanvas(m){
  const cv=document.createElement('canvas');cv.width=MASK_W;cv.height=MASK_H;const c=cv.getContext('2d');
  const eyeY=(1.448-MASK_THETA0)/MASK_THETA*MASK_H,eyeDX=0.613/MASK_PHI*MASK_W;
  c.save();c.beginPath();c.ellipse(256,182,238,170,0,0,6.2832);c.ellipse(256,282,160,76,0,0,6.2832);c.clip();
  c.fillStyle=m.base;c.fillRect(0,0,MASK_W,MASK_H);
  if(m.cap){c.fillStyle=m.cap;c.beginPath();c.ellipse(256,30,250,120,0,0,6.2832);c.fill();for(const s of[-1,1]){c.beginPath();c.ellipse(256+s*240,190,70,170,0,0,6.2832);c.fill();}}
  if(m.lower){c.fillStyle=m.lower;c.beginPath();c.moveTo(40,250);c.quadraticCurveTo(150,200,256,262);c.quadraticCurveTo(362,200,472,250);c.lineTo(472,360);c.lineTo(40,360);c.closePath();c.fill();}
  if(m.blaze){c.fillStyle=m.blaze;c.beginPath();c.moveTo(244,10);c.lineTo(268,10);c.lineTo(290,262);c.lineTo(222,262);c.closePath();c.fill();}
  if(m.brows)for(const s of[-1,1]){c.fillStyle=m.brows;c.beginPath();c.ellipse(256+s*(eyeDX+6),eyeY-74,30,13,s*0.25,0,6.2832);c.fill();}
  if(m.dots)for(const s of[-1,1]){c.fillStyle=m.dots;c.beginPath();c.ellipse(256+s*(eyeDX-14),eyeY-70,15,10,0,0,6.2832);c.fill();}
  if(m.stripes){c.strokeStyle=m.stripes;c.lineWidth=12;c.lineCap='round';for(const dx of[-34,0,34]){c.beginPath();c.moveTo(256+dx,22);c.lineTo(256+dx*0.8,92);c.stroke();}
    for(const s of[-1,1])for(let k=0;k<2;k++){c.beginPath();c.moveTo(256+s*(205+k*12),150+k*40);c.lineTo(256+s*(160+k*10),160+k*40);c.stroke();}}
  if(m.cheeks)for(const s of[-1,1]){c.fillStyle=m.cheeks;c.beginPath();c.ellipse(256+s*150,285,36,26,0,0,6.2832);c.fill();}
  if(m.nose){c.fillStyle=m.nose;c.beginPath();c.moveTo(236,262);c.lineTo(276,262);c.lineTo(256,284);c.closePath();c.fill();
    c.strokeStyle=m.liner;c.lineWidth=4;c.beginPath();c.moveTo(256,284);c.lineTo(256,298);c.moveTo(232,304);c.quadraticCurveTo(244,314,256,298);c.quadraticCurveTo(268,314,280,304);c.stroke();
    c.lineWidth=3;for(const s of[-1,1])for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(256+s*60,290+k*8);c.lineTo(256+s*150,282+k*18);c.stroke();}}
  if(m.bunny){c.fillStyle='#ffffff';c.strokeStyle=m.liner;c.lineWidth=3;c.fillRect(244,306,24,24);c.strokeRect(244,306,24,24);c.beginPath();c.moveTo(256,306);c.lineTo(256,330);c.stroke();}
  c.restore();
  // eye holes so Luna's own eyes show through, ringed with a painted liner
  for(const s of[-1,1]){c.strokeStyle=m.liner;c.lineWidth=9;c.beginPath();c.ellipse(256+s*eyeDX,eyeY,54,56,s*-0.12,0,6.2832);c.stroke();}
  c.globalCompositeOperation='destination-out';for(const s of[-1,1]){c.beginPath();c.ellipse(256+s*eyeDX,eyeY,50,52,s*-0.12,0,6.2832);c.fill();}
  c.globalCompositeOperation='source-over';
  return cv;
}
OUTFITS.push(...SHOP_OUTFITS);MASKS.push(...SHOP_MASKS);
/* Wardrobe pieces (skirt, accessories, masks) built for any character, so every outfit and mask in the shop fits Luna AND Lady Moon */
function buildWardrobe(C){
  const head=C.headGroup,M=C.mats;
  const accMat=mStd('#ff8fab',{roughness:0.7}).clone();
  const skirt=new T.Mesh(new T.CylinderGeometry(0.31,0.45,0.27,28,1,true),M.shortsMat);skirt.position.set(0,C.HIP-0.07,0);skirt.material.side=T.DoubleSide;skirt.visible=false;skirt.castShadow=true;C.bodyPivot.add(skirt);
  // accessories
  const bandana=new T.Group();bandana.position.set(0,C.HIP+0.72,0.22);bandana.rotation.x=-0.25;C.bodyPivot.add(bandana);
  blob(bandana,new T.ConeGeometry(1,1,3),accMat,0,-0.07,0,0.2,0.22,0.03).rotation.set(Math.PI,0,0);blob(bandana,SPH,accMat,0,0.04,-0.02,0.05,0.04,0.04,false);
  const bow=new T.Group();bow.position.set(-0.3,0.43,0.2);bow.rotation.set(0.3,0,0.5);head.add(bow);
  for(const s of[-1,1]){const w=blob(bow,CONE,accMat,s*0.09,0,0,0.075,0.17,0.05);w.rotation.z=-s*Math.PI/2;}blob(bow,SPH,accMat,0,0,0,0.045,0.045,0.04);
  const beanie=new T.Group();head.add(beanie);
  const bm=new T.Mesh(new T.SphereGeometry(0.6,28,14,0,Math.PI*2,0,Math.PI*0.36),accMat);bm.scale.set(1.03,0.98,1.03);bm.position.y=0.03;bm.castShadow=true;beanie.add(bm);
  const rim=new T.Mesh(new T.TorusGeometry(0.54,0.045,8,28),accMat);rim.rotation.x=Math.PI/2;rim.position.y=0.29;beanie.add(rim);
  blob(beanie,SPH,mStd('#ffffff',{roughness:0.95}),0,0.66,0,0.1,0.1,0.1);
  const cap=new T.Group();head.add(cap);
  const cm=new T.Mesh(new T.SphereGeometry(0.6,28,14,0,Math.PI*2,0,Math.PI*0.34),accMat);cm.scale.set(1.03,0.95,1.03);cm.position.y=0.03;cm.castShadow=true;cap.add(cm);
  const brim=blob(cap,CYL,accMat,0,0.31,0.5,0.32,0.025,0.22);brim.rotation.x=0.18;blob(cap,SPH,accMat,0,0.62,0,0.04,0.03,0.04,false);
  const ACC={bandana,bow,beanie,cap};for(const k in ACC)ACC[k].visible=false;
  // masks: painted face plate with eye holes + 3D ears and snout
  const maskGroups={};
  for(const m of MASKS){if(m.id==='none')continue;
    const g=new T.Group();g.visible=false;head.add(g);maskGroups[m.id]=g;
    const earsG=new T.Group();g.add(earsG);g.userData.ears=earsG;   // ears can be hidden under a crochet hat
    const tex=new T.CanvasTexture(maskCanvas(m));tex.anisotropy=4;
    const geo=new T.SphereGeometry(0.545,40,28,Math.PI/2-MASK_PHI/2,MASK_PHI,MASK_THETA0,MASK_THETA);geo.scale(1.08,0.96,0.98);
    const plate=new T.Mesh(geo,new T.MeshStandardMaterial({map:tex,transparent:true,alphaTest:0.5,roughness:0.9,side:T.DoubleSide}));plate.castShadow=true;g.add(plate);
    const em=mStd(m.ear,{roughness:0.9}),im=mStd(m.inner,{roughness:0.9});
    for(const s of[-1,1]){
      const ear=new T.Group();earsG.add(ear);
      if(m.bunny){ear.position.set(s*0.16,0.5,0);ear.rotation.z=-s*0.12;blob(ear,SPH,em,0,0.32,0,0.09,0.36,0.05);blob(ear,SPH,im,0,0.32,0.03,0.05,0.28,0.02,false);}
      else{const h=m.id==='cat'?0.26:0.33;ear.position.set(s*0.3,0.48,0.02);ear.rotation.z=-s*0.28;
        blob(ear,CONE,em,0,h/2,0,0.15,h,0.07);blob(ear,CONE,im,0,h*0.42,0.04,0.09,h*0.7,0.02,false);
        if(m.earTip)blob(ear,CONE,mStd(m.earTip),0,h*0.85,0,0.055,h*0.3,0.075,false);}
    }
    if(m.snout){blob(g,SPH,mStd(m.snout,{roughness:0.9}),0,-0.06,0.5,0.16,0.12,0.2);blob(g,SPH,mStd(m.snoutLow,{roughness:0.9}),0,-0.12,0.52,0.13,0.08,0.17,false);
      blob(g,SPH,mStd('#1b1718',{roughness:0.3}),0,-0.03,0.69,0.05,0.035,0.035,false);
      if(m.tongue)blob(g,SPH,mStd('#f07a8a'),0,-0.17,0.62,0.045,0.015,0.05,false);}
  }
  return {accMat,skirt,ACC,maskGroups};
}
const WARDROBE=buildWardrobe(caretaker);
const MOON_WARDROBE=buildWardrobe(ladyMoon);
const SOLON_WARDROBE=buildWardrobe(solon);
for(const W of[WARDROBE,MOON_WARDROBE,SOLON_WARDROBE])W.skirt.scale.set(1.05,1.15,1.0);
solon.wardrobe=SOLON_WARDROBE;
// Shirt textures have to exist before Solon's closet runs. A saved outfit calls
// shirtTexture during startup, and a const declared below that call is still in the
// temporal dead zone (Cannot access 'SHIRT_TEX' before initialization).
const SHIRT_TEX={};
function shirtCanvas(o){
  const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');c.fillStyle=o.bg;c.fillRect(0,0,512,512);o.draw(c,512);return cv;
}
function shirtTexture(o){
  if(SHIRT_TEX[o.id])return SHIRT_TEX[o.id];
  if(o.id==='usual')return SHIRT_TEX.usual=caretaker.mats.shirtMat.map;
  const t=new T.CanvasTexture(shirtCanvas(o));t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(3,1);t.anisotropy=4;return SHIRT_TEX[o.id]=t;
}
SHIRT_TEX.usual=caretaker.mats.shirtMat.map;
applySolonCloset(false);
const CLOSET={outfit:'usual',mask:'none'};
function applyCloset(fromUser){
  const o=OUTFITS.find(x=>x.id===CLOSET.outfit)||OUTFITS[0],M=caretaker.mats,W=WARDROBE;
  M.shirtMat.map=shirtTexture(o);M.shirtMat.needsUpdate=true;
  M.shortsMat.color.set(o.bcol);M.shortsCuffMat.color.set(o.bcol).multiplyScalar(0.88);
  M.shoeBlackMat.color.set(o.shoe[0]);M.shoeWhiteMat.color.set(o.shoe[1]);
  for(const L of[caretaker.leftLeg,caretaker.rightLeg]){L.shortLeg.visible=o.bottom!=='skirt';L.cuff.visible=o.bottom==='shorts';L.pant.visible=o.bottom==='pants';}
  W.skirt.visible=o.bottom==='skirt';
  const masked=CLOSET.mask!=='none';
  for(const k in W.ACC)W.ACC[k].visible=o.acc===k&&!(masked&&k!=='bandana');
  if(o.accCol)W.accMat.color.set(o.accCol);
  for(const k in W.maskGroups)W.maskGroups[k].visible=k===CLOSET.mask;
  caretaker.nose.visible=!masked;
  if(fromUser){AI.twirlT=0.9;emote(caretaker.headGroup,masked&&CLOSET.lastChanged==='mask'?'note':'sparkle',masked?1.0:0.85);
    try{localStorage.setItem('lunas-closet-v2',JSON.stringify({outfit:CLOSET.outfit,mask:CLOSET.mask}));}catch(e){}}
}
try{const saved=JSON.parse(localStorage.getItem('lunas-closet-v2')||'null');if(saved){if(OUTFITS.some(o=>o.id===saved.outfit&&(!o.price||owns(o.id))))CLOSET.outfit=saved.outfit;if(MASKS.some(m=>m.id===saved.mask&&(!m.price||owns(m.id))))CLOSET.mask=saved.mask;}}catch(e){}
applyCloset(false);

/* closet panel UI */
(function closetUI(){
  const panel=document.getElementById('closet'),btn=document.getElementById('btnCloset'),og=document.getElementById('outfitGrid'),mg=document.getElementById('maskGrid');
  function teeThumb(o){
    const cv=document.createElement('canvas');cv.width=cv.height=168;const c=cv.getContext('2d');
    const src=o.id==='usual'?SHIRT_TEX.usual.image:shirtCanvas(o);
    c.save();c.beginPath();c.moveTo(48,18);c.lineTo(68,12);c.quadraticCurveTo(84,30,100,12);c.lineTo(120,18);c.lineTo(150,42);c.lineTo(134,62);c.lineTo(122,54);c.lineTo(122,104);c.lineTo(46,104);c.lineTo(46,54);c.lineTo(34,62);c.lineTo(18,42);c.closePath();
    c.clip();c.drawImage(src,0,0,256,256,14,8,140,140);c.restore();
    c.strokeStyle='rgba(31,36,64,0.35)';c.lineWidth=2;c.stroke();
    c.fillStyle=o.bcol;
    if(o.bottom==='skirt'){c.beginPath();c.moveTo(48,104);c.lineTo(120,104);c.lineTo(132,134);c.lineTo(36,134);c.closePath();c.fill();}
    else{const h=o.bottom==='pants'?52:24;c.fillRect(48,104,72,10);c.fillRect(48,104,34,h);c.fillRect(86,104,34,h);}
    c.fillStyle=o.shoe[0];for(const x of[50,88]){c.beginPath();c.ellipse(x+15,o.bottom==='pants'?160:146,16,7,0,0,6.2832);c.fill();}
    return cv;
  }
  function maskThumb(m){
    const cv=document.createElement('canvas');cv.width=cv.height=168;const c=cv.getContext('2d');
    if(m.id==='none'){c.strokeStyle='rgba(31,36,64,0.4)';c.lineWidth=5;c.beginPath();c.arc(84,84,44,0,6.2832);c.moveTo(53,115);c.lineTo(115,53);c.stroke();return cv;}
    c.fillStyle=m.ear;
    for(const s of[-1,1]){if(m.bunny){c.beginPath();c.ellipse(84+s*22,40,14,36,s*0.1,0,6.2832);c.fill();}
      else{c.beginPath();c.moveTo(84+s*28,46);c.lineTo(84+s*58,6);c.lineTo(84+s*66,58);c.closePath();c.fill();if(m.earTip){c.fillStyle=m.earTip;c.beginPath();c.moveTo(84+s*52,14);c.lineTo(84+s*58,6);c.lineTo(84+s*61,22);c.closePath();c.fill();c.fillStyle=m.ear;}}}
    c.drawImage(maskCanvas(m),0,0,MASK_W,MASK_H,4,36,160,112);
    if(m.snout){c.fillStyle=m.snout;c.beginPath();c.ellipse(84,124,22,16,0,0,6.2832);c.fill();c.fillStyle='#1b1718';c.beginPath();c.ellipse(84,118,7,5,0,0,6.2832);c.fill();}
    return cv;
  }
  function card(label,cv,pressed,onPick){const b=document.createElement('button');b.type='button';b.className='card';b.setAttribute('aria-pressed',pressed);
    cv.setAttribute('aria-hidden','true');b.appendChild(cv);const s=document.createElement('span');s.textContent=label;b.appendChild(s);b.onclick=onPick;return b;}
  let who='luna';
  const whoLuna=document.getElementById('whoLuna'),whoMoon=document.getElementById('whoMoon'),whoSolon=document.getElementById('whoSolon'),hatSec=document.getElementById('moonHatSec'),hatGrid=document.getElementById('moonHatGrid'),solonSec=document.getElementById('solonSec'),solonGrid=document.getElementById('solonHatGrid'),outfitHead=document.getElementById('outfitHead'),maskHead=document.getElementById('maskHead');
  function setWho(next){who=next;if(whoLuna)whoLuna.setAttribute('aria-selected',next==='luna');if(whoMoon)whoMoon.setAttribute('aria-selected',next==='moon');if(whoSolon)whoSolon.setAttribute('aria-selected',next==='solon');render();}
  function hatThumb(h){
    const cv=document.createElement('canvas');cv.width=cv.height=168;const c=cv.getContext('2d');
    if(h.id==='none'){ // just her blue waves: a little hair swatch with a "no hat" slash
      c.fillStyle='#1d68e3';c.beginPath();c.arc(84,84,40,Math.PI,0);c.lineTo(124,128);c.quadraticCurveTo(114,136,104,126);c.lineTo(104,92);c.lineTo(64,92);c.lineTo(64,126);c.quadraticCurveTo(54,136,44,128);c.closePath();c.fill();
      c.strokeStyle='rgba(31,36,64,0.4)';c.lineWidth=5;c.beginPath();c.arc(84,84,62,0,6.2832);c.moveTo(40,128);c.lineTo(128,40);c.stroke();return cv;}
    const col=h.id==='frog'?'#7ed465':h.id==='strawberry'?'#f5a4bc':h.id==='coral'?'#e54832':'#1d68e3';
    c.fillStyle=col;c.beginPath();c.arc(84,92,48,Math.PI,0);c.lineTo(146,112);c.quadraticCurveTo(84,126,22,112);c.closePath();c.fill();
    c.strokeStyle='rgba(31,36,64,0.35)';c.lineWidth=3;c.stroke();
    if(h.id==='frog'){for(const sx of[-1,1]){c.fillStyle='#7ed465';c.beginPath();c.arc(84+sx*26,44,16,0,6.28);c.fill();c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(84+sx*26,44,11,0,6.28);c.fill();c.fillStyle='#161618';c.beginPath();c.arc(84+sx*26,44,6.5,0,6.28);c.fill();}}
    else if(h.id==='strawberry'){for(const dx of[-30,0,30]){c.fillStyle='#e52b30';c.beginPath();c.arc(84+dx,78,9,0,6.28);c.fill();c.fillStyle='#3ea845';c.fillRect(81+dx,66,6,5);}c.fillStyle='#3ea845';c.beginPath();c.ellipse(84,42,18,6,0,0,6.28);c.fill();}
    return cv;
  }
  if(whoLuna&&whoMoon){
    whoLuna.onclick=()=>setWho('luna');
    whoMoon.onclick=()=>setWho('moon');
    if(whoSolon)whoSolon.onclick=()=>setWho('solon');
  }
  function solonBeanieThumb(on){
    const cv=document.createElement('canvas');cv.width=cv.height=168;const c=cv.getContext('2d');
    c.fillStyle='#67b84e';c.beginPath();c.arc(84,96,46,Math.PI,0);c.lineTo(130,118);c.quadraticCurveTo(84,132,38,118);c.closePath();c.fill();
    c.strokeStyle='rgba(31,36,64,0.35)';c.lineWidth=3;c.stroke();
    if(on){c.fillStyle='#3f8f3a';for(const sx of[-1,1]){c.beginPath();c.arc(84+sx*26,50,15,0,6.28);c.fill();c.stroke();}}
    else{c.strokeStyle='rgba(31,36,64,0.45)';c.lineWidth=5;c.beginPath();c.moveTo(48,40);c.lineTo(120,128);c.stroke();}
    return cv;
  }
  function solonUsualThumb(){
    const cv=document.createElement('canvas');cv.width=cv.height=168;const c=cv.getContext('2d');
    c.fillStyle='#3cb44a';c.fillRect(36,28,96,78);c.fillStyle='#f4f6f2';c.fillRect(62,52,44,22);c.strokeStyle='#1b1b1b';c.lineWidth=3;c.strokeRect(62,52,44,22);
    c.fillStyle='#2a3f78';c.fillRect(48,108,72,28);c.fillStyle='#3cb44a';c.fillRect(46,142,30,12);c.fillRect(92,142,30,12);return cv;
  }
  function render(){
    og.textContent='';mg.textContent='';
    if(hatSec)hatSec.hidden=(who!=='moon');
    if(solonSec)solonSec.hidden=who!=='solon';
    if(outfitHead)outfitHead.hidden=false;
    if(maskHead)maskHead.hidden=false;
    og.hidden=false;mg.hidden=false;
    if(who==='solon'&&solonGrid){
      solonGrid.textContent='';
      solonGrid.appendChild(card('Pom beanie',solonBeanieThumb(true),SOLON_STYLE.hat!==false,()=>{SOLON_STYLE.hat=true;applySolonCloset(true);render();}));
      solonGrid.appendChild(card('Hair only',solonBeanieThumb(false),SOLON_STYLE.hat===false,()=>{SOLON_STYLE.hat=false;applySolonCloset(true);render();}));
    }
    if(who==='moon'&&hatGrid){
      hatGrid.textContent='';
      for(const h of MOON_HATS){
        hatGrid.appendChild(card(h.icon+' '+h.name,hatThumb(h),MOON_STYLE.hat===h.id,()=>{MOON_STYLE.hat=h.id;MOON_STYLE.userLockedHat=true;applyLadyMoonCloset(true);render();}));
      }
    }
    if(who==='solon'){
      og.appendChild(card('His usual',solonUsualThumb(),SOLON_STYLE.outfit==='solon',()=>{SOLON_STYLE.outfit='solon';applySolonCloset(true);render();}));
      for(const o of OUTFITS)if(!o.hidden&&(!o.price||owns(o.id)))og.appendChild(card(o.name,teeThumb(o),SOLON_STYLE.outfit===o.id,()=>{SOLON_STYLE.outfit=o.id;applySolonCloset(true);render();}));
      for(const m of MASKS)if(!m.price||owns(m.id))mg.appendChild(card(m.name,maskThumb(m),SOLON_STYLE.mask===m.id,()=>{SOLON_STYLE.mask=m.id;applySolonCloset(true);render();}));
    }else if(who==='moon'){
      for(const o of OUTFITS)if(!o.hidden&&(!o.price||owns(o.id)))og.appendChild(card(o.name,teeThumb(o),MOON_STYLE.outfit===o.id,()=>{MOON_STYLE.outfit=o.id;applyLadyMoonCloset(true);render();}));
      for(const m of MASKS)if(!m.price||owns(m.id))mg.appendChild(card(m.name,maskThumb(m),MOON_STYLE.mask===m.id,()=>{MOON_STYLE.mask=m.id;applyLadyMoonCloset(true);render();}));
    }else{
      for(const o of OUTFITS)if(!o.hidden&&(!o.price||owns(o.id)))og.appendChild(card(o.name,teeThumb(o),CLOSET.outfit===o.id,()=>{CLOSET.outfit=o.id;CLOSET.lastChanged='outfit';applyCloset(true);render();}));
      for(const m of MASKS)if(!m.price||owns(m.id))mg.appendChild(card(m.name,maskThumb(m),CLOSET.mask===m.id,()=>{CLOSET.mask=m.id;CLOSET.lastChanged='mask';applyCloset(true);render();}));
    }
  }
  CLOSET.thumb=teeThumb;CLOSET.maskThumb=maskThumb;
  function setOpen(v){if(v){render();const mk=document.getElementById('market');if(mk&&!mk.hidden){mk.hidden=true;document.getElementById('btnMarket').setAttribute('aria-expanded','false');}}panel.hidden=!v;btn.setAttribute('aria-expanded',v);if(v)panel.querySelector('.closet-close').focus();}
  btn.onclick=()=>setOpen(panel.hidden);
  panel.querySelector('.closet-close').onclick=()=>{setOpen(false);btn.focus();};
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false);btn.focus();}});
})();

/* ================= shop decorations you can buy and place anywhere ================= */
const DECOR_ANIM=[];
const DM=(c,o)=>mStd(c,o);
const DECOR_CATALOG=[
  {id:'pinwheel',name:'Pinwheel',icon:'🎐',price:40,r:0,build(g){blob(g,CYL,DM('#e9e4da'),0,0.55,0,0.025,1.1,0.025);const h=new T.Group();h.position.set(0,1.1,0.05);g.add(h);
    ['#ff5d8f','#4fb3ff','#f2c94c','#7fae3a'].forEach((c,i)=>{const b=blob(h,CONE,DM(c,{side:T.DoubleSide}),0,0.13,0,0.09,0.26,0.01);const p=new T.Group();p.rotation.z=i*Math.PI/2;p.add(b);h.add(p);});
    DECOR_ANIM.push((dt,t)=>{h.rotation.z+=dt*(2+Math.sin(t*0.7));});}},
  {id:'hay',name:'Hay bale',icon:'🌾',price:45,r:0.7,build(g){blob(g,BOX,DM('#d9b65a',{roughness:1}),0,0.36,0,1.25,0.72,0.82);for(const x of[-0.3,0.3])blob(g,BOX,DM('#8a6a2a'),x,0.36,0,0.04,0.74,0.84,false);
    for(let k=0;k<8;k++){const t=blob(g,CONE,DM('#e8cc78'),rnd(-0.55,0.55),0.74,rnd(-0.35,0.35),0.03,0.14,0.03,false);t.rotation.z=rnd(-0.6,0.6);}}},
  {id:'mailbox',name:'Mailbox',icon:'📮',price:55,r:0.3,build(g){blob(g,BOX,DM('#6e4b33'),0,0.5,0,0.1,1.0,0.1);blob(g,BOX,DM('#4f7fb8'),0,1.1,0,0.3,0.26,0.5);
    const top=blob(g,CYL,DM('#4f7fb8'),0,1.23,0,0.15,0.5,0.15);top.rotation.x=Math.PI/2;blob(g,BOX,DM('#d93a3a'),0.17,1.3,-0.1,0.02,0.24,0.06,false);}},
  {id:'pumpkins',name:'Pumpkin stack',icon:'🎃',price:60,r:0.7,build(g){const o=DM('#e8792a',{roughness:0.6});blob(g,SPH,o,0,0.3,0,0.5,0.32,0.5);blob(g,SPH,o,0.05,0.75,0.02,0.34,0.24,0.34);blob(g,SPH,DM('#f2c94c',{roughness:0.6}),0.62,0.18,0.25,0.24,0.18,0.24);
    for(const[x,y]of[[0,0.6],[0.05,0.98],[0.62,0.36]])blob(g,CYL,DM('#5a7a2a'),x,y,0,0.04,0.12,0.04,false);}},
  {id:'planter',name:'Flower planter',icon:'🌷',price:70,r:0.7,build(g){blob(g,BOX,DM('#8a6143'),0,0.25,0,1.3,0.5,0.6);blob(g,BOX,DM('#4a3324'),0,0.5,0,1.2,0.04,0.5,false);
    for(let k=0;k<9;k++){const x=-0.5+(k%5)*0.25,z=k<5?-0.12:0.12;blob(g,CYL,DM('#4d8f35'),x,0.68,z,0.015,0.35,0.015,false);blob(g,SPH,DM(['#ff5d8f','#f2c94c','#b07aff','#ff8a3d','#ffffff'][k%5]),x,0.88,z,0.08,0.06,0.08,false);}}},
  {id:'birdbath',name:'Bird bath',icon:'🐦',price:100,r:0.45,build(g){const st=DM('#b9b3a6');blob(g,CYL,st,0,0.08,0,0.35,0.16,0.35);blob(g,CYL,st,0,0.5,0,0.12,0.8,0.12);blob(g,CYL,st,0,0.95,0,0.5,0.14,0.5);
    blob(g,CYL,DM('#8fd6ff',{roughness:0.1,metalness:0.2}),0,1.03,0,0.42,0.02,0.42,false);const b=new T.Group();b.position.set(0.38,1.08,0);g.add(b);
    blob(b,SPH,DM('#4fb3ff'),0,0.06,0,0.07,0.06,0.09);blob(b,SPH,DM('#4fb3ff'),0,0.13,0.06,0.045,0.045,0.045);blob(b,CONE,DM('#f2a33a'),0,0.13,0.11,0.015,0.04,0.015,false).rotation.x=Math.PI/2;
    DECOR_ANIM.push((dt,t)=>{b.rotation.y=Math.sin(t*1.3)*0.8;b.position.y=1.08+Math.max(0,Math.sin(t*4))*0.03;});}},
  {id:'bench',name:'Garden bench',icon:'🪑',price:110,r:0.9,build(g){const w=DM('#8a6143'),d=DM('#3b2a20');blob(g,BOX,w,0,0.5,0,1.8,0.1,0.55);blob(g,BOX,w,0,0.9,-0.25,1.8,0.45,0.08);
    for(const x of[-0.8,0.8]){blob(g,BOX,d,x,0.25,0,0.1,0.5,0.5);blob(g,BOX,d,x,0.7,-0.25,0.08,0.9,0.08);}}},
  {id:'campfire',name:'Campfire',icon:'🔥',price:120,r:0.7,build(g){for(let k=0;k<9;k++){const a=k/9*6.28;blob(g,SPH,DM('#8e887d'),Math.cos(a)*0.55,0.08,Math.sin(a)*0.55,0.16,0.12,0.16);}
    for(const a of[0,1.05,2.1]){const l=blob(g,CYL,DM('#6b4a36'),0,0.14,0,0.07,0.8,0.07);l.rotation.set(Math.PI/2-0.3,a,0);}
    const fl=[];for(const[s,c,x,z]of[[1,'#ff8a3d',0,0],[0.7,'#ffd23f',0.08,0.05],[0.6,'#ff5d3d',-0.1,-0.05]]){fl.push(blob(g,CONE,DM(c,{emissive:c,emissiveIntensity:1.6,roughness:1}),x,0.38*s,z,0.2*s,0.7*s,0.2*s,false));}
    DECOR_ANIM.push((dt,t)=>{fl.forEach((f,i)=>{const k=1+Math.sin(t*(9+i*3)+i)*0.12;f.scale.y=0.7*(i?0.7-i*0.1:1)*k;});});}},
  {id:'stonelantern',name:'Stone lantern',icon:'🏮',price:130,r:0.5,build(g){const st=DM('#aaa498');blob(g,CYL,st,0,0.1,0,0.4,0.2,0.4);blob(g,CYL,st,0,0.55,0,0.12,0.7,0.12);blob(g,BOX,st,0,0.95,0,0.5,0.1,0.5);
    blob(g,BOX,DM('#ffd58a',{emissive:'#ffb347',emissiveIntensity:1.4}),0,1.15,0,0.3,0.3,0.3,false);blob(g,CONE,st,0,1.48,0,0.48,0.35,0.48);blob(g,SPH,st,0,1.7,0,0.07,0.08,0.07);}},
  {id:'scarecrow',name:'Scarecrow',icon:'🧑‍🌾',price:140,r:0.45,build(g){const w=DM('#8a6143');blob(g,CYL,w,0,0.9,0,0.05,1.8,0.05);const bar=blob(g,CYL,w,0,1.35,0,0.04,1.3,0.04);bar.rotation.z=Math.PI/2;
    blob(g,BOX,DM('#c63a2f'),0,1.25,0,0.5,0.6,0.25);blob(g,BOX,DM('#3f5f8f'),0,0.88,0,0.42,0.3,0.22);for(const s of[-1,1])blob(g,BOX,DM('#c63a2f'),s*0.48,1.35,0,0.5,0.16,0.16);
    blob(g,SPH,DM('#e2cc9a'),0,1.78,0,0.2,0.22,0.2);blob(g,CYL,DM('#c9a24a'),0,1.94,0,0.36,0.03,0.36);blob(g,CONE,DM('#c9a24a'),0,2.08,0,0.2,0.28,0.2);
    for(const s of[-1,1])blob(g,SPH,DM('#2a211c'),s*0.07,1.8,0.18,0.025,0.025,0.02,false);for(const s of[-1,1])for(let k=0;k<3;k++){const t=blob(g,CONE,DM('#e8cc78'),s*(0.75+k*0.02),1.33+(k-1)*0.05,0,0.03,0.18,0.03,false);t.rotation.z=s*(Math.PI/2+(k-1)*0.3);}}},
  {id:'umbrella',name:'Beach umbrella',icon:'⛱️',price:160,r:0.6,build(g){blob(g,CYL,DM('#e9e4da'),0,1.1,0,0.035,2.2,0.035);
    const tx=canvasTex(256,64,c=>{for(let i=0;i<8;i++){c.fillStyle=i%2?'#ffffff':'#4fb3ff';c.fillRect(i*32,0,32,64);}});
    const cn=new T.Mesh(new T.ConeGeometry(1.3,0.5,16,1,true),new T.MeshStandardMaterial({map:tx,side:T.DoubleSide,roughness:0.7}));cn.position.y=2.15;cn.castShadow=true;g.add(cn);
    const tw=blob(g,BOX,DM('#ff8fab'),0.9,0.03,0.2,0.7,0.02,1.4,false);tw.rotation.y=0.3;const ch=new T.Group();ch.position.set(-0.7,0,0.3);ch.rotation.y=0.6;g.add(ch);
    blob(ch,BOX,DM('#f2c94c'),0,0.3,0,0.55,0.05,0.7);const bk=blob(ch,BOX,DM('#f2c94c'),0,0.55,-0.4,0.55,0.05,0.6);bk.rotation.x=-1.0;}},
  {id:'picnic',name:'Picnic table',icon:'🧺',price:180,r:1.2,build(g){const w=DM('#8a6143');blob(g,BOX,w,0,0.75,0,1.9,0.08,0.9);for(const s of[-1,1]){blob(g,BOX,w,0,0.42,s*0.75,1.9,0.07,0.32);
      for(const x of[-0.75,0.75])blob(g,BOX,DM('#6e4b33'),x,0.37,s*0.3,0.08,0.75,0.08);}
    const cl=canvasTex(64,64,c=>{c.fillStyle='#fff';c.fillRect(0,0,64,64);c.fillStyle='rgba(217,72,59,0.55)';for(let i=0;i<64;i+=16){c.fillRect(i,0,8,64);c.fillRect(0,i,64,8);}});
    const cloth=new T.Mesh(new T.BoxGeometry(1.2,0.02,0.95),new T.MeshStandardMaterial({map:cl,roughness:0.9}));cloth.position.y=0.8;g.add(cloth);
    blob(g,CYL,DM('#b5864a'),0.3,0.92,0,0.16,0.2,0.12);blob(g,SPH,DM('#e2432f'),-0.3,0.86,0.1,0.07,0.07,0.07);blob(g,SPH,DM('#7fae3a'),-0.2,0.86,-0.12,0.07,0.07,0.07);}},
  {id:'hutch',name:'Bunny hutch',icon:'🐇',price:200,r:0.85,build(g){const w=DM('#c98b5a');blob(g,BOX,w,0,0.75,0,1.5,0.7,0.9);for(const[x,z]of[[-0.65,-0.35],[0.65,-0.35],[-0.65,0.35],[0.65,0.35]])blob(g,BOX,DM('#6e4b33'),x,0.2,z,0.08,0.4,0.08);
    const rf=blob(g,CONE,DM('#9b3b2f'),0,1.35,0,1.15,0.5,0.75);rf.rotation.y=Math.PI/4;rf.scale.set(1.15,0.5,0.75);
    blob(g,BOX,DM('#d9d4c8',{transparent:true,opacity:0.5}),0.2,0.75,0.46,0.9,0.55,0.02,false);
    blob(g,SPH,DM('#f5f1ea'),0.2,0.55,0.15,0.13,0.11,0.16);blob(g,SPH,DM('#f5f1ea'),0.2,0.68,0.28,0.09,0.08,0.08);for(const s of[-1,1])blob(g,SPH,DM('#f5f1ea'),0.2+s*0.04,0.82,0.26,0.025,0.08,0.02,false);}},
  {id:'maple',name:'Maple tree',icon:'🍁',price:240,r:0.7,build(g){blob(g,CYL,DM('#5a3d2a'),0,1.2,0,0.22,2.4,0.22);
    for(let k=0;k<7;k++){const a=k/7*6.28,r=k?1:0;blob(g,new T.IcosahedronGeometry(1,1),DM(['#d9532b','#e8792a','#c63a2f','#f2a33a'][k%4],{flatShading:true}),Math.cos(a)*r,2.9+(k?rnd(-0.3,0.4):0.4),Math.sin(a)*r,1.1,0.95,1.1);}}},
  {id:'cherry',name:'Cherry tree',icon:'🌸',price:260,r:0.7,build(g){blob(g,CYL,DM('#6b4a36'),0,1.1,0,0.2,2.2,0.2);const br=blob(g,CYL,DM('#6b4a36'),0.4,2.3,0,0.1,1.2,0.1);br.rotation.z=-0.6;
    for(let k=0;k<7;k++){const a=k/7*6.28,r=k?1.05:0;blob(g,new T.IcosahedronGeometry(1,1),DM(['#ffb7d0','#ffd1e0','#ff9ac0'][k%3],{flatShading:true}),Math.cos(a)*r,2.8+(k?rnd(-0.3,0.4):0.45),Math.sin(a)*r,1.05,0.9,1.05);}}},
  {id:'lamp',name:'Lamp post',icon:'💡',price:150,r:0.3,build(g){const d=DM('#2b2d31',{metalness:0.4,roughness:0.5});blob(g,CYL,d,0,0.1,0,0.22,0.2,0.22);blob(g,CYL,d,0,1.3,0,0.06,2.4,0.06);
    blob(g,BOX,DM('#ffe2a8',{emissive:'#ffc46b',emissiveIntensity:1.6}),0,2.65,0,0.3,0.4,0.3,false);blob(g,CONE,d,0,2.98,0,0.3,0.25,0.3);blob(g,SPH,d,0,3.13,0,0.05,0.05,0.05);}},
  {id:'dogstatue',name:'Kiko statue',icon:'🐕',price:320,r:0.6,build(g){const st=DM('#b9b3a6',{roughness:0.85});blob(g,BOX,st,0,0.3,0,1.0,0.6,1.0);
    const d=makeDog({});d.root.scale.setScalar(1.6);d.root.position.y=0.6;d.legs.forEach(l=>{});d.root.traverse(o=>{if(o.isMesh)o.material=st;});g.add(d.root);}},
  {id:'fountain',name:'Fountain',icon:'⛲',price:420,r:1.35,build(g){const st=DM('#aaa498');blob(g,CYL,st,0,0.25,0,1.4,0.5,1.4);blob(g,CYL,DM('#6fc3e8',{roughness:0.1,metalness:0.2}),0,0.48,0,1.25,0.04,1.25,false);
    blob(g,CYL,st,0,1.0,0,0.18,1.2,0.18);blob(g,CYL,st,0,1.55,0,0.6,0.16,0.6);blob(g,CYL,DM('#6fc3e8',{roughness:0.1}),0,1.63,0,0.52,0.02,0.52,false);
    const sp=blob(g,CONE,DM('#d8f1ff',{transparent:true,opacity:0.55,roughness:0.1}),0,1.95,0,0.12,0.6,0.12,false);
    const fall=blob(g,CYL,DM('#d8f1ff',{transparent:true,opacity:0.35,roughness:0.1,side:T.DoubleSide}),0,1.05,0,0.62,1.05,0.62,false);
    DECOR_ANIM.push((dt,t)=>{sp.scale.y=0.6+Math.sin(t*6)*0.06;fall.material.opacity=0.3+Math.sin(t*3)*0.05;});}}
];
const DECOR_BY_ID=Object.fromEntries(DECOR_CATALOG.map(d=>[d.id,d]));
const ICO_G=new T.IcosahedronGeometry(1,1);

// ---- 30 more things to buy: 10 small, 10 medium, 10 large ----
function decorPool(g,r){const m=new T.Mesh(new T.PlaneGeometry(r*2,r*2),POOL_MAT);m.rotation.x=-Math.PI/2;m.position.y=0.1;m.renderOrder=2;m.userData.noShadow=true;g.add(m);}
const GLOW=(c,i=1.4)=>DM(c,{emissive:c,emissiveIntensity:i});
DECOR_CATALOG.push(
  // small
  {id:'flowerpot',size:'small',name:'Flower pot',icon:'🪴',price:25,r:0.35,build(g){blob(g,CYL,DM('#c9734a'),0,0.22,0,0.28,0.44,0.28);blob(g,CYL,DM('#4a3324'),0,0.43,0,0.25,0.03,0.25,false);
    for(let k=0;k<5;k++){const a=k*1.26;blob(g,CYL,DM('#4d8f35'),Math.cos(a)*0.1,0.6,Math.sin(a)*0.1,0.015,0.32,0.015,false);blob(g,SPH,DM(['#ff5d8f','#f2c94c','#b07aff','#ff8a3d','#ffffff'][k]),Math.cos(a)*0.1,0.78,Math.sin(a)*0.1,0.07,0.06,0.07,false);}}},
  {id:'gnome',size:'small',name:'Garden gnome',icon:'🧙',price:35,r:0.3,use:'saying hi to the garden gnome',build(g){blob(g,SPH,DM('#3f6fb8'),0,0.25,0,0.2,0.26,0.18);blob(g,SPH,DM('#f2d0b0'),0,0.58,0.02,0.13,0.13,0.13);
    blob(g,CONE,DM('#d93a3a'),0,0.85,0,0.15,0.4,0.15);blob(g,CONE,DM('#ffffff'),0,0.45,0.1,0.13,0.25,0.07,false).rotation.x=Math.PI;blob(g,SPH,DM('#f08a7a'),0,0.58,0.14,0.04,0.035,0.035,false);}},
  {id:'mushrooms',size:'small',name:'Toadstools',icon:'🍄',price:30,r:0.35,build(g){for(const[x,z,s]of[[0,0,1],[0.25,0.12,0.7],[-0.2,0.18,0.55]]){blob(g,CYL,DM('#f6efe2'),x,0.16*s,z,0.06*s,0.32*s,0.06*s);
    blob(g,SPH,DM('#d93a3a'),x,0.33*s,z,0.2*s,0.11*s,0.2*s);for(let k=0;k<4;k++){const a=k*1.6;blob(g,SPH,DM('#ffffff'),x+Math.cos(a)*0.11*s,0.4*s,z+Math.sin(a)*0.11*s,0.03*s,0.02*s,0.03*s,false);}}}},
  {id:'jackolantern',size:'small',name:"Jack-o'-lantern",icon:'🎃',price:40,r:0.4,build(g){blob(g,SPH,DM('#e8792a',{emissive:'#ff7a1a',emissiveIntensity:0.45}),0,0.27,0,0.4,0.3,0.4);
    for(const s of[-1,1])blob(g,CONE,GLOW('#ffd23f',2),s*0.12,0.33,0.36,0.06,0.08,0.03,false);blob(g,BOX,GLOW('#ffd23f',2),0,0.18,0.37,0.2,0.05,0.03,false);blob(g,CYL,DM('#5a7a2a'),0,0.6,0,0.04,0.12,0.04,false);decorPool(g,1.8);}},
  {id:'birdfeeder',size:'small',name:'Bird feeder',icon:'🐦',price:55,r:0.3,use:'watching the birds at the feeder',build(g){blob(g,CYL,DM('#6e4b33'),0,0.7,0,0.04,1.4,0.04);blob(g,BOX,DM('#8a6143'),0,1.42,0,0.42,0.06,0.42);
    blob(g,CONE,DM('#c63a2f'),0,1.7,0,0.36,0.25,0.36).rotation.y=Math.PI/4;for(const[a,b]of[[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]])blob(g,CYL,DM('#6e4b33'),a,1.55,b,0.02,0.25,0.02,false);
    blob(g,CYL,DM('#d9b65a'),0,1.47,0,0.15,0.04,0.15,false);const b=new T.Group();g.add(b);blob(b,SPH,DM('#e2432f'),0,0,0,0.06,0.055,0.08);blob(b,SPH,DM('#e2432f'),0,0.05,0.06,0.04,0.04,0.04);
    DECOR_ANIM.push((dt,t)=>{const a=t*0.6;b.position.set(Math.cos(a)*0.17,1.5+Math.max(0,Math.sin(t*5))*0.03,Math.sin(a)*0.17);b.rotation.y=-a;});}},
  {id:'windchime',size:'small',name:'Wind chime',icon:'🎐',price:45,r:0.3,build(g){blob(g,CYL,DM('#6e4b33'),0,0.85,0,0.04,1.7,0.04);blob(g,BOX,DM('#6e4b33'),0.25,1.68,0,0.5,0.04,0.04);
    const h=new T.Group();h.position.set(0.45,1.62,0);g.add(h);blob(h,CYL,DM('#8a6143'),0,0,0,0.12,0.03,0.12);const tubes=[];
    for(let k=0;k<5;k++){const a=k*1.26,tb=blob(h,CYL,DM('#b9c2ca',{metalness:0.7,roughness:0.3}),Math.cos(a)*0.09,-0.2-k*0.03,Math.sin(a)*0.09,0.015,0.3+k*0.05,0.015,false);tubes.push(tb);}
    DECOR_ANIM.push((dt,t)=>{h.rotation.z=Math.sin(t*1.7)*0.12;h.rotation.x=Math.sin(t*1.3+1)*0.1;});}},
  {id:'dogbowls',size:'small',name:'Dog bowl set',icon:'🦴',price:30,r:0.45,build(g){for(const[x,c]of[[-0.2,'#ff8fab'],[0.22,'#4fb3ff']]){blob(g,CYL,DM(c),x,0.07,0,0.17,0.14,0.17);blob(g,CYL,DM(x<0?'#8a5a2b':'#8fd6ff'),x,0.13,0,0.13,0.02,0.13,false);}
    const bn=blob(g,CYL,DM('#f3ead6'),0,0.04,0.3,0.03,0.24,0.03);bn.rotation.z=Math.PI/2;for(const s of[-1,1])blob(g,SPH,DM('#f3ead6'),s*0.12,0.04,0.3,0.04,0.04,0.04,false);}},
  {id:'pathlight',size:'small',name:'Path light',icon:'🕯️',price:35,r:0.2,build(g){blob(g,CYL,DM('#2b2d31'),0,0.25,0,0.04,0.5,0.04);blob(g,CYL,GLOW('#ffe2a8',1.8),0,0.55,0,0.09,0.14,0.09,false);blob(g,CONE,DM('#2b2d31'),0,0.68,0,0.13,0.1,0.13);decorPool(g,1.6);}},
  {id:'berrybush',size:'small',name:'Berry bush',icon:'🫐',price:70,r:0.5,produce:{good:'berries',every:110,n:4},use:'picking berries',act:'harvest',build(g){for(let k=0;k<3;k++)blob(g,ICO_G,DM('#3f7a3a',{flatShading:true}),(k-1)*0.25,0.35,(k%2)*0.15,0.38,0.32,0.36);
    for(let k=0;k<14;k++){const a=k*0.9;blob(g,SPH,DM('#4a5fc4',{roughness:0.4}),Math.cos(a)*0.42,0.25+(k%4)*0.12,Math.sin(a)*0.3,0.05,0.05,0.05,false);}}},
  {id:'signpost',size:'small',name:'Signpost',icon:'🪧',price:30,r:0.25,build(g){blob(g,BOX,DM('#6e4b33'),0,0.8,0,0.1,1.6,0.1);
    for(const[y,ry,c]of[[1.45,0.3,'#f2c94c'],[1.2,-0.5,'#7fae9a'],[0.95,2.4,'#ff8fab']]){const b=new T.Group();b.position.y=y;b.rotation.y=ry;g.add(b);blob(b,BOX,DM(c),0.3,0,0,0.6,0.16,0.04);blob(b,CONE,DM(c),0.66,0,0,0.1,0.14,0.04).rotation.z=-Math.PI/2;}}},
  // medium
  {id:'beehive',size:'medium',name:'Beehive',icon:'🐝',price:160,r:0.6,produce:{good:'honey',every:120,n:1},use:'checking on the bees',build(g){blob(g,BOX,DM('#6e4b33'),0,0.2,0,0.7,0.4,0.6);
    for(let k=0;k<3;k++)blob(g,BOX,DM(k%2?'#f2c94c':'#fbf3e4'),0,0.52+k*0.26,0,0.62,0.24,0.52);blob(g,BOX,DM('#c63a2f'),0,1.32,0,0.72,0.08,0.62);
    const bees=[];for(let k=0;k<5;k++){const b=new T.Group();g.add(b);blob(b,SPH,DM('#f2c94c'),0,0,0,0.04,0.035,0.05);blob(b,SPH,DM('#211b18'),0,0,-0.02,0.035,0.03,0.02,false);bees.push(b);}
    DECOR_ANIM.push((dt,t)=>bees.forEach((b,k)=>{const a=t*(1.5+k*0.3)+k*1.3;b.position.set(Math.cos(a)*(0.6+k*0.08),0.9+Math.sin(a*2.3)*0.25,Math.sin(a)*(0.55+k*0.06));b.rotation.y=-a;}));}},
  {id:'rainbarrel',size:'medium',name:'Rain barrel',icon:'🛢️',price:90,r:0.5,build(g){blob(g,CYL,DM('#8a6143'),0,0.5,0,0.42,1.0,0.42);for(const y of[0.2,0.8])blob(g,CYL,DM('#3b3d42',{metalness:0.5}),0,y,0,0.44,0.05,0.44,false);
    blob(g,CYL,DM('#6fc3e8',{roughness:0.1}),0,1.0,0,0.37,0.02,0.37,false);const sp=blob(g,CYL,DM('#b9c2ca',{metalness:0.6}),0.42,0.2,0,0.03,0.18,0.03,false);sp.rotation.z=Math.PI/2;}},
  {id:'wheelbarrow',size:'medium',name:'Wheelbarrow',icon:'🛒',price:95,r:0.7,build(g){blob(g,BOX,DM('#3f8f6a'),0,0.5,0,0.7,0.3,1.0);const w=blob(g,new T.TorusGeometry(0.2,0.06,8,16),DM('#2b2d31'),0,0.22,0.6,1,1,1);w.rotation.y=Math.PI/2;
    for(const s of[-1,1]){const h=blob(g,CYL,DM('#8a6143'),s*0.28,0.5,-0.7,0.03,0.7,0.03);h.rotation.x=Math.PI/2-0.2;blob(g,CYL,DM('#8a6143'),s*0.28,0.18,-0.25,0.03,0.4,0.03);}
    for(const[a,b,c]of[[0,0.15,'#e8792a'],[-0.15,-0.2,'#f2c94c'],[0.17,-0.15,'#e8792a']])blob(g,SPH,DM(c),a,0.72,b,0.18,0.15,0.18);}},
  {id:'doghouse',size:'medium',name:'Dog house',icon:'🏠',price:180,r:0.9,use:'peeking into the dog house',build(g){blob(g,BOX,DM('#c98b5a'),0,0.55,0,1.3,1.1,1.5);const rf=blob(g,CONE,DM('#4f7fb8'),0,1.45,0,1.25,0.75,1.25);rf.rotation.y=Math.PI/4;rf.scale.set(1.25,0.75,1.4);
    blob(g,BOX,DM('#2a211c'),0,0.42,0.76,0.6,0.7,0.02,false);blob(g,BOX,DM('#fbf3e4'),0,1.05,0.76,0.6,0.16,0.02,false);blob(g,CYL,DM('#f3ead6'),0.3,0.04,1.05,0.03,0.3,0.03).rotation.z=Math.PI/2;}},
  {id:'flowerarch',size:'medium',name:'Flower arch',icon:'💐',price:150,r:0.4,use:'smelling the flowers on the arch',build(g){const arch=new T.Mesh(new T.TorusGeometry(1.0,0.06,8,24,Math.PI),DM('#f6efe2'));arch.position.y=1.4;arch.castShadow=true;g.add(arch);
    for(const s of[-1,1])blob(g,CYL,DM('#f6efe2'),s,0.7,0,0.06,1.4,0.06);for(let k=0;k<22;k++){const a=k/21*Math.PI;blob(g,SPH,DM(['#ff8fab','#ffffff','#ff5d8f','#f2c94c'][k%4]),Math.cos(a)*1.0,1.4+Math.sin(a)*1.0,(k%2?0.08:-0.08),0.1,0.09,0.1,false);}
    for(let k=0;k<10;k++){const s=k%2?1:-1;blob(g,SPH,DM('#5e9a3a'),s*1.0+(Math.random()-0.5)*0.1,0.2+k*0.12,0.05,0.09,0.08,0.06,false);}}},
  {id:'wishingwell',size:'medium',name:'Wishing well',icon:'⛲',price:220,r:0.85,use:'making a wish at the well',build(g){blob(g,CYL,DM('#aaa498'),0,0.4,0,0.75,0.8,0.75);blob(g,CYL,DM('#1f3b4d'),0,0.79,0,0.6,0.02,0.6,false);
    for(const s of[-1,1])blob(g,BOX,DM('#6e4b33'),s*0.68,1.25,0,0.1,1.7,0.1);const rf=blob(g,CONE,DM('#9b3b2f'),0,2.3,0,1.0,0.6,1.0);rf.rotation.y=Math.PI/4;rf.scale.set(1.15,0.6,0.85);
    const ax=blob(g,CYL,DM('#6e4b33'),0,1.8,0,0.05,1.4,0.05);ax.rotation.z=Math.PI/2;blob(g,CYL,DM('#d9cbb0'),0,1.45,0,0.015,0.7,0.015,false);blob(g,CYL,DM('#8a6143'),0,1.05,0,0.14,0.18,0.14);}},
  {id:'agility',size:'medium',name:'Pup agility hurdles',icon:'🐕',price:120,r:1.1,build(g){for(let k=0;k<3;k++){const z=(k-1)*0.75;for(const s of[-1,1])blob(g,CYL,DM('#ffffff'),s*0.5,0.35,z,0.03,0.7,0.03);
    const bar=blob(g,CYL,DM(['#d93a3a','#f2c94c','#3f8fd6'][k]),0,0.25+k*0.12,z,0.03,1.0,0.03);bar.rotation.z=Math.PI/2;}}},
  {id:'telescope',size:'medium',name:'Telescope',icon:'🔭',price:140,r:0.5,use:'peeking through the telescope',build(g){for(let k=0;k<3;k++){const a=k*2.09,l=blob(g,CYL,DM('#6e4b33'),Math.cos(a)*0.22,0.55,Math.sin(a)*0.22,0.03,1.15,0.03);l.rotation.set(Math.sin(a)*0.35,0,-Math.cos(a)*0.35);}
    const tb=new T.Group();tb.position.y=1.12;tb.rotation.x=-0.5;g.add(tb);blob(tb,CYL,DM('#d9b65a',{metalness:0.6,roughness:0.3}),0,0,0.2,0.08,0.9,0.08).rotation.x=Math.PI/2;blob(tb,CYL,DM('#2b2d31'),0,0,0.66,0.1,0.06,0.1).rotation.x=Math.PI/2;}},
  {id:'teatable',size:'medium',name:'Tea table',icon:'🍵',price:130,r:0.8,use:'having a cup of tea',build(g){blob(g,CYL,DM('#8a6143'),0,0.38,0,0.55,0.06,0.55);blob(g,CYL,DM('#6e4b33'),0,0.18,0,0.07,0.36,0.07);
    for(const s of[-1,1])blob(g,CYL,DM(s>0?'#ff8fab':'#7fae9a',{roughness:1}),s*0.85,0.08,0,0.32,0.16,0.32);blob(g,SPH,DM('#fbf6ec'),0,0.5,0,0.12,0.1,0.12);blob(g,CYL,DM('#fbf6ec'),0.2,0.45,0.12,0.05,0.07,0.05,false);}},
  {id:'bicycle',size:'medium',name:'Bicycle',icon:'🚲',price:150,r:0.7,build(g){for(const z of[-0.5,0.5]){const w=blob(g,new T.TorusGeometry(0.32,0.03,6,20),DM('#2b2d31'),0,0.34,z,1,1,1);w.rotation.y=Math.PI/2;}
    const f=(y,z,l,rx)=>{const c=blob(g,CYL,DM('#4fb3ff',{metalness:0.4}),0,y,z,0.025,l,0.025);c.rotation.x=rx;};f(0.45,0,0.95,Math.PI/2);f(0.55,-0.32,0.5,0.4);f(0.6,0.42,0.55,-0.3);
    blob(g,BOX,DM('#3b2a20'),0,0.82,-0.38,0.14,0.05,0.24);blob(g,CYL,DM('#b5864a'),0,0.85,0.55,0.16,0.18,0.14);for(let k=0;k<4;k++)blob(g,SPH,DM(['#ff5d8f','#f2c94c','#ffffff','#b07aff'][k]),(k-1.5)*0.06,0.98,0.55,0.05,0.05,0.05,false);}},
  // large
  {id:'appletree',size:'large',name:'Apple tree',icon:'🍎',price:300,r:0.8,produce:{good:'apple',every:100,n:5},use:'picking apples',act:'harvest',build(g){blob(g,CYL,DM('#5a3d2a'),0,1.2,0,0.24,2.4,0.24);
    for(let k=0;k<7;k++){const a=k/7*6.28,r=k?1:0;blob(g,ICO_G,DM(['#4f8a3a','#5e9a3a','#467f34'][k%3],{flatShading:true}),Math.cos(a)*r,2.9+(k?0:0.4),Math.sin(a)*r,1.1,0.95,1.1);}
    for(let k=0;k<16;k++){const a=k*1.7,r=0.8+(k%3)*0.35;blob(g,SPH,DM('#d9322a',{roughness:0.4}),Math.cos(a)*r,2.4+(k%5)*0.3,Math.sin(a)*r,0.11,0.11,0.11,false);}}},
  {id:'coop',size:'large',name:'Chicken coop',icon:'🐔',price:380,r:1.3,produce:{good:'egg',every:90,n:3},use:'collecting eggs from the coop',act:'harvest',build(g){blob(g,BOX,DM('#c63a2f'),0,0.95,-0.2,1.8,1.1,1.4);
    for(const[a,b]of[[-0.8,-0.8],[0.8,-0.8],[-0.8,0.4],[0.8,0.4]])blob(g,BOX,DM('#6e4b33'),a,0.2,b,0.1,0.4,0.1);const rf=blob(g,CONE,DM('#3b3d42'),0,1.85,-0.2,1.5,0.7,1.2);rf.rotation.y=Math.PI/4;rf.scale.set(1.45,0.7,1.15);
    blob(g,BOX,DM('#fbf3e4'),0,0.95,0.51,0.5,0.6,0.02,false);const rp=blob(g,BOX,DM('#8a6143'),0,0.35,0.85,0.4,0.05,0.9);rp.rotation.x=0.6;
    const hens=[];for(let k=0;k<3;k++){const h=new T.Group();g.add(h);blob(h,SPH,DM(k?'#fbf6ec':'#c98b5a'),0,0.17,0,0.14,0.13,0.18);blob(h,SPH,DM(k?'#fbf6ec':'#c98b5a'),0,0.3,0.12,0.08,0.08,0.08);
      blob(h,CONE,DM('#f2a33a'),0,0.29,0.21,0.025,0.06,0.025,false).rotation.x=Math.PI/2;blob(h,SPH,DM('#d93a3a'),0,0.39,0.12,0.03,0.04,0.05,false);hens.push(h);}
    DECOR_ANIM.push((dt,t)=>hens.forEach((h,k)=>{const a=t*0.35+k*2.1,r=1.1+Math.sin(t*0.5+k)*0.25;h.position.set(Math.cos(a)*r,0,0.9+Math.sin(a)*0.5);h.rotation.y=-a+Math.PI;h.children[1].position.y=0.3-Math.max(0,Math.sin(t*4+k))*0.08;}));}},
  {id:'gazebo',size:'large',name:'Gazebo',icon:'⛩️',price:520,r:1.8,use:'relaxing by the gazebo',build(g){blob(g,CYL,DM('#d9cbb0'),0,0.1,0,1.9,0.2,1.9);for(let k=0;k<6;k++){const a=k/6*6.28;blob(g,CYL,DM('#fbf6ec'),Math.cos(a)*1.65,1.3,Math.sin(a)*1.65,0.08,2.4,0.08);}
    const rf=new T.Mesh(new T.ConeGeometry(2.3,1.1,6),DM('#7fae9a'));rf.position.y=3.05;rf.castShadow=true;g.add(rf);blob(g,SPH,DM('#d9b65a',{metalness:0.5}),0,3.68,0,0.12,0.12,0.12);
    for(let k=0;k<6;k++){const a=k/6*6.28+0.52;blob(g,BOX,DM('#fbf6ec'),Math.cos(a)*1.45,0.75,Math.sin(a)*1.45,0.06,0.05,1.5,false).rotation.y=-a;}
    blob(g,CYL,DM('#ff8fab',{roughness:1}),0,0.35,0,0.6,0.3,0.6);}},
  {id:'pergola',size:'large',name:'Pergola with lights',icon:'✨',price:420,r:1.6,use:'sitting under the pergola lights',build(g){for(const[a,b]of[[-1.4,-1],[1.4,-1],[-1.4,1],[1.4,1]])blob(g,BOX,DM('#8a6143'),a,1.2,b,0.14,2.4,0.14);
    for(const b of[-1,1])blob(g,BOX,DM('#6e4b33'),0,2.45,b,3.2,0.14,0.12);for(let k=0;k<6;k++)blob(g,BOX,DM('#6e4b33'),-1.25+k*0.5,2.55,0,0.1,0.1,2.4);
    for(let k=0;k<12;k++){const t=k/11;blob(g,SPH,GLOW(['#ffd58a','#ff9ac0','#9fd6ff'][k%3],1.2),lerp(-1.4,1.4,t),2.3-Math.sin(t*Math.PI)*0.3,0,0.06,0.08,0.06,false);}
    blob(g,BOX,DM('#8a6143'),0,0.42,0,1.6,0.08,0.6);decorPool(g,3.2);}},
  {id:'koipond',size:'large',name:'Koi pond',icon:'🐟',price:450,r:1.6,use:'watching the koi',build(g){for(let k=0;k<14;k++){const a=k/14*6.28;blob(g,SPH,DM('#8e887d',{flatShading:true}),Math.cos(a)*1.55,0.12,Math.sin(a)*1.55,0.32,0.2,0.28).rotation.y=-a;}
    const w=new T.Mesh(new T.CircleGeometry(1.45,28),DM('#2f7f9a',{roughness:0.1,metalness:0.2}));w.rotation.x=-Math.PI/2;w.position.y=0.12;w.userData.noShadow=true;g.add(w);
    for(let k=0;k<3;k++){const p=new T.Mesh(new T.CircleGeometry(0.22,10),DM('#4f9a3a'));p.rotation.x=-Math.PI/2;p.position.set(Math.cos(k*2.3)*0.9,0.13,Math.sin(k*2.3)*0.9);p.userData.noShadow=true;g.add(p);}
    const fish=[];for(let k=0;k<3;k++){const f=new T.Group();g.add(f);blob(f,SPH,DM(k===1?'#fbf6ec':'#e8662a'),0,0,0,0.06,0.04,0.16,false);blob(f,CONE,DM('#e8662a'),0,0,-0.18,0.06,0.1,0.02,false).rotation.x=-Math.PI/2;fish.push(f);}
    DECOR_ANIM.push((dt,t)=>fish.forEach((f,k)=>{const a=t*(0.4+k*0.1)*(k%2?-1:1)+k*2,r=0.5+k*0.25;f.position.set(Math.cos(a)*r,0.08,Math.sin(a)*r);f.rotation.y=(k%2?Math.PI:0)-a;}));}},
  {id:'torii',size:'large',name:'Torii gate',icon:'⛩️',price:400,r:0.3,use:'admiring the torii gate',build(g){const red=DM('#c63a2f');for(const s of[-1,1])blob(g,CYL,red,s*1.4,1.6,0,0.16,3.2,0.16);
    blob(g,BOX,DM('#27221f'),0,3.3,0,3.8,0.22,0.36);blob(g,BOX,red,0,3.08,0,3.5,0.2,0.3);blob(g,BOX,red,0,2.6,0,3.1,0.16,0.22);blob(g,BOX,red,0,2.85,0,0.18,0.4,0.18);}},
  {id:'windmill',size:'large',name:'Windmill',icon:'🌬️',price:600,r:1.2,use:'watching the windmill turn',build(g){blob(g,CYL,DM('#efe6d1'),0,1.8,0,1.0,3.6,1.0);const tw=new T.Mesh(new T.CylinderGeometry(0.55,1.0,3.6,10),DM('#efe6d1'));tw.position.y=1.8;tw.castShadow=true;g.add(tw);
    const rf=blob(g,CONE,DM('#9b3b2f'),0,4.0,0,0.8,0.9,0.8);blob(g,BOX,DM('#6e4b33'),0,0.5,0.95,0.5,1.0,0.1,false);const hub=new T.Group();hub.position.set(0,3.4,0.85);g.add(hub);
    for(let k=0;k<4;k++){const b=new T.Group();b.rotation.z=k*Math.PI/2;hub.add(b);blob(b,BOX,DM('#8a6143'),0,0.95,0,0.08,1.9,0.05);blob(b,BOX,DM('#fbf6ec'),0.15,1.1,0.03,0.28,1.5,0.02);}
    DECOR_ANIM.push((dt)=>{hub.rotation.z+=dt*0.8;});}},
  {id:'greenhouse',size:'large',name:'Greenhouse',icon:'🌱',price:650,r:1.7,use:'tending the greenhouse plants',act:'harvest',build(g){const glass=DM('#cfeeff',{transparent:true,opacity:0.35,roughness:0.1,metalness:0.1});
    blob(g,BOX,glass,0,0.9,0,2.6,1.8,2.0,false);const rf=blob(g,CONE,glass,0,2.25,0,1.85,0.9,1.4,false);rf.rotation.y=Math.PI/4;rf.scale.set(1.85,0.9,1.45);
    for(const[a,b]of[[-1.3,-1],[1.3,-1],[-1.3,1],[1.3,1]])blob(g,BOX,DM('#fbf6ec'),a,0.9,b,0.06,1.8,0.06);blob(g,BOX,DM('#fbf6ec'),0,1.8,0,2.6,0.05,0.05);
    for(let k=0;k<6;k++){const x=-0.9+(k%3)*0.9,z=k<3?-0.5:0.5;blob(g,CYL,DM('#c9734a'),x,0.2,z,0.18,0.3,0.18);blob(g,ICO_G,DM(['#5e9a3a','#7fae3a','#4f8a3a'][k%3],{flatShading:true}),x,0.5,z,0.28,0.32,0.28);
      if(k%2)blob(g,SPH,DM('#e2432f'),x+0.12,0.55,z,0.06,0.06,0.06,false);}}},
  {id:'lighthouse',size:'large',name:'Lighthouse',icon:'🗼',price:800,r:1.3,use:'gazing up at the lighthouse',build(g){for(let k=0;k<5;k++)blob(g,CYL,DM(k%2?'#d93a3a':'#fbf6ec'),0,0.5+k*1.0,0,1.1-k*0.12,1.0,1.1-k*0.12);
    blob(g,CYL,DM('#2b2d31'),0,5.1,0,0.75,0.2,0.75);blob(g,CYL,GLOW('#fff1c4',1.6),0,5.55,0,0.42,0.7,0.42,false);blob(g,CONE,DM('#d93a3a'),0,6.25,0,0.62,0.7,0.62);
    const beam=new T.Mesh(new T.ConeGeometry(1.1,7,16,1,true),new T.MeshBasicMaterial({color:'#fff1c4',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));
    beam.userData.noShadow=true;const pv=new T.Group();pv.position.y=5.55;g.add(pv);beam.rotation.z=Math.PI/2;beam.position.x=3.5;pv.add(beam);decorPool(g,4);
    DECOR_ANIM.push((dt)=>{pv.rotation.y+=dt*0.7;beam.material.opacity=smooth(0.35,0.95,nightK)*0.25;});}},
  {id:'ferris',size:'large',name:'Ferris wheel',icon:'🎡',price:900,r:1.8,use:'watching the ferris wheel',build(g){const st=DM('#fbf6ec');for(const z of[-0.5,0.5])for(const s of[-1,1]){const l=blob(g,CYL,st,s*1.0,1.9,z,0.07,4.1,0.07);l.rotation.z=s*0.26;}
    const wh=new T.Group();wh.position.y=3.8;g.add(wh);for(const z of[-0.45,0.45]){const r=new T.Mesh(new T.TorusGeometry(2.6,0.06,6,40),DM('#ff8fab'));r.position.z=z;r.castShadow=true;wh.add(r);}
    const cars=[];for(let k=0;k<8;k++){const a=k/8*6.28;const sp=blob(wh,CYL,st,Math.cos(a)*1.3,Math.sin(a)*1.3,0,0.03,2.6,0.03,false);sp.rotation.z=a+Math.PI/2;
      const c=new T.Group();c.position.set(Math.cos(a)*2.6,Math.sin(a)*2.6,0);wh.add(c);blob(c,BOX,DM(['#4fb3ff','#f2c94c','#7fae3a','#ff5d8f'][k%4]),0,-0.35,0,0.5,0.4,0.6);blob(c,SPH,GLOW('#ffd58a',1),0,0,0,0.06,0.06,0.06,false);cars.push(c);}
    DECOR_ANIM.push((dt)=>{wh.rotation.z+=dt*0.25;cars.forEach(c=>c.rotation.z=-wh.rotation.z);});decorPool(g,3);}}
);
for(const d of DECOR_CATALOG)if(!d.size)d.size={pinwheel:'small',mailbox:'small',pumpkins:'small',planter:'small',birdbath:'small',maple:'large',cherry:'large',dogstatue:'large',fountain:'large'}[d.id]||'medium';
Object.assign(DECOR_BY_ID,Object.fromEntries(DECOR_CATALOG.map(d=>[d.id,d])));
// ---- things Luna can build from the wood she collects (cost: wood, not coins) ----
DECOR_CATALOG.push(
  {id:'birdhouse',size:'build',kind:'Small build',name:'Birdhouse',icon:'🐦',price:0,wood:6,r:0.3,use:'watching the birds at her birdhouse',build(g){const w=DM('#a0703f'),d=DM('#6e4b33');
    blob(g,BOX,d,0,0.8,0,0.1,1.6,0.1);blob(g,BOX,w,0,1.75,0,0.42,0.42,0.38);const rf=blob(g,CONE,DM('#4f7fb8'),0,2.1,0,0.38,0.3,0.36);rf.rotation.y=Math.PI/4;
    blob(g,CYL,DM('#2a211c'),0,1.82,0.2,0.07,0.02,0.07,false).rotation.x=Math.PI/2;blob(g,CYL,d,0,1.66,0.27,0.015,0.14,0.015,false).rotation.x=Math.PI/2;
    const b=new T.Group();g.add(b);blob(b,SPH,DM('#f2c94c'),0,0,0,0.06,0.055,0.08);blob(b,SPH,DM('#f2c94c'),0,0.05,0.06,0.04,0.04,0.04);
    DECOR_ANIM.push((dt,t)=>{const k=(t*0.13)%1,on=k<0.6;b.visible=on;b.position.set(0,1.72+(on?Math.max(0,Math.sin(t*6))*0.02:0),0.36);b.rotation.y=Math.sin(t*0.9)*0.6;});}},
  {id:'logbench',size:'build',kind:'Small build',name:'Log bench',icon:'🪵',price:0,wood:8,r:0.85,use:'resting on her log bench',build(g){const bark=DM('#6b4a36',{roughness:1}),ring=DM('#d9b88a');
    for(const s of[-0.6,0.6]){blob(g,CYL,bark,s,0.22,0,0.2,0.44,0.2);blob(g,CYL,ring,s,0.445,0,0.17,0.01,0.17,false);}
    const lg=blob(g,CYL,bark,0,0.55,0,0.2,1.7,0.2);lg.rotation.z=Math.PI/2;blob(g,BOX,DM('#c99a6a'),0,0.66,0,1.68,0.04,0.3);}},
  {id:'planterbox',size:'build',kind:'Small build',name:'Herb planter',icon:'🌿',price:0,wood:10,r:0.75,produce:{good:'herbs',every:130,n:3},use:'snipping fresh herbs',act:'harvest',build(g){const w=DM('#a0703f');
    blob(g,BOX,w,0,0.3,0,1.4,0.6,0.7);blob(g,BOX,DM('#4a3324'),0,0.6,0,1.3,0.03,0.6,false);for(let k=0;k<4;k++)blob(g,BOX,DM('#6e4b33'),0,0.15+k*0.15,0.36,1.42,0.02,0.01,false);
    for(let k=0;k<8;k++){const x=-0.5+(k%4)*0.33,z=k<4?-0.15:0.15;blob(g,ICO_G,DM(k%3?'#5e9a3a':'#7fae3a',{flatShading:true}),x,0.72,z,0.15,0.16,0.15);}}},
  {id:'toolshed',size:'build',kind:'Building',name:'Tool shed',icon:'🛖',price:0,wood:25,r:1.5,use:'tidying her tool shed',build(g){const w=DM('#a0703f'),d=DM('#6e4b33');
    blob(g,BOX,w,0,1.0,0,2.4,2.0,2.0);for(let k=0;k<8;k++)blob(g,BOX,d,-1.05+k*0.3,1.0,1.01,0.03,2.0,0.02,false);
    const rf=blob(g,BOX,DM('#4a5a6a'),0,2.25,0,2.8,0.12,2.5);rf.rotation.x=-0.18;blob(g,BOX,DM('#7a4e30'),0.35,0.8,1.03,0.8,1.5,0.05,false);
    blob(g,SPH,DM('#d9b65a',{metalness:0.6}),0.62,0.85,1.07,0.04,0.04,0.04,false);blob(g,BOX,DM('#cfeeff',{emissive:'#ffd58a',emissiveIntensity:0.2}),-0.65,1.3,1.03,0.5,0.4,0.03,false);
    const sh=blob(g,CYL,d,1.32,0.6,0.6,0.025,1.2,0.025);sh.rotation.z=0.2;blob(g,BOX,DM('#9aa3ad',{metalness:0.6}),1.44,0.05,0.6,0.16,0.22,0.03,false);
    const rk=blob(g,CYL,d,1.3,0.6,0.2,0.025,1.2,0.025);rk.rotation.z=0.25;}},
  {id:'lookout',size:'build',kind:'Building',name:'Lookout tower',icon:'🗼',price:0,wood:40,r:1.4,use:'climbing up to the lookout',build(g){const bark=DM('#6b4a36',{roughness:1}),w=DM('#a0703f');
    for(const[a,b]of[[-0.9,-0.9],[0.9,-0.9],[-0.9,0.9],[0.9,0.9]])blob(g,CYL,bark,a,1.75,b,0.12,3.5,0.12);
    blob(g,BOX,w,0,2.6,0,2.2,0.12,2.2);for(const s of[-1,1]){blob(g,BOX,w,0,3.15,s*1.05,2.2,0.08,0.08);blob(g,BOX,w,s*1.05,3.15,0,0.08,0.08,2.2);}
    for(const s of[-1,1])for(const a of[-1,1]){const x=a*0.9,z=s*0.9;const br=blob(g,CYL,bark,x*0.5,1.3,z,0.04,1.9,0.04,false);br.rotation.z=a*0.85;}
    for(let k=0;k<8;k++)blob(g,BOX,d2(),0,0.3+k*0.31,1.15,0.6,0.05,0.06,false);for(const s of[-0.3,0.3])blob(g,BOX,bark,s,1.3,1.15,0.06,2.6,0.06);
    const rf=blob(g,CONE,DM('#9b3b2f'),0,3.95,0,1.6,0.9,1.6);rf.rotation.y=Math.PI/4;for(const[a,b]of[[-0.9,-0.9],[0.9,-0.9],[-0.9,0.9],[0.9,0.9]])blob(g,CYL,bark,a,3.25,b,0.06,1.3,0.06);
    const fl=blob(g,BOX,DM('#ff8fab'),0.3,4.65,0,0.6,0.35,0.02);blob(g,CYL,bark,0,4.6,0,0.025,0.8,0.025);DECOR_ANIM.push((dt,t)=>{fl.rotation.y=Math.sin(t*3)*0.3;});
    function d2(){return w;}}},
  {id:'cabin',size:'build',kind:'Building',name:'Log cabin',icon:'🏡',price:0,wood:60,r:2.2,use:'relaxing at her log cabin',build(g){const bark=DM('#7a5236',{roughness:1}),end=DM('#e2c391');
    for(let k=0;k<8;k++){const y=0.18+k*0.32;for(const s of[-1,1]){const l=blob(g,CYL,bark,0,y,s*1.4,0.17,3.6,0.17);l.rotation.z=Math.PI/2;const l2=blob(g,CYL,bark,s*1.7,y+0.16,0,0.17,3.0,0.17);l2.rotation.x=Math.PI/2;}}
    for(const s of[-1,1])for(const a of[-1,1])blob(g,CYL,end,s*1.82,1.3,a*1.4,0.16,0.02,0.16,false).rotation.z=Math.PI/2;
    for(const s of[-1,1]){const rf=blob(g,BOX,DM('#5a3d2a'),s*0.95,3.15,0,2.3,0.14,3.6);rf.rotation.z=-s*0.62;}
    blob(g,BOX,DM('#5a3d2a'),0,0.85,1.58,0.75,1.5,0.06,false);blob(g,BOX,DM('#ffd58a',{emissive:'#ffb347',emissiveIntensity:1.1}),-1.0,1.3,1.58,0.6,0.5,0.04,false);
    blob(g,BOX,DM('#ffd58a',{emissive:'#ffb347',emissiveIntensity:1.1}),1.0,1.3,1.58,0.6,0.5,0.04,false);
    blob(g,BOX,DM('#8e887d'),1.0,3.2,-0.6,0.5,1.6,0.5);decorPool(g,3.0);
    const puffs=[];for(let k=0;k<4;k++){const p=blob(g,SPH,DM('#d8d8d8',{transparent:true,opacity:0.5}),1.0,4.2,-0.6,0.25,0.25,0.25,false);puffs.push(p);}
    DECOR_ANIM.push((dt,t)=>puffs.forEach((p,k)=>{const ph=(t*0.35+k/4)%1;p.position.set(1.0+ph*0.6,4.1+ph*1.8,-0.6);p.scale.setScalar(0.18+ph*0.4);p.material.opacity=0.5*(1-ph);}));}}
);
Object.assign(DECOR_BY_ID,Object.fromEntries(DECOR_CATALOG.map(d=>[d.id,d])));
DECOR_CATALOG.push(
  {id:'shellpile',size:'small',name:'Seashell pile',icon:'🐚',price:35,r:0.4,produce:{good:'shell',every:150,n:1},use:'sorting seashells',build(g){
    for(let k=0;k<7;k++){const sh=blob(g,SPH,DM('#f6efe6',{roughness:0.4}),rnd(-0.18,0.18),0.06,rnd(-0.12,0.12),0.1,0.045,0.08);sh.rotation.y=rnd(0,3);}}},
  {id:'blossomcrate',size:'small',name:'Blossom crate',icon:'🌸',price:45,r:0.45,produce:{good:'blossom',every:160,n:1},use:'gathering blossoms',build(g){
    blob(g,BOX,DM('#c9a06a'),0,0.16,0,0.55,0.32,0.4);
    for(let k=0;k<6;k++){const x=rnd(-0.16,0.16),z=rnd(-0.1,0.1);blob(g,SPH,DM('#ffb7d0'),x,0.36,z,0.06,0.05,0.06,false);blob(g,SPH,DM('#f2c94c'),x,0.4,z,0.025,0.02,0.025,false);}}},
  {id:'blanket',size:'medium',name:'Picnic blanket',icon:'🧺',price:80,r:1.05,use:'having a picnic',build(g){
    const tx=canvasTex(64,64,c=>{c.fillStyle='#c63a2f';c.fillRect(0,0,64,64);c.fillStyle='#f4f0e6';for(let i=0;i<64;i+=16){c.fillRect(i,0,8,64);c.fillRect(0,i,64,8);}});
    const m=new T.Mesh(new T.PlaneGeometry(2.2,1.6),new T.MeshStandardMaterial({map:tx,roughness:0.95,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=0.03;g.add(m);
    blob(g,CYL,DM('#e8d7b0'),0.55,0.12,0.2,0.12,0.16,0.1);blob(g,SPH,DM('#e2432f'),-0.4,0.08,-0.15,0.07,0.07,0.07);}},
  {id:'tidepool',size:'small',name:'Tide pool',icon:'🫧',price:55,r:0.55,produce:{good:'shell',every:170,n:1},use:'looking in the tide pool',build(g){
    blob(g,CYL,DM('#8e887d'),0,0.06,0,0.55,0.12,0.42);blob(g,CYL,DM('#7ec8e3',{roughness:0.15,metalness:0.15}),0,0.1,0,0.42,0.04,0.3,false);
    blob(g,SPH,DM('#f6efe6'),0.12,0.12,0.05,0.06,0.03,0.05,false);}},
  {id:'berrybasket',size:'small',name:'Berry basket',icon:'🫐',price:50,r:0.35,produce:{good:'berries',every:140,n:2},use:'picking berries',act:'harvest',build(g){
    blob(g,CYL,DM('#b5864a'),0,0.14,0,0.18,0.22,0.16);for(let k=0;k<6;k++){const a=k/6*6.28;blob(g,SPH,DM(k%2?'#5b4fcf':'#3f7a3a'),Math.cos(a)*0.06,0.28,Math.sin(a)*0.05,0.045,0.04,0.045,false);}}}
);
Object.assign(DECOR_BY_ID,Object.fromEntries(DECOR_CATALOG.map(d=>[d.id,d])));

// things Luna enjoys using when you place them
Object.assign(DECOR_BY_ID.campfire,{use:'warming up by the campfire',act:'warm'});Object.assign(DECOR_BY_ID.fountain,{use:'watching the fountain'});
Object.assign(DECOR_BY_ID.bench,{use:'resting by the bench'});Object.assign(DECOR_BY_ID.picnic,{use:'having a picnic'});Object.assign(DECOR_BY_ID.hutch,{use:'visiting the bunny hutch',act:'harvest'});
Object.assign(DECOR_BY_ID.birdbath,{use:'watching the birds splash'});Object.assign(DECOR_BY_ID.dogstatue,{use:'admiring the Kiko statue'});Object.assign(DECOR_BY_ID.cherry,{use:'admiring her cherry tree'});
Object.assign(DECOR_BY_ID.maple,{use:'admiring her maple tree'});Object.assign(DECOR_BY_ID.scarecrow,{use:'fixing the scarecrow\'s hat'});

const PLACED_RT=new Map();let placeUid=ECON.placed.reduce((m,p)=>Math.max(m,p.uid||0),0);
function buildDecor(id){const def=DECOR_BY_ID[id],g=new T.Group();def.build(g);g.traverse(o=>{if(o.isMesh&&!o.userData.noShadow){o.castShadow=true;o.receiveShadow=true;}});scene.add(g);return g;}
function navBlock(rec){OBS_VER++;
  const def=DECOR_BY_ID[rec.id],rt=PLACED_RT.get(rec.uid);if(!def||def.r<0.3)return;
  const rr=def.r+0.15,cells=[];
  const[g0x,g0z]=toGrid(rec.x-rr,rec.z-rr),[g1x,g1z]=toGrid(rec.x+rr,rec.z+rr);
  for(let gz=g0z;gz<=g1z;gz++)for(let gx=g0x;gx<=g1x;gx++){const[wx,wz]=toWorld(gx,gz);if(Math.hypot(wx-rec.x,wz-rec.z)>rr)continue;const id=gIdx(gx,gz);
    if(NAV.walk[id]){cells.push([id,NAV.cost[id]]);NAV.walk[id]=0;NAV.cost[id]=999;}}
  rt.cells=cells;rt.obs={x:rec.x,z:rec.z,r:def.r};CIRCLE_OBS.push(rt.obs);
}
function navUnblock(rec){OBS_VER++;const rt=PLACED_RT.get(rec.uid);if(!rt)return;
  for(const[id,c]of rt.cells||[]){NAV.walk[id]=1;NAV.cost[id]=c;}rt.cells=[];
  if(rt.obs){const i=CIRCLE_OBS.indexOf(rt.obs);if(i>=0)CIRCLE_OBS.splice(i,1);rt.obs=null;}}
function spawnPlaced(rec){const g=buildDecor(rec.id);g.position.set(rec.x,walkHeight(rec.x,rec.z),rec.z);g.rotation.y=rec.ry;PLACED_RT.set(rec.uid,{g});navBlock(rec);}
ECON.placed=ECON.placed.filter(p=>DECOR_BY_ID[p.id]&&isFinite(p.x)&&isFinite(p.z));
for(const p of ECON.placed){p.ry=+p.ry||0;spawnPlaced(p);}
function placeOk(x,z,def){
  if(!isFinite(x)||!isFinite(z))return false;
  if(Math.hypot(x-AI.x,z-AI.z)<def.r+0.6)return false;
  return isPointWalkable(x,z,Math.max(0.12,def.r*0.75));
}

/* placement mode: the item follows your pointer; click (or tap, then "Place here") to set it down */
const PLACE={active:false,id:null,obj:null,ry:0,x:0,z:0,valid:false,moving:null,ring:null,hasSpot:false};
PLACE.ring=new T.Mesh(new T.RingGeometry(0.9,1.05,40),new T.MeshBasicMaterial({color:'#5fd17a',transparent:true,opacity:0.85,depthWrite:false}));
PLACE.ring.rotation.x=-Math.PI/2;PLACE.ring.visible=false;PLACE.ring.userData.noWx=true;scene.add(PLACE.ring);
const _rayO=new T.Vector3(),_rayD=new T.Vector3();
function groundPick(cx,cy){
  _rayD.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1,0.5).unproject(camera).sub(camera.position).normalize();_rayO.copy(camera.position);
  const surf=(x,z)=>{const h=hAt(x,z);return Math.max(h,0,waterDist(x,z)<0?WATER:-99);};
  let prev=0;for(let t=0.5;t<600;t+=Math.max(0.4,t*0.02)){const x=_rayO.x+_rayD.x*t,y=_rayO.y+_rayD.y*t,z=_rayO.z+_rayD.z*t;
    if(y<=surf(x,z)){let a=prev,b=t;for(let i=0;i<10;i++){const m=(a+b)/2;if(_rayO.y+_rayD.y*m<=surf(_rayO.x+_rayD.x*m,_rayO.z+_rayD.z*m))b=m;else a=m;}
      return[_rayO.x+_rayD.x*b,_rayO.z+_rayD.z*b];}prev=t;}
  return null;
}
const placeBar=document.getElementById('placeBar'),placeTxt=document.getElementById('placeTxt'),placeHere=document.getElementById('placeHere');
function setGhost(x,z){
  const def=DECOR_BY_ID[PLACE.id];PLACE.x=x;PLACE.z=z;PLACE.hasSpot=true;PLACE.valid=placeOk(x,z,def);
  const y=walkHeight(x,z);PLACE.obj.position.set(x,y,z);PLACE.obj.visible=true;PLACE.ring.visible=true;PLACE.ring.position.set(x,y+0.06,z);
  const rr=Math.max(0.5,def.r+0.25);PLACE.ring.scale.setScalar(rr);PLACE.ring.material.color.set(PLACE.valid?'#5fd17a':'#ff5d5d');
  placeHere.disabled=!PLACE.valid;
}
function startPlacing(id,moving){
  if(INSIDE_REF&&INSIDE_REF.on){toast('Step outside to place decorations');return;}
  if(typeof CHOP!=='undefined'&&CHOP.on)setChop(false);
  if(PLACE.active)cancelPlacing();
  const def=DECOR_BY_ID[id];PLACE.active=true;PLACE.id=id;PLACE.moving=moving||null;PLACE.hasSpot=false;
  if(moving){navUnblock(moving);const rt=PLACED_RT.get(moving.uid);PLACE.obj=rt.g;PLACE.ry=moving.ry;}
  else{PLACE.obj=buildDecor(id);PLACE.obj.visible=false;PLACE.ry=0;}
  PLACE.obj.rotation.y=PLACE.ry;
  placeTxt.innerHTML=(moving?'Moving the <b>'+def.name+'</b>':'Placing a <b>'+def.name+'</b> · '+(def.wood?def.wood+' wood':def.price+' coins'))+'<small>Click or tap the ground. Green ring means it fits.</small>';
  placeHere.disabled=true;placeBar.hidden=false;
  // start it in front of Luna so there is something to see right away
  for(let i=0;i<12;i++){const a=AI.yaw+(i%2?1:-1)*Math.floor((i+1)/2)*0.5,d=2.5+def.r;const x=AI.x+Math.sin(a)*d,z=AI.z+Math.cos(a)*d;if(placeOk(x,z,def)||i===11){setGhost(x,z);break;}}
  if(moving)setGhost(moving.x,moving.z);
}
function cancelPlacing(){
  if(!PLACE.active)return;
  if(PLACE.moving){const m=PLACE.moving;PLACE.obj.position.set(m.x,walkHeight(m.x,m.z),m.z);PLACE.obj.rotation.y=m.ry;navBlock(m);}
  else{scene.remove(PLACE.obj);}
  PLACE.active=false;PLACE.obj=null;PLACE.moving=null;PLACE.ring.visible=false;placeBar.hidden=true;
}
function confirmPlacing(){
  if(!PLACE.active||!PLACE.valid)return;
  const def=DECOR_BY_ID[PLACE.id];
  if(PLACE.moving){const m=PLACE.moving;m.x=PLACE.x;m.z=PLACE.z;m.ry=PLACE.ry;navBlock(m);toast('Moved the '+def.name);}
  else{if(def.wood){if(ECON.wood<def.wood){toast('You need '+def.wood+' wood (you have '+ECON.wood+')');return;}ECON.wood-=def.wood;}
    else{if(ECON.coins<def.price){toast('Not enough coins yet');return;}ECON.coins-=def.price;}
    const rec={uid:++placeUid,id:PLACE.id,x:PLACE.x,z:PLACE.z,ry:PLACE.ry};ECON.placed.push(rec);PLACED_RT.set(rec.uid,{g:PLACE.obj});navBlock(rec);
    if(def.wood){startBuild(rec);}else{toast('Placed the '+def.name+' · '+def.price+' coins');emote(caretaker.headGroup,'sparkle',0.85);}}
  PLACE.active=false;PLACE.obj=null;PLACE.moving=null;PLACE.ring.visible=false;placeBar.hidden=true;econSave();
}
const BUILD_TASK={id:'build',need:'explore',act:'build',dur:[40,40],sat:0};
function startBuild(rec){const def=DECOR_BY_ID[rec.id],rt=PLACED_RT.get(rec.uid);rt.g.scale.set(1,0.03,1);rt.building={p:0,dur:def.kind==='Building'?10:5,auto:false,chip:0};
  toast('Luna is building the '+def.name.toLowerCase()+' · '+def.wood+' wood');
  if(STILL.on||CTRL.on||AI.inside){rt.building.auto=true;return;}
  if(AI.state==='act')endAct();else if(AI.state==='walk')abortTask();if(AI.state==='skylook'){AI.state='idle';AI.skyObj=null;}
  const d=def.r+0.9;let spot=null;for(let k=0;k<8&&!spot;k++){const a=rec.ry+(k%2?1:-1)*Math.ceil(k/2)*0.785,x=rec.x+Math.sin(a)*d,z=rec.z+Math.cos(a)*d;if(isCellOpen(x,z))spot=[x,z];}
  if(!spot){rt.building.auto=true;return;}
  startTask({tk:BUILD_TASK,tgt:{x:spot[0],z:spot[1],look:[rec.x,rec.z],rec},rid:'build'});}
function buildUpdate(dt){const rec=AI.target&&AI.target.rec,rt=rec&&PLACED_RT.get(rec.uid);if(!rt||!rt.building){AI.timer=Math.min(AI.timer,0.6);}}
function updateBuilds(dt){for(const rec of ECON.placed){const rt=PLACED_RT.get(rec.uid);if(!rt||!rt.building)continue;const B=rt.building,def=DECOR_BY_ID[rec.id];
    const working=AI.state==='act'&&AI.act==='build'&&AI.target&&AI.target.rec===rec;
    if(!working&&!B.auto){B.idle=(B.idle||0)+dt;if(B.idle>2.5)B.auto=true;}
    if(working||B.auto){B.p=Math.min(1,B.p+dt/B.dur);B.chip-=dt;if(B.chip<=0){B.chip=0.45;spawnChips(rec.x+rnd(-0.4,0.4),walkHeight(rec.x,rec.z)+0.4+B.p*1.5,rec.z+rnd(-0.4,0.4));}}
    rt.g.scale.set(1,0.03+0.97*smooth(0,1,B.p),1);
    if(B.p>=1){rt.building=null;rt.g.scale.set(1,1,1);emote(rt.g,'sparkle',def.r+1.8,1.8,0.7);toast('Built the '+def.name+'!');}}}
function rotatePlacing(){if(!PLACE.active)return;PLACE.ry+=Math.PI/4;PLACE.obj.rotation.y=PLACE.ry;}
document.getElementById('placeRot').onclick=rotatePlacing;
document.getElementById('placeCancel').onclick=cancelPlacing;
placeHere.onclick=confirmPlacing;
{const cv=renderer.domElement;let down=null;
  cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};});
  cv.addEventListener('pointermove',e=>{if(!PLACE.active||e.pointerType!=='mouse'||e.buttons)return;const p=groundPick(e.clientX,e.clientY);if(p)setGhost(p[0],p[1]);});
  cv.addEventListener('pointerup',e=>{if(!PLACE.active||!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y),dt=performance.now()-down.t;down=null;
    if(moved>8||dt>450)return;const p=groundPick(e.clientX,e.clientY);if(!p)return;setGhost(p[0],p[1]);if(e.pointerType==='mouse'&&PLACE.valid)confirmPlacing();});}
addEventListener('keydown',e=>{if(!PLACE.active)return;if(e.key==='Escape'){cancelPlacing();e.stopImmediatePropagation();}else if(e.key==='r'||e.key==='R'){rotatePlacing();e.stopImmediatePropagation();}else if(e.key==='Enter')confirmPlacing();},true);
function updateDecor(dt,time){updateBuilds(dt);if(!INSIDE_REF||!INSIDE_REF.on)for(const f of DECOR_ANIM)f(dt,time);
  for(const rec of ECON.placed){const def=DECOR_BY_ID[rec.id];if(!def.produce)continue;const rt=PLACED_RT.get(rec.uid);if(!rt)continue;
    rt.pt=(rt.pt||0)+dt;if(rt.pt>=def.produce.every){rt.pt=0;addGood(def.produce.good,def.produce.n);emote(rt.g,'sparkle',def.r+1.6,1.6,0.55);}}if(PLACE.active&&PLACE.ring.visible)PLACE.ring.material.opacity=0.6+Math.sin(time*5)*0.25;}

/* ================= the market panel: sell Luna's basket, buy decorations and clothes ================= */
(function marketUI(){
  const panel=document.getElementById('market'),btn=document.getElementById('btnMarket'),badge=document.getElementById('coinBadge');
  const coinsEl=document.getElementById('mkCoins'),basketEl=document.getElementById('mkBasket'),sellBtn=document.getElementById('mkSell'),
    shopGrid=document.getElementById('mkShop'),tabsEl=document.getElementById('mkTabs'),noteEl=document.getElementById('mkNote'),placedEl=document.getElementById('mkPlaced'),priceEl=document.getElementById('mkPrices');
  const fmt=n=>Math.round(n).toLocaleString();
  function card(label,thumb,sub,enabled,onPick,owned){const b=document.createElement('button');b.type='button';b.className='card'+(owned?' owned':'');b.disabled=!enabled;
    if(typeof thumb==='string'){const s=document.createElement('span');s.className='emoji';s.textContent=thumb;s.setAttribute('aria-hidden','true');b.appendChild(s);}else{thumb.setAttribute('aria-hidden','true');b.appendChild(thumb);}
    const n=document.createElement('span');n.textContent=label;b.appendChild(n);const p=document.createElement('span');p.className='price';p.textContent=sub;b.appendChild(p);b.onclick=onPick;return b;}
  function renderBasket(){
    basketEl.textContent='';const keys=Object.keys(ECON.inv).filter(k=>ECON.inv[k]>0);
    if(!keys.length){const p=document.createElement('p');p.className='empty';p.textContent='The basket is empty. Luna fills it when she harvests and fishes.';basketEl.appendChild(p);}
    for(const k of keys){const r=document.createElement('div');r.className='rowi';r.innerHTML=`<span>${goodIcon(k)} ${goodName(k)} <small>× ${ECON.inv[k]}</small></span><b>${fmt(ECON.inv[k]*PRICES[k])}</b>`;basketEl.appendChild(r);}
    document.getElementById('mkWood').textContent=ECON.wood+' wood · for building';const sw=document.getElementById('mkSellWood');sw.disabled=ECON.wood<5;sw.textContent='Sell 5 wood · '+5*PRICES.wood;
    const v=basketValue();sellBtn.disabled=!v;sellBtn.textContent=v?'Sell basket for '+fmt(v)+' coins':'Nothing to sell yet';
  }
  const TABS=[['small','Small','Little touches: pots, lights, gnomes and berry bushes.'],['medium','Medium','Garden pieces, pup gear and a beehive that makes honey.'],
    ['large','Large','Big showpieces. Apple trees and the chicken coop fill Luna\'s basket.'],['build','Build','Made from wood Luna chops. Pick a spot and she builds it with her hammer.'],['clothes','Clothes','New outfits and masks go straight into Luna\'s Closet.']];
  let tab='small';try{tab=localStorage.getItem('lunas-market-tab-v2')||'small';}catch(e){}
  function renderShop(){
    tabsEl.textContent='';shopGrid.textContent='';
    for(const[id,lab]of TABS){const n=id==='clothes'?SHOP_OUTFITS.length+SHOP_MASKS.length:DECOR_CATALOG.filter(d=>d.size===id).length;
      const b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',tab===id);b.textContent=lab+' '+n;
      b.onclick=()=>{tab=id;try{localStorage.setItem('lunas-market-tab-v2',id);}catch(e){}renderShop();};tabsEl.appendChild(b);}
    noteEl.textContent=TABS.find(t=>t[0]===tab)[2]+(tab==='build'?' You have '+ECON.wood+' wood.':'');
    if(tab==='clothes'){
      for(const o of SHOP_OUTFITS){const own=owns(o.id);shopGrid.appendChild(card(o.name,CLOSET.thumb(o),own?'In the closet':o.price+' coins',own||ECON.coins>=o.price,()=>buyCloth(o),own));}
      for(const m of SHOP_MASKS){const own=owns(m.id);shopGrid.appendChild(card(m.name,CLOSET.maskThumb(m),own?'In the closet':m.price+' coins',own||ECON.coins>=m.price,()=>buyCloth(m,true),own));}
    }else if(tab==='build'){for(const d of DECOR_CATALOG.filter(d=>d.size==='build').sort((a,b)=>a.wood-b.wood))
      shopGrid.appendChild(card(d.name,d.icon,d.kind+' · '+d.wood+' wood'+(d.produce?' · grows '+d.produce.good:''),ECON.wood>=d.wood,()=>{setOpen(false);startPlacing(d.id);}));}
    else for(const d of DECOR_CATALOG.filter(d=>d.size===tab).sort((a,b)=>a.price-b.price))
      shopGrid.appendChild(card(d.name,d.icon,d.price+' coins'+(d.produce?' · makes '+d.produce.good:''),ECON.coins>=d.price,()=>{setOpen(false);startPlacing(d.id);}));
  }
  function buyCloth(o,mask){
    if(!owns(o.id)){if(ECON.coins<o.price){toast('Not enough coins yet');return;}ECON.coins-=o.price;ECON.owned.push(o.id);econSave();toast('Added "'+o.name+'" to Luna\'s Closet');}
    if(mask)CLOSET.mask=o.id;else CLOSET.outfit=o.id;CLOSET.lastChanged=mask?'mask':'outfit';applyCloset(true);render();
  }
  function renderPlaced(){
    placedEl.textContent='';
    if(!ECON.placed.length){const p=document.createElement('p');p.className='empty';p.textContent='Nothing placed yet. Buy a decoration to set it anywhere on the island.';placedEl.appendChild(p);return;}
    for(const rec of ECON.placed){const def=DECOR_BY_ID[rec.id],r=document.createElement('div');r.className='rowi';
      const l=document.createElement('span');l.textContent=def.icon+' '+def.name;r.appendChild(l);const bx=document.createElement('span');bx.className='acts';
      const mk=(t,f,lab)=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.setAttribute('aria-label',lab);b.onclick=f;bx.appendChild(b);};
      mk('Move',()=>{setOpen(false);startPlacing(rec.id,rec);},'Move the '+def.name);
      mk('Turn',()=>{rec.ry+=Math.PI/4;PLACED_RT.get(rec.uid).g.rotation.y=rec.ry;econSave();},'Turn the '+def.name);
      mk('Sell',()=>{navUnblock(rec);scene.remove(PLACED_RT.get(rec.uid).g);PLACED_RT.delete(rec.uid);ECON.placed.splice(ECON.placed.indexOf(rec),1);
        if(def.wood){const back=Math.floor(def.wood/2);ECON.wood+=back;econSave();toast('Took apart the '+def.name+' · got '+back+' wood back');}
        else{const back=Math.round(def.price/2);ECON.coins+=back;econSave();toast('Sold the '+def.name+' back for '+back+' coins');}},'Remove the '+def.name);
      r.appendChild(bx);placedEl.appendChild(r);}
  }
  function renderPrices(){priceEl.textContent='';for(const k in PRICES){if(!PRICES[k])continue;const s=document.createElement('span');s.textContent=goodIcon(k)+' '+goodName(k)+' '+PRICES[k];priceEl.appendChild(s);}}
  function render(){coinsEl.textContent=fmt(ECON.coins);renderBasket();renderShop();renderPlaced();}
  function setOpen(v){if(v){const cl=document.getElementById('closet');if(!cl.hidden){cl.hidden=true;document.getElementById('btnCloset').setAttribute('aria-expanded','false');}render();}
    panel.hidden=!v;btn.setAttribute('aria-expanded',v);if(v)panel.querySelector('.closet-close').focus();}
  ECON.listeners.push(()=>{badge.textContent=fmt(ECON.coins);if(!panel.hidden)render();});
  badge.textContent=fmt(ECON.coins);renderPrices();
  btn.onclick=()=>setOpen(panel.hidden);
  panel.querySelector('.closet-close').onclick=()=>{setOpen(false);btn.focus();};
  sellBtn.onclick=()=>sellBasket();
  document.getElementById('mkSellWood').onclick=()=>{if(ECON.wood<5)return;ECON.wood-=5;const v=5*PRICES.wood;ECON.coins+=v;ECON.earned+=v;econSave();toast('+'+v+' coins for 5 wood');};
  const rs=document.getElementById('mkReset');let rsT=0;
  rs.onclick=()=>{if(performance.now()-rsT<4000){try{for(const k of['lunas-market-v2','lunas-closet-v2','lunas-welcomed-v2','lunas-market-tab-v2','ladymoon-closet-v1','lunas-spacelaunch-played-v1'])localStorage.removeItem(k);}catch(e){}location.reload();}
    else{rsT=performance.now();rs.textContent='Tap again to erase everything';setTimeout(()=>{rs.textContent='Start over (erase coins, items and clothes)';},4000);}};
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false);btn.focus();}});
  MARKET.ui={setOpen};
})();

/* ================= clearing trees: pick one, chop it down, keep the stump (and the wood) ================= */
const CHOPS=[],_cm2=new T.Matrix4();const _ct=new T.Matrix4(),_cr=new T.Matrix4(),_cn=new T.Matrix4(),_cz=new T.Matrix4().makeScale(0,0,0),_cAx=new T.Vector3();
function navRefresh(x,z,r){
  const[g0x,g0z]=toGrid(x-r,z-r),[g1x,g1z]=toGrid(x+r,z+r);
  for(let gz=g0z;gz<=g1z;gz++)for(let gx=g0x;gx<=g1x;gx++){const[wx,wz]=toWorld(gx,gz);if(Math.hypot(wx-x,wz-z)>r)continue;const id=gIdx(gx,gz),w=isPointWalkable(wx,wz,0.34);
    if(w&&!NAV.walk[id]){NAV.walk[id]=1;NAV.cost[id]=1.15;}else if(!w&&NAV.walk[id]){NAV.walk[id]=0;NAV.cost[id]=999;}}
  OBS_VER++;
}
function hideTreeParts(t){const touched=new Set();for(const[b,i]of t.parts){if(!b.im)continue;b.im.setMatrixAt(i,_cz);touched.add(b.im);}for(const im of touched)im.instanceMatrix.needsUpdate=true;}
function chopTree(t,animate){
  if(!t||t.chopped)return;t.chopped=true;
  for(const o of t.obs){const i=CIRCLE_OBS.indexOf(o);if(i>=0)CIRCLE_OBS.splice(i,1);
    if(CAM_READY)for(const L of[CAM_TALL,CAM_LOW]){const j=L.indexOf(o);if(j>=0)L.splice(j,1);}}
  for(const c of t.canopies){const i=CANOPIES.indexOf(c);if(i>=0)CANOPIES.splice(i,1);}
  // a stump stays behind
  const st=new T.Group();st.position.set(t.x,t.y,t.z);scene.add(st);const bark=mStd('#6b4a36',{roughness:1}),ring=mStd('#d9b88a',{roughness:0.9});
  if(t.kind==='Bamboo grove'){for(let k=0;k<6;k++){const a=k*1.1,r=0.5+(k%3)*0.4;blob(st,CYL,mStd('#86b24f'),Math.cos(a)*r,0.15,Math.sin(a)*r,0.11,0.3,0.11);}}
  else{const s=t.kind==='Pine tree'?0.75*t.s:0.85*t.s;blob(st,CYL,bark,0,0.2,0,0.3*s,0.4,0.3*s);blob(st,CYL,ring,0,0.405,0,0.25*s,0.02,0.25*s,false);
    for(let k=0;k<3;k++){const a=k*2.1+0.4,rt=blob(st,CYL,bark,Math.cos(a)*0.28*s,0.08,Math.sin(a)*0.28*s,0.09*s,0.36,0.09*s);rt.rotation.set(Math.sin(a)*0.9,0,-Math.cos(a)*0.9);}}
  t.stump=st;t.stumpObs={x:t.x,z:t.z,r:t.kind==='Bamboo grove'?0.9:0.3*t.s+0.1};CIRCLE_OBS.push(t.stumpObs);
  navRefresh(t.x,t.z,Math.max(2.6,...t.obs.map(o=>o.r+1)));
  if(animate){t.orig=t.parts.map(([b,i])=>{const m=new T.Matrix4();if(b.im)b.im.getMatrixAt(i,m);return m;});
    const a=Math.atan2(t.z-camera.position.z,t.x-camera.position.x)+Math.PI/2+rnd(-0.6,0.6);CHOPS.push({t,age:0,axis:new T.Vector3(Math.cos(a),0,Math.sin(a))});
    emote(st,'!',3.2,1.2,0.7);}
  else hideTreeParts(t);
}
function updateChops(dt){updateChips(dt);updatePiles(dt);
  for(let n=CHOPS.length-1;n>=0;n--){const c=CHOPS[n],t=c.t;c.age+=dt;
    if(c.age>=1.75){hideTreeParts(t);CHOPS.splice(n,1);emote(t.stump,'leaf',1.2,1.4,0.6);continue;}
    const k=Math.min(1,c.age/1.35),ang=k*k*1.52,sink=Math.max(0,c.age-1.35)*1.5;
    _cr.makeRotationAxis(c.axis,ang);_ct.makeTranslation(t.x,t.y+0.35-sink,t.z);_cn.makeTranslation(-t.x,-(t.y+0.35),-t.z);
    const touched=new Set();_ct.multiply(_cr).multiply(_cn);t.parts.forEach(([b,i],j)=>{if(!b.im)return;_cm2.multiplyMatrices(_ct,t.orig[j]);b.im.setMatrixAt(i,_cm2);touched.add(b.im);});
    for(const im of touched)im.instanceMatrix.needsUpdate=true;}
}
const CHOP={on:false,sel:null,hover:null,ring:null};
CHOP.ring=new T.Mesh(new T.RingGeometry(1.5,1.72,40),new T.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:0.9,depthWrite:false}));CHOP.ring.rotation.x=-Math.PI/2;CHOP.ring.visible=false;CHOP.ring.userData.noWx=true;scene.add(CHOP.ring);
const chopBar=document.getElementById('chopBar'),chopTxt=document.getElementById('chopTxt'),chopGo=document.getElementById('chopGo');
const _pv=new T.Vector3();
function pickTree(cx,cy){let best=null,bd=80;
  for(const t of TREE_LIST){if(t.chopped)continue;_pv.set(t.x,t.y+2.2*(t.s||1),t.z).project(camera);if(_pv.z>1||_pv.z<-1)continue;
    const sx=(_pv.x+1)/2*innerWidth,sy=(1-_pv.y)/2*innerHeight,d=Math.hypot(sx-cx,sy-cy);if(d<bd){bd=d;best=t;}}
  return best;}
function showChopRing(t){if(!t){CHOP.ring.visible=false;return;}CHOP.ring.visible=true;CHOP.ring.position.set(t.x,t.y+0.08,t.z);CHOP.ring.scale.setScalar(t.kind==='Bamboo grove'?1.6:Math.max(0.8,t.s));}
function selectTree(t){CHOP.sel=t;showChopRing(t);
  if(t){chopTxt.innerHTML='Chop down this <b>'+t.kind.toLowerCase()+'</b>?<small>Luna will cut it with her axe and collect '+treeWood(t)+' wood for building.</small>';chopGo.disabled=false;}
  else{chopTxt.innerHTML='Clearing trees<small>Click or tap a tree to pick it.</small>';chopGo.disabled=true;}}
function setChop(v){if(v&&INSIDE_REF&&INSIDE_REF.on){toast('Step outside to clear trees');return;}CHOP.on=v;document.getElementById('btnChop').setAttribute('aria-pressed',v);chopBar.hidden=!v;if(v){if(PLACE.active)cancelPlacing();selectTree(null);}else{CHOP.sel=null;CHOP.ring.visible=false;}}
const CHIPS=[];for(let i=0;i<10;i++){const m=new T.Mesh(BOX,mStd('#d9b88a'));m.scale.set(0.09,0.03,0.06);m.visible=false;m.userData.noWx=true;scene.add(m);CHIPS.push({m,t:9,vx:0,vy:0,vz:0});}
function spawnChips(x,y,z){for(let k=0;k<4;k++){const c=CHIPS.find(c=>c.t>=0.9)||CHIPS[0];c.t=0;c.m.visible=true;c.m.position.set(x,y,z);c.vx=rnd(-2,2);c.vy=rnd(1.5,3.2);c.vz=rnd(-2,2);}}
function updateChips(dt){for(const c of CHIPS){if(c.t>=0.9)continue;c.t+=dt;c.vy-=9*dt;c.m.position.x+=c.vx*dt;c.m.position.y+=c.vy*dt;c.m.position.z+=c.vz*dt;c.m.rotation.x+=dt*9;c.m.rotation.z+=dt*7;if(c.t>=0.9)c.m.visible=false;}}
const WOOD_N={'Bamboo grove':3,'Pine tree':5,'Cherry tree':5};
function treeWood(t){return t.kind==='Bamboo grove'?3:Math.max(3,Math.round(WOOD_N[t.kind]*(t.s||1)));}
function spawnWoodPile(t){
  const n=treeWood(t);let px=t.x+1.3,pz=t.z;for(let k=0;k<8;k++){const a=k*0.785,x=t.x+Math.cos(a)*1.4,z=t.z+Math.sin(a)*1.4;if(isCellOpen(x,z)){px=x;pz=z;break;}}
  const g=new T.Group();g.position.set(px,hAt(px,pz),pz);g.rotation.y=rnd(0,6.28);scene.add(g);const bark=mStd('#7a5236',{roughness:1}),end=mStd('#e2c391',{roughness:0.9});
  const rows=[];{let left=n,w=3;while(left>0){const c=Math.min(w,left);rows.push(c);left-=c;w=Math.max(1,c-1);}}let k=0;rows.forEach((cnt,r)=>{for(let i=0;i<cnt;i++){const x=(i-(cnt-1)/2)*0.3,y=0.15+r*0.26;
    const lg=blob(g,CYL,bark,x,y,0,0.14,0.8,0.14);lg.rotation.x=Math.PI/2;for(const s of[-1,1]){const e=blob(g,CYL,end,x,y,s*0.401,0.12,0.01,0.12,false);e.rotation.x=Math.PI/2;}k++;}});
  emote(g,'sparkle',1.0,1.6,0.6);t.pile=g;t.pileN=n;
}
const PILE_FX=[];
function collectPile(t){if(!t.pile||t.collected)return;t.collected=true;PILE_FX.push({g:t.pile,t:0});
  ECON.wood+=t.pileN;econSave();toast('+'+t.pileN+' wood collected · lumber: '+ECON.wood+' (build in Market › Build)');emote(caretaker.headGroup,'sparkle',0.85);}
function updatePiles(dt){for(let i=PILE_FX.length-1;i>=0;i--){const f=PILE_FX[i];f.t+=dt;const k=Math.min(1,f.t/0.7);f.g.scale.setScalar(1-k);f.g.position.y+=dt*0.8;if(k>=1){scene.remove(f.g);PILE_FX.splice(i,1);}}}
const CHOP_TASK={id:'chop',need:'explore',act:'chop',dur:[8.8,8.8],sat:0};
function chopNow(t){chopTree(t,true);ECON.chopped.push(t.id);econSave();setTimeout(()=>spawnWoodPile(t),1800);setTimeout(()=>collectPile(t),3800);}
function chopFinish(){const tg=AI.target;if(!tg||!tg.tree)return;const t=tg.tree;
  if(!t.chopped){t.queued=false;return;}if(!tg.piled){tg.piled=true;spawnWoodPile(t);}collectPile(t);}
function chopUpdate(dt){const tg=AI.target,t=tg.tree;
  if(!tg.felled&&AI.actT>=tg.nextHit){tg.nextHit+=0.9;tg.hits=(tg.hits||0)+1;spawnChips(t.x,t.y+0.8,t.z);if(tg.hits===1)emote(caretaker.headGroup,'!',0.85,1.2,0.55);
    if(tg.hits>=4){tg.felled=true;chopTree(t,true);ECON.chopped.push(t.id);econSave();tg.pileAt=AI.actT+1.8;}}
  if(tg.felled&&!tg.piled&&AI.actT>=tg.pileAt){tg.piled=true;spawnWoodPile(t);}
  // then she kneels and gathers the logs up
  if(tg.piled&&AI.actT>=tg.pileAt+0.6&&AI.act==='chop'){AI.act='collect';AI.yaw+=0;tg.lookPile=true;}
  if(tg.lookPile&&t.pile){tg.look=[t.pile.position.x,t.pile.position.z];}
  if(tg.piled&&!t.collected&&AI.actT>=tg.pileAt+2.0)collectPile(t);
}
chopGo.onclick=()=>{const t=CHOP.sel;if(!t||t.queued)return;t.queued=true;selectTree(null);
  // Luna walks over with her axe and does the work herself (instant if she is holding still or you are steering her)
  if(STILL.on||CTRL.on||AI.inside){chopNow(t);toast('Timber!');return;}
  if(AI.state==='act')endAct();else if(AI.state==='walk')abortTask();if(AI.state==='skylook'){AI.state='idle';AI.skyObj=null;}
  let spot=null;const r=Math.max(...t.obs.map(o=>o.r),0.6)+0.55;for(let k=0;k<12&&!spot;k++){const a=Math.atan2(AI.z-t.z,AI.x-t.x)+(k%2?1:-1)*Math.ceil(k/2)*0.52,x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;if(isCellOpen(x,z))spot=[x,z];}
  if(!spot){spot=snapWalkable(t.x+r,t.z);}
  startTask({tk:CHOP_TASK,tgt:{x:spot[0],z:spot[1],look:[t.x,t.z],tree:t,nextHit:1.0,hits:0},rid:'chop'});toast('Luna grabs her axe');};
document.getElementById('chopDone').onclick=()=>setChop(false);
document.getElementById('btnChop').onclick=()=>setChop(!CHOP.on);
{const cv=renderer.domElement;let down=null;
  cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};});
  cv.addEventListener('pointermove',e=>{if(!CHOP.on||e.pointerType!=='mouse'||e.buttons||CHOP.sel)return;showChopRing(pickTree(e.clientX,e.clientY));});
  cv.addEventListener('pointerup',e=>{if(!CHOP.on||!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y),dt=performance.now()-down.t;down=null;if(moved>8||dt>450)return;selectTree(pickTree(e.clientX,e.clientY));});}
addEventListener('keydown',e=>{if(!CHOP.on)return;if(e.key==='Escape'){setChop(false);e.stopImmediatePropagation();}else if(e.key==='Enter'&&CHOP.sel)chopGo.onclick();},true);
if(!Array.isArray(ECON.chopped))ECON.chopped=[];
for(const id of ECON.chopped)chopTree(TREE_LIST[id],false);

/* ================= nobody walks through anybody: character separation + pushing out of objects ================= */
let OBS_HASH=null,OBS_HASH_V=-1,OBS_HASH_N=-1;
function obsHash(){
  if(OBS_HASH&&OBS_HASH_V===OBS_VER&&OBS_HASH_N===CIRCLE_OBS.length)return OBS_HASH;
  const m=new Map();for(const c of CIRCLE_OBS){const r=Math.ceil((c.r+0.5)/4),gx=Math.floor(c.x/4),gz=Math.floor(c.z/4);
    for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const k=(gx+a)*10007+(gz+b);let L=m.get(k);if(!L)m.set(k,L=[]);L.push(c);}}
  OBS_HASH=m;OBS_HASH_V=OBS_VER;OBS_HASH_N=CIRCLE_OBS.length;return m;
}
function pushOut(e,rad,allowInsideBox){
  const L=obsHash().get(Math.floor(e.x/4)*10007+Math.floor(e.z/4));
  if(L)for(const c of L){const dx=e.x-c.x,dz=e.z-c.z,d=Math.hypot(dx,dz),m=c.r+rad;if(d<m&&d>1e-4){e.x=c.x+dx/d*m;e.z=c.z+dz/d*m;}}
  for(const b of BOX_OBS){if(e.x<b.x0-rad||e.x>b.x1+rad||e.z<b.z0-rad||e.z>b.z1+rad)continue;
    const cx=clamp(e.x,b.x0,b.x1),cz=clamp(e.z,b.z0,b.z1),dx=e.x-cx,dz=e.z-cz,d=Math.hypot(dx,dz);
    if(d>1e-4){if(d<rad){e.x=cx+dx/d*rad;e.z=cz+dz/d*rad;}}
    else if(allowInsideBox){const l=e.x-b.x0,r=b.x1-e.x,t=e.z-b.z0,bt=b.z1-e.z,mn=Math.min(l,r,t,bt);
      if(mn===l)e.x=b.x0-rad;else if(mn===r)e.x=b.x1+rad;else if(mn===t)e.z=b.z0-rad;else e.z=b.z1+rad;}}
}
function standable(x,z){const[gx,gz]=toGrid(x,z);return NAV.walk[gIdx(gx,gz)]===1||!!getBridgeInfo(x,z)||isOnDock(x,z)||isOnHouseStepsOrPorch(x,z);}
const SKIP_STATES=new Set(['onSwing','hopOn','hopOff','inside']);
function resolveCollisions(){
  const L=[];
  const lunaFree=!AI.inside&&!AI.seatObj&&!(AI.state==='act'&&AI.act==='swim');
  if(lunaFree)L.push({o:AI,r:0.3,w:0.25,luna:true});
  if(!LM.inside)L.push({o:LM,r:0.3,w:0.5,luna:true});
  if(!SL.inside)L.push({o:SL,r:0.3,w:0.5,luna:true});
  for(const e of ALL_ANIMALS){if(e.inside||SKIP_STATES.has(e.state))continue;L.push({o:e,r:e.kind==='dog'?0.3:e.kind==='cat'?0.25:0.22,w:1});}
  for(const it of L){it.ox=it.o.x;it.oz=it.o.z;}
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];let dx=b.o.x-a.o.x,dz=b.o.z-a.o.z,d=Math.hypot(dx,dz);const m=a.r+b.r;
    if(d>=m)continue;if(d<1e-4){const r=Math.random()*6.28;dx=Math.cos(r);dz=Math.sin(r);d=1;}else{dx/=d;dz/=d;}
    const ov=m-Math.min(d,m),wa=a.w/(a.w+b.w),wb=1-wa;a.o.x-=dx*ov*wa;a.o.z-=dz*ov*wa;b.o.x+=dx*ov*wb;b.o.z+=dz*ov*wb;}
  for(const it of L){const o=it.o;
    if(!(it.luna&&(isOnHouseStepsOrPorch(o.x,o.z)||isOnDock(o.x,o.z)||getBridgeInfo(o.x,o.z))))pushOut(o,it.r*0.8,!it.luna);
    if((o.x!==it.ox||o.z!==it.oz)&&!standable(o.x,o.z)&&standable(it.ox,it.oz)){o.x=it.ox;o.z=it.oz;}}
}

function lunaStartle(){if(simTime-AI.lastStartle<6||AI.eyesClosed)return;AI.lastStartle=simTime;AI.startleT=0.45;emote(caretaker.headGroup,Math.random()<0.5?'!':'note',0.85,1.4,0.55);}

function resolveTarget(tk){
  if(tk.poi){const p=POI[tk.poi];return{x:p.x,z:p.z,look:p.look};}
  if(tk.dynamic==='garden')return bestGardenChore();
  if(tk.dynamic==='pet'){
    let best=null,bd=30;
    for(const e of ALL_ANIMALS){
      if(e.kind==='dog'&&e.state!=='follow')continue;
      if(e.state==='petted'||simTime-e.lastPet<(e.kind==='dog'?120:60))continue;
      const d=Math.hypot(e.x-AI.x,e.z-AI.z);if(d<bd){bd=d;best=e;}
    }
    return best?{x:best.x,z:best.z,ent:best}:null;
  }
  if(tk.dynamic==='fetch'){
    let dog=null,dd=12;for(const d of DOGS){const k=Math.hypot(d.x-AI.x,d.z-AI.z);if(d.state==='follow'&&k<dd){dd=k;dog=d;}}
    if(!dog)return null;
    for(let i=0;i<14;i++){const[sx,sz]=randomSpotNear(AI.x,AI.z,12);let open=0;
      for(let k=0;k<8;k++){const a=k*Math.PI/4;if(isCellOpen(sx+Math.sin(a)*6,sz+Math.cos(a)*6)&&hasGridLineOfSight(sx,sz,sx+Math.sin(a)*6,sz+Math.cos(a)*6))open++;}
      if(open>=4)return{x:sx,z:sz,dog};}
    return null;
  }
  // the dog yard: let the pups out in the morning, tuck them in at night
  if(tk.dynamic==='letOut'){
    if(nightK>0.45||!DOGS.some(d=>d.state==='kennel'))return null;
    if(BRAIN.nextLetOut&&simTime<BRAIN.nextLetOut)return null;
    // sometimes she takes just one pup along, sometimes both
    const k=DOGS.filter(d=>d.state==='kennel'),dogs=k.length>1&&Math.random()<0.55?[k[Math.floor(Math.random()*k.length)]]:k;
    return{x:GATE_SPOT[0],z:GATE_SPOT[1],look:[-26.6,31.2],urg:1,mode:'out',dogs};
  }
  if(tk.dynamic==='bedtime'){
    if(nightK<0.62||!DOGS.some(d=>d.state!=='kennel'&&d.state!=='toKennel'))return null;
    return{x:GATE_SPOT[0],z:GATE_SPOT[1],look:[-26.6,31.2],urg:1,mode:'bed'};
  }
  if(tk.dynamic==='decor'){const c=ECON.placed.filter(p=>DECOR_BY_ID[p.id]&&DECOR_BY_ID[p.id].use);if(!c.length)return null;
    const rec=c[Math.floor(Math.random()*c.length)],def=DECOR_BY_ID[rec.id],d=def.r+0.95;
    for(let k=0;k<8;k++){const a=rec.ry+(k%2?1:-1)*Math.ceil(k/2)*0.785,x=rec.x+Math.sin(a)*d,z=rec.z+Math.cos(a)*d;
      if(isCellOpen(x,z))return{x,z,look:[rec.x,rec.z],decorLabel:def.use,decorAct:def.act||'look',rid:'d'+rec.uid};}
    return null;}
  if(tk.dynamic==='swim'){if(nightK>0.5||WEATHER.rainK>0.2||WEATHER.snowK>0.2)return null;let best=null,bd=1e9;
    for(const sp of FISH_SPOTS){if(sp.water!=='pond'||Math.hypot(sp.cast[0]-PB.x,sp.cast[1]-PB.z)>PB.r)continue;const d=Math.hypot(sp.x-AI.x,sp.z-AI.z);if(d<bd){bd=d;best=sp;}}
    return best?{x:best.x,z:best.z,look:[PB.x,PB.z],shore:best}:null;}
  if(tk.dynamic==='swing'){if(nightK>0.7||!SWING)return null;if(!SWING.frontS)SWING.frontS=snapWalkable(SWING.front[0],SWING.front[1]);
    return{x:SWING.frontS[0],z:SWING.frontS[1],look:[SWING.x+Math.sin(SWING.ry)*9,SWING.z+Math.cos(SWING.ry)*9]};}
  if(tk.dynamic==='sell'){const v=basketValue();if(v<40||nightK>0.75)return null;const p=POI.market;return{x:p.x,z:p.z,look:p.look,urg:clamp(v/200,0.3,1.3)};}
  if(tk.dynamic==='fish'){
    if(nightK>0.7||!FISH_SPOTS.length)return null;
    let best=null,bs=-1;for(const sp of FISH_SPOTS){const v=Math.random()/(1+Math.hypot(sp.x-AI.x,sp.z-AI.z)/35);if(v>bs){bs=v;best=sp;}}
    return{x:best.x,z:best.z,look:best.cast,spot:best};
  }
  return null;
}
function chooseTask(){
  const night=nightK>0.55,wet=WEATHER.rainK>0.4;let best=null,bs=-1;
  for(const tk of TASKS){
    if(tk.day&&night)continue;
    if(wet&&tk.dry)continue;
    const tgt=resolveTarget(tk);if(!tgt)continue;
    const dist=Math.hypot(tgt.x-AI.x,tgt.z-AI.z),rid=tgt.rid||tk.id;
    let s=(tgt.urg!==undefined?tgt.urg:NEEDS[tk.need])*(tk.w||1);
    if(night&&tk.nightBonus)s*=tk.nightBonus;
    if(night&&tk.need==='energy')s*=1.6;
    if(wet&&tk.shelter)s*=1.8;
    s/=1+dist/45;
    const ri=BRAIN.recent.lastIndexOf(rid);if(ri>=0)s*=0.2+0.2*(BRAIN.recent.length-1-ri);
    s+=Math.random()*0.12;
    if(s>bs){bs=s;best={tk,tgt,rid};}
  }
  return best;
}
function setApproachPath(){
  const tg=AI.target;let tx=tg.x,tz=tg.z;
  if(tg.ent){const a=Math.atan2(AI.x-tg.ent.x,AI.z-tg.ent.z);tx=tg.ent.x+Math.sin(a)*0.95;tz=tg.ent.z+Math.cos(a)*0.95;}
  AI.path=planPath(AI.x,AI.z,tx,tz);AI.wp=0;
}
function startTask(c){
  AI.task=c.tk;AI.target=c.tgt;AI.retries=0;AI.stuckN=0;AI.stuckT=0;AI.repath=1;
  if(c.tgt.ent){c.tgt.ent.state='await';c.tgt.ent.timer=16;}
  const night=nightK>0.55,urg=c.tgt.urg!==undefined?c.tgt.urg:NEEDS[c.tk.need];
  AI.walkSpeed=(urg>0.85?3.4:2.7)*(night?0.85:1);
  setApproachPath();AI.state='walk';
  BRAIN.recent.push(c.rid);if(BRAIN.recent.length>4)BRAIN.recent.shift();
  const icon=c.tgt.chore?CHORE_ICON[c.tgt.chore]:{pets:'heart',play:'ball',energy:night?'zzz':'note',explore:'note',fish:'fish',swim:'drop',swing:'note',wander:'sparkle',enjoy:'heart'}[c.tk.need];
  if(Math.random()<0.45)emote(caretaker.headGroup,icon,0.85,1.5,0.5);
}
function releaseTarget(){const tg=AI.target;if(tg&&tg.ent&&(tg.ent.state==='await'||tg.ent.state==='petted')){tg.ent.state=tg.ent.kind==='dog'?'follow':'idle';tg.ent.timer=rnd(4,8);tg.ent.idlePose='loaf';}}
function abortTask(){releaseTarget();AI.task=null;AI.target=null;AI.state='idle';AI.timer=1;}
function beginAct(){
  const tk=AI.task;if(!tk){AI.state='idle';AI.timer=1;return;}
  const garden=tk.dynamic==='garden',dur=garden?CHORE_DUR[AI.target.chore]:tk.dur;
  AI.state='act';AI.act=garden?AI.target.chore:(AI.target&&AI.target.decorAct)||tk.act;AI.timer=rnd(dur[0],dur[1]);AI.actT=0;AI.emoteT=0.4;
  const night=nightK>0.55;
  if(AI.act==='sit'&&night)AI.timer*=2.2;
  AI.actDur=AI.timer;
  if(garden){gardenBegin();emote(caretaker.headGroup,AI.act==='water'?'?':CHORE_ICON[AI.act],0.85);}
  if(AI.act==='feed'){emote(caretaker.headGroup,'food',0.85);
    for(const e of PETS)if(Math.hypot(e.x-AI.x,e.z-AI.z)<16&&(e.state==='idle'||e.state==='wander')){e.state='approach';e.repath=0;e.timer=12;}}
  if(AI.act==='pet'){const e=AI.target.ent;e.state='petted';e.lastPet=simTime;}
  if(AI.act==='fetch'){DOG=AI.target.dog||DOG;BRAIN.fetch={throws:0,phase:'ready',t:0,aim:null};BALL.state='held';DOG.state='sitWait';}
  if(AI.act==='gate'){GATE.target=1;GATE.hold=true;GATE.closeAt=0;AI.gateDone=false;emote(caretaker.headGroup,AI.target.mode==='bed'?'zzz':'heart',0.85);}
  if(AI.act==='fish')fishBegin();
  if(AI.act==='sell'){AI.sold=0;emote(caretaker.headGroup,'basket',0.85);}
  if(AI.act==='swim'){const sh=AI.target.shore,a=Math.atan2(sh.z-PB.z,sh.x-PB.x);
    AI.swim={phase:'prep',t:0,shore:[AI.x,AI.z],entry:[PB.x+Math.cos(a)*(PB.r-1.6),PB.z+Math.sin(a)*(PB.r-1.6)],dv:[PB.x+Math.cos(a)*(PB.r-3.2),PB.z+Math.sin(a)*(PB.r-3.2)],ang:a,rad:PB.r-3.2,rr:rnd(3,5),dir:Math.random()<0.5?1:-1,dur:AI.timer,splT:0};
    AI.timer=999;AI.swimK=0;emote(caretaker.headGroup,'drop',0.85);}
  if(AI.act==='swing'){AI.seatObj=SWING.lunaA;AI.swingDog=null;AI.swingDogT=rnd(1.2,2.6);AI.yaw=SWING.ry;emote(caretaker.headGroup,'note',0.85);}
  if(tk.emote)emote(caretaker.headGroup,tk.emote,0.85);
}
function endAct(){
  const tk=AI.task;
  if(tk&&tk.dynamic==='garden'&&AI.target&&AI.target.bed)gardenComplete();
  else if(tk)NEEDS[tk.need]=Math.max(0,NEEDS[tk.need]-tk.sat);
  releaseTarget();
  if(tk&&tk.act==='fetch'){BALL.state='none';if(DOG.state!=='kennel'&&DOG.state!=='toKennel')DOG.state='follow';}
  if(tk&&tk.act==='gate'){GATE.hold=false;GATE.closeAt=simTime+(AI.gateDone&&AI.target&&AI.target.mode==='out'?4:0.8);
    if(AI.target&&AI.target.mode==='out')for(const d of (AI.target.dogs||DOGS))if(d.state==='kennel'){d.state='follow';d.path=null;}}
  if(tk&&tk.act==='swim'){if(AI.swim){AI.x=AI.swim.shore[0];AI.z=AI.swim.shore[1];}AI.swimK=0;AI.swim=null;AI.diveLift=0;AI.divePitch=0;swimSuitOff();}
  if(tk&&tk.act==='chop')chopFinish();
  if(tk&&tk.act==='swing'){AI.seatObj=null;SWING.target=0;if(SWING.frontS){AI.x=SWING.frontS[0];AI.z=SWING.frontS[1];}
    const sd=AI.swingDog;if(sd&&(sd.state==='onSwing'||sd.state==='hopOn'))dogHopOff(sd);AI.swingDog=null;}
  if(tk&&tk.act==='fish')fishEnd();
  if(AI.eyesClosed){AI.eyesClosed=false;caretaker.faceObj.drawFace(false);}
  NEEDS.energy=Math.min(1,NEEDS.energy+0.04);
  AI.task=null;AI.target=null;AI.state='idle';AI.timer=rnd(0.5,1.6);
}
function swimUpdate(dt){
  const S=AI.swim;S.t+=dt;S.splT-=dt;
  if(S.phase==='prep'){// change into a swimsuit, step up to the edge and get ready to dive
    AI.yaw+=normalizeAngle(Math.atan2(S.dv[0]-S.shore[0],S.dv[1]-S.shore[1])-AI.yaw)*Math.min(1,dt*6);
    if(!S.suited&&S.t>0.35){S.suited=true;swimSuitOn();}
    if(S.t>=1.6){S.phase='dive';S.t=0;}}
  else if(S.phase==='dive'){const k=Math.min(1,S.t/1.0);AI.x=lerp(S.shore[0],S.dv[0],k);AI.z=lerp(S.shore[1],S.dv[1],k);
    AI.diveLift=Math.sin(k*Math.PI)*1.25;AI.divePitch=k<0.8?lerp(0.15,1.7,k/0.8):lerp(1.7,0.35,(k-0.8)/0.2);AI.swimK=smooth(0.55,1,k);
    if(k>=1){AI.diveLift=0;AI.divePitch=0;fishSplash(AI.x,WATER,AI.z,1.6);fishSplash(AI.x+0.4,WATER,AI.z-0.3,1.0);emote(caretaker.headGroup,'drop',0.6,1.4,0.6);
      S.phase='swim';S.t=0;S.rad=Math.hypot(AI.x-PB.x,AI.z-PB.z);S.ang=Math.atan2(AI.z-PB.z,AI.x-PB.x);}}
  else if(S.phase==='swim'){S.rad=lerp(S.rad,S.rr,Math.min(1,dt*0.5));S.ang+=S.dir*1.05/Math.max(2,S.rad)*dt;
    const nx=PB.x+Math.cos(S.ang)*S.rad,nz=PB.z+Math.sin(S.ang)*S.rad;AI.yaw+=normalizeAngle(Math.atan2(nx-AI.x,nz-AI.z)-AI.yaw)*Math.min(1,dt*4);AI.x=nx;AI.z=nz;
    if(Math.random()<dt*0.12)emote(caretaker.headGroup,Math.random()<0.5?'note':'heart',0.6,1.5,0.5);
    if(S.t>S.dur-4){S.phase='back';S.t=0;}}
  else if(S.phase==='back'){const dx=S.entry[0]-AI.x,dz=S.entry[1]-AI.z,d=Math.hypot(dx,dz);
    if(d<0.25||S.t>12){S.phase='out';S.t=0;}else{AI.yaw+=normalizeAngle(Math.atan2(dx,dz)-AI.yaw)*Math.min(1,dt*5);const st=Math.min(d,1.3*dt);AI.x+=dx/d*st;AI.z+=dz/d*st;}}
  else if(S.phase==='out'){const k=smooth(0,1,S.t/1.8);AI.x=lerp(S.entry[0],S.shore[0],k);AI.z=lerp(S.entry[1],S.shore[1],k);AI.swimK=1-smooth(0,0.75,S.t/1.8);
    AI.yaw+=normalizeAngle(Math.atan2(S.shore[0]-S.entry[0],S.shore[1]-S.entry[1])-AI.yaw)*Math.min(1,dt*6);
    if(S.t>=1.8){AI.swimK=0;swimSuitOff();emote(caretaker.headGroup,'sparkle',0.85);endAct();return;}}
  if(AI.swimK>0.6&&S.splT<=0){S.splT=0.55;fishSplash(AI.x,WATER,AI.z,0.45);}
}
function swimSuitOn(){if(CLOSET.outfit==='swimsuit')return;AI.prevOutfit=CLOSET.outfit;CLOSET.outfit='swimsuit';applyCloset(false);emote(caretaker.headGroup,'sparkle',0.85);}
function swimSuitOff(){if(!AI.prevOutfit)return;if(CLOSET.outfit==='swimsuit')CLOSET.outfit=AI.prevOutfit;AI.prevOutfit=null;applyCloset(false);}
function canInterrupt(){
  if(AI.state==='walk'||AI.state==='idle')return true;
  return AI.state==='act'&&['look','sitView','inspect','wave','bow'].includes(AI.act);
}
function lunaFollowPath(dt,speed){
  if(AI.wp>=AI.path.length)return true;
  const[wx,wz]=AI.path[AI.wp],dx=wx-AI.x,dz=wz-AI.z,dist=Math.hypot(dx,dz),last=AI.wp===AI.path.length-1;
  if(dist<(last?0.35:0.6)){AI.wp++;return AI.wp>=AI.path.length;}
  let dirX=dx/dist,dirZ=dz/dist;
  if(!getBridgeInfo(AI.x,AI.z)){let rx=0,rz=0;
    for(const c of CIRCLE_OBS){const ox=AI.x-c.x,oz=AI.z-c.z;if(ox>3||ox<-3||oz>3||oz<-3)continue;
      const od=Math.hypot(ox,oz),safe=c.r+0.5;if(od<safe&&od>0.001){const p=(safe-od)/safe;rx+=ox/od*p*1.3;rz+=oz/od*p*1.3;}}
    dirX+=rx;dirZ+=rz;const l=Math.hypot(dirX,dirZ)||1;dirX/=l;dirZ/=l;}
  const diff=normalizeAngle(Math.atan2(dirX,dirZ)-AI.yaw);AI.yaw+=diff*Math.min(1,dt*8);
  let target=speed*clamp(1-Math.abs(diff)/Math.PI,0.3,1);if(last)target*=clamp(dist/1.5,0.45,1);
  AI.speed=lerp(AI.speed,target,Math.min(1,dt*6));
  const nx=AI.x+Math.sin(AI.yaw)*AI.speed*dt,nz=AI.z+Math.cos(AI.yaw)*AI.speed*dt;
  if(isPointWalkable(nx,nz,0.22)){AI.x=nx;AI.z=nz;}else{AI.x+=dirX*AI.speed*dt;AI.z+=dirZ*AI.speed*dt;}
  return false;
}
function walkUpdate(dt){
  const tg=AI.target;
  if(tg&&tg.ent){
    const e=tg.ent;AI.repath-=dt;
    if(AI.repath<=0){AI.repath=1;if(Math.hypot(e.x-tg.x,e.z-tg.z)>0.7){tg.x=e.x;tg.z=e.z;setApproachPath();}}
    if(e.state==='await')e.timer=Math.max(e.timer,4);
    if(Math.hypot(e.x-AI.x,e.z-AI.z)<1.25){beginAct();return;}
  }
  if(lunaFollowPath(dt,AI.walkSpeed)){
    if(tg&&tg.ent&&Math.hypot(tg.ent.x-AI.x,tg.ent.z-AI.z)>1.6){if(++AI.retries>3)abortTask();else setApproachPath();}
    else beginAct();
    return;
  }
  AI.stuckT+=dt;
  if(AI.stuckT>1.2){
    if(Math.hypot(AI.x-AI.checkX,AI.z-AI.checkZ)<0.3){if(++AI.stuckN>2)abortTask();else setApproachPath();}else AI.stuckN=0;
    AI.stuckT=0;AI.checkX=AI.x;AI.checkZ=AI.z;
  }
}
function fetchUpdate(dt){
  const F=BRAIN.fetch;F.t+=dt;
  if(F.phase==='ready'){
    BALL.state='held';
    if(F.t>0.8){F.phase='windup';F.t=0;F.aim=null;
      for(let i=0;i<24&&!F.aim;i++){const a=AI.yaw+rnd(-1.0,1.0),d=rnd(4.5,8.5),px=AI.x+Math.sin(a)*d,pz=AI.z+Math.cos(a)*d;
        if(isCellOpen(px,pz)&&hasGridLineOfSight(AI.x,AI.z,px,pz))F.aim=[px,pz];}
      if(!F.aim)F.aim=randomSpotNear(AI.x,AI.z,8,3);}
  }else if(F.phase==='windup'){
    if(F.t>0.55){caretaker.handR.getWorldPosition(BALL.from);BALL.target=F.aim;BALL.t=0;
      BALL.dur=0.75+Math.hypot(F.aim[0]-AI.x,F.aim[1]-AI.z)*0.05;BALL.state='flying';
      DOG.state='chase';DOG.repath=0;F.phase='wait';F.t=0;F.throws++;}
  }else if(F.phase==='wait'){
    if(BRAIN.fetchReturned){BRAIN.fetchReturned=false;emote(caretaker.headGroup,'heart',0.85);
      if(F.throws>=3){endAct();return;}F.phase='ready';F.t=-0.5;}
    if(F.t>25){endAct();return;}
  }
}
function actUpdate(dt){
  AI.speed=lerp(AI.speed,0,Math.min(1,dt*10));AI.actT+=dt;AI.emoteT-=dt;
  const tg=AI.target,night=nightK>0.55;let fx=null,fz=null;
  if(tg&&tg.ent){fx=tg.ent.x;fz=tg.ent.z;}else if(tg&&tg.look){fx=tg.look[0];fz=tg.look[1];}
  if(AI.act==='fetch'&&BRAIN.fetch){const F=BRAIN.fetch;
    if(F.phase==='wait'){if(BALL.state==='flying'||BALL.state==='ground'){fx=BALL.target[0];fz=BALL.target[1];}else{fx=DOG.x;fz=DOG.z;}}
    else if(F.aim){fx=F.aim[0];fz=F.aim[1];}else{fx=DOG.x;fz=DOG.z;}}
  if(AI.act==='fish'&&FISH.phase!=='idle'){fx=FISH.bx||fx;fz=FISH.bz||fz;if(FISH.phase==='ready'&&tg&&tg.look){fx=tg.look[0];fz=tg.look[1];}}
  if(fx!==null&&Math.hypot(fx-AI.x,fz-AI.z)>0.2)AI.yaw+=normalizeAngle(Math.atan2(fx-AI.x,fz-AI.z)-AI.yaw)*Math.min(1,dt*5);
  switch(AI.act){
    case 'pet':if(AI.emoteT<=0){emote(tg.ent.root,'heart',tg.ent.kind==='bunny'?0.65:tg.ent.kind==='dog'?0.95:0.8);AI.emoteT=1.5;}break;
    case 'feed':if(AI.emoteT<=0&&AI.actT>1.8){emote(caretaker.headGroup,'heart',0.85);AI.emoteT=99;}break;
    case 'sit':if(night){if(!AI.eyesClosed&&AI.actT>1.5){AI.eyesClosed=true;caretaker.faceObj.drawFace(true);}
      if(AI.emoteT<=0){emote(caretaker.headGroup,'zzz',0.8);AI.emoteT=3;}}break;
    case 'sitView':if(AI.emoteT<=0&&AI.actT>1){emote(caretaker.headGroup,night?'sparkle':'note',0.8);AI.emoteT=5;}break;
    case 'fetch':fetchUpdate(dt);return;
    case 'fish':fishUpdate(dt);return;
    case 'swim':swimUpdate(dt);return;
    case 'chop':case 'collect':chopUpdate(dt);break;
    case 'build':buildUpdate(dt);break;
    case 'swing':SWING.target=AI.timer>1.8?0.42:0;
      if(!AI.swingDog&&AI.actT>AI.swingDogT){const c=DOGS.filter(d=>d.state==='follow'&&Math.hypot(d.x-AI.x,d.z-AI.z)<15);
        if(c.length){const d=c[Math.floor(Math.random()*c.length)];d.state='hopOn';d.hopT=0;d.hopFrom=[d.x,walkHeight(d.x,d.z),d.z];AI.swingDog=d;}else AI.swingDogT=999;}
      if(AI.swingDog&&AI.swingDog.state==='onSwing'&&AI.timer<1.5)dogHopOff(AI.swingDog);
      if(AI.emoteT<=0&&AI.actT>3){emote(caretaker.headGroup,Math.random()<0.5?'note':'heart',0.85);AI.emoteT=rnd(4,7);}
      break;
    case 'sell':if(!AI.sold&&AI.actT>1.6){AI.sold=sellBasket()||-1;emote(caretaker.headGroup,'coin',0.85,2,0.6);emote(MARKET.head,'heart',0.45,1.8,0.5);}break;
    case 'gate':
      if(tg.mode==='out'){
        if(!AI.gateDone&&AI.actT>1.1){AI.gateDone=true;
          for(const d of (tg.dogs||DOGS))if(d.state==='kennel'){d.state='follow';d.path=null;d.repath=0;d.happy=4;emote(d.root,'heart',0.95);}
          if(DOGS.some(d=>d.state==='kennel'))BRAIN.nextLetOut=simTime+rnd(150,320);}
      }else{
        if(!AI.gateDone&&AI.actT>0.8){AI.gateDone=true;
          for(const d of DOGS)if(d.state!=='kennel'&&d.state!=='toKennel'){d.state='toKennel';d.path=null;d.repath=0;d.kennelT=0;}}
        if(AI.gateDone&&AI.actT>2.5&&DOGS.every(d=>d.state==='kennel'))AI.timer=Math.min(AI.timer,0.9);
        if(AI.emoteT<=0&&AI.actT>1.5){emote(caretaker.headGroup,'zzz',0.85);AI.emoteT=4;}
      }
      break;
  }
  lunaNewActs(dt);
  if(GARDEN_ACTS.has(AI.act)&&tg&&tg.bed){gardenProgress();
    if(AI.act==='water'&&AI.actT>1.3&&!tg.saidDrop){tg.saidDrop=true;emote(caretaker.headGroup,'drop',0.85);}}
  AI.timer-=dt;if(AI.timer<=0)endAct();
}

const _skyPt=new T.Vector3(),_lookPt=new T.Vector3();
const _seatV=new T.Vector3();caretaker.root.rotation.order='YXZ';
const CROUCH_ACTS=new Set(['pet','feed','weed','harvest','prep','plant','collect']);
function poseLuna(dt,time){
  const C=caretaker,night=nightK>0.55,acting=AI.state==='act';
  const actNow=acting?AI.act:(AI.state==='skylook'&&AI.saved&&AI.saved.state==='act'?AI.act:null);
  const sitting=actNow==='sit'||actNow==='sitView'||actNow==='swing';
  const crouch=acting&&(CROUCH_ACTS.has(AI.act)||(AI.act==='water'&&AI.actT<1.3));
  AI.sitK=lerp(AI.sitK,sitting?1:0,Math.min(1,dt*4));
  AI.crouchK=lerp(AI.crouchK,crouch?1:0,Math.min(1,dt*5));
  AI.startleT=Math.max(0,AI.startleT-dt);
  const hop=(AI.startleT>0?Math.sin((0.45-AI.startleT)/0.45*Math.PI)*0.22:0)+(AI.jumpT>0?Math.sin((1-AI.jumpT/0.62)*Math.PI)*0.75:0)+(AI.diveLift||0);
  let groundY=AI.inside?INSIDE.ent.y:walkHeight(AI.x,AI.z);if(AI.swimK>0)groundY=lerp(groundY,WATER-1.12,AI.swimK);AI.y=lerp(AI.y,groundY,Math.min(1,dt*24));
  const aheadY=AI.inside||AI.swimK>0?groundY:walkHeight(AI.x+Math.sin(AI.yaw)*0.45,AI.z+Math.cos(AI.yaw)*0.45);
  AI.pitch=lerp(AI.pitch,clamp((aheadY-groundY)*0.35,-0.18,0.18),Math.min(1,dt*10));
  AI.twirlT=Math.max(0,(AI.twirlT||0)-dt);const tw=AI.twirlT>0?smooth(0,1,1-AI.twirlT/0.9)*Math.PI*2:0;
  C.root.position.set(AI.x,AI.y-AI.sitK*0.72-AI.crouchK*0.18+hop+Math.sin(tw*0.5)*0.12,AI.z);C.root.rotation.y=AI.yaw+tw;
  if(AI.seatObj){AI.seatObj.getWorldPosition(_seatV);C.root.position.set(_seatV.x,_seatV.y+0.04-C.HIP,_seatV.z);C.root.rotation.x=SWING.pv.rotation.x;C.root.rotation.y=SWING.ry;}else C.root.rotation.x=AI.divePitch||0;

  const mv=clamp(AI.speed/3,0,1);
  if(mv>0.03)AI.walkPhase+=dt*AI.speed*3.6;
  const s=Math.sin(AI.walkPhase),c=Math.cos(AI.walkPhase),H=C.HIP;
  const legBase=-1.45*AI.sitK-0.55*AI.crouchK;
  C.leftLeg.leg.rotation.x=s*0.6*mv+legBase;C.rightLeg.leg.rotation.x=-s*0.6*mv+legBase*(1-0.4*AI.crouchK);
  // a leg's foot moves forward while cos(phase) is negative for the left leg (positive for the right): lift it then, plant it on the back-swing
  const lLift=Math.max(0,-c)*0.1*mv,rLift=Math.max(0,c)*0.1*mv;
  C.leftLeg.leg.position.y=H+lLift;C.rightLeg.leg.position.y=H+rLift;
  // keep the soles flat on the ground through the stride, with a little toe-up as the foot swings through
  C.leftLeg.foot.rotation.x=-s*0.6*mv*0.8-lLift*1.6;C.rightLeg.foot.rotation.x=s*0.6*mv*0.8-rLift*1.6;
  C.bodyPivot.position.y=Math.abs(s)*0.05*mv+Math.sin(time*2.6)*0.012*(1-mv);
  if(AI.seatObj){const kk=Math.sin(SWING.ph)*0.35;C.leftLeg.leg.rotation.x+=kk;C.rightLeg.leg.rotation.x+=kk;}
  if(AI.swimK>0.3){C.leftLeg.leg.rotation.x=-0.25+Math.sin(time*9)*0.4;C.rightLeg.leg.rotation.x=-0.25-Math.sin(time*9)*0.4;}
  C.bodyPivot.rotation.z=s*0.04*mv;
  if(acting&&AI.act==='dance'&&AI.sitK<0.1){const b=time*5.2,sw=Math.sin(b);
    C.leftLeg.leg.rotation.x=sw>0?-0.5*sw:0.04;C.rightLeg.leg.rotation.x=sw<0?0.5*sw:0.04;
    C.leftLeg.foot.rotation.x=sw>0?0.35*sw:0;C.rightLeg.foot.rotation.x=sw<0?-0.35*sw:0;
    C.bodyPivot.position.y+=Math.abs(Math.cos(b))*0.08;C.bodyPivot.rotation.z=Math.sin(b*0.5)*0.12;}

  let lean=0.05*mv-AI.pitch*0.5+0.35*AI.crouchK,lX=-s*0.45*mv,rX=s*0.45*mv,lZ=0,rZ=0,scan=null;
  if(AI.sitK>0.5){lX=-0.55;rX=-0.55;lean=0.06;}
  let leftBusy=false;
  if(acting){
    switch(AI.act){
      case 'wave':rZ=2.3+Math.sin(time*7.5)*0.32;break;
      case 'dance':{const b=time*5.2,m=Math.floor(AI.actT/6)%3;
        if(m===0){lZ=-2.2-Math.sin(b)*0.3;rZ=2.2+Math.sin(b)*0.3;lX=-0.2;rX=-0.2;}          // hands up, swaying
        else if(m===1){lZ=-1.0-Math.sin(b*0.5)*0.4;rZ=1.0-Math.sin(b*0.5)*0.4;lX=-0.4;rX=-0.4;}   // arms out, side to side
        else{rZ=2.3+Math.max(0,Math.sin(b))*0.4;lZ=-0.5;lX=-0.9+Math.sin(b)*0.3;}           // one arm pumping
        lean=-0.04;break;}
      case 'chop':{const q=((AI.actT-1.0)%0.9+0.9)%0.9/0.9,up=AI.actT<0.6?lerp(-0.4,-0.9,AI.actT/0.6):q<0.15?-0.9:q<0.75?lerp(-0.9,-2.9,smooth(0,1,(q-0.15)/0.6)):lerp(-2.9,-0.9,(q-0.75)/0.25);
        rX=up;lX=up;rZ=-0.12;lZ=0.12;lean=0.1+(q>0.75?0.12:0);leftBusy=true;break;}
      case 'throw':rX=AI.mAct&&AI.mAct.t>0.3?2.3:-1.4;break;
      case 'collect':rX=-1.25+Math.sin(time*3)*0.25;lX=-1.25+Math.sin(time*3+1)*0.25;leftBusy=true;break;
      case 'build':{const q=(AI.actT%0.55)/0.55;rX=q<0.6?lerp(-0.8,-2.3,smooth(0,1,q/0.6)):lerp(-2.3,-0.8,(q-0.6)/0.4);lX=-0.75;lean=0.15;break;}
      case 'swim':{const S=AI.swim;if(S&&(S.phase==='prep'||S.phase==='dive')){const k=S.phase==='prep'?smooth(0.3,1.2,S.t):1;rX=lX=lerp(-0.3,-2.95,k);rZ=-0.12;lZ=0.12;lean=S.phase==='prep'?0.28*k:0;leftBusy=true;break;}
        const s1=Math.sin(time*5);rX=-1.7+s1*0.55;lX=-1.7-s1*0.55;rZ=0.25;lZ=-0.25;lean=0.35*AI.swimK;leftBusy=true;break;}
      case 'swing':lX=-0.55;rX=-0.55;lZ=-0.25;rZ=0.25;leftBusy=true;break;
      case 'warm':lX=-1.3;rX=-1.3;lZ=0.15;rZ=-0.15;lean=0.12;break;
      case 'cook':rX=-1.0+Math.sin(time*4)*0.25;lX=-0.7;lean=0.08;break;
      case 'hug':rX=-1.25;lX=-1.25;rZ=-0.55;lZ=0.55;lean=-0.04;leftBusy=true;break;
      case 'inspect':lean=0.14;lX=-0.35;rX=-0.35;break;
      case 'bow':lean=0.45*Math.max(0,Math.sin(Math.min(AI.actT*1.1,Math.PI)));lX=-0.2;rX=-0.2;break;
      case 'water':if(AI.actT<1.3){rX=-1.3+Math.sin(time*6)*0.06;}else{rX=-1.0+Math.sin(time*2)*0.08;rZ=0.12;lean=0.08;}break;
      case 'feed':lX=-1.05+Math.sin(time*3)*0.1;rX=-1.05-Math.sin(time*3)*0.1;leftBusy=true;break;
      case 'pet':rX=-1.2+Math.sin(time*4.5)*0.28;lX=-0.4;break;
      case 'sweep':{const sw=Math.sin(time*4.2);rX=-0.62+sw*0.08;lX=-0.85+sw*0.08;rZ=-0.05+sw*0.28;lZ=0.18+sw*0.28;lean=0.16;leftBusy=true;break;}
      case 'chat':rZ=0.45+Math.max(0,Math.sin(time*2.6))*0.55;rX=-0.55+Math.sin(time*3.1)*0.2;lX=-0.25;break;
      case 'weed':rX=-1.1+Math.sin(time*5)*0.35;lX=-0.9+Math.sin(time*5+1.2)*0.2;leftBusy=true;break;
      case 'pests':lean=0.22;rX=-0.75-Math.max(0,Math.sin(time*3))*0.45;lX=-0.4;scan=Math.sin(time*1.3)*0.6;break;
      case 'harvest':rX=-1.25+Math.sin(time*3)*0.3;lX=-0.55;leftBusy=true;break;
      case 'prep':rX=-1.15+Math.sin(time*4.5)*0.4;lX=-1.15+Math.sin(time*4.5+1.5)*0.4;leftBusy=true;break;
      case 'mulch':lean=0.18;rX=-0.85;rZ=0.35+Math.sin(time*3)*0.4;break;
      case 'deadhead':lean=0.25;rX=-0.95+Math.sin(time*6)*0.08;lX=-0.6;leftBusy=true;break;
      case 'plant':rX=-1.3+Math.abs(Math.sin(time*3))*0.3;lX=-0.5;leftBusy=true;break;
      case 'fetch':{const F=BRAIN.fetch;if(F){
        if(F.phase==='windup')rX=lerp(-0.5,2.5,smooth(0,0.45,F.t));
        else if(F.phase==='wait'&&F.t<0.4)rX=-1.5;
        else if(F.phase==='wait'&&DOG.state==='return'){lZ=-2.4-Math.sin(time*8)*0.2;rZ=2.4+Math.sin(time*8)*0.2;}
        else rX=-0.6;}break;}
      case 'sell':if(AI.actT<1.7){lX=-1.15;rX=-1.15;lean=0.08;}else{rZ=2.2+Math.sin(time*7)*0.3;lX=-0.3;}leftBusy=true;break;
      case 'gate':if(AI.target&&AI.target.mode==='bed'&&AI.gateDone){lX=-1.0+Math.sin(time*5)*0.35;rX=-0.5;lean=0.1;}
        else{rX=AI.actT<1.2?-1.25+Math.sin(time*6)*0.08:-0.9;lX=-0.3;lean=0.1;}leftBusy=AI.target&&AI.target.mode==='bed';break;
      case 'fish':{const P=FISH.phase,t=FISH.t;lX=-0.5;
        if(P==='windup')rX=lerp(-1.1,-2.5,smooth(0,0.45,t));
        else if(P==='fly')rX=lerp(-2.5,-1.25,smooth(0,0.15,t));
        else if(P==='wait')rX=-1.15+Math.sin(time*1.3)*0.04;
        else if(P==='bite')rX=-1.15+Math.sin(t*22)*0.07;
        else if(P==='reel'){rX=lerp(-1.15,-0.6,smooth(0,0.5,t));lX=-1.15+Math.sin(time*14)*0.15;lean=-0.06;}
        else if(P==='show'){rX=-0.55;lX=-0.45;lean=-0.04;}
        else if(P==='miss')rX=-0.8;
        else rX=-1.1;
        leftBusy=true;break;}
    }
  }
  if(AI.state==='skylook'){rZ=2.3+Math.sin(time*7.5)*0.3;}
  if(AI.stretchT>0){lZ=-2.7;rZ=2.7;lean=-0.08;}
  // rain: out comes the umbrella unless she is under the porch roof or her left hand is busy
  const wantUmb=WEATHER.rainK>0.35&&!AI.inside&&!(AI.swimK>0)&&!isOnHouseStepsOrPorch(AI.x,AI.z)&&!leftBusy&&AI.sitK<0.5;
  AI.umbrellaK=lerp(AI.umbrellaK,wantUmb?1:0,Math.min(1,dt*4));
  PROPS.umbrella.visible=AI.umbrellaK>0.5;
  if(PROPS.umbrella.visible){lX=-0.9;lZ=0.25;PROPS.umbrella.rotation.set(0.9,0,-0.25);}
  PROPS.basket.visible=acting&&(AI.act==='harvest'||(AI.act==='sell'&&AI.actT<1.7));
  PROPS.trowel.visible=acting&&(AI.act==='weed'||AI.act==='prep'||AI.act==='plant');
  PROPS.axe.visible=acting&&AI.act==='chop';PROPS.broom.visible=acting&&AI.act==='sweep';PROPS.hammer.visible=acting&&AI.act==='build';
  C.can.visible=acting&&AI.act==='water'&&AI.actT>1.2;
  FISH.rod.visible=acting&&AI.act==='fish';

  // gaze: what has her attention
  let g=null;
  if(STILL.on)g=camera.position;
  else if(AI.state==='skylook'&&AI.skyObj)g=AI.skyObj.position;
  else if(acting){
    if(AI.act==='fetch')g=(BALL.state==='flying'||BALL.state==='ground')?BALL.mesh.position:DOG.root.position;
    else if(AI.act==='fish'&&FISH.phase!=='ready')g=FISH.look;
    else if(AI.act==='gate'){let bd=9;for(const d of DOGS){const k=Math.hypot(d.x-AI.x,d.z-AI.z);if(k<bd){bd=k;g=d.root.position;}}if(!g)g=_lookPt.set(-26.6,AI.y+0.8,31.2);}
    else if(AI.act==='chat'&&!LM.inside)g=_lookPt.set(LM.x,LM.y+1.5,LM.z);
    else if(AI.act==='chase'){let bd=12;for(const d of DOGS){const k=Math.hypot(d.x-AI.x,d.z-AI.z);if(k<bd){bd=k;g=d.root.position;}}}
    else if(AI.target&&AI.target.ent)g=AI.target.ent.root.position;
    else if(AI.act==='sitView'&&night)g=_skyPt.set(AI.x+Math.sin(AI.yaw)*10,AI.y+12,AI.z+Math.cos(AI.yaw)*10);
    else if(AI.target&&AI.target.bed)g=_lookPt.set(AI.target.look[0],AI.target.bed.y+0.3,AI.target.look[1]);
    else if(AI.target&&AI.target.look)g=_lookPt.set(AI.target.look[0],AI.y+1.3,AI.target.look[1]);
  }else if(AI.state==='walk'&&!AI.inside){
    let bd=4;for(const e of ALL_ANIMALS){const dx=e.x-AI.x,dz=e.z-AI.z,d=Math.hypot(dx,dz);
      if(d<bd&&Math.abs(normalizeAngle(Math.atan2(dx,dz)-AI.yaw))<1.4){bd=d;g=e.root.position;}}
  }
  let hy,hp=0,hz=0;
  if(g){const dx=g.x-AI.x,dz=g.z-AI.z,hd=Math.hypot(dx,dz);
    hy=clamp(normalizeAngle(Math.atan2(dx,dz)-AI.yaw),-1.1,1.1);
    hp=clamp(-Math.atan2(g.y-(AI.y+1.55),Math.max(hd,0.3))*0.85,-0.85,0.55);}
  else hy=Math.sin(time*0.7)*(AI.state==='idle'?0.3:0.08);
  if(scan!==null)hy=scan;
  if(acting&&(AI.act==='inspect'||AI.act==='feed'||GARDEN_ACTS.has(AI.act)))hp=Math.max(hp,0.2);
  if(acting&&AI.act==='bow')hp=0.25;
  if(acting&&AI.act==='sit'&&night){hp=0.35;hz=0.12;}
  if(AI.state==='think'){hz=0.16;hy=0.2;}
  C.bodyPivot.rotation.x=lerp(C.bodyPivot.rotation.x,lean,Math.min(1,dt*8));
  C.headGroup.rotation.y=lerp(C.headGroup.rotation.y,hy,Math.min(1,dt*6));
  C.headGroup.rotation.x=lerp(C.headGroup.rotation.x,hp,Math.min(1,dt*6));
  C.headGroup.rotation.z=lerp(C.headGroup.rotation.z,hz,Math.min(1,dt*5));
  const k=Math.min(1,dt*10);
  C.leftArm.rotation.x=lerp(C.leftArm.rotation.x,lX,k);C.rightArm.rotation.x=lerp(C.rightArm.rotation.x,rX,k);
  C.leftArm.rotation.z=lerp(C.leftArm.rotation.z,lZ,k);C.rightArm.rotation.z=lerp(C.rightArm.rotation.z,rZ,k);
  C.can.rotation.x=1.0+(acting&&AI.act==='water'&&AI.actT>1.3?0.55:0);
}

// water drops from the can
const DROPS=new T.InstancedMesh(new T.SphereGeometry(0.03,6,4),new T.MeshStandardMaterial({color:'#8fd6ff',transparent:true,opacity:0.8,roughness:0.2}),18);
DROPS.frustumCulled=false;DROPS.count=0;DROPS.userData.noWx=true;scene.add(DROPS);
const _dm=new T.Matrix4(),_dq=new T.Quaternion(),_ds=new T.Vector3(),_dp=new T.Vector3();
function updateDrops(time){
  const on=AI.state==='act'&&AI.act==='water'&&AI.actT>1.5;
  DROPS.count=on?18:0;if(!on)return;
  caretaker.can.spout.getWorldPosition(_wp);const fx=Math.sin(AI.yaw),fz=Math.cos(AI.yaw);
  for(let i=0;i<18;i++){const ph=(time*1.6+i/18)%1;
    _dp.set(_wp.x+fx*ph*0.55+Math.sin(i*7.1)*0.04,_wp.y-ph*ph*1.25,_wp.z+fz*ph*0.55+Math.cos(i*5.3)*0.04);
    _ds.setScalar(0.6+0.6*(1-ph));_dm.compose(_dp,_dq,_ds);DROPS.setMatrixAt(i,_dm);}
  DROPS.instanceMatrix.needsUpdate=true;
}

function updateCaretakerAI(dt,time){
  simTime=time;const night=nightK>0.55;
  for(const k in NEEDS){let r=RATES[k];if(k==='energy'&&night)r*=4;NEEDS[k]=Math.min(1,NEEDS[k]+r*dt);}

  if(!AI.eyesClosed){AI.blinkTimer-=dt;
    if(AI.blinkTimer<=0){if(!AI.isBlinking){AI.isBlinking=true;caretaker.faceObj.drawFace(true);AI.blinkTimer=0.13;}
      else{AI.isBlinking=false;caretaker.faceObj.drawFace(false);AI.blinkTimer=rnd(2.2,5.2);}}}

  if(AI.inside){insideUpdate(dt,time);return;}
  // Pause: she stays put and faces the camera, even if the stick is on
  if(STILL.on){if(AI.state==='act')endAct();else if(AI.state==='walk')abortTask();if(AI.state==='skylook'){AI.skyObj=null;}
    AI.state='idle';AI.timer=1;AI.stretchT=0;AI.mAct=null;AI.speed=lerp(AI.speed,0,Math.min(1,dt*10));
    AI.yaw+=normalizeAngle(Math.atan2(camera.position.x-AI.x,camera.position.z-AI.z)-AI.yaw)*Math.min(1,dt*3);
    poseLuna(dt,time);return;}
  if(CTRL.on&&!FOLLOW_MOON&&!FOLLOW_SOLON){ctrlUpdate(dt,time);return;}
  lunaReplan(dt);
  // sky traffic catches her eye: stop, look up and wave
  AI.skyCheck-=dt;
  if(AI.skyCheck<=0){AI.skyCheck=0.4;
    if(time-AI.lastSky>45&&canInterrupt()){
      for(const v of[PLANE.root,BALLOON.root]){if(!v.visible)continue;
        const hd=Math.hypot(v.position.x-AI.x,v.position.z-AI.z);
        if(hd<(v===PLANE.root?55:28)){AI.saved={state:AI.state,timer:AI.timer};AI.state='skylook';AI.skyT=3.4;AI.skyObj=v;AI.lastSky=time;
          emote(caretaker.headGroup,'!',0.85,1.4,0.55);break;}}}}

  switch(AI.state){
    case 'idle':
      AI.speed=lerp(AI.speed,0,Math.min(1,dt*10));AI.timer-=dt;AI.microT-=dt;
      if(AI.microT<=0){AI.microT=rnd(14,26);if(!night&&WEATHER.rainK<0.3)AI.stretchT=1.4;}
      if(AI.timer<=0){AI.state='think';AI.timer=0.7;}
      break;
    case 'think':
      AI.speed=lerp(AI.speed,0,Math.min(1,dt*10));AI.timer-=dt;
      if(AI.timer<=0){const c=chooseTask();if(c)startTask(c);else{AI.state='idle';AI.timer=2;}}
      break;
    case 'walk':walkUpdate(dt);break;
    case 'act':actUpdate(dt);break;
    case 'skylook':
      AI.speed=lerp(AI.speed,0,Math.min(1,dt*8));AI.skyT-=dt;
      if(AI.saved.state!=='act'){const ty=Math.atan2(AI.skyObj.position.x-AI.x,AI.skyObj.position.z-AI.z);AI.yaw+=normalizeAngle(ty-AI.yaw)*Math.min(1,dt*2.5);}
      if(AI.skyT<=0){AI.state=AI.saved.state;AI.timer=AI.saved.timer;AI.skyObj=null;AI.stuckT=0;AI.checkX=AI.x;AI.checkZ=AI.z;}
      break;
  }
  AI.stretchT=Math.max(0,AI.stretchT-dt);if(AI.state!=='idle')AI.stretchT=0;
  poseLuna(dt,time);
}

/* what Luna is up to, in words (title card + auto-cam chip) */
const ACT_WORDS={wave:'waving hello',inspect:'checking the pet bed',bow:'visiting the shrine',feed:'filling the food bowls'};
const POI_WORDS={isle:'the view from the little island',zen:'the zen garden',waterfall:'the waterfall',torii:'the torii gate'};
function lunaStatus(){
  if(CTRL.on&&!FOLLOW_SOLON&&!FOLLOW_MOON)return ctrlStatus();
  if(STILL.on&&!(AI.inside&&INSIDE.ent.state==='act'))return 'Luna is holding still for you';
  if(AI.inside)return insideStatus();
  const tg=AI.target,tk=AI.task,night=nightK>0.55;
  if(AI.state==='skylook')return AI.skyObj===SPACE_LAUNCH.focus?'Luna is watching the rocket launch':'Luna is waving at the '+(AI.skyObj===PLANE.root?'banner plane':'hot air balloon');
  if(AI.state==='idle'||AI.state==='think')return 'Luna is deciding what to do next';
  if(AI.state==='walk'){if(tg&&tg.bed)return 'Luna is off to the garden';return 'Luna is heading '+(TASK_NAMES[tk&&tk.id]||'out');}
  if(tg&&tg.decorLabel)return 'Luna is '+tg.decorLabel;
  if(tg&&tg.label)return 'Luna is '+tg.label.charAt(0).toLowerCase()+tg.label.slice(1);
  switch(AI.act){
    case 'pet':return 'Luna is cuddling '+(tg&&tg.ent?tg.ent.name:'a friend');
    case 'sit':return night?'Luna is napping on the veranda':'Luna is resting on the veranda';
    case 'dance':return 'Luna is dancing with Lady Moon to '+RADIO.label();
    case 'sitView':return night?'Luna is stargazing on the pier':'Luna is watching the ocean from the pier';
    case 'look':return 'Luna is taking in '+(POI_WORDS[tk&&tk.id]||'the view');
    case 'fetch':return 'Luna is playing fetch with '+DOG.name;
    case 'sell':return AI.sold>0?'Luna sold her basket for '+AI.sold+' coins!':'Luna is selling her harvest at the Seaside Market';
    case 'gate':return tg&&tg.mode==='bed'?'Luna is tucking Kiko and Bruno in for the night':'Luna is letting '+((tg&&tg.dogs)||DOGS).map(d=>d.name).join(' and ')+' out of the dog yard';
    case 'swim':return AI.swim&&AI.swim.phase==='prep'?'Luna is getting ready to dive in':AI.swim&&AI.swim.phase==='dive'?'Luna dives into the pond!':'Luna is swimming in the pond';
    case 'sweep':return 'Luna is sweeping '+((tg&&tg.mess&&tg.mess.label)||'up');
    case 'chase':return 'Luna is playing chase with '+((tg&&tg.dog&&tg.dog.name)||'the pups');
    case 'chat':return 'Luna is chatting with Lady Moon';
    case 'build':return 'Luna is building the '+((AI.target&&AI.target.rec&&DECOR_BY_ID[AI.target.rec.id].name)||'project').toLowerCase();
    case 'collect':return 'Luna is gathering up the wood';
    case 'chop':return AI.target&&AI.target.felled?'Luna is stacking the wood':'Luna is chopping down the '+((AI.target&&AI.target.tree&&AI.target.tree.kind)||'tree').toLowerCase();
    case 'swing':return 'Luna is on the swing'+(AI.swingDog&&AI.swingDog.state==='onSwing'?' with '+AI.swingDog.name:'');
    case 'fish':{const F=FISH,where=F.spot&&F.spot.water==='ocean'?'off the pier':'at the pond';
      if(F.phase==='show')return 'Luna caught a '+F.last+'!'+(PRICES[F.last]?' <small>worth '+PRICES[F.last]+' coins</small>':' <small>'+F.caught+' fish today</small>');
      if(F.phase==='stow')return 'Luna keeps the '+F.last+' to sell at the market';
      if(F.phase==='bite')return 'Luna has a bite!';
      if(F.phase==='reel')return 'Luna is reeling one in';
      if(F.phase==='miss')return 'It got away! Luna is trying again';
      if(F.phase==='release')return 'Luna lets the '+F.last+' swim free';
      return 'Luna is fishing '+where;}
  }
  return 'Luna is '+(ACT_WORDS[AI.act]||'busy');
}

function updateWildlifeAndVehicles(dt,time){
  ISLAND.update(dt);
  updateLadyMoon(dt,time);
  updateSolon(dt,time);
  for(const e of PETS)updatePet(e,dt,time);
  for(const d of DOGS)if(!d.inside)updateDog(d,dt,time);
  SWING.update(dt);updateChops(dt);resolveCollisions();
  MARKET.update(dt,time);updateDecor(dt,time);
  GATE.update(dt);
  updateFishing(dt,time);
  updateBall(dt,time);updateDrops(time);
  updateKoi(dt,time);updateGulls(dt,time);updateSmallLife(dt,time);
  updatePlane(dt,time);updateBalloon(dt,time);
  updateGarden(dt,time);
  for(const f of DECOR_UPDATERS)f(dt,time);
  if(LEAVES)LEAVES.update(dt,time);
  updateEmotes(dt);
}

/* ---------------- water ---------------- */
const waterVS=`
varying vec3 vW; varying vec2 vUv;
#include <fog_pars_vertex>
void main(){
  vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz;
  vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
}`;
const noiseGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}
`;
const waterFS=`
uniform float uTime; uniform float uMode; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uSky;
uniform vec3 uShallow; uniform vec3 uDeep; uniform float uNight; uniform float uRain;
varying vec3 vW; varying vec2 vUv;
#include <fog_pars_fragment>
${noiseGLSL}
float edgeR(float a){return 55.0+5.0*sin(3.0*a+1.0)+3.0*sin(5.0*a+2.0)+2.0*sin(9.0*a+0.5);}
float isle2E(float a){return 14.5+1.8*sin(3.0*a+0.7)+1.1*sin(5.0*a+2.1)+0.6*sin(8.0*a);}
// layered swell: four directional waves plus two octaves of noise chop
float waves(vec2 p,float t,float chop){
  float h=sin(dot(p,vec2(0.8,0.6))*0.9+t*1.1)*0.5;
  h+=sin(dot(p,vec2(-0.5,0.85))*1.45+t*1.45)*0.32;
  h+=sin(dot(p,vec2(0.95,-0.3))*2.3+t*1.9)*0.18*chop;
  h+=sin(dot(p,vec2(-0.25,-0.97))*3.6+t*2.6)*0.1*chop;
  h+=(noise(p*1.7+vec2(t*0.35,-t*0.2))-0.5)*0.35*chop+(noise(p*4.6-t*0.55)-0.5)*0.14*chop;
  return h;
}
// expanding raindrop rings
float ripple(vec2 p,float t){
  vec2 cell=floor(p),f=fract(p)-0.5;float h=0.0;
  for(int i=0;i<2;i++){float fi=float(i);vec2 o=vec2(hash(cell+fi*3.7),hash(cell+fi*7.1+1.3))-0.5;
    float ph=fract(t*0.9+hash(cell+fi*5.3));float d=length(f-o*0.7);
    h+=sin(d*34.0-ph*14.0)*exp(-d*6.0)*(1.0-ph)*smoothstep(0.0,0.1,ph);}
  return h;
}
void main(){
  vec2 p=vW.xz; float depth=0.0; float foam=0.0; float camD=length(cameraPosition-vW);
  vec2 q;
  if(uMode<0.5){
    float r=length(p); float a=atan(p.y,p.x); vec2 p2=p-vec2(93.0,2.5); float d=min(max(r-edgeR(a),0.0),max(length(p2)-isle2E(atan(p2.y,p2.x)),0.0));
    depth=smoothstep(0.0,48.0,d);
    float f1=noise(p*0.5+vec2(uTime*0.35,uTime*0.2));
    float shore=exp(-d*0.33);
    foam=smoothstep(0.5,0.8,shore+(f1-0.5)*0.55);
    foam+=smoothstep(0.72,0.95,sin(d*1.3-uTime*1.5)*0.5+0.5)*exp(-d*0.18)*f1*0.9;
    q=p*0.16;
  } else if(uMode<1.5){
    float dd=length(vUv-0.5)*2.0; depth=smoothstep(0.05,0.85,1.0-dd);
    foam=smoothstep(0.8,1.0,dd)*0.55*noise(p*1.4+uTime*0.4);
    q=p*0.6;
  } else {
    float dd=abs(vUv.x-0.5)*2.0; depth=(1.0-dd)*0.55;
    foam=smoothstep(0.78,1.0,dd)*0.5*noise(p*1.5+uTime);
    foam+=smoothstep(0.7,1.0,noise(vec2(vUv.x*6.0,vUv.y*40.0-uTime*3.0)))*0.35;
    q=vec2(vUv.x*3.0,vUv.y*24.0-uTime*2.5);
  }
  float t=uTime*(uMode<0.5?0.55:1.0),chop=1.0+uRain*0.9,detail=mix(1.0,0.3,smoothstep(30.0,320.0,camD)),e=0.05;
  float h0=waves(q,t,chop),hx=waves(q+vec2(e,0.0),t,chop),hz=waves(q+vec2(0.0,e),t,chop);
  vec2 g=vec2(h0-hx,h0-hz)/e*0.12*detail;
  if(uRain>0.01){vec2 rq=p*1.6;float r0=ripple(rq,uTime),rx=ripple(rq+vec2(0.02,0.0),uTime),rz=ripple(rq+vec2(0.0,0.02),uTime);
    g+=vec2(r0-rx,r0-rz)/0.02*0.004*uRain*smoothstep(70.0,8.0,camD);}
  vec3 n=normalize(vec3(g.x,1.0,g.y));
  vec3 V=normalize(cameraPosition-vW); vec3 L=normalize(uSun);
  float fres=0.04+0.96*pow(1.0-max(dot(n,V),0.0),5.0);
  vec3 base=mix(uShallow,uDeep,depth);
  vec3 col=base*(0.62+0.38*max(dot(n,L),0.0))*mix(vec3(1.0),uSunCol,0.25);
  col=mix(col,uSky*mix(0.85,1.15,n.y),clamp(fres*1.1,0.0,0.75));
  vec3 H=normalize(L+V); float nh=max(dot(n,H),0.0);
  float spec=pow(nh,220.0)*2.2+step(0.93,noise(p*3.0+t*2.0))*pow(nh,40.0)*1.5;
  col+=uSunCol*spec*(1.0-uNight*0.6)*(1.0-uRain*0.7);
  if(uMode<0.5)col+=vec3(smoothstep(0.55,0.95,h0*0.5+0.5)*smoothstep(10.0,200.0,camD)*0.1*chop);
  col=mix(col,vec3(0.93,0.96,1.0)*mix(1.0,0.4,uNight),clamp(foam,0.0,1.0));
  col=mix(col,col*0.75+vec3(0.05,0.06,0.07),uRain*0.4);
  gl_FragColor=vec4(col,uMode<0.5?1.0:0.74+0.12*foam);
  #include <fog_fragment>
}`;

const WATER_MATS=[];
function waterMat(mode,shallow,deep){
  const m=new T.ShaderMaterial({uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{
    uTime:{value:0},uMode:{value:mode},uSun:{value:new T.Vector3(0,1,0)},uSunCol:{value:new T.Color()},uSky:{value:new T.Color()},
    uShallow:{value:new T.Color()},uDeep:{value:new T.Color()},uNight:{value:0},uRain:{value:0}}]),vertexShader:waterVS,fragmentShader:waterFS,fog:true});
  m.userData={shallow,deep};WATER_MATS.push(m);return m;
}
const ocean=new T.Mesh(new T.PlaneGeometry(3000,3000),waterMat(0,['#3fb9b6','#1c4d66'],['#10457a','#061430']));
ocean.rotation.x=-Math.PI/2;ocean.receiveShadow=false;scene.add(ocean);
const pondMat=waterMat(1,['#5cc2ad','#1d4d5a'],['#1b6a8a','#08223a']);
const streamMat=waterMat(2,['#5cc2ad','#1d4d5a'],['#1b6a8a','#08223a']);
pondMat.transparent=true;streamMat.transparent=true;
for(const P of[PA,PB]){const m=new T.Mesh(new T.CircleGeometry(P.r+0.8,48),pondMat);m.rotation.x=-Math.PI/2;m.position.set(P.x,WATER,P.z);scene.add(m);}
{const j=new T.Mesh(new T.CircleGeometry(SR+0.8,24),pondMat);j.rotation.x=-Math.PI/2;j.position.set(SM.x,WATER-0.01,SM.z);scene.add(j);}
function strip(ax,az,bx,bz,w,y){const len=Math.hypot(bx-ax,bz-az);const g=new T.PlaneGeometry(w,len);g.rotateX(-Math.PI/2);
  const m=new T.Mesh(g,streamMat);m.position.set((ax+bx)/2,y,(az+bz)/2);m.rotation.y=Math.atan2(bx-ax,bz-az);scene.add(m);}
strip(PA.x,PA.z,SM.x,SM.z,2*(SR+0.8),WATER-0.02);strip(SM.x,SM.z,PB.x,PB.z,2*(SR+0.8),WATER-0.02);
strip(WF.x,-34,WF.x,WF.zTop+0.3,4.2,WF.yTop-0.3);

// waterfall sheet
const wfMat=new T.ShaderMaterial({uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{uTime:{value:0},uNight:{value:0}}]),
  vertexShader:waterVS,
  fragmentShader:`uniform float uTime; uniform float uNight; varying vec3 vW; varying vec2 vUv;
  #include <fog_pars_fragment>
  ${noiseGLSL}
  void main(){
    float s=noise(vec2(vUv.x*14.0,vUv.y*6.0+uTime*3.2)); float s2=noise(vec2(vUv.x*34.0,vUv.y*12.0+uTime*5.0));
    float streak=smoothstep(0.42,0.9,s*0.6+s2*0.5);
    vec3 c=mix(vec3(0.33,0.62,0.86),vec3(0.95,0.98,1.0),streak);
    c=mix(c,vec3(1.0),smoothstep(0.22,0.0,vUv.y)*0.75+smoothstep(0.9,1.0,vUv.y)*0.3);
    c*=mix(1.0,0.38,uNight);
    float edge=smoothstep(0.0,0.14,vUv.x)*smoothstep(1.0,0.86,vUv.x);
    gl_FragColor=vec4(c,0.9*edge);
    #include <fog_fragment>
  }`,fog:true,transparent:true,depthWrite:false,side:T.DoubleSide});
{const g=new T.PlaneGeometry(1,1,6,20),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const u=p.getX(i)+0.5,v=p.getY(i)+0.5;
   p.setXYZ(i,WF.x+(u-0.5)*4.2*(1+0.35*(1-v)),WATER+0.05+(WF.yTop-0.2-WATER)*v,WF.zTop+(WF.zBot-WF.zTop)*Math.sqrt(1-v)+0.4);}
 const m=new T.Mesh(g,wfMat);m.frustumCulled=false;scene.add(m);}
const foamPuffs=new T.InstancedMesh(geo.ico,new T.MeshStandardMaterial({color:0xf4fbff,roughness:1,flatShading:true,emissive:0x223344,emissiveIntensity:0.3}),22);
foamPuffs.frustumCulled=false;scene.add(foamPuffs);
const puffSeeds=[...Array(22)].map(()=>[R(-2.6,2.6),R(-1.6,1.6),R(0,6.28),R(0.8,1.6)]);

/* ---------------- sky, stars, backdrop ---------------- */
const skyMat=new T.ShaderMaterial({uniforms:{uTop:{value:new T.Color()},uHor:{value:new T.Color()},uSunCol:{value:new T.Color()},uSunDir:{value:new T.Vector3()},uNight:{value:0},uFlash:{value:0}},
  vertexShader:`varying vec3 vDir; void main(){vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSunCol; uniform vec3 uSunDir; uniform float uNight; uniform float uFlash; varying vec3 vDir;
  void main(){ float h=clamp(vDir.y,-0.2,1.0); vec3 c=mix(uHor,uTop,pow(smoothstep(-0.02,0.65,h),0.75));
    float s=max(dot(normalize(vDir),normalize(uSunDir)),0.0);
    c+=uSunCol*(pow(s,6.0)*0.35*(1.0-uNight*0.8)+pow(s,900.0)*2.0);
    c+=vec3(0.45,0.5,0.68)*uFlash;
    gl_FragColor=vec4(c,1.0);} `,side:T.BackSide,depthWrite:false,fog:false});
const sky=new T.Mesh(new T.SphereGeometry(1600,32,16),skyMat);scene.add(sky);
const sunMesh=new T.Mesh(new T.SphereGeometry(55,24,24),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,fog:false}));sunMesh.raycast=()=>{};scene.add(sunMesh);
const moonMesh=new T.Mesh(new T.SphereGeometry(45,24,24),new T.MeshBasicMaterial({color:'#e4ebff',transparent:true,fog:false}));moonMesh.raycast=()=>{};scene.add(moonMesh);
const starGeo=new T.BufferGeometry(),sp=[];
for(let i=0;i<1400;i++){const a=R(0,6.28),y=R(0.06,1),r=Math.sqrt(1-y*y);sp.push(Math.cos(a)*r*1450,y*1450,Math.sin(a)*r*1450);}
starGeo.setAttribute('position',new T.Float32BufferAttribute(sp,3));
const starMat=new T.PointsMaterial({color:0xffffff,size:1.7,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false});
scene.add(new T.Points(starGeo,starMat));
function ring(Rad,hMin,hMax,col,seed,snow=false){
  const segs=360,top=[],mid=[],pos=[],cols=[],c0=new T.Color(col),c1=c0.clone().lerp(new T.Color('#e4e9ef'),0.22);
  const sColor=new T.Color('#f4f7fb');
  for(let i=0;i<segs;i++){const a=i/segs*Math.PI*2;
    const k=0.45*Math.pow(Math.abs(Math.sin(a*2.3+seed)),1.5)+0.25*Math.pow(Math.abs(Math.sin(a*7.1+seed*2.1)),1.8)+0.15*Math.abs(Math.cos(a*13.7+seed*3.3))+0.1*Math.abs(Math.sin(a*29+seed*4.2));
    top.push(hMin+(hMax-hMin)*k);mid.push(R(0.35,0.6));}
  top.push(top[0]);mid.push(mid[0]);
  const V=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
  const quad=(p0,p1,p2,p3,c0,c1,c2,c3)=>{pos.push(...p0,...p1,...p2,...p0,...p2,...p3);cols.push(...c0,...c1,...c2,...c0,...c2,...c3);};
  const getC=(y)=>{if(!snow||y<hMax*0.5)return [c0.r,c0.g,c0.b];const sk=clamp((y-hMax*0.5)/(hMax*0.4),0,1);const hc=c0.clone().lerp(sColor,sk);return [hc.r,hc.g,hc.b];};
  const cb=[c0.r*0.8,c0.g*0.8,c0.b*0.8];
  for(let i=0;i<segs;i++){const a0=i/segs*Math.PI*2,a1=(i+1)/segs*Math.PI*2;
    const b0=V(a0,Rad,-4),b1=V(a1,Rad,-4),m0=V(a0,Rad*0.985,top[i]*mid[i]),m1=V(a1,Rad*0.985,top[i+1]*mid[i+1]),t0=V(a0,Rad*0.97,top[i]),t1=V(a1,Rad*0.97,top[i+1]);
    quad(b0,b1,m1,m0,cb,cb,getC(top[i+1]*mid[i+1]),getC(top[i]*mid[i]));
    quad(m0,m1,t1,t0,getC(top[i]*mid[i]),getC(top[i+1]*mid[i+1]),getC(top[i+1]),getC(top[i]));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();
  const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,side:T.DoubleSide}));scene.add(m);
}
ring(340,10,75,'#3f6150',1.2);ring(490,24,130,'#5b7682',2.7);ring(670,40,210,'#7f91a6',4.1);ring(880,60,340,'#a3aec0',5.3,true);

/* ---------------- soft billboard clouds (one draw call) ---------------- */
const CLOUD_TEX=canvasTex(512,512,c=>{
  const r=mulberry32(77);
  for(let q=0;q<4;q++){const ox=(q%2)*256,oy=(q>>1)*256;
    c.save();c.beginPath();c.rect(ox,oy,256,256);c.clip();
    const n=11+Math.floor(r()*6);
    for(let i=0;i<n;i++){const px=ox+128+(r()-0.5)*170,lift=1-Math.min(1,Math.abs(px-ox-128)/105),py=oy+158-r()*62*lift,pr=30+r()*36+lift*14;
      const g=c.createRadialGradient(px,py,pr*0.1,px,py,pr);g.addColorStop(0,'rgba(255,255,255,0.95)');g.addColorStop(0.55,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=g;c.beginPath();c.arc(px,py,pr,0,7);c.fill();}
    c.globalCompositeOperation='source-atop';const sh=c.createLinearGradient(0,oy+70,0,oy+205);sh.addColorStop(0,'rgb(255,255,255)');sh.addColorStop(1,'rgb(105,105,110)');
    c.fillStyle=sh;c.fillRect(ox,oy,256,256);
    c.globalCompositeOperation='destination-out';const fb=c.createLinearGradient(0,oy+178,0,oy+214);fb.addColorStop(0,'rgba(0,0,0,0)');fb.addColorStop(1,'rgba(0,0,0,1)');
    c.fillStyle=fb;c.fillRect(ox,oy+178,256,78);c.restore();}
});
const cloudMat=new T.ShaderMaterial({
  uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{map:{value:null},uLit:{value:new T.Color()},uShade:{value:new T.Color()},uOver:{value:0},uFlash:{value:0},uCover:{value:0.6}}]),
  vertexShader:`attribute float aVar;attribute float aStorm;attribute float aAlpha;attribute float aSeed;varying vec2 vUv;varying float vStorm;varying float vAlpha;varying float vSeed;
  #include <fog_pars_vertex>
  void main(){vec4 c=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);float sx=length(instanceMatrix[0].xyz),sy=length(instanceMatrix[1].xyz);
    vec4 mvPosition=viewMatrix*c;mvPosition.xy+=position.xy*vec2(sx,sy);gl_Position=projectionMatrix*mvPosition;
    vUv=uv*0.5+vec2(mod(aVar,2.)*0.5,0.5-floor(aVar/2.)*0.5);vStorm=aStorm;vAlpha=aAlpha;vSeed=aSeed;
    #include <fog_vertex>
  }`,
  fragmentShader:`uniform sampler2D map;uniform vec3 uLit;uniform vec3 uShade;uniform float uOver;uniform float uFlash;uniform float uCover;varying vec2 vUv;varying float vStorm;varying float vAlpha;varying float vSeed;
  #include <fog_pars_fragment>
  void main(){vec4 t=texture2D(map,vUv);float show=mix(smoothstep(vSeed-0.12,vSeed+0.12,uCover),1.0,vStorm);float a=t.a*vAlpha*mix(1.0-0.3*uOver,uOver,vStorm)*show;if(a<0.01)discard;
    vec3 lit=mix(uLit,uLit*0.6,vStorm),sh=mix(uShade,uShade*0.5,vStorm);
    vec3 col=mix(sh,lit,t.r)+vec3(0.55,0.6,0.78)*uFlash*(0.35+0.65*t.r);
    gl_FragColor=vec4(col,a);
    #include <fog_fragment>
  }`,transparent:true,depthWrite:false,fog:true});
cloudMat.uniforms.map.value=CLOUD_TEX;
const cloudGroup=(function(){
  const spec=[];
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2+R(-0.12,0.12),r=R(300,520),cy=R(32,62),tx=-Math.sin(a),tz=Math.cos(a);
    for(let k=0;k<7;k++){const o=R(-50,50),rr=r+R(-20,20),w=R(60,110);spec.push([Math.cos(a)*rr+tx*o,cy+R(-6,10),Math.sin(a)*rr+tz*o,w,w*R(0.55,0.68),0,0.9]);}}
  for(let i=0;i<12;i++){const a=R(0,6.28),r=R(20,200),cy=R(62,85);
    for(let k=0;k<6;k++){const w=R(32,58);spec.push([Math.cos(a)*r+R(-26,26),cy+R(-4,6),Math.sin(a)*r+R(-26,26),w,w*R(0.55,0.68),0,0.85]);}}
  for(let i=0;i<48;i++){const a=R(0,6.28),r=Math.sqrt(R(0,1))*280,w=R(70,135);spec.push([Math.cos(a)*r,R(44,58),Math.sin(a)*r,w,w*0.6,1,0.95]);}
  const n=spec.length,g=new T.PlaneGeometry(1,1),aVar=new Float32Array(n),aStorm=new Float32Array(n),aAlpha=new Float32Array(n),aSeed=new Float32Array(n);
  const im=new T.InstancedMesh(g,cloudMat,n),M=new T.Matrix4();
  spec.forEach((s,i)=>{M.makeScale(s[3],s[4],1).setPosition(s[0],s[1],s[2]);im.setMatrixAt(i,M);aVar[i]=Math.floor(R(0,4));aStorm[i]=s[5];aAlpha[i]=s[6];aSeed[i]=0.08+0.84*((Math.sin(i*12.9898)*43758.5453)%1+1)%1;});
  g.setAttribute('aSeed',new T.InstancedBufferAttribute(aSeed,1));
  g.setAttribute('aVar',new T.InstancedBufferAttribute(aVar,1));g.setAttribute('aStorm',new T.InstancedBufferAttribute(aStorm,1));g.setAttribute('aAlpha',new T.InstancedBufferAttribute(aAlpha,1));
  im.frustumCulled=false;im.renderOrder=1;im.userData.noWx=true;
  const grp=new T.Group();grp.add(im);scene.add(grp);return grp;
})();

/* ---------------- sky moods: clouds drift in and out, and a rainbow after the rain ---------------- */
const SKY={cover:0.55,target:0.55,next:40,rain:false,rainbowT:0,nextBow:rnd(420,720),bow:null};
SKY.bow=(function(){
  const m=new T.ShaderMaterial({uniforms:{uAmt:{value:0}},transparent:true,depthWrite:false,fog:false,side:T.DoubleSide,
    vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float uAmt;varying vec2 vP;
      vec3 hue(float h){return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}
      void main(){float r=length(vP),t=clamp((r-250.0)/50.0,0.0,1.0);
        vec3 c=hue(0.78*(1.0-t));float band=sin(t*3.14159);float base=smoothstep(-10.0,70.0,vP.y);
        gl_FragColor=vec4(c,uAmt*band*base*0.42);}`});
  const mesh=new T.Mesh(new T.RingGeometry(250,300,96,1,0,Math.PI),m);
  const dir=new T.Vector3(0.78,0,0.2).normalize();mesh.position.copy(dir).multiplyScalar(560).setY(-40);mesh.lookAt(0,-40,0);
  mesh.visible=false;mesh.renderOrder=0;mesh.frustumCulled=false;mesh.userData.noWx=true;scene.add(mesh);return mesh;
})();
function updateSky(dt){
  const W=WEATHER;
  // fair-weather clouds slowly build up and clear away
  SKY.next-=dt;if(SKY.next<=0){SKY.next=rnd(45,110);SKY.target=pick([0.08,0.25,0.45,0.65,0.85,1.0]);}
  SKY.cover=approach(SKY.cover,SKY.target,dt*0.006);
  cloudMat.uniforms.uCover.value=Math.max(SKY.cover,W.over*0.9);
  // rainbow: after a rain shower in daylight, and now and then on a sunny day
  if(W.rainK>0.6)SKY.rain=true;
  if(SKY.rain&&W.rainK<0.2){SKY.rain=false;if(nightK<0.45){SKY.rainbowT=rnd(55,85);SKY.cover=Math.min(SKY.cover,0.5);SKY.target=0.3;}}
  SKY.nextBow-=dt;if(SKY.nextBow<=0){SKY.nextBow=rnd(480,900);if(nightK<0.4&&W.rainK<0.05&&W.snowK<0.05)SKY.rainbowT=rnd(40,60);}
  SKY.rainbowT=Math.max(0,SKY.rainbowT-dt);
  const want=SKY.rainbowT>0&&nightK<0.5&&W.rainK<0.3&&W.snowK<0.3?1:0,u=SKY.bow.material.uniforms.uAmt;
  u.value=approach(u.value,want*(1-nightK),dt*(want?0.08:0.15));SKY.bow.visible=u.value>0.003;
}

/* ---------------- weather: rain, lightning, snow ---------------- */
const WEATHER={storm:false,snow:false,rainK:0,snowK:0,over:0,wet:0,cover:0,flash:0,ft:-1,nextStrike:3,bolt:null,center:new T.Vector3(),wind:new T.Vector2(1.6,0.6)};
const WX_U={uWet:{value:0},uSnow:{value:0}};
const approach=(a,b,s)=>a+clamp(b-a,-s,s);
function particleMat(vs,fs,extra){return new T.ShaderMaterial({uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,Object.assign({uTime:{value:0},uCenter:{value:new T.Vector3()},uAmt:{value:0},uWind:{value:new T.Vector2()}},extra||{})]),
  vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,fog:true});}
const RAIN_N=3400,SNOW_N=3000;
const rainMesh=(function(){
  const pos=new Float32Array(RAIN_N*6),end=new Float32Array(RAIN_N*2),rr=new Float32Array(RAIN_N*2);
  for(let i=0;i<RAIN_N;i++){const x=Math.random(),y=Math.random(),z=Math.random(),r=Math.random();for(let k=0;k<2;k++){pos.set([x,y,z],(i*2+k)*3);end[i*2+k]=k;rr[i*2+k]=r;}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aEnd',new T.BufferAttribute(end,1));g.setAttribute('aRand',new T.BufferAttribute(rr,1));
  const m=particleMat(`uniform float uTime;uniform vec3 uCenter;uniform float uAmt;uniform vec2 uWind;attribute float aEnd;attribute float aRand;varying float vA;
    #include <fog_pars_vertex>
    void main(){const float S=80.0,H=44.0;float spd=24.0+aRand*9.0;vec3 p;
      p.x=uCenter.x-S*0.5+mod(position.x*S-(uCenter.x-S*0.5),S);p.z=uCenter.z-S*0.5+mod(position.z*S-(uCenter.z-S*0.5),S);
      float fall=mod(uTime*spd+position.y*H,H);p.y=uCenter.y+H*0.5-fall;
      p+=normalize(vec3(uWind.x,-spd,uWind.y))*aEnd*1.2;
      vA=step(aRand,uAmt);vec4 mvPosition=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`,`varying float vA;
    #include <fog_pars_fragment>
    void main(){if(vA<0.5)discard;gl_FragColor=vec4(0.78,0.84,0.95,0.4);
      #include <fog_fragment>
    }`);
  const ls=new T.LineSegments(g,m);ls.frustumCulled=false;ls.visible=false;ls.userData.noWx=true;scene.add(ls);return ls;
})();
const snowMesh=(function(){
  const pos=new Float32Array(SNOW_N*3),rr=new Float32Array(SNOW_N);
  for(let i=0;i<SNOW_N;i++){pos.set([Math.random(),Math.random(),Math.random()],i*3);rr[i]=Math.random();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aRand',new T.BufferAttribute(rr,1));
  const m=particleMat(`uniform float uTime;uniform vec3 uCenter;uniform float uAmt;uniform vec2 uWind;attribute float aRand;varying float vA;
    #include <fog_pars_vertex>
    void main(){const float S=70.0,H=36.0;float spd=1.6+aRand*1.4;vec3 p;
      p.x=uCenter.x-S*0.5+mod(position.x*S-(uCenter.x-S*0.5)+sin(uTime*0.9+aRand*30.0)*0.8+uWind.x*0.3*uTime,S);
      p.z=uCenter.z-S*0.5+mod(position.z*S-(uCenter.z-S*0.5)+cos(uTime*0.7+aRand*20.0)*0.8+uWind.y*0.3*uTime,S);
      p.y=uCenter.y+H*0.5-mod(uTime*spd+position.y*H,H);
      vA=step(aRand,uAmt);vec4 mvPosition=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mvPosition;
      gl_PointSize=clamp(230.0*(0.55+aRand*0.6)/max(1.0,-mvPosition.z),1.0,26.0);
      #include <fog_vertex>
    }`,`varying float vA;
    #include <fog_pars_fragment>
    void main(){if(vA<0.5)discard;float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.12,d);if(a<0.02)discard;gl_FragColor=vec4(0.97,0.98,1.0,a*0.95);
      #include <fog_fragment>
    }`);
  const pts=new T.Points(g,m);pts.frustumCulled=false;pts.visible=false;pts.userData.noWx=true;scene.add(pts);return pts;
})();
const flashLight=new T.DirectionalLight(0xcfd8ff,0);flashLight.position.set(0,140,0);scene.add(flashLight);
const boltMat=new T.MeshBasicMaterial({color:'#eef2ff',fog:false,transparent:true});
const FLASH_SEQ=[[0,0],[0.02,1],[0.08,0.25],[0.14,0.9],[0.26,0.35],[0.36,0.6],[0.6,0]];
const AUDIO={ctx:null,master:null,rainGain:null,noise:null};
function ensureAudio(){
  if(AUDIO.ctx)return;
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C();
    const len=ctx.sampleRate*4,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);let b=0;
    for(let i=0;i<len;i++){b=0.97*b+0.03*(Math.random()*2-1);d[i]=(Math.random()*2-1)*0.6+b*2.2;}
    AUDIO.noise=buf;AUDIO.master=ctx.createGain();AUDIO.master.gain.value=0.8;AUDIO.master.connect(ctx.destination);
    const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1400;bp.Q.value=0.4;
    AUDIO.rainGain=ctx.createGain();AUDIO.rainGain.gain.value=0;src.connect(bp).connect(AUDIO.rainGain).connect(AUDIO.master);src.start();
    AUDIO.ctx=ctx;}catch(e){AUDIO.ctx=null;}
}
function thunder(delay,strength){
  const ctx=AUDIO.ctx;if(!ctx)return;
  try{const t0=ctx.currentTime+delay,src=ctx.createBufferSource();src.buffer=AUDIO.noise;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=150;const g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(0.7*strength,t0+0.12);g.gain.exponentialRampToValueAtTime(0.001,t0+3.4);
    src.connect(lp).connect(g).connect(AUDIO.master);src.start(t0);src.stop(t0+3.6);}catch(e){}
}
function strike(){
  const W=WEATHER,a=Math.random()*Math.PI*2,dist=rnd(95,250),x=Math.cos(a)*dist,z=Math.sin(a)*dist,top=rnd(95,120),bot=Math.max(hAt(x,z),0);
  const pts=[];for(let i=0;i<=16;i++){const t=i/16,j=i&&i<16?1:0;pts.push(new T.Vector3(x+rnd(-5,5)*j+(1-t)*rnd(-6,6),lerp(top,bot,t),z+rnd(-5,5)*j));}
  const grp=new T.Group();grp.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),64,0.55,5,false),boltMat));
  const b0=pts[5],bp=[b0.clone()];for(let i=1;i<=6;i++)bp.push(new T.Vector3(b0.x+i*rnd(1.5,3)*(a>3?1:-1),b0.y-i*rnd(5,8),b0.z+rnd(-3,3)));
  grp.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(bp),24,0.3,4,false),boltMat));
  if(W.bolt){scene.remove(W.bolt);W.bolt.traverse(o=>o.geometry&&o.geometry.dispose());}
  W.bolt=grp;scene.add(grp);W.ft=0;
  flashLight.position.set(x*0.5,140,z*0.5);
  thunder(dist/240,clamp(1.25-dist/300,0.35,1));
  if(typeof AI!=='undefined'&&dist<170&&Math.random()<0.4)lunaStartle();
  if(dist<150)petsStartle();
}
const _wd=new T.Vector3();
function updateWeather(dt,time){
  const W=WEATHER,r0=W.rainK,s0=W.snowK;
  W.rainK=approach(W.rainK,W.storm?1:0,dt*0.3);W.snowK=approach(W.snowK,W.snow?1:0,dt*0.22);
  W.over=Math.max(W.rainK,W.snowK*0.75);
  W.wet=W.rainK>W.wet?lerp(W.wet,W.rainK,Math.min(1,dt*0.4)):Math.max(0,W.wet-dt*0.02);
  W.cover=clamp(W.cover+(W.snowK>0.5?dt*0.025:-dt*(0.008+W.rainK*0.03)),0,1);
  WX_U.uWet.value=W.wet*(1-W.cover*0.8);WX_U.uSnow.value=W.cover;
  W.wind.set(1.6+W.rainK*3.5,0.6+W.rainK*1.4);
  camera.getWorldDirection(_wd);W.center.copy(camera.position).addScaledVector(_wd,22);
  for(const[mesh,k]of[[rainMesh,W.rainK],[snowMesh,W.snowK]]){mesh.visible=k>0.01;if(!mesh.visible)continue;const u=mesh.material.uniforms;
    u.uTime.value=time;u.uCenter.value.copy(W.center);u.uAmt.value=k;u.uWind.value.copy(W.wind);}
  if(W.storm&&W.rainK>0.55){W.nextStrike-=dt;if(W.nextStrike<=0){strike();W.nextStrike=rnd(5,13);}}
  let flashing=false;
  if(W.ft>=0){W.ft+=dt;let f=0;for(let i=1;i<FLASH_SEQ.length;i++){const[a,va]=FLASH_SEQ[i-1],[b,vb]=FLASH_SEQ[i];if(W.ft<=b){f=lerp(va,vb,(W.ft-a)/(b-a));break;}}
    W.flash=f;flashing=true;if(W.bolt)W.bolt.visible=f>0.3;boltMat.opacity=clamp(f*1.4,0,1);
    if(W.ft>FLASH_SEQ[FLASH_SEQ.length-1][0]){W.ft=-1;W.flash=0;if(W.bolt){scene.remove(W.bolt);W.bolt.traverse(o=>o.geometry&&o.geometry.dispose());W.bolt=null;}}}
  flashLight.intensity=W.flash*2.4;
  if(AUDIO.ctx&&AUDIO.rainGain)AUDIO.rainGain.gain.setTargetAtTime(0.06*W.rainK,AUDIO.ctx.currentTime,0.4);
  return flashing||Math.abs(W.rainK-r0)>1e-5||Math.abs(W.snowK-s0)>1e-5;
}

/* ---------------- falling leaves (autumn) / drifting petals (spring) ---------------- */
let LEAF_FRAME=0;
const LEAVES=(function(){
  if(!SEASON.falling||!CANOPIES.length)return null;
  const N=SEASON.falling==='leaves'?240:150;
  const im=new T.InstancedMesh(new T.PlaneGeometry(SEASON.falling==='leaves'?0.27:0.2,SEASON.falling==='leaves'?0.2:0.14),new T.MeshStandardMaterial({side:T.DoubleSide,roughness:0.85}),N);
  im.frustumCulled=false;im.receiveShadow=true;im.userData.noWx=true;scene.add(im);
  const L=[...Array(N)].map(()=>({x:0,y:0,z:0,vy:1,ph:0,spin:2,ry:0,rest:0,flat:0}));
  const c=new T.Color();
  function spawn(l,i,initial){if(!CANOPIES.length)return;const cp=CANOPIES[Math.floor(Math.random()*CANOPIES.length)],a=Math.random()*6.28,r=Math.sqrt(Math.random())*cp.r;
    l.x=cp.x+Math.cos(a)*r;l.z=cp.z+Math.sin(a)*r;l.y=cp.y+rnd(-1.2,0.6);if(initial)l.y=lerp(hAt(l.x,l.z)+0.5,l.y,Math.random());
    l.vy=rnd(0.5,1.0);l.ph=rnd(0,6.28);l.spin=rnd(1.5,4);l.rest=0;l.flat=0;l.g=undefined;im.setColorAt(i,c.set(pick(cp.pal)));}
  L.forEach((l,i)=>spawn(l,i,true));im.instanceColor.needsUpdate=true;
  const M=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),p=new T.Vector3(),one=new T.Vector3(1,1,1);
  return {update(dt,time){
    const W=WEATHER,wx=W.wind.x*0.5,wz=W.wind.y*0.5,speed=1+W.rainK*1.3;let recolor=false;LEAF_FRAME++;
    for(let i=0;i<N;i++){const l=L[i];
      if(l.rest>0){l.rest-=dt;if(l.rest<=0){spawn(l,i,false);recolor=true;}}
      else{l.y-=l.vy*dt*speed;l.x+=(wx+Math.sin(time*1.6+l.ph)*0.7)*dt;l.z+=(wz+Math.cos(time*1.3+l.ph)*0.5)*dt;l.ry+=dt*l.spin*0.4;
        // ground height only changes slowly as a leaf drifts: refresh it every few frames (staggered), and always when close to landing
        let g=l.g;if(g===undefined||((i+LEAF_FRAME)&7)===0||l.y<g+0.4){g=hAt(l.x,l.z);if(g<0)g=0;else if(waterDist(l.x,l.z)<0)g=Math.max(g,WATER);l.g=g;}
        if(l.y<=g+0.025){l.y=g+0.025;l.rest=rnd(6,16);l.flat=1;}}
      if(l.flat)e.set(-Math.PI/2,0,l.ry);else e.set(Math.sin(time*l.spin+l.ph)*1.2,l.ry,Math.cos(time*l.spin*0.8+l.ph)*0.9);
      M.compose(p.set(l.x,l.y,l.z),q.setFromEuler(e),one);im.setMatrixAt(i,M);}
    im.instanceMatrix.needsUpdate=true;if(recolor)im.instanceColor.needsUpdate=true;
  }};
})();

/* snow cover & wet sheen on every standard surface (terrain, buildings, trees, decor) */
function patchWeatherMaterial(m){
  if(!m||!m.isMeshStandardMaterial||m.userData.wx)return;m.userData.wx=true;
  m.onBeforeCompile=sh=>{
    sh.uniforms.uWet=WX_U.uWet;sh.uniforms.uSnow=WX_U.uSnow;
    sh.vertexShader='varying float vUpW;\n'+sh.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n  vUpW=normalize(mat3(modelMatrix)*objectNormal).y;');
    sh.fragmentShader='uniform float uWet;uniform float uSnow;varying float vUpW;\n'+sh.fragmentShader
      .replace('#include <color_fragment>','#include <color_fragment>\n  diffuseColor.rgb*=1.0-uWet*0.3;\n  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.93,0.95,1.0),uSnow*smoothstep(0.35,0.8,vUpW));')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  roughnessFactor*=1.0-uWet*0.45*(1.0-uSnow);');
  };
  m.customProgramCacheKey=()=>'wx1';m.needsUpdate=true;
}
function patchWeatherScene(){(function walk(o){if(o.userData&&o.userData.noWx)return;
  if(o.isMesh){(Array.isArray(o.material)?o.material:[o.material]).forEach(patchWeatherMaterial);}o.children.forEach(walk);})(scene);}

/* ---------------- lights ---------------- */
const hemi=new T.HemisphereLight(0xffe6c7,0x5b7a45,0.6);scene.add(hemi);
const sun=new T.DirectionalLight(0xffc98a,1.3);
sun.castShadow=true;sun.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);
Object.assign(sun.shadow.camera,{left:-112,right:112,top:112,bottom:-112,near:1,far:460});
sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.04;
scene.add(sun);scene.add(sun.target);
const points=LIGHTS.slice(0,6).map(([x,y,z])=>{const l=new T.PointLight(0xffa24a,0,26,2);l.position.set(x,y,z);scene.add(l);return l;});

/* ---------------- post (bloom) ---------------- */
let composer=null,bloom=null,RPASS=null;
if(T.EffectComposer&&T.RenderPass&&T.UnrealBloomPass){
  try{
    let rt;
    if(GL2_MSAA_POST&&renderer.capabilities.isWebGL2){rt=new T.WebGLMultisampleRenderTarget(innerWidth*PR,innerHeight*PR,{format:T.RGBAFormat});}
    composer=rt?new T.EffectComposer(renderer,rt):new T.EffectComposer(renderer);
    composer.addPass(RPASS=new T.RenderPass(scene,camera));
    bloom=new T.UnrealBloomPass(new T.Vector2(innerWidth*(MOBILE?0.5:1),innerHeight*(MOBILE?0.5:1)),0.3,0.5,0.88);
    composer.addPass(bloom);
  }catch(e){composer=null;bloom=null;}
}
if(!composer&&GL2_MSAA_POST){
  // post-processing failed after we skipped canvas MSAA: rebuilding the renderer isn't worth it, so just keep a crisp pixel ratio
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
}

/* ---------------- time of day ---------------- */
const C=h=>new T.Color(h);
const PAL={
  sunA:C('#ffc98a'),sunB:C('#9fb4ff'),hemiA:C('#ffe6c7'),hemiB:C('#40507f'),gndA:C('#5b7a45'),gndB:C('#141b28'),
  topA:C('#6f9fd8'),topB:C('#060a20'),horA:C('#f4c79f'),horB:C('#22305a'),glowA:C('#ffb46b'),glowB:C('#cfdaff'),
  wSunA:C('#ffd29a'),wSunB:C('#6f86c8'),wSkyA:C('#b7cbe0'),wSkyB:C('#1a2548'),cloudA:C('#fff4ea'),cloudB:C('#56608a'),
  ovTopA:C('#8b949f'),ovTopB:C('#151924'),ovHorA:C('#a9b0b7'),ovHorB:C('#22283a'),ovCloudA:C('#c3c8ce'),ovCloudB:C('#2a3040')
};
const DAYDIR=new T.Vector3(-0.75,0.42,-0.08).normalize(),NIGHTDIR=new T.Vector3(0.5,0.62,-0.6).normalize();
const tmp=new T.Color(),tmpV=new T.Vector3();
let tod=0,todTarget=0;
function applyTOD(t){
  if(t>=0.5 && nightK<0.5) SPACE_LAUNCH.trigger(false);
  const k=smooth(0,1,t);nightK=k;
  tmpV.copy(DAYDIR).lerp(NIGHTDIR,k).normalize();
  sun.position.copy(tmpV).multiplyScalar(180);
  const ov=WEATHER.over,fl=WEATHER.flash;
  sun.color.copy(PAL.sunA).lerp(PAL.sunB,k);sun.intensity=lerp(1.3,0.3,k)*(1-0.72*ov);
  hemi.color.copy(PAL.hemiA).lerp(PAL.hemiB,k);hemi.groundColor.copy(PAL.gndA).lerp(PAL.gndB,k);hemi.intensity=lerp(0.62,0.45,k)*(1-0.2*ov)+fl*0.9;
  skyMat.uniforms.uTop.value.copy(PAL.topA).lerp(PAL.topB,k);
  skyMat.uniforms.uHor.value.copy(PAL.horA).lerp(PAL.horB,k);
  skyMat.uniforms.uTop.value.lerp(tmp.copy(PAL.ovTopA).lerp(PAL.ovTopB,k),ov*0.88);
  skyMat.uniforms.uHor.value.lerp(tmp.copy(PAL.ovHorA).lerp(PAL.ovHorB,k),ov*0.88);
  skyMat.uniforms.uSunCol.value.copy(PAL.glowA).lerp(PAL.glowB,k).multiplyScalar(1-0.8*ov);skyMat.uniforms.uFlash.value=fl;
  skyMat.uniforms.uSunDir.value.copy(tmpV);skyMat.uniforms.uNight.value=k;
sunMesh.position.copy(tmpV).multiplyScalar(1200);moonMesh.position.copy(tmpV).multiplyScalar(-1200);
sunMesh.material.opacity=1-ov;moonMesh.material.opacity=1-ov;
  fog.color.copy(skyMat.uniforms.uHor.value);fog.density=0.0012+0.0055*WEATHER.rainK+0.0045*WEATHER.snowK;
  matGlow.emissiveIntensity=lerp(0.45,1.6,smooth(0.2,1,t));matShoji.emissiveIntensity=lerp(0.4,0.7,smooth(0.2,1,t));POOL_MAT.opacity=smooth(0.35,0.95,t)*0.5;
  const lamp=smooth(0.35,0.95,t)*1.5;points.forEach(l=>l.intensity=lamp);
  caretaker.charLight.intensity=lerp(0.35,0.85,smooth(0.25,0.95,t));
  starMat.opacity=smooth(0.5,1,t)*(1-ov);
  {const cu=cloudMat.uniforms;cu.uLit.value.copy(PAL.cloudA).lerp(PAL.cloudB,k).lerp(tmp.copy(PAL.ovCloudA).lerp(PAL.ovCloudB,k),ov*0.8);
   cu.uShade.value.copy(cu.uLit.value).multiplyScalar(0.62).lerp(skyMat.uniforms.uHor.value,0.25);cu.uOver.value=ov;cu.uFlash.value=fl;}
  for(const m of WATER_MATS){const u=m.uniforms;u.uSun.value.copy(tmpV);
    u.uSunCol.value.copy(PAL.wSunA).lerp(PAL.wSunB,k);u.uSky.value.copy(PAL.wSkyA).lerp(PAL.wSkyB,k).lerp(tmp.copy(PAL.ovHorA).lerp(PAL.ovHorB,k),ov*0.7);u.uRain.value=WEATHER.rainK;
    u.uShallow.value.set(m.userData.shallow[0]).lerp(tmp.set(m.userData.shallow[1]),k);
    u.uDeep.value.set(m.userData.deep[0]).lerp(tmp.set(m.userData.deep[1]),k);u.uNight.value=k;}
  wfMat.uniforms.uNight.value=k;
  if(bloom){bloom.strength=lerp(0.28,0.72,k);bloom.threshold=lerp(0.9,0.64,k);bloom.radius=lerp(0.45,0.65,k);}
  flashLight.color.set('#cfd8ff');
  document.getElementById('todLabel').textContent=t<0.25?'Golden hour':t<0.7?'Dusk':'Night';
}

/* ---------------- Smoothed & Deep-Zoom Camera Controls ---------------- */
const camTarget=new T.Vector3(2,3,2);
let theta=0.62,phi=0.98,radius=175;
let tTheta=0.62,tPhi=0.98,tRadius=175;
let orbit=true,idle=0;
let CAM_DT=1/60,ORBIT_K=0;const STEER={held:false,th:0};   // frame time for the camera smoothing, slow-orbit ease, latched stick direction
const FREE={on:false,keys:new Set()};

let CAM_PULL=175,CAM_SNAP=0,OCC_N=0,OCC_NEAR=175,OCC_BOXES=null;const _occRay=new T.Ray(),_occP=new T.Vector3(),_occM=new T.Matrix4();
function camOcclusion(maxR){
  if(!OCC_BOXES){OCC_BOXES=[];
    for(const b of[B.roofBox,B.roofPyr,B.plaster]){if(!b||!b.im)continue;if(!b.g.boundingBox)b.g.computeBoundingBox();
      for(let i=0;i<b.im.count;i++){b.im.getMatrixAt(i,_occM);const bx=b.g.boundingBox.clone().applyMatrix4(_occM);if(bx.getSize(_occP).length()>1.6)OCC_BOXES.push(bx.expandByScalar(0.25));}}}
  _occRay.origin.copy(camTarget);_occRay.direction.set(Math.sin(phi)*Math.sin(theta),Math.cos(phi),Math.sin(phi)*Math.cos(theta));
  let near=maxR;for(const bx of OCC_BOXES){if(bx.containsPoint(camTarget))continue;if(_occRay.intersectBox(bx,_occP)){const d=_occP.distanceTo(camTarget)-0.35;if(d<near)near=d;}}
  return Math.max(2.4,near);}
const _lkA=new T.Vector3(),_lkB=new T.Vector3();
function updateCam(){
  if(CAM_SNAP){
    const F=focusBody();
    camTarget.set(F.x,(F.y||0)+1.2,F.z);
    theta=tTheta;phi=tPhi;radius=tRadius;CAM_SNAP=0;
  }
  // Smoothly interpolate camera position and angles for silky smooth motion
  // frame-rate independent smoothing (the same feel at 30, 60 or 144 fps)
  const kc=1-Math.exp(-CAM_DT*7.7),kt=1-Math.exp(-CAM_DT*6.3);
  theta=lerp(theta,tTheta,kc);
  phi=lerp(phi,tPhi,kc);
  radius=lerp(radius,tRadius,kc);

  // Focus look target near the caretaker's current position so zoom focuses inward on her
  if(!FREE.on&&!INSIDE.on){
    const F=focusBody(),fx=F.x,fy=F.y,fz=F.z;
    camTarget.x=lerp(camTarget.x,fx,kt);
    camTarget.y=lerp(camTarget.y,fy+1.2,kt);
    camTarget.z=lerp(camTarget.z,fz,kt);
  }

  // when a roof or wall sits between Luna and the camera, glide in front of it (close follow views only)
  let rr=radius;const ph=phi;
  if(!FREE.on&&!INSIDE.on&&radius<45){
    OCC_N++;if((OCC_N%4)===1)OCC_NEAR=camOcclusion(radius);
    CAM_PULL=lerp(CAM_PULL,OCC_NEAR,OCC_NEAR<CAM_PULL?0.5:0.08);rr=Math.min(radius,CAM_PULL);
  }else CAM_PULL=radius;
  camera.position.set(
    camTarget.x+rr*Math.sin(ph)*Math.sin(theta),
    camTarget.y+rr*Math.cos(ph),
    camTarget.z+rr*Math.sin(ph)*Math.cos(theta)
  );
  // never below the ground or the sea surface (the ocean is at y=0)
  if(!INSIDE.on){const g=Math.max(meshH(camera.position.x,camera.position.z),0.4)+0.5;if(camera.position.y<g)camera.position.y=g;}
  const lk=(!FREE.on&&!INSIDE.on)?SPACE_LAUNCH.view.k:0;
  if(lk>0.001){
    // rocket launch: keep the camera where it is and turn its gaze up toward the show, so Luna stays low in frame
    _lkA.subVectors(camTarget,camera.position).normalize();_lkB.subVectors(SPACE_LAUNCH.aim,camera.position).normalize();
    _lkA.lerp(_lkB,lk*0.88).normalize();camera.lookAt(_lkB.copy(camera.position).add(_lkA));
  }else camera.lookAt(camTarget);
  if(Math.abs(camera.fov-40)>0.01){camera.fov=lerp(camera.fov,40,1-Math.exp(-CAM_DT*3.7));camera.updateProjectionMatrix();}
}

const el=renderer.domElement,ptrs=new Map();let pinch=0;
el.addEventListener('pointerdown',e=>{SPACE_LAUNCH.view.target=0;el.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=0;idle=0;});
el.addEventListener('pointermove',e=>{
  const p=ptrs.get(e.pointerId);if(!p)return;idle=0;
  const mdx=e.clientX-p.x,mdy=e.clientY-p.y;
  if(FREE.on&&ptrs.size===2)freePan(mdx/2,mdy/2);
  if(ptrs.size===1&&FREE.on&&((e.buttons&2)||e.shiftKey))freePan(mdx,mdy);
  else if(ptrs.size===1){
    tTheta-=(e.clientX-p.x)*0.005;
    tPhi=clamp(tPhi-(e.clientY-p.y)*0.004,0.15,1.42);
  }
  p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2){
    const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);
    if(pinch>0)tRadius=clamp(tRadius*pinch/d,FREE.on?2:6,360);
    pinch=d;
  }
});
const up=e=>{ptrs.delete(e.pointerId);pinch=0;};
el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
el.addEventListener('contextmenu',e=>e.preventDefault());
// free cam: grab-and-drag the world, or fly with WASD / arrows and Q/E
function freePan(dx,dy){const k=Math.max(0.01,radius*0.0018),rx=Math.cos(theta),rz=-Math.sin(theta),fx=-Math.sin(theta),fz=-Math.cos(theta);
  camTarget.x=clamp(camTarget.x+(-dx*rx+dy*fx)*k,-160,160);camTarget.z=clamp(camTarget.z+(-dx*rz+dy*fz)*k,-160,160);}
function freeFly(dt){
  const K=FREE.keys;if(!K.size)return;idle=0;
  const sp=dt*clamp(radius*0.8,6,60),fx=-Math.sin(theta),fz=-Math.cos(theta),rx=Math.cos(theta),rz=-Math.sin(theta);
  let f=0,r=0,u=0;if(K.has('w')||K.has('arrowup'))f++;if(K.has('s')||K.has('arrowdown'))f--;if(K.has('d')||K.has('arrowright'))r++;if(K.has('a')||K.has('arrowleft'))r--;if(K.has('e'))u++;if(K.has('q'))u--;
  camTarget.x=clamp(camTarget.x+(fx*f+rx*r)*sp,-160,160);camTarget.z=clamp(camTarget.z+(fz*f+rz*r)*sp,-160,160);
  camTarget.y=clamp(camTarget.y+u*sp*0.6,INSIDE.on?0.3:Math.max(hAt(camTarget.x,camTarget.z),0)+0.3,140);
}
addEventListener('keydown',e=>{if(!FREE.on||e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement)return;const k=e.key.toLowerCase();
  if(['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){FREE.keys.add(k);if(k.startsWith('arrow'))e.preventDefault();}});
addEventListener('keyup',e=>FREE.keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>FREE.keys.clear());
el.addEventListener('wheel',e=>{
  e.preventDefault();
  tRadius=clamp(tRadius*(1+e.deltaY*0.001),FREE.on?2:6,360);SPACE_LAUNCH.view.target=0;
  idle=0;
},{passive:false});


/* ---------------- Auto camera: an AI director that keeps Luna framed ---------------- */
const DIRECTOR={on:false,resumeAfter:4,active:false,shot:null,off:0,hb:0,evalT:0,smoothYaw:0,fov:40,
  look:new T.Vector3(),lookInit:false,aerialT:0,nextAerial:35,lastLabel:'',
  wideT:0,nextWide:12,wideKind:'',wideYaw:0,wideAge:0,wideDur:10,wideSpin:0.05,lastWide:false,glideT:0};
const CAM_TALL=[],CAM_LOW=[];CAM_READY=true;
for(const c of CIRCLE_OBS)(c.r>=0.95?CAM_TALL:CAM_LOW).push(c);
const CAM_BOX=BOX_OBS.map(b=>({...b,h:(b.x1-b.x0)*(b.z1-b.z0)>40?8.5:0.9}));
function solidAt(x,y,z){
  const g=hAt(x,z);if(g+0.2>y)return true;
  const up=y-g;if(up>9)return false;
  for(const b of CAM_BOX)if(x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&up<b.h)return true;
  if(up<6.8)for(const c of CAM_TALL){const dx=x-c.x,dz=z-c.z;if(dx<3&&dx>-3&&dz<3&&dz>-3&&dx*dx+dz*dz<(c.r+0.5)**2)return true;}
  return false;
}
function camBlocked(ax,ay,az,bx,by,bz){let h=0;for(let i=1;i<12;i++){const t=0.04+0.84*i/12;if(solidAt(lerp(ax,bx,t),lerp(ay,by,t),lerp(az,bz,t)))h++;}return h;}
const _cp=new T.Vector3(),_head=new T.Vector3();
// wide coverage: the island from above, a slow orbit, a landscape over Luna's shoulder, a rising crane
function wideShot(base,V){
  const D=DIRECTOR,S=focusBody(),e=smooth(0,1,D.wideAge/D.wideDur),cx=4,cz=4;
  switch(D.wideKind){
    case 'island':{const px=lerp(S.x,cx,0.55),pz=lerp(S.z,cz,0.55);
      return Object.assign(base,{id:'wide_island',label:'Island view',pivot:V(px,S.y,pz),yaw:D.wideYaw,az:0,dist:66,h:36,fov:46,look:V(px,2,pz)});}
    case 'landscape':return Object.assign(base,{id:'wide_land',label:'The whole island',yaw:D.wideYaw,az:0,dist:32,h:8,fov:50,look:V(lerp(S.x,cx,0.4),3,lerp(S.z,cz,0.4))});
    case 'crane':return Object.assign(base,{id:'wide_crane',label:'Crane shot',yaw:D.wideYaw,az:0,dist:lerp(7,34,e),h:lerp(2.2,24,e),fov:44,look:V(S.x,S.y+1.2,S.z)});
    default:return Object.assign(base,{id:'wide_orbit',label:'Wide shot',yaw:D.wideYaw,az:0,dist:24,h:10,fov:42,look:V(S.x,S.y+1,S.z)});
  }
}
function moonShotFor(V){   // auto cam shots for Lady Moon (when the camera follows her)
  const fx=Math.sin(LM.yaw),fz=Math.cos(LM.yaw),base={pivot:V(LM.x,LM.y,LM.z),yaw:LM.yaw};
  if(LM.state==='act'){const a=LM.act;
    if(a==='radio')return Object.assign(base,{id:'m_radio',label:'\u266A '+RADIO.label(),pivot:V((LM.x+RADIO.x)/2,LM.y,(LM.z+RADIO.z)/2),yaw:0.2,az:0.35,dist:6.2,h:1.9,fov:40,look:V(LM.x,LM.y+1.0,LM.z)});
    if(a==='knitSit'||a==='knitSquat'||a==='yarnBall')return Object.assign(base,{id:'m_craft',label:'Knitting time',az:0.55,dist:4.4,h:1.5,fov:34,look:V(LM.x,LM.y+0.8,LM.z)});
    if(a==='dogPlay'||a==='yarnPlay'||a==='pet'){const sp=LM.spot,e=sp&&(sp.dog||sp.pet),m=e?V((LM.x+e.x)/2,LM.y+0.7,(LM.z+e.z)/2):V(LM.x,LM.y+0.9,LM.z);
      return Object.assign(base,{id:'m_pets',label:'Playtime',pivot:V(m.x,LM.y,m.z),az:0.9,dist:6,h:2.2,fov:40,look:m});}
    return Object.assign(base,{id:'m_act',label:'Lady Moon',az:0.5,dist:5,h:1.8,fov:36,look:V(LM.x,LM.y+1.1,LM.z)});}
  if(LM.state==='idle'&&DIRECTOR.stillT>1.4)return Object.assign(base,{id:'portrait',label:'Close-up',az:0.45,dist:4.2,h:1.8,fov:34,look:V(LM.x,LM.y+1.35,LM.z)});
  return Object.assign(base,{id:'follow',label:'Following Lady Moon',yaw:DIRECTOR.smoothYaw,az:Math.PI+0.35,dist:10,h:4.2,fov:42,look:V(LM.x+fx*2.5,LM.y+1.1,LM.z+fz*2.5)});
}
function solonShotFor(V){
  const fx=Math.sin(SL.yaw),fz=Math.cos(SL.yaw),base={pivot:V(SL.x,SL.y,SL.z),yaw:SL.yaw};
  if(SL.state==='act'){const a=SL.act;
    if(a==='feed'||a==='train'||a==='herd'){const sp=SL.spot,e=sp&&(sp.dog||sp.bowl),m=e&&e.x!=null?V((SL.x+e.x)/2,SL.y+0.6,(SL.z+e.z)/2):V(SL.x,SL.y+0.9,SL.z);
      return Object.assign(base,{id:'s_job',label:a==='herd'?'Rounding up the pups':a==='feed'?'Filling the bowls':'Training time',pivot:V(m.x,SL.y,m.z),az:0.85,dist:6.2,h:2.2,fov:40,look:m});}
    if(a==='sweep')return Object.assign(base,{id:'s_sweep',label:'Tidying up',az:0.7,dist:5.2,h:1.8,fov:38,look:V(SL.x,SL.y+0.9,SL.z)});
    if(a==='cheer'||a==='wave')return Object.assign(base,{id:'s_cheer',label:'Solon',az:0.4,dist:4.8,h:1.7,fov:36,look:V(SL.x,SL.y+1.15,SL.z)});
    return Object.assign(base,{id:'s_act',label:'Solon',az:0.5,dist:5,h:1.8,fov:36,look:V(SL.x,SL.y+1.1,SL.z)});}
  if(SL.state==='idle'&&DIRECTOR.stillT>1.4)return Object.assign(base,{id:'portrait',label:'Close-up',az:0.45,dist:4.2,h:1.8,fov:34,look:V(SL.x,SL.y+1.35,SL.z)});
  return Object.assign(base,{id:'follow',label:'Following Solon',yaw:DIRECTOR.smoothYaw,az:Math.PI+0.35,dist:10,h:4.2,fov:42,look:V(SL.x+fx*2.5,SL.y+1.1,SL.z+fz*2.5)});
}
function shotFor(){
  const night=nightK>0.55,fx=Math.sin(AI.yaw),fz=Math.cos(AI.yaw);
  _head.set(AI.x,AI.y+1.5,AI.z);
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  if(DIRECTOR.wideT>0){const S=focusBody();return wideShot({pivot:V(S.x,S.y,S.z),yaw:S.yaw},V);}
  if(FOLLOW_SOLON)return solonShotFor(V);
  if(FOLLOW_MOON)return moonShotFor(V);
  const base={pivot:V(AI.x,AI.y,AI.z),yaw:AI.yaw};
  if(DIRECTOR.aerialT>0)return Object.assign(base,{id:'aerial',label:'Island view',yaw:DIRECTOR.smoothYaw,az:Math.PI*0.78,dist:27,h:17,fov:44,
    look:V(AI.x+fx*4,AI.y+1,AI.z+fz*4)});
  if(DIRECTOR.wideT>0)return wideShot(base,V);
  if(AI.state==='skylook'&&AI.skyObj){const v=AI.skyObj.position;
    return Object.assign(base,{id:'sky',label:'Look up!',yaw:Math.atan2(v.x-AI.x,v.z-AI.z),az:Math.PI+0.3,dist:5,h:0.9,fov:52,
      look:V(lerp(_head.x,v.x,0.3),Math.min(lerp(_head.y,v.y,0.3),AI.y+14),lerp(_head.z,v.z,0.3))});}
  if((AI.state==='idle'||AI.state==='think')&&DIRECTOR.stillT>1.4)   // only after she has stood still a moment, so quick pauses don't cut back and forth
    return Object.assign(base,{id:'portrait',label:'Close-up',az:0.45,dist:4.2,h:1.8,fov:34,look:V(AI.x,AI.y+1.35,AI.z)});
  if(AI.state==='act'){
    const tg=AI.target;
    switch(AI.act){
      case 'pet':case 'feed':{const e=tg&&tg.ent;
        const m=e?V((AI.x+e.x)/2,AI.y+0.75,(AI.z+e.z)/2):V(AI.x+fx*0.9,AI.y+0.75,AI.z+fz*0.9);
        return Object.assign(base,{id:'cozy',label:AI.act==='pet'?('Cuddles'+(e?' with '+e.name:'')):'Feeding time',az:0.95,dist:4.4,h:1.25,fov:36,look:m});}
      case 'water':case 'weed':case 'pests':case 'harvest':case 'prep':case 'mulch':case 'deadhead':case 'plant':
        return Object.assign(base,{id:'garden',label:(tg&&tg.label)||'In the garden',az:1.1,dist:5.4,h:2.2,fov:38,look:tg&&tg.bed?V(tg.look[0]*0.5+AI.x*0.5,tg.bed.y+0.4,tg.look[1]*0.5+AI.z*0.5):V(AI.x+fx*0.8,AI.y+0.9,AI.z+fz*0.8)});
      case 'fetch':{const b=(BALL.state==='flying'||BALL.state==='ground')?BALL.mesh.position:DOG.root.position;
        const sep=Math.hypot(b.x-AI.x,b.z-AI.z),mx=(AI.x+b.x)/2,mz=(AI.z+b.z)/2;
        return Object.assign(base,{id:'fetch',label:'Fetch with '+DOG.name,pivot:V(mx,AI.y,mz),yaw:sep>0.5?Math.atan2(b.x-AI.x,b.z-AI.z):AI.yaw,
          az:Math.PI/2,dist:6+sep*0.75,h:3+sep*0.15,fov:42,look:V(mx,AI.y+0.7,mz)});}
      case 'swim':return Object.assign(base,{id:'swim',label:'Pond swim',az:0.9,dist:6.5,h:2.4,fov:40,look:V(AI.x,WATER+0.5,AI.z)});
      case 'swing':return Object.assign(base,{id:'swing',label:'Swing time',pivot:V(SWING.x,AI.y,SWING.z),yaw:SWING.ry,az:0.6,dist:6.4,h:1.7,fov:40,look:V(SWING.x,AI.y+1.0,SWING.z)});
      case 'sell':return Object.assign(base,{id:'market',label:AI.sold>0?'+'+AI.sold+' coins!':'Market day',pivot:V(AI.x+1.7,AI.y,AI.z),yaw:-Math.PI/2,az:0.85,dist:6.4,h:2.4,fov:42,look:V(AI.x+1.8,AI.y+1.2,AI.z)});
      case 'gate':{const mx=(AI.x-26.8)/2,mz=(AI.z+31.2)/2;
        return Object.assign(base,{id:'gate',label:tg&&tg.mode==='bed'?'Bedtime, pups':'Time to play, pups!',pivot:V(mx,AI.y,mz),yaw:Math.atan2(-26.8-AI.x,31.2-AI.z),az:1.05,dist:6.2,h:2.4,fov:40,look:V(mx,AI.y+0.7,mz)});}
      case 'fish':{const F=FISH,b=F.look,sep=Math.min(9,Math.hypot(F.bx-AI.x,F.bz-AI.z)),show=F.phase==='show'||F.phase==='reel';
        const mx=show?AI.x:(AI.x+F.bx)/2,mz=show?AI.z:(AI.z+F.bz)/2;
        return Object.assign(base,{id:'fish',label:F.phase==='show'?('A '+F.last+'!'):'Gone fishing',pivot:V(mx,AI.y,mz),az:show?0.75:1.35,dist:show?4.4:5.5+sep*0.45,h:show?1.5:2.4,fov:show?36:42,
          look:show?V(lerp(AI.x,b.x,0.5),AI.y+1.4,lerp(AI.z,b.z,0.5)):V(mx,AI.y+0.9,mz)});}
      case 'sit':return Object.assign(base,{id:'rest',label:night?'Sweet dreams':'Taking a break',az:0.35,dist:5,h:1.5,fov:36,look:V(AI.x,AI.y+0.9,AI.z)});
      case 'sitView':return Object.assign(base,{id:'view',label:night?'Stargazing':'Ocean view',az:Math.PI+0.3,dist:5.2,h:1.3,fov:46,
        look:V(AI.x+fx*12,AI.y+(night?7:2.5),AI.z+fz*12)});
      case 'dance':{const mx=(RADIO.x+AI.x+LM.x)/3,mz=(RADIO.z+AI.z+LM.z)/3;
        return Object.assign(base,{id:'dance',label:'\u266A '+RADIO.label(),pivot:V(mx,AI.y,mz),yaw:0.15,az:0,dist:7,h:2.0,fov:42,look:V(mx,AI.y+1.0,mz)});}
      case 'wave':return Object.assign(base,{id:'wave',label:'Hello!',az:0.25,dist:5,h:1.8,fov:36,look:V(AI.x,AI.y+1.2,AI.z)});
      default:{const L=tg&&tg.look,lx=L?L[0]:AI.x+fx*5,lz=L?L[1]:AI.z+fz*5;
        return Object.assign(base,{id:'scene',label:AI.act==='bow'?'At the shrine':'Taking in the view',az:Math.PI-0.55,dist:6,h:2.2,fov:40,
          look:V(lerp(AI.x,lx,0.5),AI.y+1.4,lerp(AI.z,lz,0.5))});}
    }
  }
  return Object.assign(base,{id:'follow',label:'Following Luna'+(AI.task?' <small>'+(TASK_NAMES[AI.task.id]||'')+'</small>':''),
    yaw:DIRECTOR.smoothYaw,az:Math.PI+0.35,dist:10,h:4.2,fov:42,look:V(AI.x+fx*2.5,AI.y+1.1,AI.z+fz*2.5)});
}
const TASK_NAMES={feedHouse:'to the pet corner',feedYard:'to the play yard',petBed:'to the pet bed',pet:'to say hi',garden:'to the garden',shrine:'up to the shrine',pier:'to the pier',zen:'to the zen garden',waterfall:'to the waterfall',torii:'to the torii gate',
  sweep:'to tidy up',chase:'to play with the pups',visitMoon:'to see Lady Moon',brushDog:'to groom a pup',greet:'home',rest:'home to rest',chop:'to chop down a tree',sell:'to the market',decor:'to enjoy your decorations',swim:'for a swim',swing:'to the swing',islet:'across the bridge to the little island',fetch:'to play fetch',letOut:'to let the dogs out',bedtime:'to put the dogs to bed',fish:'fishing'};
function camPosFor(s,off,hb,out){
  const a=s.yaw+s.az+off,p=s.pivot;out.set(p.x+Math.sin(a)*s.dist,p.y+s.h+hb,p.z+Math.cos(a)*s.dist);
  const g=Math.max(hAt(out.x,out.z),WATER-0.2);if(out.y<g+0.7)out.y=g+0.7;return out;
}
const CAM_OFFS=[0,0.35,-0.35,0.7,-0.7,1.05,-1.05,1.5,-1.5,2.1,-2.1];
function scoreCam(s,off,hb){
  camPosFor(s,off,hb,_cp);
  const S=focusBody(),blk=camBlocked(_cp.x,_cp.y,_cp.z,s.look.x,s.look.y,s.look.z)+camBlocked(_cp.x,_cp.y,_cp.z,S.x,S.y+1.2,S.z)*1.5;
  return blk*4+(solidAt(_cp.x,_cp.y,_cp.z)?60:0)+Math.abs(off)*1.2+hb*0.35+_cp.distanceTo(camera.position)*0.025;
}
const _duoMid=new T.Vector3(),_duoPivot=new T.Vector3(),_sdC=new T.Vector3(),_sdT=new T.Vector3();
DIRECTOR.vel=new T.Vector3();DIRECTOR.lvel=new T.Vector3();
// critically damped spring toward a moving target (Unity-style SmoothDamp) with a speed limit
function smoothDamp(cur,target,vel,time,maxSpeed,dt){
  const om=2/time,x=om*dt,ex=1/(1+x+0.48*x*x+0.235*x*x*x);
  _sdC.subVectors(cur,target);const maxC=maxSpeed*time,l=_sdC.length();if(l>maxC)_sdC.multiplyScalar(maxC/l);
  _sdT.copy(vel).addScaledVector(_sdC,om).multiplyScalar(dt);
  vel.addScaledVector(_sdT,-om).multiplyScalar(ex);
  const tx=cur.x-_sdC.x,ty=cur.y-_sdC.y,tz=cur.z-_sdC.z;
  cur.set(tx+(_sdC.x+_sdT.x)*ex,ty+(_sdC.y+_sdT.y)*ex,tz+(_sdC.z+_sdT.z)*ex);
  return cur;}
function directorUpdate(dt,time){
  const D=DIRECTOR;
  // Dual-Character Framing: calculate midpoint and distance between Luna (AI) and Lady Moon (LM)
  const Fa=FOLLOW_SOLON?SL:AI;
  const Fb=FOLLOW_SOLON?(Math.hypot(SL.x-AI.x,SL.z-AI.z)<=(LM.inside?1e9:Math.hypot(SL.x-LM.x,SL.z-LM.z))?AI:LM):LM;
  const duoLabel=FOLLOW_SOLON?(Fb===AI?'Solon & Luna':'Solon & Lady Moon'):'Luna & Lady Moon';
  const distBetween=Math.hypot(Fb.x-Fa.x, Fb.z-Fa.z);
  const midX=(Fa.x + Fb.x) / 2;
  const midZ=(Fa.z + Fb.z) / 2;
  const midY=(Fa.y + Fb.y) / 2;

  const S=focusBody(),steering=CTRL.on&&CTRL.m>0.1;
  D.smoothYaw+=normalizeAngle(S.yaw-D.smoothYaw)*Math.min(1,dt*1.1);
  D.nextAerial-=dt;D.aerialT=Math.max(0,D.aerialT-dt);
  D.stillT=(S.state==='idle'||S.state==='think')?(D.stillT||0)+dt:0;
  // every half-minute or so, while she's walking somewhere, cut away to a wide shot of the island for a few seconds;
  // it starts from where the camera already is (no sudden swing) and hands back as soon as she starts doing something
  D.nextWide-=dt;
  if(D.wideT>0){D.wideT-=dt;D.wideAge+=dt;D.wideYaw+=dt*(orbit?0.09:0.035);
    if((S.state==='act'&&D.wideAge>3)||steering||S.inside)D.wideT=0;
    if(D.wideT<=0)D.nextWide=rnd(30,48);}
  else if(D.nextWide<=0&&S.state==='walk'&&!steering&&!S.inside&&SPACE_LAUNCH.view.k<0.01){
    D.wideKind=pick(['orbit','island','landscape','crane'].filter(k=>k!==D.wideKind));
    D.wideDur=D.wideT=rnd(8,11);D.wideAge=0;D.wideYaw=Math.atan2(camera.position.x-S.x,camera.position.z-S.z);}
  // Slow orbit in auto cam: the close-up shots drift gently around her instead of holding one angle
  D.orbPh=(D.orbPh||0)+dt*(orbit?0.09:0);

  const s=shotFor();
  // Duo framing: when Lady Moon is close to Luna, centre the shot between them and pull back far enough to keep both in view.
  // (Previously the look point moved to the midpoint while the camera stayed at close-up distance, cutting Luna out of frame.)
  const duo=distBetween<14&&!Fa.inside&&!Fb.inside&&!['aerial','sky','wide_island','wide_land','wide_crane','wide_orbit'].includes(s.id);
  if(duo){_duoMid.set(midX,midY+1.1,midZ);const need=clamp(5.5+distBetween*1.15,5.5,20);
    if(s.dist<need){const k=need/s.dist;s.dist=need;s.h=Math.min(s.h*k,need*0.55);}
    s.pivot=_duoPivot.set(midX,midY,midZ);s.look=_duoMid;s.label=duoLabel;s.fov=Math.max(s.fov,40);}
  const changed=!D.shot||D.shot.id!==s.id,drift=(s.id==='follow'||s.id==='aerial'||s.id.startsWith('wide'))?0:Math.sin(D.orbPh)*0.5;
  D.evalT-=dt;
  if(changed||D.evalT<=0){
    D.evalT=0.5;
    const keep=changed?1e9:scoreCam(s,D.off+drift,D.hb);
    let best=1e9,bo=0,bh=0;
    for(const off of CAM_OFFS)for(const hb of[0,2.6]){const sc=scoreCam(s,off+drift,hb);if(sc<best){best=sc;bo=off;bh=hb;}}
    if(changed||best<keep-0.8){D.off=bo;D.hb=bh;}
  }
  D.shot=s;
  const label=s.label;
  if(label!==D.lastLabel){D.lastLabel=label;document.getElementById('shotLbl').innerHTML=label;}

  // when the best angle changes (something got in the way), travel around her on the arc instead of cutting across
  if(changed||D.offC===undefined){D.offC=D.off;D.hbC=D.hb;}
  else{const da=D.off-D.offC;D.offC+=clamp(da,-0.9*dt,0.9*dt);D.hbC+=clamp(D.hb-D.hbC,-2.5*dt,2.5*dt);}
  camPosFor(s,D.offC+drift,D.hbC,_cp);
  const targetLook=s.look,targetDist=s.dist;

  // camera and aim ease in and out like a camera operator (critically damped, with a top speed), so even long moves to a wide shot glide
  if(!D.lookInit){D.look.copy(targetLook);D.lookInit=true;D.vel.set(0,0,0);D.lvel.set(0,0,0);}
  smoothDamp(camera.position,_cp,D.vel,0.6,26,dt);
  const g=Math.max(hAt(camera.position.x,camera.position.z),WATER-0.2)+0.6;if(camera.position.y<g)camera.position.y=g;
  smoothDamp(D.look,targetLook,D.lvel,0.32,40,dt);camera.lookAt(D.look);
  
  tRadius=lerp(tRadius,targetDist,Math.min(1,dt*2));
  D.fov=lerp(D.fov,s.fov,Math.min(1,dt*1.5));
  if(Math.abs(camera.fov-D.fov)>0.01){camera.fov=D.fov;camera.updateProjectionMatrix();}

  camTarget.copy(D.look);_cp.subVectors(camera.position,camTarget);
  radius=tRadius=Math.max(0.5,_cp.length());phi=tPhi=clamp(Math.acos(clamp(_cp.y/radius,-1,1)),0.15,1.42);theta=tTheta=Math.atan2(_cp.x,_cp.z);
}


/* ================= inside Luna's house: a cozy furnished room with her plush dog collection =================
   The interior is its own little scene. The camera looks in like a dollhouse: whichever walls face the
   camera fade away, so you always see into the room from any angle. */
const INSIDE=(function(){
  const S=new T.Scene();S.background=new T.Color('#2a2230');
  const W2=6.5,D2=4.75,H=3.4;
  const M=(c,o)=>mStd(c,Object.assign({roughness:0.85},o||{}));
  const add=(p,g,mat,x,y,z,sx,sy,sz,cast=true)=>{const m=blob(p,g,mat,x,y,z,sx,sy,sz,cast);m.receiveShadow=true;return m;};
  const room=new T.Group();S.add(room);
  // floor: warm wooden boards
  const floorTex=canvasTex(512,512,c=>{for(let i=0;i<8;i++){const v=150+((i*37)%5)*12;c.fillStyle=`rgb(${v+40},${v-5},${v-55})`;c.fillRect(0,i*64,512,64);c.fillStyle='rgba(60,35,20,.45)';c.fillRect(0,i*64,512,3);
    for(let k=0;k<3;k++){const x=((i*173+k*211)%512);c.fillRect(x,i*64,3,64);}for(let k=0;k<60;k++){c.fillStyle=`rgba(80,50,30,${0.05+Math.random()*0.08})`;c.fillRect(Math.random()*512,i*64+Math.random()*64,30+Math.random()*80,1.5);}}});
  floorTex.wrapS=floorTex.wrapT=T.RepeatWrapping;floorTex.repeat.set(3,2.2);
  const floor=new T.Mesh(new T.PlaneGeometry(W2*2,D2*2),new T.MeshStandardMaterial({map:floorTex,roughness:0.7}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;room.add(floor);
  // walls: plaster above, wood wainscot below; each wall knows which way is "outside" so it can hide from the camera
  const plaster=M('#f3e6cf',{roughness:0.95}),wains=M('#9a6b45'),trim=M('#6e4b33');
  const WALLS=[];
  function wall(cx,cz,len,ry,nx,nz){const g=new T.Group();g.position.set(cx,0,cz);g.rotation.y=ry;room.add(g);
    add(g,BOX,plaster,0,H/2,0,len,H,0.14);add(g,BOX,wains,0,0.55,0.08,len,1.1,0.04,false);add(g,BOX,trim,0,1.12,0.11,len,0.07,0.06,false);
    add(g,BOX,trim,0,0.06,0.11,len,0.12,0.05,false);add(g,BOX,trim,0,H-0.06,0.1,len,0.12,0.08,false);
    WALLS.push({g,x:cx,z:cz,nx,nz});return g;}
  const back=wall(0,-D2,W2*2,0,0,-1),front=wall(0,D2,W2*2,Math.PI,0,1),left=wall(-W2,0,D2*2,Math.PI/2,-1,0),right=wall(W2,0,D2*2,-Math.PI/2,1,0);
  // windows that show the sky outside (tinted by the time of day)
  const skyMat=new T.MeshBasicMaterial({color:'#9cc8ee'});
  function windowOn(g,x,y,w,h){add(g,BOX,trim,x,y,0.1,w+0.2,h+0.2,0.06,false);const p=new T.Mesh(new T.PlaneGeometry(w,h),skyMat);p.position.set(x,y,0.14);g.add(p);
    add(g,BOX,trim,x,y,0.15,0.06,h,0.03,false);add(g,BOX,trim,x,y,0.15,w,0.06,0.03,false);
    for(const s of[-1,1]){const cu=add(g,BOX,M('#e7b9a8',{roughness:1}),x+s*(w/2+0.12),y-0.05,0.2,0.3,h+0.35,0.05,false);cu.userData.curtain=true;}
    add(g,CYL,trim,x,y+h/2+0.22,0.22,0.03,w+0.9,0.03,false).rotation.z=Math.PI/2;}
  windowOn(left,0.3,2.05,2.2,1.15);windowOn(right,-1.6,2.1,1.6,1.0);windowOn(back,4.4,2.45,1.6,0.8);windowOn(front,2.6,2.0,1.6,1.1);
  // front door
  add(front,BOX,M('#7a4e30'),0,1.05,0.1,1.1,2.1,0.08,false);add(front,SPH,M('#d9b65a',{metalness:0.6,roughness:0.3}),0.4,1.0,0.16,0.04,0.04,0.04,false);
  // framed pictures of pups
  function picture(g,x,y,w,h,draw){add(g,BOX,trim,x,y,0.1,w+0.12,h+0.12,0.05,false);const tx=canvasTex(256,Math.round(256*h/w),draw);const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tx,roughness:0.9}));p.position.set(x,y,0.135);g.add(p);}
  picture(back,-2.45,2.4,0.9,0.7,(c,w,h)=>{c.fillStyle='#bfe3f7';c.fillRect(0,0,w,h);c.fillStyle='#8fcf7a';c.fillRect(0,h*0.7,w,h);CL.dog(c,w/2,h*0.48,52,BREEDS.sheltie);});
  picture(back,2.4,2.5,0.62,0.62,(c,w,h)=>{c.fillStyle='#ffe7a3';c.fillRect(0,0,w,h);CL.dog(c,w/2,h/2,58,BREEDS.shepherd);});
  picture(left,-2.7,2.2,0.8,1.0,(c,w,h)=>{c.fillStyle='#ffd1dc';c.fillRect(0,0,w,h);CL.heart(c,w/2,h*0.3,40,'#ff5d8f');CL.paw(c,w/2,h*0.7,34,'#c63a2f',0);});
  picture(right,-3.6,2.3,1.1,0.8,(c,w,h)=>{c.fillStyle='#e3d4f2';c.fillRect(0,0,w,h);CL.tile(c,w,3,2,(x,y)=>CL.dog(c,x,y,26,BREEDS.corgi));});
  // a wall clock
  {const cl=new T.Group();cl.position.set(1.8,2.75,0.14);right.add(cl);const face=canvasTex(128,128,c=>{c.fillStyle='#fbf6ec';c.beginPath();c.arc(64,64,60,0,6.28);c.fill();c.strokeStyle='#3b2a20';c.lineWidth=6;c.stroke();
    c.fillStyle='#3b2a20';for(let i=0;i<12;i++){const a=i/12*6.28;c.fillRect(64+Math.cos(a)*48-3,64+Math.sin(a)*48-3,6,6);}c.lineWidth=5;c.beginPath();c.moveTo(64,64);c.lineTo(64,28);c.moveTo(64,64);c.lineTo(90,70);c.stroke();});
    const f=new T.Mesh(new T.CircleGeometry(0.32,24),new T.MeshStandardMaterial({map:face,roughness:0.6}));cl.add(f);}
  // string lights along the tops of the back and left walls
  const bulbs=[];for(const[g,len]of[[back,W2*2],[left,D2*2],[right,D2*2]])for(let i=0;i<=16;i++){const t=i/16,x=(t-0.5)*(len-0.4),y=H-0.25-Math.sin(t*Math.PI*4)**2*0.18;
    const col=['#ffd58a','#ff9ac0','#9fd6ff','#b8f29a'][i%4];bulbs.push(add(g,SPH,M(col,{emissive:col,emissiveIntensity:0.9}),x,y,0.18,0.05,0.07,0.05,false));}
  // rugs
  const rugTex=canvasTex(256,256,c=>{const g=c.createRadialGradient(128,128,10,128,128,128);g.addColorStop(0,'#e98b6a');g.addColorStop(0.55,'#c9573f');g.addColorStop(1,'#8a3a2f');c.fillStyle=g;c.beginPath();c.arc(128,128,126,0,6.28);c.fill();
    c.strokeStyle='#f6d9b0';c.lineWidth=6;for(const r of[44,84,112]){c.beginPath();c.arc(128,128,r,0,6.28);c.stroke();}for(let i=0;i<12;i++){const a=i/12*6.28;CL.paw(c,128+Math.cos(a)*98,128+Math.sin(a)*98,10,'#f6d9b0',a+1.57);}});
  const rug=new T.Mesh(new T.CircleGeometry(2.1,40),new T.MeshStandardMaterial({map:rugTex,transparent:true,roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(-3.6,0.012,0.4);room.add(rug);
  const rug2=add(room,BOX,M('#7fae9a',{roughness:1}),3.8,0.01,-0.4,3.0,0.02,2.0,false);
  // sofa against the left wall, with throw pillows and a knitted blanket
  const sofaM=M('#5b7fa8',{roughness:1}),sofa=new T.Group();sofa.position.set(-5.75,0,0.4);room.add(sofa);
  add(sofa,BOX,sofaM,0,0.25,0,0.95,0.5,2.7);add(sofa,BOX,sofaM,-0.35,0.75,0,0.3,0.75,2.7);for(const s of[-1,1])add(sofa,BOX,sofaM,0,0.55,s*1.42,0.95,0.6,0.22);
  for(const s of[-0.62,0.62])add(sofa,BOX,M('#6b8fb8',{roughness:1}),0.05,0.56,s,0.82,0.14,1.18);
  for(const[z,col]of[[-0.9,'#f2c94c'],[0.2,'#ff8fab'],[0.95,'#fbf6ec']]){const p=add(sofa,BOX,M(col,{roughness:1}),-0.12,0.86,z,0.18,0.42,0.42);p.rotation.z=0.25;}
  add(sofa,BOX,M('#e8c9a0',{roughness:1}),0.05,0.66,-0.6,0.86,0.05,0.9,false);
  // coffee table with tea and books
  const ct=new T.Group();ct.position.set(-3.85,0,0.4);room.add(ct);const tw=M('#8a6143');
  add(ct,BOX,tw,0,0.42,0,0.85,0.07,1.35);for(const[a,b]of[[-0.35,-0.58],[0.35,-0.58],[-0.35,0.58],[0.35,0.58]])add(ct,BOX,tw,a,0.2,b,0.07,0.4,0.07);
  add(ct,CYL,M('#fbf6ec'),0,0.52,-0.3,0.09,0.12,0.09);add(ct,CYL,M('#fbf6ec'),0.15,0.49,0.05,0.05,0.07,0.05);
  add(ct,BOX,M('#c63a2f'),-0.1,0.48,0.38,0.32,0.05,0.24);add(ct,BOX,M('#2f5a4a'),-0.1,0.53,0.38,0.3,0.05,0.22);
  // fireplace with a flickering fire, mantel, and dog beds for Kiko & Bruno
  const fp=new T.Group();fp.position.set(-4.2,0,-4.45);room.add(fp);const brick=M('#a5644a',{roughness:1});
  add(fp,BOX,brick,0,1.0,0,2.0,2.0,0.5);add(fp,BOX,M('#2a1d18'),0,0.62,0.18,1.1,0.9,0.2,false);add(fp,BOX,trim,0,2.05,0.12,2.3,0.12,0.7);add(fp,BOX,brick,0,2.75,-0.05,1.3,1.3,0.3);
  const fire=[];for(const[x,s,c]of[[0,1,'#ff8a3d'],[-0.18,0.7,'#ffd23f'],[0.2,0.75,'#ff5d3d']])fire.push(add(fp,CONE,M(c,{emissive:c,emissiveIntensity:2}),x,0.45+0.2*s,0.24,0.18*s,0.5*s,0.12,false));
  for(const r of[-0.25,0.25]){const lg=add(fp,CYL,M('#5a3d2a'),r,0.24,0.24,0.07,0.6,0.07,false);lg.rotation.z=Math.PI/2+r;}
  const fireLight=new T.PointLight(0xff9a4a,1.4,10,2);fireLight.position.set(-4.2,0.9,-3.6);S.add(fireLight);
  const dogBeds=[[-4.9,-2.85,'#c98b5a'],[-3.35,-2.95,'#7a9cc6']];
  for(const[x,z,c]of dogBeds){const b=new T.Group();b.position.set(x,0,z);room.add(b);add(b,new T.TorusGeometry(0.42,0.16,8,20),M(c,{roughness:1}),0,0.14,0,1,1,0.7).rotation.x=Math.PI/2;add(b,CYL,M('#f6ead8',{roughness:1}),0,0.08,0,0.42,0.1,0.42);}
  // bed tucked against the back wall, patchwork quilt, nightstand with a lamp
  const quiltTex=canvasTex(256,256,c=>{const cols=['#f2c94c','#ff8fab','#7fae9a','#9fc0e8','#f6d9b0','#e98b6a'];for(let y=0;y<4;y++)for(let x=0;x<4;x++){c.fillStyle=cols[(x*3+y*5)%6];c.fillRect(x*64,y*64,64,64);
    c.strokeStyle='rgba(255,255,255,.7)';c.setLineDash([5,4]);c.lineWidth=2;c.strokeRect(x*64+4,y*64+4,56,56);if((x+y)%2)CL.paw(c,x*64+32,y*64+32,10,'rgba(255,255,255,.75)',0);}});
  const bed=new T.Group();bed.position.set(4.6,0,-3.15);room.add(bed);
  add(bed,BOX,M('#8a6143'),0,0.22,0,2.2,0.44,3.0);add(bed,BOX,M('#8a6143'),0,0.75,-1.45,2.3,1.5,0.12);add(bed,BOX,M('#fbf6ec',{roughness:1}),0,0.5,0,2.05,0.16,2.85);
  const q=new T.Mesh(new T.BoxGeometry(2.15,0.08,2.1),new T.MeshStandardMaterial({map:quiltTex,roughness:1}));q.position.set(0,0.62,0.4);q.castShadow=true;bed.add(q);
  for(const s of[-0.5,0.5])add(bed,BOX,M('#ffffff',{roughness:1}),s,0.66,-1.1,0.8,0.18,0.45);
  const ns=new T.Group();ns.position.set(3.0,0,-4.25);room.add(ns);add(ns,BOX,M('#6e4b33'),0,0.32,0,0.6,0.64,0.5);add(ns,CYL,M('#d9b65a',{metalness:0.4}),0,0.75,0,0.05,0.22,0.05);
  const bedShade=add(ns,CONE,M('#fbe9d0',{emissive:'#ffd59a',emissiveIntensity:0.6}),0,0.98,0,0.22,0.28,0.22);
  const bedLamp=new T.PointLight(0xffc98a,0.6,6,2);bedLamp.position.set(3.0,1.2,-4.0);S.add(bedLamp);
  // little kitchen along the right wall
  const kt=new T.Group();kt.position.set(6.05,0,1.9);room.add(kt);
  add(kt,BOX,M('#a7c4b5'),0,0.45,0,0.75,0.9,3.2);add(kt,BOX,M('#efe6d1'),-0.02,0.93,0,0.8,0.06,3.25);
  add(kt,BOX,M('#2b2d31'),-0.05,0.97,0.8,0.55,0.03,0.7);for(const z of[0.65,0.95])add(kt,CYL,M('#3a3d44'),-0.05,0.99,z,0.12,0.02,0.12,false);
  add(kt,CYL,M('#d93a3a',{roughness:0.4}),-0.08,1.1,0.8,0.12,0.22,0.12);add(kt,BOX,M('#b9c2ca',{metalness:0.6,roughness:0.3}),-0.05,0.95,-0.6,0.5,0.05,0.6);
  add(kt,CYL,M('#fbf6ec'),-0.1,1.0,-1.25,0.22,0.08,0.22);for(const[a,b,c]of[[0,0,'#e2432f'],[0.08,0.07,'#f2c94c'],[-0.07,0.06,'#7fae3a']])add(kt,SPH,M(c,{roughness:0.5}),-0.1+a,1.1,-1.25+b,0.06,0.06,0.06);
  add(kt,BOX,M('#8a6143'),0.2,1.95,0,0.3,0.05,2.4);for(let i=0;i<6;i++)add(kt,CYL,M(['#f6d35a','#e8792a','#7fae3a','#c63a2f','#9fc0e8','#f6d9b0'][i]),0.2,2.1,-1+i*0.4,0.08,0.22,0.08);
  for(const z of[-1.4,1.4]){const pot=add(kt,CYL,M('#c9734a'),0.15,2.35,z,0.12,0.18,0.12);for(let k=0;k<5;k++){const l=add(kt,SPH,M('#5e9a3a'),0.1,2.2-k*0.1,z+(k%2?0.08:-0.08),0.05,0.12,0.03,false);l.rotation.x=0.4;}}
  // dining table with two chairs and a vase
  const dt=new T.Group();dt.position.set(2.7,0,1.9);room.add(dt);add(dt,CYL,tw,0,0.74,0,0.7,0.06,0.7);add(dt,CYL,tw,0,0.37,0,0.08,0.72,0.08);add(dt,CYL,tw,0,0.03,0,0.35,0.06,0.35);
  add(dt,CYL,M('#9fc0e8',{roughness:0.3}),0,0.9,0,0.08,0.26,0.08);for(let k=0;k<5;k++){const a=k*1.25;add(dt,SPH,M(['#ff8fab','#f2c94c','#ffffff','#ff5d8f','#b07aff'][k]),Math.cos(a)*0.08,1.1+k%2*0.06,Math.sin(a)*0.08,0.06,0.05,0.06,false);}
  function chair(x,z,ry){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;room.add(g);add(g,BOX,tw,0,0.45,0,0.48,0.06,0.48);add(g,BOX,tw,0,0.85,-0.22,0.48,0.75,0.05);
    for(const[a,b]of[[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]])add(g,BOX,tw,a,0.22,b,0.05,0.45,0.05);add(g,BOX,M('#ff8fab',{roughness:1}),0,0.5,0,0.42,0.05,0.42,false);}
  chair(1.75,1.9,Math.PI/2);chair(3.65,1.9,-Math.PI/2);
  // floor lamp and a big leafy plant
  const fl=new T.Group();fl.position.set(-6.0,0,2.45);room.add(fl);add(fl,CYL,M('#2b2d31'),0,0.03,0,0.22,0.06,0.22);add(fl,CYL,M('#2b2d31'),0,0.85,0,0.025,1.7,0.025);
  const floorShade=add(fl,CONE,M('#fbe9d0',{emissive:'#ffcf8a',emissiveIntensity:0.7,side:T.DoubleSide}),0,1.78,0,0.32,0.36,0.32);
  const floorLamp=new T.PointLight(0xffc98a,0.8,8,2);floorLamp.position.set(-5.9,1.7,2.3);S.add(floorLamp);
  const pl=new T.Group();pl.position.set(-6.0,0,-1.75);room.add(pl);add(pl,CYL,M('#c9734a'),0,0.25,0,0.3,0.5,0.3);
  for(let k=0;k<9;k++){const a=k*0.7,lf=add(pl,SPH,M(k%2?'#4f8a3a':'#5e9a3a'),Math.cos(a)*0.3,0.75+k*0.07,Math.sin(a)*0.3,0.2,0.05,0.34);lf.rotation.set(0.6*Math.sin(a),a,0.4);}
  // the plush dog collection: a big shelf of cuddly stuffed pups, plus a few on the bed, mantel and floor
  const PLUSH=[
    {n:'Golden Retriever',fur:'#e9b25a',ear:'flop',earCol:'#d9963a',muz:'#f3cf8e'},{n:'Black Lab',fur:'#2c2826',ear:'flop',earCol:'#2c2826',muz:'#3a3532'},
    {n:'Chocolate Lab',fur:'#6b4226',ear:'flop',earCol:'#5a361f',muz:'#7a5032'},{n:'Beagle',fur:'#f4efe6',cap:'#c47a3a',ear:'flop',earCol:'#8a5a2a',muz:'#ffffff',back:'#3a2a22'},
    {n:'Dalmatian',fur:'#fbfaf6',ear:'flop',earCol:'#26222a',muz:'#ffffff',spots:'#26222a'},{n:'Corgi',fur:'#e8862a',ear:'up',earCol:'#e8862a',muz:'#ffffff',belly:'#ffffff'},
    {n:'Husky',fur:'#7d8794',ear:'up',earCol:'#5f6772',muz:'#ffffff',belly:'#ffffff',eye:'#3f8fe0'},{n:'Pug',fur:'#e8cc9a',ear:'flop',earCol:'#2a2422',muz:'#2a2422',small:true},
    {n:'Sheltie',fur:'#d6994f',ear:'up',earCol:'#5b3a24',muz:'#fbf6ec',belly:'#fbf6ec',cap:'#5b3a24'},{n:'German Shepherd',fur:'#cf8a3e',ear:'up',earCol:'#211b18',muz:'#3a2a20',back:'#211b18'},
    {n:'Poodle',fur:'#f7f3ee',ear:'flop',earCol:'#efe8de',muz:'#f7f3ee',curly:true},{n:'Dachshund',fur:'#a0582a',ear:'flop',earCol:'#7a4220',muz:'#a0582a',long:true},
    {n:'Bernese',fur:'#211d1b',ear:'flop',earCol:'#211d1b',muz:'#f4efe6',belly:'#f4efe6',cheek:'#b86a32'},{n:'Schnauzer',fur:'#8e9298',ear:'flop',earCol:'#6a6e74',muz:'#d8dadc',beard:true},
    {n:'Cavalier',fur:'#f7f1e8',ear:'flop',earCol:'#a8582a',muz:'#f7f1e8',cap:'#a8582a'}
  ];
  function makePlush(o,s){
    const g=new T.Group(),f=M(o.fur,{roughness:1}),mz=M(o.muz,{roughness:1}),eb=M('#1b1718',{roughness:0.2});
    const bodyL=o.long?1.5:1;
    add(g,SPH,f,0,0.42,0,0.4,0.42,0.36*bodyL);
    if(o.belly)add(g,SPH,M(o.belly,{roughness:1}),0,0.42,0.12,0.3,0.34,0.26,false);
    if(o.back)add(g,SPH,M(o.back,{roughness:1}),0,0.52,-0.08,0.38,0.3,0.32*bodyL,false);
    for(const sx of[-1,1]){add(g,SPH,f,sx*0.17,0.12,0.26+(o.long?0.15:0),0.12,0.12,0.18);add(g,SPH,f,sx*0.32,0.14,-0.1,0.16,0.13,0.2);}
    add(g,SPH,f,0,0.3,-0.36*bodyL,0.08,0.08,0.14);
    const hd=new T.Group();hd.position.set(0,0.98,0.06);g.add(hd);const hs=o.small?0.92:1;
    add(hd,SPH,f,0,0,0,0.4*hs,0.36*hs,0.36*hs);
    if(o.cap)add(hd,SPH,M(o.cap,{roughness:1}),0,0.1,-0.05,0.4*hs,0.3*hs,0.33*hs,false);
    if(o.cheek)for(const sx of[-1,1])add(hd,SPH,M(o.cheek,{roughness:1}),sx*0.2,-0.08,0.2,0.1,0.08,0.06,false);
    add(hd,SPH,mz,0,-0.11,0.27*hs,0.19,0.14,o.small?0.1:0.16);
    if(o.beard)add(hd,SPH,mz,0,-0.24,0.27,0.16,0.14,0.12,false);
    add(hd,SPH,eb,0,-0.06,0.42*hs+(o.small?-0.05:0),0.06,0.045,0.04,false);
    for(const sx of[-1,1]){add(hd,SPH,M(o.eye||'#1b1718',{roughness:0.2}),sx*0.15,0.04,0.3*hs,0.05,0.06,0.03,false);
      add(hd,SPH,M('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.3}),sx*0.15+0.015,0.06,0.33*hs,0.015,0.015,0.01,false);
      if(o.ear==='up'){const e=add(hd,CONE,M(o.earCol,{roughness:1}),sx*0.22,0.34,-0.02,0.12,0.26,0.07);e.rotation.z=-sx*0.3;}
      else{const e=add(hd,SPH,M(o.earCol,{roughness:1}),sx*0.36,-0.06,0,0.1,0.26,0.13);e.rotation.z=sx*0.3;}}
    if(o.spots)for(let k=0;k<9;k++){const a=k*2.4,y=0.3+(k%3)*0.15;add(g,SPH,M(o.spots),Math.cos(a)*0.36,y,Math.sin(a)*0.32,0.05,0.05,0.05,false);}
    if(o.curly){for(let k=0;k<10;k++){const a=k*0.63;add(g,SPH,f,Math.cos(a)*0.32,0.45+Math.sin(k)*0.15,Math.sin(a)*0.3,0.13,0.13,0.13,false);}add(hd,SPH,f,0,0.32,0,0.2,0.16,0.2,false);}
    g.scale.setScalar(s);return g;
  }
  const shelf=new T.Group();shelf.position.set(0,0,-4.42);room.add(shelf);const sw=M('#c99a6a');
  add(shelf,BOX,sw,0,1.5,-0.1,3.4,3.0,0.08);for(const sx of[-1.66,1.66])add(shelf,BOX,sw,sx,1.5,0.1,0.08,3.0,0.5);
  for(const y of[0.05,0.85,1.65,2.45])add(shelf,BOX,sw,0,y,0.1,3.3,0.06,0.5);add(shelf,BOX,sw,0,3.0,0.1,3.4,0.08,0.52);
  const shelfPlush=[];PLUSH.forEach((o,i)=>{const row=Math.floor(i/5),col=i%5,p=makePlush(o,0.36);p.position.set(-1.3+col*0.65,0.08+row*0.8,0.18);p.rotation.y=(col-2)*0.12;shelf.add(p);shelfPlush.push(p);});
  // a tiny sign on the shelf
  {const tx=canvasTex(256,64,c=>{c.fillStyle='#f6ead8';c.fillRect(0,0,256,64);c.fillStyle='#6e4b33';c.font='700 30px "Zen Maru Gothic", Nunito, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('My Plush Pups',128,34);});
    const p=new T.Mesh(new T.PlaneGeometry(1.2,0.3),new T.MeshStandardMaterial({map:tx}));p.position.set(0,2.82,0.36);shelf.add(p);}
  for(const[i,x,z,ry]of[[0,4.15,-3.95,0.2],[9,5.05,-3.95,-0.2],[8,4.6,-3.55,0]]){const p=makePlush(PLUSH[i],0.42);p.position.set(x,0.68,z);p.rotation.y=ry;room.add(p);}
  for(const[i,x]of[[5,-4.75],[6,-3.65]]){const p=makePlush(PLUSH[i],0.3);p.position.set(x,2.12,-4.25);room.add(p);}
  const bigPlush=makePlush(PLUSH[0],1.0);bigPlush.position.set(-5.3,0,3.75);bigPlush.rotation.y=Math.PI*0.75;room.add(bigPlush);
  {const bk=new T.Group();bk.position.set(1.9,0,-3.55);room.add(bk);add(bk,CYL,M('#b5864a',{roughness:1}),0,0.25,0,0.45,0.5,0.45);for(const[i,a]of[[11,0.4],[3,-0.5],[13,2.2]]){const p=makePlush(PLUSH[i],0.3);p.position.set(Math.sin(a)*0.15,0.3,Math.cos(a)*0.15);p.rotation.set(-0.3,a,0);bk.add(p);}}
  // seasonal touch
  if(CAL.holiday==='halloween'){for(const[x,y,z]of[[2.55,0.78,1.65],[-4.6,2.12,-4.2],[-3.2,0.47,0.15]]){const pk=add(room,SPH,M('#e8792a',{emissive:'#ff7a1a',emissiveIntensity:0.35}),x,y+0.11,z,0.14,0.11,0.14);add(room,CYL,M('#5a7a2a'),x,y+0.24,z,0.02,0.06,0.02,false);}}
  // lights: warm room light plus window daylight
  const amb=new T.AmbientLight(0xfff0dd,0.32);S.add(amb);const hemi2=new T.HemisphereLight(0xfff4e0,0x6b4a36,0.5);S.add(hemi2);
  const win=new T.DirectionalLight(0xfff1d6,0.6);win.position.set(-9,8,3);S.add(win);
  // Luna's spots around the room (walked to via the open middle of the room)
  const HUB=[0.4,1.0];
  const SPOTS=[
    {id:'sofa',name:'cuddling up on the sofa',walk:[-4.85,2.05],via:[[-3.0,2.4]],seat:[-5.55,0.75],y:0.58,yaw:Math.PI/2,act:'sit',dur:[9,14],look:[0,0.4]},
    {id:'fire',name:'warming up by the fire',walk:[-4.2,-2.0],via:[[-2.3,-1.0]],yaw:Math.PI,act:'warm',dur:[6,9],look:[-4.2,-4.4]},
    {id:'plush',name:'hugging her plush',walk:[0,-3.35],yaw:Math.PI,act:'hug',dur:[6,9],look:[0,-4.4]},
    {id:'bed',name:'sitting on her bed',walk:[3.15,-1.6],via:[[2.4,-0.8]],seat:[3.75,-2.4],y:0.64,yaw:-Math.PI/2,act:'sit',dur:[8,12],look:[0,-2.4]},
    {id:'kitchen',name:'making a cup of tea',walk:[5.05,1.2],via:[[2.7,0.45]],yaw:Math.PI/2,act:'cook',dur:[6,9],look:[6.1,1.2]},
    {id:'table',name:'sitting at the table',walk:[1.75,2.75],via:[[1.2,2.6]],seat:[1.78,1.9],y:0.5,yaw:Math.PI/2,act:'sit',dur:[7,11],look:[2.7,1.9]},
    {id:'dogbed',name:'fluffing the dog beds',walk:[-4.1,-2.15],via:[[-2.3,-1.0]],yaw:Math.PI,act:'pet',dur:[4,6],look:[-4.1,-2.9]}
  ];
  return {scene:S,room,WALLS,skyMat,fire,fireLight,floorLamp,bedLamp,floorShade,bedShade,bulbs,amb,hemi2,win,makePlush,PLUSH,SPOTS,HUB,dogBeds,W:W2,D:D2,on:false,
    ent:{x:0,z:3.9,yaw:Math.PI,y:0,yv:0,speed:0,state:'idle',act:null,actT:0,timer:1.5,path:[],spot:null,last:null,look:null}};
})();
// a plush pup Luna can carry and hug
const HUG_PLUSH=(function(){const g=new T.Group();g.visible=false;caretaker.bodyPivot.add(g);g.position.set(0,0.78,0.3);const pl=[];
  for(const i of[0,8,9,7,5]){const p=INSIDE.makePlush(INSIDE.PLUSH[i],0.3);p.position.set(0,-0.2,0);p.visible=false;g.add(p);pl.push(p);}return{g,pl,cur:0};})();

function insideStatus(){const E=INSIDE.ent;if(E.state==='walk')return 'Luna is pottering around her cozy house';
  if(E.spot)return 'Luna is '+(E.spot.id==='bed'&&nightK>0.55?'tucked in on her bed':E.spot.id==='plush'?'hugging her plush '+INSIDE.PLUSH[[0,8,9,7,5][HUG_PLUSH.cur]].n:E.spot.name);return 'Luna is at home';}
function insidePlan(){
  const E=INSIDE.ent,opts=INSIDE.SPOTS.filter(s=>s!==E.last);let sp=pick(opts);
  if(nightK>0.6&&Math.random()<0.5)sp=INSIDE.SPOTS.find(s=>s.id==='bed');
  E.spot=sp;E.last=sp;E.path=[];
  const from=[E.x,E.z];if(E.seatFrom){E.path.push(E.seatFrom);E.seatFrom=null;}
  E.path.push(INSIDE.HUB);for(const v of sp.via||[])E.path.push(v);E.path.push(sp.walk);E.state='walk';E.act=null;
}
function insideUpdate(dt,time){
  const E=INSIDE.ent;E.timer-=dt;
  if(STILL.on&&E.state!=='act'){if(E.state==='walk'||E.state==='settle'){E.state='idle';E.path=[];}E.timer=Math.max(E.timer,1);E.yaw+=normalizeAngle(Math.atan2(camera.position.x-E.x,camera.position.z-E.z)-E.yaw)*Math.min(1,dt*3);}
  if(E.state==='idle'){E.speed=lerp(E.speed,0,Math.min(1,dt*8));if(E.timer<=0)insidePlan();}
  else if(E.state==='walk'){
    const wp=E.path[0];if(!wp){E.state='settle';E.t=0;E.from=[E.x,E.z];}
    else{const dx=wp[0]-E.x,dz=wp[1]-E.z,d=Math.hypot(dx,dz);
      if(d<0.25){E.path.shift();}else{const ty=Math.atan2(dx,dz);E.yaw+=normalizeAngle(ty-E.yaw)*Math.min(1,dt*7);E.speed=lerp(E.speed,1.7*clamp(1-Math.abs(normalizeAngle(ty-E.yaw))/2,0.3,1),Math.min(1,dt*5));
        E.x+=Math.sin(E.yaw)*E.speed*dt;E.z+=Math.cos(E.yaw)*E.speed*dt;}}}
  else if(E.state==='settle'){const sp=E.spot;E.t+=dt;E.speed=lerp(E.speed,0,Math.min(1,dt*8));E.yaw+=normalizeAngle(sp.yaw-E.yaw)*Math.min(1,dt*6);
    const k=smooth(0,1,E.t/0.7);if(sp.seat){E.x=lerp(E.from[0],sp.seat[0],k);E.z=lerp(E.from[1],sp.seat[1],k);E.y=lerp(0,sp.y,k);}
    if(E.t>0.7){E.state='act';E.act=sp.act;E.actT=0;E.timer=rnd(sp.dur[0],sp.dur[1])*(sp.id==='bed'&&nightK>0.6?2:1);
      if(sp.act==='hug'){HUG_PLUSH.cur=Math.floor(Math.random()*HUG_PLUSH.pl.length);HUG_PLUSH.pl.forEach((p,i)=>p.visible=i===HUG_PLUSH.cur);}
      emote(caretaker.headGroup,{sit:'note',warm:'sparkle',hug:'heart',cook:'note',pet:'heart'}[sp.act]||'note',0.85);}}
  else if(E.state==='act'){E.actT+=dt;E.speed=lerp(E.speed,0,Math.min(1,dt*8));
    if(E.spot.id==='bed'&&nightK>0.6&&E.actT>2&&!AI.eyesClosed){AI.eyesClosed=true;caretaker.faceObj.drawFace(true);}
    if(E.timer<=0){if(AI.eyesClosed){AI.eyesClosed=false;caretaker.faceObj.drawFace(false);}
      HUG_PLUSH.g.visible=false;const sp=E.spot;if(sp.seat){E.seatFrom=sp.walk;E.x=sp.seat[0];E.z=sp.seat[1];}
      E.y=0;E.state='idle';E.timer=rnd(0.6,1.6);}}
  HUG_PLUSH.g.visible=E.state==='act'&&E.act==='hug'&&E.actT>0.5;
  // pose her body using the island pose code with her indoor position swapped in
  const sv={x:AI.x,z:AI.z,yaw:AI.yaw,y:AI.y,speed:AI.speed,state:AI.state,act:AI.act,actT:AI.actT,target:AI.target,task:AI.task};
  AI.x=E.x;AI.z=E.z;AI.yaw=E.yaw;AI.y=E.yv;AI.speed=E.speed;AI.state=E.state==='act'?'act':E.state==='walk'?'walk':'idle';AI.act=E.act;AI.actT=E.actT||0;
  AI.target=E.spot&&E.state==='act'?{look:E.spot.look}:null;AI.task=null;
  poseLuna(dt,time);E.yv=AI.y;
  Object.assign(AI,sv);
  // indoor dogs: trot to their beds and curl up, look up when Luna fluffs their bed
  INSIDE.dogs.forEach((d,i)=>{const bedP=INSIDE.dogBeds[i%2],tx=bedP[0],tz=bedP[1];d.ix=d.ix??0;d.iz=d.iz??4;
    const dx=tx-d.ix,dz=tz-d.iz,dd=Math.hypot(dx,dz);
    if(d.ipath&&d.ipath.length){const w=d.ipath[0],wx=w[0]-d.ix,wz=w[1]-d.iz,wd=Math.hypot(wx,wz);if(wd<0.2)d.ipath.shift();else{d.yaw=Math.atan2(wx,wz);d.ix+=wx/wd*2.6*dt;d.iz+=wz/wd*2.6*dt;d.moving=2.6;}}
    else{d.moving=Math.max(0,d.moving-dt*5);d.yaw+=normalizeAngle(Math.atan2(E.x-d.ix,E.z-d.iz)-d.yaw)*Math.min(1,dt*2);d.idlePose=E.act==='pet'?'sit':'loaf';}
    d.happy=E.act==='pet'?1:Math.max(0,d.happy-dt);d.state='inside';
    animatePet(d,dt,time);d.root.position.set(d.ix,0.12*(dd<0.6?1:0),d.iz);d.root.rotation.y=d.yaw;});
}
INSIDE.dogs=[];
const IN_DAY=new T.Color('#9cc8ee'),IN_NIGHT=new T.Color('#1a2548');
function updateInsideLook(dt,time){
  const k=nightK;INSIDE.skyMat.color.copy(IN_DAY).lerp(IN_NIGHT,k);
  INSIDE.hemi2.intensity=lerp(0.55,0.16,k);INSIDE.win.intensity=lerp(0.65,0.05,k);INSIDE.amb.intensity=lerp(0.34,0.18,k);
  // night lamps stay warm, but well under the old values that bloomed into a white glare
  INSIDE.floorLamp.intensity=lerp(0.35,0.52,k);INSIDE.bedLamp.intensity=lerp(0.2,0.34,k);
  INSIDE.floorShade.material.emissiveIntensity=lerp(0.55,0.26,k);
  INSIDE.bedShade.material.emissiveIntensity=lerp(0.48,0.2,k);
  const fl=0.85+Math.sin(time*11)*0.08+Math.sin(time*17.3)*0.06;INSIDE.fireLight.intensity=lerp(1.15,0.7,k)*fl;
  INSIDE.fire.forEach((f,i)=>{f.material.emissiveIntensity=lerp(1.55,0.72,k);f.scale.y=(i?0.36:0.5)*(0.9+0.15*Math.sin(time*(9+i*4)+i));});
  INSIDE.bulbs.forEach((b)=>b.material.emissiveIntensity=lerp(0.5,0.36,k));
  // dollhouse cutaway: hide the walls between the camera and the room
  for(const w of INSIDE.WALLS){const out=(camera.position.x-w.x)*w.nx+(camera.position.z-w.z)*w.nz;w.g.visible=out<0.4;}
}
const fadeEl=document.getElementById('fade');
function setInside(v){
  if(v===INSIDE.on)return;
  if(v&&CTRL.on)setCtrl(false);
  if(fadeEl)fadeEl.classList.add('on');
  setTimeout(()=>{
    if(v){
      if(PLACE.active)cancelPlacing();if(CHOP.on)setChop(false);
      if(AI.state==='act')endAct();else if(AI.state==='walk')abortTask();
      if(AI.state==='skylook'){AI.state='idle';AI.skyObj=null;}
      AI.state='idle';AI.timer=2;const p=POI.houseSteps;AI.x=p.x;AI.z=p.z;
      INSIDE.on=true;AI.inside=true;scene.remove(caretaker.root);INSIDE.scene.add(caretaker.root);
      Object.assign(INSIDE.ent,{x:0,z:3.9,yaw:Math.PI,y:0,yv:0,speed:0,state:'idle',act:null,timer:1.2,path:[],spot:null,seatFrom:null});
      // dogs who are with Luna come inside too
      INSIDE.dogs=DOGS.filter(d=>d.state==='follow'||d.state==='await'||d.state==='sitWait');
      INSIDE.dogs.forEach((d,i)=>{d.inside=true;d.state='inside';scene.remove(d.root);INSIDE.scene.add(d.root);d.ix=(i?0.7:-0.7);d.iz=4.2;d.ipath=[INSIDE.HUB,[-2.3,-1.0],[INSIDE.dogBeds[i%2][0],INSIDE.dogBeds[i%2][1]]];});
      OUTCAM={theta:tTheta,phi:tPhi,radius:tRadius,tx:camTarget.x,ty:camTarget.y,tz:camTarget.z};
      camTarget.set(0,1,0.5);theta=tTheta=0.25;phi=tPhi=0.92;radius=tRadius=13;
      document.getElementById('btnHouse').setAttribute('aria-pressed','true');document.getElementById('houseLbl').textContent='Go outside';
    }else{
      INSIDE.on=false;AI.inside=false;HUG_PLUSH.g.visible=false;if(AI.eyesClosed){AI.eyesClosed=false;caretaker.faceObj.drawFace(false);}
      INSIDE.scene.remove(caretaker.root);scene.add(caretaker.root);
      const p=POI.houseSteps;AI.x=p.x;AI.z=p.z;AI.yaw=0;AI.state='idle';AI.timer=1;AI.y=walkHeight(p.x,p.z);
      INSIDE.dogs.forEach((d,i)=>{d.inside=false;INSIDE.scene.remove(d.root);scene.add(d.root);const s=snapWalkable(p.x+(i?1.2:-1.2),p.z+1.4);d.x=s[0];d.z=s[1];d.state='follow';d.path=null;});INSIDE.dogs=[];
      if(OUTCAM){theta=tTheta=OUTCAM.theta;phi=tPhi=OUTCAM.phi;radius=tRadius=OUTCAM.radius;camTarget.set(OUTCAM.tx,OUTCAM.ty,OUTCAM.tz);}
      document.getElementById('btnHouse').setAttribute('aria-pressed','false');document.getElementById('houseLbl').textContent='Go inside';
    }
    if(fadeEl)setTimeout(()=>fadeEl.classList.remove('on'),60);
  },fadeEl?380:0);
}
let OUTCAM=null;
// the indoor camera: orbit the room from outside its walls; auto cam drifts slowly around Luna
function insideCam(dt){
  const E=INSIDE.ent;
  if(DIRECTOR.on&&idle>DIRECTOR.resumeAfter){tTheta+=dt*(orbit?0.07:0.025);tRadius=lerp(tRadius,E.state==='act'&&E.act==='hug'?8:11,Math.min(1,dt*0.6));tPhi=lerp(tPhi,0.9,Math.min(1,dt*0.6));
    if(DIRECTOR.lastLabel!=='inside'){DIRECTOR.lastLabel='inside';document.getElementById('shotLbl').innerHTML="Inside Luna's house";}}
  tRadius=clamp(tRadius,5,17);tPhi=clamp(tPhi,0.35,1.22);
  if(!FREE.on){const k=1-Math.exp(-dt*3.1);camTarget.x=lerp(camTarget.x,clamp(E.x*0.6,-4,4),k);camTarget.y=lerp(camTarget.y,1.0,k);camTarget.z=lerp(camTarget.z,clamp(E.z*0.6,-3,3),k);}
  camTarget.x=clamp(camTarget.x,-7,7);camTarget.z=clamp(camTarget.z,-5.5,5.5);
}

INSIDE_REF=INSIDE;

/* ================= controller mode: steer Luna yourself with a thumb stick (touch, keyboard or gamepad) =================
   Only active while "Controller" is switched on in the controls. The stick is a floating stick: touch anywhere on the
   left side and it centres under your thumb. A small dead zone and a smooth response curve keep slow walking precise,
   and pushing all the way makes her run. */
const CTRL={on:false,started:false,touch:{x:0,y:0},keys:new Set(),pad:{x:0,y:0},input:{x:0,y:0},m:0,gpPrev:[]};
const STICK_DZ=0.12,PAD_DZ=0.16;const id_knob=document.getElementById('stickKnob');
function stickCurve(x,y,dz){const m=Math.hypot(x,y);if(m<dz)return[0,0,0];const k=Math.min(1,(m-dz)/(1-dz)),c=Math.pow(k,1.25);return[x/m*c,y/m*c,c];}
function ctrlAction(kind){
  if(HOLD[followWho()]){toast((followWho()==='moon'?'Lady Moon':followWho()==='solon'?'Solon':'Luna')+' is paused. Turn Pause off to move.');return;}
  if(CTRL.on&&FOLLOW_SOLON){solonCtrlAction(kind);return;}
  if(CTRL.on&&FOLLOW_MOON){moonCtrlAction(kind);return;}
  if(!CTRL.on||AI.mAct)return;
  if(kind==='jump'){if(AI.jumpT<=0)AI.jumpT=0.62;return;}
  if(kind==='wave'){AI.mAct={act:'wave',t:2};emote(caretaker.headGroup,'note',0.85);for(const d of DOGS)if(d.state==='follow')d.happy=3;return;}
  if(kind==='pet'){let best=null,bd=2.8;for(const e of ALL_ANIMALS){if(e.inside||e.state==='onSwing')continue;const d=Math.hypot(e.x-AI.x,e.z-AI.z);if(d<bd){bd=d;best=e;}}
    if(!best){toast('Walk up to a pet to give them a cuddle');return;}
    best.prevState=best.state;best.state='petted';best.lastPet=simTime;AI.mAct={act:'pet',t:2.6,ent:best,em:0};AI.speed=0;return;}
  if(kind==='throw'){if(BALL.state!=='none')return;let dog=null,dd=16;for(const d of DOGS){const k=Math.hypot(d.x-AI.x,d.z-AI.z);if(d.state==='follow'&&k<dd){dd=k;dog=d;}}
    if(!dog){toast('Bring a pup along to play fetch');return;}AI.mAct={act:'throw',t:0.6,dog,thrown:false};}
}
function ctrlEndAct(){const a=AI.mAct;AI.mAct=null;
  if(a&&a.act==='pet'&&a.ent&&a.ent.state==='petted'){const e=a.ent;e.state=e.kind==='dog'?(e.prevState==='kennel'?'kennel':'follow'):'idle';e.timer=rnd(3,6);}}
function pollGamepad(){
  if(typeof navigator==='undefined'||!navigator.getGamepads)return;const gps=navigator.getGamepads();let gp=null;for(const g of gps)if(g&&g.connected){gp=g;break;}
  if(!gp){CTRL.pad.x=CTRL.pad.y=0;return;}
  CTRL.pad.x=gp.axes[0]||0;CTRL.pad.y=-(gp.axes[1]||0);
  const rx=gp.axes[2]||0,ry=gp.axes[3]||0;if(Math.abs(rx)>PAD_DZ){tTheta-=rx*0.045;idle=0;}if(Math.abs(ry)>PAD_DZ){tPhi=clamp(tPhi+ry*0.025,0.15,1.42);idle=0;}
  ['jump','pet','wave','throw'].forEach((k,i)=>{const p=!!(gp.buttons[i]&&gp.buttons[i].pressed);if(p&&!CTRL.gpPrev[i])ctrlAction(k);CTRL.gpPrev[i]=p;});
}
const _ctrlV=new T.Vector3();
function ctrlUpdate(dt,time){
  if(!CTRL.started){if(AI.state==='act')endAct();else if(AI.state==='walk')abortTask();AI.skyObj=null;AI.state='idle';CTRL.started=true;}
  pollGamepad();
  // combine touch stick, gamepad and keyboard, then calibrate (dead zone + response curve)
  let kx=0,ky=0;const K=CTRL.keys;if(K.has('a')||K.has('arrowleft'))kx--;if(K.has('d')||K.has('arrowright'))kx++;if(K.has('w')||K.has('arrowup'))ky++;if(K.has('s')||K.has('arrowdown'))ky--;
  let[x,y,m]=stickCurve(CTRL.touch.x,CTRL.touch.y,STICK_DZ);
  if(m===0){[x,y,m]=stickCurve(CTRL.pad.x,CTRL.pad.y,PAD_DZ);}
  if(m===0&&(kx||ky)){const l=Math.hypot(kx,ky);x=kx/l;y=ky/l;m=K.has('shift')?1:0.75;}
  CTRL.m=m;
  if(m>0){if(!STEER.held||!(DIRECTOR.on&&idle>DIRECTOR.resumeAfter))STEER.th=theta;STEER.held=true;}else STEER.held=false;
  if(id_knob&&!CTRL.touchHeld){const kr=(id_knob.parentNode.offsetWidth||120)*0.36;id_knob.style.transform=`translate(calc(-50% + ${(x*kr).toFixed(1)}px),calc(-50% + ${(-y*kr).toFixed(1)}px))`;}
  AI.jumpT=Math.max(0,(AI.jumpT||0)-dt);
  if(AI.mAct){const a=AI.mAct;a.t-=dt;AI.speed=lerp(AI.speed,0,Math.min(1,dt*10));AI.state='act';AI.act=a.act;AI.actT=(AI.actT||0)+dt;
    if(a.act==='pet'){const e=a.ent;AI.target={ent:e};AI.yaw+=normalizeAngle(Math.atan2(e.x-AI.x,e.z-AI.z)-AI.yaw)*Math.min(1,dt*8);faceLuna(e,dt);
      a.em-=dt;if(a.em<=0){a.em=0.8;emote(e.root,'heart',e.kind==='bunny'?0.65:e.kind==='dog'?0.95:0.8);}}
    if(a.act==='throw'&&!a.thrown&&a.t<0.3){a.thrown=true;const d=a.dog;let aim=null;
      for(let i=0;i<20&&!aim;i++){const ang=AI.yaw+rnd(-0.5,0.5),dist=rnd(5,8.5),px=AI.x+Math.sin(ang)*dist,pz=AI.z+Math.cos(ang)*dist;if(isCellOpen(px,pz))aim=[px,pz];}
      if(aim){DOG=d;caretaker.handR.getWorldPosition(BALL.from);BALL.target=aim;BALL.t=0;BALL.dur=0.75+Math.hypot(aim[0]-AI.x,aim[1]-AI.z)*0.05;BALL.state='flying';d.state='chase';d.repath=0;}}
    if(a.t<=0)ctrlEndAct();}
  else{AI.actT=0;
    let target=0;
    if(m>0){const th=STEER.th,fx=-Math.sin(th),fz=-Math.cos(th),rx=Math.cos(th),rz=-Math.sin(th);const dx=fx*y+rx*x,dz=fz*y+rz*x;
      AI.yaw+=normalizeAngle(Math.atan2(dx,dz)-AI.yaw)*Math.min(1,dt*10);target=(m>0.92?4.8:2.9)*Math.min(1,m/0.92);
      // the camera drifts behind her while she walks forward
      if(!FREE.on&&!DIRECTOR.on&&Math.abs(x)<0.45&&y>0.3)tTheta+=normalizeAngle(AI.yaw+Math.PI-tTheta)*dt*0.7;}
    AI.speed=lerp(AI.speed,target,Math.min(1,dt*(target>AI.speed?6:10)));
    if(AI.speed>0.02){const st=AI.speed*dt,nx=AI.x+Math.sin(AI.yaw)*st,nz=AI.z+Math.cos(AI.yaw)*st;
      if(standable(nx,nz)){AI.x=nx;AI.z=nz;}else{let ok=false;
        // slide along walls and fences instead of stopping dead
        for(const o of[0.5,-0.5,1.0,-1.0,1.4,-1.4]){const yy=AI.yaw+o,sx=AI.x+Math.sin(yy)*st*0.8,sz=AI.z+Math.cos(yy)*st*0.8;if(standable(sx,sz)){AI.x=sx;AI.z=sz;ok=true;break;}}
        if(!ok)AI.speed=Math.min(AI.speed,0.2);}}
    AI.state=AI.speed>0.15?'walk':'idle';AI.act=null;AI.target=null;AI.task=null;AI.path=[];}
  // a returned ball ends the game of fetch
  if(BRAIN.fetchReturned){BRAIN.fetchReturned=false;BALL.state='none';if(DOG.state==='sitWait')DOG.state='follow';emote(caretaker.headGroup,'heart',0.85);}
  poseLuna(dt,time);
}
function ctrlStatus(){const a=AI.mAct;if(a&&a.act==='pet')return 'Luna is cuddling '+a.ent.name;if(a&&a.act==='wave')return 'Luna is waving hello';if(a&&a.act==='throw')return 'Luna throws the ball!';
  if(BALL.state!=='none')return 'Fetch with '+DOG.name+'!';return AI.state==='walk'?(CTRL.m>0.92?'Luna is running':'You are walking Luna around'):'Luna is waiting for you';}
function setCtrl(v){
  if(v&&INSIDE.on){toast('Step outside to use controller mode');return;}
  CTRL.on=v;CTRL.started=false;CTRL.touch.x=CTRL.touch.y=0;CTRL.keys.clear();AI.mAct=null;
  document.body.classList.toggle('ctrl',v);document.getElementById('btnCtrl').setAttribute('aria-pressed',v);document.getElementById('pad').hidden=!v;
  if(v){if(HOLD[followWho()])setHold(followWho(),false,true);if(DIRECTOR.on)setAuto(false);if(FREE.on)setFree(false);orbit=false;document.getElementById('btnOrbit').setAttribute('aria-pressed','false');
    if(PLACE.active)cancelPlacing();if(CHOP.on)setChop(false);tRadius=11;tPhi=1.02;tTheta=focusBody().yaw+Math.PI;toast('Controller mode: left stick moves '+(FOLLOW_SOLON?'Solon':FOLLOW_MOON?'Lady Moon':'Luna')+' (press M to switch)');}
  else{if(AI.mAct)ctrlEndAct();AI.state='idle';AI.timer=1;AI.speed=0;LM.mAct=null;CTRL.moonStarted=false;if(LM.state!=='walk'){LM.state='idle';LM.timer=0.6;}
    if(CTRL.solonStarted||FOLLOW_SOLON){SL.mAct=null;CTRL.solonStarted=false;SL.state='idle';SL.timer=0.6;SL.speed=0;}}
}
(function padUI(){
  const pad=document.getElementById('pad'),zone=document.getElementById('stickZone'),base=document.getElementById('stickBase'),knob=document.getElementById('stickKnob');
  // The stick rests in the bottom-left corner. A thumb that lands on it steers from its centre; a thumb that lands
  // elsewhere in the left zone pulls the stick under it, and on release it glides back home.
  let id=null,cx=0,cy=0,r=60;
  const home=()=>{base.style.left=base.style.top='';base.style.bottom='';};
  const place=()=>{base.style.left=cx-r+'px';base.style.top=cy-r+'px';base.style.bottom='auto';};
  const knobTo=(dx,dy)=>{knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;};
  zone.addEventListener('pointerdown',e=>{if(id!==null)return;id=e.pointerId;try{zone.setPointerCapture(id);}catch(_){}e.preventDefault();
    home();const b=base.getBoundingClientRect();r=b.width/2;const hx=b.left+r,hy=b.top+r;
    if(Math.hypot(e.clientX-hx,e.clientY-hy)<=r*1.35){cx=hx;cy=hy;}
    else{cx=clamp(e.clientX,r+6,innerWidth-r-6);cy=clamp(e.clientY,r+6,innerHeight-r-6);place();}
    base.classList.add('on');pad.classList.add('used');CTRL.touchHeld=true;move(e);});
  const move=e=>{let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy);
    if(d>r){// let the stick follow a thumb that slides past the rim
      cx+=dx*(1-r/d);cy+=dy*(1-r/d);place();dx=e.clientX-cx;dy=e.clientY-cy;}
    CTRL.touch.x=dx/r;CTRL.touch.y=-dy/r;knobTo(dx,dy);};
  zone.addEventListener('pointermove',e=>{if(e.pointerId===id)move(e);});
  const end=e=>{if(e.pointerId!==id)return;id=null;CTRL.touchHeld=false;CTRL.touch.x=CTRL.touch.y=0;base.classList.remove('on');knobTo(0,0);home();};
  zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);zone.addEventListener('lostpointercapture',end);
  addEventListener('orientationchange',()=>{if(id!==null)end({pointerId:id});});
  pad.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();ctrlAction(b.dataset.act);b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),140);}));
  document.getElementById('ctrlExit').onclick=()=>setCtrl(false);
  document.getElementById('btnCtrl').onclick=()=>setCtrl(!CTRL.on);
  addEventListener('keydown',e=>{if(!CTRL.on||e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement)return;const k=e.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k)){CTRL.keys.add(k);e.preventDefault();}
    else if(k===' '){ctrlAction('jump');e.preventDefault();}else if(k==='e')ctrlAction('pet');else if(k==='q')ctrlAction('wave');else if(k==='t')ctrlAction('throw');else if(k==='escape')setCtrl(false);});
  addEventListener('keyup',e=>CTRL.keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{CTRL.keys.clear();CTRL.touch.x=CTRL.touch.y=0;});
})();

document.getElementById('btnHouse').onclick=()=>setInside(!INSIDE.on);
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement)return;if(e.key==='h'||e.key==='H')setInside(!INSIDE.on);});
const REDUCED_MOTION=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const btnAuto=document.getElementById('btnAuto'),shotChip=document.getElementById('shot');
function setFree(v){
  FREE.on=v;FREE.keys.clear();document.getElementById('btnFree').setAttribute('aria-pressed',v);
  if(v){if(DIRECTOR.on)setAuto(false);orbit=false;document.getElementById('btnOrbit').setAttribute('aria-pressed','false');}
  {const h=document.getElementById('camHint');if(!h.dataset.orig)h.dataset.orig=h.innerHTML;
   if(v)h.textContent='Free cam: drag to orbit, right-drag (or two fingers) to pan, scroll to zoom, WASD or arrows to fly, Q/E down and up.';else h.innerHTML=h.dataset.orig;}
  const who=followWho();
  toast(v?'Free cam: the camera stays wherever you put it':'The camera follows '+(who==='moon'?'Lady Moon':who==='solon'?'Solon':'Luna')+' again');
}
function setAuto(v){
  if(v&&FREE.on)setFree(false);
  DIRECTOR.on=v;btnAuto.setAttribute('aria-pressed',v);shotChip.classList.toggle('on',v);
  if(v){DIRECTOR.shot=null;DIRECTOR.lookInit=false;DIRECTOR.smoothYaw=focusBody().yaw;DIRECTOR.wideT=0;DIRECTOR.nextWide=rnd(14,22);DIRECTOR.stillT=0;DIRECTOR.fov=camera.fov;idle=99;DIRECTOR.lastLabel='';}
}
btnAuto.onclick=()=>setAuto(!DIRECTOR.on);
const CAST_NAME={luna:'Luna',moon:'Lady Moon',solon:'Solon'};
function setHold(who,v,quiet){
  HOLD[who]=!!v;
  if(who==='luna')STILL.on=HOLD.luna;
  syncCastUI();
  if(quiet)return;
  const n=CAST_NAME[who];
  if(HOLD[who]){const head=who==='solon'?solon.headGroup:who==='moon'?ladyMoon.headGroup:caretaker.headGroup;emote(head,'heart',0.85);toast(n+' will hold still until you turn Pause off');}
  else toast(n+' is moving again');
}
function setStill(v){setHold('luna',v);}

const btnMoon=document.getElementById('btnMoon');
function followWho(){return FOLLOW_SOLON?'solon':FOLLOW_MOON?'moon':'luna';}
function focusBody(){return FOLLOW_SOLON?SL:FOLLOW_MOON?LM:AI;}
function frameCast(){
  const S=focusBody();
  tTheta=S.yaw+Math.PI;tPhi=1.05;tRadius=9.2;
  CAM_SNAP=1;CAM_PULL=9.2;idle=0;
}
function syncCastUI(){
  const w=followWho();
  const follow={luna:'btnFollowLuna',moon:'btnFollowMoon',solon:'btnFollowSolon'};
  const hold={luna:'btnHoldLuna',moon:'btnHoldMoon',solon:'btnHoldSolon'};
  for(const k in follow){const b=document.getElementById(follow[k]);if(b)b.setAttribute('aria-pressed',k===w);}
  for(const k in hold){const b=document.getElementById(hold[k]);if(b)b.setAttribute('aria-pressed',HOLD[k]);}
  document.querySelectorAll('#ctrlBar [data-who]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.who===w));
  const ch=document.getElementById('ctrlHold');if(ch)ch.setAttribute('aria-pressed',HOLD[w]);
  const next=w==='luna'?'moon':w==='moon'?'solon':'luna';
  if(btnMoon){btnMoon.setAttribute('aria-pressed','false');btnMoon.title='Follow '+CAST_NAME[next]+' next (press M)';}
}
function setFollowWho(who){
  const prev=followWho(),same=prev===who;
  if(!same){
    if(CTRL.on){
      if(prev==='luna'){if(AI.mAct)ctrlEndAct();AI.state='idle';AI.timer=0.8;AI.speed=0;CTRL.started=false;}
      if(prev==='moon'){LM.mAct=null;CTRL.moonStarted=false;LM.state='idle';LM.timer=0.6;LM.speed=0;}
      if(prev==='solon'){SL.mAct=null;CTRL.solonStarted=false;SL.state='idle';SL.timer=0.6;SL.speed=0;}
    }
    FOLLOW_MOON=who==='moon';FOLLOW_SOLON=who==='solon';
    if(DIRECTOR.on){DIRECTOR.shot=null;DIRECTOR.wideT=0;DIRECTOR.stillT=0;DIRECTOR.smoothYaw=focusBody().yaw;DIRECTOR.lastLabel='';}
  }
  if(FREE.on)setFree(false);
  frameCast();
  syncCastUI();
  if(!same)toast(CTRL.on?('The controller now steers '+CAST_NAME[who]):('Camera is now following '+CAST_NAME[who]));
}
function cycleFollow(){const w=followWho();setFollowWho(w==='luna'?'moon':w==='moon'?'solon':'luna');}
if(btnMoon)btnMoon.onclick=()=>cycleFollow();
{const follow={btnFollowLuna:'luna',btnFollowMoon:'moon',btnFollowSolon:'solon'};
  for(const id in follow){const b=document.getElementById(id);if(b)b.onclick=()=>setFollowWho(follow[id]);}
  const hold={btnHoldLuna:'luna',btnHoldMoon:'moon',btnHoldSolon:'solon'};
  for(const id in hold){const b=document.getElementById(id);if(b)b.onclick=()=>setHold(hold[id],!HOLD[hold[id]]);}
  const g=document.getElementById('btnGather');if(g)g.onclick=()=>gatherNearby();
  document.querySelectorAll('#ctrlBar [data-who]').forEach(b=>b.addEventListener('click',()=>setFollowWho(b.dataset.who)));
  const ch=document.getElementById('ctrlHold');if(ch)ch.onclick=()=>setHold(followWho(),!HOLD[followWho()]);
  const cg=document.getElementById('ctrlGather');if(cg)cg.onclick=()=>gatherNearby();
  syncCastUI();
}
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement)return;if(e.key==='m'||e.key==='M')cycleFollow();});

addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement)return;
  if(e.key==='l'||e.key==='L')setHold(followWho(),!HOLD[followWho()]);
  else if(e.key==='g'||e.key==='G')gatherNearby();});
document.getElementById('btnFree').onclick=()=>setFree(!FREE.on);
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement)return;if(e.key==='c'||e.key==='C')setAuto(!DIRECTOR.on);else if(e.key==='f'||e.key==='F')setFree(!FREE.on);});


/* ================= Cinematic launch: a short film that plays when the Launch button is pressed =================
   Six shots cut together like a movie trailer: an establishing shot low over the water, a low angle over Luna's
   shoulder, a long-lens tracking shot that opens out as the blow grows, then a move from far away in to a closer
   view of the whole cloud. Letterbox bars, a title card, dips to black between cuts and a little handheld drift.
   The soundtrack is the video behind the scene. Only the Launch button starts it (the automatic first-dusk launch stays a normal view). */

/* Launch-film soundtrack: a video sits behind the island and plays with the first shot.
   It is cued at 1:56. This clip ends there, so it plays from the start and still covers the scene;
   a longer file begins at 1:56. The picture and the sound fade out together over 3 seconds when the
   scene ends or is skipped, the same moment the camera returns to the island.
   Uses Web Audio for the fades where it can (works on iPhone, where element volume is fixed); when the game is
   opened straight from disk (file://) browsers block Web Audio from reading the file, so it fades the element volume instead. */
const FILM_MUSIC=(function(){
  const M={el:null,gain:null,vol:0,target:0,rate:1,raf:0,wasPlaying:false};
  const IN=116; // 1:56
  const src=()=>(window.LUNA_ASSET_BASE||'')+'video/launch-backdrop.mp4';
  function apply(){if(M.gain)M.gain.gain.value=M.vol;else if(M.el)M.el.volume=clamp(M.vol,0,1);}
  let last=0;
  function settled(){document.body.classList.remove('launch-vid','launch-vid-out');if(M.el){M.el.pause();}}
  function tick(now){M.raf=0;const dt=last?Math.min(0.1,(now-last)/1000):0.016;last=now;
    const step=dt/M.rate;M.vol=M.target>M.vol?Math.min(M.target,M.vol+step):Math.max(M.target,M.vol-step);apply();
    if(M.vol===0&&M.target===0){settled();last=0;return;}
    if(M.vol!==M.target)M.raf=requestAnimationFrame(tick);else last=0;}
  function ramp(target,seconds){M.target=target;M.rate=Math.max(0.05,seconds)/Math.max(0.05,Math.abs(target-M.vol)||1);if(!M.raf){last=0;M.raf=requestAnimationFrame(tick);}}
  function cue(){
    const d=M.el.duration;
    const t=(isFinite(d)&&d>IN+2)?IN:0;
    M.el.dataset.cue=String(t);
    try{M.el.currentTime=t;}catch(e){}
  }
  function ensure(){
    if(M.el)return;
    const v=document.createElement('video');
    v.id='launchVid';v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
    v.preload='auto';v.src=src();v.loop=false;v.setAttribute('aria-hidden','true');
    document.body.insertBefore(v,document.body.firstChild);
    M.el=v;
    if(location.protocol!=='file:'){ensureAudio();
      if(AUDIO.ctx){try{const node=AUDIO.ctx.createMediaElementSource(M.el);M.gain=AUDIO.ctx.createGain();M.gain.gain.value=0;node.connect(M.gain).connect(AUDIO.ctx.destination);}catch(e){M.gain=null;}}}
  }
  return {
    play(){ensure();if(AUDIO.ctx&&AUDIO.ctx.state==='suspended')AUDIO.ctx.resume();
      document.body.classList.remove('launch-vid-out');document.body.classList.add('launch-vid');
      M.vol=0;apply();
      const arm=()=>cue();
      if(M.el.readyState>=1)arm();else M.el.addEventListener('loadedmetadata',arm,{once:true});
      const p=M.el.play();if(p&&p.catch)p.catch(()=>{});ramp(0.9,1.2);},
    fadeOut(seconds=3){document.body.classList.remove('launch-vid');document.body.classList.add('launch-vid-out');
      if(M.el&&!M.el.paused)ramp(0,seconds);else settled();},
    pauseForTab(hidden){if(!M.el)return;if(hidden){M.wasPlaying=!M.el.paused;if(M.wasPlaying)M.el.pause();}else if(M.wasPlaying){const p=M.el.play();if(p&&p.catch)p.catch(()=>{});M.wasPlaying=false;}}
  };
})();
const CINE=(function(){
  const SHOTS=[
    {id:'establish',t0:0,t1:5.2},{id:'shoulder',t0:5.2,t1:11},{id:'track',t0:11,t1:19.5},
    {id:'crane',t0:19.5,t1:31},{id:'react',t0:31,t1:38},{id:'reveal',t0:38,t1:46}];
  const END=46;
  const ui={};
  function el(tag,id,cls,html){const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;if(html)e.innerHTML=html;document.body.appendChild(e);return e;}
  ui.top=el('div','cineTop','cine-bar top');ui.bot=el('div','cineBot','cine-bar bot');ui.vig=el('div','cineVig');
  ui.title=el('div','cineTitle','', '<span class="k">Luna&#8217;s Island</span><span class="s">Twilight Launch</span>');
  ui.fade=el('div','cineFade');
  ui.skip=el('button','cineSkip','', 'Skip &#9656;');ui.skip.type='button';ui.skip.setAttribute('aria-label','Skip the launch film');
  const C={on:false,pending:false,t:0,shot:-1,dP:new T.Vector3(),side:new T.Vector3(),sideSign:1,base:new T.Vector3(),
    pos:new T.Vector3(),look:new T.Vector3(),smLook:new T.Vector3(),fov:40,cutT:-9,shake:0};
  const v=new T.Vector3(),w=new T.Vector3(),head=new T.Vector3(),cPos=new T.Vector3(),cLook=new T.Vector3(),hdir=new T.Vector3();
  // camera sits on the island side of the cloud, `dist` away, `drop` of that distance below it, swung by `arc`.
  // kept inside the mountain ring so a ridge never slides in front of the show.
  function placeSpectacle(dist,arc,drop){
    const L=SPACE_LAUNCH;
    cLook.copy(L.cloudCenter&&L.cloudCenter.lengthSq()>400?L.cloudCenter:L.focus.position);
    hdir.set(AI.x-cLook.x,0,AI.z-cLook.z);
    if(hdir.lengthSq()<9)hdir.set(-cLook.x,0,-cLook.z);
    if(hdir.lengthSq()<1)hdir.set(-1,0,0.25);
    hdir.normalize().applyAxisAngle(_up,arc);
    const dropY=dist*drop,horiz=Math.sqrt(Math.max(4,dist*dist-dropY*dropY));
    cPos.set(cLook.x+hdir.x*horiz,Math.max(42,cLook.y-dropY),cLook.z+hdir.z*horiz);
    const rad=Math.hypot(cPos.x,cPos.z);
    if(rad>245){const s=245/rad;cPos.x*=s;cPos.z*=s;}
  }
  function groundClamp(p,m=0.6){const g=Math.max(meshH(p.x,p.z),0.4)+m;if(p.y<g)p.y=g;return p;}
  function dip(){ui.fade.classList.add('on');setTimeout(()=>ui.fade.classList.remove('on'),170);}
  function start(){
    if(INSIDE.on){C.pending=true;setInside(false);return;}
    C.on=true;C.pending=false;C.t=0;C.shot=-1;
    if(PLACE.active)cancelPlacing();if(CHOP.on)setChop(false);
    for(const id of['closet','market']){const p=document.getElementById(id);if(p&&!p.hidden){p.hidden=true;}}
    // Luna stops what she's doing and watches the whole show
    if(!CTRL.on){if(AI.state==='act')endAct();else if(AI.state==='walk')abortTask();
      AI.saved={state:'idle',timer:2};AI.state='skylook';AI.skyT=END;AI.skyObj=SPACE_LAUNCH.focus;AI.lastSky=simTime;}
    // direction from Luna out to the launch pad, and a side vector for framing
    C.dP.set(SPACE_LAUNCH.pad.x-AI.x,0,SPACE_LAUNCH.pad.z-AI.z).normalize();C.side.set(-C.dP.z,0,C.dP.x);
    // pick the shoulder side with the clearer view
    const bl=k=>camBlocked(AI.x-C.dP.x*3+C.side.x*1.2*k,AI.y+1.2,AI.z-C.dP.z*3+C.side.z*1.2*k,AI.x+C.dP.x*20,AI.y+8,AI.z+C.dP.z*20);
    C.sideSign=bl(1)<=bl(-1)?1:-1;
    document.body.classList.add('cine');C.smLook.copy(SPACE_LAUNCH.pad).setY(10);
    FILM_MUSIC.play();
  }
  function stop(){
    if(!C.on&&!C.pending)return;
    C.on=false;C.pending=false;document.body.classList.remove('cine');ui.title.classList.remove('on');
    FILM_MUSIC.fadeOut(3);
    if(AI.state==='skylook'&&AI.skyObj===SPACE_LAUNCH.focus)AI.skyT=Math.min(AI.skyT,3);
    // hand the camera back smoothly from wherever the film left it, at a comfortable distance from Luna
    camTarget.set(AI.x,AI.y+1.2,AI.z);_cp.subVectors(camera.position,camTarget);
    radius=tRadius=clamp(_cp.length(),12,60);phi=tPhi=clamp(Math.acos(clamp(_cp.y/(_cp.length()||1),-1,1)),0.15,1.42);theta=tTheta=Math.atan2(_cp.x,_cp.z);
    DIRECTOR.lookInit=false;applyTOD(tod);
  }
  ui.skip.onclick=()=>stop();
  addEventListener('keydown',e=>{if(e.key==='Escape'&&(C.on||C.pending)){stop();e.stopImmediatePropagation();}},true);

  function shotFrame(id,k,lt){   // k = 0..1 through the shot, lt = launch time
    const L=SPACE_LAUNCH,eng=L.focus.position,aim=L.aim,d=C.dP,sd=w.copy(C.side).multiplyScalar(C.sideSign);
    head.set(AI.x,AI.y+1.45,AI.z);
    switch(id){
      case 'establish':{ // low over the water off the shore, slow push toward the glowing pad
        C.pos.set(d.x*76,0,d.z*76).addScaledVector(sd,10).addScaledVector(d,k*10);C.pos.y=3.2+k*1.6;
        C.look.copy(L.pad).setY(14+eng.y*0.6);C.fov=34-k*4;C.shake=0.15;break;}
      case 'shoulder':{  // low angle over Luna's shoulder, the rocket climbing past her
        C.pos.copy(head).addScaledVector(d,-2.6).addScaledVector(sd,1.0-k*0.35);C.pos.y=AI.y+0.95+k*0.25;
        C.look.copy(eng);C.fov=52;C.shake=0.25;break;}
      case 'track':{     // long lens at first, then a wide view back inside the ring so the whole cloud fits
        const open=smooth(0.05,0.55,k);
        const fovTight=lerp(16,28,smooth(0.35,1,k));
        C.pos.copy(head).addScaledVector(d,-30).addScaledVector(sd,-12);C.pos.y=AI.y+9;
        placeSpectacle(lerp(460,360,open),lerp(0.04,0.18,k),0.30);
        C.pos.lerp(cPos,open);C.look.copy(eng).lerp(cLook,open);C.fov=lerp(fovTight,50,open);C.shake=lerp(0.55,0.08,open);break;}
      case 'crane':{     // from that far view, a slow dolly closer, the whole plume still in frame
        placeSpectacle(lerp(360,230,smooth(0,1,k)),lerp(0.18,-0.12,k),lerp(0.30,0.16,k));
        C.pos.copy(cPos);C.look.copy(cLook);C.fov=lerp(50,44,k);C.shake=0.06;break;}
      case 'react':{     // closer still, the photograph large in the sky
        placeSpectacle(lerp(230,185,k),lerp(-0.12,0.08,k),0.14);
        C.pos.copy(cPos);C.look.copy(cLook);C.fov=lerp(44,40,k);C.shake=0.06;break;}
      case 'reveal':{    // ease back and up as the cloud thins, still clear of the mountains
        placeSpectacle(lerp(200,340,smooth(0,1,k)),lerp(0.08,0.22,k),lerp(0.14,0.22,k));
        C.pos.copy(cPos);C.look.copy(cLook);C.fov=lerp(42,54,k);C.shake=0.05;break;}
    }
  }
  function update(dt){
    if(C.pending&&!INSIDE.on)start();
    if(!C.on)return false;
    const lt=SPACE_LAUNCH.time;C.t=lt;
    if(!SPACE_LAUNCH.active||lt>=END){stop();return false;}
    let si=SHOTS.length-1;for(let i=0;i<SHOTS.length;i++)if(lt<SHOTS[i].t1){si=i;break;}
    const S=SHOTS[si],k=clamp((lt-S.t0)/(S.t1-S.t0),0,1);
    const cut=si!==C.shot;if(cut&&C.shot>=0)dip();
    C.shot=si;shotFrame(S.id,k,lt);
    groundClamp(C.pos,0.7);
    if((S.id==='shoulder'||S.id==='react')&&solidAt(C.pos.x,C.pos.y,C.pos.z))C.pos.y+=1.4;   // never film from inside a wall or tree
    // handheld drift
    const sh=C.shake,tt=lt;C.pos.x+=Math.sin(tt*1.7)*0.05*sh+Math.sin(tt*4.1)*0.02*sh;C.pos.y+=Math.sin(tt*2.3+1)*0.04*sh;
    camera.position.copy(C.pos);
    if(cut)C.smLook.copy(C.look);else C.smLook.lerp(C.look,1-Math.exp(-dt*(S.id==='track'?2.2:4)));
    camera.lookAt(C.smLook);
    if(Math.abs(camera.fov-C.fov)>0.01){camera.fov=cut?C.fov:lerp(camera.fov,C.fov,1-Math.exp(-dt*3));camera.updateProjectionMatrix();}
    // title card over the opening shot
    ui.title.classList.toggle('on',lt>0.8&&lt<4.6);
    if(bloom){
      const cover=SPACE_LAUNCH.cloudCover||0;
      if(cover<0.04){bloom.strength=Math.max(bloom.strength,0.95);bloom.radius=Math.max(bloom.radius,0.75);}
      else{bloom.strength=lerp(0.9,0.34,cover);bloom.radius=lerp(0.7,0.38,cover);bloom.threshold=lerp(0.66,0.88,cover);}
    }
    idle=0;return true;
  }
  return {start,stop,update,get on(){return C.on;}};
})();
const _up=new T.Vector3(0,1,0),_cineMid=new T.Vector3();

/* ---------------- UI ---------------- */
const slider=document.getElementById('tod'),bDay=document.getElementById('btnDay'),bNight=document.getElementById('btnNight'),bOrbit=document.getElementById('btnOrbit');
let dragging=false;
slider.addEventListener('input',()=>{dragging=true;todTarget=slider.value/1000;});
slider.addEventListener('change',()=>{dragging=false;});
function setPressed(){bDay.setAttribute('aria-pressed',todTarget<0.5);bNight.setAttribute('aria-pressed',todTarget>=0.5);}
bDay.onclick=()=>{todTarget=0;setPressed();};bNight.onclick=()=>{todTarget=1;setPressed();};
  document.getElementById('btnLaunch').onclick=()=>{todTarget=1;setPressed();SPACE_LAUNCH.trigger(true);CINE.start();};
bOrbit.onclick=()=>{orbit=!orbit;bOrbit.setAttribute('aria-pressed',orbit);
  if(orbit&&(tRadius>70||radius>70)){tRadius=28;tPhi=0.92;}
  toast(orbit?'Slow orbit on: the camera circles gently whenever you let go':'Slow orbit off: the camera stays where you put it');};
document.getElementById('btnClean').onclick=()=>document.body.classList.add('clean');
{const mb=document.getElementById('btnMore'),dk=document.querySelector('.dock');mb.onclick=()=>{const o=!dk.classList.contains('open');dk.classList.toggle('open',o);mb.textContent=o?'Less':'More';mb.setAttribute('aria-expanded',o);};}
const bRain=document.getElementById('btnRain'),bSnow=document.getElementById('btnSnow');
function setWeather(storm,snow){WEATHER.storm=storm;WEATHER.snow=snow;bRain.setAttribute('aria-pressed',storm);bSnow.setAttribute('aria-pressed',snow);if(storm)ensureAudio();}
bRain.onclick=()=>setWeather(!WEATHER.storm,false);
bSnow.onclick=()=>setWeather(false,!WEATHER.snow);
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.repeat||e.target instanceof HTMLInputElement)return;if(e.key==='r'||e.key==='R')setWeather(!WEATHER.storm,false);else if(e.key==='n'||e.key==='N')setWeather(false,!WEATHER.snow);});
const statusEl=document.getElementById('status');let statusT=0;
document.getElementById('restore').onclick=()=>document.body.classList.remove('clean');
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){orbit=false;bOrbit.setAttribute('aria-pressed','false');}
function makeDraggable(el, handle) {
  let isDragging=false,startX,startY,origX,origY;
  handle.style.touchAction='none';
  handle.addEventListener('pointerdown', e => {
    if(e.target.closest('button')) return;
    isDragging=true; startX=e.clientX; startY=e.clientY;
    const rect=el.getBoundingClientRect(); origX=rect.left; origY=rect.top;
    el.style.width=rect.width+'px';
    el.style.bottom='auto'; el.style.right='auto'; el.style.transform='none';
    el.style.left=origX+'px'; el.style.top=origY+'px'; el.style.margin='0';
    handle.setPointerCapture(e.pointerId); e.preventDefault();
  });
  handle.addEventListener('pointermove', e => {
    if(!isDragging) return;
    let nx=origX+(e.clientX-startX), ny=origY+(e.clientY-startY);
    nx=Math.max(0, Math.min(nx, innerWidth-el.offsetWidth)); ny=Math.max(0, Math.min(ny, innerHeight-el.offsetHeight));
    el.style.left=nx+'px'; el.style.top=ny+'px';
  });
  const end=e=>{if(isDragging){isDragging=false;handle.releasePointerCapture(e.pointerId);}};
  handle.addEventListener('pointerup',end); handle.addEventListener('pointercancel',end);
}
const dockEl=document.querySelector('.dock');
const dockHandle=document.createElement('div'); dockHandle.className='drag-handle';
dockHandle.innerHTML='<span>Controls</span><div class="header-actions"><button type="button" class="min-btn" aria-label="Minimize">−</button></div>';
dockEl.insertBefore(dockHandle,dockEl.firstChild); makeDraggable(dockEl,dockHandle);
dockHandle.querySelector('.min-btn').onclick=()=>dockEl.classList.toggle('panel-minimized');
['closet','market'].forEach(id=>{
  const p=document.getElementById(id), h=p.querySelector('header'), acts=document.createElement('div');
  acts.className='header-actions';
  const minB=document.createElement('button'); minB.type='button'; minB.className='min-btn'; minB.textContent='−';
  minB.onclick=()=>p.classList.toggle('panel-minimized'); acts.appendChild(minB);
  acts.appendChild(h.querySelector('.closet-close')); h.appendChild(acts);
  makeDraggable(p,h);
});

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  if(composer)composer.setSize(innerWidth,innerHeight);});


/* =====================================================================================================
   BRAIN 2.0: shared island awareness, needs for every creature, cooperative problem solving
   -----------------------------------------------------------------------------------------------------
   ISLAND is a blackboard every character reads: where the mess is, which bowls are empty, which pets are
   hungry or lonely, and who has claimed which job (so Luna and Lady Moon never do the same chore at once).
   ===================================================================================================== */
const ISLAND=(function(){
  const claims=new Map();
  const I={
    claim(key,who,sec){claims.set(key,{who,until:simTime+sec});},
    claimedBy(key){const c=claims.get(key);if(!c)return null;if(c.until<simTime){claims.delete(key);return null;}return c.who;},
    free(key,who){const c=this.claimedBy(key);return !c||c===who;},
    release(key,who){const c=claims.get(key);if(c&&(!who||c.who===who))claims.delete(key);},
    bowls:[{id:'corner',x:26.5,z:5.2,food:0.7},{id:'yard',x:-34.9,z:35.2,food:0.7}],
    mess:[]
  };
  // ---- mess that builds up around the island (fallen leaves, petals, dust, muddy paw prints) ----
  const SPOTS=[['veranda','the veranda',POI.veranda],['steps','the front steps',POI.houseSteps],['corner','the pet corner',POI.petCorner],
    ['market','the market stall',POI.market],['pier','the pier',POI.pier],['shrine','the shrine path',POI.shrine]];
  const PER=16,litterGeo=new T.PlaneGeometry(0.17,0.11);
  const litter=new T.InstancedMesh(litterGeo,new T.MeshStandardMaterial({side:T.DoubleSide,roughness:0.9}),SPOTS.length*PER);
  litter.frustumCulled=false;litter.receiveShadow=true;litter.userData.noWx=true;scene.add(litter);
  const pal=CAL.season==='autumn'?['#c8402a','#e8862a','#e9c046','#a0662c']:CAL.season==='spring'?['#f7c6d9','#f3b3cb','#ffffff','#e8d9b8']:
    CAL.season==='winter'?['#8a6a52','#9a8a7a','#c9c4b8']:['#6a8a3a','#8a6a40','#a89a6a'];
  const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(1,1,1),col=new T.Color();
  SPOTS.forEach(([id,label,p],si)=>{
    const s={id,label,x:p.x,z:p.z,look:p.look,dirt:R(0.15,0.55),shown:-1,si,pts:[]};
    for(let k=0;k<PER;k++){const a=R(0,6.28),r=Math.sqrt(R(0.05,1))*1.6;s.pts.push([p.x+Math.cos(a)*r,p.z+Math.sin(a)*r,R(0,6.28)]);
      litter.setColorAt(si*PER+k,col.set(pal[k%pal.length]));}
    I.mess.push(s);});
  litter.instanceColor.needsUpdate=true;
  function drawMess(s){const n=Math.round(s.dirt*PER);if(n===s.shown)return;s.shown=n;
    for(let k=0;k<PER;k++){const i=s.si*PER+k,[x,z,r]=s.pts[k];
      if(k<n){e.set(-Math.PI/2,0,r);m4.compose(v.set(x,walkHeight(x,z)+0.035,z),q.setFromEuler(e),sc);}else m4.makeScale(0,0,0);
      litter.setMatrixAt(i,m4);}
    litter.instanceMatrix.needsUpdate=true;}
  I.mess.forEach(drawMess);
  const seasonK=CAL.season==='autumn'?1.8:CAL.season==='spring'?1.3:1;
  let acc=0;
  I.update=function(dt){
    acc+=dt;if(acc<0.5)return;const st=acc;acc=0;
    for(const s of I.mess){
      let rate=0.0009*seasonK+0.0012*WEATHER.rainK+(s.id==='corner'?0.0005:0);
      // paws and feet bring in more mess where the animals hang out
      for(const a of ALL_ANIMALS)if(!a.inside&&Math.abs(a.x-s.x)<3&&Math.abs(a.z-s.z)<3)rate+=0.00015;
      s.dirt=Math.min(1,s.dirt+rate*st);drawMess(s);}
    for(const a of ALL_ANIMALS){a.hunger=Math.min(1,(a.hunger||0)+st*(a.kind==='dog'?0.0016:0.0019));a.lonely=Math.min(1,(a.lonely||0)+st*(a.kind==='dog'?0.0026:0.002));}
    for(const k in MOON_NEEDS)MOON_NEEDS[k]=Math.min(1,MOON_NEEDS[k]+MOON_RATES[k]*st);
  };
  I.drawMess=drawMess;
  return I;
})();
for(const a of ALL_ANIMALS){a.hunger=R(0.1,0.45);a.lonely=R(0.2,0.55);}
function nearestBowl(x,z,needFood){let best=null,bd=1e9;for(const b of ISLAND.bowls){if(needFood&&b.food<0.15)continue;const d=Math.hypot(b.x-x,b.z-z);if(d<bd){bd=d;best=b;}}return best;}
function bestMess(who,x,z){let best=null,bs=0;
  for(const s of ISLAND.mess){if(s.dirt<0.42||!ISLAND.free('mess_'+s.id,who))continue;const sc=s.dirt/(1+Math.hypot(s.x-x,s.z-z)/45);if(sc>bs){bs=sc;best=s;}}return best;}
function mostNeedy(field,who,x,z,maxD,filter){let best=null,bs=0;
  for(const a of ALL_ANIMALS){if(a.inside||SKIP_STATES.has(a.state)||a.state==='petted'||a.state==='kennel'||a.state==='toKennel')continue;if(filter&&!filter(a))continue;
    if(!ISLAND.free('pet_'+a.name,who))continue;const d=Math.hypot(a.x-x,a.z-z);if(d>maxD)continue;const sc=(a[field]||0)/(1+d/30);if(sc>bs){bs=sc;best=a;}}return best;}

/* ---------- props: brooms for both of them ---------- */
function makeBroom(parent,x,y,z){
  const g=new T.Group();g.position.set(x,y,z);g.visible=false;parent.add(g);
  const pole=blob(g,CYL,mStd('#b5864a',{roughness:0.8}),0,-0.42,0.1,0.022,1.15,0.022);pole.rotation.x=0.22;
  const head=blob(g,BOX,mStd('#d9b65a',{roughness:1}),0,-1.0,0.24,0.26,0.2,0.08);head.rotation.x=0.22;
  blob(g,BOX,mStd('#c63a2f'),0,-0.89,0.215,0.27,0.04,0.09,false).rotation.x=0.22;
  return g;}
PROPS.broom=makeBroom(caretaker.rightArm,0.25,-0.45,0.06);
const MOON_BROOM=makeBroom(ladyMoon.rightArm,0.245,-0.4,0.03);
solon.broom=makeBroom(solon.rightArm,0.24,-0.42,0.05);

/* ---------- dogs: zoomies (a chase game around a friend) ---------- */
function startZoomies(d,cx,cz,dur){d.state='zoomies';d.zoom={cx,cz,ang:Math.atan2(d.z-cz,d.x-cx),r:rnd(1.8,2.6),t:dur,dir:Math.random()<0.5?1:-1};d.happy=4;d.lonely=Math.max(0,(d.lonely||0)-0.5);emote(d.root,'heart',0.95);}
function zoomiesUpdate(d,dt,time){
  const Z=d.zoom;Z.t-=dt;Z.ang+=Z.dir*dt*2.1;const r=Z.r+Math.sin(time*1.7)*0.4;
  let tx=Z.cx+Math.cos(Z.ang)*r,tz=Z.cz+Math.sin(Z.ang)*r;if(!isCellOpen(tx,tz)){Z.dir*=-1;Z.ang+=Z.dir*0.3;tx=d.x;tz=d.z;}
  const dx=tx-d.x,dz=tz-d.z,dd=Math.hypot(dx,dz);
  if(dd>0.05){const sp=Math.min(dd/dt,5.2);d.yaw+=normalizeAngle(Math.atan2(dx,dz)-d.yaw)*Math.min(1,dt*10);d.x+=dx/dd*sp*dt;d.z+=dz/dd*sp*dt;d.moving=sp;}
  d.happy=2;if(Math.random()<dt*0.5)emote(d.root,Math.random()<0.6?'heart':'note',0.95,1.3,0.5);
  if(Z.t<=0){d.state='follow';d.path=null;d.zoom=null;d.idlePose='sit';}
}

/* ---------- pets: eating from bowls, begging, seeking company, shelter and naps ---------- */
function humanNear(x,z){
  const cands=[
    {who:'luna',x:AI.x,z:AI.z,d:Math.hypot(AI.x-x,AI.z-z)},
    {who:'moon',x:LM.x,z:LM.z,d:LM.inside?1e9:Math.hypot(LM.x-x,LM.z-z)},
    {who:'solon',x:SL.x,z:SL.z,d:SL.inside?1e9:Math.hypot(SL.x-x,SL.z-z)}
  ];
  cands.sort((a,b)=>a.d-b.d);return cands[0];
}
function petThink(e){   // called when an idle pet decides what to do next; returns true if it chose something
  const wet=WEATHER.rainK>0.4,night=nightK>0.62;
  if(e.hunger>0.62){const b=nearestBowl(e.x,e.z,true);
    if(b&&Math.hypot(b.x-e.x,b.z-e.z)<70){const[tx,tz]=snapWalkable(b.x+rnd(-0.6,0.6),b.z+rnd(0.4,0.9));e.path=planPath(e.x,e.z,tx,tz);e.wp=0;e.state='toBowl';e.bowl=b;e.timer=30;return true;}
    const h=humanNear(e.x,e.z);   // bowls are empty: go and ask a human for dinner
    if(h.d<30){e.state='approach';e.goal=h.who;e.beg=true;e.repath=0;e.timer=14;emote(e.root,'food',e.kind==='bunny'?0.65:0.8);return true;}}
  if(!wet&&!night&&e.lonely>0.68){const h=humanNear(e.x,e.z);if(h.d<26){e.state='approach';e.goal=h.who;e.beg=false;e.repath=0;e.timer=14;return true;}}
  if((wet||night)&&e.kind==='cat'&&Math.random()<0.6){   // cats curl up somewhere cozy when it's dark or wet
    const sp=Math.random()<0.5?POI.petBed:POI.veranda,[tx,tz]=randomSpotNear(sp.x,sp.z,1.6);e.path=planPath(e.x,e.z,tx,tz);e.wp=0;e.state='wander';e.timer=25;e.napAfter=true;return true;}
  return false;
}
function petsStartle(){for(const e of ALL_ANIMALS){if(e.inside||SKIP_STATES.has(e.state)||e.state==='kennel'||e.state==='toKennel'||e.state==='petted')continue;
  if(Math.random()<0.7){emote(e.root,'!',e.kind==='bunny'?0.65:e.kind==='dog'?0.95:0.8,1.2,0.55);
    if(e.kind!=='dog'){const[tx,tz]=randomSpotNear(e.home[0],e.home[1],2);e.path=planPath(e.x,e.z,tx,tz);e.wp=0;e.state='wander';e.timer=14;e.flee=1.6;}}}}

/* ---------- Luna: new jobs she can choose by herself ---------- */
NEEDS.social=0.35;RATES.social=0.005;NEEDS.tidy=0;RATES.tidy=0;
TASKS.push(
  {id:'sweep',need:'tidy',dynamic:'sweep',act:'sweep',dur:[7,10],sat:0,w:1.15},
  {id:'chase',need:'play',dynamic:'chase',act:'chase',dur:[9,13],sat:0.6,w:1.05,day:true,dry:true},
  {id:'visitMoon',need:'social',dynamic:'moon',act:'chat',dur:[6,9],sat:0.9,w:1.0},
  {id:'brushDog',need:'pets',dynamic:'brush',act:'pet',dur:[5,7],sat:0.35,w:0.9}
);
BRAIN.fail={};BRAIN.stuck=[];
const _resolveTarget0=resolveTarget;
resolveTarget=function(tk){
  if(tk.dynamic==='sweep'){const s=bestMess('luna',AI.x,AI.z);if(!s)return null;const[x,z]=snapWalkable(s.x,s.z);return{x,z,look:s.look,mess:s,urg:0.2+s.dirt*0.95,rid:'sw_'+s.id};}
  if(tk.dynamic==='chase'){if(BALL.state!=='none')return null;let dog=null,dd=12;for(const d of DOGS){const k=Math.hypot(d.x-AI.x,d.z-AI.z);if(d.state==='follow'&&k<dd){dd=k;dog=d;}}
    if(!dog)return null;const[x,z]=randomSpotNear(AI.x,AI.z,4);let open=0;for(let k=0;k<8;k++){const a=k*0.785;if(isCellOpen(x+Math.sin(a)*2.6,z+Math.cos(a)*2.6))open++;}
    if(open<7)return null;return{x,z,dog,urg:NEEDS.play*0.8+(dog.lonely||0)*0.45};}
  if(tk.dynamic==='moon'){if(LM.inside||CTRL.on&&FOLLOW_MOON)return null;const d=Math.hypot(LM.x-AI.x,LM.z-AI.z);if(d>60)return null;
    if(LM.state==='act'&&['tend','sweep'].includes(LM.act))return null;
    const[x,z]=randomSpotNear(LM.x,LM.z,1.7,1.2);return{x,z,look:[LM.x,LM.z],moon:true,urg:NEEDS.social};}
  if(tk.dynamic==='brush'){const d=mostNeedy('lonely','luna',AI.x,AI.z,30,a=>a.kind==='dog'&&a.state==='follow');if(!d||d.lonely<0.45)return null;
    return{x:d.x,z:d.z,ent:d,urg:0.3+d.lonely*0.8,label:'Brushing '+d.name+"'s fur"};}
  if(tk.dynamic==='pet'){   // the loneliest friend nearby, not just the closest
    const a=mostNeedy('lonely','luna',AI.x,AI.z,32,x=>x.kind!=='dog'||x.state==='follow');if(!a||simTime-(a.lastPet||-99)<45)return null;
    return{x:a.x,z:a.z,ent:a,urg:0.25+a.lonely*0.85};}
  const t=_resolveTarget0(tk);
  if(t&&tk.act==='feed'){   // feeding is driven by real hunger and empty bowls
    const b=tk.poi==='yard'?ISLAND.bowls[1]:ISLAND.bowls[0];let hungry=0,beg=0;
    for(const a of ALL_ANIMALS){if(Math.hypot(a.x-b.x,a.z-b.z)<28||a.beg){hungry=Math.max(hungry,a.hunger||0);if(a.beg)beg=0.35;}}
    t.bowl=b;t.urg=0.15+Math.max(hungry,(1-b.food)*0.7)*0.95+beg;t.rid=tk.id;}
  return t;
};
const _chooseTask0=chooseTask;
chooseTask=function(){
  // skip jobs that recently failed (blocked path, gone target) so she doesn't keep bumping into the same problem
  const saved=TASKS.slice();for(let i=TASKS.length-1;i>=0;i--){const id=TASKS[i].id;if(BRAIN.fail[id]&&BRAIN.fail[id]>simTime)TASKS.splice(i,1);}
  let c=_chooseTask0();TASKS.length=0;TASKS.push(...saved);
  if(c&&BRAIN.fail[c.rid]&&BRAIN.fail[c.rid]>simTime)c=null;
  if(c&&c.tgt.mess)ISLAND.claim('mess_'+c.tgt.mess.id,'luna',40);
  if(c&&c.tgt.ent)ISLAND.claim('pet_'+c.tgt.ent.name,'luna',25);
  if(c&&c.tgt.bed)ISLAND.claim('bed_'+c.tgt.bed.type+c.tgt.bed.i,'luna',40);
  return c;
};
const _abortTask0=abortTask;
abortTask=function(){
  if(AI.task&&AI.state==='walk'&&(AI.stuckN>2||AI.retries>3)){const rid=AI.lastRid||AI.task.id;BRAIN.fail[rid]=simTime+75;
    BRAIN.stuck.push(simTime);BRAIN.stuck=BRAIN.stuck.filter(t=>simTime-t<40);
    // stuck again and again: step back onto open ground and think again
    if(BRAIN.stuck.length>=3&&!AI.inside){const s=snapWalkable(AI.x,AI.z);AI.x=s[0];AI.z=s[1];BRAIN.stuck.length=0;emote(caretaker.headGroup,'?',0.85,1.4,0.55);}}
  _abortTask0();
};
const _startTask0=startTask;
startTask=function(c){AI.lastRid=c.rid;_startTask0(c);};
const _beginAct0=beginAct;
beginAct=function(){
  _beginAct0();
  const tg=AI.target;if(!tg)return;
  if(AI.act==='feed'&&tg.bowl){tg.bowl.food=1;for(const a of ALL_ANIMALS){if(a.beg)a.beg=false;if(Math.hypot(a.x-AI.x,a.z-AI.z)<16)a.hunger=Math.min(a.hunger,0.2);}}
  if(AI.act==='sweep'&&tg.mess){tg.start=tg.mess.dirt;emote(caretaker.headGroup,'leaf',0.85);}
  if(AI.act==='chase'&&tg.dog){tg.cx=AI.x;tg.cz=AI.z;tg.ang=0;startZoomies(tg.dog,AI.x,AI.z,AI.timer+0.5);
    for(const d of DOGS)if(d!==tg.dog&&d.state==='follow'&&Math.hypot(d.x-AI.x,d.z-AI.z)<10)startZoomies(d,AI.x,AI.z,AI.timer);emote(caretaker.headGroup,'ball',0.85);}
  if(AI.act==='chat'&&tg.moon){tg.ent=null;if(!CTRL.on||!FOLLOW_MOON)moonJoinChat();}
  if(AI.act==='pet'&&tg.ent)tg.ent.lonely=0;
};
const _endAct0=endAct;
endAct=function(){
  const tg=AI.target;
  if(tg&&tg.mess){tg.mess.dirt=0;ISLAND.drawMess(tg.mess);ISLAND.release('mess_'+tg.mess.id,'luna');emote(caretaker.headGroup,'sparkle',0.85);}
  if(tg&&tg.ent)ISLAND.release('pet_'+tg.ent.name,'luna');
  if(tg&&tg.bed)ISLAND.release('bed_'+tg.bed.type+tg.bed.i,'luna');
  if(AI.act==='chase')for(const d of DOGS)if(d.state==='zoomies')d.zoom.t=Math.min(d.zoom.t,0.6);
  if(AI.act==='chat'&&LM.state==='act'&&LM.act==='chat')LM.timer=Math.min(LM.timer,0.8);
  _endAct0();
};
function lunaNewActs(dt){   // per-frame work for the new jobs (called from actUpdate)
  const tg=AI.target;if(!tg)return;
  if(AI.act==='sweep'&&tg.mess){const p=clamp(AI.actT/Math.max(0.1,AI.actDur),0,1);tg.mess.dirt=tg.start*(1-p);ISLAND.drawMess(tg.mess);
    AI.yaw+=Math.sin(AI.actT*0.7)*dt*0.6;}
  else if(AI.act==='chase'){tg.ang+=dt*1.4;const r=1.8,tx=tg.cx+Math.cos(tg.ang)*r,tz=tg.cz+Math.sin(tg.ang)*r,dx=tx-AI.x,dz=tz-AI.z,d=Math.hypot(dx,dz);
    if(d>0.02&&isPointWalkable(tx,tz,0.2)){AI.yaw+=normalizeAngle(Math.atan2(dx,dz)-AI.yaw)*Math.min(1,dt*8);const sp=Math.min(d/dt,3.1);AI.x+=dx/d*sp*dt;AI.z+=dz/d*sp*dt;AI.speed=sp;}
    if(AI.emoteT<=0){emote(caretaker.headGroup,Math.random()<0.5?'heart':'note',0.85,1.3,0.5);AI.emoteT=rnd(2.2,3.5);}}
  else if(AI.act==='chat'){if(!LM.inside){AI.yaw+=normalizeAngle(Math.atan2(LM.x-AI.x,LM.z-AI.z)-AI.yaw)*Math.min(1,dt*5);}
    if(AI.emoteT<=0){emote(caretaker.headGroup,pick(['note','heart','sparkle']),0.85,1.4,0.5);AI.emoteT=rnd(1.8,3);}}
  else if(AI.act==='dance'){
    if(!RADIO.on)AI.timer=Math.min(AI.timer,0.6);
    const withMoon=LM.state==='act'&&LM.act==='radio'&&!LM.inside,base=withMoon?Math.atan2(LM.x-AI.x,LM.z-AI.z):0.2,want=base+Math.sin(AI.actT*0.9+1.3)*0.6;
    tg.look=[AI.x+Math.sin(want)*3,AI.z+Math.cos(want)*3];   // actUpdate turns her toward her look point
    tg.twT=(tg.twT===undefined?rnd(2.5,4):tg.twT)-dt;if(tg.twT<=0){tg.twT=rnd(4,7);AI.twirlT=0.9;}
    if(AI.emoteT<=0){emote(caretaker.headGroup,Math.random()<0.7?'note':'heart',0.85,1.4,0.5);AI.emoteT=rnd(2.2,3.6);}}
  if(AI.act==='pet'&&tg.ent)tg.ent.lonely=Math.max(0,tg.ent.lonely-dt*0.3);
}

/* ---------- Luna re-plans when the situation changes (problem solving) ---------- */
let _replanT=0;
function lunaReplan(dt){
  _replanT-=dt;if(_replanT>0)return;_replanT=1.5;
  if(AI.inside||(CTRL.on&&!FOLLOW_MOON&&!FOLLOW_SOLON)||STILL.on||!AI.task)return;
  // caught in the rain on the way to an outdoor job: give it up and head for shelter
  if(AI.state==='walk'&&AI.task.dry&&WEATHER.rainK>0.45){abortTask();BRAIN.fail[AI.lastRid]=0;emote(caretaker.headGroup,'drop',0.85);return;}
  // walking to pet someone who has wandered off out of reach
  if(AI.state==='walk'&&AI.target&&AI.target.ent&&Math.hypot(AI.target.ent.x-AI.x,AI.target.ent.z-AI.z)>40){abortTask();return;}
  // a pet is crying for food while she is busy with something unimportant: go and feed it
  if(canInterrupt()&&AI.task.act!=='feed'&&ALL_ANIMALS.some(a=>a.beg&&a.hunger>0.85)&&ISLAND.bowls.some(b=>b.food<0.2)){
    if(AI.state==='act')endAct();else abortTask();emote(caretaker.headGroup,'food',0.85);}
}

/* =====================================================================================================
   Lady Moon 2.0: a needs-driven crafter who helps around the island
   ===================================================================================================== */
const MOON_NEEDS={social:0.45,craft:0.5,pets:0.4,garden:0.3,tidy:0.3,snack:0.3,play:0.4,explore:0.5,rest:0.1};
const MOON_RATES={social:0.006,craft:0.005,pets:0.006,garden:0.004,tidy:0.004,snack:0.0035,play:0.006,explore:0.005,rest:0.003};
const MOON_ACT_SAT={chat:{social:0.9},cheer:{social:0.3,play:0.3},knitSit:{craft:0.8,rest:0.3},knitSquat:{craft:0.7},yarnBall:{craft:0.4,play:0.3},
  strawberry:{snack:0.9},pet:{pets:0.7},yarnPlay:{pets:0.6,play:0.5},dogPlay:{play:0.9,pets:0.4},tend:{garden:0.9},sweep:{tidy:1},dance:{play:0.5,explore:0.3},wave:{social:0.2,explore:0.4}};
const MOON_INTERRUPTIBLE=new Set(['knitSit','knitSquat','yarnBall','strawberry','wave','dance','cheer']);
function moonBedChore(){let best=null,bs=0;
  for(const b of BEDS){if(!ISLAND.free('bed_'+b.type+b.i,'moon'))continue;if(AI.target&&AI.target.bed===b)continue;
    const u=(b.weeds>=2?0.3+0.08*b.weeds:0)+(b.pests>=1?0.3+0.12*b.pests:0)+(b.type==='flower'&&b.faded>0.35?0.3+b.faded*0.4:0);if(!u)continue;
    const s=u/(1+Math.hypot(b.spot[0]-LM.x,b.spot[1]-LM.z)/45);if(s>bs){bs=s;best=b;}}return best?{b:best,u:bs}:null;}
function moonPlan(){
  const night=nightK>0.62,wet=WEATHER.rainK>0.4,snowy=WEATHER.snowK>0.5,N=MOON_NEEDS,dl=Math.hypot(AI.x-LM.x,AI.z-LM.z),C=[];
  const add=(score,spot)=>{if(spot)C.push({score:score+Math.random()*0.1,spot});};
  const near=(x,z,r,mn)=>{const[a,b]=randomSpotNear(x,z,r,mn);return[a,b];};
  if(night||wet){   // shelter under the porch roof: knit, wind yarn, nap
    const[x,z]=near(POI.veranda.x-1.2,POI.veranda.z,1.4);add(1.3+N.rest,{x,z,look:[20,15],act:night&&N.rest>0.5?'knitSit':pick(['knitSit','yarnBall','strawberry'])});}
  if(snowy)add(0.9,{...(([x,z])=>({x,z}))(near(LM.x,LM.z,6)),look:[LM.x,LM.z+5],act:'dance'});
  // company: go and hang out with Luna (and cheer her on when she's doing something fun)
  if(!AI.inside&&dl<55&&!(CTRL.on&&!FOLLOW_MOON&&false)){const fun=AI.state==='act'&&['fetch','fish','swim','swing','chase'].includes(AI.act);
    const[x,z]=near(AI.x,AI.z,2.8,1.6);add(N.social*(fun?1.5:1.1)/(1+dl/50),{x,z,look:[AI.x,AI.z],act:fun?'cheer':pick(['chat','wave','knitSit']),luna:true});}
  // pets: cuddle the loneliest one, or dangle yarn for a cat
  const pet=mostNeedy('lonely','moon',LM.x,LM.z,40);
  if(pet&&!wet){const[x,z]=near(pet.x,pet.z,1.6,0.9);add((0.2+pet.lonely)*(0.6+N.pets),{x,z,look:[pet.x,pet.z],act:pet.kind==='cat'&&Math.random()<0.5?'yarnPlay':'pet',pet});}
  // dogs: start a game of zoomies with a pup who's out and about
  const dog=DOGS.find(d=>d.state==='follow'&&Math.hypot(d.x-LM.x,d.z-LM.z)<30&&!(AI.state==='act'&&(AI.act==='fetch'||AI.act==='chase')));
  if(dog&&!night&&!wet){const[x,z]=near(dog.x,dog.z,2.5,1.2);add(N.play*0.95+(dog.lonely||0)*0.4,{x,z,look:[dog.x,dog.z],act:'dogPlay',dog});}
  // garden: pull weeds, pick off bugs, deadhead flowers (Luna does the watering and harvesting)
  if(!night&&!wet){const g=moonBedChore();if(g)add(g.u*1.4*(0.6+N.garden),{x:g.b.spot[0],z:g.b.spot[1],look:g.b.look,act:'tend',bed:g.b});}
  // tidy: sweep up the litter
  const m=bestMess('moon',LM.x,LM.z);if(m){const[x,z]=snapWalkable(m.x+rnd(-0.5,0.5),m.z+rnd(-0.5,0.5));add(m.dirt*(0.6+N.tidy),{x,z,look:m.look,act:'sweep',mess:m});}
  // her own things: knitting at a favourite spot, a strawberry snack, sightseeing
  const sp=pick(MOON_SPOTS),[sx,sz]=snapWalkable(sp.x+rnd(-1.2,1.2),sp.z+rnd(-1.2,1.2));
  add(N.craft*0.9,{x:sx,z:sz,look:sp.look,act:pick(['knitSit','knitSquat','yarnBall'])});
  add(N.snack*0.8,{x:sx,z:sz,look:sp.look,act:'strawberry'});
  add(N.explore*0.7,{x:sx,z:sz,look:sp.look,act:pick(sp.acts)});
  C.sort((a,b)=>b.score-a.score);
  const ch=C[0].spot;
  if(ch.mess)ISLAND.claim('mess_'+ch.mess.id,'moon',45);if(ch.bed)ISLAND.claim('bed_'+ch.bed.type+ch.bed.i,'moon',45);if(ch.pet)ISLAND.claim('pet_'+ch.pet.name,'moon',30);
  return ch;
}
chooseLadyMoonPlan=function(){
  if(!MOON_STYLE.userLockedHat&&LM.hatSwapT<=0){LM.hatSwapT=rnd(65,120);const hats=['frog','strawberry','coral','none'];
    MOON_STYLE.hat=hats[(hats.indexOf(MOON_STYLE.hat)+1)%hats.length];applyLadyMoonCloset(false);emote(ladyMoon.headGroup,'sparkle',0.95,1.6,0.55);}
  LM.spot=moonPlan();
  LM.walkSpeed=Math.random()<0.38?3.55:2.85;
  LM.path=planPath(LM.x,LM.z,LM.spot.x,LM.spot.z);LM.wp=0;LM.state='walk';LM.timer=30;LM.stuckT=0;LM.stuckN=0;LM.checkX=LM.x;LM.checkZ=LM.z;
};
function moonJoinChat(){   // Luna came over to talk: Lady Moon turns to her and joins in
  if(LM.inside||Math.hypot(AI.x-LM.x,AI.z-LM.z)>4.5)return;
  if(LM.state==='walk'||LM.state==='idle'||(LM.state==='act'&&MOON_INTERRUPTIBLE.has(LM.act))){
    moonFinish(false);LM.spot={x:LM.x,z:LM.z,look:[AI.x,AI.z],act:'chat',luna:true};beginLadyMoonAct('chat');}}
function moonFinish(complete){
  const sp=LM.spot;
  if(sp){if(sp.mess)ISLAND.release('mess_'+sp.mess.id,'moon');if(sp.bed)ISLAND.release('bed_'+sp.bed.type+sp.bed.i,'moon');if(sp.pet){ISLAND.release('pet_'+sp.pet.name,'moon');
      if(sp.pet.state==='petted'&&sp.pet.petBy==='moon'){sp.pet.state=sp.pet.kind==='dog'?'follow':'idle';sp.pet.timer=rnd(3,6);sp.pet.petBy=null;}}
    if(sp.pet&&sp.pet.state==='play'){sp.pet.state='idle';sp.pet.timer=rnd(2,4);}}
  if(complete&&LM.act&&MOON_ACT_SAT[LM.act])for(const k in MOON_ACT_SAT[LM.act])MOON_NEEDS[k]=Math.max(0,MOON_NEEDS[k]-MOON_ACT_SAT[LM.act][k]);
}
// new acts begin / run / end (hooked into her existing act machine)
const _beginMoonAct0=beginLadyMoonAct;
beginLadyMoonAct=function(name){
  _beginMoonAct0(name);
  const sp=LM.spot,act=LM.act,durs={tend:[7,10],sweep:[7,10],chat:[6,9],yarnPlay:[6,9],dogPlay:[8,11]};
  if(durs[act]){LM.actDur=LM.timer=rnd(durs[act][0],durs[act][1]);}
  if(!sp)return;
  if(act==='sweep'&&sp.mess){sp.start=sp.mess.dirt;emote(ladyMoon.headGroup,'leaf',0.95);}
  if(act==='tend'&&sp.bed){sp.tick=1.2;emote(ladyMoon.headGroup,sp.bed.pests?'bug':sp.bed.weeds?'weed':'scissors',0.95);}
  if(act==='pet'&&sp.pet&&!SKIP_STATES.has(sp.pet.state)&&sp.pet.state!=='kennel'){sp.pet.state='petted';sp.pet.petBy='moon';sp.pet.lastPet=simTime;}
  if(act==='yarnPlay'&&sp.pet){sp.pet.state='play';sp.pet.playT=0;sp.pet.petBy='moon';}
  if(act==='dogPlay'&&sp.dog&&sp.dog.state==='follow'){startZoomies(sp.dog,LM.x,LM.z,LM.timer);LM.act='dogPlay';}
  if(act==='chat'&&sp.luna&&AI.state!=='act'&&!AI.inside&&!CTRL.on&&Math.hypot(AI.x-LM.x,AI.z-LM.z)<4.5&&canInterrupt()){
    // Luna stops for a chat too
    if(AI.state==='walk')abortTask();AI.state='act';AI.act='chat';AI.task={id:'chatBack',need:'social',sat:0.6,act:'chat'};AI.target={look:[LM.x,LM.z],moon:true};AI.timer=LM.timer;AI.actT=0;AI.actDur=AI.timer;AI.emoteT=0.6;}
};
function moonNewActs(dt){
  if(LM.act==='radio'){moonRadioAct(dt);return;}
  const sp=LM.spot;if(!sp)return;
  if(LM.act==='sweep'&&sp.mess){const p=clamp(LM.actT/Math.max(0.1,LM.actDur),0,1);sp.mess.dirt=sp.start*(1-p);ISLAND.drawMess(sp.mess);}
  else if(LM.act==='tend'&&sp.bed){sp.tick-=dt;if(sp.tick<=0){sp.tick=1.3;const b=sp.bed;
      if(b.pests>0)b.pests--;else if(b.weeds>0)b.weeds--;else if(b.type==='flower'&&b.faded>0.05)b.faded=Math.max(0,b.faded-0.18);b.dirty=true;}}
  else if(LM.act==='chat'&&!AI.inside){LM.yaw+=normalizeAngle(Math.atan2(AI.x-LM.x,AI.z-LM.z)-LM.yaw)*Math.min(1,dt*5);}
  else if(LM.act==='pet'&&sp.pet){const e=sp.pet;e.lonely=Math.max(0,e.lonely-dt*0.3);LM.yaw+=normalizeAngle(Math.atan2(e.x-LM.x,e.z-LM.z)-LM.yaw)*Math.min(1,dt*5);}
  else if(LM.act==='yarnPlay'&&sp.pet){const e=sp.pet;e.lonely=Math.max(0,e.lonely-dt*0.2);LM.yaw+=normalizeAngle(Math.atan2(e.x-LM.x,e.z-LM.z)-LM.yaw)*Math.min(1,dt*4);}
  else if(LM.act==='dogPlay'&&sp.dog){LM.yaw+=normalizeAngle(Math.atan2(sp.dog.x-LM.x,sp.dog.z-LM.z)-LM.yaw)*Math.min(1,dt*6);}
}
function moonStuckCheck(dt){   // a blocked path: try again, then give up and do something else nearby
  LM.stuckT=(LM.stuckT||0)+dt;if(LM.stuckT<1.6)return;LM.stuckT=0;
  if(Math.hypot(LM.x-(LM.checkX||0),LM.z-(LM.checkZ||0))<0.3){LM.stuckN=(LM.stuckN||0)+1;
    if(LM.stuckN<=2&&LM.spot){LM.path=planPath(LM.x,LM.z,LM.spot.x,LM.spot.z);LM.wp=0;}
    else{const s=snapWalkable(LM.x,LM.z);LM.x=s[0];LM.z=s[1];moonFinish(false);LM.spot=null;LM.state='idle';LM.timer=0.4;emote(ladyMoon.headGroup,'?',0.95,1.3,0.55);}}
  else LM.stuckN=0;
  LM.checkX=LM.x;LM.checkZ=LM.z;
}

/* =====================================================================================================
   The deck radio: a little table beside the front door with Lady Moon's radio on it. Every so often she
   goes over, switches it on, plays one of her favourite songs and dances; sometimes Luna comes and dances
   with her. The music comes from the radio itself: it gets louder as the camera gets close and quieter
   (and a little muffled) as it moves away, and it fades out when she switches the radio off.
   ===================================================================================================== */
const RADIO=(function(){
  const TX=21.7,TZ=1.85,TY=walkHeight(21.7,1.85);
  const TRACKS=[
    {file:'audio/radio-pain.mp3',title:'Pain',artist:'Boy Harsher',lvl:0.72},
    {file:'audio/radio-golden-brown.mp3',title:'Golden Brown',artist:'The Stranglers',lvl:1.0}];
  // ---- the table ----
  const table=new T.Group();table.position.set(TX,TY,TZ);scene.add(table);
  const wood=mStd('#8a5a3a',{roughness:0.7}),woodD=mStd('#5e3b24',{roughness:0.8});
  const top=new T.Mesh(new T.CylinderGeometry(0.36,0.36,0.05,28),wood);top.position.y=0.72;top.castShadow=top.receiveShadow=true;table.add(top);
  const rim=new T.Mesh(new T.TorusGeometry(0.36,0.018,6,28),woodD);rim.rotation.x=Math.PI/2;rim.position.y=0.72;table.add(rim);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2+0.4,leg=new T.Mesh(new T.CylinderGeometry(0.022,0.03,0.72,8),woodD);
    leg.position.set(Math.sin(a)*0.22,0.36,Math.cos(a)*0.22);leg.rotation.set(Math.cos(a)*0.12,0,-Math.sin(a)*0.12);leg.castShadow=true;table.add(leg);}
  const doily=new T.Mesh(new T.CircleGeometry(0.27,24),mStd('#f3e6cf',{roughness:1}));doily.rotation.x=-Math.PI/2;doily.position.y=0.748;table.add(doily);
  // ---- the radio: a little teal retro set with a cream face, a speaker, a glowing tuning dial and an antenna ----
  const radio=new T.Group();radio.position.set(0,0.75,0);radio.rotation.y=-0.55;table.add(radio);
  const teal=mStd('#2f8f8a',{roughness:0.45}),cream=mStd('#f2e6c9',{roughness:0.6}),chrome=mStd('#c9ccd1',{metalness:0.8,roughness:0.3});
  const body=new T.Mesh(new T.BoxGeometry(0.46,0.27,0.2),teal);body.position.y=0.145;body.castShadow=true;radio.add(body);
  for(const s of[-1,1]){const cap=new T.Mesh(new T.CylinderGeometry(0.135,0.135,0.2,20),teal);cap.rotation.x=Math.PI/2;cap.position.set(s*0.19,0.145,0);cap.castShadow=true;radio.add(cap);}   // rounded ends
  const face=new T.Mesh(new T.BoxGeometry(0.42,0.2,0.01),cream);face.position.set(0,0.145,0.102);radio.add(face);
  const grilleTex=canvasTex(128,128,c=>{c.fillStyle='#e9dcc0';c.fillRect(0,0,128,128);c.fillStyle='#6d5a43';
    for(let y=8;y<128;y+=11)for(let x=8+((y/11)%2)*5;x<128;x+=11){const d=Math.hypot(x-64,y-64);if(d<58){c.beginPath();c.arc(x,y,3,0,6.28);c.fill();}}
    c.strokeStyle='#b9a37e';c.lineWidth=5;c.beginPath();c.arc(64,64,60,0,6.28);c.stroke();});
  const grille=new T.Mesh(new T.CircleGeometry(0.075,24),new T.MeshStandardMaterial({map:grilleTex,roughness:0.9}));grille.position.set(-0.1,0.145,0.109);radio.add(grille);
  const dialMat=new T.MeshStandardMaterial({color:'#3a2a18',emissive:'#ffb347',emissiveIntensity:0,roughness:0.5});
  const dial=new T.Mesh(new T.PlaneGeometry(0.15,0.06),dialMat);dial.position.set(0.09,0.19,0.109);radio.add(dial);
  const needle=new T.Mesh(new T.PlaneGeometry(0.006,0.05),mStd('#d93a2f'));needle.position.set(0.05,0.19,0.111);radio.add(needle);
  for(const x of[0.05,0.13]){const k=new T.Mesh(new T.CylinderGeometry(0.022,0.022,0.025,12),chrome);k.rotation.x=Math.PI/2;k.position.set(x,0.1,0.115);radio.add(k);}
  const handle=new T.Mesh(new T.TorusGeometry(0.12,0.014,6,16,Math.PI),chrome);handle.position.set(0,0.28,0);radio.add(handle);
  const ant=new T.Mesh(new T.CylinderGeometry(0.004,0.006,0.5,6),chrome);ant.position.set(0.17,0.5,-0.05);ant.rotation.z=-0.42;radio.add(ant);
  const antTip=new T.Mesh(new T.SphereGeometry(0.012,8,6),chrome);antTip.position.set(0.17+Math.sin(0.42)*0.25,0.5+Math.cos(0.42)*0.25,-0.05);radio.add(antTip);
  const glow=new T.PointLight(0xffb347,0,3.2,2);glow.position.set(0,0.3,0.3);radio.add(glow);
  // the spots: where Lady Moon stands to work the radio, and where each of them dances
  const STAND=[21.2,2.45],MOON_DANCE=[21.05,2.55],LUNA_DANCE=[19.6,2.6];
  const R={on:false,track:-1,last:Math.random()<0.5?0:1,vol:0,nextT:40,invite:false,joinT:0,noteT:0,blocked:false,els:[],nodes:[],dialK:0};
  const _w=new T.Vector3();
  function wire(i){
    if(R.els[i])return R.els[i];
    const el=new Audio();el.preload='auto';el.loop=true;el.src=(window.LUNA_ASSET_BASE||'')+TRACKS[i].file;R.els[i]=el;
    if(location.protocol!=='file:'){ensureAudio();
      if(AUDIO.ctx){try{const src=AUDIO.ctx.createMediaElementSource(el),hp=AUDIO.ctx.createBiquadFilter(),lp=AUDIO.ctx.createBiquadFilter(),g=AUDIO.ctx.createGain();
        hp.type='highpass';hp.frequency.value=90;lp.type='lowpass';lp.frequency.value=9000;g.gain.value=0;src.connect(hp).connect(lp).connect(g).connect(AUDIO.ctx.destination);R.nodes[i]={g,lp};}catch(e){R.nodes[i]=null;}}}
    return el;
  }
  function tryPlay(el){const p=el.play();if(p&&p.catch)p.catch(()=>{R.blocked=true;});}
  // browsers only allow sound after a click or key press: if the radio came on before that, start it on the next one
  const unblock=()=>{if(R.blocked&&R.on&&R.track>=0){R.blocked=false;if(AUDIO.ctx&&AUDIO.ctx.state==='suspended')AUDIO.ctx.resume();tryPlay(R.els[R.track]);}};
  addEventListener('pointerdown',unblock);addEventListener('keydown',unblock);
  function start(){
    const i=R.track=R.last=(R.last+1)%TRACKS.length;const el=wire(i);
    if(AUDIO.ctx&&AUDIO.ctx.state==='suspended')AUDIO.ctx.resume();
    try{el.currentTime=0;}catch(e){}R.vol=0;R.on=true;tryPlay(el);
    if(camera.position.distanceTo(_w.set(TX,TY+1,TZ))<45)toast('♪ Lady Moon put on “'+TRACKS[i].title+'” by '+TRACKS[i].artist);
    emote(radio,'note',0.55,1.8,0.5);
  }
  function stop(){R.jam=false;if(!R.on)return;R.on=false;R.invite=false;R.nextT=simTime+rnd(150,280);}
  function moonOnIt(){return LM.state==='act'&&LM.act==='radio'&&!LM.inside;}
  function update(dt,time){
    if(R.on&&!moonOnIt())stop();
    // loudness from how far the camera is from the radio; ducked during the launch film, muffled from inside the house
    radio.getWorldPosition(_w);const d=camera.position.distanceTo(_w),near=clamp(1-(d-4)/52,0,1);
    const want=R.on&&!R.blocked&&!CINE.on?Math.pow(near,1.6)*0.85*(INSIDE.on?0.3:1):0;
    const rate=R.on?(want>R.vol?1.2:2.5):0.45;   // ~2 s fade out when the radio goes off
    R.vol=want>R.vol?Math.min(want,R.vol+dt*rate):Math.max(want,R.vol-dt*rate);
    const i=R.track;
    if(i>=0&&R.els[i]){const el=R.els[i],n=R.nodes[i],v=R.vol*TRACKS[i].lvl;
      if(n){n.g.gain.value=v;n.lp.frequency.value=INSIDE.on?900:lerp(2200,11000,near);}else el.volume=clamp(v,0,1);
      if(!R.on&&R.vol<=0.001&&!el.paused)el.pause();}
    // the radio comes alive: glowing dial, wobbling needle, thumping speaker and floating notes
    R.dialK=lerp(R.dialK,R.on?1:0,Math.min(1,dt*3));dialMat.emissiveIntensity=R.dialK*1.4;glow.intensity=R.dialK*0.6;
    needle.position.x=0.05+R.dialK*0.06+Math.sin(time*0.7)*0.004*R.dialK;
    const beat=R.on?Math.pow(Math.max(0,Math.sin(time*(R.track===0?7.9:5.3))),6):0;grille.scale.setScalar(1+beat*0.12);body.scale.y=1+beat*0.015;
    syncBtn();
    if(R.on){R.noteT-=dt;if(R.noteT<=0){R.noteT=rnd(1.3,2.2);if(d<60)emote(radio,'note',0.5,1.8,0.42);}}
    if(!R.on&&AI.task&&AI.task.id==='radioDance'&&AI.state==='walk')abortTask();   // the music stopped before she got there
    // sometimes Luna stops what she's doing and comes over to dance
    if(R.invite&&!(AI.task&&AI.task.id==='radioDance')){R.joinT-=dt;if(R.joinT<=0){R.joinT=2;
      if(!AI.inside&&!(CTRL.on&&!FOLLOW_MOON&&!FOLLOW_SOLON)&&!STILL.on&&AI.state!=='skylook'&&(canInterrupt()||R.jam&&AI.state==='act'&&!['swim','fetch','gate'].includes(AI.act))&&Math.hypot(AI.x-TX,AI.z-TZ)<75){
        const tgt=resolveTarget(RADIO_TASK);if(tgt){if(AI.state==='act')endAct();else abortTask();startTask({tk:RADIO_TASK,tgt,rid:'radioDance'});emote(caretaker.headGroup,'note',0.85);}}}}
  }
  // the Jam button: send Lady Moon to the radio right now (or, if the music's playing, have her switch it off)
  const btn=document.getElementById('btnJam');let shown=null;
  function busy(){return !!(R.on||(LM.state==='act'&&LM.act==='radio')||(LM.state==='walk'&&LM.spot&&LM.spot.radio));}
  function jam(){
    if(CINE.on)return;
    if(LM.state==='act'&&LM.act==='radio'){if(LM.radioPhase!=='off')LM.timer=Math.min(LM.timer,1.85);toast('Lady Moon is switching the music off');return;}
    if(LM.state==='walk'&&LM.spot&&LM.spot.radio){toast('Lady Moon is already on her way to the radio \u266A');return;}
    if(INSIDE.on||LM.inside){toast('Head back outside to jam on the deck');return;}
    if(CTRL.on&&FOLLOW_MOON){toast('Switch the controller to Luna or Solon (press M) so Lady Moon can go and jam');return;}
    if(AUDIO.ctx&&AUDIO.ctx.state==='suspended')AUDIO.ctx.resume();
    moonFinish(false);LM.mAct=null;
    const d=Math.hypot(LM.x-STAND[0],LM.z-STAND[1]);
    LM.spot={x:STAND[0],z:STAND[1],look:[TX,TZ],act:'radio',radio:true};
    LM.walkSpeed=d>40?4.2:3.55;LM.path=planPath(LM.x,LM.z,STAND[0],STAND[1]);LM.wp=0;LM.state='walk';LM.timer=75;
    LM.stuckT=0;LM.stuckN=0;LM.checkX=LM.x;LM.checkZ=LM.z;R.jam=true;
    emote(ladyMoon.headGroup,'note',0.95,1.6,0.55);toast(d>6?'Lady Moon is heading to the deck radio \u266A':'Lady Moon is turning on the radio \u266A');
  }
  if(btn)btn.onclick=jam;
  addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement||CTRL.on)return;if(e.key==='j'||e.key==='J')jam();});
  function syncBtn(){const b=busy();if(btn&&b!==shown){shown=b;btn.setAttribute('aria-pressed',b);}}
  return {x:TX,z:TZ,y:TY,jam,get jamming(){return !!R.jam;},STAND,MOON_DANCE,LUNA_DANCE,TRACKS,radio,start,stop,update,
    get on(){return R.on;},get invite(){return R.invite;},set invite(v){R.invite=v;},
    ready(){return !R.on&&simTime>=R.nextT&&!CINE.on;},
    label(){return R.track>=0?'“'+TRACKS[R.track].title+'” – '+TRACKS[R.track].artist:'the radio';},
    song(){return R.track>=0?TRACKS[R.track].title:'';}};
})();
// Luna's side: a job she takes when Lady Moon asks her to dance
const RADIO_TASK={id:'radioDance',need:'play',dynamic:'radio',act:'dance',dur:[150,150],sat:0.6,w:1.0};
TASKS.push(RADIO_TASK);
TASK_NAMES.radioDance='to dance with Lady Moon';
const _resolveTarget2=resolveTarget;
resolveTarget=function(tk){
  if(tk.dynamic==='radio'){if(!RADIO.invite||!RADIO.on||AI.inside||LM.inside||!(LM.state==='act'&&LM.act==='radio'))return null;
    const[x,z]=RADIO.LUNA_DANCE;return{x,z,look:[LM.x,LM.z],urg:1.6,radio:true};}
  if(tk.dynamic==='moon'&&LM.state==='act'&&LM.act==='radio')return null;   // she's busy dancing: Luna joins in instead (above)
  return _resolveTarget2(tk);
};
// Lady Moon's side: a "radio" act (switch on, dance, switch off), picked by her needs brain when the radio's free
MOON_ACT_SAT.radio={play:0.85,social:0.2,explore:0.2};
const _moonPlan0=moonPlan;
moonPlan=function(){
  const ch=_moonPlan0();
  if(RADIO.ready()&&!LM.inside&&!(CTRL.on&&FOLLOW_MOON)){const d=Math.hypot(LM.x-RADIO.STAND[0],LM.z-RADIO.STAND[1]);
    if(d<70&&(Math.random()<0.55+MOON_NEEDS.play*0.4)&&!ch.mess&&!ch.bed)
      return{x:RADIO.STAND[0],z:RADIO.STAND[1],look:[RADIO.x,RADIO.z],act:'radio',radio:true};}
  return ch;
};
const _beginMoonAct1=beginLadyMoonAct;
beginLadyMoonAct=function(name){
  _beginMoonAct1(name);
  if(LM.act!=='radio')return;
  if(Math.hypot(LM.x-RADIO.STAND[0],LM.z-RADIO.STAND[1])>2.5||RADIO.on){LM.act='wave';LM.timer=LM.actDur=1.5;return;}   // never made it to the deck
  LM.actDur=LM.timer=rnd(60,95);LM.radioPhase='tune';LM.twirlNext=rnd(3,5);
  LM.faceMode='happy';ladyMoon.faceObj.drawFace('happy');
};
function moonRadioAct(dt){
  const sp=LM.spot;if(!sp)return;
  const faceTo=(x,z,k)=>{LM.yaw+=normalizeAngle(Math.atan2(x-LM.x,z-LM.z)-LM.yaw)*Math.min(1,dt*k);};
  if(LM.radioPhase==='tune'&&LM.actT<2){faceTo(RADIO.x,RADIO.z,7);if(LM.actT>1.1&&!sp.started){sp.started=true;RADIO.start();}}
  else if(LM.timer<1.9){   // song's over: back to the radio and switch it off
    if(LM.radioPhase!=='off'){LM.radioPhase='off';RADIO.invite=false;}
    faceTo(RADIO.x,RADIO.z,7);LM.x=lerp(LM.x,RADIO.STAND[0],Math.min(1,dt*3));LM.z=lerp(LM.z,RADIO.STAND[1],Math.min(1,dt*3));
    if(LM.timer<1.0)RADIO.stop();}
  else{
    if(LM.radioPhase!=='dance'){LM.radioPhase='dance';RADIO.invite=RADIO.jamming||Math.random()<0.7;}
    // step out a little from the table, then dance, turning toward Luna when she's dancing too
    LM.x=lerp(LM.x,RADIO.MOON_DANCE[0],Math.min(1,dt*2));LM.z=lerp(LM.z,RADIO.MOON_DANCE[1],Math.min(1,dt*2));
    const withLuna=AI.state==='act'&&AI.act==='dance'&&!AI.inside;
    const base=withLuna?Math.atan2(AI.x-LM.x,AI.z-LM.z):0.2;
    LM.yaw+=normalizeAngle(base+Math.sin(LM.actT*0.8)*0.55-LM.yaw)*Math.min(1,dt*3);
    LM.twirlNext-=dt;if(LM.twirlNext<=0){LM.twirlNext=rnd(4,7);LM.twirlT=0.95;}
  }
}
const _moonFinish1=moonFinish;
moonFinish=function(complete){if(LM.spot&&LM.spot.radio){RADIO.stop();LM.radioPhase=null;}_moonFinish1(complete);};

/* =====================================================================================================
   Controller for Lady Moon: when the camera follows Lady Moon, the stick and buttons steer her
   ===================================================================================================== */
function ctrlInput(){
  pollGamepad();
  let kx=0,ky=0;const K=CTRL.keys;if(K.has('a')||K.has('arrowleft'))kx--;if(K.has('d')||K.has('arrowright'))kx++;if(K.has('w')||K.has('arrowup'))ky++;if(K.has('s')||K.has('arrowdown'))ky--;
  let[x,y,m]=stickCurve(CTRL.touch.x,CTRL.touch.y,STICK_DZ);
  if(m===0){[x,y,m]=stickCurve(CTRL.pad.x,CTRL.pad.y,PAD_DZ);}
  if(m===0&&(kx||ky)){const l=Math.hypot(kx,ky);x=kx/l;y=ky/l;m=K.has('shift')?1:0.75;}
  CTRL.m=m;
  if(m>0){if(!STEER.held||!(DIRECTOR.on&&idle>DIRECTOR.resumeAfter))STEER.th=theta;STEER.held=true;}else STEER.held=false;
  if(id_knob&&!CTRL.touchHeld){const kr=(id_knob.parentNode.offsetWidth||120)*0.36;id_knob.style.transform=`translate(calc(-50% + ${(x*kr).toFixed(1)}px),calc(-50% + ${(-y*kr).toFixed(1)}px))`;}
  return[x,y,m];
}
function moonCtrlAction(kind){
  if(LM.mAct)return;
  if(kind==='jump'){if(!(LM.jumpT>0))LM.jumpT=0.62;return;}
  if(kind==='wave'){LM.mAct={act:'wave',t:2};emote(ladyMoon.headGroup,'heart',0.95);return;}
  if(kind==='pet'){let best=null,bd=2.8;for(const e of ALL_ANIMALS){if(e.inside||SKIP_STATES.has(e.state))continue;const d=Math.hypot(e.x-LM.x,e.z-LM.z);if(d<bd){bd=d;best=e;}}
    if(!best){toast('Walk Lady Moon up to a pet to give them a cuddle');return;}
    best.prevState=best.state;best.state='petted';best.petBy='moon';best.lastPet=simTime;best.lonely=0;LM.mAct={act:'pet',t:2.6,ent:best,em:0};return;}
  if(kind==='throw'){let dog=null,dd=12;for(const d of DOGS){const k=Math.hypot(d.x-LM.x,d.z-LM.z);if(d.state==='follow'&&k<dd){dd=k;dog=d;}}
    if(!dog){toast('Bring a pup over for a game of zoomies');return;}LM.mAct={act:'dogPlay',t:5};startZoomies(dog,LM.x,LM.z,5);}
}
function moonCtrlUpdate(dt,time){
  if(!CTRL.moonStarted){moonFinish(false);LM.spot=null;LM.state='idle';CTRL.moonStarted=true;}
  const[x,y,m]=ctrlInput();
  LM.jumpT=Math.max(0,(LM.jumpT||0)-dt);
  if(LM.mAct){const a=LM.mAct;a.t-=dt;LM.speed=lerp(LM.speed,0,Math.min(1,dt*10));LM.state='act';LM.act=a.act;LM.actT=(LM.actT||0)+dt;
    if(a.act==='pet'&&a.ent){const e=a.ent;LM.yaw+=normalizeAngle(Math.atan2(e.x-LM.x,e.z-LM.z)-LM.yaw)*Math.min(1,dt*8);a.em-=dt;if(a.em<=0){a.em=0.8;emote(e.root,'heart',e.kind==='bunny'?0.65:e.kind==='dog'?0.95:0.8);}}
    if(a.t<=0){if(a.act==='pet'&&a.ent&&a.ent.state==='petted'){const e=a.ent;e.state=e.kind==='dog'?(e.prevState==='kennel'?'kennel':'follow'):'idle';e.timer=rnd(3,6);e.petBy=null;}
      LM.mAct=null;LM.state='idle';LM.act=null;}}
  else{LM.actT=0;let target=0;
    if(m>0){const th=STEER.th,fx=-Math.sin(th),fz=-Math.cos(th),rx=Math.cos(th),rz=-Math.sin(th);const dx=fx*y+rx*x,dz=fz*y+rz*x;
      LM.yaw+=normalizeAngle(Math.atan2(dx,dz)-LM.yaw)*Math.min(1,dt*10);target=(m>0.92?4.6:2.9)*Math.min(1,m/0.92);
      if(!FREE.on&&!DIRECTOR.on&&Math.abs(x)<0.45&&y>0.3)tTheta+=normalizeAngle(LM.yaw+Math.PI-tTheta)*dt*0.7;}
    LM.speed=lerp(LM.speed,target,Math.min(1,dt*(target>LM.speed?6:10)));
    if(LM.speed>0.02){const st=LM.speed*dt,nx=LM.x+Math.sin(LM.yaw)*st,nz=LM.z+Math.cos(LM.yaw)*st;
      if(standable(nx,nz)){LM.x=nx;LM.z=nz;}else{let ok=false;
        for(const o of[0.5,-0.5,1.0,-1.0,1.4,-1.4]){const yy=LM.yaw+o,sx=LM.x+Math.sin(yy)*st*0.8,sz=LM.z+Math.cos(yy)*st*0.8;if(standable(sx,sz)){LM.x=sx;LM.z=sz;ok=true;break;}}
        if(!ok)LM.speed=Math.min(LM.speed,0.2);}}
    LM.state=LM.speed>0.15?'walk':'idle';LM.act=null;LM.path=[];LM.spot=null;}
  poseLadyMoon(dt,time);
}
function moonCtrlStatus(){const a=LM.mAct;if(a&&a.act==='pet')return 'Lady Moon is cuddling '+a.ent.name;if(a&&a.act==='wave')return 'Lady Moon waves hello';if(a&&a.act==='dogPlay')return 'Zoomies with Lady Moon!';
  return LM.state==='walk'?(CTRL.m>0.92?'Lady Moon is running':'You are walking Lady Moon around'):'Lady Moon is waiting for you';}

/* =====================================================================================================
   Island picture + Solon: a practical fixer who takes the jobs Luna is too busy for
   ===================================================================================================== */
const SOLON_NEEDS={duty:0.55,dogs:0.6,explore:0.4,play:0.35,social:0.28,rest:0.12};
const SOLON_RATES={duty:0.0045,dogs:0.005,explore:0.004,play:0.004,social:0.003,rest:0.0025};
const SOLON_SAT={feed:{duty:0.85},herd:{dogs:0.9,duty:0.45},sweep:{duty:0.75},train:{play:0.85,dogs:0.35},chat:{social:0.8},scout:{explore:0.45},hips:{rest:0.25,explore:0.2},sit:{rest:0.7},cheer:{play:0.25},wave:{social:0.25},stretch:{rest:0.2}};
function islandPicture(){
  const night=nightK>0.55,dusk=nightK>0.38,wet=WEATHER.rainK>0.35;
  let hunger=0,beg=0;
  for(const a of ALL_ANIMALS){hunger=Math.max(hunger,a.hunger||0);if(a.beg)beg=1;}
  const bowls=ISLAND.bowls,anyEmpty=bowls.some(b=>b.food<0.2);
  const dogsOut=DOGS.filter(d=>d.state==='follow'||d.state==='zoomies'||d.state==='sitWait');
  const dogsIn=DOGS.filter(d=>d.state==='kennel');
  const feedUrg=(anyEmpty?0.6:0)+(hunger>0.7?0.45:0)+beg*0.4;
  const bedUrg=(dusk||night)&&dogsOut.length?(night?1.25:0.75)+dogsOut.length*0.12:0;
  const letBlocked=BRAIN.nextLetOut&&simTime<BRAIN.nextLetOut;
  const letUrg=(!wet&&nightK<0.25&&DOGS.length&&dogsIn.length===DOGS.length&&!letBlocked)?0.85:0;
  return {night,dusk,wet,hunger,beg,anyEmpty,dogsOut,dogsIn,feedUrg,bedUrg,letUrg};
}
function handsBusy(who){
  if(who==='luna'){
    if(AI.inside||STILL.on||(CTRL.on&&!FOLLOW_MOON&&!FOLLOW_SOLON))return 2;
    if(AI.state==='act'&&['fish','swim','chop','build','gate','fetch','sell'].includes(AI.act))return 1;
    if(AI.state==='walk'&&AI.task&&['fish','sell','bedtime','letOut','feedHouse','feedYard','chop'].includes(AI.task.id))return 1;
    return 0;
  }
  if(who==='moon'){
    if(LM.inside||(CTRL.on&&FOLLOW_MOON))return 2;
    if(LM.state==='act'&&(LM.act==='radio'||LM.act==='tend'))return 1;
    return 0;
  }
  if(SL.inside||(CTRL.on&&FOLLOW_SOLON))return 2;
  if(SL.state==='act'&&['herd','feed','train'].includes(SL.act))return 1;
  return 0;
}
function lunaTiedUp(x,z){
  if(handsBusy('luna')>=1)return true;
  if(x!=null&&Math.hypot(AI.x-x,AI.z-z)>24)return true;
  return false;
}
function solonPing(job){ISLAND.note={job,until:simTime+14,from:'solon'};emote(solon.headGroup,'!',0.95,1.4,0.55);}
function solonFinish(done){
  const sp=SL.spot;
  if(sp){
    if(sp.mess){if(done){sp.mess.dirt=0;ISLAND.drawMess(sp.mess);}ISLAND.release('mess_'+sp.mess.id,'solon');}
    if(sp.bowl)ISLAND.release('feed','solon');
    if(sp.mode){ISLAND.release('dogs','solon');GATE.hold=false;GATE.closeAt=simTime+(sp.mode==='out'?4:1.1);}
    if(sp.dog)ISLAND.release('pet_'+sp.dog.name,'solon');
  }
  if(done&&SL.act&&SOLON_SAT[SL.act])for(const k in SOLON_SAT[SL.act])SOLON_NEEDS[k]=Math.max(0,SOLON_NEEDS[k]-SOLON_SAT[SL.act][k]);
  if(SL.faceMode!=='open'){SL.faceMode='open';solon.faceObj.drawFace('open');}
}
function beginSolonAct(name){
  const sp=SL.spot;
  SL.state='act';SL.act=name||(sp&&sp.act)||'hips';SL.actT=0;
  const durs={feed:[4.2,6],herd:[6,8.5],sweep:[7,10],train:[6,9],chat:[5,8],scout:[3.2,5],hips:[4,7],sit:[6,10],cheer:[2.2,3.2],wave:[2.4,3.6],stretch:[3,4.5]};
  const d=durs[SL.act]||[4,6];
  SL.actDur=SL.timer=rnd(d[0],d[1]);
  if(SL.act==='cheer'||SL.act==='wave'){SL.faceMode='happy';solon.faceObj.drawFace('happy');}
  else if(SL.act==='train'){SL.faceMode='wink';solon.faceObj.drawFace('wink');}
  else SL.faceMode='open';
  if(SL.act==='feed'&&sp&&sp.bowl){sp.bowl.food=1;for(const a of ALL_ANIMALS){if(a.beg)a.beg=false;if(Math.hypot(a.x-SL.x,a.z-SL.z)<18)a.hunger=Math.min(a.hunger||1,0.25);}emote(solon.headGroup,'food',0.9);}
  if(SL.act==='sweep'&&sp&&sp.mess){sp.start=sp.mess.dirt;emote(solon.headGroup,'leaf',0.9);}
  if(SL.act==='herd'&&sp&&!sp.herdSent){sp.herdSent=true;
    if(sp.mode==='bed'){for(const dog of DOGS)if(dog.state!=='kennel'&&dog.state!=='toKennel'&&!dog.inside){dog.state='toKennel';dog.path=null;dog.repath=0;dog.kennelT=0;}emote(solon.headGroup,'zzz',0.9);}
    else{for(const dog of DOGS)if(dog.state==='kennel'){dog.state='follow';dog.path=null;dog.happy=3;emote(dog.root,'heart',0.9);}BRAIN.nextLetOut=simTime+rnd(90,160);emote(solon.headGroup,'heart',0.9);}}
  if(SL.act==='train'&&sp&&sp.dog&&sp.dog.state==='follow'){startZoomies(sp.dog,SL.x,SL.z,SL.timer);emote(solon.headGroup,'ball',0.9);}
  if(SL.act==='chat')emote(solon.headGroup,'note',0.9);
}
function solonHerdSpot(mode){
  ISLAND.claim('dogs','solon',50);
  GATE.target=1;GATE.hold=true;GATE.closeAt=0;
  return {x:GATE_SPOT[0],z:GATE_SPOT[1],look:[-26.6,31.2],act:'herd',duty:true,mode};
}
function chooseSolonPlan(){
  const pic=islandPicture(),N=SOLON_NEEDS;
  const near=(x,z,r)=>{const s=snapWalkable(x+rnd(-r,r),z+rnd(-r,r));return s;};
  let spot=null;
  if(pic.anyEmpty&&pic.feedUrg>0.7&&ISLAND.free('feed','solon')){
    const b=ISLAND.bowls.slice().sort((a,c)=>a.food-c.food)[0];
    const lunaFar=Math.hypot(AI.x-b.x,AI.z-b.z)>Math.hypot(SL.x-b.x,SL.z-b.z)+6;
    if(lunaTiedUp()||lunaFar){ISLAND.claim('feed','solon',40);const s=near(b.x+0.8,b.z+0.45,0.25);spot={x:s[0],z:s[1],look:[b.x,b.z],act:'feed',duty:true,bowl:b};}
    else if(!ISLAND.note||ISLAND.note.until<simTime){solonPing('feed');spot={x:SL.x,z:SL.z,look:[AI.x,AI.z],act:'scout'};}
  }
  if(!spot&&pic.bedUrg>0.8&&pic.dogsOut.length&&ISLAND.free('dogs','solon')){
    if(lunaTiedUp(GATE_SPOT[0],GATE_SPOT[1])||pic.wet)spot=solonHerdSpot('bed');
    else if(pic.bedUrg>1.05&&(!ISLAND.note||ISLAND.note.until<simTime||ISLAND.note.job!=='bed')){solonPing('bed');spot={x:SL.x,z:SL.z,look:[AI.x,AI.z],act:'scout'};}
  }
  if(!spot&&pic.letUrg>0.6&&ISLAND.free('dogs','solon')&&lunaTiedUp(GATE_SPOT[0],GATE_SPOT[1]))spot=solonHerdSpot('out');
  if(!spot){
    const m=bestMess('solon',SL.x,SL.z);
    if(m&&m.dirt>0.48&&(lunaTiedUp(m.x,m.z)||m.dirt>0.72||N.duty>0.65)){
      ISLAND.claim('mess_'+m.id,'solon',40);const s=snapWalkable(m.x,m.z);
      spot={x:s[0],z:s[1],look:m.look,act:'sweep',duty:true,mess:m};
    }
  }
  if(!spot&&!pic.wet&&!pic.night&&N.play>0.4){
    const dog=DOGS.find(d=>d.state==='follow'&&(d.lonely||0)>0.4&&Math.hypot(d.x-SL.x,d.z-SL.z)<18&&!(AI.state==='act'&&(AI.act==='fetch'||AI.act==='chase'))&&ISLAND.free('pet_'+d.name,'solon'));
    if(dog){ISLAND.claim('pet_'+dog.name,'solon',22);const s=near(dog.x,dog.z,1.3);spot={x:s[0],z:s[1],look:[dog.x,dog.z],act:'train',dog};}
  }
  if(!spot&&N.social>0.5){
    const pals=[];
    if(!AI.inside&&!(AI.state==='act'&&['fish','swim','chop','sell','gate'].includes(AI.act)))pals.push(AI);
    if(!LM.inside&&!(LM.state==='act'&&['radio','tend','sweep'].includes(LM.act)))pals.push(LM);
    pals.sort((a,b)=>Math.hypot(a.x-SL.x,a.z-SL.z)-Math.hypot(b.x-SL.x,b.z-SL.z));
    const p=pals[0];
    if(p&&Math.hypot(p.x-SL.x,p.z-SL.z)<30){const s=near(p.x,p.z,1.8);spot={x:s[0],z:s[1],look:[p.x,p.z],act:'chat',who:p===AI?'luna':'moon'};}
  }
  if(!spot&&(pic.wet||pic.night&&N.rest>0.45)){const s=near(POI.veranda.x,POI.veranda.z,1.0);spot={x:s[0],z:s[1],look:POI.veranda.look,act:pic.wet?'sit':'hips'};}
  if(!spot){
    const poi=pick([POI.yard,POI.pier,POI.market,POI.shrine,POI.isle,POI.houseSteps]);
    const s=snapWalkable(poi.x+rnd(-1.1,1.1),poi.z+rnd(-1.1,1.1));
    spot={x:s[0],z:s[1],look:poi.look,act:Math.random()<0.55?'scout':'hips'};
  }
  SL.spot=spot;SL.walkSpeed=spot.duty?3.4:2.95;
  SL.path=planPath(SL.x,SL.z,spot.x,spot.z);SL.wp=0;SL.state='walk';SL.timer=28;
  SL.stuckT=0;SL.stuckN=0;SL.checkX=SL.x;SL.checkZ=SL.z;
}
function solonStuckCheck(dt){
  SL.stuckT=(SL.stuckT||0)+dt;if(SL.stuckT<1.6)return;SL.stuckT=0;
  if(Math.hypot(SL.x-(SL.checkX||0),SL.z-(SL.checkZ||0))<0.3){SL.stuckN=(SL.stuckN||0)+1;
    if(SL.stuckN<=2&&SL.spot){SL.path=planPath(SL.x,SL.z,SL.spot.x,SL.spot.z);SL.wp=0;}
    else{const s=snapWalkable(SL.x,SL.z);SL.x=s[0];SL.z=s[1];solonFinish(false);SL.spot=null;SL.state='idle';SL.timer=0.4;emote(solon.headGroup,'?',0.9,1.3,0.55);}}
  else SL.stuckN=0;
  SL.checkX=SL.x;SL.checkZ=SL.z;
}
function updateSolon(dt,time){
  for(const k in SOLON_NEEDS)SOLON_NEEDS[k]=Math.min(1,SOLON_NEEDS[k]+SOLON_RATES[k]*dt);
  SL.jumpT=Math.max(0,(SL.jumpT||0)-dt);
  if(SL.faceMode==='open'){
    SL.blinkTimer-=dt;
    if(SL.blinkTimer<=0){
      if(!SL.isBlinking){SL.isBlinking=true;solon.faceObj.drawFace('blink');SL.blinkTimer=0.12;}
      else{SL.isBlinking=false;solon.faceObj.drawFace('open');SL.blinkTimer=rnd(2.2,4.8);}
    }
  }
  if(INSIDE.on){
    if(!SL.inside){SL.inside=true;scene.remove(solon.root);INSIDE.scene.add(solon.root);SL.ix=1.6;SL.iz=1.2;SL.yaw=-0.4;SL.speed=0;solonFinish(false);SL.spot={x:SL.ix,z:SL.iz,act:'hips'};beginSolonAct('hips');}
    if(HOLD.solon){SL.speed=0;poseSolon(dt,time);return;}
    SL.timer-=dt;if(SL.timer<=0)beginSolonAct(pick(['hips','sit','wave','stretch']));
    const svX=SL.x,svZ=SL.z;SL.x=SL.ix;SL.z=SL.iz;poseSolon(dt,time);SL.x=svX;SL.z=svZ;return;
  }else if(SL.inside){
    SL.inside=false;INSIDE.scene.remove(solon.root);scene.add(solon.root);
    const s=snapWalkable(POI.houseSteps.x+1.8,POI.houseSteps.z+1.2);SL.x=s[0];SL.z=s[1];SL.state='idle';SL.timer=0.8;SL.spot=null;
  }
  if(HOLD.solon){
    SL.speed=lerp(SL.speed,0,Math.min(1,dt*12));
    if(SL.state==='walk'){SL.state='idle';SL.path=[];}
    poseSolon(dt,time);return;
  }
  if(CTRL.on&&FOLLOW_SOLON){solonCtrlUpdate(dt,time);return;}
  if(CTRL.solonStarted){CTRL.solonStarted=false;SL.mAct=null;SL.state='idle';SL.timer=0.5;}
  SL.timer-=dt;
  if(SL.state==='idle'){
    SL.speed=lerp(SL.speed,0,Math.min(1,dt*10));
    if(SL.timer<=0)chooseSolonPlan();
  }else if(SL.state==='walk'){
    if(!SL.path||SL.wp>=SL.path.length||SL.timer<=0){
      if(SL.spot&&SL.spot.look)SL.yaw=Math.atan2(SL.spot.look[0]-SL.x,SL.spot.look[1]-SL.z);
      beginSolonAct(SL.spot?SL.spot.act:'scout');
    }else{
      const[wx,wz]=SL.path[SL.wp],dx=wx-SL.x,dz=wz-SL.z,d=Math.hypot(dx,dz),last=SL.wp===SL.path.length-1;
      if(d<(last?0.35:0.65))SL.wp++;
      else{
        solonStuckCheck(dt);
        const diff=normalizeAngle(Math.atan2(dx,dz)-SL.yaw);
        SL.yaw+=diff*Math.min(1,dt*8);
        const sp=SL.walkSpeed*clamp(1-Math.abs(diff)/2.4,0.35,1);
        SL.speed=lerp(SL.speed,sp,Math.min(1,dt*7));
        const nx=SL.x+Math.sin(SL.yaw)*SL.speed*dt,nz=SL.z+Math.cos(SL.yaw)*SL.speed*dt;
        if(isPointWalkable(nx,nz,0.22)){SL.x=nx;SL.z=nz;}else{SL.x+=dx/d*SL.speed*dt;SL.z+=dz/d*SL.speed*dt;}
      }
    }
  }else if(SL.state==='act'){
    SL.speed=lerp(SL.speed,0,Math.min(1,dt*10));
    SL.actT+=dt;
    const sp=SL.spot;
    if(SL.act==='sweep'&&sp&&sp.mess){const p=clamp(SL.actT/Math.max(0.1,SL.actDur),0,1);sp.mess.dirt=sp.start*(1-p);ISLAND.drawMess(sp.mess);}
    if(SL.act==='herd')SL.yaw+=normalizeAngle(Math.atan2(-28-SL.x,31.2-SL.z)-SL.yaw)*Math.min(1,dt*4);
    if(SL.act==='chat'&&sp&&sp.look)SL.yaw+=normalizeAngle(Math.atan2(sp.look[0]-SL.x,sp.look[1]-SL.z)-SL.yaw)*Math.min(1,dt*5);
    if(SL.act==='train'&&sp&&sp.dog)SL.yaw+=normalizeAngle(Math.atan2(sp.dog.x-SL.x,sp.dog.z-SL.z)-SL.yaw)*Math.min(1,dt*6);
    if(SL.timer<=0){
      const duty=!!(sp&&sp.duty),act=SL.act;
      solonFinish(true);
      if(duty&&act!=='cheer'&&Math.random()<0.4){SL.spot={x:SL.x,z:SL.z,look:[SL.x,SL.z+2],act:'cheer'};beginSolonAct('cheer');}
      else{SL.spot=null;SL.state='idle';SL.timer=rnd(0.45,1.5);}
    }
  }
  poseSolon(dt,time);
}
function solonStatus(){
  if(HOLD.solon)return 'Solon is holding still';
  if(CTRL.on&&FOLLOW_SOLON)return solonCtrlStatus();
  const hat='';
  const sp=SL.spot;
  if(SL.state==='walk')return 'Solon '+hat+'is heading out to see what the island needs';
  if(SL.state==='act'){
    if(SL.act==='feed')return 'Solon '+hat+'is filling the food bowls';
    if(SL.act==='herd')return sp&&sp.mode==='out'?'Solon '+hat+'is letting Kiko and Bruno out':'Solon '+hat+'is bringing the pups in';
    if(SL.act==='sweep')return 'Solon '+hat+'is sweeping '+((sp&&sp.mess&&sp.mess.label)||'up');
    if(SL.act==='train')return 'Solon '+hat+'is coaching '+((sp&&sp.dog&&sp.dog.name)||'a pup');
    if(SL.act==='chat')return 'Solon '+hat+'is checking in with '+(sp&&sp.who==='moon'?'Lady Moon':'Luna');
    if(SL.act==='scout')return 'Solon '+hat+'is looking over the island';
    if(SL.act==='sit')return 'Solon '+hat+'is waiting out the weather on the veranda';
    if(SL.act==='cheer')return 'Solon '+hat+'hops, job done';
    if(SL.act==='hips')return 'Solon '+hat+'is surveying the yard, hands on hips';
    if(SL.act==='wave')return 'Solon '+hat+'waves hello';
  }
  return 'Solon '+hat+'is deciding the next job';
}
function solonCtrlAction(kind){
  if(SL.mAct)return;
  if(kind==='jump'){if(!(SL.jumpT>0))SL.jumpT=0.62;return;}
  if(kind==='wave'){SL.mAct={act:'wave',t:2};emote(solon.headGroup,'note',0.9);return;}
  if(kind==='pet'){let best=null,bd=2.8;for(const e of ALL_ANIMALS){if(e.inside||SKIP_STATES.has(e.state))continue;const d=Math.hypot(e.x-SL.x,e.z-SL.z);if(d<bd){bd=d;best=e;}}
    if(!best){toast('Walk Solon up to a pet to give them a cuddle');return;}
    best.prevState=best.state;best.state='petted';best.petBy='solon';best.lastPet=simTime;best.lonely=0;SL.mAct={act:'pet',t:2.6,ent:best,em:0};return;}
  if(kind==='throw'){let dog=null,dd=12;for(const d of DOGS){const k=Math.hypot(d.x-SL.x,d.z-SL.z);if(d.state==='follow'&&k<dd){dd=k;dog=d;}}
    if(!dog){toast('Bring a pup over so Solon can start zoomies');return;}SL.mAct={act:'train',t:5};startZoomies(dog,SL.x,SL.z,5);}
}
function solonCtrlUpdate(dt,time){
  if(!CTRL.solonStarted){solonFinish(false);SL.spot=null;SL.state='idle';CTRL.solonStarted=true;}
  const[x,y,m]=ctrlInput();
  if(SL.mAct){const a=SL.mAct;a.t-=dt;SL.speed=lerp(SL.speed,0,Math.min(1,dt*10));SL.state='act';SL.act=a.act;SL.actT=(SL.actT||0)+dt;
    if(a.act==='pet'&&a.ent){const e=a.ent;SL.yaw+=normalizeAngle(Math.atan2(e.x-SL.x,e.z-SL.z)-SL.yaw)*Math.min(1,dt*8);a.em-=dt;if(a.em<=0){a.em=0.8;emote(e.root,'heart',e.kind==='bunny'?0.65:e.kind==='dog'?0.95:0.8);}}
    if(a.act==='wave')SL.faceMode='happy';
    if(a.t<=0){if(a.act==='pet'&&a.ent&&a.ent.state==='petted'){const e=a.ent;e.state=e.kind==='dog'?(e.prevState==='kennel'?'kennel':'follow'):'idle';e.timer=rnd(3,6);e.petBy=null;}
      SL.mAct=null;SL.state='idle';SL.act=null;if(SL.faceMode!=='open'){SL.faceMode='open';solon.faceObj.drawFace('open');}}}
  else{SL.actT=0;let target=0;
    if(m>0){const th=STEER.th,fx=-Math.sin(th),fz=-Math.cos(th),rx=Math.cos(th),rz=-Math.sin(th),dx=fx*y+rx*x,dz=fz*y+rz*x;
      SL.yaw+=normalizeAngle(Math.atan2(dx,dz)-SL.yaw)*Math.min(1,dt*10);target=(m>0.92?4.5:2.85)*Math.min(1,m/0.92);
      if(!FREE.on&&!DIRECTOR.on&&Math.abs(x)<0.45&&y>0.3)tTheta+=normalizeAngle(SL.yaw+Math.PI-tTheta)*dt*0.7;}
    SL.speed=lerp(SL.speed,target,Math.min(1,dt*(target>SL.speed?6:10)));
    if(SL.speed>0.02){const st=SL.speed*dt,nx=SL.x+Math.sin(SL.yaw)*st,nz=SL.z+Math.cos(SL.yaw)*st;
      if(standable(nx,nz)){SL.x=nx;SL.z=nz;}else{let ok=false;
        for(const o of[0.5,-0.5,1,-1,1.4,-1.4]){const yy=SL.yaw+o,sx=SL.x+Math.sin(yy)*st*0.8,sz=SL.z+Math.cos(yy)*st*0.8;if(standable(sx,sz)){SL.x=sx;SL.z=sz;ok=true;break;}}
        if(!ok)SL.speed=Math.min(SL.speed,0.2);}}
    SL.state=SL.speed>0.15?'walk':'idle';SL.act=null;SL.path=[];SL.spot=null;}
  poseSolon(dt,time);
}
function solonCtrlStatus(){const a=SL.mAct;if(a&&a.act==='pet')return 'Solon is cuddling '+a.ent.name;if(a&&a.act==='wave')return 'Solon waves hello';if(a&&a.act==='train')return 'Zoomies with Solon!';
  return SL.state==='walk'?(CTRL.m>0.92?'Solon is running':'You are walking Solon around'):'Solon is waiting for you';}

const _resolveIsland=resolveTarget;
resolveTarget=function(tk){
  if((tk.id==='feedHouse'||tk.id==='feedYard')&&!ISLAND.free('feed','luna'))return null;
  if((tk.id==='bedtime'||tk.id==='letOut')&&!ISLAND.free('dogs','luna'))return null;
  return _resolveIsland(tk);
};
const _chooseIsland=chooseTask;
chooseTask=function(){
  if(!AI.inside&&!(CTRL.on&&!FOLLOW_MOON&&!FOLLOW_SOLON)&&!STILL.on&&(AI.state==='idle'||AI.state==='think')){
    const pic=islandPicture();
    const offer=(id,key)=>{
      if(!ISLAND.free(key,'luna'))return null;
      const tk=TASKS.find(t=>t.id===id);if(!tk)return null;
      const tgt=resolveTarget(tk);if(!tgt)return null;
      ISLAND.claim(key,'luna',key==='dogs'?45:32);
      return {tk,tgt,rid:id};
    };
    if(pic.feedUrg>0.9&&handsBusy('solon')<1){const yard=ISLAND.bowls[1].food<ISLAND.bowls[0].food;const c=offer(yard?'feedYard':'feedHouse','feed');if(c)return c;}
    if(pic.bedUrg>1.05){const c=offer('bedtime','dogs');if(c)return c;}
    if(pic.letUrg>0.7){const c=offer('letOut','dogs');if(c)return c;}
  }
  const c=_chooseIsland();
  if(c&&(c.tk.id==='feedHouse'||c.tk.id==='feedYard')&&ISLAND.free('feed','luna'))ISLAND.claim('feed','luna',32);
  if(c&&(c.tk.id==='bedtime'||c.tk.id==='letOut')&&ISLAND.free('dogs','luna'))ISLAND.claim('dogs','luna',45);
  return c;
};
const _replanIsland=lunaReplan;
lunaReplan=function(dt){
  _replanIsland(dt);
  if(AI.inside||(CTRL.on&&!FOLLOW_MOON&&!FOLLOW_SOLON)||STILL.on||!AI.task)return;
  const pic=islandPicture(),note=ISLAND.note;
  const urgentBed=pic.bedUrg>1.15&&ISLAND.free('dogs','luna')&&!['bedtime','gate','feedHouse','feedYard'].includes(AI.task.id);
  const pinged=note&&note.until>simTime&&note.job==='feed'&&pic.anyEmpty&&AI.task.act!=='feed'&&canInterrupt();
  if((canInterrupt()&&urgentBed)||pinged){if(AI.state==='act')endAct();else abortTask();if(pinged)emote(caretaker.headGroup,'food',0.85);}
};
const _moonPlanSolon=moonPlan;
moonPlan=function(){
  const ch=_moonPlanSolon();
  if(ch&&ch.radio)return ch;
  if(!SL.inside&&!(CTRL.on&&FOLLOW_SOLON)&&Math.hypot(SL.x-LM.x,SL.z-LM.z)<8&&MOON_NEEDS.social>0.6&&SL.state!=='walk'&&Math.random()<0.45){
    const[x,z]=randomSpotNear(SL.x,SL.z,2.1,1.2);
    return {x,z,look:[SL.x,SL.z],act:'wave'};
  }
  return ch;
};

/* ---------------- loop ---------------- */
const clock=new T.Clock(),M4=new T.Matrix4(),PERF={t:0,n:0,pr:PR};
patchWeatherScene();
applyTOD(0);updateCam();
function frameLoop(){
  const raw=clock.getDelta(),dt=Math.min(raw,0.05),time=clock.elapsedTime;
  CAM_DT=dt;idle+=dt;if(ptrs.size)idle=0;   // holding a finger or the mouse on the view counts as using the camera
  // Slow orbit: a second and a half after you let go, the camera eases into a gentle turn around whoever it follows.
  // It pauses while you steer with the controller (so "forward" on the stick doesn't drift), in free cam and during the launch.
  {const steering=CTRL.on&&CTRL.m>0.1,want=orbit&&idle>1.5&&!steering&&!FREE.on&&!CINE.on&&SPACE_LAUNCH.view.k<0.01?1:0;
   ORBIT_K+=(want-ORBIT_K)*Math.min(1,dt*0.8);
   if(!(DIRECTOR.on&&idle>DIRECTOR.resumeAfter))tTheta+=dt*0.05*ORBIT_K;}
  if(FREE.on)freeFly(dt);
  const wxChanged=updateWeather(dt,time);
  if(Math.abs(todTarget-tod)>0.0005){tod+=(todTarget-tod)*Math.min(1,dt*2.2);applyTOD(tod);if(!dragging){slider.value=Math.round(tod*1000);}setPressed();}
  else if(wxChanged)applyTOD(tod);

  updateCaretakerAI(dt,time);
  updateForage(dt);
  updateWildlifeAndVehicles(dt,time);
  SPACE_LAUNCH.update(dt);
  RADIO.update(dt,time);

  for(const m of WATER_MATS)m.uniforms.uTime.value=time;
  wfMat.uniforms.uTime.value=time;
  puffSeeds.forEach((s,i)=>{const ph=(time*0.6+s[2])%1,sc=s[3]*(0.6+ph*0.9);
    _e.set(0,s[2]+time*0.3,0);_q.setFromEuler(_e);
    M4.compose(_v.set(WF.x+s[0]*(1+ph*0.4),WATER+0.2+ph*0.9,WF.zBot+0.6+s[1]),_q,_s.set(sc,sc*0.7,sc));foamPuffs.setMatrixAt(i,M4);});
  foamPuffs.instanceMatrix.needsUpdate=true;
  cloudGroup.rotation.y=time*0.002;updateSky(dt);
  statusT-=dt;if(statusT<=0){statusT=0.4;const wx=WEATHER.storm?' · Storm':WEATHER.snow?' · Snow':'';
    const order=FOLLOW_SOLON?['solon','luna','moon']:FOLLOW_MOON?['moon','luna','solon']:['luna','moon','solon'];
    const say={luna:lunaStatus,moon:ladyMoonStatus,solon:solonStatus};
    const st=((CAL.holidayName?CAL.holidayName+' · ':'')+order.map(k=>say[k]()).join(' · ')+wx).replace(/\s*<small>/g,' (').replace(/<\/small>/g,')').replace(/<[^>]*>/g,'').replace(/\s+/g,' ');
    if(st!==statusEl.textContent)statusEl.textContent=st;}
  // keep the frame rate smooth on slower devices by trading a little resolution
  PERF.t+=raw;PERF.n++;if(PERF.t>2){const avg=PERF.t/PERF.n;PERF.t=0;PERF.n=0;
    const next=avg>0.024?Math.max(MOBILE?0.75:1,PERF.pr-0.25):avg<0.013?Math.min(PR,PERF.pr+0.25):PERF.pr;
    if(next!==PERF.pr){PERF.pr=next;renderer.setPixelRatio(next);if(composer){composer.setPixelRatio&&composer.setPixelRatio(next);composer.setSize(innerWidth,innerHeight);}}}

  const autoNow=DIRECTOR.on&&idle>DIRECTOR.resumeAfter;
  if(CINE.update(dt)){}
  else if(INSIDE.on){insideCam(dt);updateCam();updateInsideLook(dt,time);}
  else if(autoNow){directorUpdate(dt,time);}else{if(DIRECTOR.on)DIRECTOR.lookInit=false;updateCam();}
  shotChip.classList.toggle('on',DIRECTOR.on);
  if(DIRECTOR.on&&!autoNow&&!INSIDE.on&&DIRECTOR.lastLabel!=='manual'){DIRECTOR.lastLabel='manual';document.getElementById('shotLbl').innerHTML='You have the camera <small>auto resumes</small>';}
  SHADOW_N++;renderer.shadowMap.needsUpdate=!INSIDE.on&&SHADOW_N%((MOBILE?3:2)+(PERF.pr<PR?1:0))===0;
  // indoors at night the bloom was blowing the lamps out; outdoors keeps the usual look, and the film sets its own
  if(bloom&&!CINE.on){
    const k=nightK;
    if(INSIDE.on){
      bloom.strength=lerp(0.26,0.38,k);bloom.threshold=lerp(0.9,0.84,k);bloom.radius=lerp(0.4,0.45,k);
      caretaker.charLight.intensity=lerp(0.28,0.34,k);
    }else{
      bloom.strength=lerp(0.28,0.72,k);bloom.threshold=lerp(0.9,0.64,k);bloom.radius=lerp(0.45,0.65,k);
      caretaker.charLight.intensity=lerp(0.35,0.85,smooth(0.25,0.95,k));
    }
  }
  if(SPACE_LAUNCH.active)SPACE_LAUNCH.faceCloud();
  const scn=INSIDE.on?INSIDE.scene:scene;if(composer){RPASS.scene=scn;composer.render();}else renderer.render(scn,camera);
  requestAnimationFrame(frameLoop);
}
// background tabs: silence the rain/thunder and don't let the first frame back jump the simulation forward
document.addEventListener('visibilitychange',()=>{
  if(AUDIO.ctx){try{document.hidden?AUDIO.ctx.suspend():AUDIO.ctx.resume();}catch(e){}}
  FILM_MUSIC.pauseForTab(document.hidden);
  if(!document.hidden)clock.getDelta();});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();const er=document.getElementById('err');
  er.textContent='The graphics were paused by your device. Your coins and items are saved. ';
  const b=document.createElement('button');b.type='button';b.textContent='Reload';b.className='err-reload';b.onclick=()=>location.reload();er.appendChild(b);er.style.display='block';});
const FORAGE=[];
function seedForage(){
  const spots=[],Ru=(a,b)=>a+(b-a)*Math.random();
  let tries=0;
  while(spots.filter(s=>s.kind==='shell').length<6&&tries<800){
    tries++;const x=Ru(-48,68),z=Ru(-36,48);
    if(typeof isOnDock==='function'&&isOnDock(x,z))continue;
    if(!isPointWalkable(x,z,0.25))continue;
    const wd=waterDist(x,z);if(wd<1.15||wd>4.4)continue;
    if(spots.some(s=>Math.hypot(s.x-x,s.z-z)<3.4))continue;
    spots.push({kind:'shell',x,z});
  }
  tries=0;
  while(spots.filter(s=>s.kind==='blossom').length<5&&tries<800){
    tries++;const x=Ru(6,52),z=Ru(-30,24);
    if(!isPointWalkable(x,z,0.25))continue;
    if(waterDist(x,z)<2.2)continue;
    if(spots.some(s=>Math.hypot(s.x-x,s.z-z)<3.6))continue;
    spots.push({kind:'blossom',x,z});
  }
  const shellMat=mStd('#f4efe4',{roughness:0.42});
  const petal=mStd('#ffb7d0',{roughness:0.55}),heart=mStd('#f2c94c',{roughness:0.5});
  for(const s of spots){
    const g=new T.Group(),y=meshH(s.x,s.z);g.position.set(s.x,y+0.02,s.z);
    if(s.kind==='shell'){const sh=new T.Mesh(new T.SphereGeometry(0.1,12,8),shellMat);sh.scale.set(1.35,0.42,0.95);sh.rotation.y=Ru(0,3);g.add(sh);}
    else{for(let k=0;k<5;k++){const a=k/5*6.28,p=new T.Mesh(new T.SphereGeometry(0.042,8,6),petal);p.position.set(Math.cos(a)*0.055,0.06,Math.sin(a)*0.055);g.add(p);}
      const c=new T.Mesh(new T.SphereGeometry(0.028,8,6),heart);c.position.y=0.07;g.add(c);}
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    scene.add(g);FORAGE.push({kind:s.kind,x:s.x,z:s.z,g,wait:0});
  }
}
function updateForage(dt){
  for(const f of FORAGE)if(f.wait>0){f.wait-=dt;if(f.wait<=0){f.wait=0;f.g.visible=true;f.g.position.y=meshH(f.x,f.z)+0.02;}}
}
function gatherNearby(){
  const who=followWho();
  const body=who==='solon'?SL:who==='moon'?LM:AI;
  if(INSIDE.on||body.inside){toast('Step outside to gather');return;}
  let best=null,bd=2.4;
  for(const f of FORAGE){if(!f.g.visible||f.wait>0)continue;const d=Math.hypot(f.x-body.x,f.z-body.z);if(d<bd){bd=d;best=f;}}
  if(!best){toast('Walk up to a shell or a blossom, then press Gather');return;}
  addGood(best.kind,1);best.g.visible=false;best.wait=42;
  const head=who==='solon'?solon.headGroup:who==='moon'?ladyMoon.headGroup:caretaker.headGroup;
  emote(head,'sparkle',0.9);
  toast(CAST_NAME[who]+' picked up a '+(best.kind==='shell'?'seashell':'blossom')+' · worth '+PRICES[best.kind]+' coins');
}
seedForage();
requestAnimationFrame(()=>{frameLoop();document.getElementById('loading').classList.add('gone');
  // first visit: a short welcome card
  let seen=false;try{seen=!!localStorage.getItem('lunas-welcomed-v2');}catch(e){}
  if(!seen){const w=document.getElementById('welcome'),b=document.getElementById('wStart');w.hidden=false;b.focus();
    const close=()=>{w.hidden=true;try{localStorage.setItem('lunas-welcomed-v2','1');}catch(e){}};b.onclick=close;
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!w.hidden)close();});}
});
})();
