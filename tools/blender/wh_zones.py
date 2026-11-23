"""仓库 04–06 三个区（Warehouse_04-06_Kit）→ 网页用的 assets/kit/09_Cold_Store.glb、10_Dispatch.glb、11_Archive.glb（可重复运行，原包不动）。

blender --background --factory-startup --python wh_zones.py -- <04_Cold.glb> <05_Dispatch.glb> <06_Archive.glb> <输出目录>

1. 去掉展示用的地台和背板（仓库自己有地和墙）；牌子留着，挂到仓库的墙上，去掉上面的区号。05 的牌子不靠墙：底下补两根立柱。
2. 三个文件里重复的贴图（galv_color.001 …）并成一张；材质贴图压到 512，带字的、肉、图谱页保持原尺寸。
3. 静态的按材质合并；开书的铰链（Atlas_Hinge 和它下面的书页）保持原样，动画 Open_Atlas 一起导出；
   05 那只 DISPATCH 纸箱（连同它的标签和胶带）单独留成一个物体，网页里让它在滚筒线上走。
4. 每个区以自己的中心为原点（x 减去 -4.5 / 0 / 4.5），网页里再摆到仓库的位置。WebP + Draco。
"""
import bpy, bmesh, sys, os
from mathutils import Vector, Matrix

A = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = A[:3], A[3]
NAMES = ['09_Cold_Store.glb', '10_Dispatch.glb', '11_Archive.glb']
CENTRE = [-4.5, 0.0, 4.5]
KEEP_SIZE = ('cold', 'auto', 'archive', 'grade', 'temp', 'waste', 'book', 'beef', 'folio', 'dispatch', 'sealed', 'us', 'pump', 'ecg', 'warm')
w2b = lambda p: Vector((p[0], -p[2], p[1]))
b2w = lambda p: Vector((p.x, p.z, -p.y))


def base(n):
    return n.split('.')[0]


for src, out, cx in zip(SRC, NAMES, CENTRE):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    objs = list(bpy.data.objects)
    for o in objs:
        if base(o.name) in ('Section plinth', 'Rear service lining'):
            bpy.data.objects.remove(o)
    # 重复贴图并成一张（不同文件里同名的图在网页里也按名字共用）
    imgs = {}
    for im in list(bpy.data.images):
        if im.size[0] == 0: continue
        k = base(im.name)
        if k in imgs: im.user_remap(imgs[k]); bpy.data.images.remove(im)
        else: imgs[k] = im; im.name = k
    # 牌子上去掉区号（04 / 05 / 06）：标题那一行整体左移盖住编号，纸纹和边框不动
    import numpy as np
    for k in ('cold', 'auto', 'archive'):
        im = imgs.get(k)
        if not im: continue
        w, h = im.size
        px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
        r0, r1 = h - 72, h - 12                                               # 标题那一行（像素从下往上数）
        width = 470
        px[r0:r1, 22:22 + width] = px[r0:r1, 148:148 + width].copy()
        im.pixels[:] = px.ravel(); im.update(); im.pack()
    for k, im in imgs.items():
        if not k.startswith(KEEP_SIZE) and max(im.size) > 512:
            im.scale(512, 512)
    hinge = bpy.data.objects.get('Atlas_Hinge')
    anim = set()
    if hinge:
        anim.add(hinge.name)
        for c in hinge.children_recursive: anim.add(c.name)
    # 05：DISPATCH 纸箱和它自己的胶带、标签拆出来合成一个物体
    if out.startswith('10'):
        for n in ('Tape across lid', 'Folded tape end'):
            for o in [x for x in bpy.data.objects if base(x.name) == n and x.type == 'MESH']:
                o.data = o.data.copy()
                M = o.matrix_world.copy(); o.data.transform(M); o.matrix_world = Matrix.Identity(4)
                bm = bmesh.new(); bm.from_mesh(o.data)
                far = [v for v in bm.verts if b2w(v.co).x > -0.3]
                if far and len(far) < len(bm.verts):
                    near = [v for v in bm.verts if v not in far]
                    twin = o.copy(); twin.data = o.data.copy(); bpy.context.collection.objects.link(twin)
                    bmesh.ops.delete(bm, geom=far, context='VERTS'); bm.to_mesh(o.data); bm.free()
                    b2 = bmesh.new(); b2.from_mesh(twin.data)
                    bmesh.ops.delete(b2, geom=[v for v in b2.verts if b2w(v.co).x <= -0.3], context='VERTS'); b2.to_mesh(twin.data); b2.free()
                    twin.name = 'DISPATCH_PART'
                else:
                    bm.free()
                    if far: o.name = 'DISPATCH_PART'
        parts = [o for o in bpy.data.objects if o.type == 'MESH' and (base(o.name) in ('Carton | dispatch', 'Inventory label · dispatch') or o.name.startswith('DISPATCH_PART'))]
        for o in parts:
            o.data = o.data.copy(); M = o.matrix_world.copy(); o.parent = None; o.data.transform(M); o.matrix_world = Matrix.Identity(4)
        with bpy.context.temp_override(active_object=parts[0], object=parts[0], selected_objects=parts, selected_editable_objects=parts):
            bpy.ops.object.join()
        box = parts[0]; box.name = 'Dispatch_carton'; anim.add(box.name)
        # 原点放到纸箱底面中心，网页里沿滚筒线移动它
        P = [b2w(v.co) for v in box.data.vertices]
        c = Vector(((min(p.x for p in P) + max(p.x for p in P)) / 2, min(p.y for p in P), (min(p.z for p in P) + max(p.z for p in P)) / 2))
        box.data.transform(Matrix.Translation(-w2b(c))); box.location = w2b(c)
        # 牌子底下两根立柱（这块牌子原来挂在展台背板上）
        galv = next(m for m in bpy.data.materials if m.name.endswith('/ galv'))
        for x in (-1.12, 1.12):
            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.025, depth=2.33, location=w2b((x, 2.33 / 2, -1.5)))
            p = bpy.context.object; p.name = 'Sign post'; p.data.materials.append(galv)
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.09, depth=0.012, location=w2b((x, 0.006, -1.5)))
            f = bpy.context.object; f.name = 'Sign post foot'; f.data.materials.append(galv)
    # 静态的按材质合并（动画的、要移动的不动）
    groups = {}
    for o in list(bpy.data.objects):
        if o.type != 'MESH' or o.name in anim: continue
        o.data = o.data.copy(); M = o.matrix_world.copy(); o.parent = None; o.data.transform(M); o.matrix_world = Matrix.Identity(4)
        groups.setdefault(tuple(m.name for m in o.data.materials), []).append(o)
    for i, obs in enumerate(groups.values()):
        if len(obs) > 1:
            with bpy.context.temp_override(active_object=obs[0], object=obs[0], selected_objects=obs, selected_editable_objects=obs):
                bpy.ops.object.join()
        obs[0].name = f'S{i}'
    # 以区的中心为原点
    for o in bpy.data.objects:
        if o.parent is None: o.location.x -= cx
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.data.uv_layers: o.data.uv_layers[0].name = 'UVMap'
    tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
    path = os.path.join(OUT, out)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True, export_lights=False, export_cameras=False,
                              export_animations=True, export_image_format='WEBP', export_image_quality=84,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=14)
    print('OUT', out, 'tris', tris, 'meshes', sum(1 for o in bpy.data.objects if o.type == 'MESH'), 'KB', os.path.getsize(path) // 1024,
          'anim', [a.name for a in bpy.data.actions], 'imgs', sorted((k, im.size[0]) for k, im in imgs.items()))
