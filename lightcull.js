// 每个房间有二三十盏小灯，而 three.js 默认让每个像素把每盏灯的整套高光都算一遍，照不到的也算（算出来正好是 0）。
// 这里只跳过那些结果本来就是 0 的计算：超出灯的照射距离、落在射灯锥外的，画面一个像素都不会变，省下来的算力拿去提高分辨率。
// 必须在编译任何材质之前引入。
import * as THREE from 'three';

const C = THREE.ShaderChunk;
const CALL = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';

// 照不到：连高光都不用算
const loops = C.lights_fragment_begin.split(CALL);
if (loops.length >= 3) {
  // 前两处依次是点光源、射灯；后面的方向光照旧
  C.lights_fragment_begin = loops[0] + 'if ( directLight.visible ) ' + CALL + loops[1] + 'if ( directLight.visible ) ' + CALL + loops.slice(2).join(CALL);
}

// 超出距离：连开方、乘方都不用算
for (const name of ['pointLight', 'spotLight']) {
  const head = `vec3 lVector = ${name}.position - geometryPosition;`;
  C.lights_pars_begin = C.lights_pars_begin.replace(head, `${head}
		if ( ${name}.distance > 0.0 && dot( lVector, lVector ) >= ${name}.distance * ${name}.distance ) {
			light.direction = vec3( 0.0, 1.0, 0.0 );
			light.color = vec3( 0.0 );
			light.visible = false;
			return;
		}`);
}
