"""鲜肉柜里的一盒盒肉 → assets/kit/12_Retail_Cuts.glb（可重复运行，原包不动）。

blender --background --factory-startup --python retail_cuts.py -- <05 Retained cuts and cultureware.glb> <04_Cold.glb> <out.glb>

肉：Clinical Ward Kit 里留样台上的四块（牛、猪、鱼、鸡；切面、风干的边都是原样）。
托盘和封膜：Warehouse 04 冷藏货架上的一只吸塑托盘和它的透明封膜。
每样东西各自以底面中心为原点、正面朝 +z（网页里一盒盒摆、随机转、按托盘大小缩放）。贴图压到 512。
"""
import bpy, sys
from mathutils import Vector, Matrix

A = sys.argv[sys.argv.index('--') + 1:]
CUTS, COLD, OUT = A
b2w = lambda p: Vector((p.x, p.z, -p.y))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=CUTS)
keep = {'beef / retained sample': 'cut_beef', 'pork / retained sample': 'cut_pork', 'fish / retained sample': 'cut_fish', 'chicken / retained sample': 'cut_chicken'}
first = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=COLD)
second = [o for o in bpy.data.objects if o not in first]
picked = {}
for o in list(bpy.data.objects):
    if o.type != 'MESH': continue
    name = o.name.split('.')[0]
    if o in first and name in keep and keep[name] not in picked: picked[keep[name]] = o
    elif o in second and name == 'Sealed thermoformed tray' and 'tray' not in picked: picked['tray'] = o
    elif o in second and name == 'Clear seal' and 'seal' not in picked: picked['seal'] = o
print('PICKED', sorted(picked))
tray = picked['tray']
for n, o in picked.items():
    o.data = o.data.copy(); M = o.matrix_world.copy(); o.parent = None; o.data.transform(M); o.matrix_world = Matrix.Identity(4)
# 封膜跟着托盘：用托盘的中心当两者的原点
def bounds(o):
    P = [b2w(v.co) for v in o.data.vertices]
    return Vector([min(p[k] for p in P) for k in range(3)]), Vector([max(p[k] for p in P) for k in range(3)])
tlo, thi = bounds(tray); tc = Vector(((tlo.x + thi.x) / 2, tlo.y, (tlo.z + thi.z) / 2))
for n, o in picked.items():
    lo, hi = bounds(o)
    c = tc if n in ('tray', 'seal') else Vector(((lo.x + hi.x) / 2, lo.y, (lo.z + hi.z) / 2))
    o.data.transform(Matrix.Translation(Vector((-c.x, c.z, -c.y))))       # 网页坐标 (x, y, z) → Blender (x, -z, y)
    o.data.update(); o.name = n; o.data.name = n
    lo, hi = bounds(o)
    print('SIZE', n, [round(v, 3) for v in (hi - lo)], 'min', [round(v, 3) for v in lo])
for o in list(bpy.data.objects):
    if o.name not in picked: bpy.data.objects.remove(o)
for im in bpy.data.images:
    if im.size[0] > 512: im.scale(512, int(512 * im.size[1] / im.size[0]))
for o in bpy.data.objects:
    if o.data.uv_layers: o.data.uv_layers[0].name = 'UVMap'
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_lights=False, export_cameras=False, export_animations=False,
                          export_image_format='WEBP', export_image_quality=84, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('OUT', OUT)
