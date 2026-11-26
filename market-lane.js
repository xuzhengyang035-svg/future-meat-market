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
    const tone={ashlar:0x979087,limewash:0xb3ae91,'kiln-brick':0xc5ae9d,zinc:0xa0a59f}[name]??0xffffff;
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
        rod(g,[x,.96,z+.51],[x,.96,z+.54],.30,slate,.30,32);
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
          const fish=new T.Mesh(new T.SphereGeometry(1,12,7),i===1?slate:frame);fish.scale.set(.36,.09,.105);fish.position.set(x,1.2,-.75-i*.25);fish.rotation.y=.13*(i-1);g.add(fish);
          const tail=new T.Mesh(new T.ConeGeometry(.12,.22,3),iron);tail.rotation.z=Math.PI/2;tail.position.set(x+.33,1.2,fish.position.z);g.add(tail);
        }
      }
    } else {
      piece(g,display,1.77,-.65,span,2.96,.12,iron);
      for(let j=0;j<21;j++)piece(g,display,.42+j*.13,-.55,span,.055,.085,frame);
    }
  }
  // Street-facing side is local +Z. The opposite pavement is rotated as a unit.
  function premise({x,z,yaw=0,w,h,d=6,shop,skin,kind,rows=1,cols=2}) {
    const g=new T.Group(); g.name=shop; g.position.set(x,0,z); g.rotation.y=yaw; root.add(g);
    const wall=surface(skin,w,h);
    piece(g,0,(h+3.55)/2,-d/2,w,h-3.55,d,wall);
    piece(g,0,1.775,-(d+3.2)/2,w,3.55,d-3.2,wall);
    interior(g,shop,w,wall);
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
    for(let k=0;k<cols*rows;k++){ const px=w*(((k%cols)+.5)/cols-.5)+(k%2?.15:-.1); decal(L[(k+Math.abs(Math.round(x)))%3],g,{pos:[px,3.72+(Math.floor(k/cols)+.5)*(h-3.9)/Math.max(rows,1)-1.6,.012],w:1.3,h:2.2,color:0x24221e,opacity:.55,flipX:k%2===1}); }
    decal(L[3+Math.abs(Math.round(x))%2],g,{pos:[0,h-.4,.013],w:w,h:.8,color:0x24221e,opacity:.5});
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
  // The backs of buildings have their own offsets, so they overlap differently as the viewer turns.
  function mill(g,x,z,w,h,d,cols,rows){
    const m=surface('kiln-brick',w,h);piece(g,x,h/2,z-d/2,w,h,d,m);
    piece(g,x,h+.11,z-d/2,w+.3,.24,d+.32,coping);
    for(let k=0;k<=cols;k++)piece(g,x+w*(k/cols-.5),h/2,z+.1,.3,h,.35,m);
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const xx=x+w*((i+.5)/cols-.5), yy=3.4+j*3;
      window(g,xx,yy,w/cols*.7,1.52,z+.1,i+j*cols+Math.round(x));
    }
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
    const skin=surface('zinc',8,4);rod(g,[x,y+4,z],[x,y+7.7,z],2.2,skin,2.2,32);
    for(const h of [4,5.15,6.4,7.72])rod(g,[x,y+h,z],[x,y+h+.09,z],2.24,iron,2.24,32);
    rod(g,[x,y+7.75,z],[x,y+8.3,z],2.34,slate,.08,32);
  }
  function cable(g,a,b,sag){
    const mid=a.map((v,i)=>(v+b[i])*.5);mid[1]-=sag;
    const c=new T.CatmullRomCurve3([a,mid,b].map(v=>new T.Vector3(...v)));
    g.add(new T.Mesh(new T.TubeGeometry(c,20,.032,6,false),rubber));
  }
  mill(bridge,-12,-9,13,13.8,7,4,4);
  mill(bridge,12,-15,11,16,7,3,4);
  mill(bridge,.8,-24,14,10.1,5,4,3);
  chimney(bridge,-9,-22,23.2);tank(bridge,11,16.15,-18);
  for(const j of [-10,8]){
    piece(bridge,j,4.25,.25,.42,8.5,.62,masonry);piece(bridge,j,7,.57,.78,.2,.33,coping);
  }
  cable(bridge,[-15.5,12,-10],[9,14.1,-16],1.4);
  // The road continues under the viaduct between two working yards.
  for(const k of [-1,1])piece(bridge,k*4.5,.12,-10,1.25,.24,18,coping);
  // East end: cross-street with a deep-set industrial shed and loading canopy.
  const yard=new T.Group(); yard.position.set(31,0,9); yard.rotation.y=-Math.PI/2; root.add(yard);
  piece(yard,0,3.4,-3,25,6.8,6,surface('kiln-brick',25,6.8));
  piece(yard,-3,2,.07,6,3.8,.16,surface('zinc',6,3.8));
  piece(yard,-3,4.25,1.15,8,.19,2.4,slate).rotation.x=.05;
  for(const px of [-6.65,.65]) piece(yard,px,2,2.21,.1,4,.1,iron);
  for(let i=0;i<7;i++) window(yard,-10+i*3.1,5.45,2.15,.8,.07,i);
  mill(yard,-15,-4,10.8,12.4,7,3,3);
  mill(yard,12,-9.6,13,14.2,7,4,4);mill(yard,.5,-19,14,16.4,7,4,5);
  tank(yard,11,14.35,-13);chimney(yard,-9,-12,18);
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
  // Delivery van, parked against the east kerb. Cab, cargo box and rubber tyres are separate.
  const van=new T.Group();van.position.set(22.4,.02,17.8);van.rotation.y=-.24;root.add(van);
  const paint=mat(0x818d81,.73),windshield=mat(0x384647,.58,.12);
  piece(van,0,.7,0,1.95,.52,4.25,paint);piece(van,0,1.65,-.65,1.98,1.65,2.92,paint);
  piece(van,0,1.4,1.34,1.87,1.04,1.35,paint);piece(van,0,1.76,2.025,1.58,.52,.045,windshield).rotation.x=-.13;
  piece(van,0,2.02,1.28,1.96,.12,1.58,paint);
  for(const a of [-1,1]){
    piece(van,a*.944,1.75,1.38,.034,.48,1.02,windshield);
    piece(van,a*1.04,1.61,1.86,.19,.16,.21,rubber);
    piece(van,a*.65,.89,2.144,.36,.16,.05,cream);
    for(const z of [-1.38,1.4]){
      rod(van,[a*.83,.39,z],[a*1.02,.39,z],.39,rubber,.39,24);
      rod(van,[a*1.02,.39,z],[a*1.034,.39,z],.19,iron,.19,20);
    }
  }
  piece(van,0,.59,2.15,1.93,.14,.12,rubber);
  cable(yard,[-16,11.8,-4],[13,13.8,-10],2.1);
  // The opposite kerb used to disappear into black sky just to the right of the depot.
  const corner=new T.Group();corner.position.set(18.1,0,23);corner.rotation.y=Math.PI;root.add(corner);
  mill(corner,0,0,15.5,10.2,6.3,4,3);
  piece(corner,0,1.38,.05,6.1,2.55,.12,surface('zinc',6.1,2.55));
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
  for (const x of [-14.7,-8.6]) {
    const flank=new T.Group();flank.position.set(x,0,-5.95);root.add(flank);
    piece(flank,0,3.2,0,.65,6.4,12,surface('ashlar',12,6.4));
  }
  piece(root,-11.6,2.7,-12,6.5,5.4,.5,surface('zinc',6.5,5.4));
}
