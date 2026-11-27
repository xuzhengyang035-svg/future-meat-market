// Neighbouring premises modelled in metres. Each pivot is the centre of its street frontage.
import * as T from 'three';
import { decal, pbr, model, modelSize } from './assets.js';
import { billboard } from './billboards.js';
import { canvasTexture } from './textures.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// Scanned PBR surfaces mapped in world space: one texture set per surface, brick courses run on across every piece.
const WORLD = {};
function worldMat(name, { size = 2, color, roughness = 1, metalness = 0, normalScale = 1, env = 1, rough = true } = {}) {
  const key = [name, size, color, roughness, metalness, normalScale].join('|');
  if (WORLD[key]) return WORLD[key];
  const m = pbr(name, 1, 1, { size: 1, color, roughness, metalness, normalScale, envMapIntensity: env, ao: false });
  if (!rough) m.roughnessMap = null;
  const k = (1 / size).toFixed(4);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      { vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz; vec3 wn = normalize(mat3(modelMatrix) * normal);
        vec2 wu = abs(wn.y) > 0.7 ? wp.xz : (abs(wn.x) > abs(wn.z) ? vec2(-wp.z * sign(wn.x), wp.y) : vec2(wp.x * sign(wn.z), wp.y));
        wu *= ${k};
        #ifdef USE_MAP
          vMapUv = wu;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = wu;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = wu;
        #endif
      }`);
  };
  m.customProgramCacheKey = () => 'world' + k;
  return (WORLD[key] = m);
}
export function addMarketLane(root) {
  const loader = new T.TextureLoader();
  function texture(name) {
    const t = loader.load(new URL('./assets/market-lane/' + name + '.webp', import.meta.url).href);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const mat = (color, roughness=.78, metalness=0) => new T.MeshStandardMaterial({color, roughness, metalness});
  const iron = worldMat('PaintedMetal012',{size:.8,color:0x3a3e3c,metalness:1,roughness:1});
  const coping = worldMat('concrete_wall_008',{size:1.4,color:0x9a958a,rough:false});
  const timber = worldMat('rough_wood',{size:.9,color:0x6e5e4c,rough:false});
  const slate = worldMat('grey_roof_tiles',{size:2,color:0x4a4e52,roughness:1,env:.5});
  const slateFlat = mat(0x465453,.61);
  const frame = worldMat('green_rough_planks',{size:.8,color:0x8e948a,rough:false}), frameFlat = mat(0x5a5a52);
  const dark = mat(0x232e30,.29,.35), cream = mat(0xc2b598);
  const unit = new T.BoxGeometry();
  function piece(g,x,y,z,w,h,d,m) {
    const o=new T.Mesh(unit,m); o.position.set(x,y,z); o.scale.set(w,h,d); g.add(o); return o;
  }
  const SKIN={'kiln-brick':['red_brick_plaster_patch_02',1.45,0xb4a196],limewash:['painted_plaster_wall',2.6,0xc8c0a4],
    ashlar:['plastered_stone_wall',2.2,0x9a948a],zinc:['corrugated_iron',1.7,0xaab0aa],shed:['factory_wall',2.2,0x8a9a8a]};
  function surface(name,w,h,tone){
    const [scan,size,base]=SKIN[name];
    return worldMat(scan,{size,color:tone??base,metalness:name==='zinc'?.45:0,roughness:name==='zinc'?.8:1,normalScale:name==='kiln-brick'?1.3:1});
  }
  const hash=(n)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  // What is behind each lit pane: an office under strip lights, a store room, blinds, a lived-in flat, a stairwell, a TV.
  const paneTex=(kind,seed)=>canvasTexture(128,128,(g,W,H)=>{
    let n=seed;const r=()=>(n=(n*16807)%2147483647)/2147483647;
    const P={office:['#1c2226','#9fb4b0','#e8fff8'],store:['#140e08','#5a4026','#e0b070'],blinds:['#2a2016','#c8a070','#ffe0b0'],
      flat:['#1a0e08','#a0643a','#ffc890'],stair:['#0e120e','#3a4a3a','#b8d0a0'],tv:['#05080e','#203a6a','#90b8ff']}[kind];
    g.fillStyle=P[0];g.fillRect(0,0,W,H);
    const hx=W*(.2+r()*.6),hy=H*(.15+r()*.3),gr=g.createRadialGradient(hx,hy,2,hx,hy,W*(kind==='stair'?.6:1));
    gr.addColorStop(0,P[2]);gr.addColorStop(.4,P[1]);gr.addColorStop(1,P[0]);g.fillStyle=gr;g.fillRect(0,0,W,H);
    g.fillStyle='rgba(0,0,0,.6)';
    if(kind==='office'){g.fillStyle=P[2];for(const x of [.2,.65])g.fillRect(W*x,6,W*.22,4);g.fillStyle='rgba(0,0,0,.6)';
      for(let k=0;k<3;k++){const x=6+k*42+r()*6;g.fillRect(x,H*.62,36,5);g.fillRect(x+10,H*.48,16,12);g.fillStyle='rgba(160,200,255,.5)';g.fillRect(x+12,H*.5,12,8);g.fillStyle='rgba(0,0,0,.6)';}
      g.fillRect(W*.05,H*.35,10,H*.65);}
    if(kind==='store'){for(let k=0;k<9;k++){const x=r()*W*.9,h=10+r()*18,y=H-h-(k%3)*18;g.fillStyle=`rgba(${60+r()*40},${40+r()*30},20,.85)`;g.fillRect(x,y,14+r()*16,h);}
      g.fillStyle='rgba(0,0,0,.7)';g.fillRect(hx-.5,0,1,hy);}
    if(kind==='blinds'){for(let y=0;y<H*(.5+r()*.5);y+=5){g.fillStyle='rgba(30,20,10,.55)';g.fillRect(0,y,W,1.6);}}
    if(kind==='flat'){g.fillRect(4,H*.3,24,H*.7);g.fillRect(W*.45,H*.7,40,7);g.fillRect(W*.45+2,H*.7,4,H*.3);
      for(let k=0;k<3;k++){g.strokeStyle='rgba(0,0,0,.5)';g.strokeRect(W*.4+k*16,H*.25+(k%2)*6,11,14);}}
    if(kind==='stair'){g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=3;g.beginPath();g.moveTo(0,H*.9);g.lineTo(W,H*.35);g.stroke();
      g.lineWidth=1.5;for(let x=8;x<W;x+=14){g.beginPath();g.moveTo(x,H*.9-x*.43);g.lineTo(x,H*.9-x*.43+18);g.stroke();}}
    if(kind==='tv'){g.fillStyle='rgba(0,0,0,.75)';g.beginPath();g.ellipse(W*.5,H*.82,22,18,0,Math.PI,0);g.fill();g.fillRect(W*.2,H*.82,W*.6,H*.18);}
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,W,3);g.fillRect(0,H-3,W,3);
  });
  const PANES=[['office',.95,0xffffff],['office',.5,0xd8f0ff],['store',.55,0xffffff],['blinds',.85,0xffffff],['flat',1,0xffffff],
    ['flat',.6,0xffd8b0],['stair',.45,0xffffff],['tv',.7,0xffffff],['blinds',.45,0xffe8c8]].map(([kind,k,tint],i)=>
    new T.MeshStandardMaterial({color:0x101010,emissive:tint,emissiveMap:paneTex(kind,11+i*17),emissiveIntensity:k,roughness:.12,metalness:.4}));
  const panes=[dark,...PANES];
  function window(g,x,y,w,h,z,id) {
    piece(g,x,y,z,w+.17,h+.17,.18,frame);
    {const r=hash(id);piece(g,x,y,z+.11,w,h,.07,r<.42?dark:PANES[Math.floor(hash(id+7.3)*PANES.length)]);}
    piece(g,x,y+h*.19,z+.16,w,.057,.035,timber);
    piece(g,x,y,z+.16,.048,h,.035,timber);
    piece(g,x,y-h/2-.09,z+.09,w+.29,.13,.36,coping);
    if(id%4===1) piece(g,x,y+h*.32,z+.15,w*.98,h*.34,.018,cream);
  }
  const colours = {wash:0x718f89,keane:0x9b7b47,moran:0x694339,paper:0x344f41,tide:0x617780,loading:0x555751};
  const enamel=mat(0xb7bab0,.62), rubber=mat(0x24282a,.94), brass=mat(0x95805e,.52,.28);
  const spines=[0x713e32,0x31463c,0x5a6870,0x977948,0x716255,0x474358].map(c=>mat(c));
  const lens = new T.MeshStandardMaterial({color:0x575e5c,roughness:.36,metalness:.06,transparent:true,opacity:.075,depthWrite:false});
  const bulb=new T.MeshStandardMaterial({color:0xebd1a1,emissive:0xffcf8b,emissiveIntensity:.8});
  const axis=new T.Vector3(0,1,0);
  function rod(g,a,b,r,m,r2=r,segments=12){
    const start=new T.Vector3(...a), end=new T.Vector3(...b), vec=end.clone().sub(start);
    const o=new T.Mesh(new T.CylinderGeometry(r2,r,vec.length(),segments),m);
    o.position.copy(start).lerp(end,.5);o.quaternion.setFromUnitVectors(axis,vec.normalize());g.add(o);return o;
  }
  function label(g,shop,w,y,z){
    const board=new T.Mesh(new T.PlaneGeometry(w,.62),new T.MeshStandardMaterial({map:texture(shop+'-sign'),roughness:.91}));
    board.position.set(0,y,z);g.add(board);
  }
  function interior(g,shop,w,wall){
    const W=Math.min(w-.55,6.65), edge=mat(colours[shop]), door=-W/2+.73, display=.7, span=W-1.55;
    const side=(w-W)/2;
    for(const k of [-1,1]){
      piece(g,k*(W/2+side/2),1.8,-1.5,side,3.6,3,wall);
      piece(g,k*(W/2-.06),1.8,.05,.13,3.5,.22,edge);
    }
    piece(g,0,1.8,-3.07,w,3.6,.16,wall);
    piece(g,0,.16,-1.45,W,.12,3.05,mat(0x716b5d));
    piece(g,0,3.45,-1.45,W,.2,3.1,timber);
    piece(g,0,3.14,.07,W,.68,.29,edge);label(g,shop,W-.12,3.14,.219);
    piece(g,door,1.49,-.43,1.23,2.55,.12,edge);
    piece(g,door,1.77,-.355,.91,1.46,.04,dark);
    piece(g,door+.43,1.09,-.28,.045,.26,.08,brass);
    piece(g,door,2.59,-.34,1.02,.18,.045,cream);
    for(const px of [door-.64,door+.64]) piece(g,px,1.54,-.18,.1,2.64,.54,edge);
    piece(g,display,.48,.015,span,.62,.19,edge);
    for(let k=0;k<=3;k++)piece(g,display-span/2+k*span/3,1.73,.045,.065,2.09,.13,edge);
    if(shop!=='loading')piece(g,display,1.8,-.028,span,2.0,.012,lens);
    piece(g,display,2.45,.05,span,.06,.14,edge);
    piece(g,display,2.92,-1.15,2.15,.07,.16,bulb);
    if(shop==='wash'){
      for(let i=0;i<3;i++){
        const x=display+(i-1)*1.16,z=-1.1-(i===2?.18:0);
        piece(g,x,.98,z,1.09,1.52,.91,enamel);
        piece(g,x,1.53,z+.46,.97,.19,.04,frame);
        rod(g,[x,.96,z+.45],[x,.96,z+.51],.40,rubber,.4,32);
        rod(g,[x,.96,z+.51],[x,.96,z+.54],.30,slateFlat,.30,32);
        const ring=new T.Mesh(new T.TorusGeometry(.34,.041,8,36),iron);ring.position.set(x,.96,z+.55);g.add(ring);
        piece(g,x-.27,1.53,z+.5,.21,.07,.025,dark);piece(g,x+.26,1.53,z+.5,.07,.07,.03,brass);
      }
    } else if(shop==='paper'||shop==='moran'){
      for(let shelf=0;shelf<3;shelf++){
        const y=.82+shelf*.57,z=-.88-shelf*.33;
        piece(g,display,y,z,span-.24,.085,.48,timber);
        for(let j=0;j<(shop==='paper'?18:9);j++){
          const count=shop==='paper'?18:9,x=display+(j+.5-count/2)*(span-.52)/count;
          const h=.27+.14*(.5+.5*Math.sin(j*6.7+shelf*4));
          const book=piece(g,x,y+.045+h/2,z,.83*(span-.52)/count,h,.27,shop==='paper'?spines[(j*5+shelf)%6]:cream);
          book.rotation.z=Math.sin(j*9+shelf)*.065;
          piece(g,x,y+.15,z+.142,book.scale.x*.72,.018,.012,shop==='paper'?brass:timber);
        }
      }
    } else if(shop==='keane'){
      piece(g,display,1.78,-1.19,span-.20,1.95,.09,timber);
      for(let i=0;i<10;i++){
        const x=display+(i-4.5)*(span-.42)/10,y=1.85+.15*Math.sin(i*4);
        rod(g,[x-.04,y-.38,-1.04],[x,y+.18,-1.04],.041,brass);
        if(i%3===0){const ring=new T.Mesh(new T.TorusGeometry(.12,.028,6,16),iron);ring.position.set(x,y+.22,-1.04);g.add(ring);}
        else piece(g,x+(i%2)*.038,y+.19,-1.04,i%2?.22:.32,i%2?.16:.08,.1,iron);
      }
      piece(g,display,.89,-.94,span-.18,.16,.72,enamel);
    } else if(shop==='tide'){
      for(let j=0;j<3;j++){
        const x=display+(j-1)*1.15;
        piece(g,x,.94,-1.02,1.07,.46,.95,enamel);
        for(let i=0;i<3;i++){
          const fish=new T.Mesh(new T.SphereGeometry(1,12,7),i===1?slateFlat:frameFlat);fish.scale.set(.36,.09,.105);fish.position.set(x,1.2,-.75-i*.25);fish.rotation.y=.13*(i-1);g.add(fish);
          const tail=new T.Mesh(new T.ConeGeometry(.12,.22,3),iron);tail.rotation.z=Math.PI/2;tail.position.set(x+.33,1.2,fish.position.z);g.add(tail);
        }
      }
    } else {
      piece(g,display,1.77,-.65,span,2.96,.12,iron);
      for(let j=0;j<21;j++)piece(g,display,.42+j*.13,-.55,span,.055,.085,frame);
    }
  }
  const moss=[0x425937,0x617448,0x748355,0x4e6341].map(c=>mat(c,.93));
  const clay=mat(0x94654d,.93), linen=mat(0xb4a283,.94), blueCloth=mat(0x637d80,.94);
  const amber=new T.MeshStandardMaterial({color:0xe8bd83,emissive:0xffc678,emissiveIntensity:1.1});
  const porcelain=mat(0xd3d7c7,.52), greenPaint=mat(0x536c58,.8);
  const olive=new T.SphereGeometry(1,8,5), wheelGeo=new T.TorusGeometry(.325,.029,8,30);
  function oval(g,x,y,z,a,b,c,m){
    const o=new T.Mesh(olive,m);o.position.set(x,y,z);o.scale.set(a,b,c);g.add(o);return o;
  }
  // Real scanned house plants (Poly Haven), picked per spot and sized to the old placeholder's height.
  const PLANTS=['potted_plant_01','potted_plant_04','fern_02','calathea_orbifolia_01','pachira_aquatica_01','anthurium_botany_01','potted_plant_02'];
  const plantH={};
  function plant(g,x,y,z,size,seed){
    const name=PLANTS[Math.abs(Math.round(seed*7+x*3))%PLANTS.length];
    if(plantH[name]===undefined){const b=modelSize(name);plantH[name]=b?b.max[1]-b.min[1]:.6;}
    const target=.62*size*(name==='pachira_aquatica_01'?1.5:1);
    return model(name,{pos:[x,y,z],rot:seed*1.7,scale:target/Math.max(.1,plantH[name]),parent:g});
  }
  const prints=new Map();
  function picture(g,name,x,y,z,w,h,glow=.22){
    if(!prints.has(name)){
      const map=texture(name);
      prints.set(name,new T.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:glow,roughness:.93}));
    }
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),prints.get(name));mesh.position.set(x,y,z);g.add(mesh);return mesh;
  }
  function chair(g,x,y,z,turn=0){
    const a=new T.Group();a.position.set(x,y,z);a.rotation.y=turn;g.add(a);
    for(const dx of [-.21,.21]) for(const dz of [-.19,.19])rod(a,[dx*1.22,0,dz*1.25],[dx,.47,dz],.022,iron);
    for(let i=0;i<4;i++)piece(a,0,.465,-.17+.115*i,.48,.045,.095,timber);
    for(const dx of [-.21,.21])rod(a,[dx,.43,-.18],[dx,.91,-.26],.023,iron);
    for(const y of [.76,.87])piece(a,0,y,-.25,.48,.073,.045,timber);
  }
  function curtain(g,x,y,z,w,h,m,phase){
    const geo=new T.PlaneGeometry(w,h,16,4);const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){const u=pos.getX(i)/w+.5,v=pos.getY(i)/h+.5;
      pos.setXYZ(i,pos.getX(i)+(1-v)*.022*Math.sin(phase),pos.getY(i)+.035*(1-v)*Math.sin(u*16),.064*Math.cos(u*22+phase));}
    geo.computeVertexNormals();const cloth=new T.Mesh(geo,m);cloth.position.set(x,y,z);g.add(cloth);
  }
  function pendant(g,x,y,z,drop,cool=false){
    rod(g,[x,y,z],[x,y-drop,z],.014,iron);rod(g,[x,y-drop-.145,z],[x,y-drop,z],.23,greenPaint,.055);
    rod(g,[x,y-drop-.154,z],[x,y-drop-.14,z],.19,cool?porcelain:amber);
  }
  // Every flat is somebody's: its own wallpaper, light, furniture and window dressing.
  const ROOM_KINDS=['study','living','kitchen','bedroom','plants','tv','empty'];
  const roomMats=new Map();
  function roomWall(kind,seed){
    const key=kind+seed;if(roomMats.has(key))return roomMats.get(key);
    let n=seed*7919+13;const r=()=>(n=(n*16807)%2147483647)/2147483647;
    const PAPER=[['#6a4a3a','#7a5644'],['#3e5246','#48604f'],['#7a6a4a','#86764f'],['#5a4a5a','#665468'],['#8a7a62','#968670'],['#4a5a66','#546876'],['#86705a','#927a62']];
    const [base,alt]=PAPER[Math.floor(r()*PAPER.length)];
    const map=canvasTexture(256,192,(g,W,H)=>{
      g.fillStyle=base;g.fillRect(0,0,W,H);
      const pat=kind==='kitchen'?'tile':kind==='empty'?'bare':['stripe','floral','diamond','plain','frames'][Math.floor(r()*5)];
      g.fillStyle=alt;g.strokeStyle=alt;
      if(pat==='stripe')for(let x=0;x<W;x+=14){g.fillRect(x,0,5,H);g.fillRect(x+8,0,1.5,H);}
      if(pat==='floral')for(let y=6;y<H;y+=16)for(let x=(y/16%2)*9;x<W;x+=18){g.beginPath();for(let k=0;k<5;k++){const t=k*1.2566;g.ellipse(x+Math.cos(t)*3,y+Math.sin(t)*3,2.4,2.4,0,0,7);}g.fill();}
      if(pat==='diamond'){g.lineWidth=1.5;for(let x=-H;x<W;x+=16){g.beginPath();g.moveTo(x,0);g.lineTo(x+H,H);g.moveTo(x+H,0);g.lineTo(x,H);g.stroke();}}
      if(pat==='tile'){g.fillStyle='#c8ccc0';g.fillRect(0,H*.35,W,H*.4);g.strokeStyle='rgba(60,60,50,.6)';g.lineWidth=1;
        for(let y=H*.35;y<H*.75;y+=10){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}for(let x=0;x<W;x+=10){g.beginPath();g.moveTo(x,H*.35);g.lineTo(x,H*.75);g.stroke();}}
      if(pat==='bare'){for(let i=0;i<30;i++){g.fillStyle=`rgba(${r()<.5?40:200},${r()<.5?36:190},30,${.1+r()*.15})`;g.beginPath();g.ellipse(r()*W,r()*H,10+r()*40,6+r()*20,r()*3,0,7);g.fill();}
        g.fillStyle='rgba(0,0,0,.45)';g.fillRect(W*.3,H*.2,W*.3,H*.25);}                                      // a pale square where a picture hung
      if(pat==='frames'||kind==='living'||kind==='bedroom')for(let k=0;k<2+Math.floor(r()*3);k++){
        const fw=14+r()*26,fh=12+r()*22,fx=W*(.15+r()*.65),fy=H*(.15+r()*.25);g.fillStyle='#2a2018';g.fillRect(fx-2,fy-2,fw+4,fh+4);
        g.fillStyle=`hsl(${r()*360},${20+r()*30}%,${35+r()*30}%)`;g.fillRect(fx,fy,fw,fh);}
      if(kind==='kitchen'){g.fillStyle='#d8d4c4';g.fillRect(0,0,W,H*.3);g.strokeStyle='rgba(0,0,0,.4)';for(let x=0;x<W;x+=W/4)g.strokeRect(x+2,2,W/4-4,H*.3-4);}
      if(kind==='tv'){const tg=g.createRadialGradient(W*.5,H*.7,4,W*.5,H*.7,W*.6);tg.addColorStop(0,'rgba(120,160,255,.55)');tg.addColorStop(1,'rgba(0,0,40,0)');g.fillStyle=tg;g.fillRect(0,0,W,H);}
      const lx=W*(.2+r()*.6),ly=H*(.15+r()*.4),lg=g.createRadialGradient(lx,ly,4,lx,ly,W*(kind==='tv'||kind==='empty'?.5:.9));  // the room's own light falls off into the corners
      lg.addColorStop(0,'rgba(255,240,210,.35)');lg.addColorStop(.5,'rgba(0,0,0,0)');lg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=lg;g.fillRect(0,0,W,H);
      g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,H-10,W,10);g.fillRect(0,0,W,4);
    });
    const LIGHT={study:[0xffd8a8,.62],living:[0xffc890,.7],kitchen:[0xe8fff4,.85],bedroom:[0xffb070,.38],plants:[0xf0f0d0,.6],tv:[0x9ab8ff,.32],empty:[0xffffff,.07]}[kind];
    const k=LIGHT[1]*(.8+r()*.45);
    const m=new T.MeshStandardMaterial({map,emissiveMap:map,emissive:LIGHT[0],emissiveIntensity:k,roughness:.93});
    // Reveals, ceiling and floor are lit by the room, not by the street.
    m.userData.shell=new T.MeshStandardMaterial({color:0x000000,emissive:new T.Color(base).lerp(new T.Color(LIGHT[0]),.4),emissiveIntensity:k*.55,roughness:1});
    m.userData.floor=new T.MeshStandardMaterial({color:0x000000,emissive:0x3a2a1c,emissiveIntensity:k*.7,roughness:1});
    roomMats.set(key,m);return m;
  }
  const cloths=[linen,blueCloth,mat(0x7a3a30,.95),mat(0x4a5a3a,.95),mat(0xa08850,.95),mat(0x5a4a62,.95)];
  const net=new T.MeshStandardMaterial({color:0xe8e4d8,roughness:1,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false});
  const fridgeMat=mat(0xd8d8cc,.4),sofaMat=[mat(0x6a3a2a,.95),mat(0x3a4a5a,.95),mat(0x6a6a4a,.95)];
  function rbox(g,x,y,z,w,h,d,m,r=.03){const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m);o.position.set(x,y,z);g.add(o);return o;}
  function flat(g,x,y,w,h,id){
    const ax=Math.abs(id), back=-1.62, floor=y-h/2, ceiling=y+h/2, hv=(k)=>hash(ax*3.7+k);
    const kind=ROOM_KINDS[Math.floor(hv(1)*ROOM_KINDS.length)];
    const rw=roomWall(kind,ax);
    {const o=new T.Mesh(new T.PlaneGeometry(w,h),rw);o.position.set(x,y,back);g.add(o);}
    piece(g,x,floor,back/2,w,.08,-back,rw.userData.floor);
    piece(g,x,ceiling,back/2,w,.09,-back,rw.userData.shell);
    for(const s of [-1,1])piece(g,x+s*w/2,y,back/2,.07,h,-back,rw.userData.shell);
    // Furniture is set back from the sill. The frame masks it differently on each approach.
    const side=hv(2)<.5?-1:1, dx=x+side*.2*w;
    if(kind==='study'){
      piece(g,dx,floor+.52,-1.08,w*.57,.07,.56,timber);
      for(const sx of [-1,1])piece(g,dx+sx*w*.23,floor+.24,-1.05,.055,.48,.08,timber);
      rod(g,[dx,floor+.57,-1.05],[dx,floor+.89,-1.05],.026,brass);rod(g,[dx,floor+.86,-1.05],[dx,floor+1.15,-1.05],.24,amber,.12);
      for(let j=0;j<4;j++)piece(g,dx-.3,floor+.6+j*.055,-.98,.22,.05,.16,spines[(j+ax)%6]);
      piece(g,x-side*.32*w,floor+.9,-1.45,.5,1.8,.3,timber);for(let k=0;k<4;k++)for(let j=0;j<5;j++)piece(g,x-side*.32*w-.18+j*.09,floor+.35+k*.42,-1.38,.07,.3,.18,spines[(k*5+j+ax)%6]);
    }else if(kind==='living'){
      rbox(g,dx,floor+.32,-1.25,w*.7,.62,.5,sofaMat[ax%3],.08);rbox(g,dx,floor+.68,-1.45,w*.7,.4,.14,sofaMat[ax%3],.06);
      rod(g,[x-side*.38*w,floor,-1.3],[x-side*.38*w,floor+1.4,-1.3],.015,brass);rod(g,[x-side*.38*w,floor+1.32,-1.3],[x-side*.38*w,floor+1.58,-1.3],.2,amber,.12);
    }else if(kind==='kitchen'){
      piece(g,x,floor+.45,-1.32,w,.9,.56,cream);piece(g,x,floor+.92,-1.3,w,.04,.6,timber);
      piece(g,x+side*.38*w,floor+.95,-1.25,.6,1.8,.62,fridgeMat);
      rod(g,[x-side*.1,floor+.94,-1.2],[x-side*.1,floor+1.14,-1.2],.08,porcelain,.07);pendant(g,x,ceiling,-1.1,.18,true);
    }else if(kind==='bedroom'){
      rbox(g,dx,floor+.75,-1.55,w*.62,.8,.06,timber,.03);rbox(g,dx,floor+.28,-1.1,w*.62,.36,.9,cloths[(ax+2)%6],.08);
      piece(g,x-side*.36*w,floor+1.0,-1.38,.55,2.0,.45,timber);
      rod(g,[dx+side*.42*w,floor+.45,-1.4],[dx+side*.42*w,floor+.7,-1.4],.12,amber,.07);
    }else if(kind==='plants'){
      pendant(g,x,ceiling,-.98,.28);plant(g,dx,floor+.57,-1,.54,id);piece(g,dx,floor+.52,-1.08,w*.57,.07,.56,timber);
      plant(g,x-side*.3*w,floor+.08,-1.2,.8,id+3);
    }else if(kind==='tv'){
      rbox(g,dx,floor+.32,-.95,w*.7,.62,.5,sofaMat[(ax+1)%3],.08);
      piece(g,x-side*.15*w,floor+.65,-1.52,.7,.42,.06,dark);
    }else{
      for(let k=0;k<5;k++)piece(g,x+(hv(10+k)-.5)*w*.7,floor+.2+(k>2?.38:0),-1.1-hv(20+k)*.4,.4,.36,.36,spines[(k+ax)%6]);
    }
    // Window dressing: curtains drawn to different widths, blinds at different heights, nets, or nothing.
    const dress=hv(3);
    if(kind==='empty'){}
    else if(dress<.38){const cm=cloths[Math.floor(hv(4)*6)];for(const s of [-1,1])curtain(g,x+s*w*(.36+hv(5+s)*.08),y,-.24,w*(.16+hv(6+s)*.16),h*.97,cm,id+s);}
    else if(dress<.62){const drop=1+Math.floor(hv(7)*9);for(let k=0;k<drop;k++)piece(g,x,ceiling-.1-k*.095,-.12,w*.94,.064,.05,hv(8)<.5?linen:cloths[4]).rotation.x=.28;}
    else if(dress<.82){const nh=h*(.45+hv(9)*.3);const o=new T.Mesh(new T.PlaneGeometry(w*.96,nh,8,1),net);o.position.set(x,floor+nh/2+.05,-.1);g.add(o);}
    for(const s of [-1,1])piece(g,x+s*w/2,y,.025,.105,h,.14,frame);
    piece(g,x,ceiling,.035,w+.17,.1,.17,frame);piece(g,x,floor,.12,w+.23,.13,.32,coping);
    piece(g,x,y+.22,.055,w,.048,.085,timber);piece(g,x,y,.065,.047,h,.09,timber);
    if(hv(11)<.35)plant(g,x+w*(hv(12)-.5)*.6,floor+.08,.17,.5+hv(13)*.2,id);
    if(hv(14)<.3){piece(g,x,floor-.13,.27,w+.26,.09,.55,iron);
      for(let k=0;k<8;k++)piece(g,x+w*(k/7-.5),floor+.17,.51,.025,.57,.028,iron);
      piece(g,x,floor+.47,.51,w+.12,.044,.045,iron);
    }
  }
  function shopLife(g,shop){
    const lit=shop==='tide'||shop==='wash',shade=lit?'cool-room':'warm-room';
    picture(g,shop==='tide'?'tiled':shade,0,1.71,-2.965,5.8,2.97,.50);
    for(const x of [-1.45,1.35])pendant(g,x,3.32,-1.55,x<0?.29:.43,lit);
    const lamp=new T.PointLight(lit?0xffe4bb:0xffc787,lit?15:10,5.2,2);
    lamp.position.set(.7,2.68,-1.33);g.add(lamp);
    if(shop==='tide'){
      picture(g,'fish-board',-.88,1.85,-2.94,1.03,1.29);
      for(let k=0;k<2;k++)piece(g,1.18,1.54+k*.58,-2.68,2.46,.08,.48,iron);
      for(let k=0;k<9;k++)rod(g,[.19+k*.24,1.60,-2.59],[.19+k*.24,1.90+(k%3)*.05,-2.59],.089,k%3?porcelain:blueCloth);
      for(let k=0;k<24;k++){const j=k%3;oval(g,-.45+j*1.15+.38*Math.cos(k*2.32),1.195,-.99+.33*Math.sin(k*3.11),.11,.075,.135,porcelain);}
      rod(g,[-.4,1,-.47],[-.4,1.5,-.47],.017,brass);picture(g,'fish-board',-.4,1.63,-.46,.29,.35);
      for(let j=0;j<3;j++){const px=2.2+(j%2)*.51,py=.35+Math.floor(j/2)*.34;
        piece(g,px,py,.64,.63,.33,.45,blueCloth);for(let k=0;k<4;k++)piece(g,px-.22+k*.145,py+.03,.874,.085,.043,.012,dark);}
      plant(g,-2.69,.15,.49,1.03,4);
    }else if(shop==='wash'){
      picture(g,'wash-board',1.4,1.93,-2.94,1.03,1.29);
      for(let k=0;k<2;k++)chair(g,-1.30+k*.68,.22,-1.76,.09-k*.2);
      for(let k=0;k<4;k++)piece(g,-.52,1.76+k*.065,-1.1,.54,.06,.37,k%2?blueCloth:linen);
    }else if(shop==='paper'||shop==='moran'){
      picture(g,shop==='paper'?'books-board':'news-print',-.76,1.93,-2.94,1.03,1.29);
      piece(g,1.24,1.13,-2.39,1.78,.12,.87,timber);chair(g,1.1,.2,-2.15,.64);
      if(shop==='paper'){chair(g,-1.15,.15,.74,.30);plant(g,2.77,.15,.56,1.23,7);}
      else {for(let j=0;j<3;j++)picture(g,'news-print',-.59+j*.54,1.25,-.65,.40,.50);}
    }else if(shop==='keane'){
      piece(g,1.1,.95,-2.4,2.2,.14,.76,timber);for(let j=0;j<7;j++)piece(g,.37+j*.23,1.2,-2.46,.19,.32,.19,spines[j%6]);
      for(let j=0;j<3;j++)rod(g,[2.42+j*.1,.16,.52],[2.12+j*.15,1.85,.08],.033,timber);
    }
  }
  function streetDetails(g,shop){
    if(shop==='paper'){
      const end=new T.Group();end.position.set(.03,.15,.95);end.rotation.y=-.19;g.add(end);
      rod(end,[0,0,0],[0,.04,0],.28,iron);rod(end,[0,.04,0],[0,.69,0],.047,iron);
      rod(end,[0,.68,0],[0,.74,0],.39,timber);
      piece(end,-.1,.77,.04,.27,.052,.19,spines[2]).rotation.y=.28;
      rod(end,[.16,.74,-.08],[.16,.87,-.08],.054,porcelain);
      const bag=oval(g,-1.26,.78,.71,.19,.18,.09,clay);bag.rotation.z=-.14;
    }
    if(shop==='tide'||shop==='moran'){
      const width=shop==='tide'?4.68:3.16, offset=.58, fabric=shop==='tide'?blueCloth:spines[0];
      const count=13;
      for(let i=0;i<count;i++){
        const x=offset+width*((i+.5)/count-.5),m=i%2===0?fabric:linen;
        const roof=piece(g,x,2.78,.48,width/count,.033,1.04,m);roof.rotation.x=.16;
        const lip=piece(g,x,2.63,1,width/count,.14+.014*Math.cos(i),.025,m);lip.rotation.x=.035;
      }
      for(const side of [-1,1]){
        const x=offset+side*(width*.5-.07);rod(g,[x,2.25,.08],[x,2.69,.99],.021,iron);
      }
      rod(g,[offset-width/2,2.69,.99],[offset+width/2,2.69,.99],.026,iron);
    }
    if(shop==='tide'){
      // A scale with a dial and weighing pan, below the tiled backsplash.
      piece(g,1.83,1.05,-2.16,1.38,.1,.8,iron);
      for(const sx of [-1,1])for(const sz of [-1,1])piece(g,1.83+sx*.59,.65,-2.16+sz*.29,.055,.78,.055,iron);
      piece(g,1.85,1.32,-2.1,.41,.39,.34,greenPaint);
      rod(g,[1.85,1.36,-1.94],[1.85,1.36,-1.89],.161,porcelain);
      rod(g,[1.85,1.36,-1.88],[1.79,1.44,-1.88],.008,iron);
      rod(g,[1.85,1.52,-2.09],[1.85,1.56,-2.09],.24,iron);
      const stand=new T.Group();stand.position.set(1.79,.15,1.25);stand.rotation.y=-.33;g.add(stand);
      piece(stand,0,.59,0,.71,.86,.055,timber).rotation.x=-.13;
      const card=picture(stand,'fish-board',0,.60,.040,.63,.79);card.rotation.x=-.13;
      for(const dx of [-.31,.31])for(const dz of [-1,1])rod(stand,[dx,0,dz*.22],[dx,.99,0],.027,timber);
    }
  }
  // ---- vehicles: rounded panels, clear-coated paint, chrome, glass, lamps, plates, road grime
  const chrome=new T.MeshStandardMaterial({color:0xd8dcdc,metalness:1,roughness:.18});
  const steel=new T.MeshStandardMaterial({color:0x8a8e8c,metalness:.85,roughness:.42});
  const seam=mat(0x0c0d0e,.9);
  const tint=new T.MeshStandardMaterial({color:0x12181c,metalness:.6,roughness:.06,envMapIntensity:1.6,polygonOffset:true,polygonOffsetFactor:-2});
  const lampLens=new T.MeshStandardMaterial({color:0xdde2dc,metalness:.2,roughness:.1,emissive:0xfff2d8,emissiveIntensity:.05});
  const tailLens=new T.MeshStandardMaterial({color:0x6a0e0a,roughness:.25,emissive:0xff2010,emissiveIntensity:.25});
  const amberLens=new T.MeshStandardMaterial({color:0xb06010,roughness:.25,emissive:0xff8a20,emissiveIntensity:.08});
  const paintOf=(c)=>new T.MeshPhysicalMaterial({color:c,roughness:.42,metalness:.2,clearcoat:.9,clearcoatRoughness:.18});
  function plate(g,text,yellow,x,y,z,ry=0){
    const map=canvasTexture(256,56,(c,W,H)=>{c.fillStyle=yellow?'#e8c02a':'#eeeee6';c.fillRect(0,0,W,H);c.fillStyle='#111';c.font='bold 40px "Arial Narrow", Arial, sans-serif';
      c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2+2);c.strokeStyle='#222';c.lineWidth=3;c.strokeRect(2,2,W-4,H-4);
      c.fillStyle='rgba(40,30,20,.25)';for(let i=0;i<60;i++)c.fillRect(Math.random()*W,H*.6+Math.random()*H*.4,3,2);});
    const o=new T.Mesh(new T.PlaneGeometry(.52,.114),new T.MeshStandardMaterial({map,roughness:.5,metalness:.1}));o.position.set(x,y,z);o.rotation.y=ry;g.add(o);return o;
  }
  function wheel(g,x,y,z,r=.33,wd=.19){
    const w=new T.Group();w.position.set(x,y,z);g.add(w);const sx=Math.sign(x)||1;
    const prof=[[r*.62,-wd/2],[r*.9,-wd/2],[r*.98,-wd*.42],[r,-wd*.25],[r,wd*.25],[r*.98,wd*.42],[r*.9,wd/2],[r*.62,wd/2]].map(([a,b])=>new T.Vector2(a,b));
    const tyre=new T.Mesh(new T.LatheGeometry(prof,40),rubber);tyre.rotation.z=Math.PI/2;w.add(tyre);
    for(let k=0;k<20;k++){const a=k/20*Math.PI*2;const t=piece(w,0,Math.sin(a)*r*1.001,Math.cos(a)*r*1.001,wd*.78,.012,.03,seam);t.rotation.x=-a;}   // tread blocks
    rod(w,[sx*wd*.3,0,0],[sx*wd*.46,0,0],r*.64,steel,r*.62,28);
    rod(w,[sx*wd*.46,0,0],[sx*wd*.52,0,0],r*.3,chrome,r*.26,24);
    for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;rod(w,[sx*wd*.46,Math.sin(a)*r*.42,Math.cos(a)*r*.42],[sx*wd*.5,Math.sin(a)*r*.42,Math.cos(a)*r*.42],.014,chrome,.014,6);}
    return w;
  }
  const linerMat=new T.MeshStandardMaterial({color:0x0a0a0a,roughness:.95,side:T.DoubleSide});
  function liner(g,z,y,r,width){                                       // the dark inside of a wheel arch
    const q=new T.Mesh(new T.CylinderGeometry(r,r,width,24,1,true,0,Math.PI),linerMat);q.rotation.z=Math.PI/2;q.position.set(0,y,z);g.add(q);return q;
  }
  function quad(g,a,b,c,d,m){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...d],3));
    geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();const o=new T.Mesh(geo,m);m.side=T.DoubleSide;g.add(o);return o;}
  function estateCar(){
    const c=new T.Group();c.position.set(11,.015,17.98);c.rotation.y=1.49;root.add(c);
    const paint=paintOf(0x3e5a50), W=1.74, wb=1.42, R=.33, AR=.4;
    // Lower body: side profile with the two wheel arches cut out of the sill line.
    const sh=new T.Shape();sh.moveTo(-2.32,.3);sh.lineTo(-wb-AR,.3);sh.absarc(-wb,.32,AR,Math.PI,0,true);sh.lineTo(wb-AR,.3);sh.absarc(wb,.32,AR,Math.PI,0,true);
    sh.lineTo(2.3,.3);sh.quadraticCurveTo(2.42,.32,2.42,.46);sh.lineTo(2.42,.74);sh.quadraticCurveTo(2.41,.84,2.3,.85);sh.lineTo(1.0,.93);sh.lineTo(-2.3,.95);
    sh.quadraticCurveTo(-2.4,.94,-2.4,.86);sh.lineTo(-2.4,.42);sh.quadraticCurveTo(-2.4,.3,-2.32,.3);
    const bv=.06,geo=new T.ExtrudeGeometry(sh,{depth:W-2*bv,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:4,curveSegments:28});
    geo.rotateY(-Math.PI/2);geo.translate((W-2*bv)/2,0,0);c.add(new T.Mesh(geo,paint));
    for(const z of [-wb,wb])liner(c,z,.32,AR-.01,W-.06);
    // Cabin: roof and pillars in paint, glass set into each opening.
    const GW=1.5,gb=.045;
    const cab=new T.Shape();cab.moveTo(-2.31,.9);cab.lineTo(-2.27,1.39);cab.quadraticCurveTo(-2.24,1.44,-2.1,1.445);cab.lineTo(.28,1.445);cab.quadraticCurveTo(.36,1.44,.42,1.39);cab.lineTo(1.02,.9);cab.closePath();
    const cg=new T.ExtrudeGeometry(cab,{depth:GW-2*gb,bevelEnabled:true,bevelThickness:gb,bevelSize:gb,bevelSegments:3,curveSegments:12});
    cg.rotateY(-Math.PI/2);cg.translate((GW-2*gb)/2,0,0);c.add(new T.Mesh(cg,paint));
    const sx=GW/2+.004;
    for(const s of [-1,1]){
      const X=s*sx;
      // side glass between A, B, C and D pillars
      for(const P of [[[.06,.99],[.86,.99],[.38,1.38],[.06,1.38]],[[-1.08,.99],[-.08,.99],[-.08,1.38],[-1.08,1.38]],[[-2.18,.99],[-1.22,.99],[-1.22,1.38],[-2.15,1.36]]])
        quad(c,...P.map(([z,y])=>[X,y,z]),tint);
      for(const z of [0,-1.14])piece(c,s*(sx+.002),1.19,z,.012,.42,z===0?.1:.14,paint);
      // door shut lines, handles, rubbing strip, mirror
      for(const z of [.98,0,-1.14])piece(c,s*(W/2+.004),.62,z,.006,.62,.006,seam);
      piece(c,s*(W/2+.004),.93,-.08,.006,.006,2.12,seam);
      for(const z of [-.12,-1.24])piece(c,s*(W/2+.012),.84,z,.02,.03,.16,chrome);
      piece(c,s*(W/2+.012),.79,0,.022,.04,4.6,rubber);
      rod(c,[s*.74,1.0,.86],[s*.93,1.03,.8],.012,paint);rbox(c,s*.97,1.06,.78,.06,.11,.16,paint,.025);piece(c,s*.995,1.06,.78,.006,.09,.13,chrome);
      piece(c,s*.55,1.475,-.9,.035,.03,2.6,chrome);                                         // roof rails
      // lamps
      rbox(c,s*.6,.64,2.425,.3,.17,.04,lampLens,.02);rbox(c,s*.82,.64,2.415,.09,.12,.04,amberLens,.015);
      rbox(c,s*.73,.66,-2.425,.2,.32,.04,tailLens,.02);rbox(c,s*.73,.49,-2.425,.2,.06,.04,amberLens,.01);
    }
    // windscreen and tailgate glass
    quad(c,[-.66,.99,1.0],[.66,.99,1.0],[.66,1.4,.4],[-.66,1.4,.4],tint);
    quad(c,[-.66,1.0,-2.33],[.66,1.0,-2.33],[.64,1.37,-2.29],[-.64,1.37,-2.29],tint);
    for(const s of [-1,1])rod(c,[s*.05,1.01,.99],[s*.62,1.03,.93],.007,seam);                  // wipers
    // bumpers, grille, plates
    for(const z of [2.46,-2.46]){rbox(c,0,.42,z,1.78,.13,.12,chrome,.05);rbox(c,0,.42,z+Math.sign(z)*.01,1.6,.05,.12,rubber,.02);}
    rbox(c,0,.64,2.43,.82,.17,.03,seam,.02);for(let k=0;k<4;k++)piece(c,0,.585+k*.038,2.447,.78,.008,.01,chrome);
    plate(c,'F214 KWD',false,0,.5,2.53);plate(c,'F214 KWD',true,0,.56,-2.47,Math.PI);
    piece(c,0,.95,-2.415,1.4,.006,.006,seam);                                               // tailgate shut line
    // inside: seats, a paper on the dash, a parking ticket under the wiper
    for(const z of [.05,-.95])for(const s of [-1,1])rbox(c,s*.36,1.02,z,.46,.5,.12,rubber,.04);
    piece(c,.3,1.0,.78,.28,.01,.2,cream).rotation.y=.3;
    { const t=piece(c,-.45,1.06,.86,.1,.13,.004,mat(0xe8d050,.6));t.rotation.x=-.85; }
    // wheels; the near front one turned a little towards the kerb
    for(const s of [-1,1])for(const z of [-wb,wb]){const w=wheel(c,s*.76,R,z,R);if(z>0)w.rotation.y=s>0?-.12:-.12;}
    // road spray along the sills and fallen leaves on the bonnet and roof
    for(const s of [-1,1])decal('Leaking007',c,{pos:[s*(W/2+.008),.52,0],rot:[0,s*Math.PI/2,Math.PI],w:4.4,h:.45,color:0x2a241c,opacity:.55});
    const leaf=mat(0x6a4a20,.9);leaf.side=T.DoubleSide;
    for(let k=0;k<9;k++){const o=new T.Mesh(new T.CircleGeometry(.035,5),leaf);o.scale.y=1.6;o.rotation.set(-Math.PI/2+.1,0,hash(k)*6);
      o.position.set((hash(k+3)-.5)*1.3,k<5?1.452:.93+(hash(k)*.02),k<5?-1.6+hash(k+5)*1.6:1.3+hash(k+9)*.8);c.add(o);}
  }
  function cycle(){
    const g=new T.Group();g.position.set(-11.1,.16,20.75);g.rotation.y=-.27;g.rotation.z=.065;root.add(g);
    for(const x of [-.54,.54]){const wh=new T.Mesh(wheelGeo,rubber);wh.position.set(x,.325,0);g.add(wh);
      for(let k=0;k<6;k++){const a=k*Math.PI/6,dx=.30*Math.cos(a),dy=.30*Math.sin(a);rod(g,[x-dx,.325-dy,0],[x+dx,.325+dy,0],.006,iron,.006,5);}}
    const rear=[-.54,.325,0],crank=[-.08,.32,0],seat=[-.24,.78,0],head=[.34,.74,0],front=[.54,.325,0];
    for(const [a,b] of [[rear,seat],[rear,crank],[crank,seat],[crank,head],[seat,head],[head,front]])rod(g,a,b,.027,greenPaint);
    piece(g,-.24,.805,0,.22,.055,.105,rubber);rod(g,head,[.33,.89,0],.021,iron);rod(g,[.33,.89,-.18],[.33,.89,.18],.022,iron);
  }
  // Street-facing side is local +Z. The opposite pavement is rotated as a unit.
  function premise({x,z,yaw=0,w,h,d=6,shop,skin,kind,rows=1,cols=2,tone}) {
    const g=new T.Group(); g.name=shop; g.position.set(x,0,z); g.rotation.y=yaw; root.add(g);
    const wall=surface(skin,w,h,tone);
    const dwelling = kind==='bay'||kind==='terrace';
    if(dwelling){
      piece(g,0,(h+3.55)/2,-(d+1.72)/2,w,h-3.55,d-1.72,wall);
      // Keep masonry courses continuous across the surfaces framing the real openings.
      const facade=(xx,yy,width,height)=>{
        if(height<.001||width<.001)return;
        const p=piece(g,xx,yy,-.86,width,height,1.72,wall);
        p.geometry=unit.clone();
        const uv=p.geometry.attributes.uv;
        for(let i=16;i<20;i++){
          uv.setXY(i,(xx+(uv.getX(i)-.5)*width)/w+.5,(yy+(uv.getY(i)-.5)*height)/h);
        }
      };
      let bottom=3.55;
      for(let row=0;row<rows;row++){
        const cy=3.72+(row+.5)*(h-3.9)/rows, H=1.72, pitch=w/cols, W=Math.min(1.65,pitch*.64);
        facade(0,(bottom+cy-H/2)/2,w,cy-H/2-bottom);
        for(let col=0;col<=cols;col++){
          const width=(pitch-W)*((col===0||col===cols)?.5:1);
          const px=col===0?-w/2+width/2:col===cols?w/2-width/2: -w/2+col*pitch;
          facade(px,cy,width,H);
          if(col<cols)flat(g,-w/2+(col+.5)*pitch,cy,W,H,Math.round(x)+col*5+row*9);
        }
        bottom=cy+H/2;
      }
      facade(0,(bottom+h)/2,w,h-bottom);
    }else{
      piece(g,0,(h+3.55)/2,-d/2,w,h-3.55,d,wall);
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)
        window(g,w*((col+.5)/cols-.5),3.72+(row+.5)*(h-3.9)/rows,w/cols-.57,1.22,.04,Math.round(x)+col*5+row*9);
    }
    piece(g,0,1.775,-(d+3.2)/2,w,3.55,d-3.2,wall);
    interior(g,shop,w,wall);shopLife(g,shop);streetDetails(g,shop);
    piece(g,0,h+.08,-.04,w+.18,.16,.37,coping);
    if(kind==='bay'||kind==='terrace'){
      const rise=1.75, length=Math.hypot(d/2,rise);
      for(const side of [-1,1]){
        piece(g,0,h+rise/2,-d/2+side*d/4,w+.24,.18,length+.16,slate).rotation.x=side*Math.atan2(rise,d/2);
      }
      piece(g,-w*.28,h+1.47,-d*.53,.7,2.6,.66,surface('kiln-brick',.7,2.6));
      for(const dx of [-.18,.18]) piece(g,-w*.28+dx,h+2.96,-d*.53,.23,.42,.24,mat(0x955e43));
    } else if(kind==='mill'){
      for(let i=0;i<3;i++){
        const span=d/3; piece(g,0,h+.45,-(i+.5)*span,w+.16,.16,Math.hypot(span,.9),slate).rotation.x=Math.atan2(.9,span);
        piece(g,0,h+.43,-(i+1)*span,w,.86,.1,dark);
      }
    } else {
      piece(g,0,h+.15,-d/2,w+.16,.24,d+.12,slate);
      piece(g,w*.22,h+.63,-d*.45,1.15,.77,.88,iron);
    }
    const L=['Leaking003','Leaking004','Leaking005','Leaking007','Leaking008'];
    for(let k=0;k<cols*rows;k++){ const px=w*(((k%cols)+.5)/cols-.5)+(k%2?.15:-.1); decal(L[(k+Math.abs(Math.round(x)))%3],g,{pos:[px,3.72+(Math.floor(k/cols)+.5)*(h-3.9)/Math.max(rows,1)-1.11,.012],w:.78,h:.40,color:0x24221e,opacity:.55,flipX:k%2===1}); }
    decal(L[3+Math.abs(Math.round(x))%2],g,{pos:[0,h-.4,.013],w:w,h:.8,color:0x24221e,opacity:.5});
    const pipeX=-w/2+.18;
    decal('Leaking006',g,{pos:[pipeX+.12,h*.45,.012],w:.6,h:h*.8,color:0x24221e,opacity:.6});
    piece(g,pipeX,h/2,.14,.11,h,.11,iron);
    for(let y=1;y<h;y+=2.6) piece(g,pipeX,y,.14,.21,.09,.18,frame);
    return g;
  }
  const back=Math.PI;
  [
    {x:11.3,z:-.12,w:6.42,h:10.35,rows:2,cols:2,kind:'bay',skin:'kiln-brick',shop:'moran',tone:0xb09a90},
    {x:19.9,z:-1.1,w:10.2,h:6.4,cols:4,kind:'mill',skin:'zinc',shop:'loading'},
    {x:-19.65,z:.22,w:8.9,h:8.1,cols:3,kind:'terrace',skin:'limewash',shop:'keane',tone:0xc8b898},
    {x:-12.2,z:22.52,yaw:back,w:7.8,h:4.65,rows:0,kind:'flat',skin:'ashlar',shop:'wash'},
    {x:-3.6,z:22.65,yaw:back,w:8.8,h:11.65,rows:3,cols:3,kind:'terrace',skin:'kiln-brick',shop:'paper',tone:0x9a8478},
    {x:5.05,z:22.51,yaw:back,w:8.3,h:7.1,cols:2,kind:'bay',skin:'limewash',shop:'tide',tone:0xb8c0b0}
  ].forEach(premise);
  cycle();estateCar();
  // A pavement bench with bolted feet and separate slats, and two bike hoops outside the wash.
  const bench=new T.Group(); bench.position.set(-16.1,.15,20.85); bench.rotation.y=-.16; root.add(bench);
  for(const x of [-.72,.72]){
    piece(bench,x,.21,0,.08,.42,.48,iron);
    piece(bench,x,.6,.22,.065,.79,.065,iron);
  }
  const board=timber;
  for(let i=0;i<4;i++) piece(bench,0,.44,-.21+i*.14,1.85,.065,.12,board);
  for(let i=0;i<2;i++) piece(bench,0,.7+i*.18,.22,1.85,.125,.055,board);
  for(const dx of [-.62,.62]){
    const curve=new T.CatmullRomCurve3([[-.38,0],[-.38,.58],[-.27,.76],[.27,.76],[.38,.58],[.38,0]].map(([z,y])=>new T.Vector3(0,y,z)));
    const hoop=new T.Mesh(new T.TubeGeometry(curve,24,.032,8,false),iron);
    hoop.position.set(-10.2+dx,.15,20.95);root.add(hoop);
  }
  // A railway crossing terminates the west view. The opening has an actual vaulted soffit.
  const bridge=new T.Group(); bridge.position.set(-24.3,0,10); bridge.rotation.y=Math.PI/2; root.add(bridge);
  const arch=new T.Shape(); arch.moveTo(-17,0); arch.lineTo(-4,0); arch.lineTo(-4,2.7);
  arch.absarc(0,2.7,4,Math.PI,0,true); arch.lineTo(4,0); arch.lineTo(17,0); arch.lineTo(17,8.3); arch.lineTo(-17,8.3); arch.closePath();
  const masonry=surface('kiln-brick',1,1,0x6e6058), ring=surface('kiln-brick',1,1,0x4a4448);
  const vault=new T.Mesh(new T.ExtrudeGeometry(arch,{depth:4.3,bevelEnabled:false,curveSegments:24}),masonry); vault.position.z=-4.3; bridge.add(vault);
  piece(bridge,0,8.37,-2.12,34,.23,4.7,coping);
  for(let i=-15;i<=15;i+=3.4) decal(['Leaking007','Leaking008','Leaking009'][Math.abs(Math.round(i))%3],bridge,{pos:[i,6.6,.012],w:3.6,h:3.4,color:0x1c1a18,opacity:.7,flipX:i>0});
  for(const sx of [-1,1]) decal('Leaking006',bridge,{pos:[sx*5.2,3.4,.012],w:1.1,h:5.5,color:0x1c1a18,opacity:.6});
  decal('Leaking009',bridge,{pos:[0,.9,.012],w:34,h:1.8,color:0x1c1a18,opacity:.65});
  for(let i=0;i<24;i++){const a=(i+.5)*Math.PI/24; piece(bridge,4.2*Math.cos(a),2.7+4.2*Math.sin(a),.03,.53,.42,.2,ring).rotation.z=a-Math.PI/2;}
  for(let i=-16;i<=16;i+=2) piece(bridge,i,8.97,-.25,.07,1.02,.07,iron);
  piece(bridge,0,9.46,-.25,32,.075,.075,iron);
  // Fly-posting on the viaduct, layered and torn, and the headroom plate over the arch.
  function poster(lines,bg,fg,seed){
    return canvasTexture(256,360,(c,W,H)=>{let n=seed;const r=()=>(n=(n*16807)%2147483647)/2147483647;
      c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=fg;c.textAlign='center';
      lines.forEach(([t,sz,y])=>{c.font=`800 ${sz}px Impact, "Arial Black", sans-serif`;c.fillText(t,W/2,y);});
      c.fillStyle='rgba(60,50,30,.18)';for(let i=0;i<40;i++)c.fillRect(0,r()*H,W,1+r()*3);                // paste wrinkles
      c.globalCompositeOperation='destination-out';c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=16)c.lineTo(x,H-r()*H*.35*(x/W));c.lineTo(W,H);c.fill();   // torn corner
      for(let i=0;i<120;i++){c.fillStyle='rgba(0,0,0,.8)';c.fillRect(r()*W,r()*H,2+r()*8,1+r()*4);}
    });
  }
  const POSTERS=[[[['THE WET',52,90],['PAVEMENTS',46,140],['LIVE AT THE ARCHES',22,200],['SAT 11 NOV · 8PM',26,250]],'#d8c8a0','#1a1a1a'],
    [[['LOST CAT',58,80],['GINGER · ANSWERS TO',20,130],['BISCUIT',48,180],['PLEASE CALL 07700 900461',16,240]],'#f0eee4','#222'],
    [[['CLEAR-OUT',50,90],['SALE',80,170],['EVERYTHING MUST GO',20,220]],'#e8d040','#a01a14'],
    [[['NO',90,110],['SLAUGHTER',40,170],['GROWN NOT RAISED',20,220],['FUTURE MEAT MARKET',18,320]],'#7a1a1a','#f0e0c0'],
    [[['CLUB',60,90],['VELVET',60,160],['FRIDAYS',30,220]],'#202848','#e8a0c0']];
  const posterMats=POSTERS.map(([l,bg,fg],i)=>new T.MeshStandardMaterial({map:poster(l,bg,fg,31+i*13),transparent:true,roughness:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));
  for(let k=0;k<14;k++){
    const side=k<7?-1:1,x=side*(6.2+((k%7)*1.05))+(hash(k)-.5)*.3,y=1.35+(hash(k+1)-.5)*.5+(k%3===0?.9:0);
    const o=new T.Mesh(new T.PlaneGeometry(.62,.87),posterMats[(k*3+1)%5]);o.position.set(x,y,.012+k*.0004);o.rotation.z=(hash(k+2)-.5)*.06;bridge.add(o);
  }
  // Headroom plate: an enamelled steel sign on two rails bolted to the brick, the enamel chipped to rust at the edges and bolts,
  // soot from the trains over the top half, a scrape where a lorry once caught the arch below it.
  { const map=canvasTexture(1024,256,(c,W,H)=>{let n=9;const r=()=>(n=(n*16807)%2147483647)/2147483647;
      c.fillStyle='#d9b021';c.fillRect(0,0,W,H);c.fillStyle='#151515';
      for(let x=-H;x<W+H;x+=72){c.beginPath();c.moveTo(x,0);c.lineTo(x+36,0);c.lineTo(x+36-H*0.35,H);c.lineTo(x-H*0.35,H);c.fill();}
      c.fillStyle='#ecebe4';c.fillRect(40,34,W-80,H-68);c.strokeStyle='#151515';c.lineWidth=5;c.strokeRect(40,34,W-80,H-68);
      c.fillStyle='#151515';c.font='900 112px "Arial Narrow", Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText("21'11\"",W*0.3,H/2+4);c.fillText('6.7 m',W*0.72,H/2+4);
      c.beginPath();c.moveTo(W*0.5,52);c.lineTo(W*0.5-16,80);c.lineTo(W*0.5+16,80);c.fill();c.beginPath();c.moveTo(W*0.5,H-52);c.lineTo(W*0.5-16,H-80);c.lineTo(W*0.5+16,H-80);c.fill();c.fillRect(W*0.5-3,78,6,H-156);
      c.globalCompositeOperation='multiply';const soot=c.createLinearGradient(0,0,0,H);soot.addColorStop(0,'rgba(60,55,50,.85)');soot.addColorStop(.6,'rgba(150,145,140,.35)');soot.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=soot;c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';
      for(let i=0;i<70;i++){const edge=r()<.7,x=edge?(r()<.5?r()*60:W-r()*60):r()*W,y=edge?r()*H:(r()<.5?r()*40:H-r()*40);c.fillStyle=`rgba(${90+r()*50},${45+r()*25},${15},${.6+r()*.4})`;c.beginPath();for(let k=0;k<7;k++){const a=k/7*6.28,rr=(3+r()*14);c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7);}c.fill();}   // chipped enamel, rust beneath
      for(const bx of [28,W-28])for(const by of [28,H-28]){const g=c.createRadialGradient(bx,by,2,bx,by,30);g.addColorStop(0,'rgba(80,35,10,.9)');g.addColorStop(1,'rgba(80,35,10,0)');c.fillStyle=g;c.fillRect(bx-30,by-30,60,90);}
      c.strokeStyle='rgba(60,55,50,.7)';c.lineWidth=2;for(let i=0;i<18;i++){const y=H*(.75+r()*.2),x=W*(.2+r()*.5);c.beginPath();c.moveTo(x,y);c.lineTo(x+60+r()*120,y+(r()-.5)*6);c.stroke();}   // scrape
    });
    const plateM=new T.MeshStandardMaterial({map,roughness:.45,metalness:.25,envMapIntensity:1.3});
    const edge=mat(0x3a3530,.6,.5), plate=new T.Mesh(new T.BoxGeometry(2.3,.575,.012),[edge,edge,edge,edge,plateM,edge]);
    plate.position.set(0,7.25,.09);plate.rotation.z=.012;plate.rotation.x=-.03;bridge.add(plate);
    for(const y of [7.08,7.42]){piece(bridge,0,y,.05,2.4,.05,.06,iron);for(const x of [-1.05,1.05]) rod(bridge,[x,y,.03],[x,y,.1],.012,iron,.012,8);}
    for(const x of [-1.12,1.12])for(const y of [7.0,7.5]){const b=new T.Mesh(new T.CylinderGeometry(.011,.011,.01,8),iron);b.rotation.x=Math.PI/2;b.position.set(x,y,.097);bridge.add(b);}
    for(const x of [-1.05,1.05]) decal('Leaking006',bridge,{pos:[x+.02,6.55,.025],w:.18,h:1.2,color:0x3a1a08,opacity:.8});
  }
  // Pipes and a cable tray along the viaduct face, rust bleeding from the brackets.
  rod(bridge,[-17,7.6,.12],[17,7.6,.12],.05,iron,.05,10);
  for(let x=-16;x<=16;x+=2.4){piece(bridge,x,7.6,.06,.08,.16,.14,iron);decal('Leaking006',bridge,{pos:[x+.05,6.9,.014],w:.3,h:1.4,color:0x3a2210,opacity:.55});}
  // The backs of buildings have their own offsets, so they overlap differently as the viewer turns.
  // A painted trade sign, faded and flaking off the brick.
  function ghostSign(g,x,y,z,w,h,lines){
    const map=canvasTexture(1024,Math.round(1024*h/w),(c,W,H)=>{
      c.clearRect(0,0,W,H);c.fillStyle='rgba(225,215,190,.78)';c.textAlign='center';c.textBaseline='middle';
      lines.forEach(([t,size],i)=>{c.font=`700 ${size*H}px Georgia, serif`;c.fillText(t,W/2,H*(i+.5)/lines.length);});
      c.strokeStyle='rgba(225,215,190,.6)';c.lineWidth=H*.025;c.strokeRect(W*.02,H*.04,W*.96,H*.92);
      c.globalCompositeOperation='destination-out';let n=lines.length*97;const r=()=>(n=(n*16807)%2147483647)/2147483647;
      for(let i=0;i<900;i++){c.fillStyle=`rgba(0,0,0,${.3+r()*.7})`;c.fillRect(r()*W,r()*H,2+r()*30,1+r()*6);}
      for(let i=0;i<40;i++){c.fillStyle='rgba(0,0,0,.9)';c.beginPath();c.ellipse(r()*W,r()*H,10+r()*60,6+r()*30,r()*3,0,7);c.fill();}
    });
    const m=new T.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-3});
    const o=new T.Mesh(new T.PlaneGeometry(w,h),m);o.position.set(x,y,z);g.add(o);return o;
  }
  function mill(g,x,z,w,h,d,cols,rows,{tone,sign}={}){
    const m=surface('kiln-brick',w,h,tone);piece(g,x,h/2,z-d/2,w,h,d,m);
    piece(g,x,h+.11,z-d/2,w+.3,.24,d+.32,coping);
    for(let k=0;k<=cols;k++)piece(g,x+w*(k/cols-.5),h/2,z+.1,.3,h,.35,m);
    for(let j=0;j<rows;j++){
      if(sign&&j===rows-1){ghostSign(g,x,3.4+j*3,z+.012,w*.86,2.3,sign);continue;}
      for(let i=0;i<cols;i++){
        const xx=x+w*((i+.5)/cols-.5), yy=3.4+j*3, id=i+j*cols+Math.round(x*3+z);
        window(g,xx,yy,w/cols*.7,1.52,z+.1,id);
        if(hash(id+2)<.5)decal(['Leaking003','Leaking004','Leaking005'][id%3],g,{pos:[xx,yy-1.3,z+.012],w:1.4,h:1.1,color:0x1e1c1a,opacity:.6,flipX:id%2===1});
      }
    }
    decal(['Leaking007','Leaking008','Leaking009'][Math.abs(Math.round(x))%3],g,{pos:[x,h-.9,z+.011],w,h:1.8,color:0x1c1a18,opacity:.6});
    decal('Leaking009',g,{pos:[x,.8,z+.011],w,h:1.6,color:0x1c1a18,opacity:.6});
  }
  function chimney(g,x,z,h){
    const brick=surface('kiln-brick',5,h);
    rod(g,[x,0,z],[x,h,z],1.04,brick,.62,28);
    for(const y of [h*.46,h*.75,h-.5,h])rod(g,[x,y-.12,z],[x,y+.12,z],1.12-(y/h)*.42,iron);
  }
  function tank(g,x,y,z){
    for(const a of [-1,1])for(const b of [-1,1]){
      piece(g,x+a*1.48,y+2,z+b*1.48,.16,4,.16,iron);
      rod(g,[x-a*1.48,y+.1,z+b*1.48],[x+a*1.48,y+3.8,z+b*1.48],.06,iron);
    }
    const skin=worldMat('rusty_painted_metal',{size:1.5,color:0x9a9a92});rod(g,[x,y+4,z],[x,y+7.7,z],2.2,skin,2.2,32);
    for(const h of [4,5.15,6.4,7.72])rod(g,[x,y+h,z],[x,y+h+.09,z],2.24,iron,2.24,32);
    rod(g,[x,y+7.75,z],[x,y+8.3,z],2.34,slate,.08,32);
  }
  function cable(g,a,b,sag){
    const mid=a.map((v,i)=>(v+b[i])*.5);mid[1]-=sag;
    const c=new T.CatmullRomCurve3([a,mid,b].map(v=>new T.Vector3(...v)));
    g.add(new T.Mesh(new T.TubeGeometry(c,20,.032,6,false),rubber));
  }
  mill(bridge,-12,-9,13,13.8,7,4,4,{tone:0x9a847a,sign:[['J. HARGREAVE & SONS',.32],['TANNERS · CURRIERS',.2],['EST. 1886',.16]]});
  mill(bridge,12,-15,11,16,7,3,4,{tone:0x7e706a});
  mill(bridge,.8,-24,14,10.1,5,4,3,{tone:0xa89078});
  chimney(bridge,-9,-22,23.2);tank(bridge,11,16.15,-18);
  for(const j of [-10,8]){
    piece(bridge,j,4.25,.25,.42,8.5,.62,masonry);piece(bridge,j,7,.57,.78,.2,.33,coping);
  }
  cable(bridge,[-15.5,12,-10],[9,14.1,-16],1.4);
  // The road continues under the viaduct between two working yards.
  for(const k of [-1,1])piece(bridge,k*4.5,.12,-10,1.25,.24,18,coping);
  // East end: cross-street with a deep-set industrial shed and loading canopy.
  const yard=new T.Group(); yard.position.set(31,0,9); yard.rotation.y=-Math.PI/2; root.add(yard);
  piece(yard,0,3.4,-3,25,6.8,6,surface('kiln-brick',25,6.8,0x8a7468));
  piece(yard,-3,2,.07,6,3.8,.16,worldMat('rusty_metal_shutter',{size:2.4,color:0x9a9890,metalness:.4,roughness:.7}));
  piece(yard,-3,4.25,1.15,8,.19,2.4,slate).rotation.x=.05;
  for(const px of [-6.65,.65]) piece(yard,px,2,2.21,.1,4,.1,iron);
  for(let i=0;i<7;i++) window(yard,-10+i*3.1,5.45,2.15,.8,.07,i);
  mill(yard,-15,-4,10.8,12.4,7,3,3,{tone:0x8c7a70});
  mill(yard,12,-9.6,13,14.2,7,4,4,{tone:0xa49488,sign:[['COLD STORE',.36],['ICE · BRINE · CARCASES',.2],['DELIVERIES AT REAR',.15]]});mill(yard,.5,-19,14,16.4,7,4,5,{tone:0x76665e});
  tank(yard,11,14.35,-13);chimney(yard,-9,-12,18);
  decal('Leaking009',yard,{pos:[0,.9,.012],w:25,h:1.8,color:0x1c1a18,opacity:.7});
  for(let i=0;i<6;i++)decal(['Leaking007','Leaking008','Leaking003'][i%3],yard,{pos:[-11+i*4.3,5.6,.012],w:3,h:2.6,color:0x1c1a18,opacity:.6,flipX:i%2===1});
  decal('Leaking006',yard,{pos:[-3,3.4,.24],w:6,h:1.4,color:0x3a2210,opacity:.6});
  for(let k=0;k<5;k++){const o=new T.Mesh(new T.PlaneGeometry(.62,.87),posterMats[(k*2+3)%5]);o.position.set(-9.6+k*.7+(hash(k+40)-.5)*.2,1.5+(hash(k+41)-.5)*.3,.014+k*.0004);o.rotation.z=(hash(k+42)-.5)*.06;yard.add(o);}
  const depotSign=new T.Group();depotSign.position.set(-3,0,0);yard.add(depotSign);
  label(depotSign,'depot',7,3.91,2.34);
  for(let k=0;k<4;k++){
    const x=2.6+(k%2)*1.18,z=1.4+Math.floor(k/2)*1.2;
    piece(yard,x,.14,z,1.13,.18,.89,timber);
    for(let j=0;j<(k===2?3:2);j++){
      piece(yard,x,.44+.44*j,z,1.05,.42,.81,spines[(k+1)%6]);
      for(const a of [-1,1])piece(yard,x+a*.31,.44+.44*j,z+.409,.055,.42,.016,frame);
    }
  }
  // Delivery van, parked against the east kerb: box body, cab, glass, lamps, plates, a faded livery.
  const van=new T.Group();van.position.set(22.4,.02,17.8);van.rotation.y=-.24;root.add(van);
  const vpaint=paintOf(0xb8bcb0);vpaint.roughness=.55;vpaint.clearcoat=.4;
  rbox(van,0,1.74,-.62,2.0,2.24,3.0,vpaint,.08);                                                      // cargo box
  rbox(van,0,1.16,1.32,1.94,1.1,1.35,vpaint,.12);rbox(van,0,1.88,1.12,1.9,.5,.95,vpaint,.1);          // cab and roof
  rbox(van,0,.56,0,1.4,.2,4.0,rubber,.04);
  quad(van,[-.84,1.5,2.0],[.84,1.5,2.0],[.82,2.06,1.62],[-.82,2.06,1.62],tint);
  for(const s of [-1,1]){
    const X=s*.976;quad(van,[X,1.5,1.9],[X,1.5,.92],[X,2.04,.92],[X,2.04,1.5],tint);
    piece(van,s*.975,1.12,.9,.006,1.1,.006,seam);piece(van,s*.985,1.25,1.1,.02,.03,.14,chrome);
    rod(van,[s*.95,1.6,1.82],[s*1.1,1.62,1.75],.014,iron);rbox(van,s*1.13,1.6,1.73,.06,.24,.14,rubber,.02);
    rbox(van,s*.66,.98,2.0,.32,.18,.04,lampLens,.02);rbox(van,s*.88,.98,1.99,.09,.12,.04,amberLens,.015);
    rbox(van,s*.85,.95,-2.13,.16,.34,.04,tailLens,.02);
    for(const z of [-1.4,1.38])wheel(van,s*.9,.39,z,.39,.21);
    decal('Leaking007',van,{pos:[s*1.008,.95,-.3],rot:[0,s*Math.PI/2,Math.PI],w:4.2,h:.6,color:0x2a241c,opacity:.6});
    const liv=canvasTexture(512,160,(c,W,H)=>{c.clearRect(0,0,W,H);c.fillStyle='rgba(40,70,60,.85)';c.font='700 62px Georgia, serif';c.textAlign='center';c.fillText('HALLORAN',W/2,70);
      c.font='600 30px Georgia, serif';c.fillText('LINEN · TOWELS · OVERALLS',W/2,122);c.globalCompositeOperation='destination-out';for(let i=0;i<500;i++){c.fillStyle='rgba(0,0,0,.6)';c.fillRect(Math.random()*W,Math.random()*H,2+Math.random()*10,1+Math.random()*3);}});
    const lv=new T.Mesh(new T.PlaneGeometry(2.4,.75),new T.MeshStandardMaterial({map:liv,transparent:true,depthWrite:false,roughness:.6,polygonOffset:true,polygonOffsetFactor:-3}));
    lv.position.set(s*1.003,2.0,-.62);lv.rotation.y=s*Math.PI/2;van.add(lv);
  }
  rbox(van,0,.62,2.15,1.96,.16,.14,rubber,.05);rbox(van,0,.62,-2.18,1.96,.16,.12,rubber,.05);
  rbox(van,0,1.05,2.0,.9,.2,.03,seam,.02);for(let k=0;k<3;k++)piece(van,0,.98+k*.06,2.02,.86,.01,.01,chrome);
  plate(van,'L908 HLT',false,0,.75,2.23);plate(van,'L908 HLT',true,0,.82,-2.25,Math.PI);
  piece(van,0,1.62,-2.125,.006,2.2,.006,seam);for(const s of [-1,1])piece(van,s*.42,1.62,-2.13,.04,.14,.02,chrome);
  cable(yard,[-16,11.8,-4],[13,13.8,-10],2.1);
  // The opposite kerb used to disappear into black sky just to the right of the depot.
  const corner=new T.Group();corner.position.set(18.1,0,23);corner.rotation.y=Math.PI;root.add(corner);
  mill(corner,0,0,15.5,10.2,6.3,4,3,{tone:0x9c8c80});
  piece(corner,0,1.38,.05,6.1,2.55,.12,surface('shed',6.1,2.55));
  piece(corner,0,2.84,.7,6.65,.19,1.65,slate).rotation.x=.08;
  for(const sx of [-3,3])rod(corner,[sx,1.77,.1],[sx,2.76,1.36],.042,iron);
  for(let j=0;j<3;j++){
    const x=4.3+j*.75;
    piece(corner,x,.62,1.03,.64,1.06,.66,spines[j%2+1]);
    piece(corner,x,1.18,1.03,.7,.09,.71,rubber).rotation.x=.07;
  }
  // Maintenance hut below the bridge parapet, inset noticeboard and raised platform.
  const hut=new T.Group();hut.position.set(-9.8,0,1.31);bridge.add(hut);
  piece(hut,0,1.65,-.5,4.75,3.30,1.45,surface('zinc',4.75,3.3));
  piece(hut,0,3.36,-.48,4.98,.15,1.78,iron).rotation.x=.08;
  piece(hut,1.45,1.34,.25,1.03,2.47,.13,timber);window(hut,-.56,1.91,1.91,.92,.28,1);
  piece(hut,0,.16,.52,4.96,.26,.91,coping);
  piece(hut,1.88,1.21,.36,.05,.19,.08,brass);
  // Warm, shielded bulkheads give the loading bay and tunnel a readable foreground.
  for(const [g,x,y,z] of [[yard,-3,3.85,1.58],[bridge,3.86,3,-2],[corner,0,2.62,.71]]){
    piece(g,x,y+.09,z,.46,.15,.27,iron);piece(g,x,y,z,.32,.065,.19,bulb);
    const light=new T.PointLight(0xffc08c,5.2,6,2);light.position.set(x,y-.14,z+.25);g.add(light);
  }
  // LED advertising screens: a roadside 48-sheet on the loading shed roof, a portrait screen on the viaduct pier,
  // another 48-sheet on the corner mill facing back up the street.
  billboard(root,{pos:[19.9,6.4+1.6+1.53,-1.7],w:6.1,h:3.05,ads:['verdant','subscribe','pods','donor'],hold:7,glow:0x9ad8b8,seed:1});
  // the portrait screen sits on the viaduct wall clear of the hut roof, on two wall brackets with its cable run down the brick
  { const bx=-6.0, by=5.9; billboard(bridge,{pos:[bx,by,.42],w:2.2,h:4.2,ads:['tall1','tall2'],hold:9,leds:72,gain:1.5,glow:0xff8090,seed:2,frame:false});
    for(const y of [by-1.4,by+1.4]){ piece(bridge,bx,y,.15,2.0,.12,.4,iron); for(const s of [-1,1]) rod(bridge,[bx+s*.9,y,.02],[bx+s*.9,y-.5,.02],.025,iron); }
    rod(bridge,[bx+.8,by-2.2,.05],[bx+.8,.4,.05],.03,rubber,.03,6); piece(bridge,bx+.8,1.2,.12,.3,.4,.18,iron); }
  billboard(corner,{pos:[2,10.2+1.6+1.53,-1.6],w:6.1,h:3.05,ads:['donor','pods','verdant','subscribe'],hold:8,glow:0xc8b8ff,seed:3});
  for (const x of [-14.7,-8.6]) {
    const flank=new T.Group();flank.position.set(x,0,-5.95);root.add(flank);
    piece(flank,0,3.2,0,.65,6.4,12,surface('ashlar',12,6.4));
  }
  piece(root,-11.6,2.7,-12,6.5,5.4,.5,surface('zinc',6.5,5.4));
}
