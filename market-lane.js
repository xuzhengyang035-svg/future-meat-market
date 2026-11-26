// Neighbouring premises modelled in metres. Each pivot is the centre of its street frontage.
import * as T from 'three';
import { decal } from './assets.js';
export function addMarketLane(root) {
  const loader = new T.TextureLoader();
  function texture(name) {
    const t = loader.load(new URL('./assets/market-lane/' + name + '.webp', import.meta.url).href);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const mat = (color, roughness=.78, metalness=0) => new T.MeshStandardMaterial({color, roughness, metalness});
  const iron = mat(0x444a46,.48,.52), coping = mat(0x77736a), timber = mat(0x484338), slate = mat(0x465453,.61);
  const frame = mat(0x5a5a52), dark = mat(0x232e30,.29,.35), cream = mat(0xc2b598);
  const unit = new T.BoxGeometry();
  function piece(g,x,y,z,w,h,d,m) {
    const o=new T.Mesh(unit,m); o.position.set(x,y,z); o.scale.set(w,h,d); g.add(o); return o;
  }
  function surface(name,w,h) {
    const t=texture(name); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(w/3.2,h/3.2);
    const tone={ashlar:0x6e6a62,limewash:0x88846e,'kiln-brick':0x8a7a70,zinc:0x7a7c7a}[name]??0xffffff;
    return new T.MeshStandardMaterial({map:t,color:tone,roughness:name==='zinc'?.56:.88,metalness:name==='zinc'?.42:0});
  }
  // Lit rooms differ in colour temperature and brightness: tungsten, fluorescent, TV blue, red shade, a dim lamp.
  const panes=[dark,...[[0xe0a060,.9],[0xc8e0d8,.55],[0x6a8ad8,.45],[0xd86a50,.5],[0xb07840,.22],[0xf0c890,1.1]].map(([c,k])=>new T.MeshStandardMaterial({color:0x202020,emissive:c,emissiveIntensity:k,roughness:.42}))];
  function window(g,x,y,w,h,z,id) {
    piece(g,x,y,z,w+.17,h+.17,.18,frame);
    piece(g,x,y,z+.11,w,h,.07,panes[[0,1,0,2,5,0,3,0,4,6,0][Math.abs(id)%11]]);
    piece(g,x,y+h*.19,z+.16,w,.057,.035,timber);
    piece(g,x,y,z+.16,.048,h,.035,timber);
    piece(g,x,y-h/2-.09,z+.09,w+.29,.13,.36,coping);
    if(id%4===1) piece(g,x,y+h*.32,z+.15,w*.98,h*.34,.018,cream);
  }
  // Street-facing side is local +Z. The opposite pavement is rotated as a unit.
  function premise({x,z,yaw=0,w,h,d=6,shop,skin,kind,rows=1,cols=2}) {
    const g=new T.Group(); g.name=shop; g.position.set(x,0,z); g.rotation.y=yaw; root.add(g);
    piece(g,0,h/2,-d/2,w,h,d,surface(skin,w,h));
    const frontageH=3.35, frontageW=Math.min(w-.55,6.65);
    const signTex=texture(shop);
    const sign=new T.Mesh(new T.PlaneGeometry(frontageW,frontageH),new T.MeshStandardMaterial({map:signTex,emissiveMap:signTex,emissive:0xffffff,emissiveIntensity:.15,roughness:.65}));
    sign.position.set(0,.15+frontageH/2,.011); g.add(sign);
    for(const sx of [-1,1]) piece(g,sx*(frontageW/2+.075),1.86,.06,.15,3.42,.17,timber);
    piece(g,0,3.56,.17,frontageW+.35,.14,.46,coping);
    piece(g,0,.19,.23,frontageW+.09,.08,.62,coping);
    for(let row=0;row<rows;row++) for(let col=0;col<cols;col++){
      const px=w*((col+.5)/cols-.5), py=3.72+(row+.5)*(h-3.9)/rows;
      const bay=kind==='bay' && row===0;
      if(bay) {piece(g,px,py,.28,2.04,2.17,.69,timber); piece(g,px,py+1.12,.28,2.2,.14,.85,slate);}
      window(g,px,py,kind==='mill'?w/cols-.57:kind==='bay'?1.68:1.01,kind==='mill'?1.22:1.65,bay?.65:.04,Math.round(x)+col*5+row*9);
    }
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
    for(let k=0;k<Math.max(2,cols*Math.max(rows,1));k++){ const px=w*(((k%cols)+.5)/cols-.5)+(k%2?.15:-.1); decal(L[(k+Math.abs(Math.round(x)))%3],g,{pos:[px,3.72+(Math.floor(k/cols)+.5)*(h-3.9)/Math.max(rows,1)-1.6,.012],w:1.3,h:2.2,color:0x24221e,opacity:.55,flipX:k%2===1}); }
    decal(L[3+Math.abs(Math.round(x))%2],g,{pos:[0,h-.9,.013],w:w,h:1.8,color:0x24221e,opacity:.5});
    const pipeX=-w/2+.18;
    decal('Leaking006',g,{pos:[pipeX+.12,h*.45,.012],w:.6,h:h*.8,color:0x24221e,opacity:.6});
    piece(g,pipeX,h/2,.14,.11,h,.11,iron);
    for(let y=1;y<h;y+=2.6) piece(g,pipeX,y,.14,.21,.09,.18,frame);
    return g;
  }
  const back=Math.PI;
  [
    {x:11.3,z:-.12,w:6.42,h:10.35,rows:2,cols:2,kind:'bay',skin:'kiln-brick',shop:'moran'},
    {x:19.9,z:-1.1,w:10.2,h:6.4,cols:4,kind:'mill',skin:'zinc',shop:'loading'},
    {x:-19.65,z:.22,w:8.9,h:8.1,cols:3,kind:'terrace',skin:'limewash',shop:'keane'},
    {x:-12.2,z:22.52,yaw:back,w:7.8,h:4.65,rows:0,kind:'flat',skin:'ashlar',shop:'wash'},
    {x:-3.6,z:22.65,yaw:back,w:8.8,h:11.65,rows:3,cols:3,kind:'terrace',skin:'kiln-brick',shop:'paper'},
    {x:5.05,z:22.51,yaw:back,w:8.3,h:7.1,cols:2,kind:'bay',skin:'limewash',shop:'tide'}
  ].forEach(premise);
  // A pavement bench with bolted feet and separate slats, and two bike hoops outside the wash.
  const bench=new T.Group(); bench.position.set(-16.1,.15,20.85); bench.rotation.y=-.16; root.add(bench);
  for(const x of [-.72,.72]){
    piece(bench,x,.21,0,.08,.42,.48,iron);
    piece(bench,x,.6,.22,.065,.79,.065,iron);
  }
  const board=surface('limewash',1.85,.12); board.color.setHex(0x806143);
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
  const masonry=surface('ashlar',3.2,3.2); masonry.map.repeat.set(.32,.32); masonry.color.setHex(0x55524c);
  const vault=new T.Mesh(new T.ExtrudeGeometry(arch,{depth:4.3,bevelEnabled:false,curveSegments:24}),masonry); vault.position.z=-4.3; bridge.add(vault);
  piece(bridge,0,8.37,-2.12,34,.23,4.7,coping);
  for(let i=-15;i<=15;i+=3.4) decal(['Leaking007','Leaking008','Leaking009'][Math.abs(Math.round(i))%3],bridge,{pos:[i,6.6,.012],w:3.6,h:3.4,color:0x1c1a18,opacity:.7,flipX:i>0});
  for(const sx of [-1,1]) decal('Leaking006',bridge,{pos:[sx*5.2,3.4,.012],w:1.1,h:5.5,color:0x1c1a18,opacity:.6});
  decal('Leaking009',bridge,{pos:[0,.9,.012],w:34,h:1.8,color:0x1c1a18,opacity:.65});
  for(let i=0;i<24;i++){const a=(i+.5)*Math.PI/24; piece(bridge,4.2*Math.cos(a),2.7+4.2*Math.sin(a),.03,.53,.42,.2,coping).rotation.z=a-Math.PI/2;}
  for(let i=-16;i<=16;i+=2) piece(bridge,i,8.97,-.25,.07,1.02,.07,iron);
  piece(bridge,0,9.46,-.25,32,.075,.075,iron);
  // Beyond the vault the service lane bends: a staggered wall screens the horizon.
  piece(bridge,-3.7,2.9,-10,15,5.8,.55,surface('kiln-brick',15,5.8));
  piece(bridge,6.7,2.3,-16,13,4.6,.65,surface('ashlar',13,4.6));
  piece(bridge,-1.6,1.7,-9.65,3.2,3.4,.16,surface('zinc',3.2,3.4));
  piece(bridge,-3.7,5.86,-10,15.2,.13,.73,coping);
  // East end: cross-street with a deep-set industrial shed and loading canopy.
  const yard=new T.Group(); yard.position.set(31,0,9); yard.rotation.y=-Math.PI/2; root.add(yard);
  piece(yard,0,3.4,-3,25,6.8,6,surface('kiln-brick',25,6.8));
  piece(yard,-3,2,.07,6,3.8,.16,surface('zinc',6,3.8));
  piece(yard,-3,4.25,1.15,8,.19,2.4,slate).rotation.x=.05;
  for(const px of [-6.65,.65]) piece(yard,px,2,2.21,.1,4,.1,iron);
  for(let i=0;i<7;i++) window(yard,-10+i*3.1,5.45,2.15,.8,.07,i);
  for (const x of [-14.7,-8.6]) {
    const flank=new T.Group();flank.position.set(x,0,-5.95);root.add(flank);
    piece(flank,0,3.2,0,.65,6.4,12,surface('ashlar',12,6.4));
  }
  piece(root,-11.6,2.7,-12,6.5,5.4,.5,surface('zinc',6.5,5.4));
}
