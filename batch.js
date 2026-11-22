// 把一个场景里不会动的小网格按“同一种材质 + 同一块区域”合成一个。
// 街道有四千多个各自独立的小盒子、圆柱：数据只有十几 MB，可每一个都要自己的几块显存缓冲，显卡进程里就是一个 GB、每帧三千多次绘制。
// 用在街道、仓库、门店：会动、要单独点选的标上 userData.keep 就不参与。透明的不合（要按远近排序）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CELL = 12;                                                               // 按 12 m 一格合，看不见的那几格照样能整格跳过

export function batchStatic(scene) {
  scene.updateMatrixWorld(true);
  const groups = new Map(), center = new THREE.Vector3();
  scene.traverseVisible((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isBatchedMesh || o.isSkinnedMesh || o.children.length) return;
    const m = o.material, g = o.geometry;
    if (Array.isArray(m) || m.transparent || m.transmission > 0 || o.userData.nav || o.userData.keep) return;
    if (Object.keys(g.morphAttributes).length || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return;
    if (o.matrixWorld.determinant() <= 0) return;                              // 镜像过的会翻面
    const names = Object.keys(g.attributes).sort();
    if (names.some((n) => g.attributes[n].isInterleavedBufferAttribute)) return;
    if (!g.boundingBox) g.computeBoundingBox();
    g.boundingBox.getCenter(center).applyMatrix4(o.matrixWorld);
    const key = [m.uuid, o.renderOrder, o.layers.mask, o.castShadow, o.receiveShadow, !!o.userData.walk, !!g.index,
      Math.floor(center.x / CELL), Math.floor(center.z / CELL),
      names.map((n) => { const a = g.attributes[n]; return `${n}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}:${a.gpuType}`; })].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });

  const retired = new Set();
  let removed = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parts = list.map((o) => {
      const g = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(o.geometry.attributes)) {
        // 模型里常是压成整数的坐标，摆到世界里会溢出：先展开成浮点
        if (k === 'position' || k === 'normal' || k === 'tangent') {
          const out = new Float32Array(a.count * a.itemSize);
          for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) out[i * a.itemSize + j] = a.getComponent(i, j);
          g.setAttribute(k, new THREE.BufferAttribute(out, a.itemSize));
        } else g.setAttribute(k, a.clone());
      }
      if (o.geometry.index) g.setIndex(o.geometry.index.clone());
      g.applyMatrix4(o.matrixWorld);
      return g;
    });
    const merged = mergeGeometries(parts, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const first = list[0], mesh = new THREE.Mesh(merged, first.material);
    mesh.renderOrder = first.renderOrder;
    mesh.layers.mask = first.layers.mask;
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    if (first.userData.walk) mesh.userData.walk = true;
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
    for (const o of list) { o.removeFromParent(); retired.add(o.geometry); }
    removed += list.length - 1;
  }
  scene.traverse((o) => { if (o.geometry) retired.delete(o.geometry); });
  for (const g of retired) g.dispose();
  return removed;
}
