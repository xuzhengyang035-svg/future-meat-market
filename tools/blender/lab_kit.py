"""实验室道具包 → 网页用的 assets/lab/lab_kit.glb（可重复运行，原包不动）。

blender --background --factory-startup --python lab_kit.py -- <FMM_Laboratory_Web.glb> <out.glb>

1. 去掉包里的参观廊（网页自己的参观廊带着批次、数据墙、提问终端）和灯（网页里用代码打灯）；外壳在玻璃那条线裁开，两侧补上墙。
2. 修穿插：立管穿洗手台、布帘穿吊罐、灯杆穿管道、垃圾袋插进钢柱、吊架插进灯壳、牛腿陷进床垫；鸡的肉垂改成垂下来的两片。
3. 换布局（实验台和培养肉在前、病床往里让 0.55 + 0.9 m；z < -2.4 的墙地设备也往里推 0.9 m），再查一遍件与件之间的穿插，打印 HIT；REPORT 一行是面数、网格数和体积。
   源文件用 Clinical Ward Kit 里的整包 FMM_Laboratory_Web.glb：多了床尾四件设备（01–04，跟床一起挪）和显微镜台上的肉样、培养皿（05，跟显微镜台一起搬）。
4. 静态的按材质合并，四只动物各自合并（要呼吸，名字以 A_ 开头）；贴图 WebP，网格 Draco。
坐标一律按网页的来（米，Y 朝上，参观廊玻璃在 z = -1）。
"""
import bpy, bmesh, sys, json, os
from collections import defaultdict
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

SRC, OUT = sys.argv[sys.argv.index('--') + 1:]
ANIMALS = ('duroc', 'holstein', 'white', 'hen')
w2b = lambda p: Vector((p[0], -p[2], p[1]))
b2w = lambda p: Vector((p.x, p.z, -p.y))

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=SRC)
bpy.context.view_layer.update()
meshes = []
for o in list(bpy.data.objects):
    if o.type != 'MESH': continue
    if o.name.startswith('visitor_gallery'):
        bpy.data.objects.remove(o); continue
    M = o.matrix_world.copy(); o.data = o.data.copy(); o.parent = None; o.data.transform(M); o.matrix_world = Matrix.Identity(4)
    meshes.append(o)
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o)


def find(mod, key):
    return [o for o in meshes if o.name.split('|')[0].strip() == mod and key in o.name]


def islands(o):
    me = o.data; par = list(range(len(me.vertices))); seen = {}
    def f(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for v in me.vertices:
        k = tuple(round(c, 4) for c in v.co)
        if k in seen: par[f(v.index)] = f(seen[k])
        else: seen[k] = v.index
    for e in me.edges:
        a, b = f(e.vertices[0]), f(e.vertices[1])
        if a != b: par[a] = b
    g = defaultdict(list)
    for v in me.vertices: g[f(v.index)].append(v.index)
    out = []
    for idx in g.values():
        P = [b2w(me.vertices[i].co) for i in idx]
        out.append((idx, [min(p[k] for p in P) for k in range(3)], [max(p[k] for p in P) for k in range(3)]))
    return out


def edit(label, mod, key, pred, fn, expect):
    n = 0
    for o in find(mod, key):
        for idx, lo, hi in islands(o):
            if not pred(lo, hi): continue
            for i in idx: o.data.vertices[i].co = w2b(fn(b2w(o.data.vertices[i].co)))
            n += 1
    print('FIX', label, n)
    if n != expect: raise RuntimeError(f'{label}: expected {expect} parts, found {n}')


mv = lambda x=0, y=0, z=0: (lambda p: p + Vector((x, y, z)))
V, B = 'overhead_holding_vessels', 'microscopy_bench'
edit('riser', V, 'Petroleum', lambda a, b: a[0] < -7.9 and b[1] > 6, mv(x=-.82), 1)
edit('riser brackets', V, 'suspension', lambda a, b: -7.9 < a[0] < -7.8 and a[2] < -12.3, mv(x=-.82), 3)
edit('curtain', B, 'Indigo', lambda a, b: True, mv(x=.78), 1)
edit('curtain hooks', B, 'Brushed', lambda a, b: a[1] > 2.8 and b[2] < -10.6, mv(x=.78), 11)
edit('curtain rail', B, 'Galvanised', lambda a, b: a[1] > 2.8 and b[2] < -10.6, mv(x=.78), 3)
edit('service pipes', 'rear_equipment', 'Galvanised', lambda a, b: a[0] < -7.9 and b[0] > 7.9 and a[2] > -8.6, mv(z=.17), 2)
edit('pipe hanger', V, 'suspension', lambda a, b: -4.02 < a[0] < -4.0 and b[0] < -3.98, mv(x=.04), 1)
squash = lambda p: Vector((8.04 + (p.x - 8.04) * .82, p.y, p.z))
edit('bag', 'clinical_returns', 'return liner', lambda a, b: b[0] > 8.7, squash, 1)
edit('bag tie', 'clinical_returns', 'Unbleached', lambda a, b: a[0] > 8.4 and b[2] < -9.2, squash, 2)
for o in find('holstein', 'stocking'):
    for v in o.data.vertices: v.co.z = max(v.co.z, .8995)

# 鸡：两片肉垂原来是横着伸出去 18 cm 的薄片 → 喙下面垂着的两片
comb = find('hen', 'Comb')[0]
coat = find('hen', 'coat')[0]
beak = [(a, b) for _, a, b in islands(find('hen', 'Bill')[0]) if a[1] > 1.14 and b[1] - a[1] < .042 and max(b[0] - a[0], b[2] - a[2]) > .05]
bc = Vector([(min(a[k] for a, _ in beak) + max(b[k] for _, b in beak)) / 2 for k in range(3)])
isl = islands(comb); blades = [i for i, a, b in isl if b[1] < 1.17]
if len(blades) != 2: raise RuntimeError('wattles')
C = [Vector([(a[k] + b[k]) / 2 for k in range(3)]) for a, b in [(a, b) for i, a, b in isl if a[1] > 1.19]]
head = sum(C, Vector()) / len(C); fwd = Vector((bc.x - head.x, 0, bc.z - head.z)).normalized(); side = Vector((-fwd.z, 0, fwd.x))
# 脖子和身子接缝那一圈是拧扁的（像一片硬翅）：只在这一圈高度里做平滑，按高度渐入渐出
bm = bmesh.new(); bm.from_mesh(coat.data); bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
weight = {v: max(0.0, 1 - abs(v.co.z - 1.135) / .085) for v in bm.verts}
for _ in range(45):
    new = {v: v.co.lerp(sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges), min(1, weight[v] * 1.4) * .7) for v in bm.verts if weight[v] > 0 and v.link_edges}
    for v, c in new.items(): v.co = c
for f in bm.faces: f.smooth = True
bm.to_mesh(coat.data); bm.free(); coat.data.update()
tree = BVHTree.FromPolygons([b2w(v.co) for v in coat.data.vertices], [tuple(p.vertices) for p in coat.data.polygons])
bot = min(a[1] for a, _ in beak)
for s, idx in zip((-1, 1), blades):
    P = [b2w(comb.data.vertices[i].co) for i in idx]; mid = sum(P, Vector()) / len(P)
    long_ = max(P, key=lambda p: (p - mid).length) - mid; long_.y = 0; long_.normalize(); across = Vector((-long_.z, 0, long_.x))
    ext = [max(1e-4, max(abs((p - mid).dot(a)) for p in P)) for a in (long_, Vector((0, 1, 0)), across)]
    hit = tree.ray_cast(Vector((bc.x, bot - .018, bc.z)) + side * s * .012 + fwd * .1, -fwd, .3)[0]
    root = (hit if hit else Vector((bc.x, bot - .018, bc.z))) + fwd * .011
    for i, p in zip(idx, P):
        a, b, c = (p - mid).dot(long_) / ext[0], (p - mid).dot(Vector((0, 1, 0))) / ext[1], (p - mid).dot(across) / ext[2]
        comb.data.vertices[i].co = w2b(root + Vector((0, a * .026 - .006, 0)) + side * (b * .006) + fwd * (c * .013 + .004))
print('FIX wattles 2')

# 外壳：在玻璃那条线（z = -1）裁开，两侧补墙、廊顶上面补一条
for o in find('lab_shell', ''):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=w2b((0, 0, -1)), plane_no=(0, -1, 0), clear_outer=True)
    bm.to_mesh(o.data); bm.free()
tile = find('lab_shell', 'Grouted ceramic / wall')[0]
uvl = tile.data.uv_layers.active
p = max((p for p in tile.data.polygons if abs(p.normal.y) > .9), key=lambda p: p.area)
L = [(tile.data.vertices[tile.data.loops[i].vertex_index].co.copy(), uvl.data[i].uv.copy()) for i in p.loop_indices]
sx = (max(u.x for _, u in L) - min(u.x for _, u in L)) / (max(c.x for c, _ in L) - min(c.x for c, _ in L))
sy = (max(u.y for _, u in L) - min(u.y for _, u in L)) / (max(c.z for c, _ in L) - min(c.z for c, _ in L))
bm = bmesh.new(); bm.from_mesh(tile.data); uv = bm.loops.layers.uv.active; mi = p.material_index
for x0, x1, y0, y1 in ((-9, -5.2, 0, 3.6), (5.2, 9, 0, 3.6), (-5.2, 5.2, 3.0, 3.6)):
    f = bm.faces.new([bm.verts.new(w2b(q)) for q in ((x1, y0, -1.11), (x0, y0, -1.11), (x0, y1, -1.11), (x1, y1, -1.11))]); f.material_index = mi
    for l in f.loops: l[uv].uv = (l.vert.co.x * sx, l.vert.co.z * sy)
bm.to_mesh(tile.data); bm.free()

# 布局：玻璃里第一排是实验台和培养肉，整道帘子（网页里做，会动）在 z = -2.5，帘子后面才是病床
WARD = -.55                                                  # 病床、隔帘、动物整体往里让
DEEP = -.9                                                   # 帘子后面再整体往里让 0.9 m：帘子贴着实验台太挤（网页 lab.js 的 LAB_DEEP 同步）
ZCUT = -2.4                                                  # 这条线以后的墙、地、设备都往里推；线前面是实验台，不动
KIT = ('01 ', '02 ', '03 ', '04 ')                           # Clinical Ward Kit：床尾的超声仪、输液泵、心电记录仪、保温台，跟着床走
BENCH = Vector((2.65, 0, 6.68))                              # 显微镜台搬到玻璃前
moved = set()
for o in meshes:
    mod = o.name.split('|')[0].strip()
    if mod in ANIMALS or mod.startswith('station_') or mod == 'ward_curtains' or mod.startswith(KIT):
        nudge = (.3, 0, .12) if mod.startswith('01 ') else (0, 0, 0)   # 超声仪的键盘台原来插进牛嘴里：挪到牛的右前方
        o.data.transform(Matrix.Translation(w2b((nudge[0], 0, WARD + DEEP + nudge[2]))))
        o.data.update(); moved.add(o.name)
    elif mod.startswith('05 '):                              # 留样台上的肉样和培养皿：跟着显微镜台搬到玻璃前
        o.data.transform(Matrix.Translation(w2b(BENCH)))
        o.data.update(); moved.add(o.name)
n_move = n_drop = n_copy = 0
for o in [m for m in meshes if m.name.split('|')[0].strip() == B]:
    move, drop, dup = [], [], []
    for idx, lo, hi in islands(o):
        if hi[1] > 1.45 or lo[2] < -9.6: continue
        if lo[0] > -5.73 and hi[0] < -2.76 and lo[2] > -8.995 and hi[2] < -7.875:
            move += idx
        else: drop += idx                                    # 原来台前的凳子：搬过来会挡住玻璃
    n_move += len(move); n_drop += len(drop); n_copy += len(dup)
    for i in move: o.data.vertices[i].co += w2b(BENCH)
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
    if dup:                                                  # 右边台子上再摆一组留样托盘：转过来、错开
        keep = set(dup)
        geom = [bm.verts[i] for i in dup]
        geom += [e for e in bm.edges if e.verts[0].index in keep and e.verts[1].index in keep]
        geom += [f for f in bm.faces if all(v.index in keep for v in f.verts)]
        new = [g for g in bmesh.ops.duplicate(bm, geom=geom)['geom'] if isinstance(g, bmesh.types.BMVert)]
        src = Vector((-3.925, 0, -8.49)) + BENCH; dst = Vector((3.25, 0, -1.8)); rot = Matrix.Rotation(3.02, 3, 'Y')
        for v in new:
            p = b2w(v.co); v.co = w2b(rot @ (p - src) + dst + Vector((0, .006, 0)))
        bm.verts.ensure_lookup_table()
    if drop: bmesh.ops.delete(bm, geom=[bm.verts[i] for i in drop], context='VERTS')
    bm.to_mesh(o.data); bm.free(); o.data.update()
print('LAYOUT', n_move, n_drop, n_copy)
# 其余的（墙、地、车间设备、高位罐）：ZCUT 以后的顶点往里推，跨线的大面（地、侧墙）被拉长
n_deep = 0
for o in meshes:
    if o.name in moved: continue
    for v in o.data.vertices:
        p = b2w(v.co)
        if p.z < ZCUT: v.co = w2b(p + Vector((0, 0, DEEP))); n_deep += 1
    o.data.update()
print('DEEP', n_deep)

# 件与件之间再查一遍（嵌进墙里的钢梁、支架不算）
bym = defaultdict(list)
for o in meshes:
    if o.name.startswith('lab_shell'): continue
    if len(o.data.polygons):
        bym[o.name.split('|')[0].strip()].append((o, BVHTree.FromPolygons([v.co for v in o.data.vertices], [tuple(p.vertices) for p in o.data.polygons])))
ks = sorted(bym)
for i, a in enumerate(ks):
    for b in ks[i + 1:]:
        for oa, ta in bym[a]:
            for ob, tb in bym[b]:
                n = len(ta.overlap(tb))
                if n: print('HIT', n, oa.name, '<>', ob.name)

tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
groups = defaultdict(list)
for o in meshes:
    if not len(o.data.polygons): continue
    mod = o.name.split('|')[0].strip(); m = o.data.materials[0]
    groups[(f'A_{mod}' if mod in ANIMALS else 'S'), m.name if m else ''].append(o)
out = []
for n, ((g, m), obs) in enumerate(groups.items()):
    for o in obs:
        if o.data.uv_layers: o.data.uv_layers[0].name = 'UVMap'
    if len(obs) > 1:
        with bpy.context.temp_override(active_object=obs[0], object=obs[0], selected_objects=obs, selected_editable_objects=obs):
            bpy.ops.object.join()
    obs[0].name = f'{g}__{n}'; obs[0].data.name = obs[0].name; out.append(obs[0])
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_lights=False, export_cameras=False, export_animations=False,
                          export_image_format='WEBP', export_image_quality=86, export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=6, export_draco_position_quantization=15)
print('REPORT', json.dumps({'tris': tris, 'meshes': len(out), 'MB': round(os.path.getsize(OUT) / 1048576, 2)}))
