// 内存和预热：这个网站有一千多张照片贴图，五个房间不能一打开就全塞进访客的电脑（实测那样要 3–8 GB）。
//   1. 建场景时只登记“要哪张图”，不下载；走进哪个房间才下载、解码、上传哪个房间的图
//   2. 同一个网址只有一份；小道具、贴花、法线一类走 assets/lite 的小图（?hq=1 用原图）
//   3. 进门时分批来：图片到齐 → 编译着色器 → 上传 → 画一遍，每批之间让出一帧，加载画面才不会停
//   4. 离开以后，那个房间独有的图片、显存贴图、几何缓冲和着色器都放掉；回来时从浏览器缓存里再取
import * as THREE from 'three';

const HQ = new URLSearchParams(location.search).get('hq') === '1';
const byUrl = new Map();                                                       // 网址 → entry
const bySource = new Map();                                                    // Texture.source → entry

// 一张“还没下载”的贴图
function lazyTexture(url, crossOrigin = 'anonymous') {
  const t = new THREE.Texture();
  let entry = byUrl.get(url);
  if (entry) {
    t.source = entry.source;
    if (entry.source.data) t.version = 1;                                     // 图已经在了：只登记这一份采样参数，不重新上传
  } else {
    entry = { url, crossOrigin, source: t.source, promise: null };
    byUrl.set(url, entry);
    bySource.set(t.source, entry);
  }
  return t;
}

// 在建任何场景之前调用一次
export async function initAssets() {
  let lite = new Set();
  if (!HQ) {
    try {
      const r = await fetch('assets/lite/index.json');
      if (r.ok) lite = new Set(await r.json());
    } catch (e) { console.warn('没有轻量贴图清单，改用原图', e); }
  }
  THREE.DefaultLoadingManager.setURLModifier((url) => {
    const i = url.indexOf('assets/ph/');
    return i >= 0 && lite.has(url.slice(i + 10)) ? `${url.slice(0, i)}assets/lite/${url.slice(i + 10)}` : url;
  });
  THREE.TextureLoader.prototype.load = function (url) { return lazyTexture((this.path || '') + url, this.crossOrigin); };
}

// GLTFLoader 默认一读模型就把里面所有的图解码成位图。改成：只留着压缩的原文件，用到时再解码
export function deferImages(loader) {
  loader.register((parser) => {
    const made = new Map();
    parser.loadImageSource = function (index) {
      if (made.has(index)) return made.get(index).then((t) => t.clone());
      const def = this.json.images[index];
      const url = def.bufferView !== undefined
        ? this.getDependency('bufferView', def.bufferView).then((b) => URL.createObjectURL(new Blob([b], { type: def.mimeType })))
        : Promise.resolve(THREE.LoaderUtils.resolveURL(def.uri, this.options.path));
      const p = url.then((u) => lazyTexture(u));
      made.set(index, p);
      return p;
    };
    return { name: 'LAZY_IMAGES' };
  });
  return loader;
}

// 网一抖就会少一张图：隔一会儿再试两次
async function fetchImage({ url, crossOrigin }) {
  for (let n = 0; ; n++) {
    try {
      const image = await new Promise((res, rej) => new THREE.ImageLoader().setCrossOrigin(crossOrigin).load(url, res, undefined, rej));
      await image.decode?.().catch(() => {});                                  // 解码放到主线程外面做
      return image;
    } catch (e) {
      if (n >= 2) { console.warn('贴图没有加载出来', url, e); return null; }
      await new Promise((r) => setTimeout(r, 600 * (n + 1)));
    }
  }
}

async function fetchTextures(textures, onProgress) {
  const groups = new Map();
  for (const t of textures) {
    const entry = bySource.get(t.source);
    if (!entry) continue;
    if (entry.source.data) { if (!t.version) t.version = 1; continue; }
    if (!groups.has(entry)) groups.set(entry, []);
    groups.get(entry).push(t);
  }
  const queue = [...groups];
  let done = 0;
  const worker = async () => {
    for (let next = queue.pop(); next; next = queue.pop()) {
      const [entry, list] = next;
      entry.promise ??= fetchImage(entry);
      const image = await entry.promise;
      entry.promise = null;
      if (image) {
        entry.source.data = image;
        for (const t of list) t.needsUpdate = true;
      }
      onProgress(++done / groups.size);
    }
  };
  await Promise.race([Promise.all(Array.from({ length: 24 }, worker)), new Promise((r) => setTimeout(r, 90000))]);
}

// 让出一帧。页面在后台时没有 rAF、计时器也被压到一秒一次：改用消息排队，不然后台标签页里要加载好几分钟
export const breathe = () => new Promise((res) => {
  let done = false;
  const go = () => { if (!done) { done = true; res(); } };
  if (document.hidden) {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => { ch.port1.close(); go(); };
    ch.port2.postMessage(0);
    return;
  }
  requestAnimationFrame(() => setTimeout(go, 0));
  setTimeout(go, 60);
});

async function inSlices(list, work, onProgress, flush, budget = 10) {
  let t0 = performance.now();
  for (let i = 0; i < list.length; i++) {
    work(list[i]);
    if (performance.now() - t0 < budget) continue;
    flush();
    onProgress(i / list.length);
    await breathe();
    t0 = performance.now();
  }
}

export function createPreparer(renderer, camera, getTarget) {
  const warmed = new WeakSet(), gl = renderer.getContext(), flush = () => gl.flush();
  let current = null;

  const usable = (v) => v?.isTexture && !v.isRenderTargetTexture;
  // 材质上的贴图，加上编译以后才看得到的（onBeforeCompile 里塞进去的 uniform）
  function contentsOf(scene) {
    const textures = new Set(), geometries = new Set(), materials = new Set();
    scene.traverse((o) => {
      if (o.geometry && !o.isSprite) geometries.add(o.geometry);
      if (!o.material) return;
      for (const m of [o.material].flat()) {
        materials.add(m);
        for (const v of Object.values(m)) if (usable(v)) textures.add(v);
        const compiled = renderer.properties.has?.(m) === false ? null : renderer.properties.get(m).uniforms;
        for (const set of [m.uniforms, compiled]) {
          if (!set) continue;
          for (const u of Object.values(set)) {
            const v = u?.value;
            if (usable(v) && v !== scene.environment && (bySource.has(v.source) || set === m.uniforms)) textures.add(v);
          }
        }
      }
    });
    return { textures, geometries, materials };
  }

  function into(target, fn) {
    const old = renderer.getRenderTarget();
    renderer.setRenderTarget(target);                                         // 跟正式渲染同一种目标：否则编译出来的着色器第一帧全部作废、再卡十几秒
    try { return fn(); } finally { renderer.setRenderTarget(old); }
  }

  async function compile(scene, meshes, progress) {
    const waits = [];
    for (let i = 0; i < meshes.length;) {
      const t0 = performance.now();
      into(getTarget(), () => {
        while (i < meshes.length && performance.now() - t0 < 16) {
          const part = meshes.slice(i, i + 12);
          i += part.length;
          waits.push(renderer.compileAsync({ traverse: (f) => part.forEach(f), traverseVisible() {} }, camera, scene).catch(() => {}));
        }
      });
      flush();
      progress(i / meshes.length);
      await breathe();
    }
    await Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 30000))]);
  }

  // 分批画一遍，把几何体也传上去。用图层来藏（不用 visible：会连挂在下面的灯一起关掉，灯数一变着色器又要重编）
  async function drawOnce(scene, meshes, progress) {
    const saved = meshes.map((o) => [o.layers.mask, o.frustumCulled]);
    meshes.forEach((o) => { o.layers.mask = 0; });
    try {
      for (let i = 0, size = 50; i < meshes.length;) {
        const part = meshes.slice(i, i + size), first = i, t0 = performance.now();
        part.forEach((o, k) => { o.layers.mask = saved[first + k][0]; o.frustumCulled = false; });
        into(getTarget(), () => renderer.render(scene, camera));
        part.forEach((o, k) => { o.layers.mask = 0; o.frustumCulled = saved[first + k][1]; });
        i += part.length;
        const took = performance.now() - t0;
        size = took < 30 ? Math.min(800, size * 2) : took > 90 ? Math.max(20, Math.round(size / 2)) : size;
        flush();
        progress(i / meshes.length);
        await breathe();
      }
    } finally {
      meshes.forEach((o, k) => { [o.layers.mask, o.frustumCulled] = saved[k]; });
    }
  }

  // 放掉上一个房间独有的东西
  function release(old, keep) {
    const was = contentsOf(old), now = contentsOf(keep);
    const keepSources = new Set([...now.textures].map((t) => t.source));
    for (const t of was.textures) {
      if (now.textures.has(t)) continue;
      t.dispose();
      const entry = bySource.get(t.source);
      if (entry && !keepSources.has(t.source)) entry.source.data = null;
    }
    for (const g of was.geometries) if (!now.geometries.has(g)) g.dispose();
    for (const m of was.materials) if (!now.materials.has(m)) m.dispose();   // 着色器也放掉：每个房间二三十盏灯，一套就是几百 MB
    warmed.delete(old);
    renderer.renderLists.dispose();
  }

  async function prepare(scene, onProgress = () => {}) {
    if (current === scene) return onProgress(1, '开门营业');
    if (current) { release(current, scene); await breathe(); }
    current = scene;
    await fetchTextures(contentsOf(scene).textures, (p) => onProgress(0.4 * p, '贴图到货'));

    const all = [], shown = [];
    const drawable = (o) => (o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.material;
    scene.traverse((o) => { if (drawable(o)) all.push(o); });
    scene.traverseVisible((o) => { if (drawable(o)) shown.push(o); });
    if (!warmed.has(scene)) {
      await compile(scene, all, (p) => onProgress(0.4 + 0.25 * p, '调配材质'));   // 现在藏着的（帘子后面的）也一起编译
      warmed.add(scene);
    }
    const { textures } = contentsOf(scene);
    await fetchTextures(textures, (p) => onProgress(0.65 + 0.05 * p, '贴图到货'));
    await inSlices([...textures].filter((t) => t.version > 0 && t.image && !t.isCubeTexture), (t) => renderer.initTexture(t), (p) => onProgress(0.7 + 0.15 * p, '铺贴图'), flush);
    await drawOnce(scene, shown, (p) => onProgress(0.85 + 0.15 * p, '摆好货'));
    onProgress(1, '开门营业');
  }

  let chain = Promise.resolve();
  return (scene, onProgress) => (chain = chain.then(() => prepare(scene, onProgress)).catch((e) => console.error('场景预热失败', e)));
}
