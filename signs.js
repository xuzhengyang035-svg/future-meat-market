// Signs are objects, not pictures: a flat sign plane becomes a slab with real thickness, painted edges and a back.
import * as THREE from 'three';

// mesh: a Mesh with a PlaneGeometry (the printed face). Keeps its place, rotation and printed material.
//   depth: board thickness in metres (PVC sign 3-5 mm, painted board 15-25 mm, light box 40 mm+)
//   edge:  colour of the cut edges; back: 'blank' (edge colour), 'print' (the same print, reads right from behind) or a material
export function slab(mesh, { depth = 0.004, edge = 0xe9e6de, back = 'blank', roughness = 0.6 } = {}) {
  const { width: w, height: h } = mesh.geometry.parameters;
  const front = mesh.material;
  if (front.side !== undefined) front.side = THREE.FrontSide;
  const edgeM = new THREE.MeshStandardMaterial({ color: edge, roughness });
  const backM = back === 'print' ? front : back === 'blank' ? edgeM : back;
  mesh.geometry.dispose();
  mesh.geometry = new THREE.BoxGeometry(w, h, depth);
  mesh.material = [edgeM, edgeM, edgeM, edgeM, front, backM];                  // +x -x +y -y +z(front) -z(back)
  mesh.userData.face = front;                                                   // whoever repaints the sign later finds its printed face here
  return mesh;
}
